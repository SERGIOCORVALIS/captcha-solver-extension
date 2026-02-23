@echo off
chcp 65001 >nul
REM Быстрая проверка - почему CAPTCHA не решается
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   БЫСТРАЯ ПРОВЕРКА
echo ========================================
echo.

echo [1] Проверка сервера...
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] Сервер НЕ запущен!
    echo          Запустите: server\start-server-dev.bat
    echo.
    pause
    exit /b 1
)
echo [OK] Сервер работает

echo.
echo [2] Открываю настройки расширения...
start chrome://extensions/

echo.
echo ========================================
echo   КРИТИЧЕСКИ ВАЖНО - ПРОВЕРЬТЕ:
echo ========================================
echo.
echo 1. Найдите "Universal CAPTCHA Solver"
echo 2. ПРАВЫЙ КЛИК на ИКОНКЕ (не на карточке!) → Options
echo.
echo 3. В настройках проверьте:
echo.
echo    [General]
echo    ☑ Extension enabled - ВКЛЮЧЕНО
echo    ☑ Auto-solve CAPTCHAs - ВКЛЮЧЕНО  ← ВАЖНО!
echo.
echo    [API Configuration]
echo    Provider: Custom  ← ДОЛЖНО БЫТЬ Custom!
echo    Endpoint: http://localhost:3001/api/solve
echo    API Key: JHQBCCKJJBBKJkhKUUKHOWN73987230598TGU
echo.
echo    [Advanced]
echo    ☑ Enable logging - ВКЛЮЧЕНО (для отладки)
echo.
echo 4. Нажмите "Save"
echo 5. Вернитесь в chrome://extensions/
echo 6. Нажмите кнопку ОБНОВЛЕНИЯ (🔄) на карточке
echo.
echo ========================================
echo   После проверки настроек:
echo ========================================
echo.
echo 1. Откройте: https://www.google.com/recaptcha/api2/demo
echo 2. Нажмите F12 (консоль)
echo 3. Смотрите сообщения [CAPTCHA Solver]
echo.
echo Если видите "Auto-solve skipped" или "Detection disabled"
echo → Проверьте настройки еще раз!
echo.
pause
