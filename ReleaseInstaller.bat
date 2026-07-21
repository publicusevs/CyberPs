@echo off
setlocal EnableDelayedExpansion
title CyberPS - Enterprise Release & Package System
cls

echo.
echo  ======================================================================
echo    CyberPS Investigation Hunter  -  Enterprise Release Pipeline
echo  ======================================================================
echo.

cd /d "%~dp0"

:: ─── RESOLVE VERSION FROM VERSION.JSON ─────────────────────────────────
if not exist "version.json" (
    echo  [ERROR] version.json is missing in root directory!
    goto :FAIL
)

:: Read version and repo properties using PowerShell
for /f "usebackq tokens=*" %%i in (`powershell -Command "(Get-Content version.json | ConvertFrom-Json).version"`) do set APP_VERSION=%%i
for /f "usebackq tokens=*" %%i in (`powershell -Command "(Get-Content version.json | ConvertFrom-Json).github_owner"`) do set GITHUB_OWNER=%%i
for /f "usebackq tokens=*" %%i in (`powershell -Command "(Get-Content version.json | ConvertFrom-Json).github_repo"`) do set GITHUB_REPO=%%i

echo  Target Version : !APP_VERSION!
echo  GitHub Owner   : !GITHUB_OWNER!
echo  GitHub Repo    : !GITHUB_REPO!
echo.

:: ─── CLEAN OLD BUILD ──────────────────────────────────────────────────
echo  [1/8] Cleaning previous build outputs...
if exist "dist_build" rd /s /q "dist_build"
if exist "dist_installer" rd /s /q "dist_installer"
if exist "CyberPS_Release" rd /s /q "CyberPS_Release"
echo         Cleanup completed.
echo.

:: ─── CREATE OUTPUT DIRS ───────────────────────────────────────────────
mkdir "dist_build"
mkdir "dist_build\backend"
mkdir "dist_build\frontend\dist"
mkdir "dist_build\ramail"
mkdir "dist_installer"
mkdir "CyberPS_Release"

:: ─── STEP 1: React Frontend Build ─────────────────────────────────────
echo  ======================================================================
echo  [STEP 2/8] Building React Frontend...
echo  ======================================================================
cd frontend
call npm install
if %errorlevel% neq 0 ( echo [ERROR] Frontend npm install failed. & goto :FAIL )
call npm run build
if %errorlevel% neq 0 ( echo [ERROR] Frontend build failed. & goto :FAIL )
cd ..
xcopy "frontend\dist" "dist_build\frontend\dist" /e /h /y /q >nul
echo  [OK] Frontend built and staged.
echo.

:: ─── STEP 2: Package Node.js Backend ──────────────────────────────────
echo  ======================================================================
echo  [STEP 3/8] Packaging Node.js Backend with pkg...
echo  ======================================================================
cd backend
call npm install
if %errorlevel% neq 0 ( echo [ERROR] Backend npm install failed. & goto :FAIL )
call npx pkg app.js --targets node18-win-x64 --output ..\dist_build\backend\backend.exe
if %errorlevel% neq 0 ( echo [ERROR] Backend compilation failed. & goto :FAIL )

if exist "eng.traineddata" copy "eng.traineddata" "..\dist_build\backend\eng.traineddata" /y >nul
if exist "hin.traineddata" copy "hin.traineddata" "..\dist_build\backend\hin.traineddata" /y >nul
if exist "seed_data.json" copy "seed_data.json" "..\dist_build\backend\seed_data.json" /y >nul
cd ..
echo  [OK] Backend compiled successfully.
echo.

:: ─── STEP 3: Python Services & Utilities ──────────────────────────────
echo  ======================================================================
echo  [STEP 4/8] Packaging Python Services...
echo  ======================================================================
set PYTHON_EXE=C:\Users\HP\AppData\Local\Programs\Python\Python314\python.exe

