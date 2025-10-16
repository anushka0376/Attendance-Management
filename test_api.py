#!/usr/bin/env python3
"""
Test script to check attendance API
"""

import requests
import json

def test_attendance_api():
    try:
        print("🧪 Testing attendance API...")
        
        # Test students endpoint
        response = requests.get('http://localhost:8000/api/students')
        print(f"Students API status: {response.status_code}")
        if response.status_code == 200:
            students_data = response.json()
            print(f"Students found: {len(students_data.get('students', []))}")
            
        # Test attendance endpoint
        response = requests.get('http://localhost:8000/api/attendance')
        print(f"Attendance API status: {response.status_code}")
        
        if response.status_code == 200:
            attendance_data = response.json()
            print(f"Attendance records found: {len(attendance_data.get('attendance', []))}")
            
            # Show a sample record
            if attendance_data.get('attendance'):
                sample = attendance_data['attendance'][0]
                print("Sample record:")
                print(f"  Student: {sample.get('student_name', 'N/A')}")
                print(f"  Roll: {sample.get('roll_no', 'N/A')}")
                print(f"  Date: {sample.get('date', 'N/A')}")
                print(f"  Status: {sample.get('status', 'N/A')}")
                print(f"  Time: {sample.get('entry_time', 'N/A')}")
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Test failed: {e}")

if __name__ == "__main__":
    test_attendance_api()