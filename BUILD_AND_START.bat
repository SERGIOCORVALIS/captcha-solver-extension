@echo off
REM Build and Start - One Command Setup
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

title CAPTCHA Solver - Build and Start

echo.
echo ========================================
echo   CAPTCHA Solver - Build and Start
echo ========================================
echo.

REM Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found!
    echo Install from: https://nodejs.org/
    pause
    exit /b 1
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo [1/5] Installing extension dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Installation failed
        pause
        exit /b 1
    )
) else (
    echo [1/5] Extension dependencies OK
)

if not exist "server\node_modules" (
    echo [2/5] Installing server dependencies...
    cd server
    call npm install
    if errorlevel 1 (
        echo [ERROR] Server installation failed
        cd ..
        pause
        exit /b 1
    )
    cd ..
) else (
    echo [2/5] Server dependencies OK
)

REM Build extension
echo [3/5] Building extension...
call npm run build
if errorlevel 1 (
    echo [ERROR] Extension build failed
    pause
    exit /b 1
)
echo [OK] Extension built

REM Build server
echo [4/5] Building server...
cd server
call npm run build
if errorlevel 1 (
    echo [ERROR] Server build failed
    cd ..
    pause
    exit /b 1
)
cd ..
echo [OK] Server built

REM Stop old server
echo [5/5] Starting server...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 >nul

REM Start server
cd server
start "CAPTCHA Solver Server" cmd /c "start-server-dev.bat"
cd ..
timeout /t 5 >nul

REM Verify server
curl -s http://localhost:3001/health >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Server is running!
) else (
    echo [INFO] Server is starting... (may take a few seconds)
)

echo.
echo ========================================
echo   Complete!
echo ========================================
echo.
echo Server: http://localhost:3001
echo Extension: Load "dist" folder in Chrome
echo.
echo Opening Chrome extensions...
start chrome://extensions/
echo.
pause
