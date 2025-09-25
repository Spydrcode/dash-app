@echo off
title Dash App - Port 8080
echo ====================================
echo Starting Dash App on Port 8080...
echo ====================================
echo.
echo Sometimes port 3000 is blocked by Windows Firewall.
echo Using port 8080 instead, which is often more accessible.
echo.

echo Server will be accessible at:
echo   Local:   http://localhost:8080
echo   Network: http://192.168.1.129:8080
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start on port 8080
npx next dev -H 0.0.0.0 -p 8080