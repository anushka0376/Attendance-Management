#!/usr/bin/env python3
"""
Simple FastAPI Backend for Face Recognition Attendance System
This version works without face_recognition library for testing
"""

from fastapi import FastAPI, HTTPException, File, UploadFile, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict
import sqlite3
import os
from datetime import datetime, timedelta

# Import authentication utilities
try:
    from auth_utils import (
        UserSignup, UserLogin, TokenResponse, UserResponse,
        authenticate_user, create_user_in_db, create_access_token,
        create_user_session, get_current_user, get_admin_user,
        user_to_response, get_all_users, deactivate_user,
        ACCESS_TOKEN_EXPIRE_MINUTES
    )
    AUTH_AVAILABLE = True
except ImportError:
    AUTH_AVAILABLE = False
    print("⚠️ Authentication not available")

# Import Google Sheets manager
try:
    from google_sheets_manager import GoogleSheetsManager
    GOOGLE_SHEETS_AVAILABLE = True
except ImportError:
    GOOGLE_SHEETS_AVAILABLE = False
    print("⚠️ Google Sheets integration not available")

# Initialize FastAPI app
app = FastAPI(
    title="Face Recognition Attendance API (Simple)",
    description="Backend API for testing frontend connectivity",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:3001",
        "http://127.0.0.1:3000", 
        "http://127.0.0.1:3001"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection
def get_db_connection():
    conn = sqlite3.connect('attendance.db')
    conn.row_factory = sqlite3.Row
    return conn

# Pydantic models
class StudentCreate(BaseModel):
    name: str
    roll_no: str
    group_name: str
    semester_name: str
    department_name: str

@app.get("/")
async def root():
    return {"message": "Face Recognition Attendance API is running"}

@app.get("/api/system/status")
async def get_system_status():
    return {
        "platform": "Windows",
        "opencv_version": "4.11.0", 
        "face_recognition_available": False,
        "google_sheets_available": False,
        "internet_connected": True
    }

@app.get("/api/students")
async def get_students():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT s.student_id, s.name, s.roll_no, s.class_name, 
                   s.semester_id, s.group_id, s.department_id
            FROM students s
            ORDER BY s.name
        """)
        
        students = []
        for row in cursor.fetchall():
            students.append({
                "student_id": row["student_id"],
                "name": row["name"],
                "roll_no": row["roll_no"],
                "class_name": row["class_name"],
                "group_name": row["class_name"],  # For compatibility
                "semester_id": row["semester_id"],
                "department_id": row["department_id"]
            })
        
        conn.close()
        return {"students": students}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching students: {str(e)}")

@app.post("/api/students")
async def create_student(student: StudentCreate):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert student
        cursor.execute("""
            INSERT INTO students (name, roll_no, class_name)
            VALUES (?, ?, ?)
        """, (student.name, student.roll_no, student.group_name))
        
        student_id = cursor.lastrowid
        
        conn.commit()
        conn.close()
        
        return {
            "message": "Student created successfully",
            "student_id": student_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating student: {str(e)}")

@app.get("/api/attendance")
async def get_attendance():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # First check if status column exists
        cursor.execute("PRAGMA table_info(attendance)")
        columns = [column[1] for column in cursor.fetchall()]
        has_status_column = 'status' in columns
        
        if has_status_column:
            cursor.execute("""
                SELECT a.attendance_id, a.student_id, a.date, a.day, 
                       a.entry_time, a.timestamp, 
                       COALESCE(a.status, 'Present') as status, 
                       s.name, s.roll_no, s.class_name
                FROM attendance a
                JOIN students s ON a.student_id = s.student_id
                ORDER BY a.timestamp DESC
            """)
        else:
            cursor.execute("""
                SELECT a.attendance_id, a.student_id, a.date, a.day, 
                       a.entry_time, a.timestamp, s.name, s.roll_no, s.class_name
                FROM attendance a
                JOIN students s ON a.student_id = s.student_id
                ORDER BY a.timestamp DESC
            """)
        
        attendance_records = []
        for row in cursor.fetchall():
            record_data = {
                "attendance_id": row["attendance_id"],
                "student_id": row["student_id"],
                "student_name": row["name"],
                "roll_no": row["roll_no"],
                "class_name": row["class_name"],
                "date": row["date"],
                "day": row["day"],
                "entry_time": row["entry_time"],
                "timestamp": row["timestamp"]
            }
            
            # Add status if column exists
            if has_status_column:
                record_data["status"] = row["status"] or "Present"
            else:
                record_data["status"] = "Present"
                
            attendance_records.append(record_data)
        
        conn.close()
        return {"attendance": attendance_records, "count": len(attendance_records)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching attendance: {str(e)}")

@app.post("/api/attendance/mark")
async def mark_attendance(student_ids: List[int]):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        current_time = datetime.now()
        today_date = current_time.strftime('%Y-%m-%d')
        
        marked_students = []
        
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
                # Check if status column exists before inserting
                cursor.execute("PRAGMA table_info(attendance)")
                columns = [column[1] for column in cursor.fetchall()]
                has_status_column = 'status' in columns
                
                if has_status_column:
                    # Mark attendance with status
                    cursor.execute("""
                        INSERT INTO attendance (student_id, date, day, entry_time, timestamp, status)
                        VALUES (?, ?, ?, ?, ?, 'Present')
                    """, (
                        student_id, today_date, current_time.strftime('%A'),
                        current_time.strftime('%H:%M:%S'), current_time.strftime('%Y-%m-%d %H:%M:%S')
                    ))
                else:
                    # Mark attendance without status (backward compatibility)
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
        
        conn.commit()
        conn.close()
        
        # Auto-sync to Google Sheets if available
        if GOOGLE_SHEETS_AVAILABLE:
            try:
                sheets_manager = GoogleSheetsManager()
                if sheets_manager.client and sheets_manager.create_or_get_sheet("Face Recognition Attendance System"):
                    sheets_manager.sync_attendance_to_sheets()
            except Exception as sync_error:
                print(f"⚠️ Google Sheets auto-sync failed: {sync_error}")
        
        return {
            "message": f"Attendance marked for {len(marked_students)} students",
            "marked_students": marked_students
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error marking attendance: {str(e)}")

@app.post("/api/attendance/mark-absent")
async def mark_absent(student_ids: List[int]):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        current_time = datetime.now()
        today_date = current_time.strftime('%Y-%m-%d')
        
        marked_absent_students = []
        
        for student_id in student_ids:
            # Check if student exists
            cursor.execute("SELECT name, roll_no FROM students WHERE student_id = ?", (student_id,))
            student = cursor.fetchone()
            
            if not student:
                continue
            
            # First, remove any existing attendance record for today
            cursor.execute(
                "DELETE FROM attendance WHERE student_id = ? AND date = ?",
                (student_id, today_date)
            )
            
            # Check if status column exists
            cursor.execute("PRAGMA table_info(attendance)")
            columns = [column[1] for column in cursor.fetchall()]
            has_status_column = 'status' in columns
            
            if has_status_column:
                # Insert an "Absent" record with status
                cursor.execute("""
                    INSERT INTO attendance (student_id, date, day, entry_time, timestamp, status)
                    VALUES (?, ?, ?, ?, ?, 'Absent')
                """, (
                    student_id, today_date, current_time.strftime('%A'),
                    current_time.strftime('%H:%M:%S'), current_time.strftime('%Y-%m-%d %H:%M:%S')
                ))
            else:
                # For backward compatibility, don't insert anything for absent (old behavior)
                pass
            
            marked_absent_students.append({
                "student_id": student_id,
                "name": student["name"],
                "roll_no": student["roll_no"]
            })
        
        conn.commit()
        conn.close()
        
        return {
            "message": f"Marked {len(marked_absent_students)} students as absent",
            "absent_students": marked_absent_students
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error marking absent: {str(e)}")

@app.post("/api/attendance/verify-image")
async def verify_attendance_by_image(file: UploadFile = File(...)):
    """
    Simulate face recognition for testing purposes
    In a real implementation, this would use face_recognition library
    """
    try:
        # Simulate face recognition - for testing, randomly match a student
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get a random student for demonstration
        cursor.execute("SELECT student_id, name, roll_no FROM students ORDER BY RANDOM() LIMIT 1")
        student = cursor.fetchone()
        
        if not student:
            return {
                "student_found": False,
                "confidence": 0.0,
                "message": "No students in database"
            }
        
        # Check if already marked today
        today_date = datetime.now().strftime('%Y-%m-%d')
        cursor.execute(
            "SELECT COUNT(*) FROM attendance WHERE student_id = ? AND date = ?",
            (student["student_id"], today_date)
        )
        
        already_marked = cursor.fetchone()[0] > 0
        
        conn.close()
        
        return {
            "student_found": True,
            "student_id": student["student_id"],
            "student_name": student["name"],
            "roll_no": student["roll_no"],
            "confidence": 0.85,  # Simulated confidence
            "already_marked_today": already_marked,
            "message": "Face recognition simulated - random student matched for testing"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in face verification: {str(e)}")

@app.post("/api/students/{student_id}/images")
async def upload_student_images(student_id: int, files: List[UploadFile] = File(...)):
    """
    Upload and save student images in folder structure: images/{student_name}/{roll_no}_1.png
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get student details
        cursor.execute("SELECT name, roll_no FROM students WHERE student_id = ?", (student_id,))
        student = cursor.fetchone()
        
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        student_name = student['name']
        roll_no = student['roll_no']
        
        # Create directory structure: images/{student_name}/
        base_dir = os.path.join("Realtime_faceRecognition-and-Industry-workplace-compilance- copy 2", "images")
        student_dir = os.path.join(base_dir, student_name)
        os.makedirs(student_dir, exist_ok=True)
        
        uploaded_files = []
        
        # Save each uploaded file
        for i, file in enumerate(files):
            # Create filename: {roll_no}_{index}.png
            file_extension = os.path.splitext(file.filename)[1] if file.filename else '.png'
            filename = f"{roll_no}_{i+1}{file_extension}"
            file_path = os.path.join(student_dir, filename)
            
            # Save the file
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            
            uploaded_files.append(filename)
        
        conn.close()
        
        return {
            "message": f"Images uploaded successfully for {student_name}",
            "uploaded_count": len(uploaded_files),
            "student_id": student_id,
            "student_name": student_name,
            "roll_no": roll_no,
            "saved_files": uploaded_files,
            "folder_path": student_dir
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading images: {str(e)}")

@app.delete("/api/students/{student_id}")
async def delete_student(student_id: int):
    """Delete a student from the database"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if student exists
        cursor.execute("SELECT name FROM students WHERE student_id = ?", (student_id,))
        student = cursor.fetchone()
        
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Delete student (this will also cascade delete related attendance records)
        cursor.execute("DELETE FROM students WHERE student_id = ?", (student_id,))
        cursor.execute("DELETE FROM attendance WHERE student_id = ?", (student_id,))
        
        conn.commit()
        conn.close()
        
        return {"message": f"Student {student['name']} deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting student: {str(e)}")

# Google Sheets Integration Endpoints
@app.get("/api/sheets/status")
async def get_sheets_status():
    """Get Google Sheets integration status"""
    return {
        "available": GOOGLE_SHEETS_AVAILABLE,
        "message": "Google Sheets integration ready" if GOOGLE_SHEETS_AVAILABLE else "Google Sheets libraries not installed"
    }

@app.post("/api/sheets/sync-students")
async def sync_students_to_sheets():
    """Sync all students to Google Sheets"""
    if not GOOGLE_SHEETS_AVAILABLE:
        raise HTTPException(status_code=503, detail="Google Sheets integration not available")
    
    try:
        sheets_manager = GoogleSheetsManager()
        if not sheets_manager.client:
            raise HTTPException(status_code=500, detail="Failed to connect to Google Sheets")
        
        if sheets_manager.create_or_get_sheet("Face Recognition Attendance System"):
            success = sheets_manager.sync_students_to_sheets()
            if success:
                return {
                    "message": "Students synced to Google Sheets successfully",
                    "sheet_url": sheets_manager.get_sheet_url()
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to sync students")
        else:
            raise HTTPException(status_code=500, detail="Failed to create/access Google Sheet")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error syncing students: {str(e)}")

@app.post("/api/sheets/sync-attendance")
async def sync_attendance_to_sheets(date: Optional[str] = None):
    """Sync attendance records to Google Sheets"""
    if not GOOGLE_SHEETS_AVAILABLE:
        raise HTTPException(status_code=503, detail="Google Sheets integration not available")
    
    try:
        sheets_manager = GoogleSheetsManager()
        if not sheets_manager.client:
            raise HTTPException(status_code=500, detail="Failed to connect to Google Sheets")
        
        if sheets_manager.create_or_get_sheet("Face Recognition Attendance System"):
            success = sheets_manager.sync_attendance_to_sheets(date)
            if success:
                return {
                    "message": f"Attendance synced to Google Sheets successfully for {date or 'today'}",
                    "sheet_url": sheets_manager.get_sheet_url()
                }
            else:
                return {
                    "message": f"No attendance records found for {date or 'today'}",
                    "sheet_url": sheets_manager.get_sheet_url()
                }
        else:
            raise HTTPException(status_code=500, detail="Failed to create/access Google Sheet")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error syncing attendance: {str(e)}")

@app.post("/api/sheets/generate-summary")
async def generate_monthly_summary(month: Optional[str] = None):
    """Generate monthly attendance summary in Google Sheets"""
    if not GOOGLE_SHEETS_AVAILABLE:
        raise HTTPException(status_code=503, detail="Google Sheets integration not available")
    
    try:
        sheets_manager = GoogleSheetsManager()
        if not sheets_manager.client:
            raise HTTPException(status_code=500, detail="Failed to connect to Google Sheets")
        
        if sheets_manager.create_or_get_sheet("Face Recognition Attendance System"):
            success = sheets_manager.generate_monthly_summary(month)
            if success:
                return {
                    "message": f"Monthly summary generated for {month or 'current month'}",
                    "sheet_url": sheets_manager.get_sheet_url()
                }
            else:
                return {
                    "message": f"No data found for {month or 'current month'}",
                    "sheet_url": sheets_manager.get_sheet_url()
                }
        else:
            raise HTTPException(status_code=500, detail="Failed to create/access Google Sheet")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating summary: {str(e)}")

@app.get("/api/sheets/url")
async def get_sheet_url():
    """Get the Google Sheet URL"""
    if not GOOGLE_SHEETS_AVAILABLE:
        raise HTTPException(status_code=503, detail="Google Sheets integration not available")
    
    try:
        sheets_manager = GoogleSheetsManager()
        if sheets_manager.create_or_get_sheet("Face Recognition Attendance System"):
            return {
                "sheet_url": sheets_manager.get_sheet_url(),
                "message": "Google Sheet is ready"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to access Google Sheet")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting sheet URL: {str(e)}")

# ========== AUTHENTICATION ENDPOINTS ==========

@app.post("/api/auth/login", response_model=TokenResponse)
async def login(login_data: UserLogin, request: Request):
    """User login endpoint"""
    if not AUTH_AVAILABLE:
        raise HTTPException(status_code=500, detail="Authentication not available")
    
    try:
        # Authenticate user
        user = authenticate_user(login_data.username, login_data.password)
        if not user:
            raise HTTPException(
                status_code=401,
                detail="Incorrect username or password"
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user["user_id"], "username": user["username"], "role": user["role"]},
            expires_delta=access_token_expires
        )
        
        # Create session
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        session_id = create_user_session(user["user_id"], access_token, client_ip, user_agent)
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=user_to_response(user),
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

@app.post("/api/auth/signup", response_model=UserResponse)
async def signup(user_data: UserSignup, request: Request):
    """Create new user - Public endpoint for self-registration"""
    if not AUTH_AVAILABLE:
        raise HTTPException(status_code=500, detail="Authentication not available")
    
    try:
        # Check if there's an authorization header (logged in user)
        auth_header = request.headers.get("authorization")
        created_by = None
        
        if auth_header and auth_header.startswith("Bearer "):
            try:
                # If user is logged in, get their info for created_by field
                from auth_utils import get_current_user
                # This is a simplified check - in production you'd want full validation
                token = auth_header.split(" ")[1]
                # For now, we'll allow any authenticated user to create accounts
                # In a stricter system, you'd check if they're admin
                pass
            except:
                pass  # Continue without created_by if token is invalid
        
        # Create user (publicly accessible)
        new_user = create_user_in_db(user_data, created_by)
        return user_to_response(new_user)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"User creation failed: {str(e)}")

@app.post("/api/auth/admin/create-user", response_model=UserResponse)
async def admin_create_user(user_data: UserSignup, current_user: Dict = Depends(get_admin_user)):
    """Create new user (Admin only - protected endpoint)"""
    if not AUTH_AVAILABLE:
        raise HTTPException(status_code=500, detail="Authentication not available")
    
    try:
        # Create user with admin context
        new_user = create_user_in_db(user_data, current_user["user_id"])
        return user_to_response(new_user)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"User creation failed: {str(e)}")

@app.get("/api/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: Dict = Depends(get_current_user)):
    """Get current user information"""
    if not AUTH_AVAILABLE:
        raise HTTPException(status_code=500, detail="Authentication not available")
    
    return user_to_response(current_user)

@app.get("/api/auth/users")
async def list_users(current_user: Dict = Depends(get_admin_user)):
    """Get all users (Admin only)"""
    if not AUTH_AVAILABLE:
        raise HTTPException(status_code=500, detail="Authentication not available")
    
    try:
        users = get_all_users(current_user)
        return {"users": users}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get users: {str(e)}")

@app.delete("/api/auth/users/{user_id}")
async def deactivate_user_endpoint(user_id: str, current_user: Dict = Depends(get_admin_user)):
    """Deactivate user (Admin only)"""
    if not AUTH_AVAILABLE:
        raise HTTPException(status_code=500, detail="Authentication not available")
    
    try:
        success = deactivate_user(user_id, current_user)
        if success:
            return {"message": "User deactivated successfully"}
        else:
            raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to deactivate user: {str(e)}")

@app.post("/api/auth/logout")
async def logout(current_user: Dict = Depends(get_current_user)):
    """Logout user and invalidate session"""
    if not AUTH_AVAILABLE:
        raise HTTPException(status_code=500, detail="Authentication not available")
    
    try:
        # In a full implementation, you'd invalidate the token in the database
        return {"message": "Logged out successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Logout failed: {str(e)}")

# Protected endpoint example - Update existing endpoints to use authentication
@app.post("/api/mark-attendance")
async def mark_attendance_protected(
    student_id: int,
    current_user: Dict = Depends(get_current_user)
):
    """Mark attendance with user context"""
    try:
        conn = sqlite3.connect("attendance.db")
        cursor = conn.cursor()
        
        # Check if student exists
        cursor.execute("SELECT name FROM students WHERE student_id = ?", (student_id,))
        student = cursor.fetchone()
        
        if not student:
            conn.close()
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Check if already marked today
        today = datetime.now().strftime('%Y-%m-%d')
        cursor.execute(
            "SELECT * FROM attendance WHERE student_id = ? AND date = ?",
            (student_id, today)
        )
        existing = cursor.fetchone()
        
        if existing:
            conn.close()
            return {"message": "Attendance already marked for today", "status": "duplicate"}
        
        # Mark attendance with user context
        now = datetime.now()
        cursor.execute('''
            INSERT INTO attendance (student_id, date, entry_time, timestamp, marked_by, marking_method)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (student_id, today, now.strftime('%H:%M:%S'), 
              now.strftime('%Y-%m-%d %H:%M:%S'), current_user["user_id"], "manual"))
        
        conn.commit()
        conn.close()
        
        # Sync with Google Sheets if available
        if GOOGLE_SHEETS_AVAILABLE:
            try:
                sheets_manager = GoogleSheetsManager()
                sheets_manager.sync_attendance_to_sheets()
            except Exception as e:
                print(f"Warning: Google Sheets sync failed: {e}")
        
        return {
            "message": f"Attendance marked for {student[0]}",
            "student_name": student[0],
            "marked_by": current_user["full_name"],
            "time": now.strftime('%H:%M:%S')
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error marking attendance: {str(e)}")

# ============= Profile Management Endpoints =============

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    department: Optional[str] = None
    employee_id: Optional[str] = None
    qualification: Optional[str] = None
    experience: Optional[str] = None
    specialization: Optional[str] = None

@app.get("/api/profile", response_model=UserResponse)
async def get_profile(current_user: Dict = Depends(get_current_user)):
    """Get current user's profile"""
    if not AUTH_AVAILABLE:
        raise HTTPException(status_code=500, detail="Authentication not available")
    
    try:
        return user_to_response(current_user)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get profile: {str(e)}")

@app.put("/api/profile", response_model=UserResponse)
async def update_profile(
    profile_data: ProfileUpdate,
    current_user: Dict = Depends(get_current_user)
):
    """Update current user's profile"""
    if not AUTH_AVAILABLE:
        raise HTTPException(status_code=500, detail="Authentication not available")
    
    try:
        conn = sqlite3.connect("attendance.db")
        cursor = conn.cursor()
        
        # Build update query dynamically for non-None fields
        update_fields = []
        update_values = []
        
        if profile_data.full_name is not None:
            update_fields.append("full_name = ?")
            update_values.append(profile_data.full_name.strip())
            
        if profile_data.email is not None:
            # Check if email is already taken by another user
            cursor.execute("SELECT user_id FROM users WHERE email = ? AND user_id != ?", 
                         (profile_data.email.strip(), current_user["user_id"]))
            if cursor.fetchone():
                conn.close()
                raise HTTPException(status_code=400, detail="Email already exists")
            update_fields.append("email = ?")
            update_values.append(profile_data.email.strip())
            
        if profile_data.phone_number is not None:
            update_fields.append("phone_number = ?")
            update_values.append(profile_data.phone_number.strip())
            
        if profile_data.department is not None:
            update_fields.append("department = ?")
            update_values.append(profile_data.department.strip())
            
        if profile_data.employee_id is not None:
            update_fields.append("employee_id = ?")
            update_values.append(profile_data.employee_id.strip())
            
        if profile_data.qualification is not None:
            update_fields.append("qualification = ?")
            update_values.append(profile_data.qualification)
            
        if profile_data.experience is not None:
            update_fields.append("experience = ?")
            update_values.append(profile_data.experience)
            
        if profile_data.specialization is not None:
            update_fields.append("specialization = ?")
            update_values.append(profile_data.specialization.strip())
        
        if not update_fields:
            conn.close()
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Add last_login update
        update_fields.append("last_login = CURRENT_TIMESTAMP")
        update_values.append(current_user["user_id"])
        
        # Execute update query
        query = f"UPDATE users SET {', '.join(update_fields)} WHERE user_id = ?"
        cursor.execute(query, update_values)
        
        # Get updated user data
        cursor.execute("""
            SELECT user_id, username, email, full_name, role, is_active, 
                   created_at, department, phone_number, employee_id, 
                   qualification, experience, specialization
            FROM users WHERE user_id = ?
        """, (current_user["user_id"],))
        
        updated_user = cursor.fetchone()
        if not updated_user:
            conn.close()
            raise HTTPException(status_code=404, detail="User not found after update")
        
        conn.commit()
        conn.close()
        
        # Convert to dict
        updated_user_dict = {
            "user_id": updated_user[0],
            "username": updated_user[1],
            "email": updated_user[2],
            "full_name": updated_user[3],
            "role": updated_user[4],
            "is_active": updated_user[5],
            "created_at": updated_user[6],
            "department": updated_user[7],
            "phone_number": updated_user[8],
            "employee_id": updated_user[9],
            "qualification": updated_user[10],
            "experience": updated_user[11],
            "specialization": updated_user[12]
        }
        
        return user_to_response(updated_user_dict)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")

class PasswordChange(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

@app.put("/api/profile/password")
async def change_password(
    password_data: PasswordChange,
    current_user: Dict = Depends(get_current_user)
):
    """Change user's password"""
    if not AUTH_AVAILABLE:
        raise HTTPException(status_code=500, detail="Authentication not available")
    
    try:
        # Import password hashing function
        from auth_utils import hash_password, verify_password
        
        # Validate new password
        if len(password_data.new_password) < 6:
            raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
        
        if password_data.new_password != password_data.confirm_password:
            raise HTTPException(status_code=400, detail="New passwords do not match")
        
        conn = sqlite3.connect("attendance.db")
        cursor = conn.cursor()
        
        # Get current password hash
        cursor.execute("SELECT password_hash FROM users WHERE user_id = ?", 
                      (current_user["user_id"],))
        result = cursor.fetchone()
        
        if not result:
            conn.close()
            raise HTTPException(status_code=404, detail="User not found")
        
        current_password_hash = result[0]
        
        # Verify current password
        if not verify_password(password_data.current_password, current_password_hash):
            conn.close()
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        
        # Update password
        new_password_hash = hash_password(password_data.new_password)
        cursor.execute(
            "UPDATE users SET password_hash = ?, last_login = CURRENT_TIMESTAMP WHERE user_id = ?",
            (new_password_hash, current_user["user_id"])
        )
        
        conn.commit()
        conn.close()
        
        return {"message": "Password changed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to change password: {str(e)}")

# ============= Student Management Endpoints =============

class StudentCreate(BaseModel):
    name: str
    roll_no: str
    class_name: str
    email: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    roll_no: Optional[str] = None
    class_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None

class StudentResponse(BaseModel):
    student_id: int
    name: str
    roll_no: str
    class_name: str
    email: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None
    created_at: str
    total_attendance: Optional[int] = 0

@app.get("/api/students")
async def get_all_students(current_user: Dict = Depends(get_current_user)):
    """Get all students with pagination"""
    if not AUTH_AVAILABLE:
        raise HTTPException(status_code=500, detail="Authentication not available")
    
    try:
        conn = sqlite3.connect("attendance.db")
        cursor = conn.cursor()
        
        # Check if students table has additional columns
        cursor.execute("PRAGMA table_info(students)")
        columns = [column[1] for column in cursor.fetchall()]
        
        # Base query
        base_columns = "student_id, name, roll_no, class_name"
        additional_columns = []
        
        if 'email' in columns:
            additional_columns.append('email')
        if 'phone_number' in columns:
            additional_columns.append('phone_number')
        if 'address' in columns:
            additional_columns.append('address')
        if 'guardian_name' in columns:
            additional_columns.append('guardian_name')
        if 'guardian_phone' in columns:
            additional_columns.append('guardian_phone')
        if 'created_at' in columns:
            additional_columns.append('created_at')
        
        all_columns = base_columns + (", " + ", ".join(additional_columns) if additional_columns else "")
        
        cursor.execute(f"SELECT {all_columns} FROM students ORDER BY name")
        students_data = cursor.fetchall()
        
        students = []
        for row in students_data:
            student_dict = {
                'student_id': row[0],
                'name': row[1], 
                'roll_no': row[2],
                'class_name': row[3]
            }
            
            # Add additional columns if they exist
            col_index = 4
            for col in additional_columns:
                if col_index < len(row):
                    student_dict[col] = row[col_index]
                    col_index += 1
                else:
                    student_dict[col] = None
            
            # Get attendance count
            cursor.execute("SELECT COUNT(*) FROM attendance WHERE student_id = ?", (row[0],))
            attendance_count = cursor.fetchone()[0] or 0
            student_dict['total_attendance'] = attendance_count
            
            students.append(student_dict)
        
        conn.close()
        return {"students": students, "count": len(students)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get students: {str(e)}")

@app.get("/api/students/{student_id}", response_model=StudentResponse)
async def get_student(student_id: int, current_user: Dict = Depends(get_current_user)):
    """Get a specific student by ID"""
    if not AUTH_AVAILABLE:
        raise HTTPException(status_code=500, detail="Authentication not available")
    
    try:
        conn = sqlite3.connect("attendance.db")
        cursor = conn.cursor()
        
        # Check available columns
        cursor.execute("PRAGMA table_info(students)")
        columns = [column[1] for column in cursor.fetchall()]
        
        base_columns = "student_id, name, roll_no, class_name"
        additional_columns = []
        
        for col in ['email', 'phone_number', 'address', 'guardian_name', 'guardian_phone', 'created_at']:
            if col in columns:
                additional_columns.append(col)
        
        all_columns = base_columns + (", " + ", ".join(additional_columns) if additional_columns else "")
        
        cursor.execute(f"SELECT {all_columns} FROM students WHERE student_id = ?", (student_id,))
        student_data = cursor.fetchone()
        
        if not student_data:
            conn.close()
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Build student dict
        student = {
            'student_id': student_data[0],
            'name': student_data[1],
            'roll_no': student_data[2], 
            'class_name': student_data[3]
        }
        
        # Add additional fields
        col_index = 4
        for col in additional_columns:
            if col_index < len(student_data):
                student[col] = student_data[col_index]
                col_index += 1
            else:
                student[col] = None
        
        # Get attendance count
        cursor.execute("SELECT COUNT(*) FROM attendance WHERE student_id = ?", (student_id,))
        attendance_count = cursor.fetchone()[0] or 0
        student['total_attendance'] = attendance_count
        
        conn.close()
        return student
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get student: {str(e)}")

@app.put("/api/students/{student_id}", response_model=StudentResponse)
async def update_student(
    student_id: int, 
    student_data: StudentUpdate,
    current_user: Dict = Depends(get_current_user)
):
    """Update student information"""
    if not AUTH_AVAILABLE:
        raise HTTPException(status_code=500, detail="Authentication not available")
    
    try:
        conn = sqlite3.connect("attendance.db")
        cursor = conn.cursor()
        
        # Check if student exists
        cursor.execute("SELECT student_id FROM students WHERE student_id = ?", (student_id,))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Check available columns
        cursor.execute("PRAGMA table_info(students)")
        available_columns = [column[1] for column in cursor.fetchall()]
        
        # Build update query for available fields
        update_fields = []
        update_values = []
        
        # Check each field and add if column exists
        field_mappings = {
            'name': student_data.name,
            'roll_no': student_data.roll_no,
            'class_name': student_data.class_name,
            'email': student_data.email,
            'phone_number': student_data.phone_number,
            'address': student_data.address,
            'guardian_name': student_data.guardian_name,
            'guardian_phone': student_data.guardian_phone
        }
        
        for field_name, field_value in field_mappings.items():
            if field_value is not None and field_name in available_columns:
                update_fields.append(f"{field_name} = ?")
                update_values.append(field_value.strip() if isinstance(field_value, str) else field_value)
        
        if not update_fields:
            conn.close()
            raise HTTPException(status_code=400, detail="No valid fields to update")
        
        # Check for duplicate roll number
        if student_data.roll_no:
            cursor.execute(
                "SELECT student_id FROM students WHERE roll_no = ? AND student_id != ?", 
                (student_data.roll_no.strip(), student_id)
            )
            if cursor.fetchone():
                conn.close()
                raise HTTPException(status_code=400, detail="Roll number already exists")
        
        # Execute update
        update_values.append(student_id)
        query = f"UPDATE students SET {', '.join(update_fields)} WHERE student_id = ?"
        cursor.execute(query, update_values)
        
        conn.commit()
        conn.close()
        
        # Return updated student
        return await get_student(student_id, current_user)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update student: {str(e)}")

@app.post("/api/students", response_model=StudentResponse)
async def create_student(
    student_data: StudentCreate,
    current_user: Dict = Depends(get_current_user)
):
    """Create a new student"""
    if not AUTH_AVAILABLE:
        raise HTTPException(status_code=500, detail="Authentication not available")
    
    try:
        conn = sqlite3.connect("attendance.db")
        cursor = conn.cursor()
        
        # Check for duplicate roll number
        cursor.execute("SELECT student_id FROM students WHERE roll_no = ?", (student_data.roll_no.strip(),))
        if cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=400, detail="Roll number already exists")
        
        # Check available columns
        cursor.execute("PRAGMA table_info(students)")
        available_columns = [column[1] for column in cursor.fetchall()]
        
        # Build insert query based on available columns
        base_columns = ['name', 'roll_no', 'class_name']
        base_values = [student_data.name.strip(), student_data.roll_no.strip(), student_data.class_name.strip()]
        
        optional_fields = {
            'email': student_data.email,
            'phone_number': student_data.phone_number,
            'address': student_data.address,
            'guardian_name': student_data.guardian_name,
            'guardian_phone': student_data.guardian_phone
        }
        
        # Add optional fields that exist in the table
        additional_columns = []
        additional_values = []
        
        for field, value in optional_fields.items():
            if field in available_columns and value is not None:
                additional_columns.append(field)
                additional_values.append(value.strip() if isinstance(value, str) else value)
        
        # Add created_at if column exists
        if 'created_at' in available_columns:
            additional_columns.append('created_at')
            additional_values.append(datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
        
        all_columns = base_columns + additional_columns
        all_values = base_values + additional_values
        
        # Create placeholders
        placeholders = ', '.join(['?'] * len(all_columns))
        columns_str = ', '.join(all_columns)
        
        cursor.execute(f"INSERT INTO students ({columns_str}) VALUES ({placeholders})", all_values)
        student_id = cursor.lastrowid
        
        conn.commit()
        conn.close()
        
        # Return created student
        return await get_student(student_id, current_user)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create student: {str(e)}")

@app.delete("/api/students/{student_id}")
async def delete_student(student_id: int, current_user: Dict = Depends(get_current_user)):
    """Delete a student (admin only)"""
    if not AUTH_AVAILABLE:
        raise HTTPException(status_code=500, detail="Authentication not available")
    
    # Check if user is admin
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only administrators can delete students")
    
    try:
        conn = sqlite3.connect("attendance.db")
        cursor = conn.cursor()
        
        # Check if student exists
        cursor.execute("SELECT name FROM students WHERE student_id = ?", (student_id,))
        student = cursor.fetchone()
        if not student:
            conn.close()
            raise HTTPException(status_code=404, detail="Student not found")
        
        student_name = student[0]
        
        # Delete attendance records first
        cursor.execute("DELETE FROM attendance WHERE student_id = ?", (student_id,))
        
        # Delete student
        cursor.execute("DELETE FROM students WHERE student_id = ?", (student_id,))
        
        conn.commit()
        conn.close()
        
        return {"message": f"Student {student_name} and all attendance records deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete student: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Simple Face Recognition Attendance API Server...")
    print("📡 API will be available at: http://127.0.0.1:8000")
    print("🔄 CORS enabled for: localhost:3000, localhost:3001, 127.0.0.1:3000, 127.0.0.1:3001")
    uvicorn.run(app, host="127.0.0.1", port=8000)