@echo off
REM Fix CAPTCHA Solving Issues
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   Fix CAPTCHA Solving Issues
echo ========================================
echo.

REM Step 1: Stop all Node processes
echo [STEP 1] Stopping all Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul
echo [OK] All Node processes stopped
echo.

REM Step 2: Rebuild extension
echo [STEP 2] Rebuilding extension...
call npm run build
if errorlevel 1 (
    echo [ERROR] Extension build failed
    pause
    exit /b 1
)
echo [OK] Extension rebuilt
echo.

REM Step 3: Rebuild server
echo [STEP 3] Rebuilding server...
cd server
call npm run build
if errorlevel 1 (
    echo [ERROR] Server build failed
    cd ..
    pause
    exit /b 1
)
cd ..
echo [OK] Server rebuilt
echo.

REM Step 4: Check .env file
echo [STEP 4] Checking server configuration...
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
echo [OK] Configuration checked
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
:check_loop
set /a attempts+=1
if %attempts% GTR 15 (
    echo [WARNING] Server did not respond in time
    goto :server_ready
)
curl -s http://localhost:3001/health >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Server is responding!
    curl -s http://localhost:3001/health
    echo.
    goto :server_ready
)
timeout /t 2 >nul
goto :check_loop
:server_ready
echo.

REM Step 7: Open Chrome
echo [STEP 7] Opening Chrome extensions page...
start chrome://extensions/
echo.

echo ========================================
echo   Next Steps
echo ========================================
echo.
echo 1. In Chrome extensions page:
echo    - Find "Universal CAPTCHA Solver"
echo    - Click the REFRESH button (circular arrow)
echo    - Make sure it's ENABLED
echo.
echo 2. Right-click extension icon ^> Options:
echo    - Provider: Custom
echo    - Endpoint: http://localhost:3001/api/solve
echo    - API Key: JHQBCCKJJBBKJkhKUUKHOWN73987230598TGU
echo    - Make sure "Enabled" is checked
echo    - Make sure "Auto-solve" is checked
echo    - Click "Save"
echo.
echo 3. Test CAPTCHA:
echo    - Open: https://www.google.com/recaptcha/api2/demo
echo    - Wait 5-10 seconds
echo    - CAPTCHA should solve automatically
echo.
echo 4. If still not working:
echo    - Press F12 to open browser console
echo    - Look for errors (red text)
echo    - Check server logs: server\logs\combined.log
echo.
echo ========================================
echo.
pause
