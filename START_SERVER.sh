#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================================================"
echo "  🚀 STARTING CRM SERVER"
echo "================================================================"

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Python 3 found${NC}"

# Check if required files exist
if [ ! -f "server.py" ]; then
    echo -e "${RED}❌ server.py not found${NC}"
    exit 1
fi

if [ ! -f "models.py" ]; then
    echo -e "${RED}❌ models.py not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Required files found${NC}"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠ .env file not found, creating default...${NC}"
    cat > .env << 'EOF'
FLASK_SECRET_KEY=development-secret-key-change-in-production
GMAIL_CLIENT_ID=your_gmail_client_id_here
GMAIL_CLIENT_SECRET=your_gmail_client_secret_here
EOF
    echo -e "${YELLOW}⚠ Please edit .env file with your Gmail OAuth credentials${NC}"
fi

# Install Python dependencies
echo ""
echo "📦 Installing Python dependencies..."
pip3 install -q -r requirements.txt 2>&1 | grep -v "Requirement already satisfied" || echo -e "${GREEN}✓ Dependencies installed${NC}"

# Check if port 5000 is already in use
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${RED}❌ Port 5000 is already in use${NC}"
    echo "Please stop the existing process or use a different port"
    exit 1
fi

echo ""
echo "================================================================"
echo "  🌐 Starting Flask Server on http://localhost:5000"
echo "================================================================"
echo ""

# Start the server
python3 server.py
