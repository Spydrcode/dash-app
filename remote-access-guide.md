# Dynamic DNS Setup Guide

## Free Dynamic DNS Providers:

1. **No-IP.com** (Free subdomain: yourname.ddns.net)
2. **Duck DNS** (Free subdomain: yourname.duckdns.org)
3. **Dynu.com** (Free subdomain: yourname.dynu.net)

## Router Setup:

- Most routers have built-in DDNS support
- Configure with your chosen provider
- Router will auto-update your public IP

## Alternative: Manual DDNS Update Script

If router doesn't support DDNS, create this PowerShell script:

```powershell
# Update-DynamicDNS.ps1
$hostname = "yourname.duckdns.org"  # Your chosen hostname
$token = "your-duckdns-token"       # Your DuckDNS token

# Get current public IP
$publicIP = (Invoke-WebRequest -Uri "https://ipinfo.io/ip").Content.Trim()

# Update DuckDNS
$updateUrl = "https://www.duckdns.org/update?domains=$hostname&token=$token&ip=$publicIP"
Invoke-WebRequest -Uri $updateUrl

Write-Host "Updated $hostname to IP: $publicIP"
```

## Security Considerations:

- Change default router passwords
- Consider enabling router firewall
- Monitor access logs
- Only forward port 3000, not other services
