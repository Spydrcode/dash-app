@echo off
REM Auto-startup script for Windows Task Scheduler
REM This runs without showing windows (silent startup)

cd /d "c:\Users\dusti\git\dash-app"

REM Start Next.js production server in background
start /min "Dash App Server" cmd /c "npm start"

REM Wait for server to start
timeout /t 8 /nobreak >nul

REM Start ngrok tunnel in background  
start /min "ngrok Tunnel" cmd /c "ngrok http 3000"

REM Optional: Write status to log file
echo %date% %time% - Dash App auto-started >> c:\Users\dusti\git\dash-app\startup.log