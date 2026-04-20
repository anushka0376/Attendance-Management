#!/usr/bin/env python3
"""
Face Recognition Attendance System - Supabase Backend
"""

from fastapi import FastAPI, HTTPException, File, UploadFile, Depends, Request, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
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
import traceback
import uuid

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
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"❌ 422 Validation Error: {exc.errors()}")
    print(f"📦 Payload causing error: {await request.body()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": str(await request.body())},
    )

@app.middleware("http")
async def log_headers(request: Request, call_next):
    auth_header = request.headers.get("Authorization")
    if auth_header:
         print(f"Header Debug: Auth arriving (type={auth_header[:7]}... len={len(auth_header)})")
    else:
         print(f"Header Debug: No Auth header found for {request.method} {request.url.path}")
    return await call_next(request)

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
        token = user.get("access_token")
        
        # Valid fields to update
        allowed_fields = {
            "full_name", "department", "phone_number", 
            "employee_id", "qualification", "experience", 
            "specialization"
        }
        
        filtered_updates = {k: v for k, v in user_updates.items() if k in allowed_fields}
        
        if not filtered_updates:
            return user
            
        # 1. Use authenticated client for profiles (to pass RLS)
        user_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        user_client.postgrest.auth(token)
        user_client.table("profiles").update(filtered_updates).eq("id", user_id).execute()
        
        # 2. Sync with teachers table (if user is a teacher)
        if user.get("role") == "teacher":
            try:
                # Teachers table might have different field names or RLS, 
                # but we use the admin client here to ensure it's synced
                supabase.table("teachers").update(filtered_updates).eq("id", user_id).execute()
            except Exception as e:
                print(f"Warning: Failed to sync with teachers table: {e}")
        
        # 3. Fetch updated user
        role = user.get("role", "teacher")
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
        user_id = user["user_id"]
        token = user.get("access_token")
        
        content = await profile_photo.read()
        filename = profile_photo.filename
        
        # Upload to storage
        photo_url = await upload_profile_photo(content, filename)
        if not photo_url:
            raise HTTPException(status_code=500, detail="Failed to upload photo")
            
        # 1. Update profiles table (authenticated)
        user_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        user_client.postgrest.auth(token)
        user_client.table("profiles").update({"avatar_url": photo_url}).eq("id", user_id).execute()
        
        # 2. Update teachers table for legacy sync
        if user.get("role") == "teacher":
            try:
                supabase.table("teachers").update({"profile_photo_url": photo_url}).eq("id", user_id).execute()
            except Exception as e:
                print(f"Warning: Failed to sync photo to teachers table: {e}")
                
        return {"profile_photo_url": photo_url}
    except Exception as e:
        print(f"Photo update error: {e}")
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
      
      # Use unified update password utility (which uses auth.update_user)
      success = await update_user_password(user["access_token"], password_data.new_password)
      if not success:
          raise HTTPException(status_code=400, detail="Failed to update password")
          
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

class BatchCreate(BaseModel):
    name: str = ""
    department: str
    start_year: int
    end_year: int
    teacher_id: Optional[str] = None
    degree_duration: Optional[int] = 4
    is_active: Optional[bool] = True

class StudentCreate(BaseModel):
    name: str
    roll_no: str
    batch_id: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    group_name: Optional[str] = None

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    roll_no: Optional[str] = None
    batch_id: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    group_name: Optional[str] = None

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
# Global Cache for Face Recognition (Multi-Tenant)
class EncodingCache:
    def __init__(self):
        # Dictionary of teacher_id -> {encodings: [], metadata: [], last_refresh: datetime}
        self.teacher_caches: Dict[str, Dict[str, Any]] = {}

encoding_cache = EncodingCache()
CONFIDENCE_THRESHOLD = 0.65 # Relaxed for better matching (Original: 0.6)
LATE_THRESHOLD = "09:15:00" 

