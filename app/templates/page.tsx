'use client'

import { useState, useEffect } from 'react'
import { Plus, Settings, Calendar, Users, CheckCircle, Clock, AlertTriangle } from 'lucide-react'

interface TaskType {
  id: string
  name: string
  category: string
  description: string
  milestones: Milestone[]
  _count: {
    milestones: number
  }
}

interface Milestone {
  id: string
  code: string
  name: string
  description: string
  sequence: number
  isRequired: boolean
  tasks: Task[]
  _count: {
    tasks: number
    projectMilestoneTasks: number
  }
}

interface Task {
  id: string
  name: string
  description: string
  sequence: number
  isRequired: boolean
}

interface Project {
  id: string
  name: string
  description: string
  stats: {
    totalSuppliers: number
    totalTemplates: number
    totalTasks: number
    completedTasks: number
    overdueTasks: number
  }
  completionRatio: number
}

interface ProjectMilestoneTask {
  id: string
  dueDate: string
  notes: string
  isActive: boolean
  project: {
    id: string
    name: string
  }
  milestone: {
    code: string
    name: string
    taskType: {
      name: string
      category: string
    }
  }
  task: {
    name: string
    description: string
  }
  stats: {
    totalSuppliers: number
    appliedSuppliers: number
    completedSuppliers: number
    overdueSuppliers: number
  }
}

interface TemplateTask {
  taskId: string
  milestoneId: string
  taskName: string
  milestoneName: string
  milestoneCode: string
  category: string
  dueDate: string
  notes: string
}

