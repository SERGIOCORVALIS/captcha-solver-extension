@echo off
REM Diagnostic Script for CAPTCHA Solver
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   CAPTCHA Solver - Diagnostics
echo ========================================
echo.

REM Check 1: Node.js
echo [CHECK 1] Node.js installation...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] Node.js is not installed!
    echo        Install from: https://nodejs.org/
    goto :end
) else (
    echo [OK] Node.js found
    node --version
)
echo.

REM Check 2: Server process
echo [CHECK 2] Server process...
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Server is running on port 3001
    netstat -ano | findstr ":3001" | findstr "LISTENING"
) else (
    echo [FAIL] Server is NOT running on port 3001
    echo.
    echo [AUTO-FIX] Attempting to start server...
    cd server
    if exist "dist\index.js" (
        start "CAPTCHA Solver Server" cmd /c "start-server-dev.bat"
        cd ..
        timeout /t 5 >nul
        echo [INFO] Server should be starting now...
    ) else (
        echo [ERROR] Server not built. Run: cd server ^&^& npm run build
        cd ..
    )
)
echo.

REM Check 3: Server health
echo [CHECK 3] Server health check...
powershell -Command "try { Invoke-RestMethod -Uri http://localhost:3001/health -TimeoutSec 3 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Server responds to health check
    curl -s http://localhost:3001/health
    echo.
) else (
    echo [FAIL] Server does not respond to health check
    echo        Server may be starting or there is an error
)
echo.

REM Check 4: Server logs
echo [CHECK 4] Recent server logs...
if exist "server\logs\combined.log" (
    echo [OK] Log file exists
    echo Last 5 log entries:
    powershell -Command "Get-Content server\logs\combined.log -Tail 5"
) else (
    echo [WARNING] Log file not found
)
echo.

REM Check 5: Extension build
echo [CHECK 5] Extension build...
if exist "dist\content\content-script.js" (
    echo [OK] Extension is built
    echo File size: 
    dir "dist\content\content-script.js" | findstr "content-script.js"
) else (
    echo [FAIL] Extension is NOT built
    echo        Run: npm run build
)
echo.

REM Check 6: Server build
echo [CHECK 6] Server build...
if exist "server\dist\index.js" (
    echo [OK] Server is built
) else (
    echo [FAIL] Server is NOT built
    echo        Run: cd server ^&^& npm run build
)
echo.

REM Check 7: Configuration files
echo [CHECK 7] Configuration files...
if exist "server\.env" (
    echo [OK] Server .env file exists
    echo API Key from .env:
    findstr "API_KEY" server\.env
) else (
    echo [FAIL] Server .env file NOT found
    echo        Run: server\start-server-dev.bat (it will create .env)
)
echo.

REM Check 8: Extension in Chrome
echo [CHECK 8] Extension installation...
echo [INFO] Please check manually:
echo        1. Open chrome://extensions/
echo        2. Check if "Universal CAPTCHA Solver" is installed
echo        3. Check if it's enabled
echo        4. Right-click icon ^> Options
echo        5. Verify settings:
echo           - Provider: Custom
echo           - Endpoint: http://localhost:3001/api/solve
echo           - API Key: (should match server/.env)
echo.

REM Check 9: Test API endpoint
echo [CHECK 9] Testing API endpoint...
echo [INFO] Testing POST request to /api/solve...
curl -X POST http://localhost:3001/api/solve ^
  -H "Content-Type: application/json" ^
  -H "X-API-Key: JHQBCCKJJBBKJkhKUUKHOWN73987230598TGU" ^
  -d "{\"type\":\"recaptcha_v2\",\"siteKey\":\"test\",\"pageUrl\":\"https://test.com\"}" ^
  2>nul
echo.
echo.

REM Summary
echo ========================================
echo   Summary
echo ========================================
echo.
echo If server is not running:
echo   cd server
echo   start-server-dev.bat
echo.
echo If extension is not built:
echo   npm run build
echo.
echo If extension is not installed:
echo   1. Open chrome://extensions/
echo   2. Enable "Developer mode"
echo   3. Click "Load unpacked"
echo   4. Select "dist" folder
echo.
echo To test CAPTCHA solving:
echo   1. Open: https://www.google.com/recaptcha/api2/demo
echo   2. Wait for automatic solving
echo   3. Check browser console (F12) for errors
echo   4. Check server logs: server\logs\combined.log
echo.

:end
pause
