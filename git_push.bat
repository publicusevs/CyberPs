@echo off
echo ==========================================
echo    Professional Git Workflow Utility
echo ==========================================
echo.

:: Show current status first
echo Current Status:
git status -s
echo.

:: Get inputs from user
set /p branch="Step 1: Enter Target Branch Name (e.g. vsdevnew): "
set /p msg="Step 2: Enter Commit Message: "

echo.
echo ------------------------------------------
echo [1/3] Staging all changes...
git add .

echo.
echo [2/3] Executing Commit...
git commit -m "%msg%"

echo.
echo [3/3] Pushing to Origin/%branch%...
git push origin %branch%

echo.
echo ==========================================
echo    Process Successful!
echo ==========================================
echo.
pause
