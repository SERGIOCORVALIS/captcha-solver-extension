@echo off
REM Automatic Setup Script for CAPTCHA Solver Extension
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   CAPTCHA Solver - Automatic Setup
echo   Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [INFO] Node.js version:
node --version
echo.

REM Step 1: Install extension dependencies
echo ========================================
echo [STEP 1] Installing extension dependencies...
echo ========================================
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install extension dependencies
    pause
    exit /b 1
)
echo [OK] Extension dependencies installed
echo.

REM Step 2: Build extension
echo ========================================
echo [STEP 2] Building extension...
echo ========================================
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to build extension
    pause
    exit /b 1
)
echo [OK] Extension built successfully
echo.

REM Step 3: Install server dependencies
echo ========================================
echo [STEP 3] Installing server dependencies...
echo ========================================
cd server
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install server dependencies
    cd ..
    pause
    exit /b 1
)
echo [OK] Server dependencies installed
echo.

REM Step 4: Build server
echo ========================================
echo [STEP 4] Building server...
echo ========================================
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to build server
    cd ..
    pause
    exit /b 1
)
echo [OK] Server built successfully
cd ..
echo.

REM Step 5: Check .env file
echo ========================================
echo [STEP 5] Checking server configuration...
echo ========================================
cd server
if not exist ".env" (
    echo [WARNING] .env file not found! Creating default...
    (
        echo # Server Configuration
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
    echo [OK] .env file created
) else (
    echo [OK] .env file exists
)
cd ..
echo.

REM Step 6: Check if port is available
echo ========================================
echo [STEP 6] Checking port 3001...
echo ========================================
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [WARNING] Port 3001 is already in use!
    echo.
    echo Processes using port 3001:
    netstat -ano | findstr ":3001" | findstr "LISTENING"
    echo.
    echo [INFO] To stop existing server:
    echo   1. Find the PID in the list above
    echo   2. Run: taskkill /F /PID ^<PID^>
    echo.
    choice /C YN /M "Do you want to stop existing processes and continue"
    if errorlevel 2 goto :skip_server
    if errorlevel 1 (
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do (
            taskkill /F /PID %%a >nul 2>&1
        )
        timeout /t 2 >nul
    )
) else (
    echo [OK] Port 3001 is free
)
:skip_server
echo.

REM Step 7: Start server
echo ========================================
echo [STEP 7] Starting server...
echo ========================================
cd server
start "CAPTCHA Solver Server" cmd /c "start-server-dev.bat"
cd ..
timeout /t 5 >nul
echo [OK] Server starting...
echo.

REM Step 8: Wait for server to be ready
echo ========================================
echo [STEP 8] Waiting for server to be ready...
echo ========================================
set /a attempts=0
:check_server
set /a attempts+=1
if %attempts% GTR 30 (
    echo [WARNING] Server did not start in time. Please check manually.
    goto :server_check_done
)
curl -s http://localhost:3001/health >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Server is running!
    goto :server_check_done
)
timeout /t 2 >nul
goto :check_server
:server_check_done
echo.

REM Step 9: Open Chrome extensions page
echo ========================================
echo [STEP 9] Opening Chrome extensions page...
echo ========================================
start chrome://extensions/
echo.
echo [INFO] Instructions:
echo.
echo 1. Enable "Developer mode" (toggle in top-right)
echo 2. Click "Load unpacked"
echo 3. Select the "dist" folder from this project
echo 4. Right-click the extension icon ^> Options
echo 5. Verify settings:
echo    - Provider: Custom
echo    - Endpoint: http://localhost:3001/api/solve
echo    - API Key: JHQBCCKJJBBKJkhKUUKHOWN73987230598TGU
echo 6. Click "Save"
echo 7. Reload the extension (click refresh button)
echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo [INFO] Server is running at: http://localhost:3001
echo [INFO] Extension is ready to use!
echo.
echo [INFO] Test it at: https://www.google.com/recaptcha/api2/demo
echo.
pause
