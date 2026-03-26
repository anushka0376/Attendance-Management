#!/usr/bin/env python3
"""
Face Recognition Attendance System - Supabase Backend
"""

from fastapi import FastAPI, HTTPException, File, UploadFile, Depends, Request, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import cv2
import numpy as np
import face_recognition
import asyncio
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ SUPABASE_URL and SUPABASE_KEY must be set in .env")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Initialized FastAPI app
app = FastAPI(
    title="Face Recognition Attendance API",
    description="Supabase-backed API for Face Recognition Attendance System",
    version="2.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Authentication ---
from auth_utils import (
    get_current_user, 
    UserSignup, 
    UserLogin, 
    UserResponse, 
    TokenResponse, 
    ResetPasswordRequest,
    UpdatePasswordRequest,
    authenticate_user, 
    create_user_in_db, 
    get_user_by_id, 
    upload_profile_photo, 
    upload_student_image,
    trigger_reset_password,
    update_user_password
)

@app.post("/api/auth/login")
async def login(credentials: UserLogin):
    user_data = await authenticate_user(credentials.username, credentials.password)
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return user_data

@app.post("/api/auth/signup")
async def signup(
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    full_name: str = Form(...),
    role: str = Form("teacher"),
    department: Optional[str] = Form(None),
    phone_number: Optional[str] = Form(None),
    employee_id: Optional[str] = Form(None),
    qualification: Optional[str] = Form(None),
    experience: Optional[str] = Form(None),
    specialization: Optional[str] = Form(None),
    profile_photo: Optional[UploadFile] = File(None)
):
    try:
        from auth_utils import upload_profile_photo
        profile_photo_url = None
        if profile_photo:
            content = await profile_photo.read()
            profile_photo_url = await upload_profile_photo(content, profile_photo.filename)
            
        new_user = await create_user_in_db(
            username=username,
            email=email,
            password=password,
            full_name=full_name,
            role=role,
            department=department,
            phone_number=phone_number,
            employee_id=employee_id,
            qualification=qualification,
            experience=experience,
            specialization=specialization,
            profile_photo_url=profile_photo_url
        )
        return new_user
    except Exception as e:
        print(f"Signup error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return user

@app.post("/api/auth/reset-password")
async def reset_password_request(request: ResetPasswordRequest, req: Request):
    # Frontend URL (e.g., http://localhost:3000)
    # Supabase will append the token to the redirect_to URL
    origin = req.headers.get("origin") or "http://localhost:3000"
    redirect_to = f"{origin}/reset-password"
    
    success = await trigger_reset_password(request.email, redirect_to)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to send reset email")
    return {"message": "Reset email sent successfully"}

@app.post("/api/auth/update-password")
async def update_password(request: UpdatePasswordRequest, req: Request):
    # Get the token from the Authorization header
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid session token")
    
    token = auth_header.split(" ")[1]
    success = await update_user_password(token, request.password)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update password")
    return {"message": "Password updated successfully"}

@app.put("/api/profile")
async def update_profile(
    user_updates: Dict[str, Any], 
    user: dict = Depends(get_current_user)
):
    try:
        user_id = user["user_id"]
        role = user["role"]
        table = "admins" if role == "admin" else "teachers"
        
        # Valid fields to update (exclude sensitive or read-only)
        allowed_fields = {
            "full_name", "department", "phone_number", 
            "employee_id", "qualification", "experience", 
            "specialization"
        }
        
        filtered_updates = {k: v for k, v in user_updates.items() if k in allowed_fields}
        
        if not filtered_updates:
            return user
            
        supabase.table(table).update(filtered_updates).eq("id", user_id).execute()
        
        # Fetch updated user
        updated_user = await get_user_by_id(user_id, role)
        return updated_user
    except Exception as e:
        print(f"Profile update error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/profile/photo")
async def update_profile_photo_endpoint(
    profile_photo: UploadFile = File(...), 
    user: dict = Depends(get_current_user)
):
    try:
        content = await profile_photo.read()
        photo_url = await upload_profile_photo(content, profile_photo.filename)
        
        if not photo_url:
            raise HTTPException(status_code=500, detail="Failed to upload photo")
            
        user_id = user["user_id"]
        role = user["role"]
        table = "admins" if role == "admin" else "teachers"
        
        supabase.table(table).update({"profile_photo_url": photo_url}).eq("id", user_id).execute()
        
        return {"profile_photo_url": photo_url}
    except Exception as e:
        print(f"Profile photo error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str

@app.put("/api/profile/password")
async def change_password(
    password_data: PasswordUpdate,
    user: dict = Depends(get_current_user)
):
    try:
      user_id = user["user_id"]
      username = user["username"]
      role = user["role"]
      table = "admins" if role == "admin" else "teachers"
      
      # Verify current password
      auth_res = await authenticate_user(username, password_data.current_password)
      if not auth_res:
          raise HTTPException(status_code=401, detail="Current password incorrect")
      
      # Update password (in production, use password hashing!)
      # Note: authenticate_user already handles the logic of finding the user
      supabase.table(table).update({"password": password_data.new_password}).eq("id", user_id).execute()
      
      return {"message": "Password updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Password update error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/auth/users")
async def get_all_users(user: dict = Depends(get_current_user)):
    """Get all users from normalized profiles table"""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        response = supabase.table("profiles").select("*").execute()
        users = [{"user_id": u["id"], **u} for u in response.data]
        return {"users": users}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/auth/users/{user_id}")
async def deactivate_user(user_id: str, user: dict = Depends(get_current_user)):
    """Remove user from profiles table"""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        supabase.table("profiles").delete().eq("id", user_id).execute()
        return {"message": "User deactivated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Profile Management ---
@app.put("/api/profile")
async def update_profile(data: dict, user: dict = Depends(get_current_user)):
    """Update current user profile in normalized profiles table"""
    try:
        user_id = user["user_id"]
        # Filter allowed fields
        allowed = ["full_name", "department", "phone_number", "employee_id", "qualification", "experience", "specialization"]
        update_data = {k: v for k, v in data.items() if k in allowed}
        
        if not update_data:
            return {"message": "No valid fields to update"}
            
        res = supabase.table("profiles").update(update_data).eq("id", user_id).execute()
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/profile/photo")
async def update_profile_photo(profile_photo: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Upload and update profile photo url"""
    try:
        user_id = user["user_id"]
        content = await profile_photo.read()
        
        # Reuse student image upload logic or separate profile bucket
        file_path = f"profiles/{user_id}_{profile_photo.filename}"
        supabase.storage.from_("avatars").upload(file_path, content, {"upsert": "true"})
        photo_url = supabase.storage.from_("avatars").get_public_url(file_path)
        
        # Update profiles table
        supabase.table("profiles").update({"avatar_url": photo_url}).eq("id", user_id).execute()
        
        return {"profile_photo_url": photo_url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return {"message": "User deactivated successfully"}
class BatchCreate(BaseModel):
    name: str
    start_year: int
    end_year: int
    degree_duration: int = 4

class StudentCreate(BaseModel):
    name: str
    roll_no: str
    batch_id: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None

# --- Academic Hub (Subjects & Classes) ---
@app.get("/api/academic/subjects")
async def get_all_subjects(user: dict = Depends(get_current_user)):
    """Fetch all subjects defined in the university curriculum"""
    try:
        res = supabase.table("subjects").select("*").order("name").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/academic/my-classes")
async def get_teacher_classes(user: dict = Depends(get_current_user)):
    """Fetch active classes for the current teacher with Batch and Subject details"""
    try:
        teacher_id = user["id"] if "id" in user else user.get("user_id")
        
        # Join query to get nested subject and batch info
        res = supabase.table("classes")\
            .select("*, subjects(name, code), batches(name)")\
            .eq("teacher_id", teacher_id)\
            .eq("is_active", True)\
            .execute()
            
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/academic/classes/{class_id}/students")
async def get_class_students(class_id: str, user: dict = Depends(get_current_user)):
    """Get all students enrolled in the batch associated with this class"""
    try:
        class_res = supabase.table("classes").select("batch_id").eq("id", class_id).execute()
        if not class_res.data:
            raise HTTPException(status_code=404, detail="Class not found")
            
        batch_id = class_res.data[0]["batch_id"]
        students_res = supabase.table("students").select("*").eq("batch_id", batch_id).execute()
        return students_res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Face Recognition Cache ---
# Global Cache for Face Recognition
class EncodingCache:
    def __init__(self):
        self.known_face_encodings: List[np.ndarray] = []
        self.known_face_metadata: List[Dict[str, Any]] = []
        self.last_refresh: Optional[datetime] = None

encoding_cache = EncodingCache()
CONFIDENCE_THRESHOLD = 0.6  # Lower is stricter (0.6 is standard for face_recognition)
LATE_THRESHOLD = "09:15:00" # Configurable threshold for late marking

async def load_known_faces():
    """Load all student encodings from Supabase into memory (Multi-Sample v2)"""
    global encoding_cache
    try:
        print("🔄 Refreshing face encodings from 'face_encodings' table...")
        # Join with students to get metadata
        response = supabase.table("face_encodings").select("encoding, student_id, students(name, batch_id)").execute()
        
        new_encodings = []
        new_metadata = []
        
        for record in response.data:
            encoding = np.array(record['encoding'])
            student_info = record['students']
            
            new_encodings.append(encoding)
            new_metadata.append({
                "id": record['student_id'],
                "name": student_info['name'],
                "batch_id": student_info.get('batch_id')
            })
            
        encoding_cache.known_face_encodings = new_encodings
        encoding_cache.known_face_metadata = new_metadata
        encoding_cache.last_refresh = datetime.now()
        
        print(f"✅ Loaded {len(new_encodings)} biometric samples for recognition.")
        return len(new_encodings)
    except Exception as e:
        print(f"❌ Error loading multi-sample faces: {e}")
        return 0

async def log_recognition_event(event_type: str, student_id: Optional[str] = None, confidence: Optional[float] = None, message: Optional[str] = None):
    """Log recognition events to Supabase for monitoring and analytics"""
    try:
        log_data = {
            "event_type": event_type,
            "student_id": student_id,
            "confidence": float(confidence) if confidence is not None else None,
            "message": message
        }
        supabase.table("recognition_logs").insert(log_data).execute()
    except Exception as e:
        print(f"⚠️ Failed to log event: {e}")

def check_liveness(image_np):
    """Detect if the image is too blurry (potential photo/screen spoof)"""
    gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)
    variance = cv2.Laplacian(gray, cv2.CV_64F).var()
    print(f"🔍 Liveness Check: Laplacian Variance = {variance:.2f}")
    return variance >= 100 # Threshold: 100 is generally considered focused/live

async def refresh_cache_periodically():
    while True:
        await asyncio.sleep(600)  # Refresh every 10 minutes (600 seconds)
        await load_known_faces()

@app.on_event("startup")
async def startup_event():
    await load_known_faces()
    asyncio.create_task(refresh_cache_periodically())

# --- Endpoints ---

@app.get("/")
async def root():
    return {"message": "Face Recognition Attendance API (Supabase) is running"}

@app.get("/api/system/status")
async def get_system_status():
    return {
        "database": "Supabase (Postgres)",
        "face_recognition": "Available",
        "loaded_students": len(encoding_cache.known_face_metadata),
        "last_cache_refresh": encoding_cache.last_refresh.isoformat() if encoding_cache.last_refresh else "Never",
        "confidence_threshold": CONFIDENCE_THRESHOLD
    }

# --- Batch Management ---
@app.get("/api/batches")
async def get_batches():
    try:
        response = supabase.table("batches").select("*").order("start_year", desc=True).execute()
        return {"batches": response.data, "count": len(response.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching batches: {str(e)}")

@app.post("/api/batches")
async def create_batch(batch: BatchCreate):
    try:
        data = batch.model_dump()
        try:
            response = supabase.table("batches").insert(data).execute()
            return {"batch": response.data[0], "message": "Batch created successfully"}
        except Exception as e:
            error_str = str(e)
            if "degree_duration" in error_str:
                print("⚠️ 'degree_duration' column missing in Supabase, retrying without it...")
                data.pop("degree_duration", None)
                response = supabase.table("batches").insert(data).execute()
                return {"batch": response.data[0], "message": "Batch created successfully (without duration)"}
            raise e
    except Exception as e:
        print(f"Error creating batch: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating batch: {str(e)}")

# --- Student Management ---
@app.get("/api/students")
async def get_students(batch_id: Optional[str] = None):
    try:
        query = supabase.table("students").select("*")
        if batch_id:
            query = query.eq("batch_id", batch_id)
        
        response = query.order("name").execute()
        return {"students": response.data, "count": len(response.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get students: {str(e)}")

@app.get("/api/attendance")
async def get_attendance(date: Optional[str] = None, batch_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    try:
        query = supabase.table("attendance").select("*, students(*)")
        
        if date:
            query = query.eq("date", date)
        else:
            # Default to today
            today = datetime.now().date().isoformat()
            query = query.eq("date", today)
            
        response = query.execute()
        records = response.data
        
        # Filter by batch_id if provided (Supabase join filtering is a bit tricky, so we can do it post-query or using .eq on nested)
        if batch_id and records:
            records = [r for r in records if r.get('students') and r['students'].get('batch_id') == batch_id]
            
        # Format for frontend
        formatted = []
        for r in records:
            student = r.get('students', {})
            formatted.append({
                "id": r['id'],
                "student_id": r['student_id'],
                "student_name": student.get('name', 'Unknown'),
                "student_roll": student.get('roll_no', 'N/A'),
                "date": r['date'],
                "entry_time": r['entry_time'],
                "status": r['status'],
                "batch_id": student.get('batch_id')
            })
            
        return {"attendance": formatted}
    except Exception as e:
        print(f"Error fetching attendance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/students")
async def create_student(student_data: StudentCreate):
    try:
        data = student_data.model_dump()
        try:
            response = supabase.table("students").insert(data).execute()
            return {"student": response.data[0], "message": "Student created successfully"}
        except Exception as e:
            error_str = str(e)
            # List of potential missing columns we can fallback on
            potential_missing = ["department", "phone", "email"]
            column_found = False
            for col in potential_missing:
                if col in error_str:
                    print(f"⚠️ '{col}' column missing in Supabase students table, retrying without it...")
                    data.pop(col, None)
                    column_found = True
            
            if column_found:
                response = supabase.table("students").insert(data).execute()
                return {"student": response.data[0], "message": "Student created successfully (with partial data)"}
            raise e
    except Exception as e:
        print(f"Error creating student: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating student: {str(e)}")

@app.delete("/api/students/{student_id}")
async def delete_student(student_id: str):
    try:
        supabase.table("students").delete().eq("id", student_id).execute()
        return {"message": "Student deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete student: {str(e)}")

# --- Attendance ---
@app.post("/api/attendance/mark")
async def mark_attendance(data: dict, user: dict = Depends(get_current_user)):
    """Mark attendance for students in a specific class session with duplicate protection"""
    try:
        student_ids = data.get("student_ids", [])
        class_id = data.get("class_id")
        status_override = data.get("status") # Manual override if provided
        today_date = data.get("date", datetime.now().strftime('%Y-%m-%d'))
        today_full = datetime.now()
        marking_method = data.get("method", "Face")
        
        if not student_ids or not class_id:
            raise HTTPException(status_code=400, detail="Missing student_ids or class_id")
            
        # 1. Fetch Class Info (to get Batch ID)
        class_info = supabase.table("classes").select("batch_id").eq("id", class_id).execute()
        if not class_info.data:
            raise HTTPException(status_code=404, detail="Class session not found")
        batch_id = class_info.data[0]["batch_id"]
            
        attendance_records = []
        for sid in student_ids:
            # 2. Duplicate Protection: Check if already marked for THIS CLASS today
            existing = supabase.table("attendance") \
                .select("id") \
                .eq("student_id", sid) \
                .eq("class_id", class_id) \
                .eq("date", today_date) \
                .execute()
                
            if existing.data:
                print(f"⚠️ Student {sid} already marked for class {class_id} today. Skipping.")
                continue

            # 3. Smart Status & Late Marking
            entry_time = today_full.strftime('%H:%M:%S')
            status = status_override or "Present"
            late_mins = 0
            
            # Auto-late detection for real-time marking
            if not status_override and entry_time > LATE_THRESHOLD:
                status = "Late"
                fmt = '%H:%M:%S'
                t_entry = datetime.strptime(entry_time, fmt)
                t_thresh = datetime.strptime(LATE_THRESHOLD, fmt)
                late_mins = int((t_entry - t_thresh).total_seconds() / 60)

            attendance_records.append({
                "student_id": sid,
                "class_id": class_id,
                "batch_id": batch_id,
                "date": today_date,
                "day": today_full.strftime('%A'),
                "entry_time": entry_time,
                "status": status,
                "late_minutes": late_mins,
                "marking_method": marking_method
            })
            
        if not attendance_records:
            return {"message": "All students already marked. No new records created."}

        res = supabase.table("attendance").insert(attendance_records).execute()
        return {"message": f"Successfully marked {len(res.data)} students", "records": res.data}
        
    except Exception as e:
        print(f"Error marking attendance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/attendance/recent")
async def get_recent_activity():
    try:
        response = supabase.table("attendance") \
            .select("*, students(name, roll_no)") \
            .order("created_at", desc=True) \
            .limit(10) \
            .execute()
        return {"attendance": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching recent activity: {str(e)}")

@app.post("/api/attendance/verify-image")
async def verify_attendance_by_image(file: UploadFile = File(...)):
    """Recognize faces in an image and return student details with multi-sample support"""
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image data")

        # 1. Anti-Spoofing: Liveness Check (Blur Detection)
        if not check_liveness(img):
            await log_recognition_event("spoof_detected", message="Blurry image - potential photo/video")
            return {
                "student_found": False, 
                "message": "Liveness Check Failed: Image quality too low or spoof detected.",
                "liveness_status": "fail"
            }

        # Convert to RGB for face_recognition
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Detect face locations and encodings
        face_locations = face_recognition.face_locations(rgb_img)
        face_encodings = face_recognition.face_encodings(rgb_img, face_locations)

        recognized_students = []
        
        if not encoding_cache.known_face_encodings:
            await log_recognition_event("failure", message="No encodings in cache")
            return {"students": [], "message": "No students enrolled yet", "student_found": False}

        for face_encoding in face_encodings:
            # Calculate distances to ALL loaded samples (could be multiple per student)
            face_distances = face_recognition.face_distance(encoding_cache.known_face_encodings, face_encoding)
            
            if len(face_distances) > 0:
                best_match_index = np.argmin(face_distances)
                dist = face_distances[best_match_index]
                confidence = 1 - dist
                
                if dist <= CONFIDENCE_THRESHOLD:
                    # student metadata might repeat across samples, we just need the info
                    student = encoding_cache.known_face_metadata[best_match_index]
                    
                    # Deduplicate in current results (if multiple samples match same person)
                    if not any(s['id'] == student['id'] for s in recognized_students):
                        recognized_students.append({
                            **student,
                            "confidence": float(round(confidence, 2))
                        })
                        await log_recognition_event("success", student['id'], float(confidence))
                else:
                    await log_recognition_event("unknown_face", message=f"Best distance: {dist:.2f}")

        return {
            "student_found": len(recognized_students) > 0,
            "students": recognized_students, 
            "count": len(recognized_students),
            "faces_detected": len(face_locations)
        }
    except Exception as e:
        print(f"Error in multi-sample verification: {e}")
        await log_recognition_event("failure", message=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/students/{student_id}/images")
async def upload_student_images(student_id: str, files: List[UploadFile] = File(...), user: dict = Depends(get_current_user)):
    """Upload multiple biometric samples for a student (Normalized v2)"""
    try:
        # Enforce 3-5 images constraint for university-grade accuracy
        if len(files) < 3 or len(files) > 5:
            raise HTTPException(status_code=400, detail="Please upload 3-5 images for multi-angle biometric profiling.")
            
        processed_count = 0
        new_encodings_records = []
        image_urls = []
        
        # Get existing image_urls if any
        student_res = supabase.table("students").select("image_urls").eq("id", student_id).execute()
        if student_res.data and student_res.data[0].get("image_urls"):
            image_urls = student_res.data[0]["image_urls"]
            
        for file_data in files:
            content = await file_data.read()
            
            # 1. Upload to Supabase Storage
            photo_url = await upload_student_image(content, file_data.filename, student_id)
            if photo_url:
                image_urls.append(photo_url)

            # 2. Extract biometric encoding
            nparr = np.frombuffer(content, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is not None:
                rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                locs = face_recognition.face_locations(rgb_img)
                encs = face_recognition.face_encodings(rgb_img, locs)
                
                if encs:
                    new_encodings_records.append({
                        "student_id": student_id,
                        "encoding": encs[0].tolist(),
                        "encoding_path": photo_url
                    })
                    processed_count += 1

        # 3. Update records in Supabase
        # Update student's gallery
        supabase.table("students").update({"image_urls": image_urls}).eq("id", student_id).execute()
        
        # Save each encoding as a separate sample for high-precision matching
        if new_encodings_records:
            supabase.table("face_encodings").insert(new_encodings_records).execute()
            
        # 4. Refresh face cache immediately
        await load_known_faces()

        return {
            "message": f"Successfully enrolled {processed_count} samples for student {student_id}.",
            "student_id": student_id,
            "samples_added": processed_count
        }
    except Exception as e:
        print(f"Error in multi-sample enrollment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Google Sheets (Legacy Sync) ---
@app.post("/api/sheets/sync")
async def sync_to_sheets():
    # Placeholder for user's request to "remove other sources"
    return {"message": "Data is now primarily saved in Supabase. Google Sheets sync can be re-enabled if needed."}

@app.get("/api/analytics/summary")
async def get_analytics_summary(user: dict = Depends(get_current_user)):
    """Get historical trends and status distribution for charts"""
    try:
        # 1. Last 7 Days Trends
        trends = []
        for i in range(6, -1, -1):
            date = (datetime.now() - timedelta(days=i)).date().isoformat()
            res = supabase.table("attendance").select("id", count="exact").eq("date", date).execute()
            trends.append({
                "date": datetime.now() - timedelta(days=i), # for sorting/labeling
                "display": (datetime.now() - timedelta(days=i)).strftime('%b %d'),
                "count": res.count or 0
            })
            
        # 2. Status Distribution (Today)
        today = datetime.now().date().isoformat()
        status_res = supabase.table("attendance").select("status").eq("date", today).execute()
        
        present: int = 0
        late: int = 0
        for r in status_res.data:
            if r.get('status') == 'Late': 
                late += 1
            else: 
                present += 1
            
        # Simple Absent calculation (Total Students - (Present + Late))
        students_count = supabase.table("students").select("id", count="exact").execute()
        total_students = students_count.count or 0
        absent = max(0, total_students - (present + late))
        
        status_dist = [
            {"name": "Present", "value": present, "color": "#10b981"}, # Green
            {"name": "Late", "value": late, "color": "#f59e0b"},   # Amber
            {"name": "Absent", "value": absent, "color": "#ef4444"}    # Red
        ]
        
        return {
            "trends": [{"date": t["display"], "count": t["count"]} for t in trends],
            "distribution": status_dist,
            "total_students": total_students
        }
    except Exception as e:
        print(f"Error fetching analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    """System health check for monitoring"""
    try:
        # Check database
        supabase.table("students").select("count", count="exact").limit(1).execute()
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "online",
        "database": db_status,
        "engine": "FaceRecognition-v2.0",
        "cache_size": len(encoding_cache.known_face_encodings),
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/stats")
async def system_stats():
    """Operational statistics from recognition logs and core tables"""
    try:
        today = datetime.now().date().isoformat()
        
        # 1. Fetch core counts
        students_count = supabase.table("students").select("id", count="exact").execute()
        batches_count = supabase.table("batches").select("id", count="exact").execute()
        
        # 2. Fetch recognition metrics from logs
        logs = supabase.table("recognition_logs").select("*").gte("created_at", today).execute()
        log_data = logs.data
        
        return {
            "counts": {
                "total_students": students_count.count or 0,
                "total_batches": batches_count.count or 0,
                "attendance_today": len([l for l in log_data if l.get("event_type") == "match_found"])
            },
            "security": {
                "spoofs_prevented": len([l for l in log_data if l.get("event_type") == "spoof_detected"]),
                "unknown_faces": len([l for l in log_data if l.get("event_type") == "unknown_face"])
            },
            "performance": {
                "cache_hits": len(encoding_cache.known_face_encodings),
                "avg_confidence": sum([l.get("confidence", 0) or 0 for l in log_data if l.get("confidence")]) / len([l for l in log_data if l.get("confidence")]) if any(l.get("confidence") for l in log_data) else 0
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"Error fetching stats: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)