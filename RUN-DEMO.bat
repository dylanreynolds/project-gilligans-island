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
echo   [1]  Standard Resignation       (pick from any active user)
echo   [2]  Executive / Admin           (Director, VP, Manager or Admin roles)
echo   [3]  Contract End                (Sales / Marketing / Legal / Finance users)
echo   [4]  Resignation + Teams error   (Teams API throttle simulation)
echo   [5]  Enter user manually         (type full name + reason)
echo   [6]  Open dashboard in browser
echo   [7]  Reset all users to Active state
echo   [0]  Exit
echo.
set /p CHOICE="  Enter choice [0-7]: "

if "%CHOICE%"=="1" goto demo_resignation
if "%CHOICE%"=="2" goto demo_admin
if "%CHOICE%"=="3" goto demo_contractor
if "%CHOICE%"=="4" goto demo_error
if "%CHOICE%"=="5" goto demo_custom
if "%CHOICE%"=="6" goto open_browser
if "%CHOICE%"=="7" goto reset
if "%CHOICE%"=="0" exit /b 0
echo  Invalid choice.
goto menu

:demo_resignation
PowerShell -NoProfile -ExecutionPolicy Bypass -File "demo\offboarding-demo.ps1" -FilterBy "standard" -Reason "Resignation"
goto menu_end

:demo_admin
PowerShell -NoProfile -ExecutionPolicy Bypass -File "demo\offboarding-demo.ps1" -FilterBy "admin" -Reason "Termination"
goto menu_end

:demo_contractor
PowerShell -NoProfile -ExecutionPolicy Bypass -File "demo\offboarding-demo.ps1" -FilterBy "contractor" -Reason "Contract End"
goto menu_end

:demo_error
PowerShell -NoProfile -ExecutionPolicy Bypass -File "demo\offboarding-demo.ps1" -FilterBy "standard" -Reason "Resignation" -SimulateError
goto menu_end

:demo_custom
set /p CUSTOM_NAME="  Enter the full name of the user to offboard: "
set /p CUSTOM_REASON="  Enter reason (Resignation / Termination / Retirement / Contract End): "
PowerShell -NoProfile -ExecutionPolicy Bypass -File "demo\offboarding-demo.ps1" -UserName "%CUSTOM_NAME%" -Reason "%CUSTOM_REASON%"
goto menu_end

:open_browser
start http://localhost:3000/dashboard
goto menu_end

:reset
echo.
echo  Resetting all users to Active state...
curl -s -X POST http://localhost:3000/api/reset >nul
echo  Done -- all 25 users restored to Active.

:menu_end
echo.
pause
