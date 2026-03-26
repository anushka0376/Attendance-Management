'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Edit, Plus, Trash2, User, RefreshCw, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Student {
  id: string
  name: string
  roll_no: string
  batch_id: string
  department?: string
  email?: string
  created_at?: string
}

interface Batch {
  id: string
  name: string
  start_year: number
  end_year: number
}

const StudentsPage = () => {
  const { user } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBatchId, setSelectedBatchId] = useState<string>('all')
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    roll_no: '',
    batch_id: '',
    department: '',
    email: ''
  })

  // Fetch batches and students
  const fetchData = async () => {
    try {
      setLoading(true)
      const [batchesRes, studentsRes] = await Promise.all([
        api.getBatches(),
        api.getStudents()
      ])
      setBatches(batchesRes.batches || [])
      setStudents(studentsRes.students || [])
      setFilteredStudents(studentsRes.students || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Error connecting to server')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Search and Filter functionality
  useEffect(() => {
    let filtered = students
    
    if (selectedBatchId !== 'all') {
      filtered = filtered.filter(s => s.batch_id === selectedBatchId)
    }
    
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase()
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(lowerSearch) ||
        s.roll_no.toLowerCase().includes(lowerSearch)
      )
    }
    
    setFilteredStudents(filtered)
  }, [searchTerm, selectedBatchId, students])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.batch_id) {
        toast.error('Please select a batch')
        return
    }
    
    setIsSubmitting(true)
    try {
      await api.addStudent(formData)
      toast.success('Student created successfully!')
      setIsAddDialogOpen(false)
      fetchData()
      setFormData({ name: '', roll_no: '', batch_id: '', department: '', email: '' })
    } catch (error: any) {
      toast.error(error.message || 'Failed to create student')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteStudent = async (student: Student) => {
    if (user?.role !== 'admin') {
      toast.error('Only administrators can delete students')
      return
    }

    if (!confirm(`Are you sure you want to delete ${student.name}?`)) return

    try {
      await api.deleteStudent(student.id)
      toast.success('Student deleted successfully!')
      fetchData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete student')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Student Management</h1>
          <p className="text-muted-foreground">Manage student groups by academic batch (Supabase)</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Student
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-2">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or roll number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                <SelectTrigger className="border-none shadow-none focus:ring-0">
                  <SelectValue placeholder="Filter by Batch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Batches</SelectItem>
                  {batches.map(batch => (
                    <SelectItem key={batch.id} value={batch.id}>{batch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{filteredStudents.length}</p>
                <p className="text-xs text-muted-foreground">Students Shown</p>
              </div>
              <Button variant="ghost" size="sm" onClick={fetchData}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Students List</CardTitle>
          <CardDescription>
            Showing database records from Supabase
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading students...</p>
              </div>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <User className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-20" />
              <h3 className="text-lg font-semibold mb-2">No students found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or search term.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Batch (Year Group)</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-xs">
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium">{student.name}</div>
                            <div className="text-xs text-muted-foreground">{student.email || 'No email'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">{student.roll_no}</Badge>
                      </TableCell>
                      <TableCell>
                        {batches.find(b => b.id === student.batch_id)?.name || 'Unknown Batch'}
                      </TableCell>
                      <TableCell>{student.department || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                           <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          {user?.role === 'admin' && (
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => handleDeleteStudent(student)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Student Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Enroll New Student</DialogTitle>
            <DialogDescription>
              Create a new entry in the Supabase database.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreateStudent} className="space-y-4 pt-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="roll_no">Roll Number *</Label>
                    <Input id="roll_no" name="roll_no" value={formData.roll_no} onChange={handleInputChange} required />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="batch_id">Batch *</Label>
                    <Select value={formData.batch_id} onValueChange={(val) => setFormData(prev => ({...prev, batch_id: val}))}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Batch" />
                        </SelectTrigger>
                        <SelectContent>
                            {batches.map(batch => (
                                <SelectItem key={batch.id} value={batch.id}>{batch.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="department">Department</Label>
              <Input id="department" name="department" value={formData.department} onChange={handleInputChange} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Student'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default StudentsPage