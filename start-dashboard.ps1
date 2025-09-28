# Honda Odyssey Analytics Dashboard Startup Script
Write-Host ""
Write-Host "========================================"  -ForegroundColor Cyan
Write-Host "  🚗 Honda Odyssey Analytics Dashboard"  -ForegroundColor Yellow  
Write-Host "========================================"  -ForegroundColor Cyan
Write-Host ""

# Set window title
$Host.UI.RawUI.WindowTitle = "Honda Odyssey Analytics Dashboard"

# Change to project directory
$ProjectPath = "C:\Users\dusti\git\dash-app"
Write-Host "📁 Changing to project directory..." -ForegroundColor Green
Set-Location $ProjectPath

# Check if Node.js is available
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found! Please install Node.js first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if project exists
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Project not found in current directory!" -ForegroundColor Red
    Write-Host "Expected path: $ProjectPath" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check and install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Kill any existing Node processes on port 3000
Write-Host "🔄 Checking for existing servers..." -ForegroundColor Yellow
try {
    $processes = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($processes) {
        Write-Host "⚠️  Stopping existing Node processes..." -ForegroundColor Yellow
        Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
} catch {
    # Ignore errors - processes might not exist
}

# Start the development server
Write-Host ""
Write-Host "🚀 Starting Next.js development server..." -ForegroundColor Green
Write-Host ""
Write-Host "✅ Dashboard will be available at:" -ForegroundColor Green
Write-Host "   • Local: http://localhost:3000" -ForegroundColor White
Write-Host "   • Public: https://specialistic-annabella-unsabled.ngrok-free.dev" -ForegroundColor White
Write-Host ""
Write-Host "💡 Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start server
try {
    npx next dev -p 3000
} catch {
    Write-Host ""
    Write-Host "❌ Server encountered an error." -ForegroundColor Red
} finally {
    Write-Host ""
    Write-Host "Server stopped. Press any key to exit..." -ForegroundColor Yellow
    Read-Host
}