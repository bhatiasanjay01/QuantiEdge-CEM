#!/bin/bash

echo "============================================================"
echo "  STARTING EMAIL CAMPAIGN SERVER"
echo "============================================================"
echo ""

# Check if Flask is installed
if ! python3 -c "import flask" 2>/dev/null; then
    echo "❌ Flask is not installed!"
    echo "Installing Flask and Flask-CORS..."
    apt-get install -y python3-flask python3-flask-cors
fi

# Check if .env.email exists
if [ ! -f ".env.email" ]; then
    echo "❌ Error: .env.email file not found!"
    echo "Please create .env.email with your Gmail credentials."
    exit 1
fi

echo "✅ All dependencies installed"
echo "✅ Email credentials found"
echo ""
echo "Starting server on http://127.0.0.1:5000..."
echo ""

# Start the server
python3 server.py
