"use client"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

export default function AttendanceTable({ batchId = "all" }: { batchId?: string }) {
  const { toast } = useToast()
  
  // Fetch students (filtered by batch if provided)
  const { data: studentsData, isLoading, mutate: mutateStudents } = useSWR(
    `/api/students?batch_id=${batchId}`, 
    () => api.getStudents(batchId === "all" ? undefined : batchId),
    { keepPreviousData: true }
  )

  // Fetch today's attendance
  const { data: attendanceData, mutate: mutateAttendance } = useSWR(
    '/api/attendance', 
    () => api.getAttendance(),
    { keepPreviousData: true }
  )

  const students = studentsData?.students || []
  const attendanceRecords = attendanceData?.attendance || []

  // Create a map of student attendance for today
  // Supabase records have student_id (UUID)
  const attendanceMap = new Map()
  attendanceRecords.forEach((record: any) => {
    // Assuming the API returns records for today by default or we filter here
    attendanceMap.set(record.student_id, record.status || "Present")
  })

  const mark = async (studentId: string, status: "Present" | "Absent") => {
    try {
      if (status === "Present") {
        await api.markAttendance([studentId])
        toast({ title: "Marked Present", description: "Attendance updated in Supabase" })
      } else {
        // Use markAttendance with a specialized status if your API supports it, 
        // or a separate endpoint. For now, we'll just use markAttendance for Present.
        // If you have a markAbsent endpoint, use it here.
        toast({ title: "Feature Pending", description: "Manual 'Absent' marking is being integrated.", variant: "destructive" })
        return;
      }
      
      // Refresh both
      mutateStudents()
      mutateAttendance()
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update attendance",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="overflow-y-auto flex-1 max-h-[400px]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white dark:bg-gray-800 z-10">
            <tr className="border-b border-gray-100 dark:border-gray-700 text-left">
              <th className="px-4 py-3 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Student</th>
              <th className="px-4 py-3 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Roll</th>
              <th className="px-4 py-3 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Status</th>
              <th className="px-4 py-3 font-semibold text-gray-400 uppercase text-[10px] tracking-wider text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {students.map((student: any) => {
              const status = attendanceMap.get(student.id);
              return (
                <tr key={student.id} className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{student.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{student.roll_no}</td>
                  <td className="px-4 py-3">
                    {status === "Present" ? (
                      <Badge className="bg-green-500/10 text-green-600 border-green-200 dark:border-green-900/50 text-[10px] py-0 px-2 uppercase font-bold">
                        Present
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-400 border-gray-100 dark:border-gray-800 text-[10px] py-0 px-2 uppercase">
                        Pending
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button 
                      size="sm"
                      disabled={status === "Present"}
                      className={`h-7 px-3 text-[10px] font-bold uppercase transition-all ${
                        status === "Present" 
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                        : "bg-blue-500 hover:bg-blue-600 text-white shadow-sm"
                      }`}
                      onClick={() => mark(student.id, "Present")}
                    >
                      {status === "Present" ? "Verified" : "Mark"}
                    </Button>
                  </td>
                </tr>
              )
            })}
            
            {!students.length && !isLoading && (
              <tr>
                <td className="px-4 py-12 text-center text-gray-400 text-xs italic" colSpan={4}>
                  No students found in this batch.
                </td>
              </tr>
            )}
            
            {isLoading && (
              <tr>
                <td className="px-4 py-12 text-center" colSpan={4}>
                  <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="p-4 bg-gray-50/50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
            {students.length} Total Enrolled
        </div>
        <div className="flex gap-2">
            <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">{Array.from(attendanceMap.values()).filter(v => v === "Present").length} Present</span>
            </div>
        </div>
      </div>
    </div>
  )
}
