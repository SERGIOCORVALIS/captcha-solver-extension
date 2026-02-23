@echo off
REM Comprehensive Troubleshooting Script
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   CAPTCHA Solver - Troubleshooting
echo ========================================
echo.

REM 1. Check server
echo [1] Checking server...
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] Server is NOT running
    echo.
    echo Starting server...
    cd server
    start "CAPTCHA Solver Server" cmd /c "start-server-dev.bat"
    cd ..
    timeout /t 8 >nul
    echo [INFO] Server should be starting now
) else (
    echo [OK] Server is running
)
echo.

REM 2. Test server health
echo [2] Testing server health...
powershell -Command "try { $r = Invoke-RestMethod -Uri http://localhost:3001/health -TimeoutSec 5; Write-Output 'OK'; exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] Server does not respond
    echo        Check server logs: server\logs\combined.log
    echo        Try: RESTART_SERVER.bat
) else (
    echo [OK] Server responds
    powershell -Command "try { $r = Invoke-RestMethod -Uri http://localhost:3001/health -TimeoutSec 5; Write-Output ($r | ConvertTo-Json) } catch { Write-Output 'Error:' $_.Exception.Message }"
    echo.
)
echo.

REM 3. Test API endpoint
echo [3] Testing API endpoint...
echo [INFO] Sending test request (this may take time - CAPTCHA solving is slow)...
powershell -Command "try { $body = @{type='recaptcha_v2';siteKey='6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-';pageUrl='https://www.google.com/recaptcha/api2/demo'} | ConvertTo-Json; $headers = @{'X-API-Key'='JHQBCCKJJBBKJkhKUUKHOWN73987230598TGU'}; $r = Invoke-RestMethod -Uri http://localhost:3001/api/solve -Method POST -Body $body -Headers $headers -ContentType 'application/json' -TimeoutSec 5; Write-Output '[OK] API endpoint is accessible'; Write-Output 'Response received'; exit 0 } catch { if ($_.Exception.Message -like '*timeout*' -or $_.Exception.Message -like '*таймаут*') { Write-Output '[INFO] Request sent, but timeout (CAPTCHA solving takes 60-120 seconds)'; Write-Output 'This is normal - check server logs for progress'; exit 0 } else { Write-Output '[WARNING] API test failed:'; Write-Output $_.Exception.Message; exit 1 } }" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] API endpoint is accessible
    echo        Note: Full CAPTCHA solving takes 60-120 seconds
    echo        Check server logs to see progress
) else (
    echo [WARNING] API endpoint test failed
    echo          Check server logs for details
)
echo.
echo.

REM 4. Check recent server logs
echo [4] Recent server activity...
if exist "server\logs\combined.log" (
    echo Last 10 log entries:
    powershell -Command "Get-Content server\logs\combined.log -Tail 10"
) else (
    echo [WARNING] No log file found
)
echo.

REM 5. Check extension build
echo [5] Checking extension build...
if exist "dist\content\content-script.js" (
    echo [OK] Extension is built
) else (
    echo [FAIL] Extension is NOT built
    echo        Rebuilding now...
    call npm run build
    if errorlevel 1 (
        echo [ERROR] Build failed
    ) else (
        echo [OK] Extension rebuilt
    )
)
echo.

REM 6. Instructions
echo ========================================
echo   Manual Checks Required
echo ========================================
echo.
echo 1. Chrome Extension Settings:
echo    - Open: chrome://extensions/
echo    - Find "Universal CAPTCHA Solver"
echo    - Make sure it's ENABLED (toggle ON)
echo    - Click REFRESH button (circular arrow)
echo.
echo 2. Extension Options:
echo    - Right-click extension icon ^> Options
echo    - Check these settings:
echo      [X] Enabled
echo      [X] Auto-solve
echo      Provider: Custom
echo      Endpoint: http://localhost:3001/api/solve
echo      API Key: JHQBCCKJJBBKJkhKUUKHOWN73987230598TGU
echo    - Click "Save"
echo.
echo 3. Test Page:
echo    - Open: https://www.google.com/recaptcha/api2/demo
echo    - Press F12 to open browser console
echo    - Look for messages starting with "[CAPTCHA Solver]"
echo    - Wait 10-15 seconds for automatic solving
echo.
echo 4. Check Browser Console:
echo    - Press F12 on test page
echo    - Look for errors (red text)
echo    - Look for "[CAPTCHA Solver]" messages
echo    - Common issues:
echo      * "Failed to fetch" = Server not running
echo      * "Invalid API key" = Wrong API key in settings
echo      * "Auto-solve skipped" = Auto-solve disabled in settings
echo.
echo 5. Check Server Logs:
echo    - Open: server\logs\combined.log
echo    - Look for "Solving CAPTCHA request" messages
echo    - Look for errors
echo.
echo ========================================
echo.
echo Opening Chrome extensions page...
start chrome://extensions/
echo.
pause
