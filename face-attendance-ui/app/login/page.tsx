"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { LoginForm } from '@/components/ui/auth-forms'
import Link from 'next/link'
import { ArrowLeft, UserPlus } from 'lucide-react'

export default function LoginPage() {
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()

  const handleLogin = async (credentials: { username: string; password: string }) => {
    setIsLoading(true)
    setError('')

    try {
      await login(credentials.username, credentials.password)
    } catch (err: any) {
      setError(err.message || 'Login failed')
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
        className="relative w-full max-w-md"
      >
        {/* Back Link */}
        <div className="mb-6">
          <Link 
            href="/" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>

        {/* Login Form */}
        <div className="glass-panel glow-ring">
          <LoginForm 
            onLogin={handleLogin}
            isLoading={isLoading}
            error={error}
          />
        </div>

        {/* Sign Up Link */}
        <div className="mt-6 text-center">
          <div className="glass-panel p-4 border border-border/50">
            <p className="text-sm text-muted-foreground mb-3">
              Don't have an account?
            </p>
            <Link 
              href="/signup"
              className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Create New Account
            </Link>
            <p className="text-xs text-muted-foreground mt-2">
              For Teachers & Administrators
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Face Recognition Attendance System</p>
          <p className="mt-1">© 2025 - Secure & Efficient</p>
        </div>
      </motion.div>
    </main>
  )
}
