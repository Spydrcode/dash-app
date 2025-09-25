@echo off
title Dash App - Office Access
color 0A
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    DASH APP - OFFICE ACCESS                  ║
echo ║  💰 $0/month • 🔒 Secure HTTPS • 📊 Real OCR Data           ║
echo ╚══════════════════════════════════════════════════════════════╝

:: Kill any existing ngrok processes to avoid conflicts
echo Stopping any existing ngrok processes...
taskkill /F /IM ngrok.exe 2>nul

:: Build if needed
if not exist ".next" (
    echo 🔨 Building production version...
    call npm run build
)

:: Start the Next.js server
echo 🚀 Starting production server...
start /B "Dash App Server" npm run start

:: Wait a bit for server to start
echo Waiting for server to initialize...
timeout /t 5 /nobreak > nul

:: Start ngrok tunnel
echo 🔒 Creating secure HTTPS tunnel for office access...
echo.
echo 📱 SHARE THIS URL WITH YOUR OFFICE TEAM:
echo.
ngrok http 3000

pause