#!/usr/bin/env python3
"""
FastAPI Backend for Face Recognition Attendance System
Connects the Python backend with the Next.js frontend
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import sqlite3
import cv2
import numpy as np
import os
import json
import base64
from datetime import datetime, date
import pandas as pd
import io
from pathlib import Path
from PIL import Image
import uvicorn

# Import functions from main.py
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from main import (
        get_or_create_group, get_or_create_semester, get_or_create_department,
        load_student_images, compare_faces_basic, maybe_rotate, export_to_excel
    )
    print("✅ Successfully imported functions from main.py")
except ImportError as e:
    print(f"⚠️ Could not import from main.py: {e}")
    # Define fallback functions
    def get_or_create_group(name): return 1
    def get_or_create_semester(name): return 1  
    def get_or_create_department(name): return 1

# Initialize FastAPI app
app = FastAPI(
    title="Face Recognition Attendance API",
    description="Backend API for the Face Recognition Attendance System",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for images
os.makedirs("images", exist_ok=True)
app.mount("/images", StaticFiles(directory="images"), name="images")

# Pydantic models
class StudentCreate(BaseModel):
    name: str
    roll_no: str
    group_name: str
    semester_name: str
    department_name: str

class StudentUpdate(BaseModel):
    student_id: int
    name: Optional[str] = None
    roll_no: Optional[str] = None
    class_name: Optional[str] = None

class AttendanceRecord(BaseModel):
    student_id: int
    date: str
    day: str
    entry_time: str
    timestamp: str

class SystemStatus(BaseModel):
    platform: str
    opencv_version: str
    face_recognition_available: bool
    google_sheets_available: bool
    internet_connected: bool

# Database connection helper
def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect('attendance.db')
    conn.row_factory = sqlite3.Row  # Enable column access by name
    return conn

# API Routes

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Face Recognition Attendance API", "status": "running"}

@app.get("/api/system/status")
async def get_system_status():
    """Get system status"""
    try:
        import platform
        import socket
        
        # Check internet connectivity
        try:
            socket.create_connection(("8.8.8.8", 53), timeout=3)
            internet_connected = True
        except OSError:
            internet_connected = False
        
        # Check face recognition availability
        try:
            import face_recognition
            face_recognition_available = True
        except ImportError:
            face_recognition_available = False
            
        # Check Google Sheets availability
        try:
            import gspread
            google_sheets_available = True
        except ImportError:
            google_sheets_available = False
        
        return SystemStatus(
            platform=platform.system(),
            opencv_version=cv2.__version__,
            face_recognition_available=face_recognition_available,
            google_sheets_available=google_sheets_available,
            internet_connected=internet_connected
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting system status: {str(e)}")

@app.get("/api/students")
async def get_students():
    """Get all students"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT student_id, name, roll_no, class_name, 
                   semester_id, group_id, department_id
            FROM students 
            ORDER BY name
        """)
        
        students = []
        for row in cursor.fetchall():
            students.append({
                "student_id": row["student_id"],
                "name": row["name"], 
                "roll_no": row["roll_no"],
                "class_name": row["class_name"],
                "semester_id": row["semester_id"],
                "group_id": row["group_id"],
                "department_id": row["department_id"]
            })
        
        conn.close()
        return {"students": students, "count": len(students)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching students: {str(e)}")

@app.post("/api/students")
async def add_student(student: StudentCreate):
    """Add a new student"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get or create related records
        group_id = get_or_create_group(student.group_name) if student.group_name else 1
        semester_id = get_or_create_semester(student.semester_name) if student.semester_name else 1
        department_id = get_or_create_department(student.department_name) if student.department_name else 1
        
        # Insert student
        cursor.execute("""
            INSERT INTO students (name, roll_no, class_name, semester_id, group_id, department_id)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (student.name, student.roll_no, student.group_name, semester_id, group_id, department_id))
        
        student_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return {
            "message": "Student added successfully",
            "student_id": student_id,
            "student": {
                "student_id": student_id,
                "name": student.name,
                "roll_no": student.roll_no,
                "class_name": student.group_name
            }
        }
        
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Student with this roll number already exists")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding student: {str(e)}")

@app.post("/api/students/{student_id}/images")
async def upload_student_images(
    student_id: int,
    files: List[UploadFile] = File(...)
):
    """Upload images for a student"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verify student exists
        cursor.execute("SELECT name, roll_no FROM students WHERE student_id = ?", (student_id,))
        student = cursor.fetchone()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        student_name = student["name"]
        roll_no = student["roll_no"]
        
        # Create directory for student images
        student_dir = os.path.join("images", student_name)
        os.makedirs(student_dir, exist_ok=True)
        
        saved_images = []
        
        for i, file in enumerate(files):
            if not file.content_type.startswith('image/'):
                continue
                
            # Read image data
            image_data = await file.read()
            
            # Save image
            image_filename = f"{roll_no}_{i + 1}.png"
            image_path = os.path.join(student_dir, image_filename)
            
            with open(image_path, "wb") as f:
                f.write(image_data)
            
            saved_images.append(image_filename)
        
        conn.close()
        
        return {
            "message": f"Successfully uploaded {len(saved_images)} images",
            "student_name": student_name,
            "images": saved_images
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading images: {str(e)}")

@app.get("/api/attendance")
async def get_attendance(
    date_filter: Optional[str] = None,
    student_id: Optional[int] = None
):
    """Get attendance records"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = """
            SELECT a.attendance_id, a.student_id, a.date, a.day, 
                   a.entry_time, a.timestamp, s.name, s.roll_no, s.class_name
            FROM attendance a
            JOIN students s ON a.student_id = s.student_id
        """
        
        params = []
        conditions = []
        
        if date_filter:
            conditions.append("a.date = ?")
            params.append(date_filter)
            
        if student_id:
            conditions.append("a.student_id = ?")
            params.append(student_id)
        
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        
        query += " ORDER BY a.timestamp DESC"
        
        cursor.execute(query, params)
        
        attendance_records = []
        for row in cursor.fetchall():
            attendance_records.append({
                "attendance_id": row["attendance_id"],
                "student_id": row["student_id"],
                "student_name": row["name"],
                "roll_no": row["roll_no"],
                "class_name": row["class_name"],
                "date": row["date"],
                "day": row["day"],
                "entry_time": row["entry_time"],
                "timestamp": row["timestamp"]
            })
        
        conn.close()
        return {"attendance": attendance_records, "count": len(attendance_records)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching attendance: {str(e)}")

@app.post("/api/attendance/mark")
async def mark_attendance(student_ids: List[int]):
    """Mark attendance for multiple students"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        current_time = datetime.now()
        today_date = current_time.strftime('%Y-%m-%d')
        
        marked_students = []
        already_marked = []
        
        for student_id in student_ids:
            # Check if student exists
            cursor.execute("SELECT name, roll_no FROM students WHERE student_id = ?", (student_id,))
            student = cursor.fetchone()
            
            if not student:
                continue
            
            # Check if already marked today
            cursor.execute(
                "SELECT COUNT(*) FROM attendance WHERE student_id = ? AND date = ?",
                (student_id, today_date)
            )
            
            if cursor.fetchone()[0] == 0:
                # Mark attendance
                cursor.execute("""
                    INSERT INTO attendance (student_id, date, day, entry_time, timestamp)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    student_id, today_date, current_time.strftime('%A'),
                    current_time.strftime('%H:%M:%S'), current_time.strftime('%Y-%m-%d %H:%M:%S')
                ))
                
                marked_students.append({
                    "student_id": student_id,
                    "name": student["name"],
                    "roll_no": student["roll_no"]
                })
            else:
                already_marked.append({
                    "student_id": student_id,
                    "name": student["name"],
                    "roll_no": student["roll_no"]
                })
        
        conn.commit()
        conn.close()
        
        return {
            "message": f"Attendance marked for {len(marked_students)} students",
            "marked_students": marked_students,
            "already_marked": already_marked
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error marking attendance: {str(e)}")

@app.post("/api/attendance/mark-absent")
async def mark_absent(student_ids: List[int]):
    """Mark students as absent (remove their attendance for today if exists)"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        today_date = datetime.now().strftime('%Y-%m-%d')
        
        removed_students = []
        not_marked = []
        
        for student_id in student_ids:
            # Check if student exists
            cursor.execute("SELECT name, roll_no FROM students WHERE student_id = ?", (student_id,))
            student = cursor.fetchone()
            
            if not student:
                continue
            
            # Check if marked today
            cursor.execute(
                "SELECT COUNT(*) FROM attendance WHERE student_id = ? AND date = ?",
                (student_id, today_date)
            )
            
            if cursor.fetchone()[0] > 0:
                # Remove attendance record (mark as absent)
                cursor.execute(
                    "DELETE FROM attendance WHERE student_id = ? AND date = ?",
                    (student_id, today_date)
                )
                
                removed_students.append({
                    "student_id": student_id,
                    "name": student["name"],
                    "roll_no": student["roll_no"]
                })
            else:
                not_marked.append({
                    "student_id": student_id,
                    "name": student["name"],
                    "roll_no": student["roll_no"]
                })
        
        conn.commit()
        conn.close()
        
        return {
            "message": f"Marked {len(removed_students)} students as absent",
            "absent_students": removed_students,
            "not_marked": not_marked
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error marking absent: {str(e)}")

@app.post("/api/attendance/verify-image")
async def verify_attendance_by_image(file: UploadFile = File(...)):
    """Verify attendance using uploaded image"""
    try:
        # Read uploaded image
        image_data = await file.read()
        
        # Convert to OpenCV format
        nparr = np.frombuffer(image_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image format")
        
        # Load student images
        student_images = load_student_images()
        
        if not student_images:
            raise HTTPException(status_code=404, detail="No student images found for comparison")
        
        # Compare faces
        matches = compare_faces_basic(frame, student_images)
        
        if not matches:
            return {"message": "No matching student found", "matches": []}
        
        # Get best match
        best_match = matches[0]
        student_name = best_match[0]
        confidence = best_match[1]
        
        # Get student info from database
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT student_id, name, roll_no FROM students WHERE name = ?", (student_name,))
        student = cursor.fetchone()
        
        if not student:
            conn.close()
            return {"message": "Student found in images but not in database", "matches": matches}
        
        # Check if already marked today
        student_id = student["student_id"]
        today_date = datetime.now().strftime('%Y-%m-%d')
        
        cursor.execute(
            "SELECT COUNT(*) FROM attendance WHERE student_id = ? AND date = ?",
            (student_id, today_date)
        )
        
        already_marked = cursor.fetchone()[0] > 0
        
        result = {
            "student_found": True,
            "student_id": student_id,
            "student_name": student["name"],
            "roll_no": student["roll_no"],
            "confidence": confidence,
            "already_marked_today": already_marked,
            "matches": matches[:3]  # Top 3 matches
        }
        
        conn.close()
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error verifying image: {str(e)}")

@app.get("/api/export/excel")
async def export_attendance_excel():
    """Export attendance to Excel"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT s.name, s.roll_no, s.class_name, a.date, a.day, a.entry_time, a.timestamp
            FROM attendance a
            JOIN students s ON a.student_id = s.student_id
            ORDER BY a.timestamp DESC
        """)
        
        data = cursor.fetchall()
        conn.close()
        
        if not data:
            raise HTTPException(status_code=404, detail="No attendance data to export")
        
        # Create DataFrame
        df = pd.DataFrame([dict(row) for row in data])
        
        # Create Excel file in memory
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Attendance', index=False)
        
        output.seek(0)
        
        # Generate filename
        today = datetime.now().strftime("%Y-%m-%d_%H%M%S")
        filename = f"attendance_{today}.xlsx"
        
        return {
            "message": "Excel file generated successfully",
            "filename": filename,
            "records_count": len(data)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting to Excel: {str(e)}")

@app.delete("/api/students/{student_id}")
def delete_student(student_id: int):
    """Delete a student and their associated data"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if student exists
        cursor.execute("SELECT * FROM students WHERE student_id = ?", (student_id,))
        student = cursor.fetchone()
        
        if not student:
            conn.close()
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Delete attendance records first (foreign key constraint)
        cursor.execute("DELETE FROM attendance WHERE student_id = ?", (student_id,))
        
        # Delete student
        cursor.execute("DELETE FROM students WHERE student_id = ?", (student_id,))
        
        conn.commit()
        conn.close()
        
        # Try to delete student images
        images_dir = Path("ImagesAttendance")
        if images_dir.exists():
            for image_file in images_dir.glob(f"{student_id}_*"):
                try:
                    image_file.unlink()
                except:
                    pass  # Continue if file deletion fails
        
        return {"message": "Student deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting student: {str(e)}")

# Camera/Test endpoints
@app.get("/api/camera/test")
async def test_camera():
    """Test camera availability"""
    try:
        available_cameras = []
        
        for i in range(5):  # Test first 5 camera indices
            cap = cv2.VideoCapture(i)
            if cap.isOpened():
                ret, frame = cap.read()
                if ret and frame is not None:
                    available_cameras.append({
                        "index": i,
                        "status": "available",
                        "resolution": f"{frame.shape[1]}x{frame.shape[0]}"
                    })
                else:
                    available_cameras.append({
                        "index": i,
                        "status": "opened_but_no_frame"
                    })
                cap.release()
            else:
                available_cameras.append({
                    "index": i,
                    "status": "not_available"
                })
        
        working_cameras = [cam for cam in available_cameras if cam["status"] == "available"]
        
        return {
            "cameras_found": len(working_cameras),
            "total_tested": len(available_cameras),
            "cameras": available_cameras,
            "primary_camera": working_cameras[0] if working_cameras else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error testing camera: {str(e)}")

if __name__ == "__main__":
    print("🚀 Starting Face Recognition Attendance API Server...")
    print("📡 API will be available at: http://localhost:8000")
    print("📖 API Documentation: http://localhost:8000/docs")
    print("🔄 CORS enabled for: http://localhost:3000")
    
    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )