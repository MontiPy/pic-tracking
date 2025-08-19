'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/layout/Layout'
import { Calendar, Clock, AlertTriangle, CheckCircle, Users, Building2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import TaskTemplateForm from '@/components/forms/TaskTemplateForm'

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

type Project = {
  id: string
  name: string
  supplierProjects: { supplier: { name: string } }[]
  taskTemplates: {
    id: string
    canonicalDue: string
    description: string | null
    taskType: { name: string; category: string }
  }[]
}

export default function SchedulePage() {
  // Master Schedule state
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [savingTemplateId, setSavingTemplateId] = useState<string>('')
  const [dueEdits, setDueEdits] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'master' | 'overview'>('master')
  const [showAddTemplate, setShowAddTemplate] = useState(false)

  // Overview widgets state (derived later from selected project)
  const [tasks, setTasks] = useState<TaskInstance[]>([])

  useEffect(() => {
    // Load projects with templates and supplier assignments
    fetch('/api/projects')
      .then(res => res.json())
      .then((data) => {
        // Handle both new API format with .projects and old direct array format
        const projectsData = data.projects || data || []
        setProjects(projectsData)
        if (projectsData.length) {
          setSelectedProjectId(projectsData[0].id)
        }
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching projects for master schedule:', err)
        setLoading(false)
      })
  }, [])

  // Load task instances for overview widgets when project selection changes
  useEffect(() => {
    if (!selectedProjectId) return
    fetch(`/api/task-instances?projectId=${selectedProjectId}`)
      .then(res => res.json())
      .then((data: TaskInstance[]) => {
        setTasks(data)
      })
      .catch(err => {
        console.error('Error fetching task instances:', err)
      })
  }, [selectedProjectId])

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

  const selectedProject = (projects || []).find(p => p.id === selectedProjectId)

  const groupedByCategory = () => {
    const grouped: Record<string, Project['taskTemplates']> = {}
    if (!selectedProject) return grouped
    selectedProject.taskTemplates.forEach(t => {
      const key = t.taskType.category
      grouped[key] = grouped[key] || []
      grouped[key].push(t)
    })
    return grouped
  }

  const handleDueChange = (templateId: string, date: string) => {
    setDueEdits(prev => ({ ...prev, [templateId]: date }))
  }

  const saveDueDate = async (projectId: string, templateId: string) => {
    try {
      setSavingTemplateId(templateId)
      const iso = new Date(dueEdits[templateId]).toISOString()
      const res = await fetch(`/api/projects/${projectId}/task-templates/${templateId}/due-date`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canonicalDue: iso })
      })
      if (!res.ok) throw new Error('Failed to update due date')
      const updated = await res.json()
      // Update local state
      setProjects(prev => prev.map(p => p.id !== projectId ? p : ({
        ...p,
        taskTemplates: p.taskTemplates.map(t => t.id === templateId ? { ...t, canonicalDue: updated.canonicalDue } : t)
      })))
    } catch (e) {
      console.error(e)
      alert('Could not save due date')
    } finally {
      setSavingTemplateId('')
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Calendar className="h-8 w-8 text-blue-600" />
                Master Schedule
              </h1>
              <p className="mt-2 text-gray-600">
                Canonical task templates per project; suppliers inherit due dates
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('master')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'master' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('overview')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'overview' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Overview
              </button>
              {viewMode === 'master' && (
                <button
                  onClick={() => setShowAddTemplate(true)}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-blue-600 text-white"
                >
                  + Add Task Template
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Project Selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-700">Project</label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {selectedProject && (
            <div className="text-sm text-gray-600 ml-2">
              {selectedProject.supplierProjects.length} assigned suppliers
            </div>
          )}
        </div>

        {/* Master Schedule Grid */}
        {viewMode === 'master' && (
          <div className="space-y-6">
            {loading || !selectedProject ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading master schedule...</p>
              </div>
            ) : (
              Object.entries(groupedByCategory()).map(([category, templates]) => (
                <div key={category} className="bg-white rounded-lg shadow-sm border">
                  <div className="px-6 py-3 border-b flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">{category}</h2>
                    <span className="text-sm text-gray-600">{templates.length} tasks</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Suppliers</th>
                          <th className="px-6 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {templates.sort((a,b) => new Date(a.canonicalDue).getTime() - new Date(b.canonicalDue).getTime()).map(t => (
                          <tr key={t.id}>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">{t.taskType.name}</div>
                              {t.description && (
                                <div className="text-xs text-gray-500">{t.description}</div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <input
                                type="date"
                                defaultValue={new Date(t.canonicalDue).toISOString().slice(0,10)}
                                onChange={(e) => handleDueChange(t.id, e.target.value)}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {selectedProject?.supplierProjects.length}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                disabled={!dueEdits[t.id] || savingTemplateId === t.id}
                                onClick={() => selectedProject && saveDueDate(selectedProject.id, t.id)}
                                className={`px-3 py-1.5 rounded text-sm font-medium ${
                                  !dueEdits[t.id] || savingTemplateId === t.id
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                              >
                                {savingTemplateId === t.id ? 'Saving...' : 'Save'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Overview widgets (kept for quick insights) */}
        {viewMode === 'overview' && (
          <>
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
          </>
        )}
      </div>
      {/* Add Task Template Modal */}
      <Modal
        isOpen={showAddTemplate}
        onClose={() => setShowAddTemplate(false)}
        title="Add Task Template"
      >
        {selectedProject && (
          <TaskTemplateForm
            projectId={selectedProject.id}
            onCreated={(tpl) => {
              // Update selected project with new template
              setProjects(prev => prev.map(p => p.id !== selectedProject.id ? p : ({
                ...p,
                taskTemplates: [...p.taskTemplates, tpl]
              })))
              setShowAddTemplate(false)
            }}
            onCancel={() => setShowAddTemplate(false)}
          />
        )}
      </Modal>
    </Layout>
  )
}
