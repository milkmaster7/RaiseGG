@echo off
title RaiseGG Telegram Login
cd /d "%~dp0"
echo.
echo ============================================
echo   RaiseGG Telegram Login (one-time setup)
echo ============================================
echo.
echo Starting local auth server...
echo.
set TELEGRAM_API_ID=22547312
set TELEGRAM_API_HASH=58209992510f1c2c2a7a7b2b909c3b98
start http://localhost:3456
node scripts\telegram-auth-server.js
pause
