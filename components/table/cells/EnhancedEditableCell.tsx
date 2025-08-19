'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { 
  Check, 
  X, 
  Edit, 
  AlertCircle, 
  Loader2,
  History,
  Eye,
  EyeOff,
  Calendar,
  Users,
  Settings,
  Clock,
} from 'lucide-react'
import { useInlineEditing } from '@/hooks/useInlineEditing'
import styles from './InlineCell.module.css'

export type CellType = 'text' | 'textarea' | 'select' | 'date' | 'status' | 'number'

export interface CellOption {
  value: string | number
  label: string
  icon?: React.ReactNode
  color?: string
  disabled?: boolean
}

export interface EnhancedEditableCellProps {
  rowId: string
  columnId: string
  value: any
  type?: CellType
  options?: CellOption[]
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
  onUpdate?: (value: any) => Promise<void>
  onValidate?: (value: any) => Promise<{ isValid: boolean; errors: string[] }>
  
  // Enhanced features
  showHistory?: boolean
  showPreview?: boolean
  enableBatchEdit?: boolean
  enableKeyboardShortcuts?: boolean
  
  // Formatting and validation
  format?: (value: any) => string
  parse?: (input: string) => any
  validation?: {
    required?: boolean
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    custom?: (value: any) => string | null
  }
  
  // Manufacturing-specific
  isManufacturingField?: boolean
  manufacturingType?: 'supplier' | 'task' | 'section' | 'status' | 'due_date'
}

// Status configurations for manufacturing workflow
const STATUS_CONFIGS = {
  not_started: {
    label: 'Not Started',
    color: '#64748b',
    icon: <div className="w-3 h-3 border-2 border-gray-400 rounded-full" />,
  },
  in_progress: {
    label: 'In Progress', 
    color: '#3b82f6',
    icon: <div className="w-3 h-3 bg-blue-500 rounded-full" style={{ 
      background: 'linear-gradient(90deg, #3b82f6 50%, transparent 50%)' 
    }} />,
  },
  submitted: {
    label: 'Submitted',
    color: '#f59e0b',
    icon: <div className="w-3 h-3 bg-amber-500 rounded-full" />,
  },
  approved: {
    label: 'Approved',
    color: '#10b981',
    icon: <div className="w-3 h-3 bg-emerald-500 rounded-full" />,
  },
  blocked: {
    label: 'Blocked',
    color: '#ef4444',
    icon: <div className="w-3 h-3 bg-red-500" style={{ 
      clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' 
    }} />,
  },
}

