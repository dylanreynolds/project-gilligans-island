@echo off
title OffboardIQ — MCP Mock Server
color 0A
cd /d "%~dp0"

:: ── Check build exists ────────────────────────────────────────
if not exist "dist\server.js" (
    echo.
    echo  ERROR: Project has not been built yet.
    echo  Please run SETUP.bat first.
    echo.
    pause
    exit /b 1
)

echo.
echo  =============================================================
echo   OffboardIQ  ^|  Starting MCP Mock Server
echo  =============================================================
echo.
echo   Dashboard URL :  http://localhost:3000
echo   API Base URL  :  http://localhost:3000/api
echo   Port          :  3000
echo.
echo   Close this window to stop the server.
echo  =============================================================
echo.

:: ── Open dashboard in default browser after 2 seconds ─────────
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

:: ── Start server (foreground so window stays open) ────────────
node dist\server.js

echo.
echo  Server stopped.
pause
