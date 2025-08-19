'use client'

import { useState, useEffect } from 'react'
import { Save, X, Calendar, FileText, AlertCircle, Clock, Settings } from 'lucide-react'

interface TaskInstance {
  id: string
  status: string
  dueDate: string
  actualDueDate?: string
  completedAt?: string
  notes?: string
  customFields?: string
  isApplied: boolean
  projectMilestoneTask: {
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
    dueDate: string
    notes?: string
  }
}

interface TaskCustomizationFormProps {
  taskInstance: TaskInstance
  onSave: (data: {
    actualDueDate?: string
    notes?: string
    customFields?: any
    status?: string
  }) => void
  onCancel: () => void
  isLoading?: boolean
}

export default function TaskCustomizationForm({ 
  taskInstance, 
  onSave, 
  onCancel, 
  isLoading 
}: TaskCustomizationFormProps) {
  const [actualDueDate, setActualDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState(taskInstance.status)
  const [priority, setPriority] = useState('medium')
  const [assignedTo, setAssignedTo] = useState('')
  const [estimatedHours, setEstimatedHours] = useState('')
  const [dependencies, setDependencies] = useState('')

  useEffect(() => {
    // Initialize form with existing data
    setActualDueDate(taskInstance.actualDueDate ? 
      new Date(taskInstance.actualDueDate).toISOString().split('T')[0] : '')
    setNotes(taskInstance.notes || '')
    setStatus(taskInstance.status)
    
    // Parse custom fields if they exist
    if (taskInstance.customFields) {
      try {
        const customData = JSON.parse(taskInstance.customFields)
        setPriority(customData.priority || 'medium')
        setAssignedTo(customData.assignedTo || '')
        setEstimatedHours(customData.estimatedHours || '')
        setDependencies(customData.dependencies || '')
      } catch (e) {
        console.warn('Could not parse custom fields:', e)
      }
    }
  }, [taskInstance])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const customFields = {
      priority,
      assignedTo: assignedTo.trim(),
      estimatedHours: estimatedHours.trim(),
      dependencies: dependencies.trim()
    }

    onSave({
      actualDueDate: actualDueDate || undefined,
      notes: notes.trim() || undefined,
      status,
      customFields
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200'
      case 'in_progress': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'blocked': return 'text-red-600 bg-red-50 border-red-200'
      case 'not_started': return 'text-gray-600 bg-gray-50 border-gray-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Task Header */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
            {taskInstance.projectMilestoneTask.milestone.code}
          </span>
          <h3 className="text-lg font-medium text-gray-900">
            {taskInstance.projectMilestoneTask.task.name}
          </h3>
          <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(status)}`}>
            {status.replace('_', ' ')}
          </span>
        </div>
        <p className="text-sm text-gray-600 mb-2">
          {taskInstance.projectMilestoneTask.task.description}
        </p>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Template Due: {formatDate(taskInstance.projectMilestoneTask.dueDate)}
          </span>
          <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
            {taskInstance.projectMilestoneTask.milestone.taskType.category}
          </span>
        </div>
      </div>

      {/* Task Status & Timeline */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-900 flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-600" />
          Status & Timeline
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="blocked">Blocked</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Custom Due Date
            </label>
            <input
              type="date"
              value={actualDueDate}
              onChange={(e) => setActualDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Override template due date if needed
            </p>
          </div>
        </div>
      </div>

      {/* Task Planning */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-900 flex items-center gap-2">
          <Settings className="h-4 w-4 text-blue-600" />
          Task Planning
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority Level
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assigned To
            </label>
            <input
              type="text"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="Team member name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estimated Hours
            </label>
            <input
              type="number"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              placeholder="0"
              min="0"
              step="0.5"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Dependencies */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <AlertCircle className="h-4 w-4 inline mr-1" />
          Dependencies
        </label>
        <input
          type="text"
          value={dependencies}
          onChange={(e) => setDependencies(e.target.value)}
          placeholder="Tasks or deliverables this depends on"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          List any dependencies that could impact this task
        </p>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <FileText className="h-4 w-4 inline mr-1" />
          Task Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Add notes about progress, issues, or special requirements..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Summary */}
      {(priority !== 'medium' || assignedTo || estimatedHours) && (
        <div className="bg-blue-50 rounded-lg p-4">
          <h5 className="text-sm font-medium text-blue-900 mb-2">Customization Summary</h5>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className={`px-2 py-1 rounded border ${getPriorityColor(priority)}`}>
              {priority} priority
            </span>
            {assignedTo && (
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                Assigned: {assignedTo}
              </span>
            )}
            {estimatedHours && (
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                Est: {estimatedHours}h
              </span>
            )}
            {actualDueDate && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                Custom due: {formatDate(actualDueDate)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          disabled={isLoading}
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
        <button
          type="submit"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          disabled={isLoading}
        >
          <Save className="h-4 w-4" />
          {isLoading ? 'Saving...' : 'Save Customization'}
        </button>
      </div>
    </form>
  )
}