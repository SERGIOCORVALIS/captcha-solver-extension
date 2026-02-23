@echo off
echo ========================================
echo Testing CAPTCHA Solver API
echo ========================================
cd server
echo.
echo Running full API test suite...
node full-api-test.js
echo.
pause
