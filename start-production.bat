@echo off
echo Starting Honda Odyssey Dash Analytics...
echo.

REM Check if Ollama is running
tasklist /FI "IMAGENAME eq ollama.exe" 2>NUL | find /I /N "ollama.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo ✓ Ollama is already running
) else (
    echo Starting Ollama...
    start /B ollama serve
    timeout /t 5 /nobreak >nul
)

REM Start the Next.js production server
echo Starting Next.js production server...
echo Server will be available at:
echo   - Local: http://localhost:3000
echo   - Network: http://192.168.1.129:3000
echo.
echo Press Ctrl+C to stop the server
echo.

npm run start