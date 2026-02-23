@echo off
REM Apply Configuration from config.xml (Advanced - Parses XML)
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   Apply Configuration (Advanced)
echo ========================================
echo.

if not exist "config.xml" (
    echo [ERROR] config.xml not found!
    pause
    exit /b 1
)

echo [INFO] Parsing config.xml...
echo.

REM Parse XML using PowerShell
powershell -Command ^
"$xml = [xml](Get-Content 'config.xml'); ^
$port = $xml.'captcha-solver-config'.server.port; ^
$apiKey = $xml.'captcha-solver-config'.server.'api-key'; ^
$timeout = $xml.'captcha-solver-config'.server.timeout; ^
$env = $xml.'captcha-solver-config'.server.environment; ^
$headless = $xml.'captcha-solver-config'.'server-advanced'.headless; ^
$solverTimeout = $xml.'captcha-solver-config'.'server-advanced'.'solver-timeout'; ^
$retryAttempts = $xml.'captcha-solver-config'.'server-advanced'.'retry-attempts'; ^
$useML = $xml.'captcha-solver-config'.'server-advanced'.'use-ml'; ^
$mlModelPath = $xml.'captcha-solver-config'.'server-advanced'.'ml-model-path'; ^
$rateLimitWindow = $xml.'captcha-solver-config'.'server-advanced'.'rate-limit'.'window-ms'; ^
$rateLimitMax = $xml.'captcha-solver-config'.'server-advanced'.'rate-limit'.'max-requests'; ^
$logLevel = $xml.'captcha-solver-config'.'server-advanced'.'log-level'; ^
Write-Output \"Port: $port\"; ^
Write-Output \"API Key: $apiKey\"; ^
Write-Output \"Timeout: $timeout\"; ^
Write-Output \"Environment: $env\"; ^
$env:CONFIG_PORT = $port; ^
$env:CONFIG_API_KEY = $apiKey; ^
$env:CONFIG_TIMEOUT = $timeout; ^
$env:CONFIG_ENV = $env; ^
$env:CONFIG_HEADLESS = $headless; ^
$env:CONFIG_SOLVER_TIMEOUT = $solverTimeout; ^
$env:CONFIG_RETRY = $retryAttempts; ^
$env:CONFIG_USE_ML = $useML; ^
$env:CONFIG_ML_PATH = $mlModelPath; ^
$env:CONFIG_RATE_WINDOW = $rateLimitWindow; ^
$env:CONFIG_RATE_MAX = $rateLimitMax; ^
$env:CONFIG_LOG_LEVEL = $logLevel"

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to parse config.xml
    pause
    exit /b 1
)

echo.
echo [STEP 1] Applying server configuration...
cd server

REM Create .env from parsed values
powershell -Command ^
"$port = $env:CONFIG_PORT; ^
$apiKey = $env:CONFIG_API_KEY; ^
$timeout = $env:CONFIG_TIMEOUT; ^
$env = $env:CONFIG_ENV; ^
$headless = $env:CONFIG_HEADLESS; ^
$solverTimeout = $env:CONFIG_SOLVER_TIMEOUT; ^
$retry = $env:CONFIG_RETRY; ^
$useML = $env:CONFIG_USE_ML; ^
$mlPath = $env:CONFIG_ML_PATH; ^
$rateWindow = $env:CONFIG_RATE_WINDOW; ^
$rateMax = $env:CONFIG_RATE_MAX; ^
$logLevel = $env:CONFIG_LOG_LEVEL; ^
@'
# Server Configuration from config.xml
PORT={0}
NODE_ENV={1}
API_KEY={2}
HEADLESS={3}
SOLVER_TIMEOUT={4}
RETRY_ATTEMPTS={5}
USE_ML={6}
ML_MODEL_PATH={7}
RATE_LIMIT_WINDOW_MS={8}
RATE_LIMIT_MAX={9}
LOG_LEVEL={10}
'@ -f $port, $env, $apiKey, $headless, $solverTimeout, $retry, $useML, $mlPath, $rateWindow, $rateMax, $logLevel | Out-File -FilePath .env -Encoding utf8"

if %ERRORLEVEL% EQU 0 (
    echo [OK] Server .env file created/updated from config.xml
    echo.
    echo Configuration applied:
    findstr "PORT=" .env
    findstr "API_KEY=" .env
) else (
    echo [ERROR] Failed to create .env file
    cd ..
    pause
    exit /b 1
)

cd ..
echo.

REM Show extension configuration
echo [STEP 2] Extension configuration (from config.xml)...
powershell -Command ^
"$xml = [xml](Get-Content 'config.xml'); ^
$provider = $xml.'captcha-solver-config'.extension.'api-config'.provider; ^
$endpoint = $xml.'captcha-solver-config'.extension.'api-config'.endpoint; ^
$extApiKey = $xml.'captcha-solver-config'.extension.'api-config'.'api-key'; ^
$enabled = $xml.'captcha-solver-config'.extension.enabled; ^
$autoSolve = $xml.'captcha-solver-config'.extension.'auto-solve'; ^
Write-Output \"Provider: $provider\"; ^
Write-Output \"Endpoint: $endpoint\"; ^
Write-Output \"API Key: $extApiKey\"; ^
Write-Output \"Enabled: $enabled\"; ^
Write-Output \"Auto-solve: $autoSolve\""

echo.
echo [INFO] Extension settings are in default configuration.
echo        If extension is installed, verify in Options.
echo.

REM Build
echo [STEP 3] Building components...
call npm run build
if errorlevel 1 (
    echo [ERROR] Extension build failed
    pause
    exit /b 1
)
echo [OK] Extension built

cd server
call npm run build
if errorlevel 1 (
    echo [ERROR] Server build failed
    cd ..
    pause
    exit /b 1
)
cd ..
echo [OK] Server built
echo.

REM Start server
echo [STEP 4] Starting server...
cd server
start "CAPTCHA Solver Server" cmd /c "start-server-dev.bat"
cd ..
timeout /t 5 >nul
echo [OK] Server starting...
echo.

REM Verify
echo [STEP 5] Verifying setup...
timeout /t 5 >nul
powershell -Command "try { $r = Invoke-RestMethod -Uri http://localhost:3001/health -TimeoutSec 3; Write-Output 'OK'; exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Server is responding
    powershell -Command "try { $r = Invoke-RestMethod -Uri http://localhost:3001/health -TimeoutSec 3; Write-Output ($r | ConvertTo-Json) } catch { Write-Output 'Error:' $_.Exception.Message }"
    echo.
) else (
    echo [WARNING] Server may still be starting...
    echo          Check server window for status
)
echo.

echo ========================================
echo   Configuration Applied!
echo ========================================
echo.
echo Next steps:
echo   1. Open chrome://extensions/
echo   2. Reload the extension
echo   3. Verify settings in Options
echo   4. Test at: https://www.google.com/recaptcha/api2/demo
echo.
pause
