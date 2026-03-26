"use client"
import { Button } from "@/components/ui/button"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { LogOut, User as UserIcon } from "lucide-react"

export default function Topbar() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuth()

  // Map pathnames to proper display names
  const getPageTitle = (path: string) => {
    const pageMap: Record<string, string> = {
      "/dashboard": "Dashboard Overview",
      "/admin": "Admin Panel",
      "/add-student": "Student Enrollment", 
      "/mark-attendance": "Mark Attendance",
      "/records": "Attendance Records",
      "/profile": "My Profile Settings",
      "/settings": "System Settings"
    }
    return pageMap[path] || "SmartFaceAttendance"
  }

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase()
  }

  return (
    <div className="glass-panel h-16 px-4 md:px-8 flex items-center justify-between border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-40">
      <div className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        {getPageTitle(pathname)}
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end mr-2">
          <span className="text-sm font-bold text-foreground leading-tight">
            {user?.full_name || user?.username || "Smart User"}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {user?.role === 'admin' ? 'System Administrator' : user?.department || 'Faculty'}
          </span>
        </div>

        {/* Profile Pic Icon - requested by user */}
        <div 
          className="h-10 w-10 rounded-full border-2 border-primary/20 p-0.5 cursor-pointer hover:scale-105 transition-transform overflow-hidden shadow-sm"
          onClick={() => router.push("/profile")}
        >
          {user?.profile_photo_url ? (
            <img 
              src={user.profile_photo_url} 
              alt={user.full_name} 
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            <div className="w-full h-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold rounded-full">
              {user?.full_name ? getUserInitials(user.full_name) : <UserIcon className="h-5 w-5" />}
            </div>
          )}
        </div>

        <Button 
          variant="ghost" 
          size="icon"
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={logout}
          title="Logout"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
