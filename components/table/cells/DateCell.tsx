'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { format, isToday, isPast, isFuture, parseISO, isValid } from 'date-fns'
import { Calendar, Clock, AlertTriangle, Check, X } from 'lucide-react'
import styles from './InlineCell.module.css'

export interface DateCellProps {
  value: string | null
  onSave: (value: string | null) => Promise<void>
  placeholder?: string
  required?: boolean
  className?: string
  disabled?: boolean
  showTime?: boolean
  minDate?: string
  maxDate?: string
}

export default function DateCell({
  value,
  onSave,
  placeholder = 'Select date...',
  required = false,
  className = '',
  disabled = false,
  showTime = false,
  minDate,
  maxDate,
}: DateCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (value) {
      const date = parseISO(value)
      if (isValid(date)) {
        // Format for input[type="datetime-local" | "date"]
        const formatString = showTime ? "yyyy-MM-dd'T'HH:mm" : 'yyyy-MM-dd'
        setEditValue(format(date, formatString))
      } else {
        setEditValue('')
      }
    } else {
      setEditValue('')
    }
  }, [value, showTime])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  const getDateStatus = useCallback((dateStr: string | null) => {
    if (!dateStr) return null
    
    const date = parseISO(dateStr)
    if (!isValid(date)) return null

    if (isToday(date)) return 'today'
    if (isPast(date)) return 'overdue'
    if (isFuture(date)) return 'upcoming'
    return null
  }, [])

  const formatDisplayDate = useCallback((dateStr: string | null) => {
    if (!dateStr) return placeholder

    const date = parseISO(dateStr)
    if (!isValid(date)) return 'Invalid date'

    if (showTime) {
      return format(date, 'MMM d, yyyy h:mm a')
    }
    return format(date, 'MMM d, yyyy')
  }, [placeholder, showTime])

  const validateDate = useCallback((dateStr: string) => {
    if (!dateStr && required) {
      return 'Date is required'
    }
    
    if (!dateStr) return null

    const date = parseISO(dateStr)
    if (!isValid(date)) {
      return 'Invalid date format'
    }

    if (minDate) {
      const min = parseISO(minDate)
      if (isValid(min) && date < min) {
        return `Date must be after ${format(min, 'MMM d, yyyy')}`
      }
    }

    if (maxDate) {
      const max = parseISO(maxDate)
      if (isValid(max) && date > max) {
        return `Date must be before ${format(max, 'MMM d, yyyy')}`
      }
    }

    return null
  }, [required, minDate, maxDate])

  const handleStartEdit = useCallback(() => {
    if (disabled) return
    setIsEditing(true)
    setError(null)
  }, [disabled])

  const handleCancel = useCallback(() => {
    setIsEditing(false)
    setError(null)
    // Reset to original value
    if (value) {
      const date = parseISO(value)
      if (isValid(date)) {
        const formatString = showTime ? "yyyy-MM-dd'T'HH:mm" : 'yyyy-MM-dd'
        setEditValue(format(date, formatString))
      }
    } else {
      setEditValue('')
    }
  }, [value, showTime])

  const handleSave = useCallback(async () => {
    let processedValue: string | null = null
    
    if (editValue) {
      // Convert input value to ISO string
      const date = new Date(editValue)
      if (isValid(date)) {
        processedValue = date.toISOString()
      }
      
      const validationError = validateDate(processedValue || '')
      if (validationError) {
        setError(validationError)
        return
      }
    } else if (required) {
      setError('Date is required')
      return
    }

    if (processedValue === value) {
      setIsEditing(false)
      return
    }

    try {
      setIsSaving(true)
      setError(null)
      await onSave(processedValue)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save date')
    } finally {
      setIsSaving(false)
    }
  }, [editValue, value, onSave, validateDate, required])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }, [handleSave, handleCancel])

  const dateStatus = getDateStatus(value)
  const displayValue = formatDisplayDate(value)

  if (isEditing) {
    const inputType = showTime ? 'datetime-local' : 'date'
    const minInput = minDate ? format(parseISO(minDate), showTime ? "yyyy-MM-dd'T'HH:mm" : 'yyyy-MM-dd') : undefined
    const maxInput = maxDate ? format(parseISO(maxDate), showTime ? "yyyy-MM-dd'T'HH:mm" : 'yyyy-MM-dd') : undefined

    return (
      <div className={`${styles.cell} ${styles.editing} ${className}`}>
        <div className={styles.cellContent}>
          <input
            ref={inputRef}
            type={inputType}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`${styles.editInput} ${styles.dateInput}`}
            disabled={isSaving}
            min={minInput}
            max={maxInput}
          />
          
          <div className={styles.editActions}>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`${styles.editButton} ${styles.save}`}
              title="Save changes (Enter)"
            >
              <Check size={12} />
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className={`${styles.editButton} ${styles.cancel}`}
              title="Cancel changes (Esc)"
            >
              <X size={12} />
            </button>
          </div>
        </div>
        
        {error && (
          <div className={styles.validation}>
            {error}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`${styles.cell} ${className}`}>
      <div 
        className={`${styles.cellContent} ${!disabled ? styles.editTrigger : ''}`}
        onClick={handleStartEdit}
        role={disabled ? undefined : "button"}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleStartEdit()
          }
        }}
        aria-label={`${displayValue}${disabled ? '' : '. Click to edit'}`}
      >
        <div className={styles.dateCell}>
          {dateStatus === 'overdue' && <AlertTriangle className={styles.statusIcon} />}
          {dateStatus === 'today' && <Clock className={styles.statusIcon} />}
          {(dateStatus === 'upcoming' || !dateStatus) && <Calendar className={styles.statusIcon} />}
          
          <span 
            className={`${styles.dateValue} ${
              dateStatus ? styles[dateStatus] : ''
            } ${!value ? 'opacity-50 italic' : ''}`}
          >
            {displayValue}
          </span>
        </div>
      </div>
    </div>
  )
}