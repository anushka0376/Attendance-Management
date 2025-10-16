"use client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useEffect, useState } from "react"

export default function SettingsPage() {
  const [autoDark, setAutoDark] = useState(true)

  useEffect(() => {
    // This page is a placeholder - Theme is managed globally in ThemeWatcher
  }, [])

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-dark">Follow system theme</Label>
            <Switch id="auto-dark" checked={autoDark} onCheckedChange={setAutoDark} disabled />
          </div>
          <p className="text-sm text-muted-foreground">
            The UI automatically follows your system light/dark preference.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
