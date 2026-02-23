@echo off
REM Automatic Update Script for CAPTCHA Solver Extension
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   CAPTCHA Solver - Automatic Update
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

REM Step 1: Stop existing server processes
echo ========================================
echo [STEP 1] Stopping existing server processes...
echo ========================================
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 >nul
echo [OK] Server processes stopped
echo.

REM Step 2: Update extension dependencies
echo ========================================
echo [STEP 2] Updating extension dependencies...
echo ========================================
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to update extension dependencies
    pause
    exit /b 1
)
echo [OK] Extension dependencies updated
echo.

REM Step 3: Rebuild extension
echo ========================================
echo [STEP 3] Rebuilding extension...
echo ========================================
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to build extension
    pause
    exit /b 1
)
echo [OK] Extension rebuilt successfully
echo.

REM Step 4: Update server dependencies
echo ========================================
echo [STEP 4] Updating server dependencies...
echo ========================================
cd server
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to update server dependencies
    cd ..
    pause
    exit /b 1
)
echo [OK] Server dependencies updated
echo.

REM Step 5: Rebuild server
echo ========================================
echo [STEP 5] Rebuilding server...
echo ========================================
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to build server
    cd ..
    pause
    exit /b 1
)
echo [OK] Server rebuilt successfully
cd ..
echo.

REM Step 6: Start server
echo ========================================
echo [STEP 6] Starting server...
echo ========================================
cd server
start "CAPTCHA Solver Server" cmd /c "start-server-dev.bat"
cd ..
timeout /t 5 >nul
echo [OK] Server starting...
echo.

REM Step 7: Wait for server to be ready
echo ========================================
echo [STEP 7] Waiting for server to be ready...
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

REM Step 8: Open Chrome extensions page
echo ========================================
echo [STEP 8] Opening Chrome extensions page...
echo ========================================
start chrome://extensions/
echo.
echo [INFO] Please reload the extension:
echo 1. Open chrome://extensions/
echo 2. Find "Universal CAPTCHA Solver"
echo 3. Click the refresh button (circular arrow)
echo.
echo ========================================
echo   Update Complete!
echo ========================================
echo.
echo [INFO] Server is running at: http://localhost:3001
echo [INFO] Extension has been updated!
echo.
pause
