@echo off
REM Check Extension Settings
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo Extension Settings Checker
echo ========================================
echo.

echo [INFO] Opening Chrome extensions page...
start chrome://extensions/

echo.
echo ========================================
echo CHECKLIST - Verify these settings:
echo ========================================
echo.
echo 1. Find "Universal CAPTCHA Solver" extension
echo 2. Make sure extension is ENABLED (toggle switch ON)
echo 3. Click "Options" (right-click on extension icon)
echo.
echo In Options page, verify:
echo.
echo [General Tab]
echo   - Extension enabled: CHECKED
echo   - Auto-solve CAPTCHAs: CHECKED
echo   - Hide CAPTCHA UI: (optional)
echo.
echo [API Configuration Tab]
echo   - Provider: Custom
echo   - Endpoint: http://localhost:3001/api/solve
echo   - API Key: JHQBCCKJJBBKJkhKUUKHOWN73987230598TGU
echo   - Timeout: 120000
echo.
echo [Advanced Tab]
echo   - Enable logging: CHECKED (important for debugging!)
echo.
echo 4. Click "Save" button
echo 5. Go back to chrome://extensions/
echo 6. Click REFRESH button on extension card (circular arrow icon)
echo.
echo ========================================
echo.
echo After checking settings:
echo 1. Open a page with CAPTCHA (e.g., https://www.google.com/recaptcha/api2/demo)
echo 2. Press F12 to open Developer Tools
echo 3. Go to Console tab
echo 4. Look for messages starting with [CAPTCHA Solver]
echo.
echo Expected messages:
echo   [CAPTCHA Solver] Content script initialized
echo   [CAPTCHA Solver] Detection started
echo   [CAPTCHA Solver] CAPTCHA detected
echo   [CAPTCHA Solver] Auto-solving CAPTCHA
echo.
pause
