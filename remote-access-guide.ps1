# Simple Remote Access Guide for Dash App

Write-Host "=== Remote Access Setup for Dash App ===" -ForegroundColor Cyan
Write-Host ""

# Check if app is running
function Test-AppRunning {
    try {
        $connections = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners()
        $portActive = $connections | Where-Object { $_.Port -eq 3000 }
        
        if ($portActive) {
            Write-Host "✓ Dash App is running on port 3000" -ForegroundColor Green
            return $true
        } else {
            Write-Host "✗ Dash App is not running" -ForegroundColor Red
            Write-Host "Start it with: npm run dev:network" -ForegroundColor Yellow
            return $false
        }
    } catch {
        Write-Host "Could not check port status" -ForegroundColor Red
        return $false
    }
}

# Check if ngrok is installed
function Test-NgrokInstalled {
    try {
        $null = & ngrok version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Ngrok is installed" -ForegroundColor Green
            return $true
        }
    } catch {}
    
    Write-Host "✗ Ngrok is not installed" -ForegroundColor Red
    return $false
}

# Main script
Write-Host "Current Status:" -ForegroundColor Yellow
$appRunning = Test-AppRunning
$ngrokInstalled = Test-NgrokInstalled

Write-Host ""

if (-not $appRunning) {
    Write-Host "Please start your app first:" -ForegroundColor Red
    Write-Host "  npm run dev:network" -ForegroundColor White
    Write-Host ""
}

Write-Host "=== Remote Access Options ===" -ForegroundColor Green
Write-Host ""

Write-Host "OPTION 1: Ngrok (Recommended)" -ForegroundColor Yellow
if ($ngrokInstalled) {
    Write-Host "✓ Ready to use! Run: ngrok http 3000" -ForegroundColor Green
} else {
    Write-Host "1. Download from: https://ngrok.com/download" -ForegroundColor White
    Write-Host "2. Install and add to PATH" -ForegroundColor White
    Write-Host "3. Sign up: https://dashboard.ngrok.com/" -ForegroundColor White
    Write-Host "4. Get auth token and run: ngrok config add-authtoken YOUR_TOKEN" -ForegroundColor White
    Write-Host "5. Start tunnel: ngrok http 3000" -ForegroundColor White
}
Write-Host ""

Write-Host "OPTION 2: LocalHost.run (No installation needed)" -ForegroundColor Yellow
Write-Host "Run this command while your app is running:" -ForegroundColor White
Write-Host "  ssh -R 80:localhost:3000 localhost.run" -ForegroundColor Cyan
Write-Host ""

Write-Host "OPTION 3: Cloudflare Tunnel (Advanced)" -ForegroundColor Yellow
Write-Host "1. Install cloudflared from GitHub releases" -ForegroundColor White
Write-Host "2. Login: cloudflared tunnel login" -ForegroundColor White
Write-Host "3. Run: cloudflared tunnel --url http://localhost:3000" -ForegroundColor White
Write-Host ""

Write-Host "=== Quick Start Guide ===" -ForegroundColor Green
Write-Host ""
Write-Host "If you have ngrok installed:" -ForegroundColor White
Write-Host "  1. Make sure your app is running: npm run dev:network" -ForegroundColor Gray
Write-Host "  2. Open new terminal and run: ngrok http 3000" -ForegroundColor Gray
Write-Host "  3. Share the https://xxxxx.ngrok.io URL with your clients" -ForegroundColor Gray
Write-Host ""
Write-Host "If you do not have ngrok:" -ForegroundColor White
Write-Host "  1. Make sure your app is running: npm run dev:network" -ForegroundColor Gray
Write-Host "  2. In new terminal run: ssh -R 80:localhost:3000 localhost.run" -ForegroundColor Gray
Write-Host "  3. Share the provided URL with your clients" -ForegroundColor Gray
Write-Host ""

Write-Host "=== Security Notes ===" -ForegroundColor Red
Write-Host "• URLs will be publicly accessible on the internet" -ForegroundColor White
Write-Host "• Only share with trusted clients" -ForegroundColor White
Write-Host "• Stop the tunnel when not needed" -ForegroundColor White
Write-Host ""