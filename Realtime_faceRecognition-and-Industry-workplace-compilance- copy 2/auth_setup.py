import sqlite3
import hashlib
import uuid
from datetime import datetime

def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def setup_auth_database():
    """Create users table for authentication"""
    conn = sqlite3.connect("attendance.db")
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('admin', 'teacher')),
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_by TEXT,
            last_login DATETIME,
            profile_image TEXT,
            department TEXT,
            phone_number TEXT,
            employee_id TEXT,
            qualification TEXT,
            experience TEXT,
            specialization TEXT,
            FOREIGN KEY (created_by) REFERENCES users(user_id)
        )
    ''')
    
    # Create sessions table for JWT token management
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_sessions (
            session_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            ip_address TEXT,
            user_agent TEXT,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
    ''')
    
    # Create default admin user if not exists
    cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'admin'")
    admin_count = cursor.fetchone()[0]
    
    if admin_count == 0:
        admin_id = str(uuid.uuid4())
        admin_password_hash = hash_password("admin123")  # Default password
        
        cursor.execute('''
            INSERT INTO users (user_id, username, email, password_hash, full_name, role, department)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (admin_id, "admin", "admin@attendance.com", admin_password_hash, 
              "System Administrator", "admin", "IT"))
        
        print("✅ Default admin user created:")
        print("   Username: admin")
        print("   Password: admin123")
        print("   Email: admin@attendance.com")
        print("   ⚠️  Please change the default password after first login!")
    
    # Add user context to attendance table
    try:
        cursor.execute("ALTER TABLE attendance ADD COLUMN marked_by TEXT")
        cursor.execute("ALTER TABLE attendance ADD COLUMN marking_method TEXT DEFAULT 'face'")
        print("✅ Added user context columns to attendance table")
    except sqlite3.OperationalError:
        pass  # Columns already exist
    
    conn.commit()
    conn.close()
    print("✅ Authentication database setup completed!")

def create_sample_teachers():
    """Create sample teacher accounts for testing"""
    conn = sqlite3.connect("attendance.db")
    cursor = conn.cursor()
    
    # Get admin user ID
    cursor.execute("SELECT user_id FROM users WHERE role = 'admin' LIMIT 1")
    admin_id = cursor.fetchone()[0]
    
    teachers = [
        ("teacher1", "teacher1@school.com", "John Smith", "Mathematics", "+1234567890"),
        ("teacher2", "teacher2@school.com", "Sarah Johnson", "Science", "+1234567891"),
        ("teacher3", "teacher3@school.com", "Michael Brown", "English", "+1234567892")
    ]
    
    for username, email, full_name, dept, phone in teachers:
        # Check if teacher already exists
        cursor.execute("SELECT username FROM users WHERE username = ?", (username,))
        if cursor.fetchone():
            continue
            
        teacher_id = str(uuid.uuid4())
        password_hash = hash_password("teacher123")  # Default password
        
        cursor.execute('''
            INSERT INTO users (user_id, username, email, password_hash, full_name, 
                             role, department, phone_number, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (teacher_id, username, email, password_hash, full_name, 
              "teacher", dept, phone, admin_id))
    
    conn.commit()
    conn.close()
    print("✅ Sample teacher accounts created!")
    print("   Default password for all teachers: teacher123")

if __name__ == "__main__":
    setup_auth_database()
    create_sample_teachers()
    print("\n🎉 Authentication system database setup complete!")
    print("\n📋 Next steps:")
    print("1. Run the backend server with authentication endpoints")
    print("2. Access the signup/login pages")
    print("3. Change default passwords")