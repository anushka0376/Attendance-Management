#!/bin/bash

echo "==========================================="
echo "Face Recognition Attendance System Setup"
echo "==========================================="
echo

echo "Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3.7+ from https://python.org"
    echo "or use Homebrew: brew install python"
    exit 1
fi

python3 --version

echo
echo "Installing Python dependencies..."
pip3 install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    echo "You may need to install Xcode command line tools:"
    echo "xcode-select --install"
    exit 1
fi

echo
echo "Creating necessary directories..."
mkdir -p images
mkdir -p unknown_faces

echo
echo "Setup complete!"
echo
echo "To run the application:"
echo "  python3 main.py"
echo
echo "Optional: Set up Google Sheets by placing your service account JSON"
echo "in this folder and setting the SERVICE_ACCOUNT_JSON environment variable:"
echo "  export SERVICE_ACCOUNT_JSON=\"your-service-account-file.json\""
echo