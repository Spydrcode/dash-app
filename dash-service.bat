@echo off 
title Dash App Service 
cd /d "C:\Users\dusti\git\dash-app\" 
timeout /t 30 /nobreak >nul 
echo Starting Dash App Service... 
npx next dev -H 0.0.0.0 -p 3000 
