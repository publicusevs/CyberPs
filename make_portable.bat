@echo off
setlocal
title CyberPS - Portable Build System
cd /d "%~dp0"

echo.
echo ============================================================
echo   CyberPS Portable Packaging ^& Compilation Engine
echo ============================================================
echo.

:: Setup Output Directory
set BUILD_DIR=%~dp0Portable_CyberPS
if exist "%BUILD_DIR%" (
    echo [CLEAN] Removing previous build directory...
    rd /s /q "%BUILD_DIR%"
)
mkdir "%BUILD_DIR%"
mkdir "%BUILD_DIR%\backend"
mkdir "%BUILD_DIR%\frontend\dist"
mkdir "%BUILD_DIR%\ramail"
mkdir "%BUILD_DIR%\uploads\fir"
mkdir "%BUILD_DIR%\uploads\notices"
mkdir "%BUILD_DIR%\uploads\excels"
mkdir "%BUILD_DIR%\uploads\evidence"

echo.
echo ==========================================
echo  [1/4] Building React Frontend...
echo ==========================================
echo.
cd frontend
echo Running npm install...
call npm install
echo Compiling production assets...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed.
    if not defined NOPAUSE pause
    exit /b 1
)
cd ..

echo.
echo ==========================================
echo  [2/4] Compiling Node.js Backend...
echo ==========================================
echo.
cd backend
echo Running npm install...
call npm install
echo Packaging backend with pkg...
call npx pkg app.js --targets node18-win-x64 --output dist/backend.exe
if %errorlevel% neq 0 (
    echo [ERROR] Backend compilation failed.
    if not defined NOPAUSE pause
    exit /b 1
)
cd ..

echo.
echo ==========================================
echo  [3/4] Compiling Python Ramail Service...
echo ==========================================
echo.
cd ramail
echo Installing Python packages...
pip install -r requirements.txt
echo Installing PyInstaller...
pip install pyinstaller
echo Compiling python service into executable...
pyinstaller --onefile main.py --name ramail --clean
if %errorlevel% neq 0 (
    echo [ERROR] Python compilation failed.
    if not defined NOPAUSE pause
    exit /b 1
)
cd ..

echo.
echo ==========================================
echo  [4/4] Assembling Portable Folder...
echo ==========================================
echo.

echo Copying executables...
copy "%~dp0backend\dist\backend.exe" "%BUILD_DIR%\backend\backend.exe" /y
copy "%~dp0ramail\dist\ramail.exe" "%BUILD_DIR%\ramail\ramail.exe" /y

echo Copying frontend compiled assets...
xcopy "%~dp0frontend\dist" "%BUILD_DIR%\frontend\dist" /e /h /y

echo Copying default configuration files...
copy "%~dp0backend\.env.example" "%BUILD_DIR%\.env" /y
copy "%~dp0bankmaillist.json" "%BUILD_DIR%\bankmaillist.json" /y

echo Generating portable launcher script...
(
echo @echo off
echo setlocal EnableDelayedExpansion
echo title CyberPS Portable - Tactical Command OS
echo cd /d "%%~dp0"
echo.
echo :: Load configuration from .env
echo if exist .env ^(
echo     for /f "usebackq tokens=1,* delims==" %%%%a in ^(".env"^) do ^(
echo         set "%%%%a=%%%%b"
echo     ^)
echo ^)
echo.
echo if not defined BACKEND_PORT set BACKEND_PORT=5174
echo if not defined RAMAIL_PORT set RAMAIL_PORT=8000
echo set NODE_ENV=production
echo.
echo echo.
echo echo  ============================================================
echo echo   CyberPS Portable  --  Tactical Command OS
echo echo  ============================================================
echo echo.
echo.
echo :: 1. Run database migration
echo echo  [1/3] Running database migration...
echo cd backend
echo backend.exe migrate
echo if %%%%errorlevel%%%% neq 0 ^(
echo     echo  [WARNING] Database migration exited with errors.
echo     echo            Make sure your database server is running and .env is correct.
echo ^)
echo cd ..
echo.
echo :: 2. Start Services
echo echo  [2/3] Starting background services...
echo start "CyberPS Backend" /min cmd /c "cd /d %%~dp0backend && set NODE_ENV=production&& backend.exe"
echo timeout /t 2 /nobreak ^>nul
echo start "CyberPS Ramail API" /min cmd /c "cd /d %%~dp0ramail && ramail.exe api"
echo timeout /t 2 /nobreak ^>nul
echo.
echo :: 3. Launch UI
echo echo  [3/3] Launching web interface...
echo start http://localhost:^!BACKEND_PORT^!
echo.
echo echo.
echo echo  ============================================================
echo echo   System Initialized successfully -- Portable Edition
echo echo  ============================================================
echo echo.
echo echo   URL: http://localhost:^!BACKEND_PORT^!
echo echo.
echo echo   To stop the services, press any key in this window.
echo echo  ============================================================
echo echo.
echo pause
echo.
echo echo  Stopping background services...
echo taskkill /f /im backend.exe ^>nul 2^>^&1
echo taskkill /f /im ramail.exe ^>nul 2^>^&1
echo echo  Done.
) > "%BUILD_DIR%\run_cyberps.bat"

echo.
echo ============================================================
echo   ✔ PORTABLE BUILD COMPLETE!
echo   Location: %BUILD_DIR%
echo ============================================================
echo.
if not defined NOPAUSE pause
