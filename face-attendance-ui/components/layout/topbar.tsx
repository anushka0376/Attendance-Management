"use client"
import { Button } from "@/components/ui/button"
import { useRouter, usePathname } from "next/navigation"

export default function Topbar() {
  const router = useRouter()
  const pathname = usePathname()

  // Map pathnames to proper display names
  const getPageTitle = (path: string) => {
    const pageMap: Record<string, string> = {
      "/dashboard": "Dashboard",
      "/add-student": "Add Student", 
      "/mark-attendance": "Mark Attendance",
      "/records": "View Records",
      "/settings": "Settings"
    }
    return pageMap[path] || "SmartFaceAttendance"
  }

  return (
    <div className="glass-panel h-14 px-4 md:px-6 flex items-center justify-between border-b">
      <div className="text-sm font-medium text-foreground">
        {getPageTitle(pathname)}
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden md:block text-sm text-foreground/80">Ms. Taylor</div>
        <Button variant="secondary" onClick={() => router.push("/login")}>
          Logout
        </Button>
      </div>
    </div>
  )
}
