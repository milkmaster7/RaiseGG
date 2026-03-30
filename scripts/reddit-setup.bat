@echo off
echo.
echo ========================================
echo   Full Reddit Setup for RaiseGG
echo   Creates account + subreddit + starts posting
echo ========================================
echo.
cd /d "%~dp0\.."
node scripts/create-reddit-account.js
pause
