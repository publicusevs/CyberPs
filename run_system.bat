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

:: ── Pre-flight checks ───────────────────────────────────────────
echo  [1/4] Checking Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)

echo  [2/4] Checking backend dependencies...
if not exist "backend\node_modules" (
    echo         Installing backend packages...
    cd backend
    call npm install --silent
    cd ..
)

echo  [3/4] Checking frontend dependencies...
if not exist "frontend\node_modules" (
    echo         Installing frontend packages...
    cd frontend
    call npm install --silent
    cd ..
)

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

start "CyberPS Backend  ^| Port 5000" cmd /k "cd /d %~dp0backend && color 0A && echo  [BACKEND] Starting... && npm run dev"
timeout /t 2 /nobreak >nul
start "CyberPS Frontend ^| Port 5173" cmd /k "cd /d %~dp0frontend && color 0B && echo  [FRONTEND] Starting... && npm run dev"

:: ── Status output ─────────────────────────────────────────────────
echo.
echo  ============================================================
echo   System Initialized
echo  ============================================================
echo.
echo   Backend  : http://localhost:5000
echo   Frontend : http://localhost:5173
echo   Health   : http://localhost:5000/health
echo.
echo   Both services are starting in separate windows.
echo   Close those windows to stop the services.
echo.
echo  ============================================================
echo.
pause
