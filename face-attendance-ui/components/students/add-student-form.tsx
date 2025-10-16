"use client"
import { useRef, useState } from "react"
import type React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import CameraFeed, { type CameraFeedRef } from "@/components/camera/camera-feed"
import { useToast } from "@/hooks/use-toast"
import { API_BASE } from "@/lib/api"
import { cn } from "@/lib/utils"

export default function AddStudentForm() {
  const [useWebcam, setUseWebcam] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const cameraRef = useRef<CameraFeedRef>(null)
  const { toast } = useToast()

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formEl = e.currentTarget
    const formData = new FormData(formEl)
    try {
      let imageBlob: Blob | null = null
      if (useWebcam && cameraRef.current) {
        imageBlob = await cameraRef.current.capture()
      } else if (file) {
        imageBlob = file
      }
      if (!imageBlob) {
        toast({ title: "Image required", description: "Add or capture an image." })
        return
      }
      formData.append("image", imageBlob, "student.jpg")

      if (!API_BASE) {
        toast({
          title: "Demo only",
          description: "Set NEXT_PUBLIC_API_BASE_URL to enable backend save.",
        })
        formEl.reset()
        setFile(null)
        return
      }

      const res = await fetch(`${API_BASE}/students`, { method: "POST", body: formData })
      if (!res.ok) throw new Error("Failed to save student")
      toast({ title: "Student saved", description: "Student record stored." })
      formEl.reset()
      setFile(null)
    } catch (e: any) {
      toast({ title: "Error", description: e.message })
    }
  }

  return (
    <form className="grid gap-6" onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Student Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="name">Student Name</Label>
            <Input id="name" name="name" required className="bg-background" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="roll">Roll Number</Label>
            <Input id="roll" name="roll" required className="bg-background" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="group">Group</Label>
            <Input id="group" name="group" className="bg-background" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="branch">Branch</Label>
            <Input id="branch" name="branch" className="bg-background" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="semester">Semester</Label>
            <Input id="semester" name="semester" className="bg-background" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Image</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center gap-3">
            <Button type="button" variant={useWebcam ? "default" : "secondary"} onClick={() => setUseWebcam(true)}>
              Use Webcam
            </Button>
            <Button type="button" variant={!useWebcam ? "default" : "secondary"} onClick={() => setUseWebcam(false)}>
              Upload File
            </Button>
          </div>

          <div className={cn("rounded-lg border", useWebcam ? "p-0" : "p-4 bg-muted/20")}>
            {useWebcam ? (
              <CameraFeed ref={cameraRef} />
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="image">Student Image</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="bg-background"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit">Save Student</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
