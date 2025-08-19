'use client'

import Layout from '@/components/layout/Layout'
import { BarChart3 } from 'lucide-react'

export default function ReportsPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-5">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            Reports
          </h1>
          <p className="mt-2 text-gray-600">
            High-level supplier performance and overdue task reports (coming soon)
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <p className="text-gray-600">
            This section will provide dashboards for supplier performance, project completion rates, and overdue tasks, per the design document. If you have preferred KPIs, let us know.
          </p>
        </div>
      </div>
    </Layout>
  )
}

