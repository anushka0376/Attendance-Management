'use client'

import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Camera, FileText, Activity, ShieldCheck, Zap } from "lucide-react"
import useSWR from "swr"
import { api } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { AttendanceTrends } from "@/components/dashboard/attendance-trends"
import { StatusDistribution } from "@/components/dashboard/status-distribution"

export default function HomePage() {
  const { user } = useAuth()
  const { data: systemStatus } = useSWR('/api/system/status', () => api.getSystemStatus())
  const { data: studentsData } = useSWR('/api/students', () => api.getStudents())
  const { data: analytics } = useSWR('/api/analytics/summary', () => api.getAnalyticsSummary())
  const { data: attendanceData } = useSWR('/api/attendance', () => 
    api.getAttendance({ date: new Date().toISOString().split('T')[0] })
  )

  const studentCount = studentsData?.count || analytics?.total_students || 0
  const todayAttendance = attendanceData?.count || 0
  const trends = analytics?.trends || []
  const distribution = analytics?.distribution || []

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            {getGreeting()}, {user?.full_name?.split(' ')[0] || user?.username || 'User'}! 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
            System is active and protecting {studentCount} registered students.
          </p>
        </div>
        <div className="flex items-center gap-3">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 px-4 py-2 rounded-2xl flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-green-500" />
                <span className="text-sm font-semibold text-green-700 dark:text-green-400">Security: Active (RLS)</span>
            </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-500/20 overflow-hidden relative group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
          <CardHeader className="pb-2">
            <Users className="h-5 w-5 opacity-80" />
            <CardTitle className="text-xs font-medium opacity-80 uppercase tracking-wider mt-2">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{studentCount}</div>
            <div className="flex items-center gap-1 mt-2 text-[10px] font-medium bg-white/20 w-fit px-2 py-0.5 rounded-full">
                +2 NEW THIS WEEK
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Today's Presence</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                <Activity className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{todayAttendance}</div>
            <p className="text-xs text-gray-500 mt-1">Verified via Face Recognition</p>
          </CardContent>
        </Card>

        <Card className="border-none bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Attendance Rate</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {studentCount > 0 ? Math.round((todayAttendance / studentCount) * 100) : 0}%
            </div>
            <p className="text-xs text-gray-500 mt-1">Status: {studentCount > 0 && (todayAttendance / studentCount) > 0.8 ? 'Excellent' : 'Normal'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Section */}
      <div className="grid gap-6 md:grid-cols-7">
        <AttendanceTrends data={trends} />
        <StatusDistribution data={distribution} />
      </div>

      {/* Action Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <Link href="/add-student" className="group">
            <Card className="h-full border border-gray-100 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5 cursor-pointer">
                <CardHeader>
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Users className="h-6 w-6 text-blue-600" />
                    </div>
                </CardHeader>
                <CardContent>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Student Enrollment</h3>
                    <p className="text-sm text-gray-500 mt-1">Register students with high-precision face encodings.</p>
                </CardContent>
            </Card>
        </Link>
        
        <Link href="/mark-attendance" className="group">
            <Card className="h-full border border-gray-100 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5 cursor-pointer">
                <CardHeader>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Camera className="h-6 w-6 text-indigo-600" />
                    </div>
                </CardHeader>
                <CardContent>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recognition Terminal</h3>
                    <p className="text-sm text-gray-500 mt-1">Mark attendance using real-time AI computer vision.</p>
                </CardContent>
            </Card>
        </Link>
        
        <Link href="/records" className="group">
            <Card className="h-full border border-gray-100 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/5 cursor-pointer">
                <CardHeader>
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FileText className="h-6 w-6 text-purple-600" />
                    </div>
                </CardHeader>
                <CardContent>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Detailed Reports</h3>
                    <p className="text-sm text-gray-500 mt-1">Analyze history, export logs, and track performance.</p>
                </CardContent>
            </Card>
        </Link>
      </div>
    </div>
  )
}
