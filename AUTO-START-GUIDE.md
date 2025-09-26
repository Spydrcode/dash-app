# DASH APP - AUTO-START SETUP GUIDE

## Option 1: Manual Start (Recommended)

After closing VS Code or restarting your computer, double-click:

```
c:\Users\dusti\git\dash-app\start-production-complete.bat
```

This will:

- ✅ Start the Next.js production server
- ✅ Start the ngrok tunnel
- ✅ Keep both windows open so you can monitor them
- ✅ Show you the public tunnel URL

## Option 2: Windows Startup (Advanced)

To make it start automatically when Windows boots:

### Step 1: Open Task Scheduler

1. Press `Windows + R`
2. Type `taskschd.msc` and press Enter

### Step 2: Create New Task

1. Click "Create Basic Task..."
2. Name: "Dash App Auto Start"
3. Description: "Automatically start Dash App and ngrok tunnel"

### Step 3: Configure Trigger

1. Choose "When the computer starts"
2. Click Next

### Step 4: Configure Action

1. Choose "Start a program"
2. Program/script: `c:\Users\dusti\git\dash-app\auto-startup-silent.bat`
3. Click Next, then Finish

### Step 5: Modify Settings (Important!)

1. Right-click your new task → Properties
2. On "General" tab:
   - Check "Run with highest privileges"
   - Check "Run whether user is logged on or not"
3. On "Conditions" tab:
   - Uncheck "Start the task only if the computer is on AC power"
4. Click OK

## Current Status

- ✅ Production build ready
- ✅ Startup scripts created
- ⚠️ Manual start required after VS Code closes

## Quick Commands

- **Start everything**: Run `start-production-complete.bat`
- **Check ngrok status**: Visit http://127.0.0.1:4040
- **Stop everything**: Close both command windows

## Troubleshooting

- If ngrok fails: Run `ngrok authtoken YOUR_TOKEN` first
- If server fails: Check port 3000 isn't already in use
- For new tunnel URL: Restart ngrok (closes and reopens each time)
