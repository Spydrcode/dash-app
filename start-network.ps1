# Network Start Script for Dash App
Write-Host "Starting Dash App with Network Access..." -ForegroundColor Green

# Get the main network IP (192.168.x.x range, exclude virtual adapters)
$networkIP = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -match "^192\.168\." -and 
    $_.IPAddress -ne "192.168.119.1" -and 
    $_.IPAddress -ne "192.168.155.1" -and
    $_.PrefixOrigin -eq "Dhcp"
} | Select-Object -First 1

if ($networkIP) {
    $ip = $networkIP.IPAddress
    Write-Host "Detected network IP: $ip" -ForegroundColor Cyan
    
    # Set environment variables for Next.js to bind to all interfaces
    $env:HOSTNAME = "0.0.0.0"
    $env:PORT = "3000"
    
    Write-Host "Starting server accessible at:" -ForegroundColor Yellow
    Write-Host "   Local:   http://localhost:3000" -ForegroundColor White
    Write-Host "   Network: http://$ip:3000" -ForegroundColor White
    Write-Host ""
    Write-Host "Clients can access your app at: http://$ip:3000" -ForegroundColor Green
    Write-Host ""
    
    # Start the development server
    npm run dev:network
} else {
    Write-Host "Could not detect network IP address" -ForegroundColor Red
    Write-Host "Available IP addresses:" -ForegroundColor Yellow
    Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -ne "127.0.0.1"} | Select-Object IPAddress, InterfaceAlias, PrefixOrigin
    Write-Host ""
    Write-Host "Starting with manual binding..." -ForegroundColor Yellow
    $env:HOSTNAME = "0.0.0.0"
    npm run dev:network
}