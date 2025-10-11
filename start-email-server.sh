#!/bin/bash

echo "============================================================"
echo "  📧 STARTING EMAIL CAMPAIGN SERVER"
echo "============================================================"
echo ""

# Check if required Python modules are installed
echo "Checking dependencies..."
if ! python3 -c "import flask" 2>/dev/null; then
    echo "❌ Flask not installed! Installing..."
    apt-get install -y python3-flask python3-flask-cors python3-apscheduler
fi

if ! python3 -c "import apscheduler" 2>/dev/null; then
    echo "❌ APScheduler not installed! Installing..."
    apt-get install -y python3-apscheduler
fi

# Load environment variables from .env file
if [ -f ".env" ]; then
    echo "✅ Loading credentials from .env file..."
    export $(grep -v '^#' .env | grep -v '^$' | xargs)
else
    echo "❌ Error: .env file not found!"
    exit 1
fi

# Check if credentials are set
if [ -z "$SENDER_EMAIL" ] || [ -z "$SENDER_PASSWORD" ]; then
    echo "❌ Error: SENDER_EMAIL or SENDER_PASSWORD not found in .env"
    exit 1
fi

echo "✅ All dependencies ready"
echo "✅ Credentials loaded"
echo "📧 Sender: $SENDER_EMAIL"
echo ""
echo "🚀 Starting Python server on port 5000..."
echo ""

# Start the server
python3 server.py
