@echo off
REM Verify Extension Settings
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   ПРОВЕРКА НАСТРОЕК РАСШИРЕНИЯ
echo ========================================
echo.

echo [INFO] Открываю страницы для проверки настроек...
echo.

start chrome://extensions/
timeout /t 2 >nul

echo ========================================
echo   ЧЕКЛИСТ ПРОВЕРКИ
echo ========================================
echo.
echo 1. В chrome://extensions/:
echo    [ ] "Universal CAPTCHA Solver" установлено
echo    [ ] Переключатель ВКЛЮЧЕН (синий)
echo    [ ] Нажата кнопка "Обновить" (круглая стрелка)
echo.
echo 2. Откройте опции расширения:
echo    - Правый клик на иконке расширения ^> Options
echo    ИЛИ
echo    - chrome://extensions/ ^> "Подробности" ^> "Параметры"
echo.
echo 3. Проверьте настройки (должны быть ТОЧНО такими):
echo.
echo    [X] Enabled (включено)
echo    [X] Auto-solve (включено)
echo    Provider: Custom
echo    Endpoint: http://localhost:3001/api/solve
echo    API Key: JHQBCCKJJBBKJkhKUUKHOWN73987230598TGU
echo.
echo    ВАЖНО: После изменения настроек нажмите "Save"!
echo.
echo 4. Проверьте сервер:
echo    - Сервер должен быть запущен на порту 3001
echo    - Проверьте: http://localhost:3001/health
echo.
echo ========================================
echo.

REM Check server
echo Проверка сервера...
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Сервер запущен на порту 3001
    powershell -Command "try { $r = Invoke-RestMethod -Uri http://localhost:3001/health -TimeoutSec 3; Write-Output '[OK] Сервер отвечает'; Write-Output ($r | ConvertTo-Json) } catch { Write-Output '[FAIL] Сервер не отвечает' }"
) else (
    echo [FAIL] Сервер не запущен!
    echo        Запустите: RESTART_SERVER.bat
)
echo.

echo ========================================
echo   СЛЕДУЮЩИЕ ШАГИ
echo ========================================
echo.
echo После проверки настроек:
echo   1. Откройте: https://www.google.com/recaptcha/api2/demo
echo   2. Нажмите F12 (консоль разработчика)
echo   3. Ищите сообщения "[CAPTCHA Solver]"
echo   4. Подождите 10-15 секунд
echo.
echo Если CAPTCHA не решается:
echo   - Проверьте консоль на ошибки
echo   - Убедитесь, что сервер запущен
echo   - Убедитесь, что настройки правильные
echo   - Попробуйте перезагрузить страницу
echo.
pause
