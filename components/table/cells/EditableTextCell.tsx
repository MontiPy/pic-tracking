'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Check, X, Edit } from 'lucide-react'
import styles from './InlineCell.module.css'

export interface EditableTextCellProps {
  value: string
  onSave: (value: string) => Promise<void>
  placeholder?: string
  multiline?: boolean
  maxLength?: number
  required?: boolean
  pattern?: string
  className?: string
  disabled?: boolean
  autoFocus?: boolean
}

export default function EditableTextCell({
  value,
  onSave,
  placeholder = 'Enter text...',
  multiline = false,
  maxLength,
  required = false,
  pattern,
  className = '',
  disabled = false,
  autoFocus = false,
}: EditableTextCellProps) {
  const [isEditing, setIsEditing] = useState(autoFocus)
  const [editValue, setEditValue] = useState(value)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    setEditValue(value)
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleStartEdit = useCallback(() => {
    if (disabled) return
    setIsEditing(true)
    setError(null)
  }, [disabled])

  const handleCancel = useCallback(() => {
    setIsEditing(false)
    setEditValue(value)
    setError(null)
  }, [value])

  const validateValue = useCallback((val: string) => {
    if (required && !val.trim()) {
      return 'This field is required'
    }
    
    if (maxLength && val.length > maxLength) {
      return `Must be ${maxLength} characters or less`
    }
    
    if (pattern && val && !new RegExp(pattern).test(val)) {
      return 'Invalid format'
    }
    
    return null
  }, [required, maxLength, pattern])

  const handleSave = useCallback(async () => {
    const trimmedValue = editValue.trim()
    const validationError = validateValue(trimmedValue)
    
    if (validationError) {
      setError(validationError)
      return
    }

    if (trimmedValue === value) {
      setIsEditing(false)
      return
    }

    try {
      setIsSaving(true)
      setError(null)
      await onSave(trimmedValue)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }, [editValue, value, onSave, validateValue])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Enter' && e.metaKey) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }, [handleSave, handleCancel, multiline])

  const displayValue = value || placeholder

  if (isEditing) {
    const InputComponent = multiline ? 'textarea' : 'input'
    
    return (
      <div className={`${styles.cell} ${styles.editing} ${className}`}>
        <div className={styles.cellContent}>
          <InputComponent
            ref={inputRef as any}
            type={multiline ? undefined : 'text'}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={multiline ? styles.editTextarea : styles.editInput}
            placeholder={placeholder}
            maxLength={maxLength}
            disabled={isSaving}
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
        
        {!error && (
          <div className={styles.keyboardHint}>
            {multiline ? '⌘↵' : '↵'}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`${styles.cell} ${className}`}>
      <div 
        className={`${styles.cellContent} ${styles.editTrigger}`}
        onClick={handleStartEdit}
        onDoubleClick={handleStartEdit}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleStartEdit()
          }
        }}
        aria-label={`${displayValue}. Click to edit`}
      >
        <span 
          className={`${styles.displayValue} ${!value ? 'opacity-50' : ''}`}
          style={{
            fontStyle: !value ? 'italic' : 'normal'
          }}
        >
          {displayValue}
        </span>
        {!disabled && (
          <Edit size={12} className="opacity-0 group-hover:opacity-50 transition-opacity" />
        )}
      </div>
    </div>
  )
}