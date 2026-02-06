@echo off
cls
echo ==========================================
echo   ResumeFlow - Starting Server
echo ==========================================
echo.

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo X Python not found. Please install Python 3.7+
    pause
    exit /b 1
)

echo Python found: 
python --version
echo.

REM Install dependencies
echo Installing dependencies...
pip install flask google-generativeai flask-cors --quiet

echo Dependencies installed
echo.

REM Start server
echo Starting Flask server...
echo Open your browser to: http://localhost:5000
echo.
echo Press Ctrl+C to stop the server
echo.

python app.py

pause
