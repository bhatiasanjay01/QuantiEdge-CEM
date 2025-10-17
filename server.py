import os
import json
import base64
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from flask import Flask, request, jsonify, redirect, session, url_for
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timezone

# --- Google OAuth Imports ---
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.auth.transport.requests import Request
from urllib.parse import urlparse, urlunparse

# --- Setup Flask ---
app = Flask(__name__)
# IMPORTANT: Sessions require a SECRET_KEY for security
# Replace this with a long, random string in a real environment
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "A_VERY_SECRET_KEY_FOR_DEMO")
CORS(app, supports_credentials=True)

# --- Configuration from Bolt Secrets ---
GMAIL_CLIENT_ID = os.environ.get("GMAIL_CLIENT_ID")
GMAIL_CLIENT_SECRET = os.environ.get("GMAIL_CLIENT_SECRET")
# The Redirect URI must match the one registered in Google Cloud Console
# The base URL will come from your Bolt environment or localhost:5000
# We use a placeholder here; the 'redirect' function in Flask will build the final URL.

# Define the scopes (permissions) needed for the Gmail API
SCOPES = ['https://www.googleapis.com/auth/gmail.send', 
          'https://www.googleapis.com/auth/userinfo.email']

if not GMAIL_CLIENT_ID or not GMAIL_CLIENT_SECRET:
    print("WARNING: GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set for OAuth.")
    print("Email sending will not work until a user connects their account.")

# --- Database & Scheduler (Simplified: uses file for tokens) ---
DATA_FILE = "emails.json"
TOKEN_FILE = "token.json" # New file to securely store the OAuth tokens

def load_tokens():
    """Loads OAuth token data."""
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, "r") as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return {}
    return {}

def save_tokens(tokens):
    """Saves OAuth token data."""
    with open(TOKEN_FILE, "w") as f:
        json.dump(tokens, f, indent=2)

USER_TOKENS = load_tokens() # Global dictionary to hold tokens (User ID -> Token Data)

scheduler = BackgroundScheduler()
scheduler.start()
emails = [] # Emails list setup remains the same
# ... (load_emails and save_emails functions remain the same) ...

# -------------------------------------------------------------
# --- OAuth & Credential Handling ---
# -------------------------------------------------------------

def get_gmail_service_from_token():
    """
    Creates a Gmail API service instance using the stored token data.
    Attempts to refresh the Access Token if necessary.
    Returns: googleapiclient.discovery.Resource object or None
    """
    token_data = USER_TOKENS.get("default_user") # Simplified: assuming one user/token
    if not token_data:
        return None

    # Use Credentials.from_authorized_user_info to load the stored token data
    creds = Credentials.from_authorized_user_info(info=token_data, scopes=SCOPES)
    
    # If the token is expired and there is a refresh token, refresh it
    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            # Save the new token data immediately
            USER_TOKENS["default_user"] = json.loads(creds.to_json())
            save_tokens(USER_TOKENS)
        except Exception as e:
            print(f"❌ Error refreshing token: {e}")
            return None # Failed to refresh

    try:
        service = build('gmail', 'v1', credentials=creds)
        return service
    except Exception as e:
        print(f"❌ Error building Gmail service: {e}")
        return None


# -------------------------------------------------------------
# --- Send Email Helper (Uses Gmail API) ---
# -------------------------------------------------------------

def send_email_api(service, to, subject, body):
    """Sends email using the Google Gmail API service."""
    
    # 1. Create MIME message structure
    message = MIMEMultipart()
    message['to'] = ", ".join(to) if isinstance(to, list) else to
    message['subject'] = subject
    message.attach(MIMEText(body, "html"))
    
    # 2. Encode message into base64url format for the API
    raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
    body = {'raw': raw_message}
    
    try:
        # 3. Send the message via the Gmail API
        message = service.users().messages().send(userId='me', body=body).execute()
        print(f"✅ Sent via Gmail API: '{subject}' to {message['labelIds']}")
        return True
    except HttpError as error:
        print(f"❌ An error occurred sending mail via API: {error}")
        return False
    except Exception as e:
        print(f"❌ General error during API send: {e}")
        return False

# --- The Main Sending Function (Updated) ---
def send_email_now(to, subject, body):
    """
    Attempts to get the Gmail API service and send the email.
    """
    service = get_gmail_service_from_token()
    if not service:
        print("❌ Cannot send email: No connected Gmail service (token missing or expired).")
        return False
        
    recipients = [to] if isinstance(to, str) else to
    success_count = 0
    failed_count = 0
    
    # NOTE: The Gmail API 'send' call can take multiple recipients in the 'To' header.
    # We send it as one batch message for simplicity and efficiency.
    if send_email_api(service, recipients, subject, body):
        success_count = len(recipients)
    else:
        failed_count = len(recipients)

    return {"success_count": success_count, "failed_count": failed_count}


# -------------------------------------------------------------
# --- New OAuth API Endpoints ---
# -------------------------------------------------------------

