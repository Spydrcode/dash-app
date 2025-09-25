@echo off
title Dash App - Remote Access Setup
color 0A

echo ========================================
echo    DASH APP REMOTE ACCESS SETUP
echo ========================================
echo.

echo Checking if app is running...
netstat -ano | findstr :3000 >nul
if %errorlevel%==0 (
    echo [OK] App is running on port 3000
) else (
    echo [INFO] Starting Dash App...
    start "Dash App Server" cmd /k "npm run dev:network"
    echo Waiting 10 seconds for app to start...
    timeout /t 10 >nul
)

echo.
echo ========================================
echo    CHOOSE YOUR REMOTE ACCESS METHOD
echo ========================================
echo.
echo 1. Ngrok (Recommended - Requires signup)
echo 2. LocalHost.run (No signup needed)
echo 3. Just start the app (no remote access)
echo 4. Exit
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" goto ngrok
if "%choice%"=="2" goto localhost_run
if "%choice%"=="3" goto app_only
if "%choice%"=="4" goto exit
goto invalid

:ngrok
echo.
echo ========================================
echo           NGROK SETUP
echo ========================================
echo.

ngrok version >nul 2>&1
if %errorlevel%==0 (
    echo [OK] Ngrok is installed
    echo Starting ngrok tunnel...
    echo.
    echo Your public URL will appear below:
    echo ========================================
    start "Ngrok Tunnel" cmd /k "ngrok http 3000"
    echo.
    echo Share the https://xxxxx.ngrok.io URL with your clients!
    echo Press any key to continue...
    pause >nul
) else (
    echo [ERROR] Ngrok is not installed
    echo.
    echo Please:
    echo 1. Download from: https://ngrok.com/download
    echo 2. Install and add to PATH
    echo 3. Sign up at: https://ngrok.com
    echo 4. Get auth token: https://dashboard.ngrok.com/
    echo 5. Run: ngrok config add-authtoken YOUR_TOKEN
    echo 6. Run this script again
    echo.
    pause
)
goto end

:localhost_run
echo.
echo ========================================
echo        LOCALHOST.RUN SETUP
echo ========================================
echo.
echo Starting LocalHost.run tunnel...
echo This will create a public URL for your app.
echo.
echo The URL will appear below - share it with clients:
echo ========================================
start "LocalHost.run Tunnel" cmd /k "ssh -R 80:localhost:3000 localhost.run"
echo.
echo Share the https://xxxxx.lhr.life URL with your clients!
echo Press any key to continue...
pause >nul
goto end

:app_only
echo.
echo ========================================
echo         LOCAL ACCESS ONLY
echo ========================================
echo.
echo Your app is running locally at:
echo - http://localhost:3000
echo - http://192.168.x.x:3000 (local network only)
echo.
echo For remote access, restart this script and choose option 1 or 2.
echo.
pause
goto end

:invalid
echo.
echo Invalid choice. Please select 1-4.
echo.
pause
cls
goto start

:exit
echo.
echo Goodbye!
timeout /t 2 >nul
exit

:end
echo.
echo ========================================
echo              ALL DONE!
echo ========================================
echo.
echo Your Dash App is now accessible remotely!
echo.
echo IMPORTANT REMINDERS:
echo - Only share URLs with trusted clients
echo - Stop tunnels when not needed
echo - Monitor your app for uploads
echo.
echo Press any key to exit...
pause >nul