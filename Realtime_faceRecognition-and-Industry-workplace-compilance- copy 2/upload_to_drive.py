# # from pydrive.auth import GoogleAuth
# # from pydrive.drive import GoogleDrive

# # # Re-authenticate
# # gauth = GoogleAuth()
# # gauth.LocalWebserverAuth()  # This will open a browser for re-authentication

# # drive = GoogleDrive(gauth)

# # print("Authentication complete!")




# # import cv2
# # import face_recognition
# # import os
# # import numpy as np
# # import pandas as pd
# # from datetime import datetime
# # import sqlite3
# # import pyttsx3
# # import keyboard
# # import openpyxl
# # import shutil
# # from openpyxl import load_workbook
# # import gspread
# # from google.oauth2.service_account import Credentials
# # from datetime import timedelta

# # # Initialize text-to-speech engine
# # engine = pyttsx3.init()

# # # Database setup
# # conn = sqlite3.connect('students.db')
# # cursor = conn.cursor()
# # cursor.execute('''CREATE TABLE IF NOT EXISTS students
# #                   (student_id TEXT PRIMARY KEY, name TEXT)''')
# # conn.commit()

# # # Create folders
# # if not os.path.exists('UnknownFaces'):
# #     os.makedirs('UnknownFaces')
# # if not os.path.exists('AttendanceData'):
# #     os.makedirs('AttendanceData')

# # # Load known images and encode
# # path = 'Training_images'
# # images = []
# # classNames = []
# # student_ids = []

# # myList = os.listdir(path)
# # for cl in myList:
# #     img = cv2.imread(f'{path}/{cl}')
# #     images.append(img)
# #     name_id = os.path.splitext(cl)[0].split('_')
# #     classNames.append(name_id[1])
# #     student_ids.append(name_id[0])

# #     # Add to database if not already present
# #     cursor.execute("INSERT OR IGNORE INTO students (student_id, name) VALUES (?, ?)", (name_id[0], name_id[1]))
# # conn.commit()

# # def findEncodings(images):
# #     encodeList = []
# #     for img in images:
# #         img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
# #         encodes = face_recognition.face_encodings(img)
# #         if encodes:
# #             encodeList.append(encodes[0])
# #     return encodeList

# # encodeListKnown = findEncodings(images)

# # # Attendance tracking
# # attendance_set = set()

# # def markAttendance(student_id):
# #     now = datetime.now()
# #     dt_string = now.strftime('%Y-%m-%d %H:%M:%S')
# #     name = cursor.execute("SELECT name FROM students WHERE student_id=?", (student_id,)).fetchone()[0]

# #     if student_id not in attendance_set:
# #         attendance_set.add(student_id)

# #         # Excel
# #         date_str = now.strftime('%Y-%m-%d')
# #         file_path = f'AttendanceData/Attendance_{date_str}.xlsx'
# #         if not os.path.exists(file_path):
# #             wb = openpyxl.Workbook()
# #             ws = wb.active
# #             ws.title = "Attendance"
# #             ws.append(["Student ID", "Name", "Time"])
# #             wb.save(file_path)

# #         wb = load_workbook(file_path)
# #         ws = wb.active
# #         ws.append([student_id, name, dt_string])
# #         wb.save(file_path)

# #         # Speak
# #         engine.say(f"Welcome {name}")
# #         engine.runAndWait()

# #         # Print and return
# #         print(f"Marked attendance for {name} at {dt_string}")
# #         return name
# #     return None

# # # Google Sheets Setup
# # def upload_to_google_sheets():
# #     try:
# #         SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
# #         SERVICE_ACCOUNT_FILE = 'service_account.json'  # Rename your service account file

# #         credentials = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
# #         client = gspread.authorize(credentials)

# #         date_str = datetime.now().strftime('%Y-%m-%d')
# #         file_path = f'AttendanceData/Attendance_{date_str}.xlsx'
# #         df = pd.read_excel(file_path)

