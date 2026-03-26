"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, UserPlus, ScanFace, Table, Settings, User, Users, Layers } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/add-student", label: "Add Student", icon: UserPlus },
  { href: "/students", label: "Manage Students", icon: Users },
  { href: "/batches", label: "Manage Batches", icon: Layers },
  { href: "/mark-attendance", label: "Mark Attendance", icon: ScanFace },
  { href: "/records", label: "View Records", icon: Table },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  // Get user initials for avatar
  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase()
  }

  // Get role color
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500'
      case 'teacher': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden shadow-sm border border-white/20 ${
              user?.role === 'admin' ? 'bg-red-500' : 'bg-blue-500'
            }`}>
              {user?.profile_photo_url ? (
                <img 
                  src={user.profile_photo_url || "/placeholder-user.png"} 
                  alt={user.full_name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                user?.full_name ? getUserInitials(user.full_name) : user?.username?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-white text-sm">
              {user?.full_name || user?.username || 'User'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {user?.email || 'No email'}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <h1 className="font-bold text-lg text-gray-900 dark:text-white">SmartFaceAttendance</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Intelligent Attendance System</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {items.map((item) => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  active 
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-4 border-blue-600 dark:border-blue-400" 
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        {/* User Role Badge */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">Role:</span>
          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
            user?.role === 'admin' 
              ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' 
              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
          }`}>
            {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
          </span>
        </div>


        {/* Logout Button */}
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 w-full mt-2"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Logout</span>
        </button>
      </div>
    </div>
  )
}
