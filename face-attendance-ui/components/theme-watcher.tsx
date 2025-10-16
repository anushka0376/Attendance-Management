"use client"
import { useEffect } from "react"

export default function ThemeWatcher() {
  useEffect(() => {
    const apply = (isDark: boolean) => {
      const el = document.documentElement
      if (isDark) el.classList.add("dark")
      else el.classList.remove("dark")
    }
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)")
    apply(!!mq?.matches)
    const handler = (e: MediaQueryListEvent) => apply(e.matches)
    mq?.addEventListener?.("change", handler)
    return () => mq?.removeEventListener?.("change", handler)
  }, [])
  return null
}
