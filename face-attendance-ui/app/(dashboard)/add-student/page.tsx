"use client"
import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Camera, Users, Trash2, Edit3, RefreshCw, Upload, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import useSWR, { mutate } from "swr"
import { api } from "@/lib/api"
import CameraFeed, { type CameraFeedRef } from "@/components/camera/camera-feed"

export default function AddStudentPage() {
  const [fullName, setFullName] = useState("")
  const [rollNumber, setRollNumber] = useState("")
  const [startYear, setStartYear] = useState(new Date().getFullYear().toString())
  const [endYear, setEndYear] = useState((new Date().getFullYear() + 4).toString())
  const [departmentName, setDepartmentName] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [capturedImages, setCapturedImages] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  
  const cameraRef = useRef<CameraFeedRef>(null)
  const { toast } = useToast()
  
  const { data: studentsData } = useSWR('/api/students', () => api.getStudents())
  const { data: batchesData } = useSWR('/api/batches', () => api.getBatches())
  
  const students = studentsData?.students || []
  const batches = batchesData?.batches || []

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 5) {
      toast({
        title: "Too many files",
        description: "Please select maximum 5 images for best results",
        variant: "destructive"
      })
    }
    setSelectedFiles(files.slice(0, 5)) // Max 5 images
  }

  const captureImage = async () => {
    if (!cameraRef.current) {
      toast({
        title: "Error",
        description: "Camera not available",
        variant: "destructive"
      })
      return
    }

    try {
      const blob = await cameraRef.current.capture()
      const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' })
      
      if (capturedImages.length >= 5) {
        toast({
          title: "Maximum reached",
          description: "You can capture 3-5 images for best results",
          variant: "destructive"
        })
        return
      }
      setCapturedImages(prev => [...prev, file])
      toast({
        title: "Image captured",
        description: `Captured ${capturedImages.length + 1}/5 images`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to capture image",
        variant: "destructive"
      })
    }
  }

  const startCamera = () => {
    setCameraActive(true)
  }

  const clearCapturedImages = () => {
    setCapturedImages([])
    toast({
      title: "Images cleared",
      description: "All captured images have been removed",
    })
  }

  const handleAddStudent = async () => {
    if (!fullName || !rollNumber || !startYear || !endYear || !departmentName) {
      toast({
        title: "Error",
        description: "Please fill in all required fields (Name, Roll Number, Years, Department)",
        variant: "destructive"
      })
      return
    }

    const allImages = [...selectedFiles, ...capturedImages]
    if (allImages.length < 3) {
      toast({
        title: "Incomplete facial data",
        description: "Please capture or select at least 3 images (max 5) for reliable face recognition.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      // 1. Find or create batch
      let targetBatchId = ""
      const existingBatch = batches.find((b: any) => 
        b.start_year === parseInt(startYear) && b.end_year === parseInt(endYear)
      )

      if (existingBatch) {
        targetBatchId = existingBatch.id
      } else {
        const newBatch = await api.createBatch({
          name: `${startYear}-${endYear}`,
          start_year: parseInt(startYear),
          end_year: parseInt(endYear),
          degree_duration: parseInt(endYear) - parseInt(startYear)
        })
        targetBatchId = newBatch.id
        mutate('/api/batches') // Refresh batches cache
      }

      // 2. Add student to database
      const response = await api.addStudent({
        name: fullName,
        roll_no: rollNumber,
        batch_id: targetBatchId,
        department: departmentName
      })

      // 3. Upload images if selected or captured
      if (allImages.length > 0 && response.student?.id) {
        await api.uploadStudentImages(response.student.id, allImages)
        toast({
          title: "Registration Success",
          description: `${fullName} added to batch ${startYear}-${endYear} with cloud-synced facial data.`,
        })
      } else {
        toast({
          title: "Student Added",
          description: `${fullName} has been registered!`,
        })
      }

      // Reset form
      setFullName("")
      setRollNumber("")
      setDepartmentName("")
      setSelectedFiles([])
      setCapturedImages([])
      setCameraActive(false)
      
      // Refresh data
      mutate('/api/students')

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add student",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteStudent = async (studentId: string) => {
    try {
      await api.deleteStudent(studentId)
      toast({
        title: "Success",
        description: "Student deleted successfully",
      })
      mutate('/api/students')
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete student",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Student Enrollment</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage student registrations and face recognition data (Supabase)
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Users className="h-4 w-4" />
          <span>{students.length} Students Enrolled</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Student Information & Face Capture */}
        <div className="lg:col-span-1 space-y-6">
          {/* Student Information Card */}
          <Card className="border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Student Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name *
                </label>
                <Input
                  placeholder="Enter student's full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Roll Number *
                </label>
                <Input
                  placeholder="Enter student's roll number"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Year *
                  </label>
                  <Input
                    type="number"
                    value={startYear}
                    onChange={(e) => setStartYear(e.target.value)}
                    className="w-full"
                    placeholder="e.g. 2023"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Year *
                  </label>
                  <Input
                    type="number"
                    value={endYear}
                    onChange={(e) => setEndYear(e.target.value)}
                    className="w-full"
                    placeholder="e.g. 2027"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Department *
                </label>
                <Select value={departmentName} onValueChange={setDepartmentName}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CSE">Computer Science Engineering</SelectItem>
                    <SelectItem value="IT">Information Technology</SelectItem>
                    <SelectItem value="ECE">Electronics & Communication</SelectItem>
                    <SelectItem value="EEE">Electrical & Electronics</SelectItem>
                    <SelectItem value="MECH">Mechanical Engineering</SelectItem>
                    <SelectItem value="CIVIL">Civil Engineering</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload Student Images (Optional)
                </label>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Upload 3-5 clear images for better recognition
                </p>
                {selectedFiles.length > 0 && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                    {selectedFiles.length} image(s) selected {selectedFiles.length >= 3 ? '✅' : '(3+ recommended)'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Face Capture Card */}
          <Card className="border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center gap-2">
                <Camera className="h-5 w-5 text-blue-500" />
                Capture Face Images
                <span className="text-sm font-normal text-orange-600 dark:text-orange-400">
                  {capturedImages.length}/5 Images (3-5 recommended)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 overflow-hidden">
                {cameraActive ? (
                  <CameraFeed ref={cameraRef} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                        Camera preview will appear here
                      </p>
                      <Button 
                        onClick={startCamera} 
                        variant="outline" 
                        size="sm"
                        disabled={!fullName || !rollNumber}
                      >
                        Start Camera
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              {capturedImages.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-green-600 dark:text-green-400 mb-2">
                    Captured {capturedImages.length} image(s) {capturedImages.length >= 3 ? '✅' : '(3+ recommended)'}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {capturedImages.map((_, idx) => (
                      <div key={idx} className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-white text-xs">
                        {idx + 1}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mt-4 flex gap-2">
                {cameraActive ? (
                  <>
                    <Button 
                      onClick={captureImage} 
                      className="flex-1" 
                      disabled={capturedImages.length >= 5}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Capture Image
                    </Button>
                    {capturedImages.length > 0 && (
                      <Button 
                        variant="outline" 
                        onClick={clearCapturedImages}
                        size="sm"
                      >
                        Clear
                      </Button>
                    )}
                  </>
                ) : (
                  <Button 
                    variant="default" 
                    className="bg-blue-500 hover:bg-blue-600 text-white flex-1"
                    disabled={loading || !fullName || !rollNumber || !startYear || !endYear || !departmentName}
                    onClick={handleAddStudent}
                  >
                    {loading ? "Adding..." : "Enroll Student"}
                  </Button>
                )}
              </div>
              
              {cameraActive && (
                <Button 
                  variant="default" 
                  className="bg-blue-500 hover:bg-blue-600 text-white w-full mt-2"
                  disabled={loading || !fullName || !rollNumber || !startYear || !endYear || !departmentName}
                  onClick={handleAddStudent}
                >
                  {loading ? "Adding..." : "Enroll Student"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Enrolled Students */}
        <div className="lg:col-span-2">
          <Card className="border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  Enrolled Students
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => mutate('/api/students')}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {students.map((student: any) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
                        {student.image_urls && student.image_urls.length > 0 ? (
                          <img src={student.image_urls[0]} alt={student.name} className="w-full h-full object-cover" />
                        ) : (
                          student.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {student.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Roll No: {student.roll_no} • {batches.find((b:any) => b.id === student.batch_id)?.name || 'No Batch'}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {student.department}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant="default"
                        className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800"
                      >
                        Active
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Edit3 className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => handleDeleteStudent(student.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
