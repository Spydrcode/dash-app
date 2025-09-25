@echo off
title Dash App - Office Access
color 0A

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    DASH APP - OFFICE ACCESS                  ║
echo ║                                                              ║
echo ║  💰 Cost: $0/month with local Ollama AI                     ║
echo ║  🔒 Secure: HTTPS tunnel for office clients                 ║
echo ║  📊 OCR: Real data extraction (no mock data)                ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: Build production if needed
if not exist ".next" (
    echo 🔨 Building production version...
    npm run build
    if %errorlevel% neq 0 (
        echo ❌ Build failed. Press any key to exit.
        pause > nul
        exit /b 1
    )
)

:: Start the application with office access
echo 🚀 Starting Dash App with office access...
echo.
call deploy-with-ngrok.bat

pause