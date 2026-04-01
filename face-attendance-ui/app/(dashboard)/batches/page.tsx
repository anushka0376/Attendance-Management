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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function BatchesPage() {
  const { data: batchesData, isLoading } = useSWR('/api/batches', () => api.getBatches())
  const batches = batchesData?.batches || []

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    department: '',
    start_year: new Date().getFullYear().toString(),
    end_year: (new Date().getFullYear() + 4).toString()
  })

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    toast.info("Starting batch creation...")
    
    const sYear = parseInt(formData.start_year)
    const eYear = parseInt(formData.end_year)
    
    if (!formData.department || isNaN(sYear) || isNaN(eYear)) {
      toast.error("Please fill all required fields (Department, Start Year, End Year)")
      setIsSubmitting(false)
      return
    }

    const payload = {
      name: "",
      department: formData.department,
      start_year: sYear,
      end_year: eYear
    }
    
    console.log("🔥 BATCH_SUBMIT_DEBUG:", JSON.stringify(payload, null, 2))
    toast.info(`Preparing Payload: ${JSON.stringify(payload)}`)
    
    console.log("🚀 Sending Batch Payload:", payload)

    try {
      const response = await api.createBatch(payload)
      console.log("✅ Batch creation response:", response)
      
      toast.success("Batch created successfully!")
      setIsAddDialogOpen(false)
      
      // Clear form
      setFormData({ 
        department: '', 
        start_year: new Date().getFullYear().toString(), 
        end_year: (new Date().getFullYear() + 4).toString() 
      })

      // Refresh data
      await mutate('/api/batches')
    } catch (error: any) {
      console.error("❌ Batch creation failed:", error)
      toast.error(error.message || "Failed to create batch. Check console for details.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteBatch = async (batchId: string) => {
    if (!confirm('Are you sure you want to delete this batch?')) return;
    try {
      await api.deleteBatch(batchId);
      toast.success('Batch deleted successfully!');
      await mutate('/api/batches');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete batch');
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
                    <Button 
                      onClick={() => handleDeleteBatch(batch.id)}
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-red-500/50 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
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
              <Label htmlFor="dept">Department</Label>
              <Select value={formData.department} onValueChange={(val) => setFormData({...formData, department: val})}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Computer Science Engineering">Computer Science Engineering</SelectItem>
                  <SelectItem value="Information Technology">Information Technology</SelectItem>
                  <SelectItem value="Electronics & Communication">Electronics & Communication</SelectItem>
                  <SelectItem value="Electrical & Electronics">Electrical & Electronics</SelectItem>
                  <SelectItem value="Mechanical Engineering">Mechanical Engineering</SelectItem>
                  <SelectItem value="Civil Engineering">Civil Engineering</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start">Start Year</Label>
                <Input 
                  id="start" 
                  type="number"
                  value={formData.start_year}
                  onChange={(e) => setFormData({...formData, start_year: e.target.value})}
                  required 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end">End Year</Label>
                <Input 
                  id="end" 
                  type="number"
                  value={formData.end_year}
                  onChange={(e) => setFormData({...formData, end_year: e.target.value})}
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
