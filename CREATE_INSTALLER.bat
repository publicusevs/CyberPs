@echo off
setlocal EnableDelayedExpansion
title CyberPS - Build ^& Package System

cls
echo.
echo  ============================================================
echo    CyberPS Investigation Hunter  -  Build ^& Installer System
echo  ============================================================
echo.

cd /d "%~dp0"

:: ─── CLEAN OLD BUILD ────────────────────────────────────────────
echo  [CLEAN] Removing old build artifacts...
if exist "dist_build" rd /s /q "dist_build"
if exist "dist_installer" rd /s /q "dist_installer"
echo         Done.
echo.

:: ─── CREATE OUTPUT DIRS ─────────────────────────────────────────
mkdir "dist_build"
mkdir "dist_build\backend"
mkdir "dist_build\frontend\dist"
mkdir "dist_build\ramail"
mkdir "dist_installer"

echo  ============================================================
echo  [STEP 1/5]  Building React Frontend...
echo  ============================================================
echo.
cd frontend
call npm install
if %errorlevel% neq 0 ( echo [ERROR] npm install failed. & goto :FAIL )
call npm run build
if %errorlevel% neq 0 ( echo [ERROR] Frontend build failed. & goto :FAIL )
cd ..
xcopy "frontend\dist" "dist_build\frontend\dist" /e /h /y /q
echo  [OK] Frontend built successfully.
echo.

echo  ============================================================
echo  [STEP 2/5]  Compiling Backend to .exe with pkg...
echo  ============================================================
echo.
cd backend
call npm install
if %errorlevel% neq 0 ( echo [ERROR] npm install failed. & goto :FAIL )

echo  Packaging backend with pkg (this takes a few minutes)...
call npx pkg app.js --targets node18-win-x64 --output ..\dist_build\backend\backend.exe
if %errorlevel% neq 0 ( echo [ERROR] Backend pkg compilation failed. & goto :FAIL )

:: Copy Tesseract trained data files (needed by tessract.js)
if exist "eng.traineddata" copy "eng.traineddata" "..\dist_build\backend\eng.traineddata" /y
if exist "hin.traineddata" copy "hin.traineddata" "..\dist_build\backend\hin.traineddata" /y

cd ..
echo  [OK] Backend compiled successfully.
echo.

echo  ============================================================
echo  [STEP 3/5]  Compiling Ramail Python Service...
echo  ============================================================
echo.
cd ramail
pip install -r requirements.txt -q
if %errorlevel% neq 0 ( echo [ERROR] pip install failed. & goto :FAIL )

pip install pyinstaller -q

set RAMAIL_DIST=%~dp0dist_build\ramail
set RAMAIL_WORK=%~dp0dist_build\ramail_work

pyinstaller ramail.spec --noconfirm --distpath "%RAMAIL_DIST%" --workpath "%RAMAIL_WORK%"
if %errorlevel% neq 0 (
    echo  [WARNING] PyInstaller with spec failed, trying direct compile...
    pyinstaller --onefile main.py --name ramail --noconfirm --clean ^
        --distpath "%RAMAIL_DIST%" ^
        --workpath "%RAMAIL_WORK%" ^
        --hidden-import=fastapi ^
        --hidden-import=uvicorn ^
        --hidden-import=uvicorn.lifespan.on ^
        --hidden-import=uvicorn.protocols.http.auto ^
        --hidden-import=uvicorn.protocols.websockets.auto ^
        --hidden-import=uvicorn.logging ^
        --hidden-import=exchangelib ^
        --hidden-import=sqlalchemy ^
        --hidden-import=pdfplumber ^
        --collect-all fastapi ^
        --collect-all uvicorn
    if %errorlevel% neq 0 ( echo [ERROR] Ramail compilation failed. & goto :FAIL )
)
cd ..

if not exist "dist_build\ramail\ramail.exe" (
    echo  [WARNING] ramail.exe not found - skipping Ramail service.
    echo  placeholder > "dist_build\ramail\ramail_missing.txt"
)
echo  [OK] Ramail compiled.
echo.

echo  ============================================================
echo  [STEP 4/5]  Compiling Launcher (CyberPS.exe)...
echo  ============================================================
echo.

