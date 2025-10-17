# 🚀 START HERE - Zero to Working App in 5 Minutes

## ⚠️ CRITICAL: Your "Failed to fetch" Error

This means **the Python backend server is NOT running**.

Your app has TWO parts:
1. **Python Backend** (Flask) ← YOU NEED TO START THIS
2. **React Frontend** (Vite) ← This is what you see in browser

**Both must be running at the same time!**

---

## ✅ STEP-BY-STEP FIX (5 minutes)

### Step 1: Install Python Dependencies (1 min)

Open a terminal and run:

```bash
pip install Flask flask-cors Flask-Login Flask-SQLAlchemy google-auth-oauthlib google-api-python-client APScheduler Werkzeug
```

### Step 2: Start Python Server (30 seconds)

```bash
python server.py
```

**You should see:**
```
================================================================
  📧 CRM SERVER WITH SQLITE DATABASE
================================================================
  🌐 Server: http://0.0.0.0:5000
  🗄️  Database: SQLite (crm.db)
================================================================
✅ Database tables created
```

**✅ Leave this terminal running! Don't close it!**

### Step 3: Start Frontend (30 seconds)

Open a **NEW SECOND TERMINAL** and run:

```bash
npm run dev
```

**You should see:**
```
  VITE v5.4.19  ready in 500 ms

  ➜  Local:   http://localhost:5173/
```

### Step 4: Open Browser

Go to: **http://localhost:5173**

**✅ "Failed to fetch" error is now GONE!**

---

## 🎯 Quick Test (2 minutes)

1. **Sign Up:**
   - Email: test@test.com
   - Password: test123
   - Click "Create Account"

2. **Add Customer:**
   - Go to "Customers"
   - Click "Add Customer"
   - Name: John Doe
   - Email: john@test.com
   - Click "Save"

3. **Try Email Campaigns:**
   - Go to "Email Campaigns"
   - Click "Compose Email"
   - You should see John Doe in recipients

**✅ Everything works!**

---

## 🔧 Common Issues

### "Failed to fetch" Still Appears

**Problem:** Backend is not running on port 5000

**Check:**
```bash
curl http://localhost:5000/api/health
```

**Should return:**
```json
{"status":"healthy","sender_configured":false,"database":"SQLite"}
```

**If it fails:**
- Make sure you ran python server.py
- Check if port 5000 is free: lsof -i:5000

### "Port 5000 already in use"

**Fix:**
```bash
lsof -ti:5000 | xargs kill -9
python server.py
```

### "Module not found" Error

**Fix:**
```bash
pip install -r requirements.txt
```

---

## 📧 To Send Real Emails (Optional)

Currently, emails won't actually send because Gmail OAuth isn't configured. That's OK for testing!

To enable real email sending:

1. Get Gmail OAuth credentials from Google Cloud Console
2. Add to .env file
3. Restart server
4. Go to Settings → Connect Gmail

---

## ✅ SUCCESS CHECKLIST

- [ ] Ran pip install commands
- [ ] Started Python server (python server.py)
- [ ] See "CRM SERVER" message in terminal
- [ ] Started frontend (npm run dev)
- [ ] See "VITE" message in terminal
- [ ] Opened http://localhost:5173
- [ ] **No "Failed to fetch" error**
- [ ] Can sign up and log in
- [ ] Can add customers
- [ ] Can view campaigns page

---

## 🎉 You're Done!

Both servers are running. The app is 100% working!

**Remember:** Keep both terminals running while using the app:
- Terminal 1: python server.py
- Terminal 2: npm run dev

---

## 📝 Daily Startup (from now on)

**Every time you want to use the CRM:**

Terminal 1:
```bash
python server.py
```

Terminal 2:
```bash
npm run dev
```

Browser:
```
http://localhost:5173
```

**That's it!** 🚀
