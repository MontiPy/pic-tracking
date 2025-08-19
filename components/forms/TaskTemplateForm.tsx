'use client'

import { useEffect, useState } from 'react'
import { Save, X, Plus } from 'lucide-react'

type TaskType = {
  id: string
  name: string
  category: string
  description?: string | null
}

export default function TaskTemplateForm({
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
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [taskTypeId, setTaskTypeId] = useState('')
  const [canonicalDue, setCanonicalDue] = useState('')
  const [description, setDescription] = useState('')

  // Inline new task type creation
  const [showNewType, setShowNewType] = useState(false)
  const [newType, setNewType] = useState({ name: '', category: 'General', description: '' })
  const [creatingType, setCreatingType] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch('/api/task-types')
      .then(res => res.json())
      .then((data: TaskType[]) => setTaskTypes(data))
      .catch(err => console.error('Error loading task types:', err))
      .finally(() => setLoading(false))
  }, [])

  const createTaskType = async () => {
    try {
      setCreatingType(true)
      const res = await fetch('/api/task-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newType)
      })
      if (!res.ok) throw new Error('Failed to create task type')
      const created = await res.json()
      setTaskTypes(prev => [...prev, created])
      setTaskTypeId(created.id)
      setShowNewType(false)
      setNewType({ name: '', category: 'General', description: '' })
    } catch (e) {
      console.error(e)
      alert('Could not create task type')
    } finally {
      setCreatingType(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      const res = await fetch(`/api/projects/${projectId}/task-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskTypeId, canonicalDue: new Date(canonicalDue).toISOString(), description })
      })
      if (!res.ok) throw new Error('Failed to create task template')
      const created = await res.json()
      onCreated(created)
    } catch (e) {
      console.error(e)
      alert('Could not create task template')
    } finally {
      setSaving(false)
    }
  }

  const busy = externalLoading || loading || saving

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Task Type</label>
        {!showNewType ? (
          <div className="flex gap-2">
            <select
              value={taskTypeId}
              onChange={(e) => setTaskTypeId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="" disabled>Select a task type</option>
              {taskTypes.map(tt => (
                <option key={tt.id} value={tt.id}>{tt.name} ({tt.category})</option>
              ))}
            </select>
            <button type="button" onClick={() => setShowNewType(true)} className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded">
              <Plus className="h-4 w-4 inline mr-1" /> New Type
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
                <option>Production Readiness</option>
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
              <button type="button" disabled={creatingType || !newType.name.trim()} onClick={createTaskType} className="px-3 py-2 text-sm bg-blue-600 text-white rounded disabled:opacity-50">
                {creatingType ? 'Creating...' : 'Create Type'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Canonical Due Date</label>
        <input
          type="date"
          value={canonicalDue}
          onChange={(e) => setCanonicalDue(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded"
          placeholder="Describe this task template"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg" disabled={busy}>
          <X className="h-4 w-4" /> Cancel
        </button>
        <button type="submit" disabled={busy || !taskTypeId || !canonicalDue} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">
          <Save className="h-4 w-4" /> {saving ? 'Creating...' : 'Create Task Template'}
        </button>
      </div>
    </form>
  )
}

