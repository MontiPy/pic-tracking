'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Layout from '@/components/layout/Layout'
import { CheckSquare, Filter, Users, Building2, Clock, AlertTriangle, Search, ChevronDown } from 'lucide-react'

interface TaskInstance {
  id: string
  status: string
  actualDue: string
  notes?: string
  supplierProject: {
    id: string
    supplier: {
      id: string
      name: string
      contactInfo: string
    }
    project: {
      name: string
      description: string
    }
  }
  taskTemplate: {
    id: string
    taskType: {
      name: string
      category: string
    }
    canonicalDue: string
    description: string
  }
}

export default function TasksPage() {
  const searchParams = useSearchParams()
  const [tasks, setTasks] = useState<TaskInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [dueDateFilter, setDueDateFilter] = useState('all')
  const [supplierFilter, setSupplierFilter] = useState(searchParams?.get('supplier') || 'all')

  useEffect(() => {
    fetch('/api/task-instances')
      .then(res => res.json())
      .then(data => {
        setTasks(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching tasks:', err)
        setLoading(false)
      })
  }, [])

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/task-instances/${taskId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (!res.ok) throw new Error('Failed to update status')
      
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ))
    } catch (error) {
      console.error('Error updating task status:', error)
      alert('Failed to update task status')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-700 bg-green-50 border-green-200'
      case 'in_progress': return 'text-blue-700 bg-blue-50 border-blue-200'
      case 'blocked': return 'text-red-700 bg-red-50 border-red-200'
      case 'cancelled': return 'text-gray-700 bg-gray-50 border-gray-200'
      default: return 'text-gray-700 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckSquare className="h-4 w-4" />
      case 'in_progress': return <Clock className="h-4 w-4" />
      case 'blocked': return <AlertTriangle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate)
    const today = new Date()
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.taskTemplate.taskType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.supplierProject.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.supplierProject.project.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter
    const matchesCategory = categoryFilter === 'all' || task.taskTemplate.taskType.category === categoryFilter
    const matchesSupplier = supplierFilter === 'all' || task.supplierProject.supplier.id === supplierFilter
    
    let matchesDueDate = true
    if (dueDateFilter !== 'all') {
      const daysUntilDue = getDaysUntilDue(task.actualDue || task.taskTemplate.canonicalDue)
      switch (dueDateFilter) {
        case 'overdue':
          matchesDueDate = daysUntilDue < 0 && task.status !== 'completed'
          break
        case 'due_soon':
          matchesDueDate = daysUntilDue >= 0 && daysUntilDue <= 7
          break
        case 'this_month':
          matchesDueDate = daysUntilDue >= 0 && daysUntilDue <= 30
          break
      }
    }
    
    return matchesSearch && matchesStatus && matchesCategory && matchesSupplier && matchesDueDate
  })

  const categories = [...new Set(tasks.map(t => t.taskTemplate.taskType.category))]
  const suppliers = [...new Set(tasks.map(t => t.supplierProject.supplier.name))]

  const taskStats = {
    total: filteredTasks.length,
    completed: filteredTasks.filter(t => t.status === 'completed').length,
    inProgress: filteredTasks.filter(t => t.status === 'in_progress').length,
    overdue: filteredTasks.filter(t => {
      const daysUntilDue = getDaysUntilDue(t.actualDue || t.taskTemplate.canonicalDue)
      return daysUntilDue < 0 && t.status !== 'completed'
    }).length
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="border-b border-gray-200 pb-3">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-blue-600" />
            Task Management
          </h1>
          <p className="text-xs text-gray-600">
            Track and manage all supplier tasks across projects
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white p-3 rounded border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total Tasks</p>
                <p className="text-xl font-bold text-gray-900">{taskStats.total}</p>
              </div>
              <CheckSquare className="h-6 w-6 text-blue-500" />
            </div>
          </div>
          <div className="bg-white p-3 rounded border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">In Progress</p>
                <p className="text-xl font-bold text-blue-600">{taskStats.inProgress}</p>
              </div>
              <Clock className="h-6 w-6 text-blue-500" />
            </div>
          </div>
          <div className="bg-white p-3 rounded border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Completed</p>
                <p className="text-xl font-bold text-green-600">{taskStats.completed}</p>
              </div>
              <CheckSquare className="h-6 w-6 text-green-500" />
            </div>
          </div>
          <div className="bg-white p-3 rounded border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Overdue</p>
                <p className="text-xl font-bold text-red-600">{taskStats.overdue}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-3 rounded border">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>
            
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48 pl-9 pr-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 rounded text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="blocked">Blocked</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 rounded text-sm"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <select
              value={dueDateFilter}
              onChange={(e) => setDueDateFilter(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 rounded text-sm"
            >
              <option value="all">All Due Dates</option>
              <option value="overdue">Overdue</option>
              <option value="due_soon">Due Soon (7 days)</option>
              <option value="this_month">This Month</option>
            </select>
          </div>
        </div>

        {/* Task List */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading tasks...</p>
          </div>
        ) : (
          <div className="bg-white rounded border">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-8 px-4">
                <CheckSquare className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No tasks found</p>
                <p className="text-gray-400 text-xs mt-1">
                  Try adjusting your filters
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Task
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Supplier
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Project
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredTasks.map((task) => {
                      const daysUntilDue = getDaysUntilDue(task.actualDue || task.taskTemplate.canonicalDue)
                      const isOverdue = daysUntilDue < 0 && task.status !== 'completed'
                      const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 7
                      
                      return (
                        <tr key={task.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(task.status)}
                              <div>
                                <div className="font-medium text-sm text-gray-900">
                                  {task.taskTemplate.taskType.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {task.taskTemplate.taskType.category}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3 text-gray-400" />
                              <span className="text-sm text-gray-900">
                                {task.supplierProject.supplier.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-gray-400" />
                              <span className="text-sm text-gray-900">
                                {task.supplierProject.project.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="text-sm">
                              <div className={`${
                                isOverdue ? 'text-red-600 font-medium' : 
                                isDueSoon ? 'text-orange-600 font-medium' : 
                                'text-gray-900'
                              }`}>
                                {new Date(task.actualDue || task.taskTemplate.canonicalDue).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-500">
                                {isOverdue ? `${Math.abs(daysUntilDue)} days overdue` : 
                                 daysUntilDue === 0 ? 'Due today' :
                                 daysUntilDue > 0 ? `${daysUntilDue} days left` : ''}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                              {task.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={task.status}
                              onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                              className="text-xs border border-gray-300 rounded px-2 py-1"
                            >
                              <option value="not_started">Not started</option>
                              <option value="in_progress">In progress</option>
                              <option value="completed">Completed</option>
                              <option value="blocked">Blocked</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}