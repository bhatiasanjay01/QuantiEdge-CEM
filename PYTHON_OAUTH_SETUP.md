# Python Server with Google OAuth Setup

## ✅ What's Been Updated

Your CRM now uses a **Python Flask server** with **Google OAuth** for email sending instead of Supabase edge functions.

### Changes Made:
1. ✅ Updated `requirements.txt` with Google OAuth packages
2. ✅ Python server (`server.py`) configured with OAuth endpoints
3. ✅ Frontend (`emailApi.ts`) updated to call Python server
4. ✅ Settings page updated with OAuth connection UI
5. ✅ Email campaigns use Python server for sending

---

## 🚀 Setup Instructions

### Step 1: Set Up Google Cloud Console

You need to create OAuth credentials in Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Gmail API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Gmail API"
   - Click "Enable"

4. Create OAuth 2.0 Credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: "Web application"
   - Name: "QuantiEdge CRM"
   - Authorized JavaScript origins: `http://localhost:5000`
   - Authorized redirect URIs: `http://localhost:5000/api/auth/callback`
   - Click "Create"

5. **Copy the credentials:**
   - Client ID
   - Client Secret

### Step 2: Configure Environment Variables

Create a `.env.email` file or update your existing `.env`:

```bash
GMAIL_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your_client_secret_here
FLASK_SECRET_KEY=a_very_long_random_secret_key_for_sessions
```

### Step 3: Install Python Dependencies

```bash
pip install -r requirements.txt
```

Or install packages individually:
```bash
pip install Flask flask-cors google-auth-oauthlib google-api-python-client APScheduler
```

### Step 4: Start the Python Server

```bash
python server.py
```

You should see:
```
================================================================
  📧 EMAIL CAMPAIGN SERVER WITH OAUTH
================================================================
  🌐 Server: http://0.0.0.0:5000
  🔐 OAuth: Configured
  📅 Scheduler: Active
================================================================
```

---

## 🎯 How to Use

### 1. Connect Gmail Account

1. Open your CRM application
2. Sign in to your account
3. Go to **Settings** → **Email Setup**
4. Click **"Connect Gmail Account"**
5. You'll be redirected to Google to authorize
6. Grant permissions
7. You'll be redirected back with success message

### 2. Send Email Campaign

1. Go to **Email Campaigns**
2. Click **"New Campaign"**
3. Fill in campaign details
4. Select recipients
5. Click **"Send Campaign"**
6. Emails will be sent through your connected Gmail account!

---

## 📋 API Endpoints

The Python server provides these endpoints:

### OAuth Endpoints
- `GET /api/auth/google` - Initiate OAuth flow
- `GET /api/auth/callback` - OAuth callback (handles Google redirect)
- `GET /api/auth/status` - Check connection status

### Email Endpoints
- `POST /api/send-email` - Send immediate email
  ```json
  {
    "to": ["email@example.com"],
    "subject": "Subject",
    "body": "HTML content"
  }
  ```

- `POST /api/schedule-email` - Schedule email for later
  ```json
  {
    "to": ["email@example.com"],
    "subject": "Subject",
    "body": "HTML content",
    "send_at": "2025-10-20T10:00:00Z"
  }
  ```

### Other Endpoints
- `GET /api/emails` - Get all sent emails
- `GET /api/health` - Health check

---

## 🔧 Troubleshooting

### "GMAIL_CLIENT_ID not set" Warning
- Make sure your `.env` file has the OAuth credentials
- The server needs to be restarted after adding credentials

### "Failed to connect to server"
- Make sure Python server is running on port 5000
- Check the terminal for any error messages

### "Gmail account not connected" Error
- Go to Settings → Email Setup
- Click "Connect Gmail Account"
- Complete the OAuth flow

### OAuth Redirect Errors
- Make sure redirect URI in Google Console matches: `http://localhost:5000/api/auth/callback`
- Check that JavaScript origins includes: `http://localhost:5000`

---

## 🔒 Security Notes

1. **OAuth Tokens**: Stored securely in `token.json` file
2. **Automatic Refresh**: Tokens are automatically refreshed when expired
3. **Session Security**: Flask sessions use SECRET_KEY for encryption
4. **Scopes**: Only requests minimal permissions (send email + user info)

---

## ✨ Features

✅ **Google OAuth 2.0** - Secure authentication  
✅ **Automatic Token Refresh** - No manual re-authentication  
✅ **Gmail API** - Send emails through Gmail  
✅ **Email Scheduling** - Schedule campaigns for later  
✅ **Session Management** - Persistent connections  
✅ **Error Handling** - Graceful 401 errors when not connected  

---

## 📝 Next Steps

1. Set up Google Cloud Console credentials
2. Add credentials to `.env` file
3. Start Python server
4. Connect Gmail in Settings
5. Start sending email campaigns!

**Server must be running for email sending to work!**
