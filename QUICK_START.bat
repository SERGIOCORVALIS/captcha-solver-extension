@echo off
REM Quick Start - Fast Server Start
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   Quick Start - Server
echo ========================================
echo.

REM Check if already running
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Server is already running!
    echo.
    powershell -Command "try { $r = Invoke-RestMethod -Uri http://localhost:3001/health -TimeoutSec 2; Write-Output 'Server Status:' ($r | ConvertTo-Json) } catch { Write-Output 'Server not responding' }"
    echo.
    pause
    exit /b 0
)

REM Fix port if needed
cd server
if exist ".env" (
    findstr "PORT=" .env | findstr "3001" >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [INFO] Fixing PORT to 3001...
        powershell -Command "(Get-Content .env) -replace 'PORT=\d+', 'PORT=3001' | Set-Content .env"
    )
)
cd ..

REM Start server
echo [INFO] Starting server...
cd server
start "CAPTCHA Solver Server" cmd /k "node dist/index.js"
cd ..
echo [OK] Server window opened
echo.

REM Wait and check
echo [INFO] Waiting for server to start...
timeout /t 8 >nul

netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Server is running!
    echo.
    powershell -Command "try { $r = Invoke-RestMethod -Uri http://localhost:3001/health -TimeoutSec 2; Write-Output 'Server Status:' ($r | ConvertTo-Json) } catch { Write-Output 'Server not responding yet' }"
    echo.
    echo Server ready at: http://localhost:3001
) else (
    echo [WARNING] Server may still be starting...
    echo          Check the server window for status
)
echo.
pause
