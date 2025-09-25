@echo off
echo.
echo 🚀 Starting Dash App with Office Access...
echo.

:: Check if server is already running
echo Checking if server is running...
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:3000' -TimeoutSec 3 -UseBasicParsing | Out-Null; exit 0 } catch { exit 1 }"
if %errorlevel% == 0 (
    echo ✅ Server already running on port 3000
) else (
    echo Starting production server...
    start /B npm run start
    
    :: Wait for server to initialize
    echo Waiting for server to start...
    :wait_loop
    timeout /t 2 /nobreak > nul
    powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:3000' -TimeoutSec 3 -UseBasicParsing | Out-Null; exit 0 } catch { exit 1 }"
    if %errorlevel% neq 0 goto wait_loop
    echo ✅ Server started successfully
)

echo.
echo 🔒 Creating secure tunnel for office access...
echo.
echo 📱 Office clients can access via the ngrok URL below:
echo 💡 Share this URL with your office team!
echo.
ngrok http 3000