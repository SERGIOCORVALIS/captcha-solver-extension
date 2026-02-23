@echo off
REM Monitor Extension Activity
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   МОНИТОРИНГ РАБОТЫ РАСШИРЕНИЯ
echo ========================================
echo.

echo [INFO] Открываю тестовую страницу...
start https://www.google.com/recaptcha/api2/demo
timeout /t 2 >nul

echo ========================================
echo   ИНСТРУКЦИИ
echo ========================================
echo.
echo 1. На странице с CAPTCHA:
echo    - Нажмите F12 (консоль разработчика)
echo    - Перейдите на вкладку "Console"
echo    - Ищите сообщения "[CAPTCHA Solver]"
echo.
echo 2. Ожидаемые сообщения:
echo    - "[CAPTCHA Solver] Content script initialized"
echo    - "[CAPTCHA Solver] CAPTCHA detected"
echo    - "[CAPTCHA Solver] Solving CAPTCHA..."
echo    - "[CAPTCHA Solver] Sending solve request"
echo.
echo 3. Если сообщений нет:
echo    - Расширение не загружено или выключено
echo    - Проверьте chrome://extensions/
echo    - Убедитесь, что расширение включено
echo    - Нажмите "Обновить" на расширении
echo.
echo 4. Если есть ошибки:
echo    - "Failed to fetch" = Сервер не доступен
echo    - "Runtime not available" = Расширение не загружено
echo    - "Auto-solve skipped" = Auto-solve выключен
echo.
echo ========================================
echo.
echo [INFO] Мониторинг логов сервера...
echo        (Нажмите Ctrl+C для остановки)
echo.

:monitor
cls
echo ========================================
echo   МОНИТОРИНГ - %date% %time%
echo ========================================
echo.
echo Последние 5 записей из логов сервера:
echo.
powershell -Command "Get-Content server\logs\combined.log -Tail 5 | ForEach-Object { $line = $_; if ($line -match 'POST.*api/solve' -or $line -match 'Solving CAPTCHA' -or $line -match 'error' -or $line -match 'solved') { Write-Host $line -ForegroundColor Yellow } else { Write-Host $line } }"
echo.
echo Проверьте консоль браузера (F12) на наличие:
echo   - Сообщений "[CAPTCHA Solver]"
echo   - Запросов к http://localhost:3001/api/solve
echo.
echo Нажмите Ctrl+C для остановки
timeout /t 5 >nul
goto :monitor
