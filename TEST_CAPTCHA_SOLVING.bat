@echo off
REM Test CAPTCHA Solving - Step by Step
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo CAPTCHA Solving Test
echo ========================================
echo.

REM Check server
echo [1] Checking server...
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Server is NOT running!
    echo         Please start: server\start-server-dev.bat
    pause
    exit /b 1
)
echo [OK] Server is running

REM Test health
echo.
echo [2] Testing server health...
curl -s http://localhost:3001/health >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Cannot reach server
) else (
    echo [OK] Server is responding
)

REM Check extension
echo.
echo [3] Checking extension build...
if not exist "dist\content\content-script.js" (
    echo [ERROR] Extension not built! Building now...
    call npm run build
    if %errorlevel% neq 0 (
        echo [ERROR] Build failed!
        pause
        exit /b 1
    )
)
echo [OK] Extension is built

echo.
echo ========================================
echo Next Steps:
echo ========================================
echo.
echo 1. Open Chrome: chrome://extensions/
echo 2. Find "Universal CAPTCHA Solver"
echo 3. Click REFRESH button (circular arrow) to reload extension
echo 4. Right-click extension icon → Options
echo 5. Verify settings (see CHECK_EXTENSION_SETTINGS.bat)
echo 6. Open test page: https://www.google.com/recaptcha/api2/demo
echo 7. Press F12 → Console tab
echo 8. Watch for [CAPTCHA Solver] messages
echo.
echo ========================================
echo Opening test page...
echo ========================================
echo.

timeout /t 3 >nul
start chrome "https://www.google.com/recaptcha/api2/demo"

echo.
echo Test page opened! Check the console (F12) for logs.
echo.
pause
