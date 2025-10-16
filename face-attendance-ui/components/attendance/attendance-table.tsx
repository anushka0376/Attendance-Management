"use client"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

type Student = {
  name: string
  roll: string
  status?: "Present" | "Absent"
}

export default function AttendanceTable() {
  const { toast } = useToast()
  const { data: studentsData, isLoading, mutate } = useSWR('/api/students', () => api.getStudents(), {
    keepPreviousData: true,
  })

  const { data: attendanceData } = useSWR('/api/attendance', () => api.getAttendance(), {
    keepPreviousData: true,
  })

  const students = studentsData?.students || []
  const attendanceRecords = attendanceData?.attendance || []

  // Create a map of student attendance for today
  const today = new Date().toISOString().split('T')[0]
  const attendanceMap = new Map()
  
  attendanceRecords.forEach((record: any) => {
    if (record.date === today) {
      attendanceMap.set(record.student_id, record.status || "Present")
    }
  })

  const mark = async (studentId: number, status: "Present" | "Absent") => {
    try {
      let result;
      if (status === "Present") {
        // Mark attendance using the backend API
        result = await api.markAttendance([studentId])
        toast({
          title: "Attendance Marked",
          description: `Student marked as Present`,
        })
      } else {
        // Mark absent using the new absent endpoint
        result = await api.markAbsent([studentId])
        toast({
          title: "Attendance Updated", 
          description: `Student marked as Absent`,
          variant: "destructive"
        })
      }
      
      // Refresh the data to show updated status
      mutate()
      
    } catch (error) {
      console.error("Failed to mark attendance:", error)
      toast({
        title: "Error",
        description: `Failed to mark ${status}: ${error}`,
        variant: "destructive"
      })
    }
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm table-fixed">
        <thead className="text-muted-foreground">
          <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
            <th className="w-1/4">Name</th>
            <th className="w-1/6">Roll</th>
            <th className="w-1/6">Status</th>
            <th className="w-5/12 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {students.map((student: any) => (
            <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <td className="px-3 py-2">{student.name}</td>
              <td className="px-3 py-2">{student.roll_no}</td>
              <td className="px-3 py-2">
                {attendanceMap.has(student.student_id) ? (
                  attendanceMap.get(student.student_id) === "Present" ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Present
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                      Absent
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                    Not Marked
                  </span>
                )}
              </td>
              <td className="px-3 py-2">
                <div className="flex justify-end gap-1 flex-wrap">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs whitespace-nowrap"
                    onClick={() => mark(student.student_id || student.id, "Absent")}
                  >
                    Absent
                  </Button>
                  <Button 
                    size="sm"
                    className="bg-green-500 hover:bg-green-600 text-white text-xs whitespace-nowrap"
                    onClick={() => mark(student.student_id || student.id, "Present")}
                  >
                    Present
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {!students.length && (
            <tr>
              <td className="px-3 py-6 text-center text-muted-foreground" colSpan={4}>
                {isLoading ? "Loading students..." : "No students yet."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
