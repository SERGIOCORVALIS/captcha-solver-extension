@echo off
REM Open Chrome extension settings page
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

cd /d "%~dp0"

echo ========================================
echo   Opening Extension Settings
echo   Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH
echo ========================================
echo.

echo [INFO] Opening Chrome extensions page...
start chrome://extensions/

echo.
echo [INFO] Instructions:
echo.
echo 1. Find "Universal CAPTCHA Solver" extension
echo 2. Click "Options" button
echo 3. In "API Configuration" section:
echo    - Provider: Custom
echo    - Endpoint: http://localhost:3001/api/solve
echo    - API Key: your server API key from server\.env
echo 4. Click "Save"
echo 5. Reload the extension (click refresh button)
echo.
echo ========================================
echo.

timeout /t 3 >nul
