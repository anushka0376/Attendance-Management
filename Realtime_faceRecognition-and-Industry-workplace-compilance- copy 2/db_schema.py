# # Face Recognition Attendance System with Full Normalization

# import cv2
# import face_recognition
# import os
# import numpy as np
# import pandas as pd
# from datetime import datetime, timedelta
# import sqlite3
# from openpyxl import Workbook, load_workbook
# import socket
# import gspread
# from oauth2client.service_account import ServiceAccountCredentials
# from pynput import keyboard as kb
# import threading

# # ---[GLOBAL SETUP]---
# db_path = "attendance.db"
# image_folder = "images"
# unknown_faces_folder = "unknown_faces"
# os.makedirs(unknown_faces_folder, exist_ok=True)

# # ---[INTERNET CHECK]---
# def is_connected(host='8.8.8.8', port=53, timeout=3):
#     try:
#         socket.setdefaulttimeout(timeout)
#         socket.socket(socket.AF_INET, socket.SOCK_STREAM).connect((host, port))
#         return True
#     except Exception:
#         return False

# # ---[GOOGLE SHEETS SETUP]---
# scope = [
#     "https://spreadsheets.google.com/feeds",
#     "https://www.googleapis.com/auth/spreadsheets",
#     "https://www.googleapis.com/auth/drive.file",
#     "https://www.googleapis.com/auth/drive"
# ]

# internet_available = is_connected()
# sheet = None
# worksheet = None
# if internet_available:
#     try:
#         creds = ServiceAccountCredentials.from_json_keyfile_name(
#             "/Users/anushkabhatnagar/Downloads/attendancesystem-456710-b95819cc04c5.json", scope
#         )
#         client = gspread.authorize(creds)
#         sheet = client.open_by_key("146GSoCK3fWDpWrfOTq4XWzuf09_wMnKeueoSmoXraE4")
#     except Exception as e:
#         print(f"⚠️ Could not set up Google Sheets: {e}")
#         internet_available = False

# # ---[DATABASE SETUP MODULE IMPORT]---
# from database.setup import initialize_database
# from database.student import load_students
# from database.face_encoding import load_face_encodings

# conn = sqlite3.connect(db_path)
# cursor = conn.cursor()

# # Initialize database with normalized schema
# initialize_database(cursor)

# # Load student encodings
# known_face_encodings, known_face_ids = load_face_encodings(cursor, image_folder)
# conn.commit()
# print("✅ Database and timetable setup complete.")



# db_schema/setup.py
import cv2
import face_recognition
import pickle
import os
import sqlite3

def create_connection(db_path="attendance.db"):
    """Create a database connection."""
    return sqlite3.connect(db_path)

