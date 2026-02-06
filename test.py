#!/usr/bin/env python3
"""
Test script to verify ResumeFlow is working correctly
"""
import sys
try:
    import google.generativeai as genai
    import flask
    print("✅ All dependencies installed!")
    
    # Test API key
    API_KEY = "AIzaSyCINYPyBTTxepIqWut54wdc9hp-3t3ypeA"
    genai.configure(api_key=API_KEY)
    
    print(f"✅ API Key configured: {API_KEY[:20]}...")
    
    # Test model
    model = genai.GenerativeModel('gemini-2.0-flash-exp')
    
    print("✅ Testing Gemini API connection...")
    response = model.generate_content("Return only: {\"status\": \"working\"}")
    
    print(f"✅ API Response: {response.text[:100]}")
    
    print("\n" + "="*60)
    print("🎉 ALL TESTS PASSED!")
    print("="*60)
    print("\nYour ResumeFlow app is ready to run!")
    print("Start the server with: python app.py")
    print("Then open: http://localhost:5000")
    print()
    
except ImportError as e:
    print(f"❌ Missing dependency: {e}")
    print("\nInstall with: pip install flask google-generativeai flask-cors")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
