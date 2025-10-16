@echo off
echo ===========================================
echo Face Recognition Attendance System Setup
echo ===========================================
echo.

echo Checking Python installation...
python --version
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.7+ from https://python.org
    pause
    exit /b 1
)

echo.
echo Installing Python dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    echo You may need to install Visual Studio Build Tools for Windows
    echo Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
    pause
    exit /b 1
)

echo.
echo Creating necessary directories...
if not exist "images" mkdir images
if not exist "unknown_faces" mkdir "unknown_faces"

echo.
echo Setup complete!
echo.
echo To run the application:
echo   python main.py
echo.
echo Optional: Set up Google Sheets by placing your service account JSON
echo in this folder and setting the SERVICE_ACCOUNT_JSON environment variable.
echo.
pause