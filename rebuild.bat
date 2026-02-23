@echo off
REM CAPTCHA Solver Extension - Rebuild Script
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

setlocal enabledelayedexpansion

REM Change to script directory
cd /d "%~dp0"

REM Set error handling
set "ERROR_OCCURRED=0"

REM Show current directory
echo [INFO] Working directory: %CD%
echo.

echo ========================================
echo   CAPTCHA Solver Extension - Rebuild
echo   Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH
echo ========================================
echo.

REM Check if Node.js is installed
echo [INFO] Checking Node.js installation...
call node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo.
    set "ERROR_OCCURRED=1"
    goto :end
)

echo [INFO] Node.js version:
call node --version
echo.

REM Check if npm is installed
echo [INFO] Checking npm installation...
call npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed or not in PATH
    echo.
    set "ERROR_OCCURRED=1"
    goto :end
)

echo [INFO] npm version:
call npm --version
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies
        echo.
        set "ERROR_OCCURRED=1"
        goto :end
    )
    echo [INFO] Dependencies installed successfully
    echo.
) else (
    echo [INFO] node_modules directory exists, skipping installation
    echo.
)

REM Clean dist directory
echo [INFO] Cleaning dist directory...
if exist "dist" (
    rmdir /s /q dist 2>nul
    echo [INFO] dist directory cleaned
) else (
    echo [INFO] dist directory does not exist
)
echo.

REM Build project
echo [INFO] Building project...
echo.
call npm run build
if errorlevel 1 (
    echo.
    echo [ERROR] Build failed!
    echo.
    set "ERROR_OCCURRED=1"
    goto :end
)

echo [INFO] Build completed successfully
echo.

:end
echo.
if "!ERROR_OCCURRED!"=="1" (
    echo ========================================
    echo   Build failed with errors!
    echo ========================================
    echo.
    echo Please check the error messages above.
    echo.
) else (
    echo ========================================
    echo   Build completed successfully!
    echo ========================================
    echo.
    echo [INFO] Extension files are in: dist\
    echo [INFO] To load in Chrome:
    echo       1. Open chrome://extensions/
    echo       2. Enable "Developer mode"
    echo       3. Click "Load unpacked"
    echo       4. Select the "dist" folder
    echo.
)

echo.
echo Press any key to exit...
pause >nul
