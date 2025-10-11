import smtplib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from flask import Flask, request, jsonify
from flask_cors import CORS

def load_env():
    """
    Loads environment variables from .env file in the same directory.
    """
    print("--- Loading environment variables from .env file ---")
    try:
        dir_path = os.path.dirname(os.path.realpath(__file__))
        env_file = os.path.join(dir_path, '.env')

        if not os.path.exists(env_file):
            print(f"❌ .env file not found at: {env_file}")
            print("Trying .env.email as fallback...")
            env_file = os.path.join(dir_path, '.env.email')

        with open(env_file) as f:
            print(f"✅ Successfully opened {os.path.basename(env_file)}")
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip().strip('"\'')
                    os.environ[key] = value
                    print(f"✅ Loaded: {key}")
    except FileNotFoundError:
        print("❌ CRITICAL: No .env or .env.email file found!")
        print("Please create .env file with SENDER_EMAIL and SENDER_PASSWORD")
    except Exception as e:
        print(f"❌ Error loading .env file: {e}")

load_env()

app = Flask(__name__)
CORS(app)

SENDER_EMAIL = os.getenv("SENDER_EMAIL")
SENDER_PASSWORD = os.getenv("SENDER_PASSWORD")

if not SENDER_EMAIL or not SENDER_PASSWORD:
    print("\n❌ FATAL ERROR: SENDER_EMAIL or SENDER_PASSWORD not found!")
    print("Please ensure .env file exists with these values.\n")
else:
    print("\n✅ SUCCESS: Email credentials loaded successfully!")
    print(f"📧 Sender: {SENDER_EMAIL}\n")

@app.route('/api/send-email', methods=['POST'])
def send_email():
    """
    API endpoint to send email to single or multiple recipients.
    Expects: { "to": ["email1@example.com", "email2@example.com"], "subject": "...", "body": "..." }
    """
    if not SENDER_EMAIL or not SENDER_PASSWORD:
        return jsonify({"error": "Server is not configured with sender credentials."}), 500

    data = request.get_json()
    recipients = data.get('to', [])
    subject = data.get('subject')
    body = data.get('body')

    if not isinstance(recipients, list):
        recipients = [recipients]

    if not all([recipients, subject, body]):
        return jsonify({"error": "Missing required fields: 'to', 'subject', and 'body' are required."}), 400

    success_count = 0
    failed_recipients = []

    for recipient_email in recipients:
        try:
            msg = MIMEMultipart()
            msg['From'] = SENDER_EMAIL
            msg['To'] = recipient_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'html'))

            print(f"🔌 Connecting to Gmail SMTP server for recipient: {recipient_email}...")
            server = smtplib.SMTP('smtp.gmail.com', 587)
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            print("✅ Logged in successfully!")

            print(f"📤 Sending email to {recipient_email}...")
            server.send_message(msg)
            print(f"✅ Email successfully sent to {recipient_email}")
            server.quit()

            success_count += 1

        except smtplib.SMTPAuthenticationError:
            print("❌ SMTP Authentication Error: Gmail rejected the login.")
            print("   - Double-check if SENDER_EMAIL and SENDER_PASSWORD in your .env.email file are correct.")
            print("   - IMPORTANT: If using 2-Factor Authentication, you MUST generate and use an 'App Password'.")
            failed_recipients.append(recipient_email)

        except Exception as e:
            print(f"❌ An unexpected error occurred sending to {recipient_email}: {e}")
            failed_recipients.append(recipient_email)

    if success_count > 0:
        message = f"Successfully sent {success_count} email(s)"
        if failed_recipients:
            message += f". Failed to send to: {', '.join(failed_recipients)}"
        return jsonify({"message": message, "success_count": success_count, "failed_count": len(failed_recipients)}), 200
    else:
        return jsonify({"error": f"Failed to send any emails. Failed recipients: {', '.join(failed_recipients)}"}), 500

@app.route('/api/schedule-email', methods=['POST'])
def schedule_email():
    """
    API endpoint to schedule an email for later delivery.
    For now, this just logs the scheduled email - you would need a job scheduler like Celery in production.
    """
    data = request.get_json()
    recipients = data.get('to', [])
    subject = data.get('subject')
    body = data.get('body')
    send_at = data.get('send_at')

    if not isinstance(recipients, list):
        recipients = [recipients]

    if not all([recipients, subject, body, send_at]):
        return jsonify({"error": "Missing required fields: 'to', 'subject', 'body', and 'send_at' are required."}), 400

    print(f"📅 Email scheduled for {send_at} to {len(recipients)} recipient(s)")
    print(f"   Subject: {subject}")
    print(f"   Recipients: {', '.join(recipients)}")

    # In production, you would store this in a queue/scheduler
    # For now, we just acknowledge it
    return jsonify({
        "message": f"Email scheduled successfully for {len(recipients)} recipient(s)",
        "scheduled_at": send_at,
        "recipient_count": len(recipients)
    }), 200

@app.route('/api/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({
        "status": "healthy",
        "sender_configured": bool(SENDER_EMAIL and SENDER_PASSWORD),
        "sender_email": SENDER_EMAIL if SENDER_EMAIL else "Not configured"
    }), 200

if __name__ == '__main__':
    print("\n" + "="*60)
    print("  📧 EMAIL CAMPAIGN SERVER")
    print("="*60)
    print(f"  🌐 Server: http://0.0.0.0:5000 (accessible from network)")
    print(f"  📧 Sender: {SENDER_EMAIL if SENDER_EMAIL else 'NOT CONFIGURED'}")
    print("="*60 + "\n")
    app.run(host='0.0.0.0', port=5000, debug=True)
