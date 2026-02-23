@echo off
REM Final Fix - Complete System Reset and Start
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   Final Fix - Complete Reset
echo ========================================
echo.

REM Step 1: Kill all Node processes
echo [1] Stopping all Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 3 >nul
echo [OK] All processes stopped
echo.

REM Step 2: Fix port in .env
echo [2] Fixing port configuration...
cd server
if exist ".env" (
    powershell -Command "(Get-Content .env) -replace 'PORT=\d+', 'PORT=3001' | Set-Content .env"
    echo [OK] Port set to 3001
) else (
    echo [INFO] Creating .env file...
    (
        echo PORT=3001
        echo NODE_ENV=development
        echo API_KEY=JHQBCCKJJBBKJkhKUUKHOWN73987230598TGU
        echo HEADLESS=true
        echo SOLVER_TIMEOUT=120000
        echo RETRY_ATTEMPTS=3
        echo USE_ML=true
        echo ML_MODEL_PATH=./models
        echo RATE_LIMIT_WINDOW_MS=900000
        echo RATE_LIMIT_MAX=100
        echo LOG_LEVEL=info
    ) > .env
    echo [OK] .env created with PORT=3001
)
cd ..
echo.

REM Step 3: Verify port is free
echo [3] Checking port 3001...
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [WARNING] Port 3001 is still in use!
    echo           Killing processes on port 3001...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do (
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 2 >nul
)
echo [OK] Port 3001 is free
echo.

REM Step 4: Start server directly
echo [4] Starting server directly...
cd server
echo [INFO] Starting server in new window...
start "CAPTCHA Solver Server" cmd /k "node dist/index.js"
cd ..
echo [OK] Server window opened
echo.

REM Step 5: Wait and verify
echo [5] Waiting for server to start (15 seconds)...
timeout /t 15 >nul

echo [6] Verifying server...
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Server is running on port 3001!
    echo.
    echo Testing health endpoint...
    curl -s http://localhost:3001/health
    echo.
    echo.
    echo ========================================
    echo   SUCCESS!
    echo ========================================
    echo.
    echo Server is running at: http://localhost:3001
    echo Health check: http://localhost:3001/health
    echo API endpoint: http://localhost:3001/api/solve
    echo.
) else (
    echo [FAIL] Server is NOT running
    echo.
    echo [TROUBLESHOOTING]
    echo   1. Check the server window for error messages
    echo   2. Check if port 3001 is blocked by firewall
    echo   3. Check logs: server\logs\error.log
    echo   4. Try running manually: cd server ^&^& node dist/index.js
    echo.
    echo Opening error log...
    if exist "server\logs\error.log" (
        start notepad server\logs\error.log
    )
)
echo.
pause
