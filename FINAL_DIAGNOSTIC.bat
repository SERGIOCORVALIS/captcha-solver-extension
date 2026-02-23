@echo off
REM Final Diagnostic - Complete System Check
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   ФИНАЛЬНАЯ ДИАГНОСТИКА СИСТЕМЫ
echo ========================================
echo.

REM 1. Server check
echo [1] Проверка сервера...
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Сервер запущен на порту 3001
    powershell -Command "try { $r = Invoke-RestMethod -Uri http://localhost:3001/health -TimeoutSec 3; Write-Output '[OK] Сервер отвечает'; exit 0 } catch { Write-Output '[FAIL] Сервер не отвечает'; exit 1 }" >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Health check пройден
    ) else (
        echo [FAIL] Health check не пройден
    )
) else (
    echo [FAIL] Сервер не запущен!
    echo        Запускаю сервер...
    call RESTART_SERVER.bat
    timeout /t 10 >nul
)
echo.

REM 2. Extension build
echo [2] Проверка расширения...
if exist "dist\content\content-script.js" (
    echo [OK] Расширение собрано
    for %%F in (dist\content\content-script.js) do echo        Размер: %%~zF байт
) else (
    echo [FAIL] Расширение не собрано!
    echo        Собираю расширение...
    call npm run build
)
echo.

REM 3. Configuration
echo [3] Проверка конфигурации...
cd server
if exist ".env" (
    findstr "PORT=3001" .env >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Порт настроен правильно (3001)
    ) else (
        echo [WARNING] Порт не 3001, исправляю...
        powershell -Command "(Get-Content .env) -replace 'PORT=\d+', 'PORT=3001' | Set-Content .env"
    )
    findstr "API_KEY=JHQBCCKJJBBKJkhKUUKHOWN73987230598TGU" .env >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [OK] API ключ правильный
    ) else (
        echo [WARNING] API ключ не совпадает
    )
) else (
    echo [FAIL] .env файл не найден!
)
cd ..
echo.

REM 4. Recent server activity
echo [4] Последняя активность сервера...
if exist "server\logs\combined.log" (
    echo Последние 3 запроса:
    powershell -Command "Get-Content server\logs\combined.log -Tail 20 | Select-String -Pattern 'POST.*api/solve|Solving CAPTCHA|solved successfully' | Select-Object -Last 3"
) else (
    echo [WARNING] Лог файл не найден
)
echo.

REM 5. Instructions
echo ========================================
echo   ЧТО ПРОВЕРИТЬ В БРАУЗЕРЕ
echo ========================================
echo.
echo 1. chrome://extensions/
echo    - "Universal CAPTCHA Solver" должен быть ВКЛЮЧЕН
echo    - Нажмите "Обновить" (круглая стрелка)
echo.
echo 2. Опции расширения:
echo    - Правый клик на иконке ^> Options
echo    - Enabled: ВКЛЮЧЕНО
echo    - Auto-solve: ВКЛЮЧЕНО
echo    - Provider: Custom
echo    - Endpoint: http://localhost:3001/api/solve
echo    - API Key: JHQBCCKJJBBKJkhKUUKHOWN73987230598TGU
echo    - Нажмите "Save"
echo.
echo 3. Откройте тестовую страницу:
echo    https://www.google.com/recaptcha/api2/demo
echo.
echo 4. Откройте консоль (F12) и проверьте:
echo    - Должны быть сообщения "[CAPTCHA Solver]"
echo    - Должны быть запросы к http://localhost:3001/api/solve
echo    - Не должно быть ошибок "Failed to fetch"
echo.
echo 5. Если сообщений нет:
echo    - Расширение не загружено
echo    - Перезагрузите страницу (F5)
echo    - Проверьте, что расширение включено
echo.
echo ========================================
echo.

REM Open pages
echo Открываю страницы для проверки...
start chrome://extensions/
timeout /t 2 >nul
start https://www.google.com/recaptcha/api2/demo

echo.
echo [INFO] Страницы открыты
echo        Проверьте консоль браузера (F12) на наличие сообщений
echo        "[CAPTCHA Solver]"
echo.
pause
