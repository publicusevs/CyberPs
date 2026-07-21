@echo off
setlocal EnableDelayedExpansion
title CyberPS - Smart Git Sync & Push Utility
color 0B

:: Navigate to project root
cd /d "%~dp0"

cls
echo ============================================================
echo   CyberPS - Smart Git Sync, Branch Creator ^& Push Utility
echo ============================================================
echo.

:: Detect current branch
for /f "tokens=*" %%i in ('git rev-parse --abbrev-ref HEAD') do set current_branch=%%i
echo Current Branch: %current_branch%
echo.

:: Step 1: Pull & Sync with remote main
echo [1/5] Syncing with remote main...
echo Do you want to pull latest changes from main? (Y/N)
set /p pull_confirm="Select: "
if /i "%pull_confirm%"=="Y" (
    echo.
    echo Stashing local changes...
    git stash save "Auto-stash before sync: %date% %time%" >nul 2>&1
    
    echo Pulling latest from origin main...
    git pull origin main >temp_pull.log 2>&1
    type temp_pull.log
    
    findstr /C:"CONFLICT" temp_pull.log >nul
    if !errorlevel! equ 0 (
        echo.
        echo ============================================================
        echo [WARNING] CONFLICTS DETECTED DURING PULL!
        echo Please resolve conflicts in your editor (VS Code, etc.)
        echo files with conflicts:
        git diff --name-only --diff-filter=U
        echo ============================================================
        del temp_pull.log >nul 2>&1
        echo Resolve conflicts, save files, and press any key to continue.
        pause
    ) else (
        del temp_pull.log >nul 2>&1
    )
    
    echo Re-applying your local changes...
    git stash pop >temp_stash_pop.log 2>&1
    type temp_stash_pop.log
    
    findstr /C:"CONFLICT" temp_stash_pop.log >nul
    if !errorlevel! equ 0 (
        echo.
        echo ============================================================
        echo [WARNING] CONFLICTS DETECTED DURING MERGE!
        echo Please resolve conflicts in your editor (VS Code, etc.)
        echo files with conflicts:
        git diff --name-only --diff-filter=U
        echo ============================================================
        del temp_stash_pop.log >nul 2>&1
        echo Resolve conflicts, save files, and press any key to continue.
        pause
    ) else (
        del temp_stash_pop.log >nul 2>&1
    )
)

echo.
:: Step 2: Ask for new branch creation
echo [2/5] Branch Management...
echo Do you want to create a new branch or use an existing one?
set /p new_branch_name="Enter branch name (or press Enter to stay on '%current_branch%'): "

if "%new_branch_name%"=="" (
    set target_branch=%current_branch%
    echo Using current branch: %target_branch%
) else (
    :: Replace spaces with hyphens
    set target_branch=%new_branch_name: =-%
    
    :: Check if branch already exists locally
    git show-ref --verify --quiet refs/heads/!target_branch!
    if !errorlevel! equ 0 (
        echo Branch '!target_branch!' already exists. Switching to it...
        git checkout !target_branch!
    ) else (
        echo Creating and switching to new branch '!target_branch!'...
        git checkout -b !target_branch!
    )
)

echo.
:: Step 3: Ask for commit message
echo [3/5] Commit Configuration...
set /p msg="Enter commit message (default: Update code): "
if "%msg%"=="" set msg=Update code

echo.
:: Step 4: Stage & Commit
echo [4/5] Staging and Committing...
:: Clean tracked ignored files (just in case they got tracked)
echo Removing accidentally tracked ignored files from cache (if any)...
git rm -r --cached . >nul 2>&1

echo Staging files...
git add .

echo Committing...
git commit -m "%msg%"

echo.
:: Step 5: Push to remote
echo [5/5] Pushing to origin/!target_branch!...
git push -u origin !target_branch!

if %errorlevel% equ 0 (
    echo.
    echo ============================================================
    echo   SUCCESS: Code pushed successfully to '!target_branch!'!
    echo ============================================================
) else (
    echo.
    echo ============================================================
    echo   ERROR: Push failed! Check the output above.
    echo   If it says 'Large files detected', make sure you did not commit
    echo   large executables, zip files, or installers.
    echo ============================================================
)

echo.
pause
