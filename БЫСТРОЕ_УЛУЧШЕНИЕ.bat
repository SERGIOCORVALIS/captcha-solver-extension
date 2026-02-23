@echo off
chcp 65001 >nul
REM Быстрое улучшение решения графических CAPTCHA
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   УЛУЧШЕНИЕ РЕШЕНИЯ ГРАФИЧЕСКИХ CAPTCHA
echo ========================================
echo.

echo [1] Пересборка сервера...
cd server
call npm run build
if %errorlevel% neq 0 (
    echo [ОШИБКА] Сборка не удалась!
    pause
    exit /b 1
)
echo [OK] Сервер пересобран
cd ..

echo.
echo ========================================
echo   ЧТО БЫЛО УЛУЧШЕНО:
echo ========================================
echo.
echo 1. Увеличено время ожидания токена после решения
echo    - Было: 3-5 секунд
echo    - Стало: 20-40 секунд с проверкой каждые 2 секунды
echo.
echo 2. Улучшено извлечение токена
echo    - Проверка всех источников: callback, textarea, grecaptcha
echo    - Проверка всех widget ID
echo    - Детальное логирование
echo.
echo 3. Упрощена обработка без ML
echo    - Попытка кликнуть на verify button
echo    - Активное ожидание токена (40 секунд)
echo.
echo 4. Добавлена финальная проверка токена
echo    - Дополнительное ожидание 3 секунды
echo    - Финальная проверка всех источников
echo.
echo ========================================
echo   ЧТО ДЕЛАТЬ ДАЛЬШЕ:
echo ========================================
echo.
echo 1. Перезапустите сервер:
echo    cd server
echo    npm start
echo.
echo    Или используйте: START_SERVER.bat
echo.
echo 2. Протестируйте на странице с графической CAPTCHA:
echo    https://www.google.com/recaptcha/api2/demo
echo.
echo 3. Проверьте логи сервера:
echo    server\logs\combined.log
echo.
echo    Должны появиться сообщения:
echo    - "Image challenge solved successfully"
echo    - "Token found after solving challenge"
echo    - "reCAPTCHA solved successfully"
echo.
echo ========================================
echo.
pause
