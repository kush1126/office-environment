@echo off
title Office OS Launcher
echo ========================================================
echo Private Office Business OS - Startup Script
echo ========================================================
echo.

echo [1/5] Updating Frontend Dependencies (checking for new versions)...
cd frontend
call npm install
cd ..
echo.

echo [2/5] Updating Backend Dependencies (checking for new versions)...
cd backend
if not exist ".venv\Scripts\activate.bat" (
    echo Setting up virtual environment...
    python -m venv .venv
)
call .venv\Scripts\pip install -r requirements.txt
echo.

echo [3/5] Applying Database Migrations (updating to newest version)...
call .venv\Scripts\alembic upgrade head
cd ..
echo.

echo [4/5] Starting FastAPI Backend Server...
cd backend
start "Office OS Backend" cmd /k "call .venv\Scripts\activate.bat && uvicorn main:app --reload --port 8000"
cd ..

echo [5/5] Starting Vite Frontend Server...
cd frontend
start "Office OS Frontend" cmd /k "npm run dev"
cd ..

echo.
echo ========================================================
echo All services are starting up!
echo - Backend API will be available at: http://localhost:8000
echo - Frontend UI will be available at: http://localhost:3000
echo ========================================================
pause
