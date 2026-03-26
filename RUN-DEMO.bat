@echo off
title OffboardIQ DEMO
color 0B
cd /d "%~dp0"

echo.
echo   OffboardIQ ^| DEMO
echo.
echo  ___   __  __ _                         _ ___ ___
echo  / _ \ / _^|/ _^| ^|__   ___   __ _ _ __ __^| ^|_ _/ _ \
echo ^| ^| ^| ^| ^|_^| ^|_^| '_ \ / _ \ / _` ^| '__/ _` ^|^| ^| ^| ^| ^|
echo ^| ^|_^| ^|  _^|  _^| ^|_) ^| (_) ^| (_^| ^| ^| ^| (_^| ^|^| ^| ^|_^| ^|
echo  \___/^|_^| ^|_^| ^|_.__/ \___/ \__,_^|_^|  \__,_^|___\__\_\
echo.

:: Check server is running
echo  Checking server connection...
curl -s http://localhost:3000/api/summary >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: Cannot reach the server at http://localhost:3000
    echo.
    echo  Please start the server first by running:
    echo    START-SERVER.bat
    echo.
    pause
    exit /b 1
)

:menu
echo.
echo  =============================================================
echo   OffboardIQ  ^|  Hackathon Demo Menu
echo  =============================================================
echo.
echo   Pick a demo scenario:
echo.
echo   [1]  Open dashboard in browser
echo   [2]  Reset all users to Active state
echo   [3]  Full E2E automated flow   (ServiceNow -^> Logic App -^> Azure -^> Closure)
echo   [0]  Exit
echo.
set /p CHOICE="  Enter choice: "
if "%CHOICE%"=="1" goto open_browser
if "%CHOICE%"=="2" goto reset
if "%CHOICE%"=="3" goto demo_e2e
if "%CHOICE%"=="0" exit /b 0
echo  Invalid choice.
goto menu

:open_browser
start http://localhost:3000/dashboard
goto menu_end

:demo_e2e
PowerShell -NoProfile -ExecutionPolicy Bypass -File "demo\full-offboard-flow.ps1"
goto menu_end

:reset
echo.
echo  Resetting all users to Active state...
curl -s -X POST http://localhost:3000/api/reset >nul
echo  Done -- all 25 users restored to Active.

:menu_end
echo.
pause
