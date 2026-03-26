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
          <div className="mb-6 flex justify-center items-center">
            {isAuthenticated && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>Logged in as {user?.full_name}</span>
              </div>
            )}
          </div>

          {/* Welcome Header */}
          <div className="py-8 mb-4">
            <div className="flex flex-col items-center justify-center space-y-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl rotate-3 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <GraduationCap className="w-8 h-8 text-white -rotate-3" />
              </div>
              <div className="text-center">
                <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  Join Our Platform
                </h1>
                <p className="text-muted-foreground font-medium mt-1">
                  Create account for Teachers & Administrators
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-6 text-sm font-semibold">
              <div className="flex items-center space-x-2 text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-4 py-1.5 rounded-full border border-blue-100 dark:border-blue-800">
                <Shield className="w-4 h-4" />
                <span>Secure Authentication</span>
              </div>
              <div className="flex items-center space-x-2 text-violet-600 bg-violet-50 dark:bg-violet-900/20 px-4 py-1.5 rounded-full border border-violet-100 dark:border-violet-800">
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


        {/* Login Link */}
        <div className="mt-8 text-center">
          <Link 
            href="/login" 
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-500 transition-colors bg-white/5 px-6 py-2 rounded-full border border-white/10 hover:border-blue-500/30 shadow-md backdrop-blur-sm"
          >
            <LogIn className="w-4 h-4" />
            <span>Already have an account? Log In</span>
          </Link>
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