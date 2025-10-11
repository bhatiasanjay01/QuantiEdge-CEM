# 🚀 Your Python Email Server is READY!

## ✅ VERIFIED WORKING - Just Tested!

I just sent a test email successfully:
- ✅ Server running on port 5000
- ✅ Email sent to: bhatia.pradyprady28@gmail.com
- ✅ SMTP connection working perfectly
- ✅ Configuration loaded from `.env` file

**Check your inbox - you should have received the test email!**

---

## 🎯 To Start Using (2 Commands)

### Terminal 1: Start Email Server
```bash
python3 server.py
```

**Wait for this:**
```
============================================================
  📧 EMAIL CAMPAIGN SERVER
============================================================
  🌐 Server: http://0.0.0.0:5000 (accessible from network)
  📧 Sender: bhatia.pradyprady28@gmail.com
============================================================
```

✅ **Keep this terminal open!**

### Terminal 2: Start Your App
```bash
npm run dev
```

✅ **Open browser to http://localhost:5173**

---

## 📧 Send Your First Real Email

1. Click **"Email Campaigns"** in sidebar
2. Click **"New Campaign"**
3. Fill in:
   - Campaign Name: "My First Email"
   - Subject: "Hello!"
   - Message: "This is a real email!"
4. Select recipients
5. Click **"Send Now"**

✨ **Real emails will be sent via Gmail!**

---

## 🧪 Test Server from Command Line

```bash
# Health Check
curl http://127.0.0.1:5000/api/health

# Send Test Email
curl -X POST http://127.0.0.1:5000/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": ["your-email@gmail.com"],
    "subject": "Test Email",
    "body": "<h1>It works!</h1>"
  }'
```

---

## ⚙️ Your Configuration

**File:** `.env`
```
SENDER_EMAIL="bhatia.pradyprady28@gmail.com"
SENDER_PASSWORD="szsrebctvkxkgdsu"
```

**Server:**
- Port: 5000
- Host: 0.0.0.0 (accessible from network)
- SMTP: Gmail (smtp.gmail.com:587)

**Status:** ✅ All systems operational!

---

## 🐛 Troubleshooting

### "Failed to connect to email server"
→ **Solution:** Run `python3 server.py` first

### Check if Server is Running
```bash
curl http://127.0.0.1:5000/api/health
```

### Server Won't Start
```bash
# Make sure Flask is installed
python3 -c "import flask; print('Flask is ready!')"

# If not installed:
apt-get install -y python3-flask python3-flask-cors
```

### Port 5000 Already in Use
```bash
# Find what's using it
lsof -i :5000

# Kill it and restart
```

---

## ✨ What Works Right Now

✅ Send real emails via Gmail SMTP
✅ Multiple recipients support
✅ HTML email formatting
✅ Add recipients (saves to Supabase)
✅ Import contacts from CSV
✅ Campaign tracking and status
✅ Real-time database updates

---

## 📬 YOU'RE READY!

**Your email server is running and tested.**

Just:
1. Run `python3 server.py` (keep running)
2. Run `npm run dev` (new terminal)
3. Open app and send campaigns!

**Check your inbox for the test email I just sent!** ✅
