@echo off
title OffboardIQ — Run Demo
color 0E
cd /d "%~dp0"

:: ── Check server is running ───────────────────────────────────
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

echo.
echo  =============================================================
echo   OffboardIQ  ^|  Hackathon Demo Menu
echo  =============================================================
echo.
echo   Pick a demo scenario:
echo.
echo   [1]  Offboard Adele Vance              (standard resignation)
echo   [2]  Offboard Isaiah Langer            (admin user - has Global Admin role)
echo   [3]  Offboard Joni Sherman             (Legal dept user - New York)
echo   [4]  Offboard Megan Bowen              (with Teams API error simulation)
echo   [5]  Offboard a CUSTOM user            (type your own name)
echo   [6]  Open dashboard in browser
echo   [7]  Reset all users to Active state
echo   [0]  Exit
echo.
set /p CHOICE="  Enter choice [0-7]: "

if "%CHOICE%"=="1" goto demo_adele
if "%CHOICE%"=="2" goto demo_isaiah
if "%CHOICE%"=="3" goto demo_joni
if "%CHOICE%"=="4" goto demo_megan_error
if "%CHOICE%"=="5" goto demo_custom
if "%CHOICE%"=="6" goto open_browser
if "%CHOICE%"=="7" goto reset
if "%CHOICE%"=="0" exit /b 0
echo  Invalid choice. && goto menu_end

:demo_adele
PowerShell -NoProfile -ExecutionPolicy Bypass -File "demo\offboarding-demo.ps1" -UserName "Adele Vance" -Reason "Resignation"
goto menu_end

:demo_isaiah
PowerShell -NoProfile -ExecutionPolicy Bypass -File "demo\offboarding-demo.ps1" -UserName "Isaiah Langer" -Reason "Termination"
goto menu_end

:demo_joni
PowerShell -NoProfile -ExecutionPolicy Bypass -File "demo\offboarding-demo.ps1" -UserName "Joni Sherman" -Reason "Contract End"
goto menu_end

:demo_megan_error
PowerShell -NoProfile -ExecutionPolicy Bypass -File "demo\offboarding-demo.ps1" -UserName "Megan Bowen" -Reason "Resignation" -SimulateError
goto menu_end

:demo_custom
set /p CUSTOM_NAME="  Enter the full name of the user to offboard: "
set /p CUSTOM_REASON="  Enter reason (Resignation / Termination / Retirement / Contract End): "
PowerShell -NoProfile -ExecutionPolicy Bypass -File "demo\offboarding-demo.ps1" -UserName "%CUSTOM_NAME%" -Reason "%CUSTOM_REASON%"
goto menu_end

:open_browser
start http://localhost:3000
goto menu_end

:reset
echo.
echo  Resetting all users to Active state...
curl -s -X POST http://localhost:3000/api/reset >nul
echo  Done — all 25 users restored to Active.

:menu_end
echo.
pause
