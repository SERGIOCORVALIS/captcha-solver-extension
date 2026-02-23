@echo off
REM Check if server is running
echo Checking if server is running on port 3001...
echo.

netstat -an | findstr ":3001" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Server appears to be running on port 3000
    echo.
    echo Testing server connection...
    curl -s http://localhost:3000/health >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Server is responding to requests
    ) else (
        echo [WARNING] Server port is open but not responding
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
