@echo off
REM Automatic Fix - Complete System Setup
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   Automatic Fix - Complete Setup
echo ========================================
echo.

REM Step 1: Stop everything
echo [STEP 1] Stopping all processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul
echo [OK] All processes stopped
echo.

REM Step 2: Install dependencies
echo [STEP 2] Installing dependencies...
if not exist "node_modules" (
    echo [INFO] Installing extension dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install extension dependencies
        pause
        exit /b 1
    )
)
if not exist "server\node_modules" (
    echo [INFO] Installing server dependencies...
    cd server
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install server dependencies
        cd ..
        pause
        exit /b 1
    )
    cd ..
)
echo [OK] Dependencies installed
echo.

REM Step 3: Build everything
echo [STEP 3] Building components...
call npm run build
if errorlevel 1 (
    echo [ERROR] Extension build failed
    pause
    exit /b 1
)
echo [OK] Extension built

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
echo.

REM Step 4: Configure server
echo [STEP 4] Configuring server...
cd server
if not exist ".env" (
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
)
cd ..
echo [OK] Server configured
echo.

REM Step 5: Start server
echo [STEP 5] Starting server...
cd server
start "CAPTCHA Solver Server" cmd /c "start-server-dev.bat"
cd ..
timeout /t 8 >nul
echo [OK] Server started
echo.

REM Step 6: Verify server
echo [STEP 6] Verifying server...
set /a attempts=0
:verify_loop
set /a attempts+=1
if %attempts% GTR 15 (
    echo [WARNING] Server verification timeout
    echo           Server may still be starting
    goto :done
)
curl -s http://localhost:3001/health >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Server is running and responding!
    curl -s http://localhost:3001/health
    echo.
    goto :done
)
timeout /t 2 >nul
goto :verify_loop

:done
echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Server: http://localhost:3001
echo Health: http://localhost:3001/health
echo API: http://localhost:3001/api/solve
echo.
echo Next steps:
echo   1. Open chrome://extensions/
echo   2. Reload the extension (refresh button)
echo   3. Right-click icon ^> Options
echo   4. Verify settings match config.xml
echo   5. Test at: https://www.google.com/recaptcha/api2/demo
echo.
start chrome://extensions/
pause
