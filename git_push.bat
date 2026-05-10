@echo off
echo ==========================================
echo    Professional Git Workflow Utility
echo ==========================================
echo.

:: Show current status first
echo Current Status:
git status -s
echo.

:: Auto-detect current branch
for /f "tokens=*" %%i in ('git rev-parse --abbrev-ref HEAD') do set current_branch=%%i

echo Current Branch: %current_branch%
git status -s
echo.

:: Get inputs from user
set /p branch="Step 1: Enter Target Remote Branch (Default: %current_branch%): "
if "%branch%"=="" set branch=%current_branch%

set /p msg="Step 2: Enter Commit Message: "

echo.
echo ------------------------------------------
echo [1/3] Staging all changes...
git add .

echo.
echo [2/3] Executing Commit...
git commit -m "%msg%"

echo.
<<<<<<< Updated upstream
echo [Step 2.2] Switching to branch %branch%...
git checkout %branch% 2>nul || git checkout -b %branch%

echo.
echo [Step 2.5] Updating from main branch to sync code...
git pull origin main --no-edit
=======
echo [Bonus] Updating from main branch to prevent conflicts...
git pull origin main
>>>>>>> Stashed changes

echo.
echo [3/3] Pushing Current Code to Origin/%branch%...
git push origin %branch%

echo.
echo ==========================================
echo    Process Successful!
echo ==========================================
echo.
pause
