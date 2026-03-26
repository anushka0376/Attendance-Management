'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import CameraFeed, { type CameraFeedRef } from "@/components/camera/camera-feed"
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  GraduationCap, 
  Briefcase, 
  Key,
  Save,
  AlertCircle,
  CheckCircle,
  Loader2,
  Camera,
  Upload
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'

interface ProfileFormData {
  full_name: string
  email: string
  phone_number: string
  department: string
  employee_id: string
  qualification: string
  experience: string
  specialization: string
}

interface PasswordFormData {
  current_password: string
  new_password: string
  confirm_password: string
}

export default function ProfilePage() {
  const { user, updateProfile, updateProfilePhoto } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const cameraRef = useRef<CameraFeedRef>(null)

  // Profile form state
  const [profileData, setProfileData] = useState<ProfileFormData>({
    full_name: '',
    email: '',
    phone_number: '',
    department: '',
    employee_id: '',
    qualification: '',
    experience: '',
    specialization: ''
  })

  // Sync profile data when user changes
  useEffect(() => {
    if (user) {
      setProfileData({
        full_name: user.full_name || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
        department: user.department || '',
        employee_id: user.employee_id || '',
        qualification: user.qualification || '',
        experience: user.experience || '',
        specialization: user.specialization || ''
      })
    }
  }, [user])

  // Password form state
  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setError('')
    setMessage('')
    
    try {
      await updateProfilePhoto(file)
      setMessage('Profile photo updated!')
      setTimeout(() => setMessage(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to update photo')
    } finally {
      setIsUploading(false)
    }
  }

  const handleCapture = async () => {
    if (!cameraRef.current) return

    setIsUploading(true)
    setError('')
    setMessage('')
    
    try {
      const blob = await cameraRef.current.capture()
      const file = new File([blob], `profile_${Date.now()}.jpg`, { type: 'image/jpeg' })
      await updateProfilePhoto(file)
      setMessage('Profile photo captured and updated!')
      setIsCameraOpen(false)
      setTimeout(() => setMessage(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to capture photo')
    } finally {
      setIsUploading(false)
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      // Filter out unchanged fields
      const updates: Partial<ProfileFormData> = {}
      Object.entries(profileData).forEach(([key, value]) => {
        const originalValue = String(user?.[key as keyof typeof user] || '')
        if (value.trim() !== originalValue.trim()) {
          updates[key as keyof ProfileFormData] = value.trim()
        }
      })

      if (Object.keys(updates).length === 0) {
        setError('No changes detected')
        return
      }

      await updateProfile(updates)
      setMessage('Profile updated successfully!')
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000)

    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordLoading(true)
    setPasswordError('')
    setPasswordMessage('')

    try {
      if (passwordData.new_password !== passwordData.confirm_password) {
        throw new Error('New passwords do not match')
      }

      if (passwordData.new_password.length < 6) {
        throw new Error('New password must be at least 6 characters')
      }

      await api.updatePassword(passwordData)

      setPasswordMessage('Password changed successfully!')
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      })

      // Clear message after 3 seconds
      setTimeout(() => setPasswordMessage(''), 3000)

    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password')
    } finally {
      setPasswordLoading(false)
    }
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
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Profile Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account information and security settings
          </p>
        </div>
      </div>

      {/* Profile Overview Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-blue-200 dark:border-blue-800">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Profile Photo Section */}
            <div className="relative group">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-2xl overflow-hidden shadow-lg border-2 border-white dark:border-gray-800 transition-transform duration-200 group-hover:scale-105 ${
                user?.role === 'admin' ? 'bg-red-500' : 'bg-blue-500'
              }`}>
                {user?.profile_photo_url ? (
                  <img 
                    src={user.profile_photo_url} 
                    alt={user.full_name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user?.full_name ? getUserInitials(user.full_name) : user?.username?.charAt(0).toUpperCase() || 'U'
                )}
                
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="flex flex-col gap-2">
                    <label 
                      htmlFor="photo-upload" 
                      className="cursor-pointer bg-white/20 hover:bg-white/40 p-2 rounded-full transition-colors"
                      title="Upload Photo"
                    >
                      <Upload className="h-5 w-5 text-white" />
                    </label>
                  </div>
                </div>
              </div>

              {/* Small Camera Icon Button (Always visible on hover or mobile) */}
              <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="icon" 
                    className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md border-2 border-white dark:border-gray-800 z-10"
                    title="Take Photo"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Capture Profile Photo</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col items-center gap-4 py-4">
                    <div className="w-full max-w-sm overflow-hidden rounded-lg border-2 border-blue-500 shadow-inner">
                      <CameraFeed ref={cameraRef} />
                    </div>
                    <div className="flex gap-3 w-full">
                      <Button 
                        variant="outline" 
                        onClick={() => setIsCameraOpen(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCapture}
                        disabled={isUploading}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Camera className="h-4 w-4 mr-2" />
                        )}
                        Capture
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              {isUploading && !isCameraOpen && (
                <div className="absolute inset-0 bg-white/60 dark:bg-black/60 rounded-full flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                </div>
              )}
              
              <Input
                id="photo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
                disabled={isUploading}
              />
            </div>

            <div className="flex-1 text-center md:text-left">
              <h3 className="text-2xl font-bold text-foreground">
                {user?.full_name || user?.username || 'Unknown User'}
              </h3>
              <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2 mt-1">
                <Mail className="h-4 w-4" />
                {user?.email || 'No email provided'}
              </p>
              <div className="flex items-center justify-center md:justify-start gap-2 mt-4">
                <Badge variant={user?.role === 'admin' ? 'destructive' : 'default'} className="px-3 py-1">
                  {user?.role === 'admin' ? '👑 Administrator' : '👨‍🏫 Teacher'}
                </Badge>
                {user?.department && (
                  <Badge variant="outline" className="px-3 py-1 bg-white/50 dark:bg-black/50">
                    <Building className="h-3 w-3 mr-1" />
                    {user.department}
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="text-right hidden md:block border-l pl-6 border-blue-200 dark:border-blue-800">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">User ID</p>
              <p className="font-mono text-base font-bold text-foreground mt-1">{user?.username || 'N/A'}</p>
              {user?.employee_id && (
                <>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mt-3">Employee ID</p>
                  <p className="font-mono text-base font-bold text-foreground mt-1">{user.employee_id}</p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Management Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">Profile Information</TabsTrigger>
          <TabsTrigger value="security">Security Settings</TabsTrigger>
        </TabsList>

        {/* Profile Information Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal and professional information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                {/* Messages */}
                {message && (
                  <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-green-700 dark:text-green-300">
                      {message}
                    </AlertDescription>
                  </Alert>
                )}
                
                {error && (
                  <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <AlertDescription className="text-red-700 dark:text-red-300">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Basic Information */}
                <div className="space-y-4">
                  <h4 className="font-medium text-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Basic Information
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={profileData.full_name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                        placeholder="Enter your full name"
                        className="text-foreground"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter your email"
                        className="text-foreground"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h4 className="font-medium text-foreground flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Contact Information
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone_number">Phone Number</Label>
                      <Input
                        id="phone_number"
                        value={profileData.phone_number}
                        onChange={(e) => setProfileData(prev => ({ ...prev, phone_number: e.target.value }))}
                        placeholder="Enter your phone number"
                        className="text-foreground"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        value={profileData.department}
                        onChange={(e) => setProfileData(prev => ({ ...prev, department: e.target.value }))}
                        placeholder="Enter your department"
                        className="text-foreground"
                      />
                    </div>
                  </div>
                </div>

                {/* Professional Information */}
                <div className="space-y-4">
                  <h4 className="font-medium text-foreground flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Professional Information
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="employee_id">Employee ID</Label>
                      <Input
                        id="employee_id"
                        value={profileData.employee_id}
                        onChange={(e) => setProfileData(prev => ({ ...prev, employee_id: e.target.value }))}
                        placeholder="Enter your employee ID"
                        className="text-foreground"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="qualification">Qualification</Label>
                      <select
                        id="qualification"
                        value={profileData.qualification}
                        onChange={(e) => setProfileData(prev => ({ ...prev, qualification: e.target.value }))}
                        className="w-full h-10 px-3 border border-input bg-background text-foreground rounded-md"
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
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="experience">Experience</Label>
                      <select
                        id="experience"
                        value={profileData.experience}
                        onChange={(e) => setProfileData(prev => ({ ...prev, experience: e.target.value }))}
                        className="w-full h-10 px-3 border border-input bg-background text-foreground rounded-md"
                      >
                        <option value="">Select Experience</option>
                        <option value="0-1">0-1 Years</option>
                        <option value="1-3">1-3 Years</option>
                        <option value="3-5">3-5 Years</option>
                        <option value="5-10">5-10 Years</option>
                        <option value="10+">10+ Years</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="specialization">Specialization</Label>
                      <Input
                        id="specialization"
                        value={profileData.specialization}
                        onChange={(e) => setProfileData(prev => ({ ...prev, specialization: e.target.value }))}
                        placeholder="e.g., Mathematics, Physics"
                        className="text-foreground"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Update Profile
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Change your password and manage security preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-6">
                {/* Messages */}
                {passwordMessage && (
                  <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-green-700 dark:text-green-300">
                      {passwordMessage}
                    </AlertDescription>
                  </Alert>
                )}
                
                {passwordError && (
                  <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <AlertDescription className="text-red-700 dark:text-red-300">
                      {passwordError}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Password Fields */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current_password">Current Password</Label>
                    <Input
                      id="current_password"
                      type="password"
                      value={passwordData.current_password}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, current_password: e.target.value }))}
                      placeholder="Enter current password"
                      className="text-foreground"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="new_password">New Password</Label>
                    <Input
                      id="new_password"
                      type="password"
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                      placeholder="Enter new password (min 6 characters)"
                      className="text-foreground"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirm_password">Confirm New Password</Label>
                    <Input
                      id="confirm_password"
                      type="password"
                      value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                      placeholder="Confirm new password"
                      className="text-foreground"
                      required
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={passwordLoading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {passwordLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Changing...
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4 mr-2" />
                        Change Password
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
