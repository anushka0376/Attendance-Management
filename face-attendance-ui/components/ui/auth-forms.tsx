"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Lock, Mail, User, AlertCircle, CheckCircle, GraduationCap } from 'lucide-react'

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

        {/* Default Credentials Info */}
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/50 dark:to-purple-950/50 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <div className="font-semibold mb-3 flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              Demo Credentials Available
            </div>
            <div className="space-y-2 text-xs">
              <div className="bg-white/50 dark:bg-white/10 p-2 rounded">
                <strong className="text-blue-900 dark:text-blue-100">Admin:</strong> admin / admin123
              </div>
              <div className="bg-white/50 dark:bg-white/10 p-2 rounded">
                <strong className="text-blue-900 dark:text-blue-100">Teacher:</strong> teacher1 / teacher123
              </div>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-300 mt-2 italic">
              Change passwords after first login for security
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
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
      specialization: formData.specialization.trim() || undefined
    }
    
    await onSignup(userData)
  }

  return (
    <Card className="w-full max-w-lg mx-auto shadow-2xl border-0 bg-card backdrop-blur-sm">
      <CardHeader className="text-center pb-6">
        <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
          <User className="w-8 h-8 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
          Create New User
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Add a new teacher or admin to the system
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

          {/* Username and Email */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="signup-username" className="text-sm font-medium text-foreground">
                Username *
              </Label>
              <Input
                id="signup-username"
                type="text"
                placeholder="johndoe"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                className="h-10 text-foreground placeholder:text-muted-foreground"
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email" className="text-sm font-medium text-foreground">
                Email *
              </Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="john@school.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="h-10 text-foreground placeholder:text-muted-foreground"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="signup-fullname" className="text-sm font-medium text-foreground">
              Full Name *
            </Label>
            <Input
              id="signup-fullname"
              type="text"
              placeholder="John Doe"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              className="h-10 text-foreground placeholder:text-muted-foreground"
              disabled={isLoading}
              required
            />
          </div>

          {/* Role and Department */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="signup-role" className="text-sm font-medium text-foreground">
                Role *
              </Label>
              <select
                id="signup-role"
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                className="w-full h-10 px-3 border border-input bg-background text-foreground rounded-md focus:border-blue-500 focus:ring-blue-500"
                disabled={isLoading || currentUserRole !== 'admin'}
                required
              >
                <option value="teacher">Teacher</option>
                {currentUserRole === 'admin' && <option value="admin">Admin</option>}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-department" className="text-sm font-medium text-foreground">
                Department
              </Label>
              <Input
                id="signup-department"
                type="text"
                placeholder="Mathematics"
                value={formData.department}
                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                className="h-10 text-foreground placeholder:text-muted-foreground"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="signup-password" className="text-sm font-medium text-foreground">
                Password *
              </Label>
              <div className="relative">
                <Input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="pr-10 h-10 text-foreground placeholder:text-muted-foreground"
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-confirm" className="text-sm font-medium text-foreground">
                Confirm Password *
              </Label>
              <Input
                id="signup-confirm"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="h-10 text-foreground placeholder:text-muted-foreground"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          {/* Employee ID and Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="signup-employee-id" className="text-sm font-medium text-foreground">
                Employee ID
              </Label>
              <Input
                id="signup-employee-id"
                type="text"
                placeholder="EMP001"
                value={formData.employee_id}
                onChange={(e) => setFormData(prev => ({ ...prev, employee_id: e.target.value }))}
                className="h-10 text-foreground placeholder:text-muted-foreground"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-phone" className="text-sm font-medium text-foreground">
                Phone Number *
              </Label>
              <Input
                id="signup-phone"
                type="tel"
                placeholder="+1234567890"
                value={formData.phone_number}
                onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                className="h-10 text-foreground placeholder:text-muted-foreground"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          {/* Professional Details */}
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
            <h4 className="font-medium text-foreground flex items-center">
              <GraduationCap className="w-4 h-4 mr-2" />
              Professional Information
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="signup-qualification" className="text-sm font-medium text-foreground">
                  Qualification
                </Label>
                <select
                  id="signup-qualification"
                  value={formData.qualification}
                  onChange={(e) => setFormData(prev => ({ ...prev, qualification: e.target.value }))}
                  className="w-full h-10 px-3 border border-input bg-background text-foreground rounded-md focus:border-blue-500 focus:ring-blue-500"
                  disabled={isLoading}
                >
                  <option value="">Select Qualification</option>
                  <option value="B.Ed">B.Ed</option>
                  <option value="M.Ed">M.Ed</option>
                  <option value="Ph.D">Ph.D</option>
                  <option value="Bachelor's">Bachelor's Degree</option>
                  <option value="Master's">Master's Degree</option>
                  <option value="Diploma">Diploma</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-experience" className="text-sm font-medium text-foreground">
                  Experience (Years)
                </Label>
                <select
                  id="signup-experience"
                  value={formData.experience}
                  onChange={(e) => setFormData(prev => ({ ...prev, experience: e.target.value }))}
                  className="w-full h-10 px-3 border border-input bg-background text-foreground rounded-md focus:border-blue-500 focus:ring-blue-500"
                  disabled={isLoading}
                >
                  <option value="">Select Experience</option>
                  <option value="0-1">0-1 Years</option>
                  <option value="1-3">1-3 Years</option>
                  <option value="3-5">3-5 Years</option>
                  <option value="5-10">5-10 Years</option>
                  <option value="10+">10+ Years</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-specialization" className="text-sm font-medium text-foreground">
                Subject Specialization
              </Label>
              <Input
                id="signup-specialization"
                type="text"
                placeholder="e.g., Mathematics, Physics, Computer Science"
                value={formData.specialization}
                onChange={(e) => setFormData(prev => ({ ...prev, specialization: e.target.value }))}
                className="h-10 text-foreground placeholder:text-muted-foreground"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Create User Button */}
          <Button
            type="submit"
            className="w-full h-11 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                <span>Creating User...</span>
              </div>
            ) : (
              'Create User'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}