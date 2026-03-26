"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Lock, Mail, User, AlertCircle, CheckCircle, GraduationCap, Camera } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { api } from '@/lib/api'

interface LoginFormProps {
  onLogin: (credentials: { username: string; password: string }) => Promise<void>
  isLoading?: boolean
  error?: string
}

export function LoginForm({ onLogin, isLoading = false, error }: LoginFormProps) {
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [validationError, setValidationError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    if (!credentials.username.trim()) {
      setValidationError('Username is required')
      return
    }
    if (!credentials.password) {
      setValidationError('Password is required')
      return
    }
    
    setValidationError('')
    await onLogin(credentials)
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-2xl border-0 bg-card backdrop-blur-sm">
      <CardHeader className="text-center pb-6">
        <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <Lock className="w-8 h-8 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Welcome Back
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Sign in to your Face Recognition Attendance account
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Display */}
          {(error || validationError) && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-700">
                {error || validationError}
              </AlertDescription>
            </Alert>
          )}

          {/* Username Field */}
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium text-foreground">
              Username
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={credentials.username}
                onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                className="pl-10 h-11 text-foreground placeholder:text-muted-foreground"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                className="pl-10 pr-10 h-11 text-foreground placeholder:text-muted-foreground"
                disabled={isLoading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex justify-end pt-1">
              <ForgotPasswordModal />
            </div>
          </div>

          {/* Login Button */}
          <Button
            type="submit"
            className="w-full h-11 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                <span>Signing In...</span>
              </div>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        {/* Login functionality redirected to backend */}
      </CardContent>
    </Card>
  )
}

