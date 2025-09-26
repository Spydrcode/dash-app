@echo off
echo ========================================
echo   DASH APP - PRODUCTION AUTO-START
echo ========================================
echo.

REM Change to the app directory
cd /d "c:\Users\dusti\git\dash-app"

echo Starting Next.js Production Server...
start "Dash App Server" cmd /k "npm start"

echo Waiting for server to initialize...
timeout /t 5 /nobreak >nul

echo Starting ngrok tunnel...
start "ngrok Tunnel" cmd /k "ngrok http 3000"

echo.
echo ========================================
echo   DASH APP IS STARTING UP!
echo ========================================
echo.
echo Local URL: http://localhost:3000
echo Public URL: Check the ngrok window for the tunnel URL
echo.
echo Both windows will stay open to keep the services running.
echo Close both windows to stop the services.
echo.
echo To check status, visit: http://127.0.0.1:4040
echo.
pause