export default function ProjectTemplatesPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([])
  const [templates, setTemplates] = useState<ProjectMilestoneTask[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [selectedTaskType, setSelectedTaskType] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'builder' | 'templates'>('overview')
  const [selectedTasks, setSelectedTasks] = useState<TemplateTask[]>([])
  const [showDueDateModal, setShowDueDateModal] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [projectsRes, taskTypesRes, templatesRes] = await Promise.all([
        fetch('/api/projects?includeTemplates=true&includeSuppliers=true'),
        fetch('/api/task-types?includeMilestones=true'),
        fetch('/api/project-templates?includeInstances=true')
      ])

      const [projectsData, taskTypesData, templatesData] = await Promise.all([
        projectsRes.json(),
        taskTypesRes.json(),
        templatesRes.json()
      ])

      setProjects(projectsData.projects || projectsData)
      setTaskTypes(taskTypesData.taskTypes || taskTypesData)
      setTemplates(templatesData.templates || templatesData)

      if (projectsData.projects && projectsData.projects.length > 0) {
        setSelectedProject(projectsData.projects[0].id)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getProjectTemplates = (projectId: string) => {
    return templates.filter(t => t.project.id === projectId)
  }

  const getTaskTypeTemplates = (projectId: string, taskTypeCategory: string) => {
    return templates.filter(t => 
      t.project.id === projectId && 
      t.milestone.taskType.category === taskTypeCategory
    )
  }

  const handleAddTaskToTemplate = (task: Task, milestone: Milestone, taskType: TaskType) => {
    const templateTask: TemplateTask = {
      taskId: task.id,
      milestoneId: milestone.id,
      taskName: task.name,
      milestoneName: milestone.name,
      milestoneCode: milestone.code,
      category: taskType.category,
      dueDate: '',
      notes: ''
    }
    
    setSelectedTasks(prev => {
      // Check if task already exists
      const exists = prev.find(t => t.taskId === task.id && t.milestoneId === milestone.id)
      if (exists) return prev
      
      return [...prev, templateTask]
    })
  }

  const handleRemoveTaskFromTemplate = (taskId: string, milestoneId: string) => {
    setSelectedTasks(prev => prev.filter(t => !(t.taskId === taskId && t.milestoneId === milestoneId)))
  }

  const handleUpdateTaskDueDate = (taskId: string, milestoneId: string, dueDate: string, notes: string) => {
    setSelectedTasks(prev => prev.map(task => 
      task.taskId === taskId && task.milestoneId === milestoneId
        ? { ...task, dueDate, notes }
        : task
    ))
  }

  const handleCreateTemplates = async () => {
    if (!selectedProject || selectedTasks.length === 0) {
      alert('Please select a project and at least one task')
      return
    }

    const tasksWithoutDates = selectedTasks.filter(t => !t.dueDate)
    if (tasksWithoutDates.length > 0) {
      alert('Please set due dates for all tasks')
      return
    }

    try {
      const promises = selectedTasks.map(task =>
        fetch('/api/project-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: selectedProject,
            milestoneId: task.milestoneId,
            taskId: task.taskId,
            dueDate: task.dueDate,
            notes: task.notes,
            isActive: true
          })
        })
      )

      await Promise.all(promises)
      
      // Refresh data
      await loadData()
      
      // Clear selection
      setSelectedTasks([])
      setActiveTab('templates')
      
      alert(`Successfully created ${selectedTasks.length} project templates!`)
    } catch (error) {
      console.error('Error creating templates:', error)
      alert('Error creating templates. Please try again.')
    }
  }

  const isTaskSelected = (taskId: string, milestoneId: string) => {
    return selectedTasks.some(t => t.taskId === taskId && t.milestoneId === milestoneId)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading project templates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Project Templates</h1>
              <p className="mt-1 text-sm text-gray-500">
                Configure manufacturing workflow templates with milestones and due dates
              </p>
            </div>
            <button
              onClick={() => setActiveTab('builder')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Build Template
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'Overview', icon: Settings },
                { id: 'builder', name: 'Template Builder', icon: Plus },
                { id: 'templates', name: 'Active Templates', icon: Calendar }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Project Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Projects</dt>
                      <dd className="text-lg font-medium text-gray-900">{projects.length}</dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Calendar className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Active Templates</dt>
                      <dd className="text-lg font-medium text-gray-900">{templates.length}</dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Task Categories</dt>
                      <dd className="text-lg font-medium text-gray-900">{taskTypes.length}</dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Clock className="h-8 w-8 text-yellow-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Milestones</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {taskTypes.reduce((acc, tt) => acc + tt._count.milestones, 0)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Projects Overview */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Projects Overview</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Project
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Suppliers
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Templates
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Completion
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {projects.map((project) => (
                      <tr key={project.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{project.name}</div>
                            <div className="text-sm text-gray-500">{project.description}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {project.stats.totalSuppliers}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {project.stats.totalTemplates}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${project.completionRatio}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600">{project.completionRatio.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {project.stats.overdueTasks > 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {project.stats.overdueTasks} overdue
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              On track
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Template Builder Tab */}
        {activeTab === 'builder' && (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Build New Template</h3>
              
              {/* Project Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Project
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Choose a project...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Task Type Categories */}
              {selectedProject && (
                <div className="space-y-6">
                  <h4 className="text-md font-medium text-gray-900">Manufacturing Categories</h4>
                  
                  {['Part Approval', 'Production Readiness', 'New Model Builds', 'General'].map((category) => {
                    const categoryTaskTypes = taskTypes.filter(tt => tt.category === category)
                    
                    return (
                      <div key={category} className="bg-gray-50 rounded-lg p-4">
                        <h5 className="text-sm font-semibold text-gray-900 mb-3">{category}</h5>
                        
                        {categoryTaskTypes.map((taskType) => (
                          <div key={taskType.id} className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <h6 className="text-sm font-medium text-gray-800">{taskType.name}</h6>
                              <span className="text-xs text-gray-500">
                                {taskType._count.milestones} milestones
                              </span>
                            </div>
                            
                            {/* Milestones */}
                            <div className="space-y-2 ml-4">
                              {taskType.milestones.map((milestone) => (
                                <div key={milestone.id} className="border border-gray-200 rounded p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                                        {milestone.code}
                                      </span>
                                      <span className="text-sm font-medium">{milestone.name}</span>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                      {milestone.tasks.length} tasks
                                    </span>
                                  </div>
                                  
                                  {/* Tasks */}
                                  <div className="ml-4 space-y-1">
                                    {milestone.tasks.map((task) => (
                                      <div key={task.id} className="flex items-center justify-between py-1">
                                        <span className="text-sm text-gray-700">{task.name}</span>
                                        {isTaskSelected(task.id, milestone.id) ? (
                                          <button
                                            className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded hover:bg-red-200"
                                            onClick={() => handleRemoveTaskFromTemplate(task.id, milestone.id)}
                                          >
                                            Remove
                                          </button>
                                        ) : (
                                          <button
                                            className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded hover:bg-green-200"
                                            onClick={() => handleAddTaskToTemplate(task, milestone, taskType)}
                                          >
                                            Add to Template
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Selected Tasks Panel */}
              {selectedTasks.length > 0 && (
                <div className="mt-8">
                  <div className="bg-blue-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-medium text-gray-900">
                        Selected Tasks ({selectedTasks.length})
                      </h4>
                      <div className="space-x-2">
                        <button
                          onClick={() => setSelectedTasks([])}
                          className="text-xs bg-gray-100 text-gray-800 px-3 py-1 rounded hover:bg-gray-200"
                        >
                          Clear All
                        </button>
                        <button
                          onClick={() => setShowDueDateModal(true)}
                          className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                        >
                          Configure Due Dates
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {selectedTasks.map((task, index) => (
                        <div key={`${task.taskId}-${task.milestoneId}`} className="bg-white p-3 rounded border">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                                {task.milestoneCode}
                              </span>
                              <span className="text-sm font-medium">{task.taskName}</span>
                              <span className="text-xs text-gray-500">{task.category}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {task.dueDate ? (
                                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                                  Due: {new Date(task.dueDate).toLocaleDateString()}
                                </span>
                              ) : (
                                <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                                  No due date set
                                </span>
                              )}
                              <button
                                onClick={() => handleRemoveTaskFromTemplate(task.taskId, task.milestoneId)}
                                className="text-xs text-red-600 hover:text-red-800"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={handleCreateTemplates}
                        disabled={selectedTasks.some(t => !t.dueDate)}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        Create Templates
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Due Date Configuration Modal */}
        {showDueDateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Configure Due Dates</h3>
                <button
                  onClick={() => setShowDueDateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {selectedTasks.map((task, index) => (
                  <div key={`${task.taskId}-${task.milestoneId}`} className="border border-gray-200 rounded p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                        {task.milestoneCode}
                      </span>
                      <span className="text-sm font-medium">{task.taskName}</span>
                      <span className="text-xs text-gray-500">{task.category}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Due Date
                        </label>
                        <input
                          type="date"
                          value={task.dueDate}
                          onChange={(e) => handleUpdateTaskDueDate(task.taskId, task.milestoneId, e.target.value, task.notes)}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Notes (Optional)
                        </label>
                        <input
                          type="text"
                          value={task.notes}
                          onChange={(e) => handleUpdateTaskDueDate(task.taskId, task.milestoneId, task.dueDate, e.target.value)}
                          placeholder="Add notes..."
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowDueDateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowDueDateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Templates Tab */}
        {activeTab === 'templates' && (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Active Project Templates</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Project
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Milestone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Task
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Progress
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {templates.map((template) => (
                      <tr key={template.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {template.project.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {template.milestone.taskType.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2 py-1 rounded">
                              {template.milestone.code}
                            </span>
                            <span className="text-sm text-gray-900">{template.milestone.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {template.task.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(template.dueDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className="bg-green-600 h-2 rounded-full"
                                style={{ 
                                  width: `${template.stats.totalSuppliers > 0 
                                    ? (template.stats.completedSuppliers / template.stats.totalSuppliers) * 100 
                                    : 0}%` 
                                }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600">
                              {template.stats.completedSuppliers}/{template.stats.totalSuppliers}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}