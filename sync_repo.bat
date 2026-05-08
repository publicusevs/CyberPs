@echo off
echo ==========================================
echo    CyberPS - Git Safe Sync Utility
echo ==========================================
echo.

echo [1/3] Stashing local changes...
git stash save "Auto-stash before sync: %date% %time%"

echo.
echo [2/3] Pulling latest changes from remote (origin main)...
git pull origin main

echo.
echo [3/3] Re-applying your local changes...
git stash pop

echo.
echo ==========================================
echo    Sync process complete!
echo ==========================================
echo.
echo IMPORTANT: If you see "CONFLICT" above, please open the affected files in VS Code to resolve them.
echo.
pause
