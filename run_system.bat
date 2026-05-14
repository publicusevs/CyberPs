@echo off
setlocal EnableDelayedExpansion
title CyberPS — Investigation Hunter

cls
echo.
echo  ============================================================
echo   CyberPS  ^|  Investigation Hunter  ^|  Tactical Command OS
echo  ============================================================
echo.

:: Resolve script location — always runs from the CyberPs root
cd /d "%~dp0"

:: Load centralized port configuration
if exist "%~dp0.env" (
    for /f "usebackq tokens=1,* delims==" %%a in ("%~dp0.env") do (
        set "%%a=%%b"
    )
)
if not defined BACKEND_PORT set BACKEND_PORT=5174
if not defined FRONTEND_PORT set FRONTEND_PORT=5173
if not defined RAMAIL_PORT set RAMAIL_PORT=8000

:: ── Pre-flight checks ───────────────────────────────────────────
echo  [1/4] Checking Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)

echo  [2/4] Checking backend dependencies...
if exist "backend\node_modules\express-rate-limit" goto :backend_ok
echo         Installing backend packages (this may take a moment)...
cd backend
call npm install
cd ..
:backend_ok
echo         Backend packages verified.

echo  [3/4] Checking frontend dependencies...
if exist "frontend\node_modules" goto :frontend_ok
echo         Installing frontend packages (this may take a moment)...
cd frontend
call npm install
cd ..
:frontend_ok
echo         Frontend packages verified.

:: ── Run DB migration (safe — IF NOT EXISTS only) ─────────────────
echo  [4/4] Running database migration...
cd backend
call npm run migrate
if %errorlevel% neq 0 (
    echo.
    echo  [WARNING] Migration exited with errors. Check .env file.
    echo            Continuing startup anyway...
    echo.
)
cd ..

:: ── Start services in separate windows ───────────────────────────
echo.
echo  Starting services...
echo.

start "CyberPS Backend  ^| Port !BACKEND_PORT!" cmd /k "cd /d %~dp0backend && color 0A && echo  [BACKEND] Starting... && npm run dev"
timeout /t 2 /nobreak >nul
start "CyberPS Frontend ^| Port !FRONTEND_PORT!" cmd /k "cd /d %~dp0frontend && color 0B && echo  [FRONTEND] Starting... && npm run dev"
timeout /t 2 /nobreak >nul
start "CyberPS Ramail API ^| Port !RAMAIL_PORT!" cmd /k "cd /d %~dp0ramail && color 0C && echo  [RAMAIL] Installing Python packages... && pip install -r requirements.txt && echo  [RAMAIL] Starting API Service... && python main.py api"

:: ── Status output ─────────────────────────────────────────────────
echo.
echo  ============================================================
echo   System Initialized
echo  ============================================================
echo.
echo   Backend  : http://localhost:!BACKEND_PORT!
echo   Frontend : http://localhost:!FRONTEND_PORT!
echo   Ramail   : http://localhost:!RAMAIL_PORT!
echo   Health   : http://localhost:!BACKEND_PORT!/health
echo.
echo   All 3 services are starting in separate windows.
echo   Close those windows to stop the services.
echo.
echo  ============================================================
echo.
pause
