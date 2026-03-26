"use client"
 
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lock, AlertCircle, CheckCircle, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import Link from 'next/link'
 
export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
 
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    setIsLoading(true)
    try {
      await api.updateUserPassword(password)
      setSuccess(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Your reset link may have expired.')
    } finally {
      setIsLoading(false)
    }
  }
 
  return (
    <main className="min-h-[100dvh] flex items-center justify-center p-6 app-gradient">
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md"
      >
        <Card className="glass-panel border-0 shadow-2xl backdrop-blur-xl">
          <CardHeader className="text-center pb-8 pt-10">
            <div className="mx-auto mb-6 w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl rotate-3 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Lock className="w-8 h-8 text-white -rotate-3" />
            </div>
            <CardTitle className="text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {success ? "Success!" : "New Password"}
            </CardTitle>
            <CardDescription className="text-muted-foreground font-medium mt-2">
              {success 
                ? "Your password has been updated. Redirecting in 3s..." 
                : "Create a secure new password for your account"}
            </CardDescription>
          </CardHeader>
 
          <CardContent className="pb-10">
            {success ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center space-y-6 pt-4"
              >
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
                <Button asChild className="w-full h-12 bg-blue-600 hover:bg-blue-700 shadow-lg">
                  <Link href="/login" className="flex items-center gap-2">
                    <span>Back to Login</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <Alert className="bg-red-500/10 border-red-500/20 text-red-200">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
 
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">New Password</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-muted/30 border-white/10 h-12 pr-10 focus:ring-2 focus:ring-blue-500/40 transition-all font-mono"
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
 
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Confirm Password</Label>
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-muted/30 border-white/10 h-12 focus:ring-2 focus:ring-blue-500/40 transition-all font-mono"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
 
                <Button
                  type="submit"
                  className="w-full h-14 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:scale-[1.02] active:scale-[0.98] text-white font-bold text-lg rounded-xl shadow-2xl transition-all duration-300"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-3 border-white/30 border-t-white" />
                      <span>Updating...</span>
                    </div>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </main>
  )
}
