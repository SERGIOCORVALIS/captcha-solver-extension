@echo off
REM Set API key in server .env file
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   Set API Key
echo   Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH
echo ========================================
echo.

cd /d "%~dp0"

set "API_KEY=JHQBCCKJJBBKJkhKUUKHOWN73987230598TGU"

echo [INFO] Setting API key to: %API_KEY%
echo.

REM Check if .env exists
if not exist "server\.env" (
    echo [INFO] Creating server\.env file...
    (
        echo # Server Configuration
        echo PORT=3001
        echo NODE_ENV=development
        echo API_KEY=%API_KEY%
        echo HEADLESS=true
        echo SOLVER_TIMEOUT=120000
        echo RETRY_ATTEMPTS=3
        echo USE_ML=false
        echo ML_MODEL_PATH=./models
        echo RATE_LIMIT_WINDOW_MS=900000
        echo RATE_LIMIT_MAX=100
        echo LOG_LEVEL=info
    ) > "server\.env"
    echo [OK] Created server\.env with API key
) else (
    echo [INFO] Updating API_KEY in existing server\.env...
    
    REM Create temporary file
    set "TEMP_FILE=%TEMP%\captcha_solver_env_%RANDOM%.tmp"
    
    REM Process .env file
    (
        for /f "usebackq tokens=1,* delims==" %%a in ("server\.env") do (
            if /i "%%a"=="API_KEY" (
                echo API_KEY=%API_KEY%
            ) else (
                echo %%a=%%b
            )
        )
    ) > "%TEMP_FILE%"
    
    REM Check if API_KEY was found and updated
    findstr /C:"API_KEY" "%TEMP_FILE%" >nul
    if %ERRORLEVEL% NEQ 0 (
        REM API_KEY not found, add it
        echo API_KEY=%API_KEY% >> "%TEMP_FILE%"
    )
    
    REM Replace original file
    move /y "%TEMP_FILE%" "server\.env" >nul
    echo [OK] Updated API_KEY in server\.env
)

echo.
echo ========================================
echo   Next Steps
echo ========================================
echo.
echo 1. Restart the server:
echo    server\start-server-dev.bat
echo.
echo 2. In Chrome extension settings:
echo    - Provider: Custom
echo    - Endpoint: http://localhost:3001/api/solve
echo    - API Key: %API_KEY%
echo.
echo 3. Reload the extension in Chrome
echo.
echo ========================================
echo.

pause
