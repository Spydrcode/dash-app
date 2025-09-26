@echo off
echo Starting Dash App Production Server...
cd /d "c:\Users\dusti\git\dash-app"

echo Stopping any existing PM2 processes...
pm2 stop dash-app-prod 2>nul
pm2 delete dash-app-prod 2>nul

echo Starting production server with PM2...
pm2 start pm2.config.json

echo Setting PM2 to start on system boot...
pm2 startup
pm2 save

echo.
echo ===== DASH APP PRODUCTION SERVER STARTED =====
echo.
echo App running at: http://localhost:3000
echo Ngrok tunnel: https://specialistic-annabella-unsabled.ngrok-free.dev
echo.
echo Commands:
echo   pm2 status          - Check server status
echo   pm2 logs            - View server logs  
echo   pm2 restart dash-app-prod - Restart server
echo   pm2 stop dash-app-prod    - Stop server
echo.
pause