# 🔧 Student Addition Error - Troubleshooting Guide

## Common Issues & Solutions

### Issue 1: Backend Server Not Running
**Symptoms:** "Network Error", "Cannot connect to server"
**Solution:** 
1. Start backend server: `python simple_api_server.py`
2. Verify it's running: http://localhost:8000/api/system/status

### Issue 2: Frontend Server Issues  
**Symptoms:** Page won't load, port conflicts
**Solution:**
1. Frontend may be running on port 3001 instead of 3000
2. Check: http://localhost:3001/add-student
3. If permission errors, delete `.next` folder and restart

### Issue 3: Database Connection Error
**Symptoms:** "Error creating student", "Database locked"
**Solution:**
```sql
-- Check if database is accessible
sqlite3 attendance.db "SELECT COUNT(*) FROM students;"
```

### Issue 4: Form Validation Errors
**Symptoms:** "Please fill in all required fields"
**Solutions:**
- ✅ Name: Enter full name (required)
- ✅ Roll Number: Enter student ID (required)  
- ✅ Group: Enter manually like G1, G2, G3 (required)
- ✅ Semester: Select from dropdown (required)
- ✅ Department: Select from dropdown (required)

### Issue 5: CORS Error
**Symptoms:** "Access blocked by CORS policy"
**Solution:** Backend includes CORS for both ports 3000 and 3001

### Issue 6: Image Upload Error
**Symptoms:** "Failed to upload images"
**Solutions:**
- Images are optional for student creation
- Maximum 5 images allowed
- Use 3-5 images for best recognition

## Quick Fix Steps:

1. **Restart Backend:**
   ```bash
   cd "Realtime_faceRecognition-and-Industry-workplace-compilance- copy 2"
   python simple_api_server.py
   ```

2. **Restart Frontend:**
   ```bash
   cd face-attendance-ui
   rm -rf .next
   npx next dev
   ```

3. **Test Connection:**
   - Backend: http://localhost:8000/api/system/status
   - Frontend: http://localhost:3001/add-student

4. **Fill Form Correctly:**
   - All fields marked with * are required
   - Group field now accepts manual input (G1, G2, etc.)

## Error Messages & Solutions:

### "Please fill in all required fields"
- Check that Name, Roll Number, Group, Semester, Department are all filled

### "Network error: 500" 
- Backend database issue - restart backend server

### "Network error: 404"
- Backend not running or wrong URL

### "Cannot connect to server"
- Check if backend is running on port 8000

### Form submission hangs
- Backend may have crashed - check terminal for errors

## Success Indicators:
- ✅ Backend shows: "API will be available at: http://localhost:8000"
- ✅ Frontend shows: "Local: http://localhost:3001" 
- ✅ Form submission shows success toast message
- ✅ Student appears in enrolled students list

## Need Help?
- Check browser developer console (F12) for detailed error messages
- Check backend terminal for Python error traces
- Ensure both servers are running simultaneously