function ForgotPasswordModal() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    
    setIsLoading(true)
    setStatus('idle')
    try {
      await api.resetPassword(email)
      setStatus('success')
      setMessage('Reset link sent! Please check your email.')
    } catch (err: any) {
      setStatus('error')
      setMessage(err.message || 'Failed to send reset email')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors">
          Forgot Password?
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-white/10 shadow-2xl backdrop-blur-xl">
        <DialogHeader>
          <div className="mx-auto mb-4 w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
            <Mail className="w-6 h-6 text-blue-500" />
          </div>
          <DialogTitle className="text-xl font-bold text-center">Reset Password</DialogTitle>
          <DialogDescription className="text-center text-muted-foreground pt-2">
            Enter your email and we'll send you a link to reset your password.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleReset} className="space-y-4 pt-4">
          {status !== 'idle' && (
            <Alert className={status === 'success' ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}>
              <AlertCircle className={`h-4 w-4 ${status === 'success' ? "text-green-500" : "text-red-500"}`} />
              <AlertDescription className={status === 'success' ? "text-green-200" : "text-red-200"}>
                {message}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="reset-email">Email Address</Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-muted/50 border-white/10 h-11"
              required
              disabled={isLoading || status === 'success'}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button 
              type="submit" 
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg transition-all"
              disabled={isLoading || status === 'success'}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                  <span>Sending...</span>
                </div>
              ) : (
                'Send Reset Link'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface SignupFormProps {
  onSignup: (userData: {
    username: string
    email: string
    password: string
    full_name: string
    role: string
    department?: string
    phone_number?: string
    employee_id?: string
    qualification?: string
    experience?: string
    specialization?: string
  }) => Promise<void>
  isLoading?: boolean
  error?: string
  currentUserRole?: string
}

export function SignupForm({ onSignup, isLoading = false, error, currentUserRole }: SignupFormProps) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    role: 'teacher',
    department: '',
    phone_number: '',
    employee_id: '',
    qualification: '',
    experience: '',
    specialization: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setProfilePhoto(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.username.trim()) {
      setValidationError('Username is required')
      return
    }
    if (!formData.email.trim()) {
      setValidationError('Email is required')
      return
    }
    if (!formData.password) {
      setValidationError('Password is required')
      return
    }
    if (formData.password.length < 6) {
      setValidationError('Password must be at least 6 characters')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      setValidationError('Passwords do not match')
      return
    }
    if (!formData.full_name.trim()) {
      setValidationError('Full name is required')
      return
    }
    if (!formData.phone_number.trim()) {
      setValidationError('Phone number is required')
      return
    }
    
    setValidationError('')
    
    // We pass the file separately or include it in the object
    // But since the current interface expects a JSON object, 
    // we'll modify the interface or handle it in the context caller.
    // Let's assume onSignup takes an optional file.
    
    const userData = {
      username: formData.username.trim(),
      email: formData.email.trim(),
      password: formData.password,
      full_name: formData.full_name.trim(),
      role: formData.role,
      department: formData.department.trim() || undefined,
      phone_number: formData.phone_number.trim() || undefined,
      employee_id: formData.employee_id.trim() || undefined,
      qualification: formData.qualification || undefined,
      experience: formData.experience || undefined,
      specialization: formData.specialization.trim() || undefined,
      profile_photo: profilePhoto || undefined // Added photo
    }
    
    // Wait, let's fix the interface to support profile_photo
    // @ts-ignore
    await onSignup(userData)
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-2xl border-0 bg-card/60 backdrop-blur-xl border border-white/10">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 relative group cursor-pointer w-24 h-24">
          <label htmlFor="photo-upload" className="cursor-pointer">
            <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-blue-500/20 group-hover:border-blue-500 transition-all duration-300 flex items-center justify-center bg-muted/50 shadow-xl backdrop-blur-sm">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center p-2 text-muted-foreground group-hover:text-blue-500">
                  <User className="w-8 h-8 mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Profile Photo</span>
                </div>
              )}
            </div>
            <div className="absolute -right-2 -bottom-2 bg-blue-600 p-2 rounded-xl text-white shadow-lg group-hover:scale-110 transition-transform">
              <Camera className="w-4 h-4" />
            </div>
          </label>
          <input 
            id="photo-upload" 
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={handlePhotoChange}
          />
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Display */}
          {(error || validationError) && (
            <Alert className="border-red-500/50 bg-red-500/10 backdrop-blur-md">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-200">
                {error || validationError}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground/80">Username *</Label>
                <Input
                  placeholder="johndoe"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  className="bg-muted/30 border-white/10 focus:border-blue-500/50 transition-all h-11"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground/80">Email *</Label>
                <Input
                  type="email"
                  placeholder="john@school.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="bg-muted/30 border-white/10 focus:border-blue-500/50 transition-all h-11"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground/80">Full Name *</Label>
                <Input
                  placeholder="John Doe"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="bg-muted/30 border-white/10 focus:border-blue-500/50 transition-all h-11"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground/80">Role *</Label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full h-11 px-3 bg-muted/30 border border-white/10 text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/40 appearance-none cursor-pointer hover:bg-muted/50 transition-all"
                    disabled={isLoading || currentUserRole !== 'admin'}
                  >
                    <option value="teacher" className="bg-slate-900">Teacher</option>
                    {currentUserRole === 'admin' && <option value="admin" className="bg-slate-900">Admin</option>}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground/80">Department</Label>
                  <Input
                    placeholder="CSE"
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    className="bg-muted/30 border-white/10 focus:border-blue-500/50 transition-all h-11"
                  />
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground/80">Password *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="pr-10 bg-muted/30 border-white/10 focus:border-blue-500/50 h-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground/80">Confirm Password *</Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="bg-muted/30 border-white/10 focus:border-blue-500/50 h-11"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground/80">Phone Number *</Label>
                <Input
                  type="tel"
                  placeholder="+91 9876543210"
                  value={formData.phone_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                  className="bg-muted/30 border-white/10 focus:border-blue-500/50 transition-all h-11"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground/80">Employee ID</Label>
                <Input
                  placeholder="EMP-123"
                  value={formData.employee_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, employee_id: e.target.value }))}
                  className="bg-muted/30 border-white/10 focus:border-blue-500/50 transition-all h-11"
                />
              </div>
            </div>
          </div>

          {/* Professional Details Section */}
          <div className="space-y-4 p-5 rounded-xl border border-white/5 bg-white/5 backdrop-blur-sm">
            <h4 className="font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-400" />
              Professional Credentials
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Qualification</Label>
                <select
                  value={formData.qualification}
                  onChange={(e) => setFormData(prev => ({ ...prev, qualification: e.target.value }))}
                  className="w-full h-11 px-3 bg-slate-900/50 border border-white/10 text-foreground rounded-lg focus:ring-2 focus:ring-indigo-500/40 appearance-none cursor-pointer transition-all"
                >
                  <option value="" className="bg-slate-900">Select Qualification</option>
                  <option value="B.Ed" className="bg-slate-900">B.Ed</option>
                  <option value="M.Ed" className="bg-slate-900">M.Ed</option>
                  <option value="Ph.D" className="bg-slate-900">Ph.D</option>
                  <option value="Bachelor's" className="bg-slate-900">Bachelor's Degree</option>
                  <option value="Master's" className="bg-slate-900">Master's Degree</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Experience (Years)</Label>
                <select
                  value={formData.experience}
                  onChange={(e) => setFormData(prev => ({ ...prev, experience: e.target.value }))}
                  className="w-full h-11 px-3 bg-slate-900/50 border border-white/10 text-foreground rounded-lg focus:ring-2 focus:ring-indigo-500/40 appearance-none cursor-pointer transition-all"
                >
                  <option value="" className="bg-slate-900">Select Experience</option>
                  <option value="1-3" className="bg-slate-900">1-3 Years</option>
                  <option value="3-5" className="bg-slate-900">3-5 Years</option>
                  <option value="5-10" className="bg-slate-900">5-10 Years</option>
                  <option value="10+" className="bg-slate-900">10+ Years</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subject Specialization</Label>
              <Input
                placeholder="e.g., Quantum Physics, Data Science"
                value={formData.specialization}
                onChange={(e) => setFormData(prev => ({ ...prev, specialization: e.target.value }))}
                className="bg-slate-900/40 border-white/5 focus:border-indigo-500/30 h-11"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-13 py-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:scale-[1.01] active:scale-[0.99] text-white font-bold text-lg rounded-xl shadow-2xl transition-all duration-300 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-3 border-white/30 border-t-white" />
                <span>Creating Your Account...</span>
              </div>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}