@echo off
REM Restart Server
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   Restart Server
echo ========================================
echo.

REM Stop existing server
echo [1] Stopping existing server...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do (
    echo        Stopping process PID: %%a
    taskkill /F /PID %%a >nul 2>&1
)
taskkill /F /IM node.exe >nul 2>&1
timeout /t 3 >nul
echo [OK] Server stopped
echo.

REM Fix port if needed
echo [2] Checking configuration...
cd server
if exist ".env" (
    findstr "PORT=" .env | findstr "3001" >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [INFO] Fixing PORT to 3001...
        powershell -Command "(Get-Content .env) -replace 'PORT=\d+', 'PORT=3001' | Set-Content .env"
    )
)
cd ..
echo [OK] Configuration ready
echo.

REM Start server
echo [3] Starting server...
cd server
start "CAPTCHA Solver Server" cmd /k "node dist/index.js"
cd ..
echo [OK] Server starting...
echo.

REM Wait and verify
echo [4] Waiting for server to start (10 seconds)...
timeout /t 10 >nul

echo [5] Verifying server...
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Server is running on port 3001
    echo.
    echo Testing health endpoint...
    powershell -Command "try { $r = Invoke-RestMethod -Uri http://localhost:3001/health -TimeoutSec 5; Write-Output '✅ Server is responding!'; Write-Output ($r | ConvertTo-Json) } catch { Write-Output '⚠️ Server may still be starting...' }"
    echo.
    echo [SUCCESS] Server restarted successfully!
) else (
    echo [FAIL] Server is NOT running
    echo.
    echo [TROUBLESHOOTING]
    echo   1. Check the server window for error messages
    echo   2. Check logs: server\logs\error.log
    echo   3. Try running manually: cd server ^&^& node dist/index.js
)
echo.
pause
