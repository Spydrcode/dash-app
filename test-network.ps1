Write-Host "=== Network Configuration Test ===" -ForegroundColor Green
Write-Host ""

# Get all IPv4 addresses except loopback
$addresses = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -ne "127.0.0.1"}

Write-Host "Available IP Addresses:" -ForegroundColor Yellow
foreach ($addr in $addresses) {
    $ip = $addr.IPAddress
    $interface = $addr.InterfaceAlias
    $origin = $addr.PrefixOrigin
    
    Write-Host "  $ip" -ForegroundColor Cyan -NoNewline
    Write-Host " [$interface - $origin]" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== Testing Accessibility ===" -ForegroundColor Green

# Test each address with a simple connection test
$testAddresses = @("192.168.1.129", "169.254.155.45")

foreach ($testIP in $testAddresses) {
    Write-Host "Testing: http://$testIP:3000" -ForegroundColor Yellow
    
    try {
        # Use .NET WebClient for a quick connectivity test
        $webClient = New-Object System.Net.WebClient
        $webClient.Timeout = 5000
        $null = $webClient.DownloadString("http://$testIP:3000")
        Write-Host "  ✓ ACCESSIBLE" -ForegroundColor Green
        Write-Host "  → Clients should use: http://$testIP:3000" -ForegroundColor Magenta
        $webClient.Dispose()
        break
    } catch {
        Write-Host "  ✗ Not accessible: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Final Recommendation ===" -ForegroundColor Green
Write-Host "1. Make sure your Next.js server is running with: npx next dev -H 0.0.0.0 -p 3000" -ForegroundColor White
Write-Host "2. Try both IP addresses from client devices:" -ForegroundColor White
Write-Host "   - http://192.168.1.129:3000 (Wi-Fi network)" -ForegroundColor Cyan
Write-Host "   - http://169.254.155.45:3000 (Autoconfiguration)" -ForegroundColor Cyan
Write-Host "3. Ensure client devices are on the same network" -ForegroundColor White
Write-Host "4. Check Windows Firewall if connections fail" -ForegroundColor White