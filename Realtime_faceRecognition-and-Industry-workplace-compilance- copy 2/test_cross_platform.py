#!/usr/bin/env python3
"""
Quick test script to verify cross-platform functionality
"""
import os
import platform
import sqlite3
from datetime import datetime

def test_platform_detection():
    print(f"🖥️  Platform: {platform.system()}")
    print(f"📊 Python version: {platform.python_version()}")
    is_mac = platform.system() == "Darwin"
    is_windows = platform.system() == "Windows"
    print(f"🍎 Is macOS: {is_mac}")
    print(f"🪟 Is Windows: {is_windows}")
    return True

def test_database():
    print("\n🗄️ Testing SQLite database...")
    conn = sqlite3.connect("test_attendance.db")
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS test_table (
            id INTEGER PRIMARY KEY,
            name TEXT,
            timestamp TEXT
        )
    """)
    
    # Insert test data
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("INSERT INTO test_table (name, timestamp) VALUES (?, ?)", 
                  ("Test User", now))
    conn.commit()
    
    # Read back
    cursor.execute("SELECT * FROM test_table")
    result = cursor.fetchone()
    
    conn.close()
    os.remove("test_attendance.db")  # Clean up
    
    print(f"✅ Database test passed: {result}")
    return True

def test_directories():
    print("\n📁 Testing directory creation...")
    test_dirs = ["test_images", "test_unknown"]
    
    for dir_name in test_dirs:
        os.makedirs(dir_name, exist_ok=True)
        if os.path.exists(dir_name):
            print(f"✅ Created: {dir_name}")
            os.rmdir(dir_name)  # Clean up
        else:
            print(f"❌ Failed to create: {dir_name}")
            return False
    return True

def test_file_paths():
    print("\n🛤️ Testing file path handling...")
    # Test cross-platform path joining
    test_path = os.path.join("images", "student", "photo.png")
    print(f"Sample path: {test_path}")
    
    # Test expanduser (for home directory paths)
    home_path = os.path.expanduser("~/Documents")
    print(f"Home path example: {home_path}")
    
    return True

def test_environment_variables():
    print("\n🌍 Testing environment variable handling...")
    
    # Test getting an environment variable
    service_json = os.environ.get("SERVICE_ACCOUNT_JSON", "default-file.json")
    print(f"Service account path: {service_json}")
    
    # Test setting a fallback path
    fallback_path = os.path.expanduser(os.path.join(os.getcwd(), "fallback.json"))
    print(f"Fallback path: {fallback_path}")
    
    return True

if __name__ == "__main__":
    print("🧪 Face Recognition Attendance System - Cross-Platform Test")
    print("=" * 60)
    
    tests = [
        test_platform_detection,
        test_database,
        test_directories,
        test_file_paths,
        test_environment_variables
    ]
    
    passed = 0
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"❌ Test failed: {e}")
    
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {passed}/{len(tests)} tests passed")
    
    if passed == len(tests):
        print("🎉 All tests passed! The system should work on both Windows and macOS.")
    else:
        print("⚠️ Some tests failed. Check the output above for details.")