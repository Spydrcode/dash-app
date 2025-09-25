# Create Desktop Shortcut for Dash App
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$ShortcutPath = "$DesktopPath\Dash App.lnk"
$AppPath = Get-Location
$BatchFile = "$AppPath\start-app.bat"

$WScriptShell = New-Object -ComObject WScript.Shell
$Shortcut = $WScriptShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $BatchFile
$Shortcut.WorkingDirectory = $AppPath
$Shortcut.IconLocation = "$AppPath\public\favicon.ico"
$Shortcut.Description = "Start Dash App Server"
$Shortcut.Save()

Write-Host "Desktop shortcut created: $ShortcutPath" -ForegroundColor Green
Write-Host ""
Write-Host "Now you can:" -ForegroundColor Yellow
Write-Host "1. Double-click 'Dash App' on your desktop to start the server" -ForegroundColor White
Write-Host "2. Or run: .\start-app.bat" -ForegroundColor White
Write-Host "3. Or run: .\start-app.ps1" -ForegroundColor White