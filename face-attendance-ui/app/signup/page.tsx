"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { SignupForm } from '@/components/ui/auth-forms'
import Link from 'next/link'
import { ArrowLeft, LogIn, Shield, GraduationCap } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { signup, isAuthenticated, isAdmin, user } = useAuth()
  const router = useRouter()

  const handleSignup = async (userData: {
    username: string
    email: string
    password: string
    full_name: string
    role: string
    department?: string
    phone_number?: string
  }) => {
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      await signup(userData)
      setSuccess(`Account created successfully for ${userData.full_name}!`)
      
      // Auto-redirect after 3 seconds
      setTimeout(() => {
        if (isAuthenticated) {
          router.push('/admin/users')
        } else {
          router.push('/login')
        }
      }, 3000)
    } catch (err: any) {
      setError(err.message || 'Account creation failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-[100dvh] flex items-center justify-center p-6 app-gradient">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-2xl"
      >
        {/* Header Section */}
        <div className="mb-8 text-center">
          <div className="mb-6 flex justify-between items-center">
            <Link 
              href="/login" 
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Link>
            
            {isAuthenticated && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>Logged in as {user?.full_name}</span>
              </div>
            )}
          </div>

          {/* Welcome Header */}
          <div className="glass-panel p-6 mb-6 border border-border/50">
            <div className="flex items-center justify-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Join Our Platform
                </h1>
                <p className="text-muted-foreground">
                  Create account for Teachers & Administrators
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2 text-blue-600">
                <Shield className="w-4 h-4" />
                <span>Secure Authentication</span>
              </div>
              <div className="flex items-center space-x-2 text-purple-600">
                <GraduationCap className="w-4 h-4" />
                <span>Education Focused</span>
              </div>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Alert className="border-green-200 bg-green-50/80 backdrop-blur-sm">
              <Shield className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                {success}
                <br />
                <span className="text-xs">Redirecting in 3 seconds...</span>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Signup Form */}
        <div className="glass-panel glow-ring">
          <SignupForm 
            onSignup={handleSignup}
            isLoading={isLoading}
            error={error}
            currentUserRole={user?.role}
          />
        </div>

        {/* Already have account */}
        <div className="mt-6 text-center">
          <div className="glass-panel p-4 border border-border/50">
            <p className="text-sm text-muted-foreground mb-3">
              Already have an account?
            </p>
            <Link 
              href="/login"
              className="inline-flex items-center justify-center px-6 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In to Your Account
            </Link>
          </div>
        </div>

        {/* Account Types Info */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="glass-panel p-4 border border-border/50">
            <div className="flex items-center space-x-2 mb-2">
              <GraduationCap className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-sm">Teacher Account</h3>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Mark student attendance</li>
              <li>• View class reports</li>
              <li>• Access student records</li>
              <li>• Generate attendance sheets</li>
            </ul>
          </div>
          
          <div className="glass-panel p-4 border border-border/50">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="w-5 h-5 text-purple-500" />
              <h3 className="font-semibold text-sm">Admin Account</h3>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Manage all users</li>
              <li>• System configuration</li>
              <li>• Full attendance access</li>
              <li>• Create teacher accounts</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Face Recognition Attendance System</p>
          <p className="mt-1">© 2025 - Professional Education Management</p>
        </div>
      </motion.div>
    </main>
  )
}