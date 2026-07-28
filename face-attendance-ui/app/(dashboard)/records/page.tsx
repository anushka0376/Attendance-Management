import RecordsTable from "@/components/records/records-table"

export default function RecordsPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance Records</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View, filter, and export student attendance data
          </p>
        </div>
      </div>
      
      <RecordsTable />
    </div>
  )
}
