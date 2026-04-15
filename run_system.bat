@echo off
echo Starting Cyber Crime Case Management System...

start cmd /k "cd backend && npm run dev"
start cmd /k "cd frontend && npm run dev"

echo System services are being initialized. 
echo Backend running on http://localhost:1433
echo Frontend running on http://localhost:5173
pause
