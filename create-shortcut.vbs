' Create Desktop Shortcut for Honda Odyssey Analytics Dashboard
Set WshShell = CreateObject("WScript.Shell")
Set oShellLink = WshShell.CreateShortcut(WshShell.SpecialFolders("Desktop") & "\Honda Odyssey Dashboard.lnk")

' Set shortcut properties
oShellLink.TargetPath = "powershell.exe"
oShellLink.Arguments = "-ExecutionPolicy Bypass -File ""C:\Users\dusti\git\dash-app\start-dashboard.ps1"""
oShellLink.WindowStyle = 1
oShellLink.IconLocation = "C:\Windows\System32\shell32.dll,13"
oShellLink.Description = "Honda Odyssey Analytics Dashboard - Trip tracking and vehicle maintenance"
oShellLink.WorkingDirectory = "C:\Users\dusti\git\dash-app"

' Save the shortcut
oShellLink.Save

' Create batch file shortcut as backup
Set oShellLink2 = WshShell.CreateShortcut(WshShell.SpecialFolders("Desktop") & "\Honda Dashboard (Backup).lnk")
oShellLink2.TargetPath = "C:\Users\dusti\git\dash-app\start-dashboard.bat"
oShellLink2.WindowStyle = 1
oShellLink2.IconLocation = "C:\Windows\System32\shell32.dll,13"
oShellLink2.Description = "Honda Odyssey Analytics Dashboard - Batch file version"
oShellLink2.WorkingDirectory = "C:\Users\dusti\git\dash-app"
oShellLink2.Save

WScript.Echo "✅ Desktop shortcuts created successfully!" & vbCrLf & vbCrLf & _
            "Created shortcuts:" & vbCrLf & _
            "• Honda Odyssey Dashboard.lnk (PowerShell version)" & vbCrLf & _
            "• Honda Dashboard (Backup).lnk (Batch file version)" & vbCrLf & vbCrLf & _
            "Double-click either shortcut to start your dashboard!"