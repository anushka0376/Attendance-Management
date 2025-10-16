@echo off
title Face Recognition Attendance System Startup

echo 🚀 Starting Face Recognition Attendance System
echo ==============================================
echo.

set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

echo 📁 Project Directory: %PROJECT_DIR%
echo.

echo 🔧 Starting Backend API Server on port 8000...
echo Backend Directory: %PROJECT_DIR%Realtime_faceRecognition-and-Industry-workplace-compilance- copy 2
start "Backend Server" /D "%PROJECT_DIR%Realtime_faceRecognition-and-Industry-workplace-compilance- copy 2" python simple_api_server.py

echo ⏳ Waiting 5 seconds for backend to initialize...
timeout /t 5 /nobreak >nul

echo 🎨 Starting Frontend Next.js Server on port 3000...
echo Frontend Directory: %PROJECT_DIR%face-attendance-ui
start "Frontend Server" /D "%PROJECT_DIR%face-attendance-ui" npm run dev

echo.
echo ✅ Both servers are starting...
echo ✅ Backend API: http://localhost:8000
echo ✅ Frontend UI: http://localhost:3000
echo.
echo 🔐 Login Credentials:
echo    Admin: admin / admin@attendance.com
echo    Teacher 1: teacher1 / teacher1@school.com
echo    Teacher 2: teacher2 / teacher2@school.com
echo.
echo Press any key to close this window...
pause >nul