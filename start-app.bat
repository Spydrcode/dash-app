@echo off
title Dash App Server
echo ===============================
echo Starting Dash App Server...
echo ===============================
echo.

REM Get network information
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /C:"IPv4 Address" ^| findstr "192.168"') do (
    set NetworkIP=%%i
    goto :found
)
set NetworkIP= Not detected

:found
set NetworkIP=%NetworkIP: =%

echo Local Access:   http://localhost:3000
echo Network Access: http://%NetworkIP%:3000
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start the server
npx next dev -H 0.0.0.0 -p 3000