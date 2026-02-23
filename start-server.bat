@echo off
echo ========================================
echo Starting CAPTCHA Solver Server
echo ========================================
cd server
echo.
echo Building server...
call npm run build
echo.
echo Starting server...
call npm start
pause
