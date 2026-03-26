from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
import os
from typing import Optional, Dict, Any
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# JWT Configuration (Supabase manages this, but we keep these for compatibility)
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

security = HTTPBearer()

# Pydantic Models
class UserSignup(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str
    role: str = "teacher"
    department: Optional[str] = None
    phone_number: Optional[str] = None
    employee_id: Optional[str] = None
    qualification: Optional[str] = None
    experience: Optional[str] = None
    specialization: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    user_id: str
    username: str
    email: str
    full_name: str
    role: str
    department: Optional[str] = None
    phone_number: Optional[str] = None
    employee_id: Optional[str] = None
    qualification: Optional[str] = None
    experience: Optional[str] = None
    specialization: Optional[str] = None
    profile_photo_url: Optional[str] = None
    is_active: bool = True
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    expires_in: int

class ResetPasswordRequest(BaseModel):
    email: EmailStr

class UpdatePasswordRequest(BaseModel):
    password: str

# Utility Functions

async def authenticate_user(email_or_username: str, password: str) -> Optional[Dict]:
    """Authenticate via Supabase Auth and check normalized profiles table"""
    try:
        email = email_or_username
        
        # 1. Handle Username-to-Email lookup if needed
        if "@" not in email_or_username:
            # Check profiles table for this username
            p_res = supabase.table("profiles").select("email").eq("username", email_or_username).execute()
            if p_res.data:
                email = p_res.data[0]["email"]
        
        # 2. Sign in via Supabase Auth
        response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
        if response.user:
            user_id = response.user.id
            
            # Fetch consolidated profile
            profile_res = supabase.table("profiles").select("*").eq("id", user_id).execute()
            if profile_res.data:
                profile = profile_res.data[0]
                return {
                    "access_token": response.session.access_token,
                    "token_type": "bearer",
                    "user": {
                        "user_id": str(user_id),
                        "username": profile.get("username"),
                        "email": response.user.email,
                        "full_name": profile.get("full_name"),
                        "role": profile.get("role", "teacher"),
                        "department": profile.get("department"),
                        "phone_number": profile.get("phone_number"),
                        "employee_id": profile.get("employee_id"),
                        "qualification": profile.get("qualification"),
                        "experience": profile.get("experience"),
                        "specialization": profile.get("specialization"),
                        "profile_photo_url": profile.get("avatar_url"), # Unified field
                        "created_at": profile.get("created_at")
                    }
                }
                
        return None
    except Exception as e:
        print(f"Auth error: {e}")
        return None

async def upload_to_supabase(file_content: bytes, filename: str, bucket: str, folder: str = "public") -> Optional[str]:
    """Generic helper to upload photo to Supabase Storage and return public URL"""
    try:
        file_ext = filename.split('.')[-1]
        unique_name = f"{int(datetime.now().timestamp())}_{filename}"
        path = f"{folder}/{unique_name}"
        
        # Upload to specified bucket
        res = supabase.storage.from_(bucket).upload(
            path=path,
            file=file_content,
            file_options={"content-type": f"image/{file_ext}"}
        )
        
        # Get Public URL
        url_res = supabase.storage.from_(bucket).get_public_url(path)
        return url_res
    except Exception as e:
        print(f"Storage error in {bucket}: {e}")
        return None

async def trigger_reset_password(email: str, redirect_to: Optional[str] = None) -> bool:
    """Trigger Supabase password reset email"""
    try:
        supabase.auth.reset_password_for_email(email, {"redirect_to": redirect_to})
        return True
    except Exception as e:
        print(f"Reset password error: {e}")
        return False

async def update_user_password(token: str, new_password: str) -> bool:
    """Update user password using their current session/token"""
    try:
        # We need to use the token to set the session for the client
        # Create a temporary client with the user's token
        temp_supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        temp_supabase.postgrest.auth(token)
        
        res = temp_supabase.auth.update_user({"password": new_password})
        return res.user is not None
    except Exception as e:
        print(f"Update password error: {e}")
        return False

async def upload_profile_photo(file_content: bytes, filename: str) -> Optional[str]:
    """Upload user profile photo to 'profiles' bucket"""
    return await upload_to_supabase(file_content, filename, "profiles", "public")

async def upload_student_image(file_content: bytes, filename: str, student_id: str) -> Optional[str]:
    """Upload student face capture to 'student-faces' bucket"""
    return await upload_to_supabase(file_content, filename, "student-faces", student_id)

async def create_user_in_db(
    username: str, 
    email: str, 
    password: str, 
    full_name: str, 
    role: str = "teacher",
    department: Optional[str] = None,
    phone_number: Optional[str] = None,
    employee_id: Optional[str] = None,
    qualification: Optional[str] = None,
    experience: Optional[str] = None,
    specialization: Optional[str] = None,
    profile_photo_url: Optional[str] = None
) -> Dict:
    """Create via Supabase Auth and insert into normalized profiles table"""
    try:
        # 1. Sign up user
        auth_res = supabase.auth.sign_up({
            "email": email,
            "password": password
        })
        
        if not auth_res.user:
            raise HTTPException(status_code=400, detail="Failed to create auth user")
        
        user_id = auth_res.user.id
        
        # 2. Insert into unified profiles table
        profile_data = {
            "id": user_id,
            "username": username,
            "email": email,
            "full_name": full_name,
            "role": role,
            "department": department,
            "employee_id": employee_id,
            "phone_number": phone_number,
            "qualification": qualification,
            "experience": experience,
            "specialization": specialization,
            "avatar_url": profile_photo_url # Use normalized field
        }
        supabase.table("profiles").insert(profile_data).execute()
        
        return {
            "user_id": str(user_id),
            "username": username,
            "email": email,
            "full_name": full_name,
            "role": role,
            "department": department,
            "phone_number": phone_number,
            "employee_id": employee_id,
            "qualification": qualification,
            "experience": experience,
            "specialization": specialization,
            "profile_photo_url": profile_photo_url,
            "created_at": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

async def get_user_by_id(user_id: str, role: str) -> Dict:
    """Fetch full user profile from database by ID and role"""
    table = "admins" if role == "admin" else "teachers"
    res = supabase.table(table).select("*").eq("id", user_id).execute()
    if res.data:
        profile = res.data[0]
        # Fetch email from auth.users (via get_user)
        try:
            # Note: supabase.auth.admin.get_user_by_id(user_id) requires service role
            # For simplicity, we just return what's in the table + hardcoded email if missing
            return {
                **profile,
                "user_id": str(user_id),
                "role": role
            }
        except:
            return {**profile, "user_id": str(user_id), "role": role}
    raise HTTPException(status_code=404, detail="User not found")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
    """Get current user via Supabase JWT and profiles lookup"""
    token = credentials.credentials
    try:
        user_res = supabase.auth.get_user(token)
        if not user_res.user:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        user_id = user_res.user.id
        
        # Consolidated lookup in profiles
        profile_res = supabase.table("profiles").select("*").eq("id", user_id).execute()
        if profile_res.data:
            profile = profile_res.data[0]
            return {
                **profile,
                "user_id": str(user_id),
                "email": user_res.user.email,
                "profile_photo_url": profile.get("avatar_url") # Map to the expected UI field
            }
            
        raise HTTPException(status_code=404, detail="User profile not found")
    except Exception as e:
        error_msg = str(e).lower()
        if "expired" in error_msg or "invalid" in error_msg:
            print(f"Auth Session Expired: {e}")
            raise HTTPException(status_code=401, detail="Session expired, please login again")
            
        print(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail="Could not validate credentials")

def user_to_response(user: Dict) -> UserResponse:
    return UserResponse(
        user_id=user["user_id"],
        username=user.get("username", user["email"]),
        email=user["email"],
        full_name=user["full_name"],
        role=user["role"],
        department=user.get("department"),
        phone_number=user.get("phone_number"),
        employee_id=user.get("employee_id"),
        qualification=user.get("qualification"),
        experience=user.get("experience"),
        specialization=user.get("specialization"),
        profile_photo_url=user.get("profile_photo_url"),
        created_at=str(user.get("created_at", ""))
    )