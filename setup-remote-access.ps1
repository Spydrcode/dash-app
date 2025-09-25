# Remote Access Setup Script for Dash App
# This script helps configure external access options for your clients

param(
    [switch]$CheckFirewall,
    [switch]$SetupNgrok,
    [switch]$ShowCloudflare,
    [switch]$ShowAll
)

Write-Host "=== Remote Access Setup for Dash App ===" -ForegroundColor Cyan
Write-Host ""

function Test-Port {
    param($Port = 3000)
    
    try {
        $listener = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties()
        $connections = $listener.GetActiveTcpListeners()
        $portInUse = $connections | Where-Object { $_.Port -eq $Port }
        
        if ($portInUse) {
            Write-Host "✓ Port $Port is active and listening" -ForegroundColor Green
            return $true
        } else {
            Write-Host "✗ Port $Port is not active" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "✗ Could not check port status" -ForegroundColor Red
        return $false
    }
}

function Check-WindowsFirewall {
    Write-Host "=== Windows Firewall Check ===" -ForegroundColor Yellow
    
    try {
        # Check if port 3000 is allowed through Windows Firewall
        $firewallRules = Get-NetFirewallRule -Direction Inbound -Enabled True | 
                        Get-NetFirewallPortFilter | 
                        Where-Object { $_.LocalPort -eq 3000 }
        
        if ($firewallRules) {
            Write-Host "✓ Port 3000 is allowed through Windows Firewall" -ForegroundColor Green
        } else {
            Write-Host "⚠ Port 3000 may be blocked by Windows Firewall" -ForegroundColor Yellow
            Write-Host "To fix this, run as Administrator:" -ForegroundColor White
            Write-Host "  New-NetFirewallRule -DisplayName 'Dash App' -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow" -ForegroundColor Gray
        }
    } catch {
        Write-Host "Could not check firewall rules (may need admin rights)" -ForegroundColor Yellow
    }
    
    Write-Host ""
}

function Get-PublicIP {
    try {
        $publicIP = (Invoke-RestMethod -Uri "https://api.ipify.org" -TimeoutSec 10).Trim()
        Write-Host "Your public IP address: $publicIP" -ForegroundColor Cyan
        return $publicIP
    } catch {
        Write-Host "Could not determine public IP address" -ForegroundColor Red
        return $null
    }
}

function Show-RouterSetup {
    Write-Host "=== Router Port Forwarding Setup ===" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To allow external access through your router:" -ForegroundColor White
    Write-Host "1. Access your router's admin panel (usually http://192.168.1.1)" -ForegroundColor Gray
    Write-Host "2. Look for 'Port Forwarding' or 'Virtual Server' settings" -ForegroundColor Gray
    Write-Host "3. Add a new rule:" -ForegroundColor Gray
    Write-Host "   - Service Name: Dash App" -ForegroundColor Gray
    Write-Host "   - External Port: 3000" -ForegroundColor Gray
    Write-Host "   - Internal IP: $(Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -match '^192\.168\.'} | Select-Object -First 1 -ExpandProperty IPAddress)" -ForegroundColor Gray
    Write-Host "   - Internal Port: 3000" -ForegroundColor Gray
    Write-Host "   - Protocol: TCP" -ForegroundColor Gray
    Write-Host ""
    
    $publicIP = Get-PublicIP
    if ($publicIP) {
        Write-Host "After setup, clients can access: http://$publicIP:3000" -ForegroundColor Green
    }
    Write-Host ""
    Write-Host "⚠ WARNING: This exposes your app to the internet!" -ForegroundColor Red
    Write-Host "Only do this if you understand the security implications." -ForegroundColor Red
    Write-Host ""
}

function Show-NgrokSetup {
    Write-Host "=== Ngrok Setup (Recommended) ===" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Ngrok provides secure tunneling without router configuration:" -ForegroundColor White
    Write-Host ""
    Write-Host "1. Download and install ngrok:" -ForegroundColor Gray
    Write-Host "   https://ngrok.com/download" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. Sign up for free account and get auth token:" -ForegroundColor Gray
    Write-Host "   https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3. Configure ngrok:" -ForegroundColor Gray
    Write-Host "   ngrok config add-authtoken YOUR_TOKEN_HERE" -ForegroundColor White
    Write-Host ""
    Write-Host "4. Start your Dash App first, then run:" -ForegroundColor Gray
    Write-Host "   ngrok http 3000" -ForegroundColor White
    Write-Host ""
    Write-Host "Ngrok will provide a public URL like: https://abc123.ngrok.io" -ForegroundColor Green
    Write-Host "Share this URL with your clients for secure access!" -ForegroundColor Green
    Write-Host ""
    
    # Check if ngrok is installed
    try {
        $ngrokVersion = & ngrok version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Ngrok is already installed!" -ForegroundColor Green
            Write-Host "To start tunnel: ngrok http 3000" -ForegroundColor White
        }
    } catch {
        Write-Host "Ngrok not found in PATH - install from link above" -ForegroundColor Yellow
    }
    Write-Host ""
}

