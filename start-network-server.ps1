# Advanced Server Start with Network Troubleshooting
Write-Host "=== Dash App Network Server Starter ===" -ForegroundColor Green
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if ($isAdmin) {
    Write-Host "✓ Running as Administrator" -ForegroundColor Green
} else {
    Write-Host "⚠ Not running as Administrator - may cause network binding issues" -ForegroundColor Yellow
    Write-Host "Try: Right-click PowerShell → Run as Administrator" -ForegroundColor Yellow
}

Write-Host ""

# Get network information
$networkIPs = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -match "^192\.168\."} | Select-Object IPAddress, InterfaceAlias
Write-Host "Available Network IPs:" -ForegroundColor Cyan
foreach ($ip in $networkIPs) {
    Write-Host "  $($ip.IPAddress) [$($ip.InterfaceAlias)]" -ForegroundColor White
}

$primaryIP = $networkIPs | Where-Object {$_.InterfaceAlias -like "*Wi-Fi*" -or $_.InterfaceAlias -like "*Ethernet*"} | Select-Object -First 1
if ($primaryIP) {
    $targetIP = $primaryIP.IPAddress
    Write-Host ""
    Write-Host "Using primary IP: $targetIP" -ForegroundColor Green
} else {
    $targetIP = "192.168.1.129"
    Write-Host ""
    Write-Host "Using default IP: $targetIP" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Starting server with network access..." -ForegroundColor Yellow
Write-Host "Clients will access at: http://$targetIP:3000" -ForegroundColor Cyan
Write-Host ""

# Try to add Windows Firewall rule if running as admin
if ($isAdmin) {
    try {
        New-NetFirewallRule -DisplayName "Dash App (Port 3000)" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -ErrorAction SilentlyContinue
        Write-Host "✓ Windows Firewall rule added for port 3000" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Could not add firewall rule: $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "ℹ To automatically configure Windows Firewall, run as Administrator" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Starting Next.js development server..." -ForegroundColor White

# Set environment variables for Next.js
$env:HOST = "0.0.0.0"
$env:PORT = "3000"

# Start with explicit host binding
& npx next dev --hostname 0.0.0.0 --port 3000