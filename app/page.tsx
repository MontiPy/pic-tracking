'use client'

import Layout from '@/components/layout/Layout'
import { Building2, Users, CheckSquare, Calendar } from 'lucide-react'

const stats = [
  {
    name: 'Active Suppliers',
    value: '4',
    icon: Users,
    description: 'Suppliers across all projects'
  },
  {
    name: 'Active Projects',
    value: '3',
    icon: Building2,
    description: 'Manufacturing projects in progress'
  },
  {
    name: 'Task Templates',
    value: '5',
    icon: CheckSquare,
    description: 'Master task definitions'
  },
  {
    name: 'Due This Week',
    value: '12',
    icon: Calendar,
    description: 'Tasks requiring attention'
  }
]

export default function Dashboard() {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-5">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Overview of your supplier task management system
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.name} className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-500 mt-1">{stat.description}</p>
                  </div>
                  <Icon className="h-8 w-8 text-blue-500" />
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Precision Manufacturing</span> completed Component Approval for Platform Development
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Advanced Components</span> started Production Validation
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                <p className="text-sm text-gray-600">
                  New task template created for Technology Integration project
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Upcoming Deadlines</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">Technology Integration Documentation</p>
                  <p className="text-sm text-gray-500">Quality Systems Inc</p>
                </div>
                <span className="text-sm bg-red-100 text-red-800 px-2 py-1 rounded-full">
                  2 days
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">Product Refresh Component Approval</p>
                  <p className="text-sm text-gray-500">Precision Manufacturing</p>
                </div>
                <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                  5 days
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">Platform Component Approval</p>
                  <p className="text-sm text-gray-500">Advanced Components</p>
                </div>
                <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  10 days
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
