@echo off
REM Check if server is running
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

cd /d "%~dp0"

echo Checking if server is running on port 3001...
echo.

netstat -an | findstr ":3001" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Server appears to be running on port 3001
    echo.
    echo Testing server connection...
    curl -s http://localhost:3001/health >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Server is responding to requests
    ) else (
        echo [WARNING] Server port is open but health endpoint is not responding yet
    )
) else (
    echo [ERROR] Server is NOT running on port 3001
    echo.
    echo To start the server, run:
    echo   server\start-server-dev.bat
    echo.
)

echo.
pause

