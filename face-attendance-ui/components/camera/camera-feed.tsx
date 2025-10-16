"use client"
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"

export type CameraFeedRef = {
  capture: () => Promise<Blob>
}

const CameraFeed = forwardRef<CameraFeedRef>((_, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        })
        if (cancelled) return
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
      } catch (e) {
        console.log("[v0] Camera error:", e)
      }
    })()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  useImperativeHandle(ref, () => ({
    capture: async () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) throw new Error("Camera not ready")
      const w = video.videoWidth || 640
      const h = video.videoHeight || 480
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Canvas not supported")
      ctx.drawImage(video, 0, 0, w, h)
      const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b as Blob), "image/jpeg", 0.9))
      return blob
    },
  }))

  return (
    <div className="relative">
      <video ref={videoRef} className="w-full aspect-video bg-muted rounded-md" playsInline muted />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
})

CameraFeed.displayName = "CameraFeed"
export default CameraFeed