def setup_database(conn):
    """Set up the necessary database schema."""
    cursor = conn.cursor()

    # Drop existing tables if they exist
    cursor.executescript("""
    DROP TABLE IF EXISTS attendance;
    DROP TABLE IF EXISTS timetable;
    DROP TABLE IF EXISTS students;
    DROP TABLE IF EXISTS subjects;
    DROP TABLE IF EXISTS departments;
    DROP TABLE IF EXISTS semesters;
    DROP TABLE IF EXISTS groups;

    -- Departments table
    CREATE TABLE departments (
        department_id INTEGER PRIMARY KEY AUTOINCREMENT,
        department_name TEXT UNIQUE NOT NULL
    );

    -- Semesters table
    CREATE TABLE semesters (
        semester_id INTEGER PRIMARY KEY AUTOINCREMENT,
        semester_name TEXT UNIQUE NOT NULL
    );

    -- Groups table
    CREATE TABLE groups (
        group_id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_name TEXT UNIQUE NOT NULL
    );

    -- Students table
    CREATE TABLE students (
        student_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        roll_no TEXT UNIQUE NOT NULL,
        class_name TEXT,
        department_id INTEGER NOT NULL,
        semester_id INTEGER NOT NULL,
        group_id INTEGER NOT NULL,
        FOREIGN KEY (department_id) REFERENCES departments(department_id),
        FOREIGN KEY (semester_id) REFERENCES semesters(semester_id),
        FOREIGN KEY (group_id) REFERENCES groups(group_id)
    );

    -- Subjects table
    CREATE TABLE subjects (
        subject_id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_name TEXT NOT NULL,
        department_id INTEGER NOT NULL,
        semester_id INTEGER NOT NULL,
        FOREIGN KEY (department_id) REFERENCES departments(department_id),
        FOREIGN KEY (semester_id) REFERENCES semesters(semester_id),
        UNIQUE(subject_name, department_id, semester_id)
    );

    -- Timetable table
    CREATE TABLE timetable (
        timetable_id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_id INTEGER NOT NULL,
        group_id INTEGER NOT NULL,
        day TEXT NOT NULL,
        period INTEGER NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        FOREIGN KEY (subject_id) REFERENCES subjects(subject_id),
        FOREIGN KEY (group_id) REFERENCES groups(group_id),
        UNIQUE(subject_id, group_id, day, period)
    );

    -- Attendance table
    CREATE TABLE attendance (
        attendance_id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        subject_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        day TEXT NOT NULL,
        entry_time TEXT NOT NULL,
        exit_time TEXT,
        FOREIGN KEY (student_id) REFERENCES students(student_id),
        FOREIGN KEY (subject_id) REFERENCES subjects(subject_id),
        UNIQUE(student_id, subject_id, date, day)
    );
    """)
 # ---[STUDENT FACE SETUP]---
cursor.execute("INSERT OR IGNORE INTO departments (department_name) VALUES ('Computer Science')")
dept_id = cursor.execute("SELECT department_id FROM departments WHERE department_name=?", ("Computer Science",)).fetchone()[0]

cursor.execute("INSERT OR IGNORE INTO semesters (semester_name) VALUES ('4th')")
sem_id = cursor.execute("SELECT semester_id FROM semesters WHERE semester_name=?", ("4th",)).fetchone()[0]

# Add groups
group_ids = {}
for group in ["G5", "G8", "G10", "G20"]:
    cursor.execute("INSERT OR IGNORE INTO groups (group_name) VALUES (?)", (group,))
    group_ids[group] = cursor.execute("SELECT group_id FROM groups WHERE group_name=?", (group,)).fetchone()[0]

# Student data
students_data = [
    ("Anushka", "2310990376", "G5", sem_id, dept_id, "1111.png"),
    ("Jiya", "2310990619", "G8", sem_id, dept_id, "1112.png"),
    ("Jhanak", "2310990618", "G8", sem_id, dept_id, "1113.png"),
    ("Ishita", "2310990777", "G10", sem_id, dept_id, "1114.png"),
    ("Prerika", "2410991589", "G20", sem_id, dept_id, "1115.png"),
]

conn.commit()
print("✅ Database schema with full normalization and constraints created successfully.")

if __name__ == "__main__":
    # Initialize the database connection and set up the schema
    conn = create_connection()
    setup_database(conn)
    conn.close()

# known_face_encodings = []
# known_face_ids = {}

# for name, roll_no, group_name, semester_id, department_id, filename in students_data:
#     cursor.execute("INSERT OR IGNORE INTO students (name, roll_no, class_name, semester_id, group_id, department_id) VALUES (?, ?, ?, ?, ?, ?)",
#                    (name, roll_no, group_name, semester_id, group_ids[group_name], department_id))
#     student_id = cursor.execute("SELECT student_id FROM students WHERE roll_no=?", (roll_no,)).fetchone()[0]

#     path = os.path.join(image_folder, filename)
#     img = cv2.imread(path)
#     if img is None:
#         print(f"⚠️ Could not load {filename}")
#         continue
#     rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
#     encodings = face_recognition.face_encodings(rgb_img)
#     if encodings:
#         known_face_encodings.append(encodings[0])
#         known_face_ids[len(known_face_encodings) - 1] = student_id
#     else:
#         print(f"⚠️ No face found in {filename}")

# conn.commit()
# print("✅ Loaded known faces.")