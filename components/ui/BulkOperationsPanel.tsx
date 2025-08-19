'use client'

import { useState, useCallback, useMemo } from 'react'
import { 
  Check, 
  X, 
  Edit, 
  Calendar, 
  Users, 
  Tag, 
  AlertTriangle,
  Clock,
  ArrowRight,
  Download,
  Upload,
  Settings,
  ChevronRight,
  Info,
  Plus,
  Minus,
} from 'lucide-react'
import { useAppStore } from '@/stores/useAppStore'
import styles from './BulkOperationsPanel.module.css'

export interface BulkOperation {
  id: string
  type: 'status_change' | 'date_shift' | 'assign_owner' | 'update_field' | 'export' | 'delete'
  title: string
  description: string
  icon: React.ReactNode
  requiresValue?: boolean
  valueType?: 'text' | 'select' | 'date' | 'number'
  options?: Array<{ value: string; label: string }>
  confirmationRequired?: boolean
  dangerousAction?: boolean
}

interface BulkOperationsPanelProps {
  selectedItems: any[]
  onExecute: (operation: BulkOperation, value?: any) => Promise<void>
  onClose: () => void
  isOpen: boolean
}

const MANUFACTURING_OPERATIONS: BulkOperation[] = [
  // Status Operations
  {
    id: 'status_not_started',
    type: 'status_change',
    title: 'Mark as Not Started',
    description: 'Set selected tasks to not started status',
    icon: <div className={styles.statusIcon} style={{ backgroundColor: '#64748b' }} />,
    requiresValue: false,
  },
  {
    id: 'status_in_progress',
    type: 'status_change', 
    title: 'Mark as In Progress',
    description: 'Set selected tasks to in progress status',
    icon: <div className={styles.statusIcon} style={{ 
      background: 'linear-gradient(90deg, #3b82f6 50%, transparent 50%)' 
    }} />,
    requiresValue: false,
  },
  {
    id: 'status_submitted',
    type: 'status_change',
    title: 'Mark as Submitted',
    description: 'Set selected tasks to submitted status',
    icon: <div className={styles.statusIcon} style={{ backgroundColor: '#f59e0b' }} />,
    requiresValue: false,
  },
  {
    id: 'status_approved',
    type: 'status_change',
    title: 'Mark as Approved',
    description: 'Set selected tasks to approved status',
    icon: <div className={styles.statusIcon} style={{ backgroundColor: '#10b981' }} />,
    requiresValue: false,
  },
  {
    id: 'status_blocked',
    type: 'status_change',
    title: 'Mark as Blocked',
    description: 'Set selected tasks to blocked status',
    icon: <div className={`${styles.statusIcon} ${styles.triangleIcon}`} style={{ 
      backgroundColor: '#ef4444' 
    }} />,
    requiresValue: false,
  },

  // Date Operations
  {
    id: 'shift_dates_forward',
    type: 'date_shift',
    title: 'Shift Dates Forward',
    description: 'Move due dates forward by specified days',
    icon: <Calendar />,
    requiresValue: true,
    valueType: 'number',
  },
  {
    id: 'shift_dates_backward',
    type: 'date_shift',
    title: 'Shift Dates Backward', 
    description: 'Move due dates backward by specified days',
    icon: <Calendar />,
    requiresValue: true,
    valueType: 'number',
  },
  {
    id: 'set_specific_date',
    type: 'date_shift',
    title: 'Set Specific Due Date',
    description: 'Set all selected tasks to specific date',
    icon: <Calendar />,
    requiresValue: true,
    valueType: 'date',
  },

  // Assignment Operations
  {
    id: 'assign_owner',
    type: 'assign_owner',
    title: 'Assign Owner',
    description: 'Assign selected tasks to a specific person',
    icon: <Users />,
    requiresValue: true,
    valueType: 'select',
    // Options would be populated with actual users
  },
  {
    id: 'unassign_owner',
    type: 'assign_owner',
    title: 'Remove Owner',
    description: 'Remove owner assignment from selected tasks',
    icon: <Users />,
    requiresValue: false,
  },

  // Field Updates
  {
    id: 'update_section',
    type: 'update_field',
    title: 'Change Section',
    description: 'Move tasks to different manufacturing section',
    icon: <Tag />,
    requiresValue: true,
    valueType: 'select',
    options: [
      { value: 'Part Approval', label: 'Part Approval' },
      { value: 'NMR', label: 'New Model Release' },
      { value: 'New Model Builds', label: 'New Model Builds' },
      { value: 'General', label: 'General' },
      { value: 'Production Readiness', label: 'Production Readiness' },
    ],
  },
  {
    id: 'add_notes',
    type: 'update_field',
    title: 'Add Notes',
    description: 'Add notes to selected tasks',
    icon: <Edit />,
    requiresValue: true,
    valueType: 'text',
  },

  // Export/Import Operations  
  {
    id: 'export_selected',
    type: 'export',
    title: 'Export Selected',
    description: 'Export selected tasks to CSV/Excel',
    icon: <Download />,
    requiresValue: false,
  },

  // Dangerous Operations
  {
    id: 'delete_selected',
    type: 'delete',
    title: 'Delete Selected',
    description: 'Permanently delete selected tasks',
    icon: <X />,
    requiresValue: false,
    confirmationRequired: true,
    dangerousAction: true,
  },
]

