@echo off
setlocal EnableDelayedExpansion
title CyberPS — Git Push Utility

cls
echo.
echo  ==========================================
echo    CyberPS  Git Push Utility
echo  ==========================================
echo.

:: Navigate to project root
cd /d "%~dp0"

:: Show current status
echo  Current Status:
echo  ------------------------------------------
git status -s
echo.

:: Auto-detect current branch
for /f "tokens=*" %%i in ('git rev-parse --abbrev-ref HEAD') do set current_branch=%%i
echo  Current Branch: %current_branch%
echo.

:: Get inputs
set /p branch="  Target Branch (default: %current_branch%): "
if "%branch%"=="" set branch=%current_branch%

set /p msg="  Commit Message: "
if "%msg%"=="" set msg=update

echo.
echo  ------------------------------------------
echo  [1/4] Staging all changes...
git add .

echo.
echo  [2/4] Committing...
git commit -m "%msg%"

echo.
echo  [3/4] Pulling latest from origin/%branch% (if exists)...
git pull origin %branch% --rebase --no-edit 2>nul
if %errorlevel% neq 0 (
    echo         No remote branch yet or rebase conflict — will force push.
    set FORCE=--force
) else (
    set FORCE=
)

echo.
echo  [4/4] Pushing to origin/%branch%...
git push origin HEAD:%branch% %FORCE%

if %errorlevel% equ 0 (
    echo.
    echo  ==========================================
    echo    Push Successful!
    echo  ==========================================
) else (
    echo.
    echo  ==========================================
    echo    Push Failed — check errors above.
    echo  ==========================================
)

echo.
pause
