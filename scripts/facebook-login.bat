@echo off
echo.
echo ========================================
echo   Facebook Page Setup for RaiseGG
echo   Opening browser automatically...
echo ========================================
echo.
cd /d "%~dp0\.."
node scripts/facebook-auth-server.js
pause
