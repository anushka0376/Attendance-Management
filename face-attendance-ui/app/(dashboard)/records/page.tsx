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
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">
            Export Data
          </button>
          <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors">
            Generate Report
          </button>
        </div>
      </div>
      
      <RecordsTable />
    </div>
  )
}
