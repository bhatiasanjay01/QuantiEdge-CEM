import os
import json
import base64
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from flask import Flask, request, jsonify, redirect, session
from flask_cors import CORS
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash

# Google OAuth Imports
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.auth.transport.requests import Request
from urllib.parse import urlparse, urlunparse

# Import models
from models import db, User, Contact, ContactList, EmailCampaign, CampaignRecipient

# Setup Flask
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get("FLASK_SECRET_KEY", "A_VERY_SECRET_KEY_FOR_DEMO")
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///crm.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

CORS(app, supports_credentials=True, origins=['http://localhost:5173', 'http://localhost:3000'])

# Initialize extensions
db.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# OAuth Configuration
GMAIL_CLIENT_ID = os.environ.get("GMAIL_CLIENT_ID")
GMAIL_CLIENT_SECRET = os.environ.get("GMAIL_CLIENT_SECRET")
SCOPES = ['https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/userinfo.email']

if not GMAIL_CLIENT_ID or not GMAIL_CLIENT_SECRET:
    print("WARNING: GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set for OAuth.")

# Scheduler
scheduler = BackgroundScheduler()
scheduler.start()

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# ============================================================
# AUTH ENDPOINTS
# ============================================================

@app.route("/api/auth/signup", methods=["POST"])
def signup():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")
    business_name = data.get("businessName", "")

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already exists"}), 400

    user = User(
        email=email,
        business_name=business_name,
        business_url=email.split('@')[0].replace('.', '-')
    )
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    login_user(user, remember=True)

    return jsonify({
        "user": user.to_dict(),
        "message": "Account created successfully"
    }), 201

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid credentials"}), 401

    login_user(user, remember=True)

    return jsonify({
        "user": user.to_dict(),
        "message": "Logged in successfully"
    }), 200

@app.route("/api/auth/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    return jsonify({"message": "Logged out successfully"}), 200

@app.route("/api/auth/me", methods=["GET"])
@login_required
def get_current_user():
    return jsonify({"user": current_user.to_dict()}), 200

# ============================================================
# GMAIL OAUTH ENDPOINTS
# ============================================================

@app.route("/api/auth/google", methods=["GET"])
@login_required
def authorize():
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

    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true'
    )

    session['state'] = state
    session['user_id_for_oauth'] = current_user.id
    return redirect(authorization_url)

@app.route("/api/auth/callback", methods=["GET"])
def oauth2callback():
    if request.args.get('state') != session.get('state'):
        return jsonify({"error": "State mismatch"}), 400

    user_id = session.get('user_id_for_oauth')
    if not user_id:
        return jsonify({"error": "No user session"}), 400

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
        flow.fetch_token(authorization_response=request.url)
        creds = flow.credentials

        # Get email from token
        service = build('oauth2', 'v2', credentials=creds)
        user_info = service.userinfo().get().execute()
        connected_email = user_info.get("email")

        # Save to database
        user = User.query.get(user_id)
        user.gmail_access_token = creds.token
        user.gmail_refresh_token = creds.refresh_token
        user.gmail_token_expires_at = creds.expiry
        user.gmail_email = connected_email
        db.session.commit()

        return redirect(f"http://localhost:5173/settings?email_connected=true&email={connected_email}")

    except Exception as e:
        return jsonify({"error": f"Failed to get OAuth token: {e}"}), 500

@app.route("/api/auth/status", methods=["GET"])
@login_required
def auth_status():
    is_connected = bool(current_user.gmail_access_token)
    return jsonify({
        "is_connected": is_connected,
        "email": current_user.gmail_email if is_connected else None
    })

# ============================================================
# EMAIL SENDING
# ============================================================

def get_gmail_service_for_user(user):
    if not user.gmail_access_token:
        return None

    creds_dict = {
        'token': user.gmail_access_token,
        'refresh_token': user.gmail_refresh_token,
        'token_uri': 'https://oauth2.googleapis.com/token',
        'client_id': GMAIL_CLIENT_ID,
        'client_secret': GMAIL_CLIENT_SECRET,
        'scopes': SCOPES
    }

    creds = Credentials.from_authorized_user_info(info=creds_dict, scopes=SCOPES)

    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            user.gmail_access_token = creds.token
            user.gmail_token_expires_at = creds.expiry
            db.session.commit()
        except Exception as e:
            print(f"Error refreshing token: {e}")
            return None

    try:
        service = build('gmail', 'v1', credentials=creds)
        return service
    except Exception as e:
        print(f"Error building Gmail service: {e}")
        return None

