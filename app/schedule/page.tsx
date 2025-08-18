'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/layout/Layout'
import { Calendar, Clock, AlertTriangle, CheckCircle, Users, Building2 } from 'lucide-react'

interface TaskInstance {
  id: string
  status: string
  actualDue: string
  supplierProject: {
    supplier: {
      name: string
    }
    project: {
      name: string
    }
  }
  taskTemplate: {
    taskType: {
      name: string
      category: string
    }
    canonicalDue: string
  }
}

export default function SchedulePage() {
  const [tasks, setTasks] = useState<TaskInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')

  useEffect(() => {
    // For now, we'll simulate task instances from our seeded data
    // In a real app, this would fetch from /api/task-instances
    fetch('/api/suppliers')
      .then(res => res.json())
      .then(suppliers => {
        // Generate simulated task instances
        const simulatedTasks: TaskInstance[] = []
        const now = new Date()
        
        suppliers.forEach((supplier: any) => {
          supplier.supplierProjects?.forEach((sp: any) => {
            // Create some sample task instances with different statuses
            const statuses = ['not_started', 'in_progress', 'completed', 'blocked']
            
            for (let i = 0; i < 3; i++) {
              const daysOffset = Math.floor(Math.random() * 30) - 15 // -15 to +15 days
              const dueDate = new Date(now.getTime() + daysOffset * 24 * 60 * 60 * 1000)
              
              simulatedTasks.push({
                id: `task-${supplier.id}-${sp.project.name}-${i}`,
                status: statuses[Math.floor(Math.random() * statuses.length)],
                actualDue: dueDate.toISOString(),
                supplierProject: {
                  supplier: { name: supplier.name },
                  project: { name: sp.project.name }
                },
                taskTemplate: {
                  taskType: {
                    name: ['Component Approval', 'Production Validation', 'Documentation Review'][i % 3],
                    category: ['Part Approval', 'Production Readiness', 'General'][i % 3]
                  },
                  canonicalDue: dueDate.toISOString()
                }
              })
            }
          })
        })
        
        setTasks(simulatedTasks.sort((a, b) => new Date(a.actualDue).getTime() - new Date(b.actualDue).getTime()))
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching schedule data:', err)
        setLoading(false)
      })
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'blocked': return 'bg-red-100 text-red-800 border-red-200'
      case 'not_started': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'in_progress': return <Clock className="h-4 w-4" />
      case 'blocked': return <AlertTriangle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Part Approval': return 'bg-blue-50 border-l-blue-500'
      case 'Production Readiness': return 'bg-green-50 border-l-green-500'
      case 'New Model Builds': return 'bg-purple-50 border-l-purple-500'
      case 'General': return 'bg-gray-50 border-l-gray-500'
      default: return 'bg-gray-50 border-l-gray-500'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const isOverdue = (dateString: string) => {
    return new Date(dateString) < new Date() && new Date(dateString).toDateString() !== new Date().toDateString()
  }

  const isToday = (dateString: string) => {
    return new Date(dateString).toDateString() === new Date().toDateString()
  }

  const groupTasksByDate = () => {
    const grouped: { [key: string]: TaskInstance[] } = {}
    
    tasks.forEach(task => {
      const dateKey = new Date(task.actualDue).toDateString()
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(task)
    })
    
    return grouped
  }

  const upcomingTasks = tasks.filter(task => 
    new Date(task.actualDue) >= new Date() && 
    new Date(task.actualDue) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  )

  const overdueTasks = tasks.filter(task => isOverdue(task.actualDue) && task.status !== 'completed')

  return (
    <Layout>
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Calendar className="h-8 w-8 text-blue-600" />
                Schedule
              </h1>
              <p className="mt-2 text-gray-600">
                Task schedules and deadlines across all projects
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'week' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'month' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Month
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming This Week</p>
                <p className="text-3xl font-bold text-blue-600">{upcomingTasks.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-3xl font-bold text-red-600">{overdueTasks.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-3xl font-bold text-orange-600">
                  {tasks.filter(t => t.status === 'in_progress').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-green-600">
                  {tasks.filter(t => t.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading schedule...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upcoming Tasks */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-semibold text-gray-900">Upcoming Tasks</h2>
                </div>
                <div className="divide-y">
                  {upcomingTasks.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      No upcoming tasks this week
                    </div>
                  ) : (
                    upcomingTasks.slice(0, 10).map((task) => (
                      <div key={task.id} className={`p-4 border-l-4 ${getCategoryColor(task.taskTemplate.taskType.category)}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {getStatusIcon(task.status)}
                              <h3 className="font-semibold text-gray-900">
                                {task.taskTemplate.taskType.name}
                              </h3>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                                {task.status.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                <span>{task.supplierProject.supplier.name}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Building2 className="h-4 w-4" />
                                <span>{task.supplierProject.project.name}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-medium ${
                              isOverdue(task.actualDue) ? 'text-red-600' : 
                              isToday(task.actualDue) ? 'text-orange-600' : 'text-gray-900'
                            }`}>
                              {formatDate(task.actualDue)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {task.taskTemplate.taskType.category}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Overdue Tasks */}
              {overdueTasks.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="p-4 border-b bg-red-50">
                    <h3 className="font-semibold text-red-900 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Overdue Tasks
                    </h3>
                  </div>
                  <div className="divide-y">
                    {overdueTasks.slice(0, 5).map((task) => (
                      <div key={task.id} className="p-3">
                        <div className="font-medium text-gray-900 text-sm">
                          {task.taskTemplate.taskType.name}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {task.supplierProject.supplier.name}
                        </div>
                        <div className="text-xs text-red-600 font-medium mt-1">
                          Due: {formatTime(task.actualDue)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Today's Tasks */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b bg-blue-50">
                  <h3 className="font-semibold text-blue-900">Today's Tasks</h3>
                </div>
                <div className="divide-y">
                  {tasks.filter(task => isToday(task.actualDue)).length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      No tasks due today
                    </div>
                  ) : (
                    tasks.filter(task => isToday(task.actualDue)).map((task) => (
                      <div key={task.id} className="p-3">
                        <div className="font-medium text-gray-900 text-sm">
                          {task.taskTemplate.taskType.name}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {task.supplierProject.supplier.name}
                        </div>
                        <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}