function Show-CloudflareSetup {
    Write-Host "=== Cloudflare Tunnel Setup (Advanced) ===" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Cloudflare Tunnel provides free, secure access:" -ForegroundColor White
    Write-Host ""
    Write-Host "1. Install Cloudflare Tunnel:" -ForegroundColor Gray
    Write-Host "   Download from: https://github.com/cloudflare/cloudflared/releases" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. Login to Cloudflare:" -ForegroundColor Gray
    Write-Host "   cloudflared tunnel login" -ForegroundColor White
    Write-Host ""
    Write-Host "3. Create a tunnel:" -ForegroundColor Gray
    Write-Host "   cloudflared tunnel create dash-app" -ForegroundColor White
    Write-Host ""
    Write-Host "4. Run the tunnel:" -ForegroundColor Gray
    Write-Host "   cloudflared tunnel --url http://localhost:3000" -ForegroundColor White
    Write-Host ""
    Write-Host "Benefits: Free, secure, no port forwarding needed" -ForegroundColor Green
    Write-Host ""
}

function Show-LocalhostRun {
    Write-Host "=== LocalHost.run (Quick and Simple) ===" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Instant public URL without installation:" -ForegroundColor White
    Write-Host ""
    Write-Host "Just run this command while your app is running:" -ForegroundColor Gray
    Write-Host "  ssh -R 80:localhost:3000 localhost.run" -ForegroundColor White
    Write-Host ""
    Write-Host "It will provide a public URL like: https://abc123.lhr.life" -ForegroundColor Green
    Write-Host ""
    Write-Host "Note: Requires SSH client (built into Windows 10+)" -ForegroundColor Gray
    Write-Host ""
}

function Test-AppRunning {
    Write-Host "=== Application Status ===" -ForegroundColor Yellow
    
    $portActive = Test-Port -Port 3000
    
    if ($portActive) {
        Write-Host "✓ Your Dash App appears to be running on port 3000" -ForegroundColor Green
        
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -UseBasicParsing
            Write-Host "✓ App is responding to requests" -ForegroundColor Green
        } catch {
            Write-Host "⚠ Port is active but app may not be responding properly" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✗ Your Dash App is not running" -ForegroundColor Red
        Write-Host "Start it first with: npm run dev:network" -ForegroundColor White
    }
    Write-Host ""
}

# Main execution
Test-AppRunning

if ($CheckFirewall -or $ShowAll) {
    Check-WindowsFirewall
}

if ($SetupNgrok -or $ShowAll) {
    Show-NgrokSetup
}

if ($ShowCloudflare -or $ShowAll) {
    Show-CloudflareSetup
}

if ($ShowAll) {
    Show-LocalhostRun
    Write-Host ""
    Show-RouterSetup
}

# Default behavior - show recommended options
if (-not ($CheckFirewall -or $SetupNgrok -or $ShowCloudflare -or $ShowAll)) {
    Write-Host "=== Recommended Remote Access Solutions ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "For EASY setup (recommended): Use Ngrok" -ForegroundColor White
    Write-Host "  .\setup-remote-access.ps1 -SetupNgrok" -ForegroundColor Gray
    Write-Host ""
    Write-Host "For ADVANCED users: Use Cloudflare Tunnel" -ForegroundColor White  
    Write-Host "  .\setup-remote-access.ps1 -ShowCloudflare" -ForegroundColor Gray
    Write-Host ""
    Write-Host "For ALL options:" -ForegroundColor White
    Write-Host "  .\setup-remote-access.ps1 -ShowAll" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Check Windows Firewall:" -ForegroundColor White
    Write-Host "  .\setup-remote-access.ps1 -CheckFirewall" -ForegroundColor Gray
    Write-Host ""
}