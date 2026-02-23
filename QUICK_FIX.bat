@echo off
REM Quick Fix - Start Server Only
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   Quick Fix - Starting Server
echo ========================================
echo.

REM Stop old server
echo [1] Stopping old server...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 >nul
echo [OK] Done
echo.

REM Start server
echo [2] Starting server...
cd server
if not exist "dist\index.js" (
    echo [INFO] Server not built, building...
    call npm run build
    if errorlevel 1 (
        echo [ERROR] Build failed
        cd ..
        pause
        exit /b 1
    )
)
start "CAPTCHA Solver Server" cmd /c "start-server-dev.bat"
cd ..
echo [OK] Server starting...
echo.

REM Wait and check
echo [3] Waiting for server...
timeout /t 8 >nul

REM Check if running
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Server is running on port 3001!
    echo.
    echo Server ready at: http://localhost:3001
    echo Health check: http://localhost:3001/health
    echo API endpoint: http://localhost:3001/api/solve
) else (
    echo [WARNING] Server may still be starting...
    echo           Check server window for status
    echo           Or run DIAGNOSE.bat to verify
)
echo.
pause
