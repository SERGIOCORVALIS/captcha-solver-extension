@echo off
REM Quick Rebuild and Test Script
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   Quick Rebuild and Test
echo ========================================
echo.

echo [1/3] Building extension...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Extension build failed
    pause
    exit /b 1
)
echo [OK] Extension built successfully
echo.

echo [2/3] Building server...
cd server
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Server build failed
    cd ..
    pause
    exit /b 1
)
cd ..
echo [OK] Server built successfully
echo.

echo [3/3] Checking server status...
powershell -Command "try { $response = Invoke-WebRequest -Uri http://localhost:3001/health -Method GET -TimeoutSec 2; Write-Host '[OK] Server is running on port 3001' } catch { Write-Host '[WARN] Server is not running. Please start it with: cd server && npm start' }"
echo.

echo ========================================
echo   Build Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Reload the extension in Chrome (chrome://extensions/)
echo 2. Make sure server is running: cd server ^&^& npm start
echo 3. Test on: https://www.google.com/recaptcha/api2/demo
echo.
pause
