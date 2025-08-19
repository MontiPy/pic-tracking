'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/layout/Layout'
import { Users, AlertTriangle, CheckSquare, Clock, Plus, ArrowRight, Building2, Phone, Mail, MessageSquare, Bell } from 'lucide-react'

interface TaskInstance {
  id: string
  status: string
  actualDue: string
  taskTemplate: {
    taskType: {
      name: string
      category: string
    }
    canonicalDue: string
  }
}

interface Supplier {
  id: string
  name: string
  contactInfo: string
  supplierProjects: Array<{
    id: string
    project: {
      name: string
    }
    taskInstances?: TaskInstance[]
  }>
}

export default function Dashboard() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/suppliers')
      .then(res => res.json())
      .then(data => {
        setSuppliers(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching suppliers:', err)
        setLoading(false)
      })
  }, [])

  const getSupplierStats = () => {
    if (!suppliers || suppliers.length === 0) {
      return { totalTasks: 0, overdueTasks: 0, completedTasks: 0 }
    }

    const totalTasks = suppliers.reduce((acc, s) => 
      acc + (s.supplierProjects || []).reduce((projAcc, sp) => 
        projAcc + (sp.taskInstances?.length || 0), 0), 0)
    
    const overdueTasks = suppliers.reduce((acc, s) => 
      acc + (s.supplierProjects || []).reduce((projAcc, sp) => 
        projAcc + (sp.taskInstances?.filter(t => {
          const dueDate = new Date(t.actualDue || t.taskTemplate.canonicalDue)
          return dueDate < new Date() && t.status !== 'completed'
        }).length || 0), 0), 0)
    
    const completedTasks = suppliers.reduce((acc, s) => 
      acc + (s.supplierProjects || []).reduce((projAcc, sp) => 
        projAcc + (sp.taskInstances?.filter(t => t.status === 'completed').length || 0), 0), 0)

    return { totalTasks, overdueTasks, completedTasks }
  }

  const getSupplierTaskStatus = (supplier: Supplier) => {
    if (!supplier || !supplier.supplierProjects) {
      return { total: 0, overdue: 0, completed: 0, inProgress: 0 }
    }

    const tasks = (supplier.supplierProjects || []).reduce((acc, sp) => [...acc, ...(sp.taskInstances || [])], [] as TaskInstance[])
    const overdue = tasks.filter(t => {
      const dueDate = new Date(t.actualDue || t.taskTemplate.canonicalDue)
      return dueDate < new Date() && t.status !== 'completed'
    }).length
    const completed = tasks.filter(t => t.status === 'completed').length
    const inProgress = tasks.filter(t => t.status === 'in_progress').length
    
    return { total: tasks.length, overdue, completed, inProgress }
  }

  const stats = getSupplierStats()

  const quickActions = [
    {
      name: 'Add Supplier',
      description: 'Register new supplier',
      action: () => router.push('/suppliers'),
      icon: Plus,
      color: 'bg-blue-50 text-blue-600'
    },
    {
      name: 'View All Suppliers',
      description: 'Manage all suppliers',
      action: () => router.push('/suppliers'),
      icon: Users,
      color: 'bg-green-50 text-green-600'
    },
    {
      name: 'Projects Overview',
      description: 'View project assignments',
      action: () => router.push('/projects'),
      icon: Building2,
      color: 'bg-purple-50 text-purple-600'
    }
  ]

  return (
    <Layout>
      <div className="space-y-4">
        <div className="border-b border-gray-200 pb-3">
          <h1 className="text-2xl font-bold text-gray-900">Supplier Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage supplier relationships and track task progress
          </p>
        </div>

        {/* Compact Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white p-3 rounded border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total Suppliers</p>
                <p className="text-xl font-bold text-gray-900">{suppliers.length}</p>
              </div>
              <Users className="h-6 w-6 text-blue-500" />
            </div>
          </div>
          <div className="bg-white p-3 rounded border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Active Tasks</p>
                <p className="text-xl font-bold text-gray-900">{stats.totalTasks}</p>
              </div>
              <CheckSquare className="h-6 w-6 text-green-500" />
            </div>
          </div>
          <div className="bg-white p-3 rounded border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Overdue</p>
                <p className="text-xl font-bold text-red-600">{stats.overdueTasks}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
          </div>
          <div className="bg-white p-3 rounded border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Completed</p>
                <p className="text-xl font-bold text-green-600">{stats.completedTasks}</p>
              </div>
              <CheckSquare className="h-6 w-6 text-green-500" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-4 rounded border">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.name}
                  onClick={action.action}
                  className="flex items-center justify-between p-3 rounded hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded ${action.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{action.name}</p>
                      <p className="text-xs text-gray-500">{action.description}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </button>
              )
            })}
          </div>
        </div>

        {/* Supplier Status Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Supplier Status</h2>
              <button 
                onClick={() => router.push('/suppliers')}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                View All
              </button>
            </div>
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-xs text-gray-600">Loading...</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(suppliers || []).slice(0, 6).map((supplier) => {
                  const taskStatus = getSupplierTaskStatus(supplier)
                  return (
                    <div
                      key={supplier.id}
                      onClick={() => router.push('/suppliers')}
                      className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">{supplier.name}</p>
                          <span className="text-xs text-gray-500">
                            {(supplier.supplierProjects || []).length} projects
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Mail className="h-3 w-3" />
                          {supplier.contactInfo?.split(' | ')[0] || 'No contact info'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {taskStatus.overdue > 0 && (
                          <span className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
                            {taskStatus.overdue} overdue
                          </span>
                        )}
                        {taskStatus.inProgress > 0 && (
                          <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                            {taskStatus.inProgress} active
                          </span>
                        )}
                        <span className="text-gray-500">{taskStatus.completed}/{taskStatus.total}</span>
                        {/* Quick Actions */}
                        <div className="flex items-center gap-1 ml-1">
                          <button
                            title="Send message"
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            onClick={(e) => {
                              e.stopPropagation()
                              alert(`Message feature for ${supplier.name} - To be implemented`)
                            }}
                          >
                            <MessageSquare className="h-3 w-3" />
                          </button>
                          {taskStatus.overdue > 0 && (
                            <button
                              title="Send overdue reminder"
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                              onClick={(e) => {
                                e.stopPropagation()
                                alert(`Overdue reminder sent to ${supplier.name}`)
                              }}
                            >
                              <Bell className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {suppliers.length === 0 && (
                  <div className="text-center py-6 text-sm text-gray-500">
                    No suppliers registered yet
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white p-4 rounded border">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Urgent Items</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(suppliers || []).map(supplier => 
                (supplier.supplierProjects || []).map(sp => 
                  (sp.taskInstances || [])
                    .filter(task => {
                      const dueDate = new Date(task.actualDue || task.taskTemplate.canonicalDue)
                      const daysUntilDue = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                      return daysUntilDue <= 7 && task.status !== 'completed'
                    })
                    .map(task => {
                      const dueDate = new Date(task.actualDue || task.taskTemplate.canonicalDue)
                      const daysUntilDue = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                      const isOverdue = daysUntilDue < 0
                      
                      return (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{task.taskTemplate.taskType.name}</p>
                            <p className="text-xs text-gray-500">{supplier.name} • {sp.project.name}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${
                            isOverdue 
                              ? 'bg-red-100 text-red-800'
                              : daysUntilDue <= 2 
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {isOverdue ? `${Math.abs(daysUntilDue)} days overdue` : `${daysUntilDue} days`}
                          </span>
                        </div>
                      )
                    })
                )
              ).flat().slice(0, 8)}
              {(!suppliers || suppliers.length === 0 || suppliers.every(s => (s.supplierProjects || []).every(sp => 
                (sp.taskInstances || []).every(t => {
                  const dueDate = new Date(t.actualDue || t.taskTemplate.canonicalDue)
                  const daysUntilDue = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  return daysUntilDue > 7 || t.status === 'completed'
                })
              ))) && (
                <div className="text-center py-6 text-sm text-gray-500">
                  No urgent items
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded border">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Recent Activity</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {/* Mock recent activity data - in real app this would come from API */}
              <div className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Task Completed</p>
                    <p className="text-xs text-gray-500">Precision Manufacturing completed Component Approval</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">2m ago</span>
              </div>
              
              <div className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Status Updated</p>
                    <p className="text-xs text-gray-500">Advanced Components started Production Validation</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">5m ago</span>
              </div>
              
              <div className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Reminder Sent</p>
                    <p className="text-xs text-gray-500">Overdue notification sent to Quality Systems Inc</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">15m ago</span>
              </div>
              
              <div className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">New Assignment</p>
                    <p className="text-xs text-gray-500">Supplier assigned to Technology Integration project</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">1h ago</span>
              </div>
              
              {suppliers.length === 0 && (
                <div className="text-center py-6 text-sm text-gray-500">
                  No recent activity
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
