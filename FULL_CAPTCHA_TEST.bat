@echo off
REM Full CAPTCHA Test and Monitoring
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   ПОЛНАЯ ПРОВЕРКА И ТЕСТ CAPTCHA
echo ========================================
echo.

REM Step 1: Check server
echo [1] Проверка сервера...
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] Сервер не запущен!
    echo        Запускаю сервер...
    call RESTART_SERVER.bat
    timeout /t 5 >nul
) else (
    echo [OK] Сервер запущен на порту 3001
)

REM Test health
powershell -Command "try { $r = Invoke-RestMethod -Uri http://localhost:3001/health -TimeoutSec 3; Write-Output '[OK] Сервер отвечает'; exit 0 } catch { Write-Output '[FAIL] Сервер не отвечает'; exit 1 }" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] Сервер не отвечает на health check
    echo        Перезапускаю сервер...
    call RESTART_SERVER.bat
    timeout /t 10 >nul
)
echo.

REM Step 2: Check configuration
echo [2] Проверка конфигурации...
cd server
if exist ".env" (
    findstr "PORT=3001" .env >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [WARNING] Порт не 3001, исправляю...
        powershell -Command "(Get-Content .env) -replace 'PORT=\d+', 'PORT=3001' | Set-Content .env"
    )
    findstr "API_KEY=JHQBCCKJJBBKJkhKUUKHOWN73987230598TGU" .env >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [WARNING] API ключ не совпадает
    ) else (
        echo [OK] API ключ правильный
    )
) else (
    echo [ERROR] .env файл не найден!
    cd ..
    pause
    exit /b 1
)
cd ..
echo.

REM Step 3: Check extension build
echo [3] Проверка расширения...
if exist "dist\content\content-script.js" (
    echo [OK] Расширение собрано
) else (
    echo [FAIL] Расширение не собрано!
    echo        Собираю расширение...
    call npm run build
    if errorlevel 1 (
        echo [ERROR] Ошибка сборки расширения
        pause
        exit /b 1
    )
)
echo.

REM Step 4: Send test request
echo [4] Отправка тестового запроса на решение CAPTCHA...
echo [INFO] Это может занять 60-120 секунд...
echo.

powershell -NoProfile -Command "$body = @{type='recaptcha_v2';siteKey='6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-';pageUrl='https://www.google.com/recaptcha/api2/demo'} | ConvertTo-Json; $headers = @{'X-API-Key'='JHQBCCKJJBBKJkhKUUKHOWN73987230598TGU'}; Write-Host '[INFO] Запрос отправлен, ожидаю ответ...' -ForegroundColor Yellow; $startTime = Get-Date; try { $r = Invoke-RestMethod -Uri http://localhost:3001/api/solve -Method POST -Body $body -Headers $headers -ContentType 'application/json' -TimeoutSec 150; $elapsed = ((Get-Date) - $startTime).TotalSeconds; Write-Host '[SUCCESS] CAPTCHA решена!' -ForegroundColor Green; Write-Host (\"Время решения: $([math]::Round($elapsed, 2)) секунд\") -ForegroundColor Green; Write-Host 'Токен получен:' -ForegroundColor Green; $r | ConvertTo-Json -Depth 5; exit 0 } catch { $elapsed = ((Get-Date) - $startTime).TotalSeconds; Write-Host '[ERROR] Ошибка при решении' -ForegroundColor Red; Write-Host (\"Время до ошибки: $([math]::Round($elapsed, 2)) секунд\") -ForegroundColor Yellow; Write-Host $_.Exception.Message -ForegroundColor Red; if ($_.Exception.Response) { $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream()); $responseBody = $reader.ReadToEnd(); Write-Host (\"Ответ сервера: $responseBody\") -ForegroundColor Yellow; } exit 1 }"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] CAPTCHA успешно решена!
) else (
    echo.
    echo [WARNING] CAPTCHA не решена или произошла ошибка
    echo          Проверьте логи: server\logs\combined.log
)
echo.

REM Step 5: Monitor logs
echo [5] Последние логи сервера...
if exist "server\logs\combined.log" (
    echo Последние 15 записей:
    powershell -Command "Get-Content server\logs\combined.log -Tail 15"
) else (
    echo [WARNING] Лог файл не найден
)
echo.

REM Step 6: Instructions
echo ========================================
echo   ИНСТРУКЦИИ ПО ПРОВЕРКЕ РАСШИРЕНИЯ
echo ========================================
echo.
echo 1. Откройте Chrome и перейдите на:
echo    https://www.google.com/recaptcha/api2/demo
echo.
echo 2. Откройте консоль разработчика (F12)
echo.
echo 3. Проверьте сообщения:
echo    - Должны быть сообщения "[CAPTCHA Solver]"
echo    - Не должно быть ошибок "Failed to fetch"
echo.
echo 4. Проверьте настройки расширения:
echo    - chrome://extensions/
echo    - Найдите "Universal CAPTCHA Solver"
echo    - Убедитесь, что включено
echo    - Нажмите "Обновить" (круглая стрелка)
echo.
echo 5. Проверьте опции расширения:
echo    - Правый клик на иконке ^> Options
echo    - Enabled: включено
echo    - Auto-solve: включено
echo    - Provider: Custom
echo    - Endpoint: http://localhost:3001/api/solve
echo    - API Key: JHQBCCKJJBBKJkhKUUKHOWN73987230598TGU
echo.
echo 6. Подождите 10-15 секунд на странице с CAPTCHA
echo    Расширение должно автоматически решить CAPTCHA
echo.
echo ========================================
echo.

REM Open test page
echo Открываю тестовую страницу...
start https://www.google.com/recaptcha/api2/demo
timeout /t 2 >nul
start chrome://extensions/

pause
