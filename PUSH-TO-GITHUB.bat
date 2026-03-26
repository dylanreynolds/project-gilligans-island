@echo off
title OffboardIQ — Push to GitHub
cd /d "%~dp0"

echo.
echo  =============================================================
echo   OffboardIQ  ^|  Push to GitHub
echo   Repository: https://github.com/dylanreynolds/project-gilligans-island
echo  =============================================================
echo.
echo  Staging all files...
git add -A
echo.
echo  Current status:
git status --short
echo.
echo  Pushing to GitHub...
echo  (A browser login window may open — sign in with your GitHub account)
echo.
git push -u origin main
echo.
if %errorlevel% equ 0 (
    echo  =============================================================
    echo   SUCCESS! Code is now on GitHub.
    echo   https://github.com/dylanreynolds/project-gilligans-island
    echo  =============================================================
) else (
    echo  =============================================================
    echo   PUSH FAILED. Common fixes:
    echo.
    echo   1. Make sure you are logged into GitHub in your browser
    echo   2. If prompted for credentials:
    echo        Username: dylanreynolds
    echo        Password: your GitHub Personal Access Token (not password)
    echo      Create a token at: https://github.com/settings/tokens/new
    echo      (tick 'repo' scope, then copy the token as your password)
    echo.
    echo   3. Or run: git credential-manager github login
    echo  =============================================================
)
echo.
pause
