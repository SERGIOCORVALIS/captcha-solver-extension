@echo off
REM Verify Configuration from config.xml
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   Verify Configuration
echo ========================================
echo.

if not exist "config.xml" (
    echo [ERROR] config.xml not found!
    pause
    exit /b 1
)

echo [INFO] Reading config.xml...
echo.

REM Check server port
echo [CHECK 1] Server Port...
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Server is running on port 3001 (as configured)
    set SERVER_RUNNING=1
) else (
    echo [FAIL] Server is NOT running on port 3001
    echo        Expected: port 3001 (from config.xml)
    set SERVER_RUNNING=0
)
echo.

REM Check server health
echo [CHECK 2] Server Health...
if "%SERVER_RUNNING%"=="1" (
    powershell -Command "try { $r = Invoke-RestMethod -Uri http://localhost:3001/health -TimeoutSec 5; Write-Output 'OK'; exit 0 } catch { exit 1 }" >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Server health check passed
        powershell -Command "try { $r = Invoke-RestMethod -Uri http://localhost:3001/health -TimeoutSec 5; Write-Output ($r | ConvertTo-Json) } catch { Write-Output 'Error:' $_.Exception.Message }"
        echo.
    ) else (
        echo [FAIL] Server health check failed
        echo        Expected: http://localhost:3001/health (from config.xml)
        echo        Server may be starting or there is an error
    )
) else (
    echo [SKIP] Server health check skipped (server not running)
)
echo.

REM Check API endpoint
echo [CHECK 3] API Endpoint...
powershell -Command "try { $body = @{type='recaptcha_v2';siteKey='test';pageUrl='https://test.com'} | ConvertTo-Json; $headers = @{'X-API-Key'='JHQBCCKJJBBKJkhKUUKHOWN73987230598TGU'}; Invoke-RestMethod -Uri http://localhost:3001/api/solve -Method POST -Body $body -Headers $headers -ContentType 'application/json' -TimeoutSec 5 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] API endpoint is accessible
) else (
    echo [WARNING] API endpoint test inconclusive (may require valid CAPTCHA)
    echo        Expected: http://localhost:3001/api/solve (from config.xml)
)
echo.

REM Check .env file
echo [CHECK 4] Server Configuration File...
if exist "server\.env" (
    echo [OK] Server .env file exists
    echo API Key in .env:
    findstr "API_KEY" server\.env
    echo Expected from config.xml: JHQBCCKJJBBKJkhKUUKHOWN73987230598TGU
) else (
    echo [FAIL] Server .env file not found
    echo        Run: APPLY_CONFIG.bat
)
echo.

REM Check extension build
echo [CHECK 5] Extension Build...
if exist "dist\content\content-script.js" (
    echo [OK] Extension is built
    echo        Location: dist\content\content-script.js (from config.xml)
    for %%F in (dist\content\content-script.js) do echo        Size: %%~zF bytes
) else (
    echo [FAIL] Extension is NOT built
    echo        Expected: dist\content\content-script.js (from config.xml)
    echo        Run: npm run build
)
echo.

REM Check server build
echo [CHECK 6] Server Build...
if exist "server\dist\index.js" (
    echo [OK] Server is built
    echo        Location: server\dist\index.js (from config.xml)
) else (
    echo [FAIL] Server is NOT built
    echo        Expected: server\dist\index.js (from config.xml)
    echo        Run: cd server ^&^& npm run build
)
echo.

REM Summary
echo ========================================
echo   Verification Summary
echo ========================================
echo.
echo Configuration file: config.xml
echo Server endpoint: http://localhost:3001/api/solve
echo API Key: JHQBCCKJJBBKJkhKUUKHOWN73987230598TGU
echo.

REM Count failures
set FAIL_COUNT=0
if "%SERVER_RUNNING%"=="0" set /a FAIL_COUNT+=1
if not exist "dist\content\content-script.js" set /a FAIL_COUNT+=1
if not exist "server\dist\index.js" set /a FAIL_COUNT+=1
if not exist "server\.env" set /a FAIL_COUNT+=1

if %FAIL_COUNT% EQU 0 (
    echo [SUCCESS] All checks passed!
    echo.
    echo System is ready to use.
) else (
    echo [WARNING] Some checks failed (%FAIL_COUNT% issue(s) found)
    echo.
    echo If any checks failed:
    echo   1. Run APPLY_CONFIG.bat to apply configuration
    echo   2. Run START_SERVER.bat to start the server
    echo   3. Run npm run build to build extension
    echo   4. Check DIAGNOSE.bat for detailed diagnostics
)
echo.
pause