export default function EnhancedEditableCell({
  rowId,
  columnId,
  value,
  type = 'text',
  options = [],
  placeholder = 'Enter value...',
  required = false,
  disabled = false,
  className = '',
  onUpdate,
  onValidate,
  showHistory = false,
  showPreview = true,
  enableBatchEdit = true,
  enableKeyboardShortcuts = true,
  format,
  parse,
  validation,
  isManufacturingField = false,
  manufacturingType,
}: EnhancedEditableCellProps) {
  
  const {
    startCellEdit,
    updateCellValue,
    commitCellChanges,
    stopCellEdit,
    getCellState,
    isCellEditing,
  } = useInlineEditing([], onUpdate ? async (rowId, columnId, value) => {
    await onUpdate(value)
  } : undefined)

  const [showValidation, setShowValidation] = useState(false)
  const [showHistoryPanel, setShowHistoryPanel] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null)
  
  const cellState = getCellState(rowId, columnId)
  const isEditing = isCellEditing(rowId, columnId)
  const hasChanges = cellState?.hasChanges ?? false
  const isValidating = cellState?.isValidating ?? false
  const validationErrors = cellState?.validationErrors ?? []
  const currentValue = cellState?.currentValue ?? value

  // Format display value based on type and configuration
  const displayValue = useMemo(() => {
    if (!value && value !== 0) return placeholder

    if (format) {
      return format(value)
    }

    switch (type) {
      case 'status':
        if (isManufacturingField && manufacturingType === 'status') {
          return STATUS_CONFIGS[value as keyof typeof STATUS_CONFIGS]?.label || value
        }
        const option = options.find(opt => opt.value === value)
        return option?.label || value
        
      case 'date':
        try {
          return new Date(value).toLocaleDateString()
        } catch {
          return value
        }
        
      case 'select':
        const selectOption = options.find(opt => opt.value === value)
        return selectOption?.label || value
        
      default:
        return value?.toString() || placeholder
    }
  }, [value, type, format, placeholder, options, isManufacturingField, manufacturingType])

  // Enhanced validation
  const validateValue = useCallback(async (val: any) => {
    const errors: string[] = []

    // Basic validation
    if (validation?.required && (!val || val.toString().trim() === '')) {
      errors.push('This field is required')
    }

    if (validation?.minLength && val && val.toString().length < validation.minLength) {
      errors.push(`Must be at least ${validation.minLength} characters`)
    }

    if (validation?.maxLength && val && val.toString().length > validation.maxLength) {
      errors.push(`Must be ${validation.maxLength} characters or less`)
    }

    if (validation?.pattern && val && !validation.pattern.test(val.toString())) {
      errors.push('Invalid format')
    }

    if (validation?.custom) {
      const customError = validation.custom(val)
      if (customError) errors.push(customError)
    }

    // Manufacturing-specific validation
    if (isManufacturingField) {
      if (manufacturingType === 'due_date' && val) {
        const date = new Date(val)
        if (isNaN(date.getTime())) {
          errors.push('Invalid date')
        } else if (date < new Date()) {
          errors.push('Due date cannot be in the past')
        }
      }

      if (manufacturingType === 'status' && val) {
        const validStatuses = Object.keys(STATUS_CONFIGS)
        if (!validStatuses.includes(val)) {
          errors.push('Invalid status')
        }
      }
    }

    // Custom validation function
    if (onValidate) {
      const customValidation = await onValidate(val)
      if (!customValidation.isValid) {
        errors.push(...customValidation.errors)
      }
    }

    return { isValid: errors.length === 0, errors }
  }, [validation, isManufacturingField, manufacturingType, onValidate])

  // Start editing
  const handleStartEdit = useCallback(async () => {
    if (disabled) return
    await startCellEdit(rowId, columnId, value)
    setShowValidation(false)
  }, [disabled, startCellEdit, rowId, columnId, value])

  // Update value during editing
  const handleValueChange = useCallback(async (newValue: any) => {
    let processedValue = newValue

    // Parse value if needed
    if (parse) {
      processedValue = parse(newValue)
    }

    // Type-specific processing
    switch (type) {
      case 'number':
        processedValue = parseFloat(newValue) || 0
        break
      case 'date':
        processedValue = newValue // Keep as string for input
        break
    }

    await updateCellValue(rowId, columnId, processedValue)
  }, [updateCellValue, rowId, columnId, type, parse])

  // Commit changes
  const handleCommit = useCallback(async () => {
    if (!hasChanges) {
      await stopCellEdit(rowId, columnId, false)
      return
    }

    const validation = await validateValue(currentValue)
    if (!validation.isValid) {
      setShowValidation(true)
      return
    }

    await commitCellChanges(rowId, columnId)
  }, [hasChanges, currentValue, validateValue, commitCellChanges, stopCellEdit, rowId, columnId])

  // Cancel editing
  const handleCancel = useCallback(async () => {
    await stopCellEdit(rowId, columnId, false)
    setShowValidation(false)
  }, [stopCellEdit, rowId, columnId])

  // Keyboard shortcuts
  const handleKeyDown = useCallback(async (e: React.KeyboardEvent) => {
    if (!enableKeyboardShortcuts) return

    switch (e.key) {
      case 'Enter':
        if (type !== 'textarea' || e.metaKey || e.ctrlKey) {
          e.preventDefault()
          await handleCommit()
        }
        break
        
      case 'Escape':
        e.preventDefault()
        await handleCancel()
        break
        
      case 's':
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault()
          await handleCommit()
        }
        break

      // Manufacturing workflow shortcuts (when editing status)
      case 'n':
        if (isManufacturingField && manufacturingType === 'status') {
          e.preventDefault()
          await handleValueChange('not_started')
        }
        break
      case 'i':
        if (isManufacturingField && manufacturingType === 'status') {
          e.preventDefault()
          await handleValueChange('in_progress')
        }
        break
      case 'S':
        if (isManufacturingField && manufacturingType === 'status' && e.shiftKey) {
          e.preventDefault()
          await handleValueChange('submitted')
        }
        break
      case 'a':
        if (isManufacturingField && manufacturingType === 'status') {
          e.preventDefault()
          await handleValueChange('approved')
        }
        break
      case 'x':
        if (isManufacturingField && manufacturingType === 'status') {
          e.preventDefault()
          await handleValueChange('blocked')
        }
        break
    }
  }, [
    enableKeyboardShortcuts,
    type,
    handleCommit,
    handleCancel,
    isManufacturingField,
    manufacturingType,
    handleValueChange
  ])

  // Auto-focus when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      if (type === 'text' || type === 'textarea') {
        inputRef.current.select()
      }
    }
  }, [isEditing, type])

  // Render editing interface
  if (isEditing) {
    return (
      <div className={`${styles.cell} ${styles.editing} ${className}`}>
        <div className={styles.cellContent}>
          {type === 'select' ? (
            <select
              ref={inputRef as any}
              value={currentValue || ''}
              onChange={(e) => handleValueChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className={styles.editSelect}
              disabled={isValidating}
            >
              <option value="">{placeholder}</option>
              {options.map(option => (
                <option 
                  key={option.value} 
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </option>
              ))}
            </select>
          ) : type === 'textarea' ? (
            <textarea
              ref={inputRef as any}
              value={currentValue || ''}
              onChange={(e) => handleValueChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className={styles.editTextarea}
              placeholder={placeholder}
              disabled={isValidating}
              rows={3}
            />
          ) : (
            <input
              ref={inputRef as any}
              type={type === 'date' ? 'date' : type === 'number' ? 'number' : 'text'}
              value={currentValue || ''}
              onChange={(e) => handleValueChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className={styles.editInput}
              placeholder={placeholder}
              disabled={isValidating}
            />
          )}
          
          <div className={styles.editActions}>
            {isValidating ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <>
                <button
                  onClick={handleCommit}
                  className={`${styles.editButton} ${styles.save}`}
                  title="Save changes (Enter or ⌘S)"
                  disabled={validationErrors.length > 0}
                >
                  <Check size={12} />
                </button>
                <button
                  onClick={handleCancel}
                  className={`${styles.editButton} ${styles.cancel}`}
                  title="Cancel changes (Esc)"
                >
                  <X size={12} />
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Validation feedback */}
        {(showValidation || validationErrors.length > 0) && (
          <div className={styles.validation}>
            <AlertCircle size={12} />
            <span>{validationErrors[0] || 'Validation error'}</span>
          </div>
        )}

        {/* Keyboard shortcuts hint for manufacturing fields */}
        {isManufacturingField && manufacturingType === 'status' && (
          <div className={styles.shortcutHints}>
            <span>N</span>Not Started • <span>I</span>In Progress • <span>S</span>Submitted • <span>A</span>Approved • <span>X</span>Blocked
          </div>
        )}
        
        {/* Change indicator */}
        {hasChanges && (
          <div className={styles.changeIndicator} title="Unsaved changes" />
        )}
      </div>
    )
  }

  // Render display mode
  return (
    <div className={`${styles.cell} ${hasChanges ? styles.hasChanges : ''} ${className}`}>
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
        {/* Status with icon for manufacturing fields */}
        {isManufacturingField && manufacturingType === 'status' && value && (
          <div className={styles.statusDisplay}>
            {STATUS_CONFIGS[value as keyof typeof STATUS_CONFIGS]?.icon}
            <span>{displayValue}</span>
          </div>
        )}
        
        {/* Regular display */}
        {(!isManufacturingField || manufacturingType !== 'status') && (
          <span 
            className={`${styles.displayValue} ${!value && value !== 0 ? styles.placeholder : ''}`}
          >
            {displayValue}
          </span>
        )}

        {/* Edit indicator */}
        {!disabled && (
          <Edit size={12} className={styles.editIcon} />
        )}

        {/* History indicator */}
        {showHistory && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowHistoryPanel(!showHistoryPanel)
            }}
            className={styles.historyButton}
            title="View edit history"
          >
            <History size={12} />
          </button>
        )}
      </div>

      {/* Change indicator for unsaved changes */}
      {hasChanges && (
        <div className={styles.changeIndicator} title="Unsaved changes" />
      )}
    </div>
  )
}