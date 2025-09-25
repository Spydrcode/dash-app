@echo off
title Network Access Test
echo ================================
echo Testing Network Access...
echo ================================
echo.

REM Check if port 3000 is listening
echo Checking if port 3000 is listening...
netstat -an | findstr :3000
if %ERRORLEVEL%==0 (
    echo ✓ Port 3000 is listening
) else (
    echo ✗ Port 3000 is not listening
    echo Make sure the server is running first!
    pause
    exit /b 1
)

echo.
echo Testing local access...
curl -s -o nul -w "Local access: %%{http_code}\n" http://localhost:3000
if %ERRORLEVEL%==0 (
    echo ✓ Local access works
) else (
    echo ✗ Local access failed
)

echo.
echo Testing network access...
curl -s -o nul -w "Network access: %%{http_code}\n" http://192.168.1.129:3000
if %ERRORLEVEL%==0 (
    echo ✓ Network access works - Clients can use http://192.168.1.129:3000
) else (
    echo ✗ Network access failed
    echo.
    echo Possible solutions:
    echo 1. Check Windows Firewall settings
    echo 2. Make sure you're on the same network
    echo 3. Try running as administrator
)

echo.
echo Available network addresses:
ipconfig | findstr "IPv4"

echo.
pause