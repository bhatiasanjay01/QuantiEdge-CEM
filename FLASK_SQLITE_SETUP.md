# Flask + SQLite CRM Setup Guide

## ✅ What's Been Replaced

Your CRM now uses **Flask + SQLAlchemy + SQLite** instead of Supabase! You have complete control over your database and authentication.

### Stack:
- **Backend**: Python Flask
- **Database**: SQLite (crm.db)
- **ORM**: SQLAlchemy
- **Auth**: Flask-Login + password hashing
- **OAuth**: Google OAuth for Gmail
- **Scheduler**: APScheduler for email scheduling

---

## 🚀 Quick Start

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

This installs:
- Flask (web framework)
- Flask-SQLAlchemy (database ORM)
- Flask-Login (authentication)
- Flask-CORS (cross-origin requests)
- Google OAuth packages
- APScheduler (job scheduling)
- Werkzeug (password hashing)

### 2. Set Environment Variables

Create `.env` file:
```bash
FLASK_SECRET_KEY=your_very_long_random_secret_key_here
GMAIL_CLIENT_ID=your_gmail_oauth_client_id
GMAIL_CLIENT_SECRET=your_gmail_oauth_client_secret
```

### 3. Start the Server

```bash
python server.py
```

You'll see:
```
================================================================
  📧 CRM SERVER WITH SQLITE DATABASE
================================================================
  🌐 Server: http://0.0.0.0:5000
  🗄️  Database: SQLite (crm.db)
  🔐 OAuth: Configured
================================================================
✅ Database tables created
```

The database file `crm.db` will be created automatically!

### 4. Start Frontend

```bash
npm run dev
```

---

## 📊 Database Schema

All tables are created automatically via SQLAlchemy models:

### Users Table
- id (primary key)
- email (unique)
- password_hash
- business_name
- business_url
- gmail_access_token
- gmail_refresh_token
- gmail_token_expires_at
- gmail_email
- created_at

### Contacts Table
- id
- user_id (foreign key)
- list_id (foreign key, optional)
- first_name
- last_name
- email
- phone
- company
- job_title
- tags (JSON)
- custom_fields (JSON)
- created_at
- updated_at

### Contact Lists Table
- id
- user_id (foreign key)
- name
- description
- created_at
- updated_at

### Email Campaigns Table
- id
- user_id (foreign key)
- name
- type (one-off/sequence)
- status (draft/scheduled/sending/sent/failed)
- subject
- content
- recipients_count
- sent_count
- open_rate
- click_rate
- scheduled_at
- sent_at
- created_at
- updated_at

### Campaign Recipients Table
- id
- campaign_id (foreign key)
- contact_id (foreign key, optional)
- email
- status
- sent_at
- opened_at
- clicked_at
- error_message
- created_at

---

## 🔐 Authentication Flow

### Sign Up
```
POST /api/auth/signup
{
  "email": "user@example.com",
  "password": "password123",
  "businessName": "My Business"
}
```

### Login
```
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Get Current User
```
GET /api/auth/me
```

### Logout
```
POST /api/auth/logout
```

All endpoints use Flask sessions with cookies (`credentials: 'include'`).

---

## 📧 Email & OAuth Endpoints

### Connect Gmail
```
GET /api/auth/google
```
Redirects to Google OAuth consent screen.

### Check Connection Status
```
GET /api/auth/status
```
Returns:
```json
{
  "is_connected": true,
  "email": "user@gmail.com"
}
```

### Send Email
```
POST /api/send-email
{
  "to": ["recipient@example.com"],
  "subject": "Hello",
  "body": "<p>Email content</p>"
}
```

### Schedule Email
```
POST /api/schedule-email
{
  "to": ["recipient@example.com"],
  "subject": "Hello",
  "body": "<p>Email content</p>",
  "send_at": "2025-10-20T10:00:00Z"
}
```

---

## 👥 Customer Management

### Get All Customers
```
GET /api/customers
```

### Create Customer
```
POST /api/customers
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "company": "Acme Corp",
  "tags": ["vip", "enterprise"]
}
```

### Delete Customer
```
DELETE /api/customers/:id
```

---

## 🗄️ Database Management

### View Database
```bash
sqlite3 crm.db
.tables
.schema users
SELECT * FROM users;
```

### Backup Database
```bash
cp crm.db crm_backup.db
```

### Reset Database
```bash
rm crm.db
python server.py  # Tables will be recreated
```

---

## 🔧 Key Features

✅ **No Supabase Dependency** - Full control over your data
✅ **SQLite Database** - Simple, portable, no setup required
✅ **Password Hashing** - Secure with Werkzeug
✅ **Session-Based Auth** - Flask-Login with cookies
✅ **Gmail OAuth** - Connect any Gmail account
✅ **Auto Token Refresh** - Tokens refreshed automatically
✅ **Email Scheduling** - APScheduler for delayed sending
✅ **User Isolation** - All data filtered by user_id
✅ **Relationships** - SQLAlchemy handles foreign keys

---

## 📝 Frontend Changes

### Removed:
- ❌ Supabase client
- ❌ Supabase auth
- ❌ Google OAuth button on login

### Added:
- ✅ `/src/lib/auth.ts` - Auth API calls
- ✅ `/src/lib/api.ts` - Customer API calls
- ✅ Updated AuthContext to use Flask backend
- ✅ All API calls use `credentials: 'include'` for cookies

---

## 🎯 How to Use

1. **Sign Up**: Create account with email/password
2. **Log In**: Use your credentials
3. **Connect Gmail**: Go to Settings → Connect Gmail Account
4. **Add Customers**: Go to Customers page
5. **Send Emails**: Create campaigns and send!

---

## 🔒 Security Notes

- Passwords hashed with Werkzeug (PBKDF2)
- Flask sessions encrypted with SECRET_KEY
- OAuth tokens stored in database (not in files)
- User data isolated by user_id
- CORS configured for localhost:5173

---

## 💡 Pro Tips

### Use PostgreSQL Instead of SQLite

Change in `server.py`:
```python
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://user:pass@localhost/crm'
```

### Add Email in Production

Install packages:
```bash
pip install gunicorn python-dotenv
```

Run:
```bash
gunicorn -w 4 -b 0.0.0.0:5000 server:app
```

---

**You now have a fully self-contained CRM with SQLite database!** No external dependencies besides Gmail OAuth.
