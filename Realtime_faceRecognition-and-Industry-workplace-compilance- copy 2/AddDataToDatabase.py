import firebase_admin
from firebase_admin import credentials
from firebase_admin import db

#cred = credentials.Certificate("serviceAccountKey.json")
cred = credentials.Certificate("serviceAccountKey.json")

firebase_admin.initialize_app(cred,{
    'databaseURL':"https://realtimefacereco-default-rtdb.firebaseio.com/"
})

ref = db.reference('Students')

data = {
    "1111":
    {
        "name":"Anushka Bhatnagar",
        "Roll No":231099,
        "age":19,
        "degree":"Btech-CSE",
        "Year":"2nd",
        "Batch":"2023-27" 
    },
    "1112":
    {
        "name":"Jiya",
        "Roll No":231099,
        "age":19,
        "degree":"Btech-CSE",
        "Year":"2nd",
        "Batch":"2023-27" 
    },
    "1113":
    {
        "name":"Jhanak",
        "Roll No":231099,
        "age":19,
        "degree":"Btech-CSE",
        "Year":"2nd",
        "Batch":"2023-27" 
    },
    "1114":
    {
        "name":"Ishita",
        "Roll No":231099,
        "age":19,
        "degree":"Btech-CSE",
        "Year":"2nd",
        "Batch":"2023-27" 
    },
    "1115":
    {
        "name":"Prerika",
        "Roll No":241099,
        "age":19,
        "degree":"Btech-CSE",
        "Year":"1st",
        "Batch":"2024-28" 
    }
}

for key,value in data.items():
    ref.child(key).set(value)
