@echo off
title OffboardIQ — First-Time Setup
color 0B
echo.
echo  =============================================================
echo   OffboardIQ  ^|  Enterprise Offboarding MCP Mock Server
echo   First-Time Setup Script
echo  =============================================================
echo.

:: ── Check Node.js ────────────────────────────────────────────
echo  [1/4] Checking Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: Node.js is not installed or not on your PATH.
    echo.
    echo  Please install Node.js v18 or higher from:
    echo    https://nodejs.org/en/download
    echo.
    echo  After installing, re-run this setup script.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo  OK  Node.js %NODE_VER% found.

:: ── Check npm ─────────────────────────────────────────────────
echo.
echo  [2/4] Checking npm...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: npm not found. Reinstall Node.js from https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('npm --version') do set NPM_VER=%%v
echo  OK  npm %NPM_VER% found.

:: ── Install dependencies ──────────────────────────────────────
echo.
echo  [3/4] Installing dependencies (this may take 1-2 minutes)...
cd /d "%~dp0"
call npm install
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: npm install failed. Check your internet connection.
    pause
    exit /b 1
)
echo  OK  Dependencies installed.

:: ── Build TypeScript ──────────────────────────────────────────
echo.
echo  [4/4] Building project...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: Build failed. See errors above.
    pause
    exit /b 1
)
echo  OK  Build complete.

:: ── Done ──────────────────────────────────────────────────────
echo.
echo  =============================================================
echo   SETUP COMPLETE!
echo  =============================================================
echo.
echo   Next steps:
echo     1. Double-click  START-SERVER.bat  to start the mock server
echo     2. Open your browser to  http://localhost:3000
echo     3. Double-click  RUN-DEMO.bat  to run the demo script
echo.
echo   For full instructions see:  docs\GETTING-STARTED.md
echo.
pause
