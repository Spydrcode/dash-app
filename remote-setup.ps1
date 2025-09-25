# Remote Access Setup Guide
Write-Host "=== Remote Access Setup for Dash App ===" -ForegroundColor Cyan
Write-Host ""

# Test if app is running on port 3000
try {
    $connections = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners()
    $portActive = $connections | Where-Object { $_.Port -eq 3000 }
    
    if ($portActive) {
        Write-Host "Status: App is running on port 3000" -ForegroundColor Green
    } else {
        Write-Host "Status: App is NOT running" -ForegroundColor Red
        Write-Host "Start with: npm run dev:network" -ForegroundColor Yellow
        Write-Host ""
    }
} catch {
    Write-Host "Could not check app status" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Remote Access Options ===" -ForegroundColor Green
Write-Host ""

Write-Host "OPTION 1: Ngrok (Recommended - Easy Setup)" -ForegroundColor Yellow
Write-Host "1. Download from: https://ngrok.com/download" -ForegroundColor White
Write-Host "2. Install and sign up for free account" -ForegroundColor White
Write-Host "3. Get auth token: https://dashboard.ngrok.com/" -ForegroundColor White
Write-Host "4. Configure: ngrok config add-authtoken YOUR_TOKEN" -ForegroundColor White
Write-Host "5. Start tunnel: ngrok http 3000" -ForegroundColor White
Write-Host "6. Share the https://xxxxx.ngrok.io URL with clients" -ForegroundColor Green
Write-Host ""

Write-Host "OPTION 2: LocalHost.run (No Installation)" -ForegroundColor Yellow
Write-Host "1. Make sure your app is running" -ForegroundColor White
Write-Host "2. Run: ssh -R 80:localhost:3000 localhost.run" -ForegroundColor White
Write-Host "3. Share the provided URL with clients" -ForegroundColor Green
Write-Host ""

Write-Host "OPTION 3: Cloudflare Tunnel (Advanced)" -ForegroundColor Yellow
Write-Host "1. Download cloudflared from GitHub" -ForegroundColor White
Write-Host "2. Run: cloudflared tunnel --url http://localhost:3000" -ForegroundColor White
Write-Host ""

Write-Host "=== Security Warning ===" -ForegroundColor Red
Write-Host "- These create PUBLIC internet access to your app" -ForegroundColor White
Write-Host "- Only share URLs with trusted clients" -ForegroundColor White
Write-Host "- Stop tunnels when not needed" -ForegroundColor White
Write-Host ""

Write-Host "=== Next Steps ===" -ForegroundColor Green
Write-Host "1. Choose an option above" -ForegroundColor White
Write-Host "2. Start your app: npm run dev:network" -ForegroundColor White
Write-Host "3. Start the tunnel in a separate terminal" -ForegroundColor White
Write-Host "4. Share the public URL with your clients" -ForegroundColor White
Write-Host ""