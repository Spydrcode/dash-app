@echo off
REM Auto-start script for Dash App Production Server
echo Starting Dash App Production Server...

REM Change to app directory
cd /d "c:\Users\dusti\git\dash-app"

REM Start PM2 daemon and restore saved processes
pm2 resurrect

REM Show status
pm2 status

echo.
echo Dash App Production Server is running!
echo Access via: https://specialistic-annabella-unsabled.ngrok-free.dev