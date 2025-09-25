# Dash App Auto-Start Script
# This script will automatically start the app and keep it running

param(
    [switch]$Install,
    [switch]$Uninstall,
    [switch]$Start,
    [switch]$Stop,
    [switch]$Status
)

$AppPath = Get-Location
$LogFile = "$AppPath\app.log"
$PidFile = "$AppPath\app.pid"

function Write-AppLog {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Out-File -FilePath $LogFile -Append
    Write-Host $Message -ForegroundColor Green
}

function Start-App {
    # Check if already running
    if (Test-Path $PidFile) {
        $processId = Get-Content $PidFile
        try {
            $runningProcess = Get-Process -Id $processId -ErrorAction Stop
            Write-AppLog "App is already running (PID: $processId, Name: $($runningProcess.ProcessName))"
            return
        } catch {
            # Process not running, remove stale PID file
            Remove-Item $PidFile -Force
        }
    }

    Write-AppLog "Starting Dash App..."
    
    # Get network IP
    $networkIP = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
        $_.IPAddress -match "^192\.168\." -and 
        $_.PrefixOrigin -eq "Dhcp"
    } | Select-Object -First 1

    if ($networkIP) {
        $ip = $networkIP.IPAddress
        Write-AppLog "Network IP detected: $ip"
    } else {
        $ip = "localhost"
        Write-AppLog "Using localhost fallback"
    }

    # Start the app in background
    $process = Start-Process -FilePath "npx" -ArgumentList "next", "dev", "-H", "0.0.0.0", "-p", "3000" -WorkingDirectory $AppPath -WindowStyle Hidden -PassThru
    
    # Save PID
    $process.Id | Out-File -FilePath $PidFile
    
    Write-AppLog "Dash App started successfully!"
    Write-AppLog "Local access: http://localhost:3000"
    Write-AppLog "Network access: http://$ip:3000"
    Write-AppLog "Process ID: $($process.Id)"
    Write-AppLog "Log file: $LogFile"
}

function Stop-App {
    if (Test-Path $PidFile) {
        $processId = Get-Content $PidFile
        try {
            $targetProcess = Get-Process -Id $processId -ErrorAction Stop
            $processName = $targetProcess.ProcessName
            Stop-Process -Id $processId -Force
            Remove-Item $PidFile -Force
            Write-AppLog "App stopped (PID: $processId, Name: $processName)"
        } catch {
            Write-AppLog "App process not found, cleaning up PID file"
            Remove-Item $PidFile -Force
        }
    } else {
        Write-AppLog "App is not running"
    }
    
    # Also kill any remaining node processes on port 3000
    try {
        $netstatOutput = & netstat -ano
        $port3000Lines = $netstatOutput | Select-String ":3000"
        $nodeProcesses = $port3000Lines | ForEach-Object {
            ($_.Line -split "\s+")[-1]
        } | Sort-Object -Unique
        
        foreach ($nodeProcessId in $nodeProcesses) {
            try {
                $nodeProcess = Get-Process -Id $nodeProcessId -ErrorAction Stop
                if ($nodeProcess.ProcessName -eq "node") {
                    Stop-Process -Id $nodeProcessId -Force
                    Write-AppLog "Stopped node process (PID: $nodeProcessId)"
                }
            } catch { }
        }
    } catch { }
}

function Get-AppStatus {
    if (Test-Path $PidFile) {
        $processId = Get-Content $PidFile
        try {
            $runningProcess = Get-Process -Id $processId -ErrorAction Stop
            Write-Host "Status: RUNNING (PID: $processId, Name: $($runningProcess.ProcessName))" -ForegroundColor Green
            
            # Check if port 3000 is responding
            try {
                $webResponse = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -UseBasicParsing
                Write-Host "Web server: ACCESSIBLE ($($webResponse.StatusCode))" -ForegroundColor Green
            } catch {
                Write-Host "Web server: NOT RESPONDING" -ForegroundColor Yellow
            }
            
        } catch {
            Write-Host "Status: NOT RUNNING (stale PID file)" -ForegroundColor Red
            Remove-Item $PidFile -Force
        }
    } else {
        Write-Host "Status: NOT RUNNING" -ForegroundColor Red
    }
}

function Install-AutoStart {
    # Create a scheduled task for automatic startup
    $taskName = "DashAppAutoStart"
    $scriptPath = "$AppPath\dash-app.ps1"
    
    # Copy this script to a permanent location
    Copy-Item $PSCommandPath $scriptPath -Force
    
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File `"$scriptPath`" -Start"
    $trigger = New-ScheduledTaskTrigger -AtStartup
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    
    try {
        Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Force
        Write-AppLog "Auto-start installed! App will start automatically when Windows boots."
    } catch {
        Write-AppLog "Failed to install auto-start: $($_.Exception.Message)"
    }
}

function Uninstall-AutoStart {
    $taskName = "DashAppAutoStart"
    try {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
        Write-AppLog "Auto-start removed."
    } catch {
        Write-AppLog "Auto-start task not found or failed to remove."
    }
}

# Main script logic
switch ($true) {
    $Install { Install-AutoStart }
    $Uninstall { Uninstall-AutoStart }
    $Start { Start-App }
    $Stop { Stop-App }
    $Status { Get-AppStatus }
    default {
        Write-Host "=== Dash App Manager ===" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Usage:" -ForegroundColor Yellow
        Write-Host "  .\dash-app-manager.ps1 -Start     # Start the app"
        Write-Host "  .\dash-app-manager.ps1 -Stop      # Stop the app"
        Write-Host "  .\dash-app-manager.ps1 -Status    # Check app status"
        Write-Host "  .\dash-app-manager.ps1 -Install   # Install auto-start (runs on boot)"
        Write-Host "  .\dash-app-manager.ps1 -Uninstall # Remove auto-start"
        Write-Host ""
        Write-Host "Quick start:" -ForegroundColor Green
        Write-Host "  .\dash-app-manager.ps1 -Start"
        Write-Host ""
        Get-AppStatus
    }
}