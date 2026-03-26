"use client"

import { motion } from "framer-motion"
import { Users, CalendarCheck2, ScanFace, Layers, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import useSWR from "swr"
import { api } from "@/lib/api"
import Link from "next/link"

export default function DashboardPage() {
  const { data: statsData, isLoading } = useSWR('/api/stats', () => api.getStats(), {
    refreshInterval: 30000 // Refresh every 30 seconds
  })

  const stats = [
    { 
        title: "Total Students", 
        value: statsData?.total_students ?? "...", 
        icon: Users,
        description: "Enrolled in Supabase"
    },
    { 
        title: "Active Batches", 
        value: statsData?.total_batches ?? "...", 
        icon: Layers,
        description: "Year-based groups"
    },
    { 
        title: "Attendance Today", 
        value: statsData?.attendance_today ?? "...", 
        icon: CalendarCheck2,
        description: "Successfully marked"
    },
    { 
        title: "System Status", 
        value: "Online", 
        icon: ScanFace,
        description: "Face Recognition Ready"
    },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Overview</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Cloud-connected Face Attendance Management (Supabase)
          </p>
        </div>
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>

      {/* Stats Grid */}
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-xl transition-all duration-300 group cursor-default">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
                      {s.title}
                    </CardTitle>
                    <div className="text-3xl font-black text-gray-900 dark:text-white">
                      {isLoading ? (
                          <div className="h-8 w-16 bg-gray-100 dark:bg-gray-700 animate-pulse rounded"></div>
                      ) : s.value}
                    </div>
                    <p className="text-[10px] text-gray-500 font-medium">{s.description}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/40 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </CardHeader>
              </Card>
            </motion.div>
          )
        })}
      </section>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm col-span-1 lg:col-span-2">
          <CardHeader className="border-b border-gray-100 dark:border-gray-700">
            <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">
              Management Portal
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/mark-attendance" className="group">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <ScanFace className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="font-bold underline-offset-4 group-hover:underline">Start Terminal</div>
                            <div className="text-xs text-blue-100">Open Face Recognition</div>
                        </div>
                    </div>
                    <ArrowRight className="h-5 w-5 opacity-50 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all" />
                </div>
            </Link>

            <Link href="/add-student" className="group">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/40 rounded-xl flex items-center justify-center">
                            <Users className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <div className="font-bold text-gray-900 dark:text-white">Enroll Student</div>
                            <div className="text-xs text-gray-500">Add to Cloud Database</div>
                        </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-blue-500 transition-all" />
                </div>
            </Link>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">
              System Context
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Supabase Region</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">AWS Mumbai (ap-south-1)</div>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Storage Provider</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">Supabase Buckets</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
