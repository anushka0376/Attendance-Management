#!/usr/bin/env python3
"""
Check current database schema
"""
import sqlite3
import os

def check_database_schema():
    """Check current database schema"""
    db_path = "attendance.db"
    if not os.path.exists(db_path):
        print("❌ attendance.db not found!")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check users table
    print("=== USERS TABLE ===")
    try:
        cursor.execute("PRAGMA table_info(users)")
        columns = cursor.fetchall()
        if columns:
            print("Current columns:")
            for col in columns:
                print(f"  {col[0]}: {col[1]} ({col[2]}) {'NOT NULL' if col[3] else 'NULL'} {'PK' if col[5] else ''}")
        else:
            print("❌ Users table doesn't exist!")
    except sqlite3.OperationalError as e:
        print(f"❌ Error checking users table: {e}")
    
    # Check students table
    print("\n=== STUDENTS TABLE ===")
    try:
        cursor.execute("PRAGMA table_info(students)")
        columns = cursor.fetchall()
        if columns:
            print("Current columns:")
            for col in columns:
                print(f"  {col[0]}: {col[1]} ({col[2]}) {'NOT NULL' if col[3] else 'NULL'} {'PK' if col[5] else ''}")
        else:
            print("❌ Students table doesn't exist!")
    except sqlite3.OperationalError as e:
        print(f"❌ Error checking students table: {e}")
    
    # Check attendance table
    print("\n=== ATTENDANCE TABLE ===")
    try:
        cursor.execute("PRAGMA table_info(attendance)")
        columns = cursor.fetchall()
        if columns:
            print("Current columns:")
            for col in columns:
                print(f"  {col[0]}: {col[1]} ({col[2]}) {'NOT NULL' if col[3] else 'NULL'} {'PK' if col[5] else ''}")
        else:
            print("❌ Attendance table doesn't exist!")
    except sqlite3.OperationalError as e:
        print(f"❌ Error checking attendance table: {e}")
    
    # Check if there are any users
    print("\n=== DATA CHECK ===")
    try:
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        print(f"Total users: {user_count}")
        
        if user_count > 0:
            cursor.execute("SELECT * FROM users LIMIT 3")
            sample_users = cursor.fetchall()
            print("Sample users:")
            for user in sample_users:
                print(f"  {user}")
    except Exception as e:
        print(f"❌ Error checking user data: {e}")
    
    conn.close()

if __name__ == "__main__":
    check_database_schema()