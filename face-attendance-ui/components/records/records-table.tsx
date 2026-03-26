"use client"
import useSWR from "swr"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { useState } from "react"
import { Search, Filter, RefreshCw, Eye, Calendar, Layers } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type RecordRow = {
  id: string
  student_name: string
  student_roll: string
  date: string
  entry_time: string
  status: string
  batch_id?: string
  class_id?: string
  batch_name?: string
}

function RecordDetailModal({ record }: { record: RecordRow }) {
  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Attendance Record Details</DialogTitle>
        <DialogDescription>
          Detailed cloud-synced information
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Name</label>
            <p className="font-semibold text-gray-900 dark:text-white">{record.student_name}</p>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Roll Number</label>
            <p className="font-mono text-sm">{record.student_roll}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</label>
            <p className="text-sm">{record.date}</p>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Entry Time</label>
            <p className="text-sm">{record.entry_time}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</label>
            <div className="mt-1">
                <Badge className="bg-green-500/10 text-green-600 border-green-200">
                {record.status}
                </Badge>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Batch</label>
            <p className="text-sm font-medium text-blue-600">{record.batch_name || "N/A"}</p>
          </div>
        </div>
      </div>
    </DialogContent>
  )
}

export default function RecordsTable() {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all")
  const [selectedClassId, setSelectedClassId] = useState<string>("all")

  // Fetch batches for filter
  const { data: batchesData } = useSWR('/api/batches', () => api.getBatches())
  const batches = batchesData?.batches || []

  // Fetch teacher's classes for granular subject-wise filter
  const { data: classesData } = useSWR('/api/academic/my-classes', () => api.getMyClasses())
  const classes = classesData || []

  // Fetch attendance records
  const { data: attendanceData, isLoading, mutate } = useSWR(
    `/api/attendance?date=${date}&batch_id=${selectedBatchId}&class_id=${selectedClassId}`, 
    () => api.getAttendance({ 
      date: date || undefined,
      batch_id: selectedBatchId === "all" ? undefined : selectedBatchId,
      class_id: selectedClassId === "all" ? undefined : selectedClassId
    }), 
    { keepPreviousData: true }
  )

  const rows = attendanceData?.attendance || []

  const handleReset = () => {
    setDate(new Date().toISOString().split('T')[0])
    setSelectedBatchId("all")
    setSelectedClassId("all")
    mutate()
  }

  return (
    <div className="space-y-6">
      {/* Filter Card */}
      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
        <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700">
          <CardTitle className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Filter className="h-4 w-4 text-blue-500" />
            Filter History
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Effective Date</label>
              <div className="relative">
                <Input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    className="pl-10 h-10 border-gray-200 focus:ring-blue-500"
                    max={new Date().toISOString().split('T')[0]}
                />
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Academic Batch</label>
              <div className="relative">
                <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                    <SelectTrigger className="pl-10 h-10 border-gray-200">
                        <SelectValue placeholder="All Batches" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Batches</SelectItem>
                        {batches.map((b: any) => (
                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Layers className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subject / Class</label>
              <div className="relative">
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                    <SelectTrigger className="pl-10 h-10 border-gray-200">
                        <SelectValue placeholder="All Subjects" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Sessions</SelectItem>
                        {classes.map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>
                                {c.subjects?.name} ({c.batches?.name})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Filter className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-end gap-2">
                <Button 
                    onClick={() => mutate()} 
                    className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider" 
                >
                    <RefreshCw className="h-3.5 w-3.5 mr-2" />
                    Sync with Cloud
                </Button>
                <Button 
                    variant="outline" 
                    onClick={handleReset} 
                    className="h-10 px-3 border-gray-200 hover:bg-gray-50 text-gray-400"
                >
                    <Filter className="h-4 w-4" />
                </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records Table Card */}
      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
            <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest w-[250px]">Student Identity</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Roll No</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Session Time</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {isLoading ? (
                    <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                            <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                            <span className="text-xs text-gray-400 font-medium">Fetching historical data...</span>
                        </td>
                    </tr>
                ) : rows.length === 0 ? (
                    <tr>
                        <td colSpan={5} className="px-6 py-20 text-center">
                            <div className="w-12 h-12 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-dashed border-gray-200">
                                <Search className="h-5 w-5 text-gray-300" />
                            </div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">No entries found</h3>
                            <p className="text-xs text-gray-500 mt-1">Try changing the date or batch filter.</p>
                        </td>
                    </tr>
                ) : rows.map((record: RecordRow) => (
                    <tr 
                        key={record.id} 
                        className="group hover:bg-blue-50/20 dark:hover:bg-blue-900/5 transition-colors"
                    >
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs shadow-sm">
                            {record.student_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="font-bold text-gray-900 dark:text-white">{record.student_name}</div>
                            <div className="text-[10px] text-blue-500 font-medium">{batches.find((b:any) => b.id === record.batch_id)?.name || "N/A Group"}</div>
                        </div>
                        </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">{record.student_roll}</td>
                    <td className="px-6 py-4">
                        <div className="text-xs font-semibold text-gray-900 dark:text-white">{record.entry_time}</div>
                        <div className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">{record.date}</div>
                    </td>
                    <td className="px-6 py-4">
                        <Badge className="bg-green-500/10 text-green-600 border-green-100 text-[10px] font-black uppercase">
                        {record.status}
                        </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                        <Dialog>
                        <DialogTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 w-8 p-0 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 opacity-0 group-hover:opacity-100 transition-all"
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
      </Card>
    </div>
  )
}
