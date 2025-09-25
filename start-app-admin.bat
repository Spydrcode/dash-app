@echo off
title Dash App - Admin Mode
echo =======================================
echo Starting Dash App with Admin Rights...
echo =======================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorlevel% == 0 (
    echo ✓ Running as Administrator
    echo.
    
    REM Add firewall rule
    echo Adding Windows Firewall rule...
    netsh advfirewall firewall add rule name="Dash App Port 3000" dir=in action=allow protocol=TCP localport=3000 >nul 2>&1
    if %errorlevel% == 0 (
        echo ✓ Firewall rule added successfully
    ) else (
        echo ℹ Firewall rule may already exist
    )
    
    echo.
    echo Server will be accessible at:
    echo   Local:   http://localhost:3000
    echo   Network: http://192.168.1.129:3000
    echo.
    echo Press Ctrl+C to stop the server
    echo.
    
    REM Start the server
    npx next dev -H 0.0.0.0 -p 3000
    
) else (
    echo ❌ This script must be run as Administrator!
    echo.
    echo Right-click this file and select "Run as administrator"
    echo Or run PowerShell as Administrator and use: .\start-app.bat
    echo.
    pause
)