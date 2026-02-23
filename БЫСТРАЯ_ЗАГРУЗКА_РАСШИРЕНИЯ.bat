@echo off
chcp 65001 >nul
REM Быстрая загрузка расширения в Chrome
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   ЗАГРУЗКА РАСШИРЕНИЯ В CHROME
echo ========================================
echo.

echo [1] Проверка файлов...
echo.

if not exist "dist\manifest.json" (
    echo [ОШИБКА] Файл dist\manifest.json не найден!
    echo Пересобираю расширение...
    call npm run build
    if %errorlevel% neq 0 (
        echo [ОШИБКА] Сборка не удалась!
        pause
        exit /b 1
    )
)

if not exist "dist\background\service-worker.js" (
    echo [ОШИБКА] Файл service-worker.js не найден!
    echo Пересобираю расширение...
    call npm run build
    if %errorlevel% neq 0 (
        echo [ОШИБКА] Сборка не удалась!
        pause
        exit /b 1
    )
)

echo [OK] Все файлы на месте
echo.

echo ========================================
echo   ИНСТРУКЦИЯ ПО ЗАГРУЗКЕ
echo ========================================
echo.
echo 1. Откройте Chrome
echo 2. Перейдите на: chrome://extensions/
echo 3. Включите "Режим разработчика" (Developer mode)
echo    ^(переключатель в правом верхнем углу^)
echo 4. Нажмите "Загрузить распакованное расширение"
echo    ^(Load unpacked^)
echo 5. Выберите папку: dist
echo    ^(НЕ папку src или корневую папку!^)
echo.
echo ========================================
echo   ПУТЬ К ПАПКЕ DIST
echo ========================================
echo.
echo %CD%\dist
echo.
echo Скопируйте этот путь и вставьте в диалог выбора папки
echo.
echo ========================================
echo.
echo Нажмите любую клавишу, чтобы открыть папку dist...
pause >nul

explorer dist

echo.
echo ========================================
echo   ЧТО ДЕЛАТЬ ДАЛЬШЕ
echo ========================================
echo.
echo После загрузки расширения:
echo.
echo 1. Проверьте, что расширение видно в списке
echo 2. Убедитесь, что переключатель ВКЛЮЧЕН (синий)
echo 3. Если есть ошибки, нажмите "Service Worker" для просмотра
echo 4. Настройте расширение: правый клик на иконке ^> Options
echo.
echo ========================================
echo.
pause
