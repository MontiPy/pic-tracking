'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useTableStore } from '@/stores/useTableStore'

export interface EditingCell {
  rowId: string
  columnId: string
  originalValue: any
  currentValue: any
  hasChanges: boolean
  isValidating: boolean
  validationErrors: string[]
}

export interface BatchEditOperation {
  id: string
  rowIds: string[]
  columnId: string
  newValue: any
  originalValues: Record<string, any>
  description: string
  timestamp: number
}

export interface EditingState {
  activeCells: Map<string, EditingCell>
  batchOperations: BatchEditOperation[]
  isInBatchMode: boolean
  selectedCells: Set<string>
  editHistory: EditingCell[]
  validationResults: Record<string, { isValid: boolean; errors: string[] }>
}

export interface InlineEditingOptions {
  enableBatchEdit?: boolean
  enableOptimisticUpdates?: boolean
  enableValidation?: boolean
  enableUndoRedo?: boolean
  autoCommitDelay?: number
  maxHistorySize?: number
}

const defaultOptions: InlineEditingOptions = {
  enableBatchEdit: true,
  enableOptimisticUpdates: true,
  enableValidation: true,
  enableUndoRedo: true,
  autoCommitDelay: 2000,
  maxHistorySize: 50,
}

export const useInlineEditing = (
  data: any[],
  onCellUpdate?: (rowId: string, columnId: string, value: any) => Promise<void>,
  onBatchUpdate?: (operations: BatchEditOperation[]) => Promise<void>,
  options: InlineEditingOptions = {}
) => {
  const opts = { ...defaultOptions, ...options }
  
  const {
    editingCells,
    editingRows,
    pendingChanges,
    optimisticUpdates,
    startCellEdit,
    stopCellEdit,
    startRowEdit,
    stopRowEdit,
    updatePendingChange,
    commitPendingChanges,
    discardPendingChanges,
    setOptimisticUpdate,
    clearOptimisticUpdates,
  } = useTableStore()

  const [editingState, setEditingState] = useState<EditingState>({
    activeCells: new Map(),
    batchOperations: [],
    isInBatchMode: false,
    selectedCells: new Set(),
    editHistory: [],
    validationResults: {},
  })

  const autoCommitTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const undoStack = useRef<EditingCell[]>([])
  const redoStack = useRef<EditingCell[]>([])

  // Validation functions
  const validateCell = useCallback(async (
    rowId: string, 
    columnId: string, 
    value: any
  ): Promise<{ isValid: boolean; errors: string[] }> => {
    const errors: string[] = []
    
    // Basic validation rules (can be extended)
    if (columnId === 'effectiveDue') {
      if (!value) {
        errors.push('Due date is required')
      } else {
        const date = new Date(value)
        if (isNaN(date.getTime())) {
          errors.push('Invalid date format')
        } else if (date < new Date()) {
          errors.push('Due date cannot be in the past')
        }
      }
    }
    
    if (columnId === 'status') {
      const validStatuses = ['not_started', 'in_progress', 'submitted', 'approved', 'blocked']
      if (!validStatuses.includes(value)) {
        errors.push('Invalid status value')
      }
    }
    
    // Manufacturing-specific validations
    if (columnId === 'supplier' && !value?.trim()) {
      errors.push('Supplier name is required')
    }
    
    if (columnId === 'task' && !value?.trim()) {
      errors.push('Task name is required')
    }

    return { isValid: errors.length === 0, errors }
  }, [])

  // Enhanced cell editing functions
  const startEnhancedCellEdit = useCallback(async (
    rowId: string, 
    columnId: string,
    initialValue?: any
  ) => {
    const cellId = `${rowId}_${columnId}`
    const currentValue = initialValue ?? getActiveRowData(rowId)?.[columnId]
    
    // Create editing cell state
    const editingCell: EditingCell = {
      rowId,
      columnId,
      originalValue: currentValue,
      currentValue,
      hasChanges: false,
      isValidating: false,
      validationErrors: [],
    }

    // Update state
    setEditingState(prev => {
      const newActiveCells = new Map(prev.activeCells)
      newActiveCells.set(cellId, editingCell)
      return {
        ...prev,
        activeCells: newActiveCells,
      }
    })

    // Start table store editing
    startCellEdit(rowId, columnId)
  }, [startCellEdit])

  const updateCellValue = useCallback(async (
    rowId: string, 
    columnId: string, 
    value: any,
    shouldValidate = true
  ) => {
    const cellId = `${rowId}_${columnId}`
    
    setEditingState(prev => {
      const newActiveCells = new Map(prev.activeCells)
      const existingCell = newActiveCells.get(cellId)
      
      if (existingCell) {
        const updatedCell: EditingCell = {
          ...existingCell,
          currentValue: value,
          hasChanges: value !== existingCell.originalValue,
          isValidating: shouldValidate,
        }
        newActiveCells.set(cellId, updatedCell)
      }
      
      return {
        ...prev,
        activeCells: newActiveCells,
      }
    })

    // Update pending changes in table store
    updatePendingChange(rowId, columnId, value)

    // Set optimistic update if enabled
    if (opts.enableOptimisticUpdates) {
      setOptimisticUpdate(rowId, columnId, value)
    }

    // Validate if enabled
    if (shouldValidate && opts.enableValidation) {
      const validation = await validateCell(rowId, columnId, value)
      
      setEditingState(prev => {
        const newActiveCells = new Map(prev.activeCells)
        const cell = newActiveCells.get(cellId)
        if (cell) {
          cell.isValidating = false
          cell.validationErrors = validation.errors
          newActiveCells.set(cellId, cell)
        }
        
        return {
          ...prev,
          activeCells: newActiveCells,
          validationResults: {
            ...prev.validationResults,
            [cellId]: validation,
          },
        }
      })
    }

    // Set up auto-commit timer
    if (opts.autoCommitDelay && opts.autoCommitDelay > 0) {
      const timeoutKey = cellId
      const existingTimeout = autoCommitTimeouts.current.get(timeoutKey)
      if (existingTimeout) {
        clearTimeout(existingTimeout)
      }
      
      const timeout = setTimeout(async () => {
        await commitCellChanges(rowId, columnId)
      }, opts.autoCommitDelay)
      
      autoCommitTimeouts.current.set(timeoutKey, timeout)
    }
  }, [
    updatePendingChange,
    setOptimisticUpdate,
    validateCell,
    opts.enableOptimisticUpdates,
    opts.enableValidation,
    opts.autoCommitDelay
  ])

  const commitCellChanges = useCallback(async (
    rowId: string, 
    columnId: string
  ) => {
    const cellId = `${rowId}_${columnId}`
    const cell = editingState.activeCells.get(cellId)
    
    if (!cell || !cell.hasChanges) return

    // Check validation
    const validation = editingState.validationResults[cellId]
    if (opts.enableValidation && validation && !validation.isValid) {
      console.warn('Cannot commit cell with validation errors:', validation.errors)
      return
    }

    try {
      // Call update handler
      if (onCellUpdate) {
        await onCellUpdate(rowId, columnId, cell.currentValue)
      }

      // Commit to table store
      await commitPendingChanges(rowId)

      // Add to history for undo/redo
      if (opts.enableUndoRedo) {
        undoStack.current.push({ ...cell })
        redoStack.current = [] // Clear redo stack on new action
        
        // Limit history size
        if (undoStack.current.length > opts.maxHistorySize!) {
          undoStack.current.shift()
        }
      }

      // Update editing history
      setEditingState(prev => ({
        ...prev,
        editHistory: [...prev.editHistory.slice(-opts.maxHistorySize! + 1), cell],
      }))

      // Stop editing
      stopEnhancedCellEdit(rowId, columnId, true)
    } catch (error) {
      console.error('Failed to commit cell changes:', error)
      // Keep editing state active on error
    }
  }, [
    editingState,
    onCellUpdate,
    commitPendingChanges,
    opts.enableValidation,
    opts.enableUndoRedo,
    opts.maxHistorySize
  ])

  const stopEnhancedCellEdit = useCallback((
    rowId: string, 
    columnId: string,
    committed = false
  ) => {
    const cellId = `${rowId}_${columnId}`
    
    // Clear auto-commit timeout
    const timeout = autoCommitTimeouts.current.get(cellId)
    if (timeout) {
      clearTimeout(timeout)
      autoCommitTimeouts.current.delete(cellId)
    }

    // Remove from active cells
    setEditingState(prev => {
      const newActiveCells = new Map(prev.activeCells)
      newActiveCells.delete(cellId)
      return {
        ...prev,
        activeCells: newActiveCells,
      }
    })

    // Stop table store editing
    stopCellEdit(rowId, columnId)

    // Discard pending changes if not committed
    if (!committed) {
      discardPendingChanges(rowId)
      clearOptimisticUpdates(rowId)
    }
  }, [stopCellEdit, discardPendingChanges, clearOptimisticUpdates])

  // Batch editing functions
  const startBatchEdit = useCallback((cellIds: string[]) => {
    const selectedSet = new Set(cellIds)
    setEditingState(prev => ({
      ...prev,
      isInBatchMode: true,
      selectedCells: selectedSet,
    }))
  }, [])

  const applyBatchEdit = useCallback(async (
    columnId: string, 
    value: any,
    description?: string
  ) => {
    if (!editingState.isInBatchMode || editingState.selectedCells.size === 0) {
      return
    }

    const rowIds = Array.from(editingState.selectedCells)
      .map(cellId => cellId.split('_')[0])
      .filter((id, index, arr) => arr.indexOf(id) === index) // Remove duplicates

    const operation: BatchEditOperation = {
      id: `batch_${Date.now()}`,
      rowIds,
      columnId,
      newValue: value,
      originalValues: {},
      description: description || `Batch edit ${columnId}`,
      timestamp: Date.now(),
    }

    // Store original values
    rowIds.forEach(rowId => {
      const rowData = getActiveRowData(rowId)
      if (rowData) {
        operation.originalValues[rowId] = rowData[columnId]
      }
    })

    // Apply batch operation
    if (onBatchUpdate) {
      try {
        await onBatchUpdate([operation])
        
        setEditingState(prev => ({
          ...prev,
          batchOperations: [...prev.batchOperations, operation],
        }))
      } catch (error) {
        console.error('Batch update failed:', error)
      }
    }
  }, [editingState, onBatchUpdate])

  const cancelBatchEdit = useCallback(() => {
    setEditingState(prev => ({
      ...prev,
      isInBatchMode: false,
      selectedCells: new Set(),
    }))
  }, [])

  // Undo/Redo functions
  const undo = useCallback(async () => {
    if (!opts.enableUndoRedo || undoStack.current.length === 0) return

    const lastEdit = undoStack.current.pop()!
    redoStack.current.push(lastEdit)

    // Revert the change
    if (onCellUpdate) {
      await onCellUpdate(lastEdit.rowId, lastEdit.columnId, lastEdit.originalValue)
    }
  }, [onCellUpdate, opts.enableUndoRedo])

  const redo = useCallback(async () => {
    if (!opts.enableUndoRedo || redoStack.current.length === 0) return

    const editToRedo = redoStack.current.pop()!
    undoStack.current.push(editToRedo)

    // Reapply the change
    if (onCellUpdate) {
      await onCellUpdate(editToRedo.rowId, editToRedo.columnId, editToRedo.currentValue)
    }
  }, [onCellUpdate, opts.enableUndoRedo])

  // Utility functions
  const getActiveRowData = useCallback((rowId: string) => {
    const rowIndex = parseInt(rowId, 10)
    if (isNaN(rowIndex) || !data || rowIndex >= data.length) return null
    return data[rowIndex]
  }, [data])

  const getCellState = useCallback((rowId: string, columnId: string) => {
    const cellId = `${rowId}_${columnId}`
    return editingState.activeCells.get(cellId)
  }, [editingState.activeCells])

  const isCellEditing = useCallback((rowId: string, columnId: string) => {
    const cellId = `${rowId}_${columnId}`
    return editingState.activeCells.has(cellId)
  }, [editingState.activeCells])

  const hasUnsavedChanges = useCallback(() => {
    return editingState.activeCells.size > 0 && 
           Array.from(editingState.activeCells.values()).some(cell => cell.hasChanges)
  }, [editingState.activeCells])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      autoCommitTimeouts.current.forEach(timeout => clearTimeout(timeout))
      autoCommitTimeouts.current.clear()
    }
  }, [])

  return {
    // State
    editingState,
    
    // Cell editing
    startCellEdit: startEnhancedCellEdit,
    updateCellValue,
    commitCellChanges,
    stopCellEdit: stopEnhancedCellEdit,
    
    // Batch editing
    startBatchEdit,
    applyBatchEdit,
    cancelBatchEdit,
    
    // Undo/Redo
    undo,
    redo,
    canUndo: opts.enableUndoRedo && undoStack.current.length > 0,
    canRedo: opts.enableUndoRedo && redoStack.current.length > 0,
    
    // Utilities
    getCellState,
    isCellEditing,
    hasUnsavedChanges,
    getActiveRowData,
    
    // Validation
    validateCell,
  }
}