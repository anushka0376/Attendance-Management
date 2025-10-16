import cv2
import face_recognition
import pickle
import os

#importing images 
#opencv uses BGR -> face recognition uses rgb

folderPath ='images'
# Check if images folder exists
if not os.path.exists(folderPath):
    print(f"❌ Folder '{folderPath}' does not exist. Please create it first.")
    exit()

pathList = os.listdir(folderPath)
if not pathList:
    print(f"⚠️ No images found in '{folderPath}' folder.")
    exit()

imgList = []
studentIds = []
for path in pathList:
    img_path = os.path.join(folderPath, path)
    img = cv2.imread(img_path)
    if img is not None:  # Only add valid images
        imgList.append(img)
        studentIds.append(os.path.splitext(path)[0])
    else:
        print(f"⚠️ Could not read image: {img_path}")

print("studentIds: ", studentIds)

def findEncodings(imagesList):
    encodeList = []
    for img in imagesList:
        img = cv2.cvtColor(img,cv2.COLOR_BGR2RGB)
        encodings = face_recognition.face_encodings(img)
        if encodings:  # Check if face encodings found
            encodeList.append(encodings[0])
    return encodeList

print("Encoding Started .....")
encodeListKnown = findEncodings(imgList)

print(encodeListKnown)
encodeListKnownWithIds = [encodeListKnown, studentIds]
print(encodeListKnownWithIds[1])
print("Encoding Completed .....")

file = open("EncodeFile.p",'wb')
pickle.dump(encodeListKnownWithIds,file)
file.close()
print("File Saved")






