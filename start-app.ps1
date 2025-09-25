# Simple Dash App Starter
Write-Host "=== Starting Dash App ===" -ForegroundColor Green

# Get network IP
$networkIP = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -match "^192\.168\." -and 
    $_.PrefixOrigin -eq "Dhcp"
} | Select-Object -First 1

if ($networkIP) {
    $ip = $networkIP.IPAddress
    Write-Host "Network IP: $ip" -ForegroundColor Cyan
} else {
    $ip = "localhost"
    Write-Host "Network IP: Not detected, using localhost" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Starting Next.js server..." -ForegroundColor Yellow
Write-Host "Local access: http://localhost:3000" -ForegroundColor White
Write-Host "Network access: http://$ip:3000" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

# Start the server
& npx next dev -H 0.0.0.0 -p 3000