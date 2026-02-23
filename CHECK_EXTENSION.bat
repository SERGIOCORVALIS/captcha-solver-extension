@echo off
REM Check Extension Status and Configuration
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   ПРОВЕРКА РАСШИРЕНИЯ В БРАУЗЕРЕ
echo ========================================
echo.

echo [INFO] Открываю страницы для проверки...
echo.

REM Open extension page
start chrome://extensions/

timeout /t 3 >nul

REM Open test page
start https://www.google.com/recaptcha/api2/demo

echo ========================================
echo   ИНСТРУКЦИИ ПО ПРОВЕРКЕ
echo ========================================
echo.
echo 1. В chrome://extensions/:
echo    - Найдите "Universal CAPTCHA Solver"
echo    - Убедитесь, что переключатель ВКЛЮЧЕН
echo    - Нажмите кнопку "Обновить" (круглая стрелка)
echo.
echo 2. Откройте опции расширения:
echo    - Правый клик на иконке расширения ^> Options
echo    ИЛИ
echo    - В chrome://extensions/ нажмите "Подробности" ^> "Параметры"
echo.
echo 3. Проверьте настройки:
echo    [X] Enabled (включено)
echo    [X] Auto-solve (включено)
echo    Provider: Custom
echo    Endpoint: http://localhost:3001/api/solve
echo    API Key: JHQBCCKJJBBKJkhKUUKHOWN73987230598TGU
echo    - Нажмите "Save"
echo.
echo 4. На странице с CAPTCHA (https://www.google.com/recaptcha/api2/demo):
echo    - Нажмите F12 (открыть консоль разработчика)
echo    - Перейдите на вкладку "Console"
echo    - Ищите сообщения "[CAPTCHA Solver]"
echo    - Подождите 10-15 секунд
echo.
echo 5. Проверьте консоль на ошибки:
echo    - "Failed to fetch" = Сервер не доступен
echo    - "Invalid API key" = Неправильный API ключ
echo    - "Auto-solve skipped" = Auto-solve выключен
echo.
echo ========================================
echo.
echo [INFO] Сервер работает и может решать CAPTCHA
echo        Проверьте, что расширение правильно настроено
echo.
pause
