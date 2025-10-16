"use client"
import useSWR from "swr"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { useState } from "react"
import { Search, Filter, RefreshCw, Eye } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type RecordRow = {
  name: string
  roll: string
  date: string
  time: string
  status: "Present" | "Absent"
  branch?: string
  semester?: string
}

function RecordDetailModal({ record }: { record: RecordRow }) {
  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Attendance Record Details</DialogTitle>
        <DialogDescription>
          Detailed information for {record.name}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Name</label>
            <p className="font-medium">{record.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Roll Number</label>
            <p className="font-medium">{record.roll}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Date</label>
            <p>{record.date}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Time</label>
            <p>{record.time}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Status</label>
            <Badge variant={record.status === "Present" ? "default" : "destructive"}>
              {record.status}
            </Badge>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Branch</label>
            <p>{record.branch ?? "—"}</p>
          </div>
        </div>
        {record.semester && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Semester</label>
            <p>{record.semester}</p>
          </div>
        )}
      </div>
    </DialogContent>
  )
}

export default function RecordsTable() {
  const [date, setDate] = useState("")
  const [branch, setBranch] = useState("")
  const [semester, setSemester] = useState("")

  const { data: attendanceData, isLoading, mutate } = useSWR(
    '/api/attendance', 
    () => api.getAttendance({ 
      date: date || undefined,
      // We'll filter client-side by branch/semester since backend doesn't support these filters yet
    }), 
    { keepPreviousData: true }
  )

  const local: RecordRow[] = [
    {
      name: "Alice Johnson",
      roll: "CSE-001",
      date: "2025-05-14",
      time: "09:05",
      status: "Present",
      branch: "CSE",
      semester: "5",
    },
    {
      name: "Bob Singh",
      roll: "CSE-002",
      date: "2025-05-14",
      time: "09:06",
      status: "Absent",
      branch: "CSE",
      semester: "5",
    },
    {
      name: "Charlie Davis",
      roll: "CSE-003",
      date: "2025-05-14",
      time: "09:07",
      status: "Present",
      branch: "CSE",
      semester: "5",
    },
  ]

  // Process attendance data and apply filters
  let rows: RecordRow[] = local
  
  if (attendanceData?.attendance) {
    rows = attendanceData.attendance.map((record: any) => ({
      name: record.student_name || "Unknown",
      roll: record.student_roll || record.roll_no || "N/A",
      date: record.date || new Date().toISOString().split('T')[0],
      time: record.time_in || record.entry_time || record.timestamp?.split('T')[1]?.split('.')[0] || "N/A",
      status: (record.status || "Present") as "Present" | "Absent",
      branch: record.department_name || record.class_name || record.branch || "N/A",
      semester: record.semester_name || record.semester || "N/A"
    }))
  }

  // Apply client-side filters
  if (date) {
    rows = rows.filter(row => row.date === date)
  }
  if (branch) {
    rows = rows.filter(row => row.branch?.toLowerCase().includes(branch.toLowerCase()))
  }
  if (semester) {
    rows = rows.filter(row => row.semester?.toLowerCase().includes(semester.toLowerCase()))
  }

  const handleReset = () => {
    setDate("")
    setBranch("")
    setSemester("")
    mutate()
  }

  return (
    <div className="space-y-6">
      {/* Filter Card */}
      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-500" />
            Filter Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Quick Date Selection */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDate(new Date().toISOString().split('T')[0])}
              className="text-xs"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const yesterday = new Date()
                yesterday.setDate(yesterday.getDate() - 1)
                setDate(yesterday.toISOString().split('T')[0])
              }}
              className="text-xs"
            >
              Yesterday
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const lastWeek = new Date()
                lastWeek.setDate(lastWeek.getDate() - 7)
                setDate(lastWeek.toISOString().split('T')[0])
              }}
              className="text-xs"
            >
              Last Week
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDate("")}
              className="text-xs"
            >
              Clear Date
            </Button>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Date</label>
              <Input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                className="w-full border-gray-300 dark:border-gray-600"
                max={new Date().toISOString().split('T')[0]}
              />
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {date ? `Showing records for ${new Date(date).toLocaleDateString()}` : "All dates"}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Branch</label>
              <Input
                placeholder="e.g., CSE, ECE, IT"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full border-gray-300 dark:border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Semester</label>
              <Input
                placeholder="e.g., 1, 2, 3"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full border-gray-300 dark:border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium invisible">Actions</label>
              <div className="flex gap-2">
                <Button 
                  onClick={() => mutate()} 
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white" 
                  size="sm"
                >
                  <Search className="h-4 w-4 mr-1" />
                  Apply
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleReset} 
                  size="sm"
                  className="border-gray-300 dark:border-gray-600"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records Table Card */}
      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            Attendance Records
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr className="border-b border-gray-200 dark:border-gray-600">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Roll</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Branch</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Semester</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                  {(isLoading ? local : rows).map((record: RecordRow, idx: number) => (
                    <tr 
                      key={`${record.roll}-${record.date}-${idx}`} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                            {record.name.charAt(0)}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">{record.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{record.roll}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{record.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{record.time}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge 
                          variant={record.status === "Present" ? "default" : "destructive"}
                          className={record.status === "Present" 
                            ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200" 
                            : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                          }
                        >
                          {record.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{record.branch ?? "—"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{record.semester ?? "—"}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <RecordDetailModal record={record} />
                        </Dialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {rows.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <div className="text-gray-500 dark:text-gray-400">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No records found</p>
                <p className="text-sm">Try adjusting your filters to see more results.</p>
              </div>
            </div>
          )}
          {isLoading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading records...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
