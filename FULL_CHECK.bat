@echo off
REM Full System Check and Verification
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   Full System Check
echo ========================================
echo.

REM Load configuration from config.xml if exists
set CONFIG_FILE=config.xml
if exist "%CONFIG_FILE%" (
    echo [INFO] Using configuration from config.xml
) else (
    echo [WARNING] config.xml not found, using defaults
)
echo.

REM ========================================
REM 1. Environment Check
REM ========================================
echo [SECTION 1] Environment Check
echo.

echo [1.1] Node.js...
where node >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Node.js installed
    node --version
) else (
    echo [FAIL] Node.js NOT installed
    goto :summary
)
echo.

echo [1.2] npm...
where npm >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] npm available
    npm --version
) else (
    echo [FAIL] npm NOT available
    goto :summary
)
echo.

REM ========================================
REM 2. Dependencies Check
REM ========================================
echo [SECTION 2] Dependencies Check
echo.

echo [2.1] Extension dependencies...
if exist "node_modules" (
    echo [OK] Extension dependencies installed
) else (
    echo [FAIL] Extension dependencies NOT installed
    echo        Run: npm install
)
echo.

echo [2.2] Server dependencies...
if exist "server\node_modules" (
    echo [OK] Server dependencies installed
) else (
    echo [FAIL] Server dependencies NOT installed
    echo        Run: cd server ^&^& npm install
)
echo.

REM ========================================
REM 3. Build Status
REM ========================================
echo [SECTION 3] Build Status
echo.

echo [3.1] Extension build...
if exist "dist\content\content-script.js" (
    echo [OK] Extension is built
    for %%F in (dist\content\content-script.js) do echo        Size: %%~zF bytes
) else (
    echo [FAIL] Extension is NOT built
    echo        Run: npm run build
)
echo.

echo [3.2] Server build...
if exist "server\dist\index.js" (
    echo [OK] Server is built
) else (
    echo [FAIL] Server is NOT built
    echo        Run: cd server ^&^& npm run build
)
echo.

REM ========================================
REM 4. Server Status
REM ========================================
echo [SECTION 4] Server Status
echo.

echo [4.1] Server process...
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Server is running on port 3001
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do (
        echo        PID: %%a
    )
) else (
    echo [FAIL] Server is NOT running
    echo        Run: cd server ^&^& start-server-dev.bat
)
echo.

echo [4.2] Server health...
powershell -Command "try { $r = Invoke-RestMethod -Uri http://localhost:3001/health -TimeoutSec 3; Write-Output 'OK'; exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Server health check passed
    echo        Response:
    powershell -Command "try { $r = Invoke-RestMethod -Uri http://localhost:3001/health -TimeoutSec 3; Write-Output ($r | ConvertTo-Json) } catch { Write-Output 'Error:' $_.Exception.Message }"
    echo.
) else (
    echo [FAIL] Server health check failed
    echo        Server may not be running or not ready
)
echo.

echo [4.3] Server configuration...
if exist "server\.env" (
    echo [OK] Server .env file exists
    echo        API Key configured: 
    findstr "API_KEY" server\.env
) else (
    echo [FAIL] Server .env file NOT found
    echo        Run: APPLY_CONFIG.bat or server\start-server-dev.bat
)
echo.

REM ========================================
REM 5. API Test
REM ========================================
echo [SECTION 5] API Test
echo.

echo [5.1] API endpoint test...
powershell -Command "try { $body = @{type='recaptcha_v2';siteKey='6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-';pageUrl='https://www.google.com/recaptcha/api2/demo'} | ConvertTo-Json; $headers = @{'X-API-Key'='JHQBCCKJJBBKJkhKUUKHOWN73987230598TGU'}; Invoke-RestMethod -Uri http://localhost:3001/api/solve -Method POST -Body $body -Headers $headers -ContentType 'application/json' -TimeoutSec 5 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] API endpoint is accessible
) else (
    echo [WARNING] API endpoint test inconclusive
    echo        (This is normal if server is starting or CAPTCHA solving is in progress)
)
echo.

REM ========================================
REM 6. Extension Files
REM ========================================
echo [SECTION 6] Extension Files
echo.

echo [6.1] Content script...
if exist "dist\content\content-script.js" (
    echo [OK] Content script exists
) else (
    echo [FAIL] Content script NOT found
)
echo.

echo [6.2] Service worker...
if exist "dist\background\service-worker.js" (
    echo [OK] Service worker exists
) else (
    echo [FAIL] Service worker NOT found
)
echo.

echo [6.3] Manifest...
if exist "dist\manifest.json" (
    echo [OK] Manifest exists
) else (
    echo [FAIL] Manifest NOT found
)
echo.

REM ========================================
REM 7. Logs Check
REM ========================================
echo [SECTION 7] Logs Check
echo.

echo [7.1] Server logs...
if exist "server\logs\combined.log" (
    echo [OK] Server log file exists
    echo        Last entry:
    powershell -Command "Get-Content server\logs\combined.log -Tail 1" 2>nul
) else (
    echo [INFO] Server log file not found (server may not have run yet)
)
echo.

REM ========================================
REM Summary
REM ========================================
:summary
echo ========================================
echo   Summary
echo ========================================
echo.
echo Configuration: config.xml
echo Server: http://localhost:3001
echo Endpoint: http://localhost:3001/api/solve
echo API Key: JHQBCCKJJBBKJkhKUUKHOWN73987230598TGU
echo.
echo Next Steps:
echo   1. If server not running: cd server ^&^& start-server-dev.bat
echo   2. If extension not built: npm run build
echo   3. If config not applied: APPLY_CONFIG.bat
echo   4. Open chrome://extensions/ and reload extension
echo   5. Test at: https://www.google.com/recaptcha/api2/demo
echo.
echo Detailed diagnostics: TROUBLESHOOT.bat
echo.
pause
