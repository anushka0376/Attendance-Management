"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminSignupRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to main signup page
    router.push('/signup')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground">Redirecting to signup page...</p>
      </div>
    </div>
  )
}