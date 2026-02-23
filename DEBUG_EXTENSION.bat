@echo off
REM Debug Extension - Find Why CAPTCHA Not Solving
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   ОТЛАДКА РАСШИРЕНИЯ
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
    echo [FAIL] Сервер не отвечает!
    pause
    exit /b 1
)
echo.

echo [2] Проверка сборки расширения...
if not exist "dist\content\content-script.js" (
    echo [FAIL] Расширение не собрано!
    echo        Собираю расширение...
    call npm run build
    if errorlevel 1 (
        echo [ERROR] Ошибка сборки
        pause
        exit /b 1
    )
) else (
    echo [OK] Расширение собрано
)
echo.

echo [3] Проверка manifest.json...
if exist "dist\manifest.json" (
    echo [OK] manifest.json существует
    echo.
    echo Проверяю настройки manifest...
    findstr "content_scripts" dist\manifest.json >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [OK] content_scripts настроены
    ) else (
        echo [WARNING] content_scripts не найдены в manifest
    )
) else (
    echo [FAIL] manifest.json не найден!
)
echo.

echo ========================================
echo   ИНСТРУКЦИИ ПО ОТЛАДКЕ
echo ========================================
echo.
echo ШАГ 1: Проверьте установку расширения
echo   Chrome: chrome://extensions/
echo   Edge: edge://extensions/
echo.
echo   - Найдите "Universal CAPTCHA Solver"
echo   - Убедитесь, что переключатель ВКЛЮЧЕН
echo   - Нажмите "Обновить" (круглая стрелка)
echo   - Проверьте, что расширение загружено из папки:
echo     %CD%\dist
echo.
echo ШАГ 2: Проверьте настройки расширения
echo   - Правый клик на иконке ^> Options
echo   ИЛИ
echo   - В списке расширений ^> "Подробности" ^> "Параметры"
echo.
echo   Обязательные настройки:
echo   [X] Enabled (ВКЛЮЧЕНО)
echo   [X] Auto-solve (ВКЛЮЧЕНО)
echo   Provider: Custom
echo   Endpoint: http://localhost:3001/api/solve
echo   API Key: JHQBCCKJJBBKJkhKUUKHOWN73987230598TGU
echo   - Нажмите "Save"
echo.
echo ШАГ 3: Откройте тестовую страницу
echo   https://www.google.com/recaptcha/api2/demo
echo.
echo ШАГ 4: Откройте консоль разработчика
echo   - Нажмите F12
echo   - Перейдите на вкладку "Console"
echo   - Очистите консоль (иконка с перечеркнутым кругом)
echo.
echo ШАГ 5: Перезагрузите страницу
echo   - Нажмите F5 или Ctrl+R
echo   - Смотрите в консоль
echo.
echo ШАГ 6: Что искать в консоли
echo.
echo   ОЖИДАЕМЫЕ сообщения:
echo   - "[CAPTCHA Solver] Content script initialized"
echo   - "[CAPTCHA Solver] CAPTCHA detected"
echo   - "[CAPTCHA Solver] Auto-solving CAPTCHA"
echo.
echo   Если НЕТ сообщений:
echo   - Расширение не загружено
echo   - Content script не выполняется
echo   - Проверьте manifest.json
echo.
echo   Если есть ОШИБКИ:
echo   - "Failed to fetch" = Сервер не доступен
echo   - "Extension context invalidated" = Расширение перезагружено
echo   - "Runtime not available" = Service worker не работает
echo.
echo ШАГ 7: Проверьте вкладку Network
echo   - В консоли разработчика перейдите на вкладку "Network"
echo   - Перезагрузите страницу (F5)
echo   - Ищите запросы к: http://localhost:3001/api/solve
echo   - Если запросов нет = расширение не отправляет запросы
echo.
echo ========================================
echo.

REM Open pages
echo Открываю страницы для отладки...
start chrome://extensions/
timeout /t 2 >nul
start msedge://extensions/
timeout /t 2 >nul
start https://www.google.com/recaptcha/api2/demo

echo.
echo [INFO] Страницы открыты
echo.
echo [INFO] Следующие шаги:
echo   1. Проверьте расширение в chrome://extensions/ и edge://extensions/
echo   2. Убедитесь, что расширение ВКЛЮЧЕНО
echo   3. Откройте тестовую страницу
echo   4. Нажмите F12 и проверьте консоль
echo   5. Перезагрузите страницу (F5)
echo   6. Ищите сообщения "[CAPTCHA Solver]"
echo.
pause
