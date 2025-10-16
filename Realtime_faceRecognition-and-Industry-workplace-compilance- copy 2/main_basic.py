"""
Alternative main.py that works with or without face-recognition
This allows the system to start even if face-recognition installation fails
"""

import cv2
import os
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import sqlite3
from openpyxl import Workbook, load_workbook
import socket
import warnings
import platform

# Try to import face_recognition, handle gracefully if missing
try:
    import face_recognition
    FACE_RECOGNITION_AVAILABLE = True
    print("✅ Face recognition module loaded successfully")
except ImportError:
    FACE_RECOGNITION_AVAILABLE = False
    print("⚠️ Face recognition module not available - running in basic mode")

# Try to import Google Sheets dependencies
try:
    import gspread
    from oauth2client.service_account import ServiceAccountCredentials
    GSHEETS_AVAILABLE = True
except ImportError:
    GSHEETS_AVAILABLE = False
    print("⚠️ Google Sheets modules not available")

warnings.filterwarnings("ignore")

# =============================
# CONFIG
# =============================
IMAGE_FOLDER = "images"
UNKNOWN_FOLDER = "unknown_faces"
DB_PATH = "attendance.db"
EXCEL_BACKUP_FILE = "attendance_backup.xlsx"
SERVICE_ACCOUNT_JSON = os.environ.get(
    "SERVICE_ACCOUNT_JSON",
    os.path.expanduser(os.path.join(os.getcwd(), "attendancesystem-456710-b95819cc04c5.json")),
)
GOOGLE_SHEET_KEY = "146GSoCK3fWDpWrfOTq4XWzuf09_wMnKeueoSmoXraE4"
TARGET_GID = 1841396514
COOLDOWN_SECONDS = 30

IS_MAC = platform.system() == "Darwin"
ROTATE_ON_CAPTURE = IS_MAC
ROTATE_CODE = cv2.ROTATE_90_CLOCKWISE

# =============================
# INTERNET CHECK
# =============================
def is_connected(host="8.8.8.8", port=53, timeout=3):
    try:
        socket.setdefaulttimeout(timeout)
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.connect((host, port))
        s.close()
        return True
    except Exception:
        return False

# =============================
# GOOGLE SHEETS SETUP
# =============================
if GSHEETS_AVAILABLE:
    scope = [
        "https://spreadsheets.google.com/feeds",
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/drive",
    ]

internet_available = is_connected()
sheet = None
worksheet = None
if internet_available and GSHEETS_AVAILABLE:
    if SERVICE_ACCOUNT_JSON and os.path.exists(SERVICE_ACCOUNT_JSON):
        try:
            creds = ServiceAccountCredentials.from_json_keyfile_name(SERVICE_ACCOUNT_JSON, scope)
            client = gspread.authorize(creds)
            sheet = client.open_by_key(GOOGLE_SHEET_KEY)
            try:
                worksheet = sheet.get_worksheet_by_id(TARGET_GID)
            except Exception:
                worksheet = sheet.get_worksheet(0)
            print("✅ Google Sheets connected.")
        except Exception as e:
            print(f"⚠️ Could not set up Google Sheets: {e}")
            internet_available = False
    else:
        print(f"⚠️ Google service JSON not found at {SERVICE_ACCOUNT_JSON}; Google Sheets disabled.")
        internet_available = False
else:
    if not GSHEETS_AVAILABLE:
        print("⚠️ Google Sheets modules not available")
    else:
        print("⚠️ No internet — Google Sheets disabled for this run.")

# =============================
# DATABASE SETUP
# =============================
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Create tables
cursor.execute("""
    CREATE TABLE IF NOT EXISTS departments (
        department_id INTEGER PRIMARY KEY AUTOINCREMENT,
        department_name TEXT UNIQUE
    )
""")
cursor.execute("""
    CREATE TABLE IF NOT EXISTS semesters (
        semester_id INTEGER PRIMARY KEY AUTOINCREMENT,
        semester_name TEXT UNIQUE
    )
""")
cursor.execute("""
    CREATE TABLE IF NOT EXISTS groups (
        group_id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_name TEXT UNIQUE
    )
""")
cursor.execute("""
    CREATE TABLE IF NOT EXISTS students (
        student_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        roll_no TEXT UNIQUE,
        class_name TEXT,
        semester_id INTEGER,
        group_id INTEGER,
        department_id INTEGER,
        FOREIGN KEY (semester_id) REFERENCES semesters(semester_id),
        FOREIGN KEY (group_id) REFERENCES groups(group_id),
        FOREIGN KEY (department_id) REFERENCES departments(department_id)
    )
""")
cursor.execute("""
    CREATE TABLE IF NOT EXISTS attendance (
        attendance_id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        date TEXT,
        day TEXT,
        entry_time TEXT,
        exit_time TEXT,
        timestamp TEXT,
        FOREIGN KEY (student_id) REFERENCES students(student_id)
    )
""")
conn.commit()