export default function BulkOperationsPanel({ 
  selectedItems, 
  onExecute, 
  onClose, 
  isOpen 
}: BulkOperationsPanelProps) {
  const [selectedOperation, setSelectedOperation] = useState<BulkOperation | null>(null)
  const [operationValue, setOperationValue] = useState<any>('')
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)

  const { clearSelection } = useAppStore()

  // Filter operations based on selected items
  const availableOperations = useMemo(() => {
    if (selectedItems.length === 0) return []
    
    return MANUFACTURING_OPERATIONS.filter(operation => {
      // All operations available for now - could add logic to filter based on item types
      return true
    })
  }, [selectedItems])

  // Generate preview of changes
  const operationPreview = useMemo(() => {
    if (!selectedOperation || !selectedItems.length) return null

    const preview = []
    
    switch (selectedOperation.type) {
      case 'status_change':
        const newStatus = selectedOperation.id.split('_')[1] // Extract status from operation id
        preview.push(`${selectedItems.length} tasks will be marked as ${newStatus}`)
        break
        
      case 'date_shift':
        if (selectedOperation.id === 'shift_dates_forward') {
          preview.push(`${selectedItems.length} tasks will have due dates moved forward by ${operationValue} days`)
        } else if (selectedOperation.id === 'shift_dates_backward') {
          preview.push(`${selectedItems.length} tasks will have due dates moved backward by ${operationValue} days`)
        } else if (selectedOperation.id === 'set_specific_date') {
          preview.push(`${selectedItems.length} tasks will have due date set to ${operationValue}`)
        }
        break
        
      case 'assign_owner':
        if (selectedOperation.id === 'assign_owner') {
          preview.push(`${selectedItems.length} tasks will be assigned to ${operationValue}`)
        } else {
          preview.push(`${selectedItems.length} tasks will have their owner removed`)
        }
        break
        
      case 'update_field':
        preview.push(`${selectedItems.length} tasks will be updated`)
        break
        
      case 'delete':
        preview.push(`${selectedItems.length} tasks will be permanently deleted`)
        preview.push('⚠️ This action cannot be undone')
        break
    }
    
    return preview
  }, [selectedOperation, operationValue, selectedItems])

  const handleOperationSelect = useCallback((operation: BulkOperation) => {
    setSelectedOperation(operation)
    setOperationValue('')
    setPreviewMode(false)
  }, [])

  const handleExecute = useCallback(async () => {
    if (!selectedOperation) return

    if (selectedOperation.confirmationRequired && !showConfirmation) {
      setShowConfirmation(true)
      return
    }

    setIsExecuting(true)
    
    try {
      await onExecute(selectedOperation, operationValue)
      onClose()
      clearSelection()
    } catch (error) {
      console.error('Bulk operation failed:', error)
      // Could show error toast here
    } finally {
      setIsExecuting(false)
      setShowConfirmation(false)
    }
  }, [selectedOperation, operationValue, showConfirmation, onExecute, onClose, clearSelection])

  const handleCancel = useCallback(() => {
    setSelectedOperation(null)
    setOperationValue('')
    setShowConfirmation(false)
    setPreviewMode(false)
  }, [])

  if (!isOpen || selectedItems.length === 0) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <Settings size={20} />
            <div>
              <h3 className={styles.title}>Bulk Operations</h3>
              <p className={styles.subtitle}>
                {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close bulk operations panel"
          >
            <X size={20} />
          </button>
        </div>

        {/* Operation Selection */}
        {!selectedOperation && (
          <div className={styles.operationGrid}>
            <div className={styles.sectionHeader}>
              <AlertTriangle size={16} />
              Status Changes
            </div>
            {availableOperations
              .filter(op => op.type === 'status_change')
              .map(operation => (
                <button
                  key={operation.id}
                  onClick={() => handleOperationSelect(operation)}
                  className={`${styles.operationButton} ${operation.dangerousAction ? styles.dangerous : ''}`}
                >
                  <div className={styles.operationIcon}>
                    {operation.icon}
                  </div>
                  <div className={styles.operationContent}>
                    <div className={styles.operationTitle}>{operation.title}</div>
                    <div className={styles.operationDescription}>{operation.description}</div>
                  </div>
                  <ChevronRight size={16} />
                </button>
              ))}

            <div className={styles.sectionHeader}>
              <Calendar size={16} />
              Date Operations
            </div>
            {availableOperations
              .filter(op => op.type === 'date_shift')
              .map(operation => (
                <button
                  key={operation.id}
                  onClick={() => handleOperationSelect(operation)}
                  className={styles.operationButton}
                >
                  <div className={styles.operationIcon}>
                    {operation.icon}
                  </div>
                  <div className={styles.operationContent}>
                    <div className={styles.operationTitle}>{operation.title}</div>
                    <div className={styles.operationDescription}>{operation.description}</div>
                  </div>
                  <ChevronRight size={16} />
                </button>
              ))}

            <div className={styles.sectionHeader}>
              <Users size={16} />
              Assignment & Updates
            </div>
            {availableOperations
              .filter(op => ['assign_owner', 'update_field'].includes(op.type))
              .map(operation => (
                <button
                  key={operation.id}
                  onClick={() => handleOperationSelect(operation)}
                  className={styles.operationButton}
                >
                  <div className={styles.operationIcon}>
                    {operation.icon}
                  </div>
                  <div className={styles.operationContent}>
                    <div className={styles.operationTitle}>{operation.title}</div>
                    <div className={styles.operationDescription}>{operation.description}</div>
                  </div>
                  <ChevronRight size={16} />
                </button>
              ))}

            <div className={styles.sectionHeader}>
              <Download size={16} />
              Other Operations
            </div>
            {availableOperations
              .filter(op => ['export', 'delete'].includes(op.type))
              .map(operation => (
                <button
                  key={operation.id}
                  onClick={() => handleOperationSelect(operation)}
                  className={`${styles.operationButton} ${operation.dangerousAction ? styles.dangerous : ''}`}
                >
                  <div className={styles.operationIcon}>
                    {operation.icon}
                  </div>
                  <div className={styles.operationContent}>
                    <div className={styles.operationTitle}>{operation.title}</div>
                    <div className={styles.operationDescription}>{operation.description}</div>
                  </div>
                  <ChevronRight size={16} />
                </button>
              ))}
          </div>
        )}

        {/* Operation Configuration */}
        {selectedOperation && !showConfirmation && (
          <div className={styles.configurationPanel}>
            <div className={styles.operationHeader}>
              <div className={styles.operationIcon}>
                {selectedOperation.icon}
              </div>
              <div>
                <h4 className={styles.operationTitle}>{selectedOperation.title}</h4>
                <p className={styles.operationDescription}>{selectedOperation.description}</p>
              </div>
            </div>

            {/* Value Input */}
            {selectedOperation.requiresValue && (
              <div className={styles.valueInput}>
                <label className={styles.inputLabel}>
                  {selectedOperation.valueType === 'number' ? 'Number of Days' :
                   selectedOperation.valueType === 'date' ? 'Date' :
                   selectedOperation.valueType === 'select' ? 'Selection' : 'Value'}
                </label>
                
                {selectedOperation.valueType === 'select' ? (
                  <select
                    value={operationValue}
                    onChange={(e) => setOperationValue(e.target.value)}
                    className={styles.select}
                  >
                    <option value="">Select option...</option>
                    {selectedOperation.options?.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : selectedOperation.valueType === 'date' ? (
                  <input
                    type="date"
                    value={operationValue}
                    onChange={(e) => setOperationValue(e.target.value)}
                    className={styles.input}
                  />
                ) : selectedOperation.valueType === 'number' ? (
                  <input
                    type="number"
                    value={operationValue}
                    onChange={(e) => setOperationValue(e.target.value)}
                    className={styles.input}
                    min="1"
                    max="365"
                    placeholder="Enter number of days"
                  />
                ) : (
                  <textarea
                    value={operationValue}
                    onChange={(e) => setOperationValue(e.target.value)}
                    className={styles.textarea}
                    placeholder="Enter value..."
                    rows={3}
                  />
                )}
              </div>
            )}

            {/* Preview */}
            {operationPreview && (
              <div className={`${styles.preview} ${selectedOperation.dangerousAction ? styles.dangerousPreview : ''}`}>
                <div className={styles.previewHeader}>
                  <Info size={16} />
                  <span>Preview Changes</span>
                </div>
                <ul className={styles.previewList}>
                  {operationPreview.map((item, index) => (
                    <li key={index} className={styles.previewItem}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className={styles.actions}>
              <button
                onClick={handleCancel}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={handleExecute}
                disabled={selectedOperation.requiresValue && !operationValue}
                className={`${styles.executeButton} ${selectedOperation.dangerousAction ? styles.dangerous : ''}`}
              >
                {selectedOperation.confirmationRequired ? 'Continue' : 'Execute'}
              </button>
            </div>
          </div>
        )}

        {/* Confirmation Dialog */}
        {selectedOperation && showConfirmation && (
          <div className={styles.confirmationPanel}>
            <div className={styles.confirmationIcon}>
              <AlertTriangle size={32} />
            </div>
            <h4 className={styles.confirmationTitle}>Confirm Action</h4>
            <p className={styles.confirmationMessage}>
              Are you sure you want to {selectedOperation.title.toLowerCase()}? 
              {selectedOperation.dangerousAction && ' This action cannot be undone.'}
            </p>
            
            {operationPreview && (
              <div className={styles.confirmationPreview}>
                {operationPreview.map((item, index) => (
                  <div key={index}>{item}</div>
                ))}
              </div>
            )}

            <div className={styles.confirmationActions}>
              <button
                onClick={() => setShowConfirmation(false)}
                className={styles.cancelButton}
                disabled={isExecuting}
              >
                Cancel
              </button>
              <button
                onClick={handleExecute}
                className={`${styles.executeButton} ${styles.dangerous}`}
                disabled={isExecuting}
              >
                {isExecuting ? (
                  <>
                    <div className={styles.spinner} />
                    Executing...
                  </>
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}