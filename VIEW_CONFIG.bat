@echo off
REM View Configuration from config.xml
REM Copyright (c) 2024 PANKOV SERGEY VLADIMIROVICH. All rights reserved.

echo ========================================
echo   View Configuration
echo ========================================
echo.

if not exist "config.xml" (
    echo [ERROR] config.xml not found!
    pause
    exit /b 1
)

echo [INFO] Opening config.xml in default XML viewer...
echo.
echo Configuration file location: %CD%\config.xml
echo.

REM Try to open in default XML viewer
start "" "config.xml"

echo [INFO] If XML opened in browser without styles, this is normal.
echo        XML files are displayed as plain text in browsers.
echo.
echo To edit the configuration:
echo   1. Open config.xml in a text editor
echo   2. Make your changes
echo   3. Run APPLY_CONFIG.bat to apply changes
echo.
pause
