# 🚀 CRM Application - Complete Setup Guide

## ⚠️ IMPORTANT: Read This First

This CRM has **TWO parts** that MUST both be running:
1. **Python Backend** (Flask server on port 5000)
2. **React Frontend** (Vite dev server on port 5173)

---

## 📋 Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn
- Gmail account (for sending emails)

---

## 🔧 Initial Setup (One-Time)

### Step 1: Install Python Dependencies

```bash
pip install -r requirements.txt
```

Or individually:
```bash
pip install Flask flask-cors Flask-Login Flask-SQLAlchemy google-auth-oauthlib google-api-python-client APScheduler Werkzeug
```

### Step 2: Install Frontend Dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

Create a `.env` file in the project root:

```bash
FLASK_SECRET_KEY=your-very-long-random-secret-key-here
GMAIL_CLIENT_ID=your_gmail_oauth_client_id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your_gmail_oauth_client_secret
```

**To get Gmail OAuth credentials:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Gmail API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:5000/api/auth/callback`
6. Copy Client ID and Secret to `.env`

---

## 🎯 How to Run (Every Time)

### Option A: Using the Startup Script (Recommended)

```bash
./START_SERVER.sh
```

This will:
- Check all dependencies
- Create database automatically
- Start Flask server on port 5000

Then in a **SECOND TERMINAL**:

```bash
npm run dev
```

This starts the frontend on port 5173.

### Option B: Manual Startup

**Terminal 1 (Backend):**
```bash
python server.py
```

You should see:
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

**Terminal 2 (Frontend):**
```bash
npm run dev
```

You should see:
```
  VITE v5.4.19  ready in 123 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## 🌐 Accessing the Application

1. Open browser: **http://localhost:5173**
2. You'll see the login page
3. Click "Sign up" to create an account
4. Use email and password (stored securely in SQLite)

---

## 📧 Setting Up Email (Required for Campaigns)

1. Log into the app
2. Go to **Settings** (click your profile icon)
3. Click **Email Setup** tab
4. Click **Connect Gmail Account**
5. Authorize with Google
6. You'll be redirected back with success message

Now you can send emails!

---

## 🎨 Main Features

### 1. Dashboard
- Overview of customers, campaigns, and analytics
- Quick stats and metrics

### 2. Customers
- Add customers manually
- Import from CSV
- Manage customer data
- Delete customers

### 3. Email Campaigns
- **Compose Email**: Create and send email to selected recipients
- **Import CSV**: Bulk import contacts from CSV file
- **Schedule Emails**: Set future send time
- **Campaign History**: View all sent/scheduled campaigns

### 4. Analytics
- Campaign performance metrics
- Open rates and click rates (coming soon)

### 5. Settings
- Business information
- Gmail OAuth connection
- Notification preferences
- Security settings

---

## 📁 CSV Import Format

Your CSV should have these columns (flexible naming):

```
First Name, Last Name, Email, Phone, Company, Job Title
John, Doe, john@example.com, +1234567890, Acme Corp, CEO
Jane, Smith, jane@example.com, +0987654321, Tech Inc, CTO
```

**Supported Column Names:**
- First Name: "first name", "firstname", "first"
- Last Name: "last name", "lastname", "last"
- Email: "email", "primary en email"
- Phone: "phone", "mobile phone", "work direct phone"
- Company: "company", "company name"

---

## 🔧 Troubleshooting

### "Failed to fetch" Error

**Cause:** Python backend is not running

**Solution:**
1. Check Terminal 1 - is `python server.py` running?
2. Visit http://localhost:5000/api/health
3. Should return: `{"status": "healthy", "sender_configured": true, "database": "SQLite"}`

### "Gmail account not connected" Error

**Cause:** You haven't connected Gmail via OAuth

**Solution:**
1. Go to Settings → Email Setup
2. Click "Connect Gmail Account"
3. Complete OAuth flow

### Port Already in Use

**Backend (5000):**
```bash
lsof -ti:5000 | xargs kill -9
```

**Frontend (5173):**
```bash
lsof -ti:5173 | xargs kill -9
```

### Database Errors

**Reset database:**
```bash
rm crm.db
python server.py  # Creates fresh database
```

### Can't Send Emails

**Check:**
1. Is Gmail connected? (Settings → Email Setup)
2. Are OAuth credentials in `.env` correct?
3. Is redirect URI in Google Console: `http://localhost:5000/api/auth/callback`

---

## 📊 Database Schema

The SQLite database (`crm.db`) contains:

- **users**: User accounts with encrypted passwords
- **contacts**: Customer/contact information
- **contact_lists**: Organized contact lists
- **email_campaigns**: Campaign metadata
- **campaign_recipients**: Individual recipient tracking

---

## 🛠️ Development Commands

```bash
# Start backend
python server.py

# Start frontend
npm run dev

# Build frontend for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# View database
sqlite3 crm.db
```

---

## 🔒 Security Notes

- Passwords hashed with PBKDF2
- Sessions encrypted with SECRET_KEY
- OAuth tokens stored encrypted in database
- CORS configured for localhost only
- CSRF protection via Flask sessions

---

## 📝 API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Log in
- `POST /api/auth/logout` - Log out
- `GET /api/auth/me` - Get current user

### Gmail OAuth
- `GET /api/auth/google` - Initiate OAuth
- `GET /api/auth/callback` - OAuth callback
- `GET /api/auth/status` - Check connection

### Customers
- `GET /api/customers` - List all
- `POST /api/customers` - Create new
- `DELETE /api/customers/:id` - Delete

### Emails
- `POST /api/send-email` - Send immediate
- `POST /api/schedule-email` - Schedule for later
- `GET /api/campaigns` - List campaigns

### Health
- `GET /api/health` - Server status

---

## ✅ Success Checklist

- [ ] Python server running on port 5000
- [ ] Frontend running on port 5173
- [ ] Can access http://localhost:5173
- [ ] Can sign up and log in
- [ ] Gmail connected in Settings
- [ ] Can add customers manually
- [ ] Can import CSV
- [ ] Can compose and send email

---

## 🆘 Need Help?

1. Check both terminals are running
2. Visit http://localhost:5000/api/health to test backend
3. Check browser console (F12) for errors
4. Check Python terminal for server errors
5. Verify `.env` file has correct OAuth credentials

---

**Remember: Both servers must be running!**
- Backend: `python server.py`
- Frontend: `npm run dev`
