@echo off
echo ==========================================
echo    CyberPS - Git Resolve and Sync
echo ==========================================
echo.

echo [1/4] Deleting conflicted lock files...
if exist backend\package-lock.json del /f /q backend\package-lock.json
if exist frontend\package-lock.json del /f /q frontend\package-lock.json

echo.
echo [2/4] Marking all files as resolved...
git add .

echo.
echo [3/4] Finishing the merge...
git commit -m "Resolved conflicts and synchronized with origin main"

echo.
echo [4/4] Final pull to ensure latest state...
git pull origin main

echo.
echo ==========================================
echo    Process complete!
echo ==========================================
pause
