@echo off
title Honda Odyssey Analytics Dashboard
echo.
echo ========================================
echo   🚗 Honda Odyssey Analytics Dashboard
echo ========================================
echo.
echo Starting development server...
echo.
cd /d "C:\Users\dusti\git\dash-app"

REM Check if Node.js is available
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Node.js not found! Please install Node.js first.
    pause
    exit /b 1
)

REM Check if project exists
if not exist "package.json" (
    echo ❌ Project not found in current directory!
    echo Expected path: C:\Users\dusti\git\dash-app
    pause
    exit /b 1
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

REM Start the development server
echo.
echo 🚀 Starting Next.js development server...
echo.
echo ✅ Dashboard will be available at:
echo    • Local: http://localhost:3000
echo    • Public: https://specialistic-annabella-unsabled.ngrok-free.dev
echo.
echo 💡 Press Ctrl+C to stop the server
echo.

npx next dev -p 3000

echo.
echo Server stopped. Press any key to exit...
pause >nul