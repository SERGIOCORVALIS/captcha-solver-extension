@echo off
REM CAPTCHA Solver Extension - Simple Rebuild Script
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

cd /d "%~dp0"

echo ========================================
echo   CAPTCHA Solver Extension - Rebuild
echo ========================================
echo.

echo [INFO] Working directory: %CD%
echo.

echo [INFO] Cleaning dist directory...
if exist "dist" (
    rmdir /s /q dist
)
echo.

echo [INFO] Building project...
call npm run build

echo.
echo ========================================
if %ERRORLEVEL% EQU 0 (
    echo   Build completed successfully!
    echo ========================================
    echo.
    echo [INFO] Extension files are in: dist\
) else (
    echo   Build failed with errors!
    echo ========================================
    echo.
    echo [ERROR] Check the error messages above
)

echo.
pause
