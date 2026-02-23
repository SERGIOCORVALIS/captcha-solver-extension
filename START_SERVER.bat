@echo off
REM Start Server and Verify
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   Starting CAPTCHA Solver Server
echo ========================================
echo.

REM Stop existing server
echo [1] Stopping existing server processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do (
    echo        Stopping process PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 >nul
echo [OK] Old processes stopped
echo.

REM Check if server is built
echo [2] Checking server build...
if not exist "server\dist\index.js" (
    echo [INFO] Server not built, building now...
    cd server
    call npm run build
    if errorlevel 1 (
        echo [ERROR] Server build failed
        cd ..
        pause
        exit /b 1
    )
    cd ..
)
echo [OK] Server is built
echo.

REM Check .env file
echo [3] Checking configuration...
cd server
if not exist ".env" (
    echo [INFO] Creating .env file...
    (
        echo PORT=3001
        echo NODE_ENV=development
        echo API_KEY=JHQBCCKJJBBKJkhKUUKHOWN73987230598TGU
        echo HEADLESS=true
        echo SOLVER_TIMEOUT=120000
        echo RETRY_ATTEMPTS=3
        echo USE_ML=true
        echo ML_MODEL_PATH=./models
        echo RATE_LIMIT_WINDOW_MS=900000
        echo RATE_LIMIT_MAX=100
        echo LOG_LEVEL=info
    ) > .env
) else (
    echo [INFO] Checking PORT in .env...
    findstr "PORT=" .env | findstr "3001" >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [WARNING] PORT is not 3001, fixing...
        powershell -Command "(Get-Content .env) -replace 'PORT=\d+', 'PORT=3001' | Set-Content .env"
        echo [OK] PORT fixed to 3001
    )
)
cd ..
echo [OK] Configuration ready
echo.

REM Start server
echo [4] Starting server...
cd server
start "CAPTCHA Solver Server" cmd /c "start-server-dev.bat"
cd ..
echo [OK] Server starting...
echo.

REM Wait and verify
echo [5] Waiting for server to start...
set /a attempts=0
:wait_loop
set /a attempts+=1
if %attempts% GTR 20 (
    echo [WARNING] Server did not start in time
    echo           Check server window for errors
    goto :verify
)
timeout /t 2 >nul
powershell -Command "try { Invoke-RestMethod -Uri http://localhost:3001/health -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Server is responding!
    goto :verify
)
goto :wait_loop

:verify
echo.
echo [6] Verifying server...
powershell -Command "try { $r = Invoke-RestMethod -Uri http://localhost:3001/health -TimeoutSec 3; Write-Output $r | ConvertTo-Json; exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Server is running and responding
    echo.
    echo Server status:
    powershell -Command "try { $r = Invoke-RestMethod -Uri http://localhost:3001/health -TimeoutSec 3; Write-Output ($r | ConvertTo-Json) } catch { Write-Output 'Error:' $_.Exception.Message }"
    echo.
    echo.
    echo Server is ready!
    echo Endpoint: http://localhost:3001/api/solve
    echo Health: http://localhost:3001/health
) else (
    echo [FAIL] Server is not responding
    echo.
    echo Troubleshooting:
    echo   1. Check server window for errors
    echo   2. Check logs: server\logs\combined.log
    echo   3. Check logs: server\logs\error.log
    echo   4. Make sure port 3001 is not blocked by firewall
)
echo.
pause