:: Build Ramail EXE
cd ramail
"%PYTHON_EXE%" -m pip install -r requirements.txt -q
"%PYTHON_EXE%" -m pip install pyinstaller -q
pyinstaller ramail.spec --noconfirm --distpath "..\dist_build\ramail" --workpath "..\dist_build\ramail_work"
if %errorlevel% neq 0 ( echo [ERROR] PyInstaller Ramail build failed. & goto :FAIL )
cd ..

:: Build Updater EXE
pyinstaller updater.spec --noconfirm --distpath "dist_build" --workpath "dist_build\updater_work"
if %errorlevel% neq 0 ( echo [ERROR] PyInstaller Updater build failed. & goto :FAIL )

:: Build FIR Extractor EXE
pyinstaller fir_extractor.spec --noconfirm --distpath "dist_build\scripts" --workpath "dist_build\fir_extractor_work"
if %errorlevel% neq 0 ( echo [ERROR] PyInstaller FIR Extractor build failed. & goto :FAIL )

:: Build Launcher CyberPS EXE
pyinstaller --onefile installer\launcher.py ^
    --name CyberPS ^
    --noconfirm ^
    --clean ^
    --distpath dist_build ^
    --workpath dist_build\launcher_work ^
    --icon installer\icon.ico ^
    --hidden-import=urllib.request ^
    --hidden-import=ctypes ^
    --hidden-import=pathlib
if %errorlevel% neq 0 ( echo [ERROR] Launcher compilation failed. & goto :FAIL )

echo  [OK] Launcher, Ramail and Updater binaries compiled.
echo.

:: ─── STEP 4: Build Inno Setup Setup ───────────────────────────────────
echo  ======================================================================
echo  [STEP 5/8] Compiling Installer via Inno Setup ISCC...
echo  ======================================================================

:: Find ISCC path
set ISCC=
if exist "%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe" set "ISCC=%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe"
if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" set "ISCC=C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if exist "C:\Program Files\Inno Setup 6\ISCC.exe" set "ISCC=C:\Program Files\Inno Setup 6\ISCC.exe"

if not defined ISCC (
    echo  [ERROR] Inno Setup compiler (ISCC.exe) was not found!
    goto :FAIL
)

echo  Found ISCC at: "!ISCC!"
"!ISCC!" "installer\cyberps_installer.iss"
if %errorlevel% neq 0 ( echo [ERROR] Inno Setup compilation failed. & goto :FAIL )
echo.

:: ─── STEP 5: Verification & Integrity Checksums ──────────────────────
echo  ======================================================================
echo  [STEP 6/8] Generating Checksums & Manifest...
echo  ======================================================================
set SETUP_EXE=CyberPS_Setup_v!APP_VERSION!.exe
if not exist "dist_installer\!SETUP_EXE!" goto :NO_SETUP
goto :SETUP_OK

:NO_SETUP
echo  [ERROR] Setup file missing in dist_installer.
goto :FAIL

:SETUP_OK

:: Calculate SHA256 checksum and generate update_manifest.json using PowerShell helper script
powershell -NoProfile -ExecutionPolicy Bypass -File "installer\generate_manifest.ps1" "!SETUP_EXE!" "!APP_VERSION!" "!GITHUB_OWNER!" "!GITHUB_REPO!"
if %errorlevel% neq 0 ( echo [ERROR] Manifest generation failed. & goto :FAIL )

echo  [OK] Release outputs copied to CyberPS_Release/
echo.

:: ─── STEP 7: Compilation Summary ──────────────────────────────────────
echo  ======================================================================
echo  [STEP 8/8] Build Summary
echo  ======================================================================
echo.
echo   Build status      : SUCCESS
echo   Release Version   : !APP_VERSION!
echo   Setup Installer   : CyberPS_Release\!SETUP_EXE!
echo   Update Manifest   : CyberPS_Release\update_manifest.json
echo   Checksum File     : CyberPS_Release\SHA256SUMS
echo.
echo  ======================================================================
exit /b 0

:FAIL
echo.
echo  ======================================================================
echo   [FAILED] Build failed. Review error codes above.
echo  ======================================================================
echo.
exit /b 1
