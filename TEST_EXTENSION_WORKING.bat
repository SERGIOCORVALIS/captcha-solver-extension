@echo off
cd /d "%~dp0"

REM Test Extension Working in Browser
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   ТЕСТ РАБОТЫ РАСШИРЕНИЯ В БРАУЗЕРЕ
echo ========================================
echo.

echo [1] Проверка сервера...
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] Сервер не запущен!
    echo        Запускаю сервер...
    call RESTART_SERVER.bat
    timeout /t 10 >nul
) else (
    echo [OK] Сервер запущен
)

powershell -Command "try { $r = Invoke-RestMethod -Uri http://localhost:3001/health -TimeoutSec 3; Write-Output '[OK] Сервер отвечает'; exit 0 } catch { Write-Output '[FAIL] Сервер не отвечает'; exit 1 }" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [FAIL] Сервер не отвечает, перезапускаю...
    call RESTART_SERVER.bat
    timeout /t 10 >nul
)
echo.

echo [2] Проверка расширения...
if exist "dist\content\content-script.js" (
    echo [OK] Расширение собрано
) else (
    echo [FAIL] Расширение не собрано, собираю...
    call npm run build
    if errorlevel 1 (
        echo [ERROR] Ошибка сборки
        pause
        exit /b 1
    )
)
echo.

echo [3] Открываю страницы для тестирования...
echo.
echo ========================================
echo   ИНСТРУКЦИИ ПО ТЕСТИРОВАНИЮ
echo ========================================
echo.
echo ШАГ 1: Проверьте расширение
echo   - Откройте chrome://extensions/
echo   - Найдите "Universal CAPTCHA Solver"
echo   - Убедитесь, что переключатель ВКЛЮЧЕН
echo   - Нажмите "Обновить" (круглая стрелка)
echo.
echo ШАГ 2: Проверьте настройки
echo   - Правый клик на иконке расширения ^> Options
echo   ИЛИ
echo   - chrome://extensions/ ^> "Подробности" ^> "Параметры"
echo.
echo   Проверьте эти настройки:
echo   [X] Enabled (должно быть включено)
echo   [X] Auto-solve (должно быть включено)
echo   Provider: Custom
echo   Endpoint: http://localhost:3001/api/solve
echo   API Key: JHQBCCKJJBBKJkhKUUKHOWN73987230598TGU
echo   - Нажмите "Save"
echo.
echo ШАГ 3: Откройте тестовую страницу
echo   - Страница откроется автоматически
echo   - Нажмите F12 (консоль разработчика)
echo   - Перейдите на вкладку "Console"
echo.
echo ШАГ 4: Проверьте консоль
echo   Ищите эти сообщения:
echo   - "[CAPTCHA Solver] Content script initialized"
echo   - "[CAPTCHA Solver] CAPTCHA detected"
echo   - "[CAPTCHA Solver] Solving CAPTCHA..."
echo   - "[CAPTCHA Solver] CAPTCHA solved successfully"
echo.
echo   Если видите ошибки:
echo   - "Failed to fetch" = Сервер не доступен
echo   - "Invalid API key" = Неправильный API ключ
echo   - "Auto-solve skipped" = Auto-solve выключен
echo.
echo ШАГ 5: Подождите
echo   - Подождите 10-15 секунд на странице
echo   - CAPTCHA должна решиться автоматически
echo.
echo ========================================
echo.

REM Open pages
start chrome://extensions/
timeout /t 2 >nul
start https://www.google.com/recaptcha/api2/demo

echo [INFO] Страницы открыты
echo.
echo [INFO] Мониторинг логов сервера (нажмите Ctrl+C для остановки)...
echo.

:monitor_loop
timeout /t 5 >nul
cls
echo ========================================
echo   МОНИТОРИНГ ЛОГОВ СЕРВЕРА
echo ========================================
echo.
echo Последние 10 записей:
echo.
if exist "server\logs\combined.log" (
    powershell -Command "Get-Content server\logs\combined.log -Tail 10 | Select-String -Pattern 'CAPTCHA|solve|request|error|Error' -Context 0,1"
) else (
    echo [WARN] server\logs\combined.log not found yet. Start backend server first.
)
echo.
echo Нажмите Ctrl+C для остановки мониторинга
echo Или закройте это окно
echo.
goto :monitor_loop
