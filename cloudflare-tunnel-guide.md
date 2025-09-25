# Cloudflare Tunnel Setup (Advanced Option)

## Benefits:

- No port forwarding needed
- More secure (no direct internet exposure)
- Free SSL certificate
- Better DDoS protection

## Setup Steps:

1. Sign up for free Cloudflare account
2. Install cloudflared on your machine:
   ```powershell
   # Download from https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
   ```
3. Authenticate and create tunnel:
   ```bash
   cloudflared tunnel login
   cloudflared tunnel create dash-app
   cloudflared tunnel route dns dash-app your-subdomain.yourdomain.com
   ```
4. Run tunnel:
   ```bash
   cloudflared tunnel run dash-app --url http://localhost:3000
   ```

## Result:

Your app will be accessible at https://your-subdomain.yourdomain.com from anywhere!
