@echo off
cd /d "c:\Users\Asus\Downloads\Realtime_faceRecognition-and-Industry-workplace-compilance- copy 2\face-attendance-ui"
echo Starting Next.js development server...
echo Directory: %CD%
dir app
echo.
echo Starting server...
npx next dev --port 3000
pause