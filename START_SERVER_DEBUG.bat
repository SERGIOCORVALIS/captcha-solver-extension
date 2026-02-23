@echo off
REM Start Server with Debug Output
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   Starting Server (Debug Mode)
echo ========================================
echo.

REM Stop old processes
echo [1] Stopping old processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul
echo [OK] Done
echo.

REM Check build
echo [2] Checking build...
if not exist "server\dist\index.js" (
    echo [ERROR] Server not built!
    echo         Run: cd server ^&^& npm run build
    pause
    exit /b 1
)
echo [OK] Server is built
echo.

REM Check .env
echo [3] Checking configuration...
if not exist "server\.env" (
    echo [INFO] Creating .env file...
    cd server
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
    cd ..
)
echo [OK] Configuration ready
echo.

REM Start server in visible window
echo [4] Starting server...
echo [INFO] Server window will open - watch for errors!
echo.
cd server
start "CAPTCHA Solver Server - DEBUG" cmd /k "node dist/index.js"
cd ..
echo.
echo [INFO] Server window opened. Check for any error messages.
echo [INFO] Waiting 10 seconds for server to start...
timeout /t 10 >nul
echo.

REM Check if running
echo [5] Checking server status...
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Server is running on port 3001!
    echo.
    echo Testing health endpoint...
    curl -s http://localhost:3001/health
    echo.
    echo.
    echo [SUCCESS] Server is ready!
) else (
    echo [FAIL] Server is NOT running on port 3001
    echo.
    echo [TROUBLESHOOTING]
    echo   1. Check the server window for error messages
    echo   2. Check logs: server\logs\error.log
    echo   3. Check logs: server\logs\combined.log
    echo   4. Make sure port 3001 is not blocked
    echo.
    echo Opening log files...
    if exist "server\logs\error.log" (
        start notepad server\logs\error.log
    )
    if exist "server\logs\combined.log" (
        start notepad server\logs\combined.log
    )
)
echo.
pause