async def load_known_faces(user: dict):
    """Load student encodings for a specific teacher into memory using their session"""
    global encoding_cache
    teacher_id = str(user["id"]) if "id" in user else str(user.get("user_id", ""))
    if not teacher_id:
        return 0
    
    try:
        print(f"🔄 AI Precision Engine: Refreshing biometric cache for teacher {teacher_id}...")
        
        # Create an authenticated client
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        user_client = create_client(url, key)
        user_client.postgrest.auth(user.get("access_token"))
        
        # Get encodings for students the teacher has access to via RLS
        enc_res = user_client.table("face_encodings").select("encoding, student_id, students(name, roll_no, batch_id, group_name)").execute()
        
        new_encodings = []
        new_metadata = []
        
        for record in enc_res.data:
            if not record.get('encoding') or not record.get('students'):
                continue
                
            encoding = np.array(record['encoding'])
            student_info = record['students']
            
            new_encodings.append(encoding)
            new_metadata.append({
                "id": record['student_id'],
                "name": student_info['name'],
                "roll_no": student_info.get('roll_no'),
                "batch_id": student_info.get('batch_id'),
                "group_name": student_info.get('group_name')
            })
            
        # Store in per-teacher cache
        encoding_cache.teacher_caches[teacher_id] = {
            "encodings": new_encodings,
            "metadata": new_metadata,
            "last_refresh": datetime.now()
        }
        
        print(f"✅ AI Engine Ready: {len(new_encodings)} biometric samples loaded for teacher {teacher_id}.")
        return len(new_encodings)
    except Exception as e:
        print(f"❌ AI Engine Error: {e}")
        traceback.print_exc()
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
    return variance >= 50 # Threshold: 50 is more permissive for webcams, preventing lockouts

@app.get("/api/attendance/session/warmup")
async def warmup_engine(user: dict = Depends(get_current_user)):
    """Explicitly trigger biometric cache loading for the current teacher"""
    count = await load_known_faces(user)
    return {"status": "ready", "samples_loaded": count}

# --- Startup ---
@app.on_event("startup")
async def startup_event():
    # We no longer load faces globally at startup because of RLS.
    # Faces are loaded per-teacher on demand or via /api/attendance/session/warmup.
    print("🚀 API Server Starting. Biometric cache will be populated on teacher login/warmup.")

# --- Endpoints ---

@app.get("/")
async def root():
    return {"message": "Face Recognition Attendance API (Supabase) is running"}

@app.get("/api/system/status")
async def get_system_status(user: dict = Depends(get_current_user)):
    teacher_id = str(user["id"]) if "id" in user else str(user.get("user_id", ""))
    cache = encoding_cache.teacher_caches.get(teacher_id)
    cache_meta = cache.get("metadata", []) if cache else []
    cache_refresh = cache.get("last_refresh") if cache else None
    
    return {
        "database": "Supabase (Postgres)",
        "face_recognition": "Available",
        "loaded_students": len(cache_meta),
        "last_cache_refresh": cache_refresh.isoformat() if cache_refresh else "Never",
        "confidence_threshold": CONFIDENCE_THRESHOLD,
        "total_active_caches": len(encoding_cache.teacher_caches)
    }

