# Dash App Auto-Startup Installer
Write-Host "=== Dash App Auto-Startup Setup ===" -ForegroundColor Green
Write-Host ""

$AppPath = Get-Location
$TaskName = "DashAppAutoStart"
$ScriptPath = Join-Path $AppPath "auto-start-service.ps1"
$LogPath = Join-Path $AppPath "auto-start.log"

# Create the auto-start service script
$ServiceScript = @"
# Dash App Auto-Start Service
Set-Location "$AppPath"

# Log function
function Write-Log {
    param([string]`$Message)
    `$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "`$timestamp - `$Message" | Out-File -FilePath "$LogPath" -Append
}

Write-Log "Starting Dash App auto-service..."

# Wait for network to be ready
Start-Sleep -Seconds 30

# Check if already running
`$existing = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { `$_.MainWindowTitle -like "*Next.js*" }
if (`$existing) {
    Write-Log "Dash App already running, skipping startup"
    exit
}

# Get network IP
`$networkIP = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    `$_.IPAddress -match "^192\.168\." -and 
    `$_.PrefixOrigin -eq "Dhcp"
} | Select-Object -First 1

if (`$networkIP) {
    `$ip = `$networkIP.IPAddress
    Write-Log "Network IP detected: `$ip"
} else {
    `$ip = "192.168.1.129"
    Write-Log "Using fallback IP: `$ip"
}

Write-Log "Starting Next.js server..."

# Start the server (this will run indefinitely)
try {
    & npx next dev -H 0.0.0.0 -p 3000
} catch {
    Write-Log "Error starting server: `$(`$_.Exception.Message)"
}
"@

# Write the service script
$ServiceScript | Out-File -FilePath $ScriptPath -Encoding UTF8

Write-Host "✓ Auto-start script created at: $ScriptPath" -ForegroundColor Green

# Create scheduled task
Write-Host "Creating Windows scheduled task..." -ForegroundColor Yellow

try {
    # Remove existing task if it exists
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    
    # Create new task
    $Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$ScriptPath`""
    $Trigger = New-ScheduledTaskTrigger -AtStartup
    $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable
    $Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType ServiceAccount -RunLevel Highest
    
    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal -Description "Auto-start Dash App when Windows boots"
    
    Write-Host "✓ Scheduled task '$TaskName' created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 AUTO-STARTUP CONFIGURED!" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Your Dash App will now:" -ForegroundColor Yellow
    Write-Host "• Start automatically when Windows boots" -ForegroundColor White
    Write-Host "• Run in the background" -ForegroundColor White
    Write-Host "• Be accessible at http://192.168.1.129:3000" -ForegroundColor White
    Write-Host "• Write logs to: $LogPath" -ForegroundColor White
    Write-Host ""
    Write-Host "Management commands:" -ForegroundColor Yellow
    Write-Host "• View logs: Get-Content '$LogPath' -Tail 20" -ForegroundColor Gray
    Write-Host "• Stop service: Stop-Process -Name 'node' -Force" -ForegroundColor Gray
    Write-Host "• Remove auto-start: Unregister-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Gray
    
    # Offer to start it now
    Write-Host ""
    $startNow = Read-Host "Start the service now? (y/n)"
    if ($startNow -eq 'y' -or $startNow -eq 'Y') {
        Write-Host "Starting service..." -ForegroundColor Green
        Start-ScheduledTask -TaskName $TaskName
        Start-Sleep -Seconds 5
        Write-Host "✓ Service started! Check http://192.168.1.129:3000 in a few moments." -ForegroundColor Green
    } else {
        Write-Host "Service will start automatically on next reboot." -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Failed to create scheduled task: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Try running this script as Administrator:" -ForegroundColor Yellow
    Write-Host "Right-click PowerShell → Run as Administrator" -ForegroundColor White
}

Write-Host ""
Write-Host "Setup complete! Your app will start automatically from now on." -ForegroundColor Green