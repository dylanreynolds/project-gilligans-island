@echo off
title OffboardIQ — Reset Demo State
color 0C
cd /d "%~dp0"
echo.
echo  =============================================================
echo   OffboardIQ  ^|  Reset Demo State
echo  =============================================================
echo.
echo  This will restore ALL 25 users back to Active status.
echo  All offboarding progress and audit logs will be cleared.
echo.
set /p CONFIRM="  Are you sure? Type YES to confirm: "
if /i "%CONFIRM%" neq "YES" (
    echo  Cancelled.
    pause
    exit /b 0
)
echo.
echo  Resetting...
curl -s -X POST http://localhost:3000/api/reset
echo.
echo  Done! All 25 users are now Active.
echo  Refresh the dashboard at http://localhost:3000
echo.
pause