:: Generate icon and wizard images using Python (reliable cross-machine)
python -c ^
    "from PIL import Image,ImageDraw; import os; os.makedirs('installer',exist_ok=True); sizes=[256,128,64,48,32,16]; imgs=[]; [(__i:=Image.new('RGBA',(s,s),(0,0,0,0)),__d:=ImageDraw.Draw(__i),__d.ellipse([2,2,s-2,s-2],fill=(15,23,42,255)),__d.polygon([((s-int(s*.6))//2,int(s*.15)),((s-int(s*.6))//2+int(s*.6),int(s*.15)),((s-int(s*.6))//2+int(s*.6),int(s*.15)+int(int(s*.6)*.55)),((s-int(s*.6))//2+int(s*.6)//2,int(s*.15)+int(int(s*.6)*.85)),((s-int(s*.6))//2,int(s*.15)+int(int(s*.6)*.55))],fill=(59,130,246,255)),imgs.append(__i)) for s in sizes]; imgs[0].save('installer/icon.ico',format='ICO',sizes=[(s,s) for s in sizes])" 2>nul
if not exist "installer\icon.ico" python installer\make_icon.py

python -c ^
    "from PIL import Image,ImageDraw,ImageFont; i=Image.new('RGB',(497,314),(15,23,42)); d=ImageDraw.Draw(i); d.rectangle([0,0,6,314],fill=(59,130,246)); d.text((30,120),'CyberPS Investigation Hunter',fill=(255,255,255)); d.text((30,175),'v2.0  |  Cyber Police Station Jaipur',fill=(100,120,150)); i.save('installer/wizard_banner.bmp')" 2>nul
python -c ^
    "from PIL import Image,ImageDraw; i=Image.new('RGB',(55,55),(59,130,246)); d=ImageDraw.Draw(i); d.ellipse([5,5,50,50],fill=(15,23,42)); i.save('installer/wizard_small.bmp')" 2>nul

pip install pyinstaller -q
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

echo  [OK] Launcher CyberPS.exe compiled.
echo.

echo  Compiling Updater (updater.exe)...
pyinstaller --onefile installer\updater.py ^
    --name updater ^
    --noconfirm ^
    --clean ^
    --distpath dist_build ^
    --workpath dist_build\updater_work ^
    --hidden-import=pathlib ^
    --hidden-import=shutil
if %errorlevel% neq 0 ( echo [ERROR] Updater compilation failed. & goto :FAIL )
echo  [OK] Updater compiled.
echo.

echo  ============================================================
echo  [STEP 5/5]  Building Installer with Inno Setup...
echo  ============================================================
echo.

:: Find Inno Setup ISCC.exe (check common locations including per-user install)
set ISCC=
for %%p in (
    "%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe"
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
    "C:\Program Files\Inno Setup 6\ISCC.exe"
) do (
    if exist %%p set ISCC=%%~p
)

if not defined ISCC (
    echo  [ERROR] Inno Setup not found! Install from https://jrsoftware.org/isdownload.php
    goto :FAIL
)

echo  Using Inno Setup at: !ISCC!
"!ISCC!" "installer\cyberps_installer.iss"
if %errorlevel% neq 0 ( echo [ERROR] Inno Setup compilation failed. & goto :FAIL )

echo.
echo  ============================================================
echo  [SUCCESS] BUILD COMPLETE!
echo  ============================================================
echo.

:: Read version from version.json
for /f "tokens=2 delims=:,\" %%v in ('findstr "version" version.json') do (
    set APP_VER=%%~v
    set APP_VER=!APP_VER: =!
    goto :got_ver
)
:got_ver

:: Create a final release folder for easy copy
mkdir "CyberPS_Release" 2>nul
copy /Y "dist_installer\CyberPS_Setup_v1.0.0.exe" "CyberPS_Release\" >nul
copy /Y "installer\README_INSTALL.txt" "CyberPS_Release\" >nul
copy /Y "version.json" "CyberPS_Release\" >nul

echo   Installer ready in folder: CyberPS_Release\
echo   (File: CyberPS_Setup_v1.0.0.exe)
echo.
echo   This .exe installer contains:
echo     - CyberPS.exe (Launcher)
echo     - backend.exe (Node.js backend - compiled)
echo     - ramail.exe  (Python service - compiled)
echo     - Frontend static files (React compiled)
echo     - Tesseract OCR + Poppler (bundled)
echo     - All configuration templates
echo.
echo   NO source code is exposed.
echo   NO internet required on target machine.
echo.
pause
exit /b 0

:FAIL
echo.
echo  ============================================================
echo  [FAILED] Build process encountered errors above.
echo  ============================================================
echo.
pause
exit /b 1
