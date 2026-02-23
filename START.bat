@echo off
REM Quick Start Script for CAPTCHA Solver
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   CAPTCHA Solver - Quick Start
echo   Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist "node_modules" (
    echo [INFO] Installing extension dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
)

if not exist "server\node_modules" (
    echo [INFO] Installing server dependencies...
    cd server
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install server dependencies
        cd ..
        pause
        exit /b 1
    )
    cd ..
)

REM Build extension
echo [INFO] Building extension...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to build extension
    pause
    exit /b 1
)

REM Build server
echo [INFO] Building server...
cd server
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to build server
    cd ..
    pause
    exit /b 1
)
cd ..

REM Check if server is already running
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Server is already running on port 3001
    echo [INFO] Opening Chrome extensions page...
    start chrome://extensions/
    echo.
    echo [INFO] If you need to restart the server:
    echo   1. Stop the existing server process
    echo   2. Run this script again
    pause
    exit /b 0
)

REM Start server
echo [INFO] Starting server...
cd server
start "CAPTCHA Solver Server" cmd /c "start-server-dev.bat"
cd ..
timeout /t 3 >nul

REM Open Chrome extensions page
echo [INFO] Opening Chrome extensions page...
start chrome://extensions/

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo [INFO] Server: http://localhost:3001
echo [INFO] Health check: http://localhost:3001/health
echo.
echo [INFO] Next steps:
echo   1. In Chrome, enable "Developer mode"
echo   2. Click "Load unpacked"
echo   3. Select the "dist" folder
echo   4. Extension is already configured for local server!
echo.
echo [INFO] Test at: https://www.google.com/recaptcha/api2/demo
echo.
pause
