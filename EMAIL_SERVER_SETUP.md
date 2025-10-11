# Email Campaign Server Setup Guide

This guide explains how to set up and run the Python Flask server to send real emails through your email campaign tool.

## Prerequisites

- Python 3.7 or higher installed
- Gmail account with App Password (for 2FA users)
- Node.js and npm (already installed for the React app)

## Setup Instructions

### 1. Install Python Dependencies

```bash
# Install Flask and Flask-CORS
pip install -r requirements.txt
```

Or install manually:
```bash
pip install Flask==3.0.0 flask-cors==4.0.0
```

### 2. Configure Email Credentials

Your `.env.email` file is already configured with:
```
SENDER_EMAIL="bhatia.pradyprady28@gmail.com"
SENDER_PASSWORD="szsrebctvkxkgdsu"
```

**Important Notes:**
- The password `szsrebctvkxkgdsu` is a Gmail App Password
- If you have 2-Factor Authentication enabled on Gmail, you MUST use an App Password
- Regular Gmail passwords will NOT work with SMTP if 2FA is enabled

### 3. Generating a Gmail App Password (if needed)

If you need to create a new App Password:

1. Go to your Google Account: https://myaccount.google.com/
2. Click on **Security** in the left sidebar
3. Under "How you sign in to Google", click on **2-Step Verification**
4. Scroll down and click on **App passwords**
5. Select **Mail** and **Other (Custom name)**
6. Enter "Email Campaign Tool" as the name
7. Click **Generate**
8. Copy the 16-character password and update `.env.email`

## Running the Email Server

### Start the Server

```bash
# From the project root directory
python server.py
```

You should see:
```
============================================================
  EMAIL CAMPAIGN SERVER
============================================================
  Running on: http://127.0.0.1:5000
  Sender Email: bhatia.pradyprady28@gmail.com
============================================================
```

### Keep the Server Running

**IMPORTANT:** The Python server MUST be running for emails to be sent.

- The server runs on port 5000
- Your React app will connect to it when sending emails
- Keep the terminal window open while using the app
- Press `Ctrl+C` to stop the server

## Using the Email Campaign Tool

### 1. Start the React App

In a **new terminal window**:
```bash
npm run dev
```

### 2. Send an Email Campaign

1. Navigate to **Email Campaigns** in your app
2. Click **"New Campaign"**
3. Fill in:
   - Campaign Name (e.g., "Test Campaign")
   - Subject Line (e.g., "Hello from QuantiEdge!")
   - Message content
4. Select recipients from the list
5. Click **"Send Now"** (not scheduled)

### 3. What Happens

The app will:
1. Save the campaign to Supabase (status: "sending")
2. Send HTTP request to Python server
3. Python server sends actual emails via Gmail SMTP
4. Update campaign status to "sent" or "failed"

### 4. Monitor Emails

Check the Python server terminal for real-time logs:
```
🔌 Connecting to Gmail SMTP server for recipient: user@example.com...
✅ Logged in successfully!
📤 Sending email to user@example.com...
✅ Email successfully sent to user@example.com
```

## Features

### Send Immediate Emails
- Creates campaign in database
- Sends emails immediately via Gmail SMTP
- Updates status to "sent" with timestamp
- Tracks success/failure counts

### Schedule Emails for Later
- Saves campaign with "scheduled" status
- Logs scheduled time (actual sending requires job scheduler in production)
- For production, integrate with Celery or similar task queue

### Add Recipients
- Click "Add Recipient" button
- Fill in contact details
- Saves directly to Supabase `contacts` table
- Creates "Direct Additions" list automatically
- Recipients immediately available for campaigns

### Import from CSV
- Click "Contact Lists" → "New List / Import CSV"
- Supports flexible column names
- Required: firstName, lastName, email
- Optional: phone, company, jobTitle

## Troubleshooting

### Error: "Server is not configured with sender credentials"
- Check that `.env.email` exists in the project root
- Verify SENDER_EMAIL and SENDER_PASSWORD are set correctly
- Restart the Python server

### Error: "SMTP Authentication Error"
- You likely need an App Password (see setup instructions above)
- Regular Gmail password won't work with 2FA enabled
- Double-check the password in `.env.email`

### Error: "Failed to connect to email server"
- Make sure Python server is running on port 5000
- Check no other service is using port 5000
- Verify Flask server started successfully

### Emails Not Being Received
- Check spam folder
- Verify recipient email addresses are correct
- Check Python server logs for error messages
- Try sending to your own email first as a test

## API Endpoints

The Flask server provides these endpoints:

### POST /api/send-email
```json
{
  "to": ["email1@example.com", "email2@example.com"],
  "subject": "Email subject",
  "body": "Email content (HTML supported)"
}
```

### POST /api/schedule-email
```json
{
  "to": ["email@example.com"],
  "subject": "Email subject",
  "body": "Email content",
  "send_at": "2024-12-25T10:00:00Z"
}
```

### GET /api/health
Health check endpoint to verify server is running

## Production Considerations

For production deployment, you would need to:

1. **Use a dedicated SMTP service** (SendGrid, AWS SES, Mailgun)
2. **Implement email queue** (Celery, RabbitMQ, Redis Queue)
3. **Add rate limiting** to prevent spam
4. **Implement retry logic** for failed sends
5. **Store email credentials securely** (environment variables, secrets manager)
6. **Add email tracking** (opens, clicks, bounces)
7. **Implement unsubscribe** functionality
8. **Add email templates** with personalization

## Security Notes

- Never commit `.env.email` to version control
- Use App Passwords instead of real passwords
- Rotate passwords regularly
- Monitor for suspicious activity
- Implement rate limiting in production
