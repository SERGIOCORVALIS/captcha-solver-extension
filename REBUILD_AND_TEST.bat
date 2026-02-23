@echo off
REM Rebuild Extension and Test
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   ПЕРЕСБОРКА И ТЕСТ РАСШИРЕНИЯ
echo ========================================
echo.

echo [1] Остановка сервера (если запущен)...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul
echo [OK] Старые процессы остановлены
echo.

echo [2] Пересборка расширения...
call npm run build
if errorlevel 1 (
    echo [ERROR] Ошибка сборки расширения!
    pause
    exit /b 1
)
echo [OK] Расширение пересобрано
echo.

echo [3] Проверка файлов...
if exist "dist\content\content-script.js" (
    echo [OK] content-script.js существует
    for %%F in (dist\content\content-script.js) do echo        Размер: %%~zF байт
) else (
    echo [FAIL] content-script.js не найден!
    pause
    exit /b 1
)

if exist "dist\background\service-worker.js" (
    echo [OK] service-worker.js существует
) else (
    echo [FAIL] service-worker.js не найден!
    pause
    exit /b 1
)

if exist "dist\manifest.json" (
    echo [OK] manifest.json существует
) else (
    echo [FAIL] manifest.json не найден!
    pause
    exit /b 1
)
echo.

echo [4] Запуск сервера...
cd server
start "CAPTCHA Solver Server" cmd /k "node dist/index.js"
cd ..
timeout /t 5 >nul
echo [OK] Сервер запущен
echo.

echo [5] Проверка сервера...
powershell -Command "try { $r = Invoke-RestMethod -Uri http://localhost:3001/health -TimeoutSec 5; Write-Output '[OK] Сервер отвечает'; exit 0 } catch { Write-Output '[FAIL] Сервер не отвечает'; exit 1 }" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Сервер еще не готов, подождите 5 секунд...
    timeout /t 5 >nul
)
echo.

echo ========================================
echo   ВАЖНО: СЛЕДУЮЩИЕ ШАГИ
echo ========================================
echo.
echo 1. ОБЯЗАТЕЛЬНО обновите расширение в браузере:
echo    Chrome: chrome://extensions/
echo    Edge: edge://extensions/
echo    - Найдите "Universal CAPTCHA Solver"
echo    - Нажмите "Обновить" (круглая стрелка)
echo    - Убедитесь, что переключатель ВКЛЮЧЕН
echo.
echo 2. Проверьте настройки расширения:
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
echo    - Если сообщений НЕТ = расширение не загружено
echo    - Перезагрузите страницу (F5)
echo.
echo ========================================
echo.

REM Open pages
echo Открываю страницы...
start chrome://extensions/
timeout /t 2 >nul
start msedge://extensions/
timeout /t 2 >nul
start https://www.google.com/recaptcha/api2/demo

echo.
echo [INFO] Страницы открыты
echo        ОБЯЗАТЕЛЬНО обновите расширение в обоих браузерах!
echo.
pause
