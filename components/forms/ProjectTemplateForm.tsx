'use client'

import { useEffect, useState } from 'react'
import { Save, X, Plus } from 'lucide-react'

type TaskType = {
  id: string
  name: string
  category: string
  description?: string | null
}

type Milestone = {
  id: string
  taskTypeId: string
  code: string
  name: string
  description?: string | null
  sequence: number
  isRequired: boolean
  taskType: TaskType
}

type Task = {
  id: string
  milestoneId: string
  name: string
  description?: string | null
  sequence: number
  isRequired: boolean
}

export default function ProjectTemplateForm({
  projectId,
  onCreated,
  onCancel,
  isLoading: externalLoading
}: {
  projectId: string
  onCreated: (template: any) => void
  onCancel: () => void
  isLoading?: boolean
}) {
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [selectedTaskTypeId, setSelectedTaskTypeId] = useState('')
  const [selectedMilestoneId, setSelectedMilestoneId] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')

  // Inline creation states
  const [showNewType, setShowNewType] = useState(false)
  const [showNewMilestone, setShowNewMilestone] = useState(false)
  const [showNewTask, setShowNewTask] = useState(false)
  const [newType, setNewType] = useState({ name: '', category: 'Part Approval', description: '' })
  const [newMilestone, setNewMilestone] = useState({ code: '', name: '', description: '', sequence: 1 })
  const [newTask, setNewTask] = useState({ name: '', description: '', sequence: 1 })
  const [creating, setCreating] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/task-types').then(res => res.json()),
      fetch('/api/milestones').then(res => res.json()),
      fetch('/api/tasks').then(res => res.json())
    ])
    .then(([typesData, milestonesData, tasksData]) => {
      setTaskTypes(typesData)
      setMilestones(milestonesData)
      setTasks(tasksData)
    })
    .catch(err => console.error('Error loading data:', err))
    .finally(() => setLoading(false))
  }, [])

  // Filter milestones based on selected task type
  const filteredMilestones = milestones.filter(m => 
    selectedTaskTypeId ? m.taskTypeId === selectedTaskTypeId : true
  )

  // Filter tasks based on selected milestone
  const filteredTasks = tasks.filter(t => 
    selectedMilestoneId ? t.milestoneId === selectedMilestoneId : true
  )

  const createTaskType = async () => {
    try {
      setCreating('taskType')
      const res = await fetch('/api/task-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newType)
      })
      if (!res.ok) throw new Error('Failed to create task type')
      const created = await res.json()
      setTaskTypes(prev => [...prev, created])
      setSelectedTaskTypeId(created.id)
      setShowNewType(false)
      setNewType({ name: '', category: 'Part Approval', description: '' })
    } catch (e) {
      console.error(e)
      alert('Could not create task type')
    } finally {
      setCreating('')
    }
  }

  const createMilestone = async () => {
    if (!selectedTaskTypeId) {
      alert('Please select a task type first')
      return
    }
    try {
      setCreating('milestone')
      const res = await fetch('/api/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newMilestone, taskTypeId: selectedTaskTypeId })
      })
      if (!res.ok) throw new Error('Failed to create milestone')
      const created = await res.json()
      const milestonesData = await fetch('/api/milestones').then(r => r.json())
      setMilestones(milestonesData)
      setSelectedMilestoneId(created.id)
      setShowNewMilestone(false)
      setNewMilestone({ code: '', name: '', description: '', sequence: 1 })
    } catch (e) {
      console.error(e)
      alert('Could not create milestone')
    } finally {
      setCreating('')
    }
  }

  const createTask = async () => {
    if (!selectedMilestoneId) {
      alert('Please select a milestone first')
      return
    }
    try {
      setCreating('task')
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTask, milestoneId: selectedMilestoneId })
      })
      if (!res.ok) throw new Error('Failed to create task')
      const created = await res.json()
      const tasksData = await fetch('/api/tasks').then(r => r.json())
      setTasks(tasksData)
      setSelectedTaskId(created.id)
      setShowNewTask(false)
      setNewTask({ name: '', description: '', sequence: 1 })
    } catch (e) {
      console.error(e)
      alert('Could not create task')
    } finally {
      setCreating('')
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      const res = await fetch('/api/project-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId, 
          milestoneId: selectedMilestoneId, 
          taskId: selectedTaskId, 
          dueDate: new Date(dueDate).toISOString(), 
          notes 
        })
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to create project template')
      }
      const created = await res.json()
      onCreated(created)
    } catch (e) {
      console.error(e)
      alert(`Could not create project template: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  const busy = externalLoading || loading || saving || creating

  if (loading) {
    return <div className="p-4 text-center">Loading...</div>
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Task Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Task Type</label>
        {!showNewType ? (
          <div className="flex gap-2">
            <select
              value={selectedTaskTypeId}
              onChange={(e) => {
                setSelectedTaskTypeId(e.target.value)
                setSelectedMilestoneId('')
                setSelectedTaskId('')
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Select a task type</option>
              {taskTypes.map(tt => (
                <option key={tt.id} value={tt.id}>{tt.name} ({tt.category})</option>
              ))}
            </select>
            <button type="button" onClick={() => setShowNewType(true)} className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded">
              <Plus className="h-4 w-4 inline mr-1" /> New
            </button>
          </div>
        ) : (
          <div className="space-y-2 border rounded p-3">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Name"
                value={newType.name}
                onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded"
              />
              <select
                value={newType.category}
                onChange={(e) => setNewType({ ...newType, category: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded"
              >
                <option>Part Approval</option>
                <option>NMR</option>
                <option>New Model Builds</option>
                <option>General</option>
              </select>
            </div>
            <textarea
              placeholder="Description (optional)"
              value={newType.description}
              onChange={(e) => setNewType({ ...newType, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowNewType(false)} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">
                <X className="h-4 w-4 inline mr-1" /> Cancel
              </button>
              <button type="button" disabled={creating === 'taskType' || !newType.name.trim()} onClick={createTaskType} className="px-3 py-2 text-sm bg-blue-600 text-white rounded disabled:opacity-50">
                {creating === 'taskType' ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Milestone Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Milestone</label>
        {!showNewMilestone ? (
          <div className="flex gap-2">
            <select
              value={selectedMilestoneId}
              onChange={(e) => {
                setSelectedMilestoneId(e.target.value)
                setSelectedTaskId('')
              }}
              disabled={!selectedTaskTypeId}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
            >
              <option value="">Select a milestone</option>
              {filteredMilestones.map(m => (
                <option key={m.id} value={m.id}>{m.code} - {m.name}</option>
              ))}
            </select>
            <button 
              type="button" 
              onClick={() => setShowNewMilestone(true)} 
              disabled={!selectedTaskTypeId}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
            >
              <Plus className="h-4 w-4 inline mr-1" /> New
            </button>
          </div>
        ) : (
          <div className="space-y-2 border rounded p-3">
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Code (e.g., PA2)"
                value={newMilestone.code}
                onChange={(e) => setNewMilestone({ ...newMilestone, code: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded"
              />
              <input
                type="text"
                placeholder="Name"
                value={newMilestone.name}
                onChange={(e) => setNewMilestone({ ...newMilestone, name: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded"
              />
              <input
                type="number"
                placeholder="Sequence"
                value={newMilestone.sequence}
                onChange={(e) => setNewMilestone({ ...newMilestone, sequence: parseInt(e.target.value) || 1 })}
                className="px-3 py-2 border border-gray-300 rounded"
              />
            </div>
            <textarea
              placeholder="Description (optional)"
              value={newMilestone.description}
              onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowNewMilestone(false)} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">
                <X className="h-4 w-4 inline mr-1" /> Cancel
              </button>
              <button type="button" disabled={creating === 'milestone' || !newMilestone.code.trim() || !newMilestone.name.trim()} onClick={createMilestone} className="px-3 py-2 text-sm bg-blue-600 text-white rounded disabled:opacity-50">
                {creating === 'milestone' ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Task Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Task</label>
        {!showNewTask ? (
          <div className="flex gap-2">
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              disabled={!selectedMilestoneId}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
            >
              <option value="">Select a task</option>
              {filteredTasks.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <button 
              type="button" 
              onClick={() => setShowNewTask(true)} 
              disabled={!selectedMilestoneId}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
            >
              <Plus className="h-4 w-4 inline mr-1" /> New
            </button>
          </div>
        ) : (
          <div className="space-y-2 border rounded p-3">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Task Name"
                value={newTask.name}
                onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded"
              />
              <input
                type="number"
                placeholder="Sequence"
                value={newTask.sequence}
                onChange={(e) => setNewTask({ ...newTask, sequence: parseInt(e.target.value) || 1 })}
                className="px-3 py-2 border border-gray-300 rounded"
              />
            </div>
            <textarea
              placeholder="Description (optional)"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowNewTask(false)} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">
                <X className="h-4 w-4 inline mr-1" /> Cancel
              </button>
              <button type="button" disabled={creating === 'task' || !newTask.name.trim()} onClick={createTask} className="px-3 py-2 text-sm bg-blue-600 text-white rounded disabled:opacity-50">
                {creating === 'task' ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Due Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded"
          required
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded"
          placeholder="Optional notes about this project template"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg" disabled={busy}>
          <X className="h-4 w-4" /> Cancel
        </button>
        <button 
          type="submit" 
          disabled={busy || !selectedTaskId || !dueDate} 
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {saving ? 'Creating...' : 'Create Project Template'}
        </button>
      </div>
    </form>
  )
}