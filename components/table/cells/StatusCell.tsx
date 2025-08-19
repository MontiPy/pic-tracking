'use client'

import { useState, useCallback } from 'react'
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Circle, 
  XCircle, 
  Pause,
  ChevronDown 
} from 'lucide-react'
import styles from './InlineCell.module.css'

export type TaskStatus = 'not_started' | 'in_progress' | 'submitted' | 'approved' | 'blocked' | 'cancelled'

export interface StatusCellProps {
  value: TaskStatus
  onSave: (value: TaskStatus) => Promise<void>
  disabled?: boolean
  className?: string
}

const statusConfig = {
  not_started: {
    label: 'Not Started',
    icon: Circle,
    className: 'notStarted',
    color: '#64748b'
  },
  in_progress: {
    label: 'In Progress',
    icon: Clock,
    className: 'inProgress',
    color: '#3b82f6'
  },
  submitted: {
    label: 'Submitted',
    icon: AlertTriangle,
    className: 'submitted',
    color: '#f59e0b'
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle,
    className: 'approved',
    color: '#10b981'
  },
  blocked: {
    label: 'Blocked',
    icon: XCircle,
    className: 'blocked',
    color: '#ef4444'
  },
  cancelled: {
    label: 'Cancelled',
    icon: Pause,
    className: 'cancelled',
    color: '#6b7280'
  },
} as const

const statusOrder: TaskStatus[] = ['not_started', 'in_progress', 'submitted', 'approved', 'blocked', 'cancelled']

export default function StatusCell({
  value,
  onSave,
  disabled = false,
  className = '',
}: StatusCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const currentStatus = statusConfig[value] || statusConfig.not_started
  const CurrentIcon = currentStatus.icon

  const handleStatusChange = useCallback(async (newStatus: TaskStatus) => {
    if (newStatus === value || disabled || isSaving) return

    try {
      setIsSaving(true)
      await onSave(newStatus)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update status:', error)
      // TODO: Show error toast
    } finally {
      setIsSaving(false)
    }
  }, [value, onSave, disabled, isSaving])

  const handleClick = useCallback(() => {
    if (disabled) return
    setIsEditing(!isEditing)
  }, [disabled, isEditing])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsEditing(false)
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const currentIndex = statusOrder.indexOf(value)
      let newIndex
      
      if (e.key === 'ArrowDown') {
        newIndex = (currentIndex + 1) % statusOrder.length
      } else {
        newIndex = currentIndex === 0 ? statusOrder.length - 1 : currentIndex - 1
      }
      
      handleStatusChange(statusOrder[newIndex])
    }
  }, [handleClick, value, handleStatusChange])

  if (isEditing && !disabled) {
    return (
      <div className={`${styles.cell} ${styles.editing} ${className}`}>
        <div className={styles.cellContent}>
          <select
            value={value}
            onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
            className={styles.editSelect}
            autoFocus
            disabled={isSaving}
          >
            {statusOrder.map((status) => {
              const config = statusConfig[status]
              return (
                <option key={status} value={status}>
                  {config.label}
                </option>
              )
            })}
          </select>
        </div>
      </div>
    )
  }

  return (
    <div className={`${styles.cell} ${className}`}>
      <div 
        className={`${styles.cellContent} ${!disabled ? styles.editTrigger : ''}`}
        onClick={handleClick}
        role={disabled ? undefined : "button"}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        aria-label={`Status: ${currentStatus.label}${disabled ? '' : '. Click to change'}`}
      >
        <div className={styles.statusCell}>
          <span className={`${styles.statusBadge} ${styles[currentStatus.className]}`}>
            <CurrentIcon className={styles.statusIcon} />
            {currentStatus.label}
          </span>
          {!disabled && (
            <ChevronDown size={12} className="opacity-50" />
          )}
        </div>
      </div>
    </div>
  )
}