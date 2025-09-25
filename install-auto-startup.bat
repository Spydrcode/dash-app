@echo off
title Auto-Startup Installer for Dash App
echo ==========================================
echo Installing Dash App Auto-Startup...
echo ==========================================
echo.

REM Create the startup script
echo Creating auto-start script...
echo @echo off > dash-service.bat
echo title Dash App Service >> dash-service.bat
echo cd /d "%~dp0" >> dash-service.bat
echo timeout /t 30 /nobreak ^>nul >> dash-service.bat
echo echo Starting Dash App Service... >> dash-service.bat
echo npx next dev -H 0.0.0.0 -p 3000 >> dash-service.bat

REM Create the scheduled task
echo.
echo Creating Windows scheduled task...
schtasks /create /tn "DashAppAutoStart" /tr "\"%CD%\dash-service.bat\"" /sc onstart /ru "%USERNAME%" /f >nul 2>&1

if %ERRORLEVEL% == 0 (
    echo ✓ SUCCESS: Auto-startup installed!
    echo.
    echo Your Dash App will now:
    echo • Start automatically when Windows boots
    echo • Be accessible at http://192.168.1.129:3000
    echo • Run in the background
    echo.
    echo Management:
    echo • View task: schtasks /query /tn "DashAppAutoStart"
    echo • Delete task: schtasks /delete /tn "DashAppAutoStart" /f
    echo • Stop app: taskkill /f /im node.exe
    echo.
    set /p start="Start the service now? (y/n): "
    if /i "%start%"=="y" (
        echo Starting service...
        schtasks /run /tn "DashAppAutoStart" >nul 2>&1
        timeout /t 5 /nobreak >nul
        echo ✓ Service started! Check http://192.168.1.129:3000
    ) else (
        echo Service will start on next reboot.
    )
) else (
    echo ❌ FAILED: Could not create scheduled task
    echo.
    echo This usually happens because:
    echo 1. You need to run as Administrator
    echo 2. Task scheduler service is disabled
    echo.
    echo Try: Right-click this file and "Run as administrator"
)

echo.
echo Installation complete!
pause