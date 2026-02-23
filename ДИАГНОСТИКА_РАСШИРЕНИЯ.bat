@echo off
chcp 65001 >nul
REM Диагностика проблемы с загрузкой расширения
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   ДИАГНОСТИКА РАСШИРЕНИЯ
echo ========================================
echo.

echo [1] Проверка структуры файлов...
echo.

if not exist "dist\manifest.json" (
    echo [ОШИБКА] Файл dist\manifest.json не найден!
    echo Необходимо пересобрать расширение: npm run build
    pause
    exit /b 1
) else (
    echo [OK] manifest.json найден
)

if not exist "dist\background\service-worker.js" (
    echo [ОШИБКА] Файл dist\background\service-worker.js не найден!
    pause
    exit /b 1
) else (
    echo [OK] service-worker.js найден
)

if not exist "dist\content\content-script.js" (
    echo [ОШИБКА] Файл dist\content\content-script.js не найден!
    pause
    exit /b 1
) else (
    echo [OK] content-script.js найден
)

if not exist "dist\icons\icon128.png" (
    echo [ОШИБКА] Файл dist\icons\icon128.png не найден!
    pause
    exit /b 1
) else (
    echo [OK] Иконки найдены
)

echo.
echo [2] Проверка размера файлов...
echo.

for %%F in (dist\background\service-worker.js) do (
    if %%~zF LSS 100 (
        echo [ПРЕДУПРЕЖДЕНИЕ] service-worker.js слишком маленький (%%~zF байт)
    ) else (
        echo [OK] service-worker.js: %%~zF байт
    )
)

for %%F in (dist\content\content-script.js) do (
    if %%~zF LSS 100 (
        echo [ПРЕДУПРЕЖДЕНИЕ] content-script.js слишком маленький (%%~zF байт)
    ) else (
        echo [OK] content-script.js: %%~zF байт
    )
)

echo.
echo [3] Проверка manifest.json...
echo.

findstr /C:"service_worker" dist\manifest.json >nul
if %errorlevel% neq 0 (
    echo [ОШИБКА] service_worker не найден в manifest.json!
) else (
    echo [OK] service_worker указан в manifest.json
)

findstr /C:"manifest_version" dist\manifest.json >nul
if %errorlevel% neq 0 (
    echo [ОШИБКА] manifest_version не найден в manifest.json!
) else (
    echo [OK] manifest_version указан в manifest.json
)

echo.
echo [4] Проверка синтаксиса service-worker.js...
echo.

node -c dist\background\service-worker.js 2>nul
if %errorlevel% neq 0 (
    echo [ОШИБКА] Синтаксическая ошибка в service-worker.js!
    echo Проверьте файл вручную или пересоберите: npm run build
) else (
    echo [OK] Синтаксис service-worker.js корректен
)

echo.
echo [5] Проверка синтаксиса content-script.js...
echo.

node -c dist\content\content-script.js 2>nul
if %errorlevel% neq 0 (
    echo [ОШИБКА] Синтаксическая ошибка в content-script.js!
    echo Проверьте файл вручную или пересоберите: npm run build
) else (
    echo [OK] Синтаксис content-script.js корректен
)

echo.
echo ========================================
echo   ИНСТРУКЦИИ ПО ЗАГРУЗКЕ
echo ========================================
echo.
echo 1. Откройте Chrome и перейдите на:
echo    chrome://extensions/
echo.
echo 2. Включите "Режим разработчика" (Developer mode)
echo    (переключатель в правом верхнем углу)
echo.
echo 3. Нажмите "Загрузить распакованное расширение"
echo    (Load unpacked)
echo.
echo 4. Выберите папку: dist
echo    (НЕ папку src или корневую папку проекта!)
echo.
echo 5. Если появится ошибка, проверьте:
echo    - Консоль расширения (chrome://extensions/ ^> Service Worker)
echo    - Ошибки в консоли браузера (F12)
echo.
echo ========================================
echo.
pause
