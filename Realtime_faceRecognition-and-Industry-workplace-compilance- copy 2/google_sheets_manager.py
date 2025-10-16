#!/usr/bin/env python3
"""
Google Sheets Integration for Face Recognition Attendance System
Automatically syncs attendance data to Google Sheets
"""

import os
import sqlite3
from datetime import datetime
import json
from typing import List, Dict, Optional

try:
    import gspread
    from google.oauth2.service_account import Credentials
    GOOGLE_SHEETS_AVAILABLE = True
except ImportError:
    GOOGLE_SHEETS_AVAILABLE = False
    print("⚠️ Google Sheets libraries not installed. Run: pip install gspread google-auth")

class GoogleSheetsManager:
    def __init__(self, credentials_path: str = "attendancesystem-456710-b95819cc04c5.json"):
        self.credentials_path = credentials_path
        self.client = None
        self.sheet = None
        self.worksheet = None
        
        if GOOGLE_SHEETS_AVAILABLE:
            self.initialize_connection()
    
    def initialize_connection(self):
        """Initialize Google Sheets connection"""
        try:
            if not os.path.exists(self.credentials_path):
                print(f"❌ Credentials file not found: {self.credentials_path}")
                return False
            
            # Define the scope
            scope = [
                "https://spreadsheets.google.com/feeds",
                "https://www.googleapis.com/auth/drive"
            ]
            
            # Create credentials
            creds = Credentials.from_service_account_file(self.credentials_path, scopes=scope)
            self.client = gspread.authorize(creds)
            
            print("✅ Google Sheets connection initialized successfully")
            return True
            
        except Exception as e:
            print(f"❌ Error initializing Google Sheets: {e}")
            return False
    
    def create_or_get_sheet(self, sheet_name: str = "Face Recognition Attendance"):
        """Create or get existing Google Sheet"""
        try:
            # Try to open existing sheet
            try:
                self.sheet = self.client.open(sheet_name)
                print(f"📋 Opened existing sheet: {sheet_name}")
            except gspread.SpreadsheetNotFound:
                # Create new sheet
                self.sheet = self.client.create(sheet_name)
                print(f"📋 Created new sheet: {sheet_name}")
            
            # Get or create worksheets
            self.setup_worksheets()
            return True
            
        except Exception as e:
            print(f"❌ Error creating/getting sheet: {e}")
            return False
    
    def setup_worksheets(self):
        """Setup worksheets for different data types"""
        try:
            # Students worksheet
            try:
                self.students_ws = self.sheet.worksheet("Students")
            except gspread.WorksheetNotFound:
                self.students_ws = self.sheet.add_worksheet(title="Students", rows="1000", cols="10")
                # Add headers
                self.students_ws.update('A1:G1', [['Student ID', 'Name', 'Roll Number', 'Group/Class', 'Semester', 'Department', 'Date Added']])
            
            # Daily Attendance worksheet
            try:
                self.attendance_ws = self.sheet.worksheet("Daily Attendance")
            except gspread.WorksheetNotFound:
                self.attendance_ws = self.sheet.add_worksheet(title="Daily Attendance", rows="1000", cols="10")
                # Add headers
                self.attendance_ws.update('A1:H1', [['Date', 'Student ID', 'Name', 'Roll Number', 'Time In', 'Status', 'Group/Class', 'Method']])
            
            # Monthly Summary worksheet
            try:
                self.summary_ws = self.sheet.worksheet("Monthly Summary")
            except gspread.WorksheetNotFound:
                self.summary_ws = self.sheet.add_worksheet(title="Monthly Summary", rows="1000", cols="15")
                # Add headers
                self.summary_ws.update('A1:O1', [['Month', 'Student ID', 'Name', 'Roll Number', 'Total Days', 'Present Days', 'Absent Days', 'Attendance %', 'Group/Class', 'Semester', 'Department', 'First Attendance', 'Last Attendance', 'Updated', 'Status']])
            
            print("✅ Worksheets setup completed")
            
        except Exception as e:
            print(f"❌ Error setting up worksheets: {e}")
    
    def sync_students_to_sheets(self):
        """Sync all students from database to Google Sheets"""
        try:
            # Get students from database
            students = self.get_students_from_db()
            
            if not students:
                print("📝 No students found in database")
                return False
            
            # Prepare data for Google Sheets
            sheet_data = []
            for student in students:
                sheet_data.append([
                    student['student_id'],
                    student['name'],
                    student['roll_no'],
                    student['group_name'] or student['class_name'],
                    student['semester_name'],
                    student['department_name'],
                    datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                ])
            
            # Clear existing data and update
            self.students_ws.clear()
            self.students_ws.update('A1:G1', [['Student ID', 'Name', 'Roll Number', 'Group/Class', 'Semester', 'Department', 'Date Added']])
            
            if sheet_data:
                self.students_ws.update(f'A2:G{len(sheet_data)+1}', sheet_data)
            
            print(f"✅ Synced {len(students)} students to Google Sheets")
            return True
            
        except Exception as e:
            print(f"❌ Error syncing students: {e}")
            return False
    
    def sync_attendance_to_sheets(self, date: Optional[str] = None):
        """Sync attendance records to Google Sheets with user context"""
        try:
            # Get attendance from database
            attendance_records = self.get_attendance_from_db(date)
            
            if not attendance_records:
                print(f"📝 No attendance records found for {date or 'today'}")
                return False
            
            # Prepare data for Google Sheets
            sheet_data = []
            for record in attendance_records:
                # Get user info for marked_by field
                marked_by_name = 'System'
                if record.get('marked_by'):
                    try:
                        conn = sqlite3.connect("attendance.db")
                        cursor = conn.cursor()
                        cursor.execute("SELECT full_name FROM users WHERE user_id = ?", (record.get('marked_by'),))
                        user_result = cursor.fetchone()
                        if user_result:
                            marked_by_name = user_result[0]
                        conn.close()
                    except Exception:
                        pass
                
                sheet_data.append([
                    record['date'],
                    record['student_id'],
                    record['student_name'],
                    record['roll_no'],
                    record['time_in'],
                    record['status'],
                    record['group_name'],
                    record['method'],  # Face Recognition or Manual
                    marked_by_name    # Teacher/Admin who marked attendance
                ])
            
            # Update headers if needed
            try:
                headers = self.attendance_ws.row_values(1)
                expected_headers = ['Date', 'Student ID', 'Name', 'Roll No', 'Time In', 'Status', 'Class', 'Method', 'Marked By']
                if len(headers) < len(expected_headers):
                    self.attendance_ws.update('A1:I1', [expected_headers])
            except:
                # Add headers if sheet is empty
                self.attendance_ws.update('A1:I1', [['Date', 'Student ID', 'Name', 'Roll No', 'Time In', 'Status', 'Class', 'Method', 'Marked By']])
            
            # Find the next empty row
            try:
                existing_data = self.attendance_ws.get_all_values()
                next_row = len(existing_data) + 1
            except:
                next_row = 2
            
            # Update the sheet
            if sheet_data:
                range_name = f'A{next_row}:I{next_row + len(sheet_data) - 1}'
                self.attendance_ws.update(range_name, sheet_data)
            
            print(f"✅ Synced {len(attendance_records)} attendance records to Google Sheets with user context")
            return True
            
        except Exception as e:
            print(f"❌ Error syncing attendance: {e}")
            return False
    
    def generate_monthly_summary(self, month: Optional[str] = None):
        """Generate monthly attendance summary"""
        try:
            if not month:
                month = datetime.now().strftime('%Y-%m')
            
            # Get students and their attendance for the month
            summary_data = self.calculate_monthly_summary(month)
            
            if not summary_data:
                print(f"📝 No data found for month: {month}")
                return False
            
            # Prepare data for Google Sheets
            sheet_data = []
            for record in summary_data:
                attendance_percentage = (record['present_days'] / record['total_days'] * 100) if record['total_days'] > 0 else 0
                
                sheet_data.append([
                    month,
                    record['student_id'],
                    record['student_name'],
                    record['roll_no'],
                    record['total_days'],
                    record['present_days'],
                    record['absent_days'],
                    f"{attendance_percentage:.1f}%",
                    record['group_name'],
                    record['semester_name'],
                    record['department_name'],
                    record['first_attendance'],
                    record['last_attendance'],
                    datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    "Active" if attendance_percentage >= 75 else "Low Attendance"
                ])
            
            # Clear and update summary worksheet
            self.summary_ws.clear()
            self.summary_ws.update('A1:O1', [['Month', 'Student ID', 'Name', 'Roll Number', 'Total Days', 'Present Days', 'Absent Days', 'Attendance %', 'Group/Class', 'Semester', 'Department', 'First Attendance', 'Last Attendance', 'Updated', 'Status']])
            
            if sheet_data:
                self.summary_ws.update(f'A2:O{len(sheet_data)+1}', sheet_data)
            
            print(f"✅ Generated monthly summary for {month} with {len(summary_data)} students")
            return True
            
        except Exception as e:
            print(f"❌ Error generating monthly summary: {e}")
            return False
    
    def get_students_from_db(self) -> List[Dict]:
        """Get all students from database"""
        try:
            conn = sqlite3.connect("attendance.db")
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT student_id, name, roll_no, class_name
                FROM students 
                ORDER BY name
            """)
            
            students = []
            for row in cursor.fetchall():
                student = dict(row)
                student['group_name'] = student.get('class_name')  # Use class_name as group_name
                student['semester_name'] = 'N/A'  # Default values
                student['department_name'] = 'N/A'
                students.append(student)
            
            conn.close()
            return students
            
        except Exception as e:
            print(f"❌ Error getting students from database: {e}")
            return []
    
    def get_attendance_from_db(self, date: Optional[str] = None) -> List[Dict]:
        """Get attendance records from database"""
        try:
            conn = sqlite3.connect("attendance.db")
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            if date:
                query = """
                    SELECT a.*, s.name as student_name, s.roll_no, s.class_name
                    FROM attendance a
                    JOIN students s ON a.student_id = s.student_id
                    WHERE a.date = ?
                    ORDER BY a.timestamp DESC
                """
                cursor.execute(query, (date,))
            else:
                # Get today's attendance
                today = datetime.now().strftime('%Y-%m-%d')
                query = """
                    SELECT a.*, s.name as student_name, s.roll_no, s.class_name
                    FROM attendance a
                    JOIN students s ON a.student_id = s.student_id
                    WHERE a.date = ?
                    ORDER BY a.timestamp DESC
                """
                cursor.execute(query, (today,))
            
            records = []
            for row in cursor.fetchall():
                record = dict(row)
                record['time_in'] = record.get('entry_time') or record.get('timestamp', '').split(' ')[1] if record.get('timestamp') else 'N/A'
                record['method'] = 'Manual'  # Default method since no method column exists
                record['status'] = 'Present'  # Default status
                record['group_name'] = record.get('class_name')
                records.append(record)
            
            conn.close()
            return records
            
        except Exception as e:
            print(f"❌ Error getting attendance from database: {e}")
            return []
    
    def calculate_monthly_summary(self, month: str) -> List[Dict]:
        """Calculate monthly attendance summary for each student"""
        try:
            conn = sqlite3.connect("attendance.db")
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Get all students
            cursor.execute("SELECT * FROM students")
            students = cursor.fetchall()
            
            summary_data = []
            
            for student in students:
                student_id = student['student_id']
                
                # Count attendance for the month
                cursor.execute("""
                    SELECT 
                        COUNT(*) as total_days,
                        COUNT(CASE WHEN status = 'Present' THEN 1 END) as present_days,
                        MIN(date) as first_attendance,
                        MAX(date) as last_attendance
                    FROM attendance 
                    WHERE student_id = ? AND date LIKE ?
                """, (student_id, f"{month}%"))
                
                attendance_data = cursor.fetchone()
                
                summary_data.append({
                    'student_id': student_id,
                    'student_name': student['name'],
                    'roll_no': student['roll_no'],
                    'group_name': student.get('group_name') or student.get('class_name'),
                    'semester_name': student.get('semester_name'),
                    'department_name': student.get('department_name'),
                    'total_days': attendance_data['total_days'],
                    'present_days': attendance_data['present_days'],
                    'absent_days': attendance_data['total_days'] - attendance_data['present_days'],
                    'first_attendance': attendance_data['first_attendance'] or 'N/A',
                    'last_attendance': attendance_data['last_attendance'] or 'N/A'
                })
            
            conn.close()
            return summary_data
            
        except Exception as e:
            print(f"❌ Error calculating monthly summary: {e}")
            return []
    
    def auto_sync_attendance(self, student_id: int, status: str = "Present"):
        """Automatically sync single attendance record to Google Sheets"""
        try:
            if not self.client or not self.attendance_ws:
                print("⚠️ Google Sheets not initialized")
                return False
            
            # Get student info
            conn = sqlite3.connect("attendance.db")
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT s.*, a.date, a.timestamp, a.entry_time, a.status
                FROM students s
                JOIN attendance a ON s.student_id = a.student_id
                WHERE s.student_id = ? AND a.date = ?
                ORDER BY a.timestamp DESC LIMIT 1
            """, (student_id, datetime.now().strftime('%Y-%m-%d')))
            
            record = cursor.fetchone()
            conn.close()
            
            if record:
                # Add to Google Sheets
                new_row = [
                    record['date'],
                    record['student_id'],
                    record['name'],
                    record['roll_no'],
                    record.get('entry_time') or record['timestamp'].split(' ')[1],
                    record['status'],
                    record.get('group_name') or record.get('class_name'),
                    'Face Recognition'
                ]
                
                self.attendance_ws.append_row(new_row)
                print(f"✅ Auto-synced attendance for {record['name']} to Google Sheets")
                return True
                
        except Exception as e:
            print(f"❌ Error in auto-sync: {e}")
            return False
    
    def get_sheet_url(self) -> Optional[str]:
        """Get the URL of the Google Sheet"""
        if self.sheet:
            return self.sheet.url
        return None

# Example usage and testing
if __name__ == "__main__":
    print("🔄 Testing Google Sheets Integration...")
    
    # Initialize manager
    sheets_manager = GoogleSheetsManager()
    
    if sheets_manager.client:
        # Create/get sheet
        if sheets_manager.create_or_get_sheet("Face Recognition Attendance System"):
            print("\n📊 Available operations:")
            print("1. Sync Students")
            print("2. Sync Today's Attendance") 
            print("3. Generate Monthly Summary")
            
            # Sync students
            sheets_manager.sync_students_to_sheets()
            
            # Sync attendance
            sheets_manager.sync_attendance_to_sheets()
            
            # Generate summary
            sheets_manager.generate_monthly_summary()
            
            print(f"\n🔗 Google Sheet URL: {sheets_manager.get_sheet_url()}")
        else:
            print("❌ Failed to create/access Google Sheet")
    else:
        print("❌ Google Sheets integration not available")