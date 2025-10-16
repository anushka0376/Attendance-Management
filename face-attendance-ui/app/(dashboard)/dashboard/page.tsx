'use client'

import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Camera, FileText, Activity } from "lucide-react"
import useSWR from "swr"
import { api } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"

export default function HomePage() {
  const { user } = useAuth()
  const { data: systemStatus } = useSWR('/api/system/status', () => api.getSystemStatus())
  const { data: studentsData } = useSWR('/api/students', () => api.getStudents())
  const { data: attendanceData } = useSWR('/api/attendance', () => 
    api.getAttendance({ date: new Date().toISOString().split('T')[0] })
  )

  const studentCount = studentsData?.count || 0
  const todayAttendance = attendanceData?.count || 0

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {getGreeting()}, {user?.full_name || user?.username || 'User'}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome to your {user?.role === 'admin' ? 'Admin' : 'Teacher'} Dashboard
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={systemStatus?.opencv_version ? "default" : "secondary"}>
            📹 OpenCV {systemStatus?.opencv_version ? "✓" : "✗"}
          </Badge>
          <Badge variant={systemStatus?.internet_connected ? "default" : "secondary"}>
            🌐 {systemStatus?.internet_connected ? "Online" : "Offline"}
          </Badge>
        </div>
      </div>

      {/* User Info Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-blue-200 dark:border-blue-800">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl ${
              user?.role === 'admin' ? 'bg-red-500' : 'bg-blue-500'
            }`}>
              {user?.full_name 
                ? user.full_name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase()
                : user?.username?.charAt(0).toUpperCase() || 'U'
              }
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">
                {user?.full_name || user?.username || 'Unknown User'}
              </h3>
              <p className="text-muted-foreground">
                <span className="font-medium">Username:</span> {user?.username || 'N/A'} • 
                <span className="font-medium ml-2">Email:</span> {user?.email || 'N/A'}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={user?.role === 'admin' ? 'destructive' : 'default'}>
                  {user?.role === 'admin' ? '👑 Administrator' : '👨‍🏫 Teacher'}
                </Badge>
                {user?.department && (
                  <Badge variant="outline">{user.department}</Badge>
                )}
              </div>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>Logged in as</p>
              <p className="font-mono text-xs">{user?.user_id || 'Unknown ID'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentCount}</div>
            <p className="text-xs text-muted-foreground">Registered students</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Attendance</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayAttendance}</div>
            <p className="text-xs text-muted-foreground">Present today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Badge variant={systemStatus?.face_recognition_available ? "default" : "secondary"}>
              {systemStatus?.face_recognition_available ? "AI Ready" : "Basic Mode"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStatus?.platform}</div>
            <p className="text-xs text-muted-foreground">Platform</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {studentCount > 0 ? Math.round((todayAttendance / studentCount) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Today's rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5" />
              Add Student
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">Register a new student with photos.</p>
            <Button asChild>
              <Link href="/add-student">Open</Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Mark Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">Use camera or mark manually.</p>
            <Button asChild>
              <Link href="/mark-attendance">Open</Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Attendance Records
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">Browse logs and generate reports.</p>
            <Button asChild>
              <Link href="/records">Open</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
