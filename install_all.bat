@echo off
echo ==========================================
echo    Installing Dependencies (All)
echo ==========================================

echo.
echo [1/2] Installing Backend Dependencies...
pushd backend
call npm install
popd

echo.
echo [2/2] Installing Frontend Dependencies...
pushd frontend
call npm install
popd

echo.
echo Success! All dependencies installed.
pause
