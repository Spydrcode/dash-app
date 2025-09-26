Set WshShell = WScript.CreateObject("WScript.Shell")
Set oShellLink = WshShell.CreateShortcut("c:\Users\dusti\Desktop\Start Dash App.lnk")
oShellLink.TargetPath = "c:\Users\dusti\git\dash-app\start-production-complete.bat"
oShellLink.WorkingDirectory = "c:\Users\dusti\git\dash-app"
oShellLink.Description = "Start Dash App Production Server and ngrok Tunnel"
oShellLink.IconLocation = "shell32.dll,25"
oShellLink.Save