def send_email_api(service, to, subject, body):
    message = MIMEMultipart()
    message['to'] = ", ".join(to) if isinstance(to, list) else to
    message['subject'] = subject
    message.attach(MIMEText(body, "html"))

    raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
    body_req = {'raw': raw_message}

    try:
        message = service.users().messages().send(userId='me', body=body_req).execute()
        print(f"✅ Sent via Gmail API: '{subject}'")
        return True
    except HttpError as error:
        print(f"❌ Error sending mail: {error}")
        return False

@app.route("/api/send-email", methods=["POST"])
@login_required
def send_email_route():
    data = request.get_json()
    to = data.get("to")
    subject = data.get("subject")
    body = data.get("body")

    if not all([to, subject, body]):
        return jsonify({"error": "Missing required fields"}), 400

    service = get_gmail_service_for_user(current_user)
    if not service:
        return jsonify({"error": "Gmail account not connected"}), 401

    recipients = [to] if isinstance(to, str) else to
    success = send_email_api(service, recipients, subject, body)

    if success:
        return jsonify({
            "message": f"Email sent to {len(recipients)} recipient(s)!",
            "success_count": len(recipients),
            "failed_count": 0
        }), 200

    return jsonify({"error": "Failed to send email"}), 500

@app.route("/api/schedule-email", methods=["POST"])
@login_required
def schedule_email():
    data = request.get_json()
    to = data.get("to")
    subject = data.get("subject")
    body = data.get("body")
    send_at_str = data.get("send_at")

    if not all([to, subject, body, send_at_str]):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        run_time = datetime.fromisoformat(send_at_str).replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid date format"}), 400

    def job():
        with app.app_context():
            user = User.query.get(current_user.id)
            service = get_gmail_service_for_user(user)
            if service:
                send_email_api(service, to, subject, body)

    scheduler.add_job(job, "date", run_date=run_time)

    return jsonify({
        "message": f"Email scheduled!",
        "scheduled_at": run_time.isoformat()
    }), 200

# ============================================================
# CUSTOMER/CONTACT ENDPOINTS
# ============================================================

@app.route("/api/customers", methods=["GET"])
@login_required
def get_customers():
    contacts = Contact.query.filter_by(user_id=current_user.id).all()
    return jsonify([{
        "id": str(c.id),
        "name": f"{c.first_name} {c.last_name}",
        "email": c.email,
        "phone": c.phone,
        "company": c.company,
        "tags": json.loads(c.tags) if c.tags else [],
        "lastContact": c.updated_at.isoformat() if c.updated_at else None
    } for c in contacts])

@app.route("/api/customers", methods=["POST"])
@login_required
def create_customer():
    data = request.get_json()

    # Parse name
    name = data.get("name", "")
    parts = name.split(" ", 1)
    first_name = parts[0]
    last_name = parts[1] if len(parts) > 1 else ""

    contact = Contact(
        user_id=current_user.id,
        first_name=first_name,
        last_name=last_name,
        email=data.get("email"),
        phone=data.get("phone"),
        company=data.get("company"),
        tags=json.dumps(data.get("tags", []))
    )

    db.session.add(contact)
    db.session.commit()

    return jsonify({
        "id": str(contact.id),
        "name": f"{contact.first_name} {contact.last_name}",
        "email": contact.email,
        "phone": contact.phone,
        "company": contact.company,
        "tags": json.loads(contact.tags) if contact.tags else []
    }), 201

@app.route("/api/customers/<int:customer_id>", methods=["DELETE"])
@login_required
def delete_customer(customer_id):
    contact = Contact.query.filter_by(id=customer_id, user_id=current_user.id).first()
    if not contact:
        return jsonify({"error": "Customer not found"}), 404

    db.session.delete(contact)
    db.session.commit()

    return jsonify({"message": "Customer deleted"}), 200

# ============================================================
# CAMPAIGNS ENDPOINTS
# ============================================================

@app.route("/api/campaigns", methods=["GET"])
@login_required
def get_campaigns():
    campaigns = EmailCampaign.query.filter_by(user_id=current_user.id).all()
    return jsonify([c.to_dict() for c in campaigns])

# ============================================================
# HEALTH & INFO
# ============================================================

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "sender_configured": bool(GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET),
        "database": "SQLite"
    }), 200

# ============================================================
# DATABASE INITIALIZATION
# ============================================================

with app.app_context():
    db.create_all()
    print("✅ Database tables created")

# ============================================================
# RUN SERVER
# ============================================================

if __name__ == "__main__":
    print("\n" + "="*64)
    print("  📧 CRM SERVER WITH SQLITE DATABASE")
    print("="*64)
    print(f"  🌐 Server: http://0.0.0.0:5000")
    print(f"  🗄️  Database: SQLite (crm.db)")
    print(f"  🔐 OAuth: {'Configured' if GMAIL_CLIENT_ID else 'Not configured'}")
    print("="*64 + "\n")

    app.run(host='0.0.0.0', port=5000, debug=True)
