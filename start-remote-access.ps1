# Quick Ngrok Setup for Remote Access
Write-Host "=== Quick Remote Access Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if app is running
$portActive = $false
try {
    $connections = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners()
    $portActive = $connections | Where-Object { $_.Port -eq 3000 }
} catch {}

if (-not $portActive) {
    Write-Host "⚠ Your Dash App is not running on port 3000" -ForegroundColor Yellow
    Write-Host "Starting the app first..." -ForegroundColor White
    Write-Host ""
    
    # Start the app in background
    $appProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev:network" -WorkingDirectory $PWD -WindowStyle Hidden -PassThru
    
    Write-Host "Waiting for app to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    # Check again
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -UseBasicParsing
        Write-Host "✓ App is now running!" -ForegroundColor Green
    } catch {
        Write-Host "App may still be starting. Continue anyway..." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== Setting Up Remote Access ===" -ForegroundColor Green
Write-Host ""

# Check if ngrok is available
$ngrokAvailable = $false
try {
    $null = & ngrok version 2>$null
    if ($LASTEXITCODE -eq 0) {
        $ngrokAvailable = $true
    }
} catch {}

if ($ngrokAvailable) {
    Write-Host "✓ Ngrok is installed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Starting ngrok tunnel..." -ForegroundColor Yellow
    Write-Host "This will create a public URL for your clients to access your app." -ForegroundColor White
    Write-Host ""
    Write-Host "Press Ctrl+C to stop the tunnel when done." -ForegroundColor Yellow
    Write-Host ""
    
    # Start ngrok
    & ngrok http 3000
    
} else {
    Write-Host "Ngrok is not installed. Here's how to set it up:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "OPTION 1 - Install Ngrok (Recommended):" -ForegroundColor Green
    Write-Host "1. Go to: https://ngrok.com/download" -ForegroundColor Cyan
    Write-Host "2. Download and install ngrok" -ForegroundColor White
    Write-Host "3. Sign up for free account: https://dashboard.ngrok.com/" -ForegroundColor Cyan
    Write-Host "4. Get your auth token and run: ngrok config add-authtoken YOUR_TOKEN" -ForegroundColor White
    Write-Host "5. Run this script again" -ForegroundColor White
    Write-Host ""
    
    Write-Host "OPTION 2 - Use LocalHost.run (No installation):" -ForegroundColor Green
    Write-Host "Run this command in a separate terminal:" -ForegroundColor White
    Write-Host "  ssh -R 80:localhost:3000 localhost.run" -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "OPTION 3 - Router Port Forwarding (Advanced):" -ForegroundColor Green
    Write-Host "Run: .\setup-remote-access.ps1 -ShowAll" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host ""
Write-Host "=== Security Notes ===" -ForegroundColor Red
Write-Host "- Only share the public URL with trusted clients" -ForegroundColor White
Write-Host "- The URL will be public on the internet" -ForegroundColor White
Write-Host "- Consider adding authentication to your app for production use" -ForegroundColor White
Write-Host ""