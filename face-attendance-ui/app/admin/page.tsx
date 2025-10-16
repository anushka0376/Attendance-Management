"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth, authAPI } from '@/contexts/AuthContext'
import { AdminRoute } from '@/components/ProtectedRoute'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Users, 
  UserPlus, 
  Shield, 
  Calendar, 
  BarChart3, 
  LogOut,
  Eye,
  Trash2,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

interface User {
  user_id: string
  username: string
  email: string
  full_name: string
  role: 'admin' | 'teacher'
  department?: string
  phone_number?: string
  is_active: boolean
  created_at: string
  last_login?: string
  created_by_name?: string
}

export default function AdminDashboard() {
  const { user, logout, token } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    if (!token) return

    try {
      setIsLoading(true)
      const fetchedUsers = await authAPI.getUsers(token)
      setUsers(fetchedUsers)
    } catch (err: any) {
      setError('Failed to load users')
      console.error('Error fetching users:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeactivateUser = async (userId: string) => {
    if (!token || !confirm('Are you sure you want to deactivate this user?')) return

    try {
      await authAPI.deactivateUser(token, userId)
      await fetchUsers() // Refresh the list
    } catch (err: any) {
      setError('Failed to deactivate user')
      console.error('Error deactivating user:', err)
    }
  }

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.is_active).length,
    teachers: users.filter(u => u.role === 'teacher').length,
    admins: users.filter(u => u.role === 'admin').length
  }

  return (
    <AdminRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 mt-2">
                Welcome back, {user?.full_name}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/admin/signup">
                <Button className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </Link>
              <Button variant="outline" onClick={logout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="glass-panel">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Total Users
                    </CardTitle>
                    <Users className="w-4 h-4 text-blue-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.totalUsers}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="glass-panel">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Active Users
                    </CardTitle>
                    <Calendar className="w-4 h-4 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.activeUsers}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="glass-panel">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Teachers
                    </CardTitle>
                    <BarChart3 className="w-4 h-4 text-purple-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.teachers}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="glass-panel">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Administrators
                    </CardTitle>
                    <Shield className="w-4 h-4 text-red-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.admins}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Users Table */}
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage system users and their permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">User</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Role</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Department</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Last Login</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((userData) => (
                        <tr key={userData.user_id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <div>
                              <div className="font-medium text-gray-900">{userData.full_name}</div>
                              <div className="text-sm text-gray-500">{userData.email}</div>
                              <div className="text-xs text-gray-400">@{userData.username}</div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Badge 
                              variant={userData.role === 'admin' ? 'destructive' : 'default'}
                              className={userData.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}
                            >
                              {userData.role}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-gray-600">
                            {userData.department || 'N/A'}
                          </td>
                          <td className="py-4 px-4">
                            <Badge 
                              variant={userData.is_active ? 'default' : 'secondary'}
                              className={userData.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}
                            >
                              {userData.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">
                            {userData.last_login 
                              ? new Date(userData.last_login).toLocaleDateString()
                              : 'Never'
                            }
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-2">
                              <Button size="sm" variant="outline">
                                <Eye className="w-3 h-3" />
                              </Button>
                              {userData.user_id !== user?.user_id && userData.is_active && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleDeactivateUser(userData.user_id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/dashboard">
              <Card className="glass-panel hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-blue-500" />
                    Attendance Dashboard
                  </CardTitle>
                  <CardDescription>
                    View and manage daily attendance
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/admin/signup">
              <Card className="glass-panel hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <UserPlus className="w-5 h-5 mr-2 text-green-500" />
                    Add New User
                  </CardTitle>
                  <CardDescription>
                    Create teacher or admin accounts
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-purple-500" />
                  System Reports
                </CardTitle>
                <CardDescription>
                  Generate attendance and user reports
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </AdminRoute>
  )
}