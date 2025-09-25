@echo off
title Simple Auto-Startup Setup
echo ========================================
echo Setting up Simple Auto-Startup...
echo ========================================
echo.

REM Get the Windows Startup folder path
set StartupFolder=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup

echo Creating startup shortcut...
echo.

REM Create a VBS script to run the app silently
echo Set WshShell = CreateObject("WScript.Shell") > "%StartupFolder%\DashApp.vbs"
echo WshShell.CurrentDirectory = "%CD%" >> "%StartupFolder%\DashApp.vbs"
echo WshShell.Run "cmd /c """"%CD%\start-app.bat"""", 0, False >> "%StartupFolder%\DashApp.vbs"

if exist "%StartupFolder%\DashApp.vbs" (
    echo ✓ SUCCESS: Auto-startup installed!
    echo.
    echo Your Dash App will now:
    echo • Start automatically when you log into Windows
    echo • Run silently in the background
    echo • Be accessible at http://192.168.1.129:3000
    echo.
    echo Startup file created at:
    echo %StartupFolder%\DashApp.vbs
    echo.
    echo Management:
    echo • Remove auto-start: Delete the file above
    echo • Stop app manually: taskkill /f /im node.exe
    echo.
    set /p start="Start the app now? (y/n): "
    if /i "%start%"=="y" (
        echo Starting Dash App...
        start "" /min "%CD%\start-app.bat"
        timeout /t 3 /nobreak >nul
        echo ✓ App started! Check http://192.168.1.129:3000
    ) else (
        echo App will start automatically on next login.
    )
) else (
    echo ❌ FAILED: Could not create startup file
    echo Check if you have write permissions to:
    echo %StartupFolder%
)

echo.
echo Setup complete!
echo Your Dash App will start automatically from now on.
pause