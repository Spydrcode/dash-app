# Honda Odyssey Dash Analytics - Auto-Start Service
# This PowerShell script creates a Windows service that automatically starts the app

$ServiceName = "HondaOdysseyDashApp"
$ServiceDisplayName = "Honda Odyssey Dash Analytics"
$ServiceDescription = "Rideshare analytics app with OCR processing"
$AppPath = "C:\Users\dusti\git\dash-app"
$BatFile = "$AppPath\start-production.bat"

Write-Host "=== Honda Odyssey Dash Analytics Auto-Start Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit 1
}

# Install NSSM (Non-Sucking Service Manager) if not present
$nssmPath = "$AppPath\nssm.exe"
if (!(Test-Path $nssmPath)) {
    Write-Host "Downloading NSSM (service wrapper)..." -ForegroundColor Yellow
    $nssmUrl = "https://nssm.cc/ci/nssm-2.24-101-g897c7ad.zip"
    $nssmZip = "$AppPath\nssm.zip"
    
    try {
        Invoke-WebRequest -Uri $nssmUrl -OutFile $nssmZip
        Expand-Archive -Path $nssmZip -DestinationPath $AppPath -Force
        Copy-Item "$AppPath\nssm-*\win64\nssm.exe" $AppPath
        Remove-Item $nssmZip -Force
        Remove-Item "$AppPath\nssm-*" -Recurse -Force
        Write-Host "✓ NSSM downloaded and installed" -ForegroundColor Green
    } catch {
        Write-Host "ERROR: Failed to download NSSM. Please download manually from https://nssm.cc/" -ForegroundColor Red
        exit 1
    }
}

# Remove existing service if it exists
$existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "Removing existing service..." -ForegroundColor Yellow
    & $nssmPath remove $ServiceName confirm
}

# Create the service
Write-Host "Creating Windows service..." -ForegroundColor Yellow
& $nssmPath install $ServiceName $BatFile
& $nssmPath set $ServiceName DisplayName $ServiceDisplayName
& $nssmPath set $ServiceName Description $ServiceDescription
& $nssmPath set $ServiceName Start SERVICE_AUTO_START
& $nssmPath set $ServiceName AppDirectory $AppPath

# Set service to restart on failure
& $nssmPath set $ServiceName AppThrottle 1500
& $nssmPath set $ServiceName AppRestartDelay 0
& $nssmPath set $ServiceName AppStopMethodSkip 14

Write-Host ""
Write-Host "✓ Service created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "=== IMPORTANT SETUP INSTRUCTIONS ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Your app will be available at:" -ForegroundColor White
Write-Host "   http://192.168.1.129:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. To start the service now:" -ForegroundColor White
Write-Host "   Start-Service -Name '$ServiceName'" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. To stop the service:" -ForegroundColor White
Write-Host "   Stop-Service -Name '$ServiceName'" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. The service will automatically start when Windows boots" -ForegroundColor White
Write-Host ""
Write-Host "5. To remove the service later:" -ForegroundColor White
Write-Host "   $nssmPath remove $ServiceName confirm" -ForegroundColor Yellow
Write-Host ""

$startNow = Read-Host "Start the service now? (y/n)"
if ($startNow -eq 'y' -or $startNow -eq 'Y') {
    Write-Host "Starting service..." -ForegroundColor Yellow
    Start-Service -Name $ServiceName
    Start-Sleep 3
    
    $serviceStatus = Get-Service -Name $ServiceName
    if ($serviceStatus.Status -eq "Running") {
        Write-Host "✓ Service started successfully!" -ForegroundColor Green
        Write-Host "Your app is now running at http://192.168.1.129:3000" -ForegroundColor Cyan
    } else {
        Write-Host "⚠ Service may have issues. Check Windows Event Viewer for details." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Setup complete! Your Honda Odyssey Dash Analytics app will now start automatically." -ForegroundColor Green
pause