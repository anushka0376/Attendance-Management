@echo off
echo Starting Face Attendance System...
echo.

REM Start Backend
echo Starting Backend Server (Port 8000)...
start /B python "C:\Users\Asus\Downloads\Realtime_faceRecognition-and-Industry-workplace-compilance- copy 2\Realtime_faceRecognition-and-Industry-workplace-compilance- copy 2\simple_api_server.py"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start Frontend
echo Starting Frontend Server (Port 3000)...
cd /d "C:\Users\Asus\Downloads\Realtime_faceRecognition-and-Industry-workplace-compilance- copy 2\face-attendance-ui"
npx next dev --port 3000

pause