@echo off
REM One-Click Run - Start Everything
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   CAPTCHA Solver - One-Click Run
echo ========================================
echo.

REM Check if server is running
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Server is already running
    echo.
    echo Opening Chrome extensions...
    start chrome://extensions/
    echo.
    echo Server: http://localhost:3001
    echo Test: https://www.google.com/recaptcha/api2/demo
    pause
    exit /b 0
)

REM Stop old processes
echo [1] Cleaning up...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 1 >nul
echo [OK] Done
echo.

REM Check build
echo [2] Checking builds...
if not exist "server\dist\index.js" (
    echo [INFO] Building server...
    cd server
    call npm run build >nul 2>&1
    cd ..
)
if not exist "dist\content\content-script.js" (
    echo [INFO] Building extension...
    call npm run build >nul 2>&1
)
echo [OK] Builds ready
echo.

REM Start server
echo [3] Starting server...
cd server
start "CAPTCHA Solver Server" cmd /c "start-server-dev.bat"
cd ..
echo [OK] Server starting...
echo.

REM Wait
echo [4] Waiting for server to start...
timeout /t 8 >nul

REM Verify
echo [5] Verifying...
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Server is running!
) else (
    echo [WARNING] Server may still be starting...
    echo           Check the server window
)
echo.

REM Open Chrome
echo [6] Opening Chrome...
start chrome://extensions/

echo.
echo ========================================
echo   Ready!
echo ========================================
echo.
echo Server: http://localhost:3001
echo Health: http://localhost:3001/health
echo.
echo Next steps:
echo   1. In Chrome: Reload extension (refresh button)
echo   2. Test: https://www.google.com/recaptcha/api2/demo
echo.
pause
