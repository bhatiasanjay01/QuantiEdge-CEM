import smtplib
import os
import json
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from flask import Flask, request, jsonify
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta, timezone

# --- Setup Flask ---
app = Flask(__name__)
CORS(app)

# Load environment variables for email credentials
SENDER_EMAIL = os.environ.get("SENDER_EMAIL")
SENDER_PASSWORD = os.environ.get("SENDER_PASSWORD")

if not SENDER_EMAIL or not SENDER_PASSWORD:
    print("WARNING: SENDER_EMAIL and SENDER_PASSWORD environment variables must be set.")
    print("Emails will not be sent.")

DATA_FILE = "emails.json"

scheduler = BackgroundScheduler()
scheduler.start()

# --- Load saved emails ---
def load_emails():
    """Loads email data from a JSON file."""
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r") as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                print("WARNING: Could not decode emails.json. Starting with empty list.")
                return []
    return []

# --- Save emails ---
def save_emails(data):
    """Saves email data to a JSON file."""
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)

emails = load_emails()

# --- Send email helper ---
def send_email_now(to, subject, body):
    """
    Sends a single email or sends the same email to a list of recipients.
    'to' can be a string (single email) or a list of strings (multiple emails).
    """
    if not SENDER_EMAIL or not SENDER_PASSWORD:
        print("❌ Cannot send email: SENDER_EMAIL or SENDER_PASSWORD is not set.")
        return False

    recipients = [to] if isinstance(to, str) else to

    success_count = 0

    for recipient in recipients:
        try:
            msg = MIMEMultipart()
            msg["From"] = SENDER_EMAIL
            msg["To"] = recipient
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "html"))

            server = smtplib.SMTP("smtp.gmail.com", 587)
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.send_message(msg)
            server.quit()
            print(f"✅ Sent: '{subject}' to {recipient}")
            success_count += 1
        except Exception as e:
            print(f"❌ Failed to send email to {recipient}: {e}")

    return success_count > 0

# --- API Endpoints ---

def update_email_status(email_entry, new_status):
    """Helper to update the status of an email entry in the global list."""
    recipient_tuple = tuple(email_entry['to']) if isinstance(email_entry['to'], list) else email_entry['to']

    for email in emails:
        current_recipient = tuple(email['to']) if isinstance(email['to'], list) else email['to']

        if current_recipient == recipient_tuple and email["send_at"] == email_entry["send_at"]:
            email["status"] = new_status
            return True
    return False


@app.route("/api/send-email", methods=["POST"])
def send_email():
    """Immediately sends a one-off email and saves it to the database."""
    data = request.get_json()
    to = data.get("to")
    subject = data.get("subject")
    body = data.get("body")

    if not all([to, subject, body]):
        return jsonify({"error": "Missing data. Requires 'to', 'subject', and 'body'."}), 400

    if send_email_now(to, subject, body):
        emails.append({
            "to": to,
            "subject": subject,
            "body": body,
            "status": "sent",
            "send_at": datetime.now(timezone.utc).isoformat()
        })
        save_emails(emails)
        recipient_count = len(to) if isinstance(to, list) else 1
        return jsonify({
            "message": f"Email sent to {recipient_count} recipient(s)!",
            "success_count": recipient_count,
            "failed_count": 0
        }), 200
    return jsonify({"error": "Failed to send email."}), 500

@app.route("/api/schedule-email", methods=["POST"])
def schedule_email():
    """Schedules a one-off email to be sent at a specific time."""
    data = request.get_json()
    to = data.get("to")
    subject = data.get("subject")
    body = data.get("body")
    send_at_str = data.get("send_at")

    if not all([to, subject, body, send_at_str]):
        return jsonify({"error": "Missing data. Requires 'to', 'subject', 'body', and 'send_at'."}), 400

    try:
        run_time = datetime.fromisoformat(send_at_str)
        if run_time.tzinfo is None:
            run_time = run_time.replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid date format."}), 400

    email_entry = {
        "to": to,
        "subject": subject,
        "body": body,
        "status": "scheduled",
        "send_at": run_time.isoformat()
    }
    emails.append(email_entry)
    save_emails(emails)

    def job(email_entry):
        if send_email_now(email_entry["to"], email_entry["subject"], email_entry["body"]):
            update_email_status(email_entry, "sent")
            save_emails(emails)

    scheduler.add_job(job, "date", run_date=run_time, args=[email_entry])

    recipient_count = len(to) if isinstance(to, list) else 1
    return jsonify({
        "message": f"Email scheduled for {recipient_count} recipient(s)!",
        "scheduled_at": run_time.isoformat(),
        "recipient_count": recipient_count
    }), 200

@app.route("/api/schedule-sequence", methods=["POST"])
def schedule_sequence():
    """
    Schedules a multi-step email sequence.
    'to' can be a list of emails. The sequence is scheduled for EVERY recipient.
    """
    data = request.get_json()
    to = data.get("to")
    steps = data.get("steps", [])

    if not to or not steps:
        return jsonify({"error": "Missing data. Requires 'to' (list of emails) and 'steps'."}), 400

    if not isinstance(to, list) or not to:
        return jsonify({"error": "'to' must be a non-empty list of emails for sequences."}), 400

    if not isinstance(steps, list):
        return jsonify({"error": "Steps must be a list."}), 400

    for recipient_email in to:
        for i, step in enumerate(steps):
            subject = step.get("subject", "")
            body = step.get("body", "")
            send_at_str = step.get("scheduledAt")

            if not send_at_str:
                return jsonify({"error": f"Missing scheduledAt for step {i+1}."}), 400

            try:
                run_time = datetime.fromisoformat(send_at_str)
                if run_time.tzinfo is None:
                    run_time = run_time.replace(tzinfo=timezone.utc)
            except (ValueError, TypeError):
                return jsonify({"error": f"Invalid date format for step {i+1}."}), 400

            email_entry = {
                "to": recipient_email,
                "subject": subject,
                "body": body,
                "status": "scheduled",
                "send_at": run_time.isoformat()
            }
            emails.append(email_entry)
            save_emails(emails)

            def job(email_entry):
                if send_email_now(email_entry["to"], email_entry["subject"], email_entry["body"]):
                    for email in emails:
                        if email["send_at"] == email_entry["send_at"] and email["to"] == email_entry["to"]:
                            email["status"] = "sent"
                            break
                    save_emails(emails)

            scheduler.add_job(job, "date", run_date=run_time, args=[email_entry])

    return jsonify({"message": f"Sequence scheduled for {len(to)} recipient(s)! Total steps: {len(to) * len(steps)}"}), 200

@app.route("/api/emails", methods=["GET"])
def get_emails():
    """Returns all saved emails and their status."""
    return jsonify(emails)

@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "sender_configured": bool(SENDER_EMAIL and SENDER_PASSWORD),
        "sender_email": SENDER_EMAIL if SENDER_EMAIL else "Not configured"
    }), 200

if __name__ == "__main__":
    print("\n" + "="*60)
    print("  📧 EMAIL CAMPAIGN SERVER WITH SCHEDULER")
    print("="*60)
    print(f"  🌐 Server: http://0.0.0.0:5000")
    print(f"  📧 Sender: {SENDER_EMAIL if SENDER_EMAIL else 'NOT CONFIGURED'}")
    print(f"  📅 Scheduler: Active")
    print("="*60 + "\n")

    app.run(host='0.0.0.0', port=5000, debug=True)