@app.route("/api/auth/google", methods=["GET"])
def authorize():
    """Starts the Google OAuth 2.0 flow."""
    
    # Get the base URL for the redirect_uri dynamically (essential for Bolt/local testing)
    parsed_url = urlparse(request.url)
    redirect_uri_base = urlunparse(parsed_url._replace(path='/api/auth/callback', query=''))

    # The flow object handles the redirect to the Google Consent Screen
    flow = Flow.from_client_config(
        client_config={
            "web": {
                "client_id": GMAIL_CLIENT_ID,
                "client_secret": GMAIL_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [redirect_uri_base],
                "javascript_origins": [f"{parsed_url.scheme}://{parsed_url.netloc}"]
            }
        },
        scopes=SCOPES,
        redirect_uri=redirect_uri_base
    )
    
    # The 'authorization_url' is the URL to the Google Consent Screen
    authorization_url, state = flow.authorization_url(
        access_type='offline', # Request refresh token for long-term access
        include_granted_scopes='true'
    )
    
    session['state'] = state # Store state for security validation in callback
    return redirect(authorization_url)


@app.route("/api/auth/callback", methods=["GET"])
def oauth2callback():
    """Handles the redirect from Google and exchanges the code for a token."""
    
    if request.args.get('state') != session.get('state'):
        return jsonify({"error": "State mismatch. Possible CSRF attack."}), 400

    # Get the base URL for the redirect_uri dynamically
    parsed_url = urlparse(request.url)
    redirect_uri_base = urlunparse(parsed_url._replace(path='/api/auth/callback', query=''))

    flow = Flow.from_client_config(
        client_config={
            "web": {
                "client_id": GMAIL_CLIENT_ID,
                "client_secret": GMAIL_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [redirect_uri_base],
                "javascript_origins": [f"{parsed_url.scheme}://{parsed_url.netloc}"]
            }
        },
        scopes=SCOPES,
        redirect_uri=redirect_uri_base
    )

    try:
        # Exchange the authorization code for credentials (tokens)
        flow.fetch_token(authorization_response=request.url)
        creds = flow.credentials
        
        # Save the tokens securely (including the refresh token)
        USER_TOKENS["default_user"] = json.loads(creds.to_json())
        save_tokens(USER_TOKENS)
        
        # Find the email address from the token for display
        service = build('oauth2', 'v2', credentials=creds)
        user_info = service.userinfo().get().execute()
        connected_email = user_info.get("email")

        # Redirect back to the frontend dashboard or settings page
        return redirect("/settings?email_connected=true&email="+connected_email)

    except Exception as e:
        return jsonify({"error": f"Failed to get OAuth token: {e}"}), 500


@app.route("/api/auth/status", methods=["GET"])
def auth_status():
    """Returns the connection status and connected email."""
    service = get_gmail_service_from_token()
    is_connected = bool(service)
    connected_email = None

    if is_connected:
        try:
            service_info = build('oauth2', 'v2', credentials=service.credentials)
            user_info = service_info.userinfo().get().execute()
            connected_email = user_info.get("email")
        except Exception:
             # Token exists but cannot get info (maybe expired) - attempt refresh next time.
            pass

    return jsonify({"is_connected": is_connected, "email": connected_email})


# -------------------------------------------------------------
# --- Existing API Endpoints (Modified to use new sender) ---
# -------------------------------------------------------------

@app.route("/api/send-email", methods=["POST"])
def send_email_route():
    # ... (code remains the same, except for the call to send_email_now) ...
    data = request.get_json()
    to = data.get("to")
    subject = data.get("subject")
    body = data.get("body")

    if not all([to, subject, body]):
        return jsonify({"error": "Missing data. Requires 'to', 'subject', and 'body'."}), 400

    result = send_email_now(to, subject, body)
    
    if result["success_count"] > 0:
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
            "success_count": result["success_count"],
            "failed_count": result["failed_count"]
        }), 200
    
    # If a failure occurs, check if it's an authorization issue
    if not get_gmail_service_from_token():
        return jsonify({"error": "Gmail account not connected. Please connect in Settings."}), 401
        
    return jsonify({"error": "Failed to send email."}), 500

@app.route("/api/schedule-email", methods=["POST"])
def schedule_email():
    # ... (code remains the same, but the job now calls the new send_email_now) ...
    # ... (omitting original code for brevity) ...
    
    data = request.get_json()
    # ... (extract and validate data) ...
    to = data.get("to")
    subject = data.get("subject")
    body = data.get("body")
    send_at_str = data.get("send_at")

    if not all([to, subject, body, send_at_str]):
        return jsonify({"error": "Missing data. Requires 'to', 'subject', 'body', and 'send_at'."}), 400

    try:
        run_time = datetime.fromisoformat(send_at_str).replace(tzinfo=timezone.utc)
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
        result = send_email_now(email_entry["to"], email_entry["subject"], email_entry["body"])
        if result["success_count"] > 0:
            update_email_status(email_entry, "sent")
            save_emails(emails)

    scheduler.add_job(job, "date", run_date=run_time, args=[email_entry])

    recipient_count = len(to) if isinstance(to, list) else 1
    return jsonify({
        "message": f"Email scheduled for {recipient_count} recipient(s)!",
        "scheduled_at": run_time.isoformat(),
        "recipient_count": recipient_count
    }), 200

# ... (schedule_sequence and get_emails routes are omitted but can be adapted similarly) ...

@app.route("/api/emails", methods=["GET"])
def get_emails():
    """Returns all saved emails and their status."""
    return jsonify(emails)

@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "sender_configured": bool(GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET),
        "auth_connected": bool(USER_TOKENS.get("default_user")),
    }), 200

if __name__ == "__main__":
    # Ensure your FLASK_SECRET_KEY is set in your .env or Bolt secrets
    app.run(host='0.0.0.0', port=5000, debug=True)