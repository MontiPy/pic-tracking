'use client'

import { useMemo, useState } from 'react'
import { Save, X } from 'lucide-react'

type Template = {
  id: string
  description?: string | null
  canonicalDue: string
  taskType: { name: string; category: string }
}

export default function TaskInstanceForm({
  supplierProjectId,
  templates,
  existingInstanceTemplateIds,
  onCreated,
  onCancel
}: {
  supplierProjectId: string
  templates: Template[]
  existingInstanceTemplateIds: string[]
  onCreated: (instance: any) => void
  onCancel: () => void
}) {
  const [templateId, setTemplateId] = useState('')
  const [actualDue, setActualDue] = useState('')
  const [status, setStatus] = useState<'not_started'|'in_progress'|'completed'|'blocked'|'cancelled'>('not_started')
  const [saving, setSaving] = useState(false)

  const availableTemplates = useMemo(
    () => templates.filter(t => !existingInstanceTemplateIds.includes(t.id)),
    [templates, existingInstanceTemplateIds]
  )

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      const body: any = { supplierProjectId, taskTemplateId: templateId, status }
      if (actualDue) body.actualDue = new Date(actualDue).toISOString()
      const res = await fetch('/api/task-instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!res.ok) throw new Error('Failed to create task instance')
      const created = await res.json()
      onCreated(created)
    } catch (e) {
      console.error(e)
      alert('Could not create task instance. It may already exist for this template.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Task Template</label>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded"
          required
        >
          <option value="" disabled>Select a template</option>
          {availableTemplates.map(t => (
            <option key={t.id} value={t.id}>{t.taskType.name} ({t.taskType.category})</option>
          ))}
        </select>
        {availableTemplates.length === 0 && (
          <p className="text-xs text-gray-500 mt-1">All project templates already have instances for this supplier.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Due Date (optional)</label>
          <input
            type="date"
            value={actualDue}
            onChange={(e) => setActualDue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
          <p className="text-xs text-gray-500 mt-1">Defaults to the template due date.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          >
            <option value="not_started">Not started</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="blocked">Blocked</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded flex items-center gap-2">
          <X className="h-4 w-4" /> Cancel
        </button>
        <button type="submit" disabled={saving || !templateId} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 flex items-center gap-2">
          <Save className="h-4 w-4" /> {saving ? 'Creating...' : 'Create Task'}
        </button>
      </div>
    </form>
  )
}

