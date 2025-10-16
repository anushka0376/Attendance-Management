@echo off
echo ========================================
echo  Face Recognition Attendance System
echo ========================================

REM Kill any existing processes
echo Stopping existing processes...
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1

echo Waiting for processes to stop...
timeout /t 3 /nobreak >nul

REM Start backend server
echo Starting backend server on 127.0.0.1:8000...
start "Backend Server" cmd /k "python "Realtime_faceRecognition-and-Industry-workplace-compilance- copy 2\simple_api_server.py""

REM Wait a bit for backend to start
echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

REM Start frontend server  
echo Starting frontend server on 127.0.0.1:3000...
cd face-attendance-ui
start "Frontend Server" cmd /k "npm run dev"

echo.
echo ========================================
echo  Servers Starting...
echo ========================================
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://127.0.0.1:3000
echo ========================================
echo.
echo Press any key to open the website...
pause >nul

start http://127.0.0.1:3000

echo Both servers are running in separate windows.
echo Close those windows to stop the servers.
pause