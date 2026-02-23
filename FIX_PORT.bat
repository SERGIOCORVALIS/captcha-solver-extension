@echo off
REM Fix Port Configuration
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   Fix Port Configuration
echo ========================================
echo.

cd server

if not exist ".env" (
    echo [ERROR] .env file not found!
    echo         Creating new .env file...
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
    echo [OK] .env file created with PORT=3001
) else (
    echo [INFO] Checking current PORT setting...
    findstr "PORT=" .env
    echo.
    echo [INFO] Fixing PORT to 3001...
    powershell -Command "(Get-Content .env) -replace 'PORT=\d+', 'PORT=3001' | Set-Content .env"
    echo [OK] PORT fixed to 3001
    echo.
    echo [INFO] Updated .env file:
    findstr "PORT=" .env
)

cd ..

echo.
echo [INFO] Port configuration fixed!
echo        Server will now use port 3001
echo.
echo [INFO] Restart the server for changes to take effect:
echo        cd server
echo        start-server-dev.bat
echo.
pause
