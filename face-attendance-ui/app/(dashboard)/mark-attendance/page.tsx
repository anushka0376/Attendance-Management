"use client"

import { useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import CameraFeed, { type CameraFeedRef } from "@/components/camera/camera-feed"
import AttendanceTable from "@/components/attendance/attendance-table"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { ScanFace, Camera, Users } from "lucide-react"

export default function MarkAttendancePage() {
  const cameraRef = useRef<CameraFeedRef>(null)
  const [isRecognizing, setIsRecognizing] = useState(false)
  const { toast } = useToast()

  const onRecognize = async () => {
    if (!cameraRef.current) return
    try {
      setIsRecognizing(true)
      const blob = await cameraRef.current.capture()
      
      // Create a File object from the blob
      const file = new File([blob], "frame.jpg", { type: 'image/jpeg' })
      
      // Use the API function for face verification
      const result = await api.verifyAttendanceByImage(file)
      
      if (result.student_found && result.student_id) {
        if (result.already_marked_today) {
          toast({
            title: "Already marked",
            description: `${result.student_name} (${result.roll_no}) already marked for today`,
            variant: "destructive"
          })
        } else {
          // Mark attendance automatically
          await api.markAttendance([result.student_id])
          toast({
            title: "Face recognized & Attendance marked!",
            description: `${result.student_name} (${result.roll_no}) - Confidence: ${(result.confidence * 100).toFixed(1)}%`,
          })
        }
      } else {
        toast({
          title: "Face not recognized",
          description: "No matching face found in database. Please try again.",
          variant: "destructive"
        })
      }
    } catch (e: any) {
      toast({ 
        title: "Recognition Error", 
        description: e.message || "Failed to recognize face",
        variant: "destructive"
      })
    } finally {
      setIsRecognizing(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mark Attendance</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Use facial recognition to automatically mark student attendance
          </p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'short', 
            day: 'numeric' 
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Camera Section */}
        <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <ScanFace className="h-4 w-4 text-blue-500" />
              </div>
              Face Recognition Camera
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="aspect-video rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 overflow-hidden">
              <CameraFeed ref={cameraRef} />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">Live</span>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Camera active • Ready for recognition
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={onRecognize} 
                disabled={isRecognizing}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
              >
                {isRecognizing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Recognizing...
                  </>
                ) : (
                  <>
                    <ScanFace className="h-4 w-4 mr-2" />
                    Recognize Face
                  </>
                )}
              </Button>
              <Button variant="outline" size="default">
                <Camera className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Students List */}
        <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <Users className="h-4 w-4 text-green-500" />
              </div>
              Today's Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceTable />
          </CardContent>
        </Card>
      </div>

      {/* Recent Recognitions */}
      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Recognition Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: "John Doe", time: "09:15 AM", status: "Present", roll: "CS001" },
              { name: "Jane Smith", time: "09:12 AM", status: "Present", roll: "CS002" },
              { name: "Mike Johnson", time: "09:08 AM", status: "Present", roll: "CS003" },
            ].map((student, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {student.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{student.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Roll: {student.roll}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{student.time}</span>
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-medium rounded-full">
                    {student.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
