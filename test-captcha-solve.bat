@echo off
REM Test CAPTCHA Solver
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo CAPTCHA Solver Test
echo ========================================
echo.

REM Check if server is running
echo Checking if server is running...
curl -s http://localhost:3001/health >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Server is not running on port 3001


    echo Please start the server first:
    echo   cd server
    echo   start-server-dev.bat
    echo.
    pause
    exit /b 1
) else (
    echo [OK] Server is running
)

echo.
echo Building extension...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo Extension built successfully!
echo ========================================
echo.
echo To test the CAPTCHA solver:
echo 1. Open Chrome and go to chrome://extensions/
echo 2. Enable "Developer mode"
echo 3. Click "Load unpacked"
echo 4. Select the "dist" folder in this directory
echo 5. Open https://www.google.com/recaptcha/api2/demo
echo 6. Check the browser console (F12) for extension logs
echo 7. Check server logs for solving progress
echo.
echo Make sure:
echo - Server is running (server\start-server-dev.bat)
echo - API key is configured in extension settings
echo - API key matches server .env file
echo.
pause

