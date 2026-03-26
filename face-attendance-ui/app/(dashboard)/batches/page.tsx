"use client"

import { useState } from "react"
import useSWR, { mutate } from "swr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Layers, Calendar, Trash2, RefreshCw } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"

export default function BatchesPage() {
  const { data: batchesData, isLoading } = useSWR('/api/batches', () => api.getBatches())
  const batches = batchesData?.batches || []

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    start_year: new Date().getFullYear(),
    end_year: new Date().getFullYear() + 4
  })

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await api.createBatch(formData)
      toast.success("Batch created successfully!")
      setIsAddDialogOpen(false)
      mutate('/api/batches')
      setFormData({ 
        name: '', 
        start_year: new Date().getFullYear(), 
        end_year: new Date().getFullYear() + 4 
      })
    } catch (error: any) {
      toast.error(error.message || "Failed to create batch")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Batch Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Define academic durations and degree periods (e.g., 2023-2027)
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          New Batch
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
            <div className="col-span-full py-20 flex justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
        ) : batches.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-gray-50 dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                <Layers className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Batches Yet</h3>
                <p className="text-gray-500 mb-6">Create your first degree-period batch to start enrolling students.</p>
                <Button onClick={() => setIsAddDialogOpen(true)} variant="outline">Create Initial Batch</Button>
            </div>
        ) : batches.map((batch: any) => (
          <Card key={batch.id} className="border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all group overflow-hidden">
            <CardHeader className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                    <div className="w-10 h-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                        <Calendar className="h-5 w-5" />
                    </div>
                </div>
                <CardTitle className="mt-4 text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                    {batch.name}
                </CardTitle>
                <CardDescription className="font-mono text-xs font-bold text-blue-500">
                    DURATION: {batch.start_year} — {batch.end_year}
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="rounded-full px-3">
                        {batch.student_count || 0} Students
                    </Badge>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500/50 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Degree Batch</DialogTitle>
            <DialogDescription>
              Define the academic years for this group of students.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateBatch} className="space-y-4 pt-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Batch Identifier (e.g. B.Tech-CSE)</Label>
              <Input 
                id="name" 
                placeholder="Computer Science 2023"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start">Start Year</Label>
                <Input 
                  id="start" 
                  type="number"
                  value={formData.start_year}
                  onChange={(e) => setFormData({...formData, start_year: parseInt(e.target.value)})}
                  required 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end">End Year</Label>
                <Input 
                  id="end" 
                  type="number"
                  value={formData.end_year}
                  onChange={(e) => setFormData({...formData, end_year: parseInt(e.target.value)})}
                  required 
                />
              </div>
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
              {isSubmitting ? "Generating Batch..." : "Initialize Batch"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
