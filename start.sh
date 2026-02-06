#!/bin/bash

echo "=========================================="
echo "  🚀 ResumeFlow - Starting Server"
echo "=========================================="
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.7+"
    exit 1
fi

echo "✅ Python found: $(python3 --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
pip3 install flask google-generativeai flask-cors -q || pip install flask google-generativeai flask-cors -q

echo "✅ Dependencies installed"
echo ""

# Start server
echo "🚀 Starting Flask server..."
echo "📱 Open your browser to: http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python3 app.py
