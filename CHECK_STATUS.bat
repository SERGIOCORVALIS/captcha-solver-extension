@echo off
REM Quick Status Check
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   Quick Status Check
echo ========================================
echo.

REM Server status
echo [SERVER]
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Server is running on port 3001
) else (
    echo [FAIL] Server is NOT running
    echo.
    echo [AUTO-FIX] Starting server automatically...
    cd server
    if exist "dist\index.js" (
        start "CAPTCHA Solver Server" cmd /c "start-server-dev.bat"
        cd ..
        echo [INFO] Server is starting... Waiting 8 seconds...
        timeout /t 8 >nul
        echo [INFO] Checking again...
        netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
        if %ERRORLEVEL% EQU 0 (
            echo [OK] Server is now running!
        ) else (
            echo [WARNING] Server may still be starting. Check server window.
        )
    ) else (
        echo [ERROR] Server not built. Run: cd server ^&^& npm run build
        cd ..
    )
)
echo.

REM Server health
echo [HEALTH]
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    curl -s http://localhost:3001/health >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Server responds to health check
        curl -s http://localhost:3001/health
        echo.
    ) else (
        echo [WARNING] Server is running but not responding yet
        echo           It may still be initializing...
    )
) else (
    echo [FAIL] Server does not respond (server not running)
)
echo.

REM Extension build
echo [EXTENSION]
if exist "dist\content\content-script.js" (
    echo [OK] Extension is built
) else (
    echo [FAIL] Extension is NOT built
    echo        Run: npm run build
)
echo.

REM Server build
echo [SERVER BUILD]
if exist "server\dist\index.js" (
    echo [OK] Server is built
) else (
    echo [FAIL] Server is NOT built
    echo        Run: cd server ^&^& npm run build
)
echo.

REM Configuration
echo [CONFIG]
if exist "server\.env" (
    echo [OK] Server .env exists
    echo API Key: 
    findstr "API_KEY" server\.env
) else (
    echo [FAIL] Server .env NOT found
)
echo.

echo ========================================
echo   Quick Fixes
echo ========================================
echo.
echo If server not running:
echo   Run: RUN.bat (one-click start)
echo   Or: QUICK_FIX.bat (quick start)
echo   Or: START_SERVER.bat (start with verification)
echo.
echo If extension not working:
echo   1. Open chrome://extensions/
echo   2. Reload extension (refresh button)
echo   3. Check Options: Enabled + Auto-solve ON
echo   4. Check endpoint: http://localhost:3001/api/solve
echo.
echo Full diagnostics: DIAGNOSE.bat
echo Fix everything: FIX_CAPTCHA.bat
echo.
pause