# #         sheet = client.create(f"Attendance_{date_str}")
# #         worksheet = sheet.get_worksheet(0)
# #         worksheet.update([df.columns.values.tolist()] + df.values.tolist())
# #         print("Uploaded to Google Sheets")

# #     except Exception as e:
# #         print("Failed to upload to Google Sheets:", str(e))

# # # Camera
# # cap = cv2.VideoCapture(0)
# # print("Starting camera. Press 'q' to quit. Press 'Command + D' to delete data.")
# # last_seen = {}
# # max_time_diff = timedelta(seconds=30)

# # while True:
# #     success, img = cap.read()
# #     if not success:
# #         print("Failed to grab frame.")
# #         break

# #     imgS = cv2.resize(img, (0, 0), fx=0.25, fy=0.25)
# #     imgS = cv2.cvtColor(imgS, cv2.COLOR_BGR2RGB)
# #     facesCurFrame = face_recognition.face_locations(imgS)
# #     encodesCurFrame = face_recognition.face_encodings(imgS, facesCurFrame)

# #     for encodeFace, faceLoc in zip(encodesCurFrame, facesCurFrame):
# #         matches = face_recognition.compare_faces(encodeListKnown, encodeFace)
# #         faceDis = face_recognition.face_distance(encodeListKnown, encodeFace)

# #         matchIndex = np.argmin(faceDis)
# #         if matches[matchIndex]:
# #             student_id = student_ids[matchIndex]
# #             now = datetime.now()
# #             if (student_id not in last_seen) or (now - last_seen[student_id] > max_time_diff):
# #                 name = markAttendance(student_id)
# #                 last_seen[student_id] = now

# #             y1, x2, y2, x1 = faceLoc
# #             y1, x2, y2, x1 = y1*4, x2*4, y2*4, x1*4
# #             cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
# #             cv2.putText(img, classNames[matchIndex], (x1 + 6, y2 - 6),
# #                         cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)

# #         else:
# #             now = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
# #             cv2.imwrite(f"UnknownFaces/Unknown_{now}.jpg", img)
# #             print("Unknown face detected and saved.")

# #     cv2.imshow('Webcam', img)

# #     # Quit key
# #     if cv2.waitKey(1) & 0xFF == ord('q'):
# #         upload_to_google_sheets()
# #         break

# #     # Delete key (Command + D on Mac)
# #     if keyboard.is_pressed('command') and keyboard.is_pressed('d'):
# #         print("Deleting today's attendance file...")
# #         today_file = f'AttendanceData/Attendance_{datetime.now().strftime("%Y-%m-%d")}.xlsx'
# #         if os.path.exists(today_file):
# #             os.remove(today_file)
# #             print("Attendance file deleted.")
# #         attendance_set.clear()

# # cap.release()
# # cv2.destroyAllWindows()
# # conn.close()



# import cv2
# import numpy as np
# import face_recognition
# import os
# import pandas as pd
# import datetime
# import pyttsx3
# import sqlite3

# # Initialize text-to-speech engine
# engine = pyttsx3.init()

# # Connect to SQLite database
# conn = sqlite3.connect('students.db')
# cursor = conn.cursor()

# # Create students table if not exists
# cursor.execute('''CREATE TABLE IF NOT EXISTS students
#                   (student_id TEXT PRIMARY KEY, name TEXT)''')
# conn.commit()

# # Path for training images
# path = 'Training_images'
# images = []
# classNames = []
# student_ids = []
# myList = os.listdir(path)

# for cl in myList:
#     img = cv2.imread(f'{path}/{cl}')
#     images.append(img)
#     name_id = os.path.splitext(cl)[0].split('_')
#     classNames.append(name_id[1])
#     student_ids.append(name_id[0])
#     # Add student to database if not exists
#     cursor.execute("INSERT OR IGNORE INTO students (student_id, name) VALUES (?, ?)", (name_id[0], name_id[1]))
# conn.commit()

