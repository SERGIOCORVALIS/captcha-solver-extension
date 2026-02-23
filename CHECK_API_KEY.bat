@echo off
REM Check and display API key configuration
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   API Key Configuration Check
echo   Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH
echo ========================================
echo.

cd /d "%~dp0"

REM Check server .env file
echo [INFO] Checking server API key...
echo.

if exist "server\.env" (
    echo [OK] server\.env file exists
    echo.
    echo [INFO] Current API_KEY in server\.env:
    findstr /C:"API_KEY=" "server\.env" 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo [WARNING] API_KEY not found in server\.env
        echo [INFO] Default key will be used: change-me-in-production
    )
) else (
    echo [WARNING] server\.env file not found!
    echo [INFO] Server will use default key: change-me-in-production
    echo [INFO] To create .env file, run: server\start-server-dev.bat
)

echo.
echo ========================================
echo   Configuration Guide
echo ========================================
echo.
echo According to CONFIGURATION_GUIDE.txt, the API key should be:
echo   JHQBCCKJJBBKJkhKUUKHOWN73987230598TGU
echo.
echo To set the API key:
echo.
echo 1. Edit server\.env file
echo    Set: API_KEY=JHQBCCKJJBBKJkhKUUKHOWN73987230598TGU
echo.
echo 2. In Chrome extension settings:
echo    - Provider: Custom
echo    - Endpoint: http://localhost:3001/api/solve
echo    - API Key: JHQBCCKJJBBKJkhKUUKHOWN73987230598TGU
echo.
echo 3. Restart the server after changing .env
echo 4. Reload the extension in Chrome
echo.
echo ========================================
echo.

pause
