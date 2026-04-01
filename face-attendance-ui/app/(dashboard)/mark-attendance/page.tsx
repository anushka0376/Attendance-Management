"use client"
import { useRef, useState, useEffect } from "react"
import useSWR, { mutate } from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import CameraFeed, { type CameraFeedRef } from "@/components/camera/camera-feed"
import AttendanceTable from "@/components/attendance/attendance-table"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { ScanFace, Users, Filter, RefreshCw, CheckCircle2, AlertCircle, Activity } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function MarkAttendancePage() {
  const cameraRef = useRef<CameraFeedRef>(null)
  const [isRecognizing, setIsRecognizing] = useState(false)
  // Fetch available student groups
  const { data: groupsData, isLoading: isLoadingGroups } = useSWR('/api/students/groups', () => api.getStudentGroups())
  const groups = groupsData?.groups || []
  
  const [selectedGroup, setSelectedGroup] = useState<string>("all")
  const [lastResult, setLastResult] = useState<any>(null)
  const { toast } = useToast()

  // Warm up the AI engine on page load
  useEffect(() => {
    const warmup = async () => {
      try {
        await api.warmupRecognition();
        console.log("AI Precision Engine warmed up successfully");
      } catch (err) {
        console.error("AI Engine Warmup failed:", err);
      }
    };
    warmup();
  }, []);

  // Fetch recent activity
  const { data: recentAttendance, mutate: mutateRecent } = useSWR('/api/attendance/recent', () => api.getRecentActivity())
  const recentRecords = recentAttendance?.attendance || []

  const onRecognize = async () => {
    if (!cameraRef.current) return
    try {
      setIsRecognizing(true)
      setLastResult(null)
      const blob = await cameraRef.current.capture()
      const file = new File([blob], "frame.jpg", { type: 'image/jpeg' })
      const result = await api.verifyAttendanceByImage(file)
      
      setLastResult(result)

      if (result.liveness_status === "fail") {
          toast({
              title: "Liveness Check Failed",
              description: result.message || "Please ensure you are in a well-lit area and looking directly at the camera.",
              variant: "destructive"
          });
          return;
      }

      if (result.students && result.students.length > 0) {
        let studentsToMark = result.students;
        
        // Filter by selected group if not "all"
        if (selectedGroup !== "all") {
            studentsToMark = studentsToMark.filter((s: any) => s.group_name === selectedGroup);
        }

        if (studentsToMark.length === 0) {
            toast({
                title: "Group Mismatch",
                description: "Recognized student is not in the selected group.",
                variant: "destructive"
            });
            return;
        }

        const studentIds = studentsToMark.map((s: any) => s.id);
        const studentNames = studentsToMark.map((s: any) => s.name).join(', ');
        
        await api.markAttendance({
            student_ids: studentIds,
            method: "Face"
            // Backend will now handle class_id/batch_id automatically
        });
        
        // Refresh both the recent activity and the attendance table
        mutateRecent();
        mutate('/api/attendance'); 
        
        toast({
          title: "Attendance marked!",
          description: `Verified: ${studentNames}`,
        })
      } else {
        toast({
          title: "Face not recognized",
          description: "No matching record found. Ensure student is enrolled.",
          variant: "destructive"
        })
      }
    } catch (e: any) {
      toast({ 
        title: "System Error", 
        description: e.message || "Recognition engine failed",
        variant: "destructive"
      })
    } finally {
      setIsRecognizing(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Recognition Terminal</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
            <ScanFace className="h-4 w-4 text-blue-500" />
            AI Precision Engine: v2.0 (Supabase Powered)
          </p>
        </div>
        <div className="flex flex-col items-end">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
            <Badge variant="outline" className="mt-1 bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 border-blue-100 dark:border-blue-900/30">
                Cloud Sync: Active
            </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Camera & Results */}
        <div className="lg:col-span-12 xl:col-span-5 space-y-6">
            <Card className="border-none bg-white dark:bg-gray-800 shadow-xl shadow-gray-200/50 dark:shadow-none overflow-hidden">
              <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        Scanner Feed
                    </CardTitle>
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 px-4 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <Filter className="h-4 w-4 text-primary" />
                        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                            <SelectTrigger className="w-[180px] h-8 border-none shadow-none bg-transparent p-0 text-xs font-bold focus:ring-0 uppercase tracking-wider">
                                <SelectValue placeholder="SELECT GROUP" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-2xl">
                                <SelectItem value="all" className="rounded-xl font-bold py-3">ALL GROUPS</SelectItem>
                                {groups.map((group: string) => (
                                    <SelectItem key={group} value={group} className="rounded-xl font-bold py-3">
                                        GROUP {group}
                                    </SelectItem>
                                ))}
                                {groups.length === 0 && !isLoadingGroups && (
                                    <div className="p-4 text-[10px] text-center opacity-50 font-black uppercase tracking-widest">
                                        No groups found
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="aspect-video rounded-2xl bg-black overflow-hidden shadow-2xl relative">
                  <CameraFeed ref={cameraRef} />
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/20 uppercase tracking-widest text-[10px] font-black text-white">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Real-time
                  </div>
                  {isRecognizing && (
                    <div className="absolute inset-0 bg-blue-600/20 backdrop-blur-[2px] flex items-center justify-center">
                        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
                            <RefreshCw className="h-10 w-10 text-blue-600 animate-spin" />
                            <span className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">Scanning...</span>
                        </div>
                    </div>
                  )}
                </div>

                <Button 
                    onClick={onRecognize} 
                    disabled={isRecognizing}
                    className="w-full py-8 text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-3xl shadow-2xl shadow-blue-500/30 transition-all active:scale-[0.97] group"
                >
                    {isRecognizing ? (
                        <>Authenticating...</>
                    ) : (
                        <>
                            <ScanFace className="h-6 w-6 mr-3 group-hover:scale-110 transition-transform" />
                            Identify Students
                        </>
                    )}
                </Button>
              </CardContent>
            </Card>

            {/* AI Results Insight */}
            {lastResult && (
                <Card className="border-none bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 animate-in slide-in-from-bottom-5 duration-300">
                    <CardHeader className="py-4">
                        <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 flex items-center gap-2">
                            <Activity className="h-3 w-3" />
                            Last Result Insight
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-6">
                        {lastResult.students?.length > 0 ? (
                            <div className="space-y-3">
                                {lastResult.students.map((s: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-blue-100 dark:border-blue-800/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black">
                                                {s.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-gray-900 dark:text-white">{s.name}</div>
                                                <div className="text-[10px] text-gray-500 font-mono tracking-tighter">{s.roll_no}</div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <Badge className="bg-green-500 text-white border-none text-[9px] font-black h-5">
                                                {Math.round(s.confidence * 100)}% MATCH
                                            </Badge>
                                            <span className="text-[8px] text-gray-400 mt-1 uppercase font-bold tracking-widest">Precision HIT</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/30">
                                <AlertCircle className="h-5 w-5 text-red-500" />
                                <div>
                                    <div className="text-sm font-bold text-red-700 dark:text-red-400">Match Refused</div>
                                    <div className="text-[10px] text-red-600 dark:text-red-500 opacity-80 uppercase font-bold">Confidence below threshold (0.6)</div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Recent Recognitions Sidebar */}
            <Card className="border-none bg-white dark:bg-gray-800 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Activity className="h-3 w-3" />
                        Live Feed Status
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {recentRecords.length > 0 ? (
                        recentRecords.slice(0, 3).map((record: any, index: number) => (
                            <div key={index} className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                                    <div>
                                        <div className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{record.students?.name}</div>
                                        <div className="text-[10px] text-gray-500">{record.entry_time} • Verified</div>
                                    </div>
                                </div>
                                <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-[10px] font-bold text-gray-400 border border-gray-100 dark:border-gray-700">
                                    {record.status === 'Late' ? 'LT' : 'PR'}
                                </div>
                            </div>
                        ))
                        ) : (
                        <div className="text-center py-4 text-muted-foreground text-[10px] uppercase font-bold tracking-widest opacity-50">
                            No recent logs
                        </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Right Column: Today's Roll */}
        <div className="lg:col-span-12 xl:col-span-7">
            <Card className="border-none bg-white dark:bg-gray-800 shadow-xl shadow-gray-200/50 dark:shadow-none h-full flex flex-col">
              <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700 flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    Today's Session Roll
                </CardTitle>
                <div className="text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full uppercase tracking-tighter">
                    {recentRecords.length} Verified Today
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                <AttendanceTable groupName={selectedGroup} />
              </CardContent>
            </Card>
        </div>
      </div>
    </div>
  )
}