# --- Batch Management ---
@app.get("/api/batches")
async def get_batches(user: dict = Depends(get_current_user)):
    try:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        user_client = create_client(url, key)
        user_client.postgrest.auth(user.get("access_token"))

        response = user_client.table("batches").select("*").order("start_year", desc=True).execute()
        batches = response.data
        
        # Calculate student_count correctly taking RLS into account
        students_response = user_client.table("students").select("batch_id").execute()
        student_counts = {}
        for s in students_response.data:
            b_id = s.get("batch_id")
            if b_id:
                student_counts[b_id] = student_counts.get(b_id, 0) + 1
                
        for b in batches:
            b["student_count"] = student_counts.get(b["id"], 0)

        return {"batches": batches, "count": len(batches)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching batches: {str(e)}")

@app.post("/api/batches")
async def create_batch(batch: BatchCreate, user: dict = Depends(get_current_user)):
    try:
        # Prevent unauthorized roles from trying (fail early)
        if user.get("role") not in ["admin", "teacher"]:
             raise HTTPException(status_code=403, detail="Not authorized to create batches")
             
        print(f"📦 Received Batch creation request: {batch.model_dump()}")
        data = batch.model_dump(exclude_unset=True)
        dept = data.get("department", "General").strip()
        sy = data.get("start_year")
        ey = data.get("end_year")
        
        # Standardize Naming: "Department (Year-Year)"
        batch_name = f"{dept} ({sy}-{ey})"
        data["name"] = batch_name
        
        # --- deduplication check: now using department if it exists ---
        try:
            # First try with the new standard columns
            existing = supabase.table("batches")\
                .select("id")\
                .eq("department", dept)\
                .eq("start_year", sy)\
                .eq("end_year", ey)\
                .execute()
                
            if existing.data:
                print(f"♻️ Batch '{batch_name}' already exists for {dept}, returning existing ID.")
                return {"batch": existing.data[0], "message": "Using existing batch", "is_new": False}
        except Exception as e:
            if "column \"department\" does not exist" in str(e).lower():
                print("⚠️ 'department' column missing, performing fallback name-based deduplication...")
                existing = supabase.table("batches")\
                    .select("id")\
                    .eq("name", batch_name)\
                    .execute()
                if existing.data:
                    return {"batch": existing.data[0], "message": "Using existing batch (fallback)", "is_new": False}
            else:
                print(f"⚠️ Deduplication check failed: {e}")
                # Don't crash, proceed to insert attempt

        # Automatically assign teacher_id from authenticated user
        data["teacher_id"] = user["user_id"]
        
        # Create an authenticated client to satisfy RLS
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        user_client = create_client(url, key)
        user_client.postgrest.auth(user.get("access_token"))
        
        try:
            response = user_client.table("batches").insert(data).execute()
            if not response.data:
                raise HTTPException(status_code=500, detail="Failed to create batch")
            return {"batch": response.data[0], "message": "Batch created successfully", "is_new": True}
        except Exception as e:
            error_str = str(e).lower()
            if "column" in error_str and ("department" in error_str or "degree_duration" in error_str):
                # Specific handling for migration-related missing columns
                missing_col = "department" if "department" in error_str else "degree_duration"
                print(f"⚠️ Column '{missing_col}' missing in Supabase, retrying without it...")
                
                # Create a temporary copy to modify
                retry_data = data.copy()
                if missing_col in retry_data:
                    del retry_data[missing_col]
                    
                # If both might be missing, be aggressive
                if "department" in error_str and "degree_duration" in data:
                    retry_data.pop("degree_duration", None)
                if "degree_duration" in error_str and "department" in data:
                    retry_data.pop("department", None)
                    
                response = user_client.table("batches").insert(retry_data).execute()
                if not response.data:
                    raise HTTPException(status_code=500, detail="Failed to create batch on retry")
                return {"batch": response.data[0], "message": f"Batch created (fallback: {missing_col} skipped)", "is_new": True}
            
            print(f"❌ Batch insertion error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        traceback.print_exc()
        print(f"Error creating batch: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating batch: {str(e)}")

@app.delete("/api/batches/{batch_id}")
async def delete_batch(batch_id: str, user: dict = Depends(get_current_user)):
    """Delete a batch (Admin or Teacher owner only)"""
    if user.get("role") not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete batches")
        
    try:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        user_client = create_client(url, key)
        user_client.postgrest.auth(user.get("access_token"))

        try:
            # Unlink students FIRST to avoid foreign key cascading errors
            user_client.table("students").update({"batch_id": None}).eq("batch_id", batch_id).execute()
        except Exception as unlink_err:
            print(f"⚠️ Unlink students warning: {unlink_err}")
            
        response = user_client.table("batches").delete().eq("id", batch_id).execute()
        return {"message": "Batch deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Student Management ---
@app.get("/api/students/groups")
async def get_student_groups(user: dict = Depends(get_current_user)):
    """Fetch all unique group names for students accessible to the teacher"""
    try:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        user_client = create_client(url, key)
        user_client.postgrest.auth(user.get("access_token"))

        # Fetch unique group_name from students the teacher can see
        response = user_client.table("students").select("group_name").execute()
        
        # Deduplicate and filter empty
        groups = sorted(list(set(r['group_name'] for r in response.data if r.get('group_name'))))
        return {"groups": groups, "count": len(groups)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch groups: {str(e)}")

@app.get("/api/students")
async def get_students(batch_id: Optional[str] = None, group_name: Optional[str] = None, user: dict = Depends(get_current_user)):
    try:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        user_client = create_client(url, key)
        user_client.postgrest.auth(user.get("access_token"))

        query = user_client.table("students").select("*, batches(name)")
        if batch_id and batch_id != "all":
            query = query.eq("batch_id", batch_id)
        if group_name and group_name != "all":
            query = query.eq("group_name", group_name)
        
        response = query.order("name").execute()
        return {"students": response.data, "count": len(response.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get students: {str(e)}")

@app.get("/api/attendance")
async def get_attendance(date: Optional[str] = None, batch_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    try:
        # Authenticated client for RLS
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        user_client = create_client(url, key)
        user_client.postgrest.auth(user.get("access_token"))

        query = user_client.table("attendance").select("*, students(*)")
        
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
async def create_student(student_data: StudentCreate, user: dict = Depends(get_current_user)):
    try:
        # Prevent unauthorized roles
        if user.get("role") not in ["admin", "teacher"]:
             raise HTTPException(status_code=403, detail="Not authorized to create students")
             
        data = student_data.model_dump()
        
        # Create an authenticated client
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        user_client = create_client(url, key)
        user_client.postgrest.auth(user.get("access_token"))
        
        # --- Direct Batch ID usage (validated by Frontend) ---
        # The frontend calls create_batch first, so we should always have a valid UUID here.
        batch_id = data.get("batch_id")
        if not batch_id:
             raise HTTPException(status_code=400, detail="batch_id is required. Please select or create a batch first.")
             
        print(f"👤 Enrolling student '{data.get('name')}' (Roll: {data.get('roll_no')}) in batch {batch_id}")
        
        try:
            print(f"🚀 Attempting DB insert for {data.get('name')}...")
            response = user_client.table("students").insert(data).execute()
            print(f"📡 DB Response: {response}")
            
            if not response.data:
                print(f"⚠️ Student insert returned no data: {response}")
                raise HTTPException(status_code=500, detail="Failed to create student (no data returned)")
            return {"student": response.data[0], "message": "Student created successfully"}
        except Exception as e:
            traceback.print_exc()
            error_str = str(e)
            
            # Handle Duplicates specifically
            if "23505" in error_str and "roll_no" in error_str:
                raise HTTPException(status_code=400, detail=f"Roll number {data.get('roll_no')} is already registered. Please check the student list.")
            
            # List of potential missing columns we can fallback on
            potential_missing = ["department", "phone", "email", "group_name"]
            column_found = False
            for col in potential_missing:
                if col in error_str:
                    print(f"⚠️ '{col}' column missing in Supabase students table, retrying without it...")
                    data.pop(col, None)
                    column_found = True
            
            if column_found:
                response = user_client.table("students").insert(data).execute()
                if not response.data:
                    raise HTTPException(status_code=500, detail="Failed to create student on retry")
                return {"student": response.data[0], "message": "Student created successfully (with partial data)"}
            raise e
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        print(f"Error creating student: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating student: {str(e)}")

@app.put("/api/students/{student_id}")
async def update_student(student_id: str, student_data: StudentUpdate, user: dict = Depends(get_current_user)):
    try:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        user_client = create_client(url, key)
        user_client.postgrest.auth(user.get("access_token"))
        
        # Filter out None values to only update provided fields
        update_data = {k: v for k, v in student_data.dict().items() if v is not None}
        
        if not update_data:
            return {"message": "No changes provided"}
            
        print(f"✏️ Updating student {student_id} with data: {update_data}")
        response = user_client.table("students").update(update_data).eq("id", student_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Student not found or not authorized to update")
            
        # Refresh the cache if name/images might have changed (for now just reload all if needed, but usually name is enough)
        # await load_known_faces() 
        
        return {"student": response.data[0], "message": "Student updated successfully"}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to update student: {str(e)}")

@app.delete("/api/students/{student_id}")
async def delete_student(student_id: str, user: dict = Depends(get_current_user)):
    try:
        if user.get("role") not in ["admin", "teacher"]:
             raise HTTPException(status_code=403, detail="Not authorized to delete students")
             
        # Create an authenticated client
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        user_client = create_client(url, key)
        user_client.postgrest.auth(user.get("access_token"))
        
        user_client.table("students").delete().eq("id", student_id).execute()
        return {"message": "Student deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete student: {str(e)}")

# --- Attendance ---
@app.post("/api/attendance/mark")
async def mark_attendance(data: dict, user: dict = Depends(get_current_user)):
    """Mark attendance for students in a specific class session with duplicate protection"""
    try:
        # Create an authenticated client per request to respect RLS
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        user_client = create_client(url, key)
        user_client.postgrest.auth(user.get("access_token"))

        student_ids = data.get("student_ids", [])
        class_id = data.get("class_id")
        batch_id = data.get("batch_id")
        status_override = data.get("status") # Manual override if provided
        today_date = data.get("date", datetime.now().strftime('%Y-%m-%d'))
        today_full = datetime.now()
        marking_method = data.get("method", "Face")
        
        # Explicitly handle string "None" or empty ID which can cause UUID syntax errors in SQL
        if class_id == "None" or not class_id: class_id = None
        if batch_id == "None" or not batch_id: batch_id = None

        print(f"📍 Marking attendance: students={len(student_ids)}, class={class_id}, method={marking_method}")
        
        if not student_ids:
            raise HTTPException(status_code=400, detail="Missing student_ids")
            
        # 1. Fetch Class Info (to get Batch ID)
        batch_id = data.get("batch_id")
        if class_id:
            class_info = user_client.table("classes").select("batch_id").eq("id", class_id).execute()
            if class_info.data:
                batch_id = class_info.data[0]["batch_id"]
            elif not batch_id:
                raise HTTPException(status_code=404, detail="Class session not found and no batch_id provided")
        
        # If still no batch_id, try to get it from the first student (fallback)
        if not batch_id and student_ids:
            st_res = user_client.table("students").select("batch_id").eq("id", student_ids[0]).execute()
            if st_res.data:
                batch_id = st_res.data[0].get("batch_id")
            
        attendance_records = []
        for sid in student_ids:
            # 2. Duplicate Protection: Check if already marked for THIS CLASS (or no class) today
            query = user_client.table("attendance") \
                .select("id") \
                .eq("student_id", sid) \
                .eq("date", today_date)
            
            if class_id:
                query = query.eq("class_id", class_id)
            else:
                query = query.is_("class_id", "null")
                
            existing = query.execute()
                
            if existing.data:
                print(f"⚠️ Student {sid} already marked for session {class_id} today. Skipping.")
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
                "date": today_date,
                "entry_time": entry_time,
                "status": status,
                "late_minutes": late_mins,
                "marking_method": marking_method
            })
            
        if not attendance_records:
            return {"message": "All students already marked. No new records created."}

        res = user_client.table("attendance").insert(attendance_records).execute()
        return {"message": f"Successfully marked {len(res.data)} students", "records": res.data}
        
    except Exception as e:
        print(f"Error marking attendance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/attendance/recent")
async def get_recent_activity(user: dict = Depends(get_current_user)):
    try:
        # Authenticated client for RLS
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        user_client = create_client(url, key)
        user_client.postgrest.auth(user.get("access_token"))

        response = user_client.table("attendance") \
            .select("*, students(name, roll_no)") \
            .order("created_at", desc=True) \
            .limit(10) \
            .execute()
        return {"attendance": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching recent activity: {str(e)}")

@app.post("/api/attendance/verify-image")
async def verify_attendance_by_image(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
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

        # Get teacher's cache
        teacher_id = str(user.get("id", user.get("user_id", "")))
        cache = encoding_cache.teacher_caches.get(teacher_id)
        
        # Reload if cache missing or older than 30 mins
        if not cache or (datetime.now() - cache["last_refresh"] > timedelta(minutes=30)):
            await load_known_faces(user)
            cache = encoding_cache.teacher_caches.get(teacher_id)

        recognized_students = []
        
        if not cache:
            await log_recognition_event("failure", message=f"No cache found for teacher {teacher_id}")
            return {"students": [], "message": "Cache initialization failed", "student_found": False}

        encodings_list = cache.get("encodings", [])
        metadata_list = cache.get("metadata", [])
        
        if not encodings_list:
            await log_recognition_event("failure", message=f"No encodings in cache for teacher {teacher_id}")
            return {"students": [], "message": "No students enrolled yet for your account", "student_found": False}

        for face_encoding in face_encodings:
            # Calculate distances to teacher's loaded samples
            face_distances = face_recognition.face_distance(encodings_list, face_encoding)
            
            if len(face_distances) > 0:
                best_match_index = int(np.argmin(face_distances))
                dist = float(face_distances[best_match_index])
                confidence = 1.0 - dist
                
                if dist <= CONFIDENCE_THRESHOLD:
                    matched_student = metadata_list[best_match_index]
                    
                    # Deduplicate in current results
                    if not any(s['id'] == matched_student['id'] for s in recognized_students):
                        conf_val = float(confidence)
                        recognized_students.append({
                            **matched_student,
                            "confidence": float(round(conf_val, 2))
                        })
                        await log_recognition_event("success", matched_student['id'], conf_val)
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
async def enroll_student_images(
    student_id: str, 
    files: List[UploadFile] = File(...),
    user: dict = Depends(get_current_user)
):
    """Enrolls multiple biometric samples for a student with robust error handling"""
    try:
        # Create an authenticated client
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        user_client = create_client(url, key)
        user_client.postgrest.auth(user.get("access_token"))

        processed_count = 0
        image_urls = []
        new_encodings_records = []
        
        print(f"📸 Starting enrollment for student {student_id} ({len(files)} files)")
            
        for file_data in files:
            try:
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
                    else:
                        print(f"⚠️ No face detected in {file_data.filename}")
                else:
                    print(f"❌ Failed to decode image: {file_data.filename}")
            except Exception as e:
                print(f"❌ Error processing file {file_data.filename}: {e}")

        # 3. Update records in Supabase (Atomic-ish)
        if image_urls:
            # Append to existing URLs or set new
            old_data = user_client.table("students").select("image_urls").eq("id", student_id).single().execute()
            combined_urls = (old_data.data.get("image_urls") or []) + image_urls
            user_client.table("students").update({"image_urls": combined_urls}).eq("id", student_id).execute()
        
        # Save each encoding as a separate sample
        if new_encodings_records:
            user_client.table("face_encodings").insert(new_encodings_records).execute()
            
        # 4. Refresh face cache immediately for this teacher
        await load_known_faces(user)

        return {
            "message": f"Successfully enrolled {processed_count} samples.",
            "student_id": student_id,
            "samples_added": processed_count,
            "image_urls": image_urls
        }
    except Exception as e:
        traceback.print_exc()
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
        "cache_size": sum(len(c.get("encodings", [])) for c in encoding_cache.teacher_caches.values()),
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
                "active_caches": len(encoding_cache.teacher_caches),
                "avg_confidence": sum([l.get("confidence", 0) or 0 for l in log_data if l.get("confidence")]) / len([l for l in log_data if l.get("confidence")]) if any(l.get("confidence") for l in log_data) else 0
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"Error fetching stats: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)