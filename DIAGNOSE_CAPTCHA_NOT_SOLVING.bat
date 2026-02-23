@echo off
REM Diagnostic script for CAPTCHA not solving
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo CAPTCHA Solver Diagnostic
echo ========================================
echo.

REM 1. Check server
echo [1] Checking server...
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Server is NOT running on port 3001
    echo         Please start: server\start-server-dev.bat
    echo.
) else (
    echo [OK] Server is running on port 3001
)

REM 2. Test health endpoint
echo.
echo [2] Testing server health endpoint...
curl -s http://localhost:3001/health >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Cannot reach server health endpoint
) else (
    echo [OK] Server health endpoint is accessible
)

REM 3. Check extension build
echo.
echo [3] Checking extension build...
if not exist "dist\content\content-script.js" (
    echo [ERROR] Extension not built!
    echo         Run: npm run build
    echo.
) else (
    echo [OK] Extension is built
)

REM 4. Check manifest
echo.
echo [4] Checking manifest...
if not exist "dist\manifest.json" (
    echo [ERROR] Manifest not found!
) else (
    echo [OK] Manifest exists
)

echo.
echo ========================================
echo Diagnostic Complete
echo ========================================
echo.
echo IMPORTANT: Check the following in Chrome:
echo.
echo 1. Open chrome://extensions/
echo 2. Find "Universal CAPTCHA Solver"
echo 3. Click "Options" (right-click icon)
echo 4. Verify:
echo    - Extension is ENABLED
echo    - Auto-solve is ENABLED
echo    - Provider: Custom
echo    - Endpoint: http://localhost:3001/api/solve
echo    - API Key: JHQBCCKJJBBKJkhKUUKHOWN73987230598TGU
echo    - Enable logging: ON (for debugging)
echo.
echo 5. Open browser console (F12) on CAPTCHA page
echo 6. Look for messages starting with [CAPTCHA Solver]
echo 7. Check for any errors
echo.
echo 8. Check server logs in: server\logs\combined.log
echo.
pause