# def findEncodings(images):
#     encodeList = []
#     for img in images:
#         img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
#         encodings = face_recognition.face_encodings(img)
#         if encodings:
#             encodeList.append(encodings[0])
#     return encodeList

# encodeListKnown = findEncodings(images)
# print('Encoding Complete')

# attendance = []

# def markAttendance(student_id):
#     name = cursor.execute("SELECT name FROM students WHERE student_id=?", (student_id,)).fetchone()[0]
#     now = datetime.datetime.now()
#     dtString = now.strftime('%H:%M:%S')

#     if student_id not in [entry[0] for entry in attendance]:
#         attendance.append((student_id, name, dtString))
#         df = pd.DataFrame(attendance, columns=["Student ID", "Name", "Time"])
#         df.to_excel(f"Attendance_{now.strftime('%Y-%m-%d')}.xlsx", index=False)
#         engine.say(f"Attendance marked for {name}")
#         engine.runAndWait()

# cap = cv2.VideoCapture(0)

# while True:
#     success, img = cap.read()
#     imgS = cv2.resize(img, (0, 0), fx=0.25, fy=0.25)
#     imgS = cv2.cvtColor(imgS, cv2.COLOR_BGR2RGB)

#     facesCurFrame = face_recognition.face_locations(imgS)
#     encodesCurFrame = face_recognition.face_encodings(imgS, facesCurFrame)

#     for encodeFace, faceLoc in zip(encodesCurFrame, facesCurFrame):
#         matches = face_recognition.compare_faces(encodeListKnown, encodeFace)
#         faceDis = face_recognition.face_distance(encodeListKnown, encodeFace)
#         matchIndex = np.argmin(faceDis)

#         if matches[matchIndex]:
#             student_id = student_ids[matchIndex]
#             name = classNames[matchIndex]

#             markAttendance(student_id)

#             y1, x2, y2, x1 = faceLoc
#             y1, x2, y2, x1 = y1*4, x2*4, y2*4, x1*4
#             cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
#             cv2.putText(img, name, (x1 + 6, y2 - 6), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)

#     cv2.imshow('Webcam', img)
#     if cv2.waitKey(1) & 0xFF == ord('q'):
#         break

# cap.release()
# cv2.destroyAllWindows()
# conn.close()


from pydrive.auth import GoogleAuth
from pydrive.drive import GoogleDrive
import os
import pyttsx3
import datetime

# Initialize text-to-speech engine
engine = pyttsx3.init()
def speak(text):
    engine.say(text)
    engine.runAndWait()

# Authenticate with Google Drive
ga = GoogleAuth()
ga.LocalWebserverAuth()
drive = GoogleDrive(ga)

# Define path to the Training_images folder
path = 'Training_images'

# Check if directory exists
if not os.path.exists(path):
    print(f"❌ Directory '{path}' does not exist. Please create it or check the path.")
    speak("Training images folder not found. Please check the path.")
    exit()

# List all files in the directory
myList = os.listdir(path)

if not myList:
    print("⚠️ No files found in Training_images folder.")
    speak("No files found in training images folder.")
    exit()

# Create folder on Google Drive
folder_metadata = {
    'title': f'Training_Images_Backup_{datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")}',
    'mimeType': 'application/vnd.google-apps.folder'
}
folder = drive.CreateFile(folder_metadata)
folder.Upload()
folder_id = folder['id']

print(f"📁 Created folder on Google Drive with ID: {folder_id}")
speak("Uploading training images to Google Drive")

# Upload each file to the Drive folder
for filename in myList:
    file_path = os.path.join(path, filename)
    if os.path.isfile(file_path):
        f = drive.CreateFile({'title': filename, 'parents': [{'id': folder_id}]})
        f.SetContentFile(file_path)
        f.Upload()
        print(f"✅ Uploaded: {filename}")

print("🎉 All files uploaded successfully!")
speak("All training images have been uploaded successfully")
