# Face Recognition Attendance System

A Python-based real-time face recognition attendance system that works on both Windows and macOS. Manages student data, tracks attendance with entry/exit logging, and exports data to both local Excel files and Google Sheets.

## Features

- **Real-time face recognition** using OpenCV and face_recognition
- **Cross-platform compatibility** (Windows and macOS)
- **Local SQLite database** for student and attendance data
- **Google Sheets integration** for cloud backups
- **Excel export** for offline data management
- **Student management** (add, update, load existing students)
- **Image capture** for new student enrollment
- **Unknown face detection** and logging

## System Requirements

- Python 3.7+
- Camera/webcam
- Internet connection (optional, for Google Sheets)

## Installation

### Windows Setup

1. **Clone or download** the project to your desired location
2. **Install Python dependencies:**
   ```cmd
   pip install -r requirements.txt
   ```

3. **Install Visual Studio Build Tools** (required for face_recognition on Windows):
   - Download from [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
   - Or install Visual Studio Community with C++ workload

4. **Set up Google Sheets integration** (optional):
   - Place your Google service account JSON file in the project root
   - Set the environment variable:
     ```cmd
     set SERVICE_ACCOUNT_JSON=your-service-account-file.json
     ```
   - Or rename your file to `attendancesystem-456710-b95819cc04c5.json`

### macOS Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up Google Sheets integration** (optional):
   ```bash
   export SERVICE_ACCOUNT_JSON="your-service-account-file.json"
   ```

## Usage

1. **Run the main application:**
   ```bash
   python main.py
   ```

2. **Main Menu Options:**
   - **Add new student:** Capture face images and register student details
   - **Load students & start recognition:** Begin attendance tracking
   - **Update student details:** Modify existing student information
   - **Exit**

3. **Adding Students:**
   - Choose option 1 from the main menu
   - Enter student details (name, roll number, group, semester, department)
   - Capture 3-4 face images using your webcam (press SPACE to capture)
   - Press ESC when done

4. **Taking Attendance:**
   - Choose option 2 from the main menu
   - Face recognition will start automatically
   - Students will be marked present when detected
   - Press ESC to stop attendance tracking

## File Structure

```
├── main.py                 # Main application entry point
├── requirements.txt        # Python dependencies
├── attendance.db          # SQLite database (created automatically)
├── images/                # Student face images (organized by name)
├── unknown_faces/         # Logged unknown faces by date
├── *.xlsx                 # Excel attendance exports
└── attendancesystem-*.json # Google service account (if using Sheets)
```

## Configuration

Edit the configuration section in `main.py`:

- `GOOGLE_SHEET_KEY`: Your Google Sheet ID
- `COOLDOWN_SECONDS`: Time between repeated attendance marks
- `ROTATE_ON_CAPTURE`: Auto-rotation for macOS Continuity Camera

## Troubleshooting

### Windows Issues

- **Camera not working:** Try different camera indices (0, 1, 2) in the code
- **face_recognition install fails:** Install Visual Studio Build Tools
- **Permission errors:** Run as Administrator if needed

### macOS Issues

- **Camera permission:** Allow Terminal/Python to access camera in System Preferences
- **Homebrew conflicts:** Use a virtual environment

### General Issues

- **No faces detected:** Ensure good lighting and face visibility
- **Google Sheets not working:** Check service account JSON file path and permissions
- **Database errors:** Delete `attendance.db` to reset (will lose data)

## Optional Features

- **Google Sheets integration:** Real-time cloud backup of attendance
- **Excel exports:** Local backup files with daily sheets
- **Unknown face logging:** Automatic capture of unrecognized faces

## Dependencies

- opencv-python: Camera and image processing
- face-recognition: Face detection and recognition
- numpy: Numerical operations
- pandas: Data manipulation
- openpyxl: Excel file handling
- gspread: Google Sheets API
- oauth2client: Google authentication

## License

Open source project - feel free to modify and distribute.