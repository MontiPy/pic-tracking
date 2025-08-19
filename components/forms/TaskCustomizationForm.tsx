"use client"

import { useState } from 'react'

type Props = {
  task?: any
  onSave: (data: {
    status?: string
    actualDueDate?: string
    notes?: string
    isApplied?: boolean
    responsibleParties?: any
  }) => void
  onCancel: () => void
  isLoading?: boolean
}

export default function TaskCustomizationForm({ task, onSave, onCancel, isLoading }: Props) {
  const [status, setStatus] = useState<string | undefined>(task?.status)
  const [actualDueDate, setActualDueDate] = useState<string | undefined>(() => {
    const d = task?.actualDueDate || task?.actualDue
    return d ? new Date(d).toISOString().slice(0, 10) : undefined
  })
  const [notes, setNotes] = useState<string | undefined>(task?.notes)
  const [isApplied, setIsApplied] = useState<boolean | undefined>(task?.isApplied)
  const [responsibleRaw, setResponsibleRaw] = useState<string>(
    task?.responsibleParties ? (typeof task.responsibleParties === 'string' ? task.responsibleParties : JSON.stringify(task.responsibleParties, null, 2)) : ''
  )

  const submit = () => {
    let responsibleParties: any = undefined
    if (responsibleRaw && responsibleRaw.trim().length > 0) {
      try {
        responsibleParties = JSON.parse(responsibleRaw)
      } catch {
        // If not valid JSON, send as string
        responsibleParties = responsibleRaw
      }
    }
    onSave({ status, actualDueDate, notes, isApplied, responsibleParties })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-700 mb-1">Status</label>
          <select
            className="w-full border rounded px-2 py-1 text-sm"
            value={status || ''}
            onChange={(e) => setStatus(e.target.value || undefined)}
          >
            <option value="">(no change)</option>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="blocked">Blocked</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-700 mb-1">Actual Due Date (override)</label>
          <input
            type="date"
            className="w-full border rounded px-2 py-1 text-sm"
            value={actualDueDate || ''}
            onChange={(e) => setActualDueDate(e.target.value || undefined)}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-700 mb-1">Notes</label>
        <textarea
          className="w-full border rounded px-2 py-1 text-sm"
          value={notes || ''}
          onChange={(e) => setNotes(e.target.value || undefined)}
          rows={3}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="isApplied"
          type="checkbox"
          className="rounded border-gray-300"
          checked={!!isApplied}
          onChange={(e) => setIsApplied(e.target.checked)}
        />
        <label htmlFor="isApplied" className="text-sm text-gray-700">Applied to Supplier</label>
      </div>

      <div>
        <label className="block text-xs text-gray-700 mb-1">Responsible Parties (JSON or text)</label>
        <textarea
          className="w-full border rounded px-2 py-1 text-sm font-mono"
          placeholder='e.g. {"owner":"Jane Doe","qa":"John"}'
          value={responsibleRaw}
          onChange={(e) => setResponsibleRaw(e.target.value)}
          rows={4}
        />
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 text-sm border rounded">Cancel</button>
        <button
          onClick={submit}
          disabled={isLoading}
          className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}

