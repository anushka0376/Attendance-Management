#!/usr/bin/env python3
"""
Database update script to add status column to attendance table
"""

import sqlite3
import os

def update_database():
    # Connect to the database
    db_path = 'attendance.db'
    if not os.path.exists(db_path):
        print(f"Database {db_path} not found!")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if status column already exists
        cursor.execute("PRAGMA table_info(attendance)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'status' not in columns:
            print("Adding status column to attendance table...")
            # Add status column with default value 'Present'
            cursor.execute("ALTER TABLE attendance ADD COLUMN status TEXT DEFAULT 'Present'")
            
            # Update existing records to have 'Present' status
            cursor.execute("UPDATE attendance SET status = 'Present' WHERE status IS NULL")
            
            conn.commit()
            print("✅ Status column added successfully!")
        else:
            print("✅ Status column already exists!")
        
        # Show table structure
        cursor.execute("PRAGMA table_info(attendance)")
        columns = cursor.fetchall()
        print("\nCurrent attendance table structure:")
        for col in columns:
            print(f"  - {col[1]} ({col[2]})")
            
    except Exception as e:
        print(f"❌ Error updating database: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    print("🔄 Updating attendance database schema...")
    update_database()
    print("✅ Database update complete!")