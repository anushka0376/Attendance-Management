from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
import sqlite3
import hashlib
import jwt
import uuid
from typing import Optional, Dict, Any

# JWT Configuration
SECRET_KEY = "face_attendance_secret_key_2025"  # In production, use environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

security = HTTPBearer()

# Pydantic Models for Authentication
class UserSignup(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str
    role: str = "teacher"  # admin or teacher
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
    department: Optional[str]
    phone_number: Optional[str]
    employee_id: Optional[str]
    qualification: Optional[str]
    experience: Optional[str]
    specialization: Optional[str]
    is_active: bool
    created_at: str
    last_login: Optional[str]

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
    expires_in: int

# Utility Functions
def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return hash_password(password) == hashed_password

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_user_from_db(username: str = None, user_id: str = None) -> Optional[Dict]:
    """Get user from database by username or user_id"""
    conn = sqlite3.connect("attendance.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    if username:
        cursor.execute("SELECT * FROM users WHERE username = ? AND is_active = 1", (username,))
    elif user_id:
        cursor.execute("SELECT * FROM users WHERE user_id = ? AND is_active = 1", (user_id,))
    else:
        conn.close()
        return None
    
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return dict(user)
    return None

def create_user_in_db(user_data: UserSignup, created_by: str = None) -> Dict:
    """Create new user in database"""
    conn = sqlite3.connect("attendance.db")
    cursor = conn.cursor()
    
    # Check if username or email already exists
    cursor.execute("SELECT username FROM users WHERE username = ? OR email = ?", 
                   (user_data.username, user_data.email))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(
            status_code=400,
            detail="Username or email already exists"
        )
    
    # Create new user
    user_id = str(uuid.uuid4())
    password_hash = hash_password(user_data.password)
    
    cursor.execute('''
        INSERT INTO users (user_id, username, email, password_hash, full_name, 
                          role, department, phone_number, employee_id, qualification,
                          experience, specialization, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (user_id, user_data.username, user_data.email, password_hash,
          user_data.full_name, user_data.role, user_data.department,
          user_data.phone_number, user_data.employee_id, user_data.qualification,
          user_data.experience, user_data.specialization, created_by))
    
    conn.commit()
    conn.close()
    
    # Return created user
    return get_user_from_db(user_id=user_id)

def authenticate_user(username: str, password: str) -> Optional[Dict]:
    """Authenticate user credentials"""
    user = get_user_from_db(username=username)
    if not user:
        return None
    
    if not verify_password(password, user["password_hash"]):
        return None
    
    # Update last login
    conn = sqlite3.connect("attendance.db")
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?",
        (user["user_id"],)
    )
    conn.commit()
    conn.close()
    
    return user

def create_user_session(user_id: str, token: str, ip_address: str = None, 
                       user_agent: str = None) -> str:
    """Create user session in database"""
    conn = sqlite3.connect("attendance.db")
    cursor = conn.cursor()
    
    session_id = str(uuid.uuid4())
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    expires_at = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    cursor.execute('''
        INSERT INTO user_sessions (session_id, user_id, token_hash, expires_at, 
                                 ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (session_id, user_id, token_hash, expires_at, ip_address, user_agent))
    
    conn.commit()
    conn.close()
    
    return session_id

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
    """Get current authenticated user"""
    token = credentials.credentials
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = get_user_from_db(user_id=user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

async def get_admin_user(current_user: Dict = Depends(get_current_user)) -> Dict:
    """Require admin role"""
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

def user_to_response(user: Dict) -> UserResponse:
    """Convert database user to response model"""
    return UserResponse(
        user_id=user["user_id"],
        username=user["username"],
        email=user["email"],
        full_name=user["full_name"],
        role=user["role"],
        department=user.get("department"),
        phone_number=user.get("phone_number"),
        employee_id=user.get("employee_id"),
        qualification=user.get("qualification"),
        experience=user.get("experience"),
        specialization=user.get("specialization"),
        is_active=bool(user["is_active"]),
        created_at=user["created_at"],
        last_login=user.get("last_login")
    )

# Authentication endpoints will be added to main API server
def get_all_users(current_user: Dict) -> list:
    """Get all users (admin only)"""
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    conn = sqlite3.connect("attendance.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT u.*, creator.full_name as created_by_name 
        FROM users u
        LEFT JOIN users creator ON u.created_by = creator.user_id
        ORDER BY u.created_at DESC
    """)
    
    users = [dict(user) for user in cursor.fetchall()]
    conn.close()
    
    return users

def deactivate_user(user_id: str, current_user: Dict) -> bool:
    """Deactivate user (admin only)"""
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    if user_id == current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )
    
    conn = sqlite3.connect("attendance.db")
    cursor = conn.cursor()
    
    cursor.execute("UPDATE users SET is_active = 0 WHERE user_id = ?", (user_id,))
    conn.commit()
    
    rows_affected = cursor.rowcount
    conn.close()
    
    return rows_affected > 0