# =============================
# GLOBALS
# =============================
os.makedirs(IMAGE_FOLDER, exist_ok=True)
os.makedirs(UNKNOWN_FOLDER, exist_ok=True)

known_face_encodings = []
known_face_ids = {}
_last_seen = {}

def open_camera(preferred_index=0, max_tested=5):
    print("🔍 Testing available cameras...")
    found_any = False
    for i in range(preferred_index, max_tested):
        cap = cv2.VideoCapture(i)
        if cap.isOpened():
            print(f"✅ Camera index {i} is available.")
            found_any = True
            cap.release()
        else:
            print(f"❌ Camera index {i} is not available.")
    if not found_any:
        print("⚠️ No cameras found. Please check your camera setup.")
        return None

    cap = cv2.VideoCapture(preferred_index)
    if cap.isOpened():
        cv2.namedWindow("Attendance System", cv2.WINDOW_NORMAL)
        return cap
    return None

def maybe_rotate(frame):
    if ROTATE_ON_CAPTURE and frame is not None:
        return cv2.rotate(frame, ROTATE_CODE)
    return frame

# Basic camera test function
def test_camera():
    print("\n📸 Camera Test")
    print("This will test your camera setup. Press ESC to exit.")
    
    cap = open_camera(0)
    if cap is None:
        print("❌ Could not open camera")
        return

    while True:
        success, frame = cap.read()
        if not success:
            print("⚠️ Camera frame read failed.")
            break

        frame = maybe_rotate(frame)
        cv2.putText(frame, "Camera Test - Press ESC to exit", (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        cv2.imshow("Camera Test", frame)

        if cv2.waitKey(1) & 0xFF == 27:  # ESC
            break

    cap.release()
    cv2.destroyAllWindows()
    print("✅ Camera test completed")

def show_system_info():
    print("\n=== SYSTEM INFORMATION ===")
    print(f"🖥️  Platform: {platform.system()}")
    print(f"🐍 Python version: {platform.python_version()}")
    print(f"📹 OpenCV version: {cv2.__version__}")
    print(f"🔍 Face recognition: {'✅ Available' if FACE_RECOGNITION_AVAILABLE else '❌ Not available'}")
    print(f"📊 Google Sheets: {'✅ Available' if GSHEETS_AVAILABLE else '❌ Not available'}")
    print(f"🌐 Internet: {'✅ Connected' if internet_available else '❌ Offline'}")
    print()

if __name__ == "__main__":
    show_system_info()
    
    if not FACE_RECOGNITION_AVAILABLE:
        print("⚠️ FACE RECOGNITION NOT AVAILABLE")
        print("The face recognition library is not installed.")
        print("You can still:")
        print("- Test your camera")
        print("- View system information")
        print("- Set up the database")
        print()
        print("To install face recognition, run:")
        print("pip install face-recognition")
        print("Note: This requires Visual Studio Build Tools on Windows")
        print()
    
    try:
        while True:
            print("==== FACE RECOGNITION ATTENDANCE SYSTEM ====")
            print("1. Test Camera")
            print("2. Show System Information")
            if FACE_RECOGNITION_AVAILABLE:
                print("3. Add New Student (requires face recognition)")
                print("4. Start Attendance Recognition")
                print("5. Update Student Details")
            else:
                print("3-5. Face recognition features (unavailable)")
            print("6. Exit")
            
            choice = input("Enter choice: ").strip()

            if choice == "1":
                test_camera()
            elif choice == "2":
                show_system_info()
            elif choice == "3" and FACE_RECOGNITION_AVAILABLE:
                print("Add student feature requires the full face recognition setup")
            elif choice == "4" and FACE_RECOGNITION_AVAILABLE:
                print("Attendance recognition requires the full face recognition setup")
            elif choice == "5" and FACE_RECOGNITION_AVAILABLE:
                print("Update student feature requires the full face recognition setup")
            elif choice == "6":
                print("Exiting...")
                break
            else:
                if not FACE_RECOGNITION_AVAILABLE and choice in ["3", "4", "5"]:
                    print("❌ Face recognition features are not available.")
                    print("Please install face-recognition package first.")
                else:
                    print("❌ Invalid choice")
    finally:
        conn.close()