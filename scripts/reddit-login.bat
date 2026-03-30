@echo off
echo.
echo ========================================
echo   Reddit Setup for RaiseGG
echo   Opening browser automatically...
echo ========================================
echo.
cd /d "%~dp0\.."
node scripts/reddit-auth-server.js

echo.
echo ========================================
set /p CREATE_SUB="  Want to create r/RaiseGG subreddit now? (Y/N): "
echo ========================================
echo.

if /i "%CREATE_SUB%"=="Y" (
  echo Running subreddit setup...
  echo.
  node scripts/reddit-setup-subreddit.js
) else (
  echo Skipped. Run "node scripts/reddit-setup-subreddit.js" later to create the subreddit.
)

pause
