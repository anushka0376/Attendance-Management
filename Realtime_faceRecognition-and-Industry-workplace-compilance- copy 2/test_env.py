#!/usr/bin/env python3
"""
Quick test to verify the environment is working
"""
try:
    import cv2
    print("✅ OpenCV imported successfully")
    print(f"📹 OpenCV version: {cv2.__version__}")
except ImportError as e:
    print(f"❌ OpenCV import failed: {e}")

try:
    import numpy as np
    print("✅ NumPy imported successfully")
except ImportError as e:
    print(f"❌ NumPy import failed: {e}")

try:
    import pandas as pd
    print("✅ Pandas imported successfully")
except ImportError as e:
    print(f"❌ Pandas import failed: {e}")

try:
    import sqlite3
    print("✅ SQLite3 imported successfully")
except ImportError as e:
    print(f"❌ SQLite3 import failed: {e}")

try:
    import face_recognition
    print("✅ Face recognition imported successfully")
except ImportError as e:
    print(f"⚠️ Face recognition not available: {e}")

print("\n🧪 Testing basic functionality...")

# Test camera detection
try:
    import cv2
    cap = cv2.VideoCapture(0)
    if cap.isOpened():
        print("✅ Camera detected and accessible")
        cap.release()
    else:
        print("⚠️ No camera detected at index 0")
except Exception as e:
    print(f"❌ Camera test failed: {e}")

print("\n🎉 Environment test completed!")