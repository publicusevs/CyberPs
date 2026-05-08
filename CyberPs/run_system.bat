@echo off
echo Starting Investigation Hunter...

start cmd /k "cd backend && npm run dev"
start cmd /k "cd frontend && npm run dev"

echo System services are being initialized. 
echo Backend running on http://localhost:5000
echo Frontend running on http://localhost:5173
pause
