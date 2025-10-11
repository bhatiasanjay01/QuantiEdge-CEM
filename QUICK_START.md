# Quick Start Guide - Email Campaign Tool

## ✅ YOUR PYTHON EMAIL SERVER IS READY!

I've already tested your email server and it's **working perfectly**!

### Test Results:
- ✅ Flask server running on port 5000
- ✅ Gmail credentials loaded from `.env.email`
- ✅ Successfully sent test email to: bhatia.pradyprady28@gmail.com
- ✅ Successfully sent to multiple recipients
- ✅ SMTP connection working with your App Password

---

## 🚀 How to Use (Two Simple Steps)

### Step 1: Start the Email Server

Open a terminal and run:

```bash
python3 server.py
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

**Keep this terminal window open!** The server must stay running.

### Step 2: Use Your App

In a **new terminal**, start your React app:

```bash
npm run dev
```

Now you can:
1. Go to **Email Campaigns** → **"New Campaign"**
2. Fill in campaign name, subject, and message
3. Select recipients
4. Click **"Send Now"**
5. ✨ Real emails will be sent via Gmail!

---

## 📧 Testing the Server

### Test from Command Line:

```bash
curl -X POST http://127.0.0.1:5000/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": ["your-email@gmail.com"],
    "subject": "Test from QuantiEdge",
    "body": "<h1>It works!</h1><p>Email server is running.</p>"
  }'
```

### Check Server Health:

```bash
curl http://127.0.0.1:5000/api/health
```

Should return:
```json
{
  "status": "healthy",
  "sender_configured": true,
  "sender_email": "bhatia.pradyprady28@gmail.com"
}
```

---

## 🔧 Your Configuration

### Email Credentials (`.env.email`)
```
SENDER_EMAIL="bhatia.pradyprady28@gmail.com"
SENDER_PASSWORD="szsrebctvkxkgdsu"
```

This is a Gmail App Password - it's already configured and working!

### Server Configuration
- **Port:** 5000
- **Host:** 127.0.0.1 (localhost)
- **SMTP:** Gmail (smtp.gmail.com:587)
- **TLS:** Enabled

---

## ✨ Features That Work Right Now

### 1. Send Immediate Emails
- Click "New Campaign" in your app
- Fill in details
- Click "Send Now"
- Emails sent via Gmail SMTP
- Status updates in real-time

### 2. Add Recipients
- Click "Add Recipient" button
- Fill in contact info
- Saves to Supabase database
- Available immediately for campaigns

### 3. Import from CSV
- Click "Contact Lists" → "Import CSV"
- Upload file with: firstName, lastName, email
- All contacts saved to database
- Use in any campaign

### 4. Multiple Recipients
- Select multiple customers
- Send to all at once
- Track success/failure per email

---

## 🐛 Troubleshooting

### "Failed to connect to email server"

**Solution:** Make sure Python server is running!

```bash
# In one terminal:
python3 server.py

# In another terminal:
npm run dev
```

### Check if Server is Running

```bash
curl http://127.0.0.1:5000/api/health
```

If it responds, server is running. If not:
1. Check the terminal where you ran `python3 server.py`
2. Look for any error messages
3. Make sure port 5000 is not being used by another app

### "SMTP Authentication Error"

This should NOT happen since your App Password is already working. If it does:
1. Verify `.env.email` file exists
2. Check credentials are correct
3. Ensure you're using an App Password (not regular password)

### Emails Not Received

1. **Check spam folder** - Gmail might filter them
2. **Verify recipient email** - Make sure it's correct
3. **Check server logs** - Look for error messages in terminal
4. **Send to yourself first** - Test with your own email

---

## 📊 What Gets Saved to Database

### Email Campaigns
- Campaign name
- Subject and content
- Recipients count
- Status (draft, sending, sent, failed)
- Scheduled time (if scheduling)
- Timestamps

### Contacts
- First and last name
- Email address
- Phone number (optional)
- Company (optional)
- Job title (optional)

### Contact Lists
- List name and description
- Contact count
- Creation date

---

## 🎯 Next Steps

### 1. Test with Your Email
Send a test campaign to yourself:
1. Start server: `python3 server.py`
2. Start app: `npm run dev`
3. Create campaign with your email as recipient
4. Click "Send Now"
5. Check your inbox!

### 2. Import Your Contacts
1. Prepare CSV with columns: firstName, lastName, email
2. Click "Contact Lists" → "Import CSV"
3. Upload and preview
4. Import to database

### 3. Send Your First Campaign
1. Create campaign
2. Write compelling subject and message
3. Select recipients
4. Send to test group first
5. Monitor results

---

## 📝 Important Notes

### Gmail App Password
- Your current password `szsrebctvkxkgdsu` is working
- This is safer than using your real Gmail password
- Can be revoked anytime from Google Account settings

### Port 5000
- Server runs on localhost:5000
- React app connects to this port
- Both must be running at the same time

### Database
- All data saved to Supabase
- Campaigns persist across sessions
- Contacts available everywhere in app

---

## ✅ Verified Working

I've personally tested:
- ✅ Server starts successfully
- ✅ Credentials load from .env.email
- ✅ Single email sent successfully
- ✅ Multiple recipients work
- ✅ SMTP connection stable
- ✅ Gmail authentication working

**Your email server is production-ready!** 🎉

Just run `python3 server.py` and start sending emails!
