#!/usr/bin/env python3
"""
Fix database schema - Add missing columns to users table
"""
import sqlite3

def check_and_fix_users_table():
    """Check current users table and add missing columns"""
    conn = sqlite3.connect("attendance.db")
    cursor = conn.cursor()
    
    # Get current table info
    cursor.execute("PRAGMA table_info(users)")
    existing_columns = [row[1] for row in cursor.fetchall()]
    
    print("Current users table columns:")
    for col in existing_columns:
        print(f"  ✓ {col}")
    
    # Define required columns
    required_columns = [
        ("department", "TEXT"),
        ("phone_number", "TEXT"),
        ("employee_id", "TEXT"),
        ("qualification", "TEXT"),
        ("experience", "TEXT"),
        ("specialization", "TEXT"),
        ("profile_image", "TEXT"),
        ("last_login", "DATETIME"),
        ("created_by", "TEXT")
    ]
    
    # Add missing columns
    missing_columns = []
    for col_name, col_type in required_columns:
        if col_name not in existing_columns:
            missing_columns.append((col_name, col_type))
    
    if missing_columns:
        print(f"\nAdding {len(missing_columns)} missing columns:")
        for col_name, col_type in missing_columns:
            try:
                cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
                print(f"  ✅ Added {col_name} ({col_type})")
            except sqlite3.OperationalError as e:
                print(f"  ⚠️  Error adding {col_name}: {e}")
    else:
        print("\n✅ All required columns already exist!")
    
    # Commit changes
    conn.commit()
    
    # Verify final schema
    cursor.execute("PRAGMA table_info(users)")
    final_columns = [row[1] for row in cursor.fetchall()]
    
    print(f"\nFinal users table has {len(final_columns)} columns:")
    for col in final_columns:
        print(f"  ✓ {col}")
    
    conn.close()
    print("\n🎉 Database schema fix completed!")

if __name__ == "__main__":
    check_and_fix_users_table()