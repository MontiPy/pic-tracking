'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { useAppStore } from '@/stores/useAppStore'
import { useTableStore } from '@/stores/useTableStore'

export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
  metaKey?: boolean
  description: string
  category: 'global' | 'table' | 'editing' | 'navigation' | 'manufacturing'
  action: () => void
  preventDefault?: boolean
  allowInInput?: boolean
}

export interface NavigationState {
  focusedRowIndex: number
  focusedColumnIndex: number
  editingCellId: string | null
  selectedCells: Set<string>
  navigationMode: 'table' | 'form' | 'command'
}

export const useKeyboardNavigation = (
  tableRef?: React.RefObject<HTMLTableElement>,
  data?: any[],
  columns?: any[]
) => {
  const { 
    toggleCommandPalette, 
    setCurrentView, 
    toggleBulkEditMode,
    selectedRowIds,
    toggleRowSelection,
    selectAllRows,
    clearSelection,
  } = useAppStore()
  
  const {
    startCellEdit,
    stopCellEdit,
    commitPendingChanges,
    discardPendingChanges,
    globalFilter,
    setGlobalFilter,
  } = useTableStore()

  const [navigationState, setNavigationState] = useState<NavigationState>({
    focusedRowIndex: 0,
    focusedColumnIndex: 0,
    editingCellId: null,
    selectedCells: new Set(),
    navigationMode: 'table',
  })

  const shortcuts = useRef<KeyboardShortcut[]>([])
  const lastFocusedElement = useRef<HTMLElement | null>(null)

  // Initialize keyboard shortcuts
  const initializeShortcuts = useCallback(() => {
    shortcuts.current = [
      // Global Navigation Shortcuts
      {
        key: '/',
        description: 'Focus global search',
        category: 'global',
        action: () => {
          const searchInput = document.querySelector('[data-keyboard-target="global-search"]') as HTMLInputElement
          if (searchInput) {
            searchInput.focus()
            searchInput.select()
          }
        },
        preventDefault: true,
        allowInInput: false,
      },
      {
        key: 'k',
        ctrlKey: true,
        description: 'Open command palette',
        category: 'global',
        action: toggleCommandPalette,
        preventDefault: true,
        allowInInput: true,
      },
      {
        key: 'Escape',
        description: 'Cancel current operation / Close dialogs',
        category: 'global',
        action: () => {
          // Cancel editing
          if (navigationState.editingCellId) {
            const [rowId, columnId] = navigationState.editingCellId.split('_')
            discardPendingChanges(rowId)
            stopCellEdit(rowId, columnId)
            setNavigationState(prev => ({ ...prev, editingCellId: null }))
          }
          
          // Close command palette
          toggleCommandPalette()
          
          // Clear selection
          clearSelection()
          
          // Return focus to table
          if (tableRef?.current) {
            tableRef.current.focus()
          }
        },
        preventDefault: true,
        allowInInput: true,
      },

      // View Switching Shortcuts
      {
        key: '1',
        description: 'Switch to table view',
        category: 'navigation',
        action: () => setCurrentView('table'),
        preventDefault: true,
        allowInInput: false,
      },
      {
        key: '2',
        description: 'Switch to board view',
        category: 'navigation',
        action: () => setCurrentView('board'),
        preventDefault: true,
        allowInInput: false,
      },
      {
        key: '3',
        description: 'Switch to timeline view',
        category: 'navigation',
        action: () => setCurrentView('timeline'),
        preventDefault: true,
        allowInInput: false,
      },

      // Selection and Bulk Operations
      {
        key: 'a',
        ctrlKey: true,
        description: 'Select all visible rows',
        category: 'table',
        action: () => {
          if (data) {
            const allIds = data.map((_, index) => index.toString())
            selectAllRows(allIds)
          }
        },
        preventDefault: true,
        allowInInput: true,
      },
      {
        key: ' ',
        description: 'Toggle row selection (multi-select mode)',
        category: 'table',
        action: () => {
          if (data && navigationState.focusedRowIndex >= 0 && navigationState.focusedRowIndex < data.length) {
            const rowId = navigationState.focusedRowIndex.toString()
            toggleRowSelection(rowId)
          }
        },
        preventDefault: true,
        allowInInput: false,
      },
      {
        key: 'b',
        description: 'Toggle bulk edit mode',
        category: 'table',
        action: toggleBulkEditMode,
        preventDefault: true,
        allowInInput: false,
      },

      // Table Navigation
      {
        key: 'ArrowUp',
        description: 'Move up one row',
        category: 'table',
        action: () => {
          setNavigationState(prev => ({
            ...prev,
            focusedRowIndex: Math.max(0, prev.focusedRowIndex - 1)
          }))
        },
        preventDefault: true,
        allowInInput: false,
      },
      {
        key: 'ArrowDown',
        description: 'Move down one row',
        category: 'table',
        action: () => {
          if (data) {
            setNavigationState(prev => ({
              ...prev,
              focusedRowIndex: Math.min(data.length - 1, prev.focusedRowIndex + 1)
            }))
          }
        },
        preventDefault: true,
        allowInInput: false,
      },
      {
        key: 'ArrowLeft',
        description: 'Move left one column',
        category: 'table',
        action: () => {
          setNavigationState(prev => ({
            ...prev,
            focusedColumnIndex: Math.max(0, prev.focusedColumnIndex - 1)
          }))
        },
        preventDefault: true,
        allowInInput: false,
      },
      {
        key: 'ArrowRight',
        description: 'Move right one column',
        category: 'table',
        action: () => {
          if (columns) {
            setNavigationState(prev => ({
              ...prev,
              focusedColumnIndex: Math.min(columns.length - 1, prev.focusedColumnIndex + 1)
            }))
          }
        },
        preventDefault: true,
        allowInInput: false,
      },
      {
        key: 'Home',
        description: 'Go to first column',
        category: 'table',
        action: () => {
          setNavigationState(prev => ({ ...prev, focusedColumnIndex: 0 }))
        },
        preventDefault: true,
        allowInInput: false,
      },
      {
        key: 'End',
        description: 'Go to last column',
        category: 'table',
        action: () => {
          if (columns) {
            setNavigationState(prev => ({ 
              ...prev, 
              focusedColumnIndex: columns.length - 1 
            }))
          }
        },
        preventDefault: true,
        allowInInput: false,
      },
      {
        key: 'Home',
        ctrlKey: true,
        description: 'Go to first row, first column',
        category: 'table',
        action: () => {
          setNavigationState(prev => ({ 
            ...prev, 
            focusedRowIndex: 0,
            focusedColumnIndex: 0 
          }))
        },
        preventDefault: true,
        allowInInput: false,
      },
      {
        key: 'End',
        ctrlKey: true,
        description: 'Go to last row, last column',
        category: 'table',
        action: () => {
          if (data && columns) {
            setNavigationState(prev => ({ 
              ...prev, 
              focusedRowIndex: data.length - 1,
              focusedColumnIndex: columns.length - 1 
            }))
          }
        },
        preventDefault: true,
        allowInInput: false,
      },

      // Editing Shortcuts
      {
        key: 'Enter',
        description: 'Start editing cell / Save changes',
        category: 'editing',
        action: () => {
          if (navigationState.editingCellId) {
            // Save changes
            const [rowId] = navigationState.editingCellId.split('_')
            commitPendingChanges(rowId)
            setNavigationState(prev => ({ ...prev, editingCellId: null }))
          } else if (data && columns) {
            // Start editing current cell
            const rowId = navigationState.focusedRowIndex.toString()
            const column = columns[navigationState.focusedColumnIndex]
            if (column?.id) {
              startCellEdit(rowId, column.id)
              setNavigationState(prev => ({ 
                ...prev, 
                editingCellId: `${rowId}_${column.id}` 
              }))
            }
          }
        },
        preventDefault: true,
        allowInInput: false,
      },
      {
        key: 'F2',
        description: 'Start editing current cell',
        category: 'editing',
        action: () => {
          if (data && columns) {
            const rowId = navigationState.focusedRowIndex.toString()
            const column = columns[navigationState.focusedColumnIndex]
            if (column?.id) {
              startCellEdit(rowId, column.id)
              setNavigationState(prev => ({ 
                ...prev, 
                editingCellId: `${rowId}_${column.id}` 
              }))
            }
          }
        },
        preventDefault: true,
        allowInInput: false,
      },
      {
        key: 'Tab',
        description: 'Move to next editable cell',
        category: 'editing',
        action: () => {
          // Move to next editable cell (simplified version)
          if (columns) {
            setNavigationState(prev => ({
              ...prev,
              focusedColumnIndex: (prev.focusedColumnIndex + 1) % columns.length
            }))
          }
        },
        preventDefault: true,
        allowInInput: false,
      },
      {
        key: 'Tab',
        shiftKey: true,
        description: 'Move to previous editable cell',
        category: 'editing',
        action: () => {
          if (columns) {
            setNavigationState(prev => ({
              ...prev,
              focusedColumnIndex: prev.focusedColumnIndex === 0 
                ? columns.length - 1 
                : prev.focusedColumnIndex - 1
            }))
          }
        },
        preventDefault: true,
        allowInInput: false,
      },

      // Manufacturing Workflow Shortcuts
      {
        key: 'n',
        description: 'Mark task as Not Started',
        category: 'manufacturing',
        action: () => {
          // Implementation will be added with enhanced editing
          console.log('Set status to not_started')
        },
        preventDefault: true,
        allowInInput: false,
      },
      {
        key: 'i',
        description: 'Mark task as In Progress',
        category: 'manufacturing',
        action: () => {
          console.log('Set status to in_progress')
        },
        preventDefault: true,
        allowInInput: false,
      },
      {
        key: 's',
        description: 'Mark task as Submitted',
        category: 'manufacturing',
        action: () => {
          console.log('Set status to submitted')
        },
        preventDefault: true,
        allowInInput: false,
      },
      {
        key: 'a',
        description: 'Mark task as Approved',
        category: 'manufacturing',
        action: () => {
          console.log('Set status to approved')
        },
        preventDefault: true,
        allowInInput: false,
      },
      {
        key: 'x',
        description: 'Mark task as Blocked',
        category: 'manufacturing',
        action: () => {
          console.log('Set status to blocked')
        },
        preventDefault: true,
        allowInInput: false,
      },

      // Quick Actions
      {
        key: 'n',
        ctrlKey: true,
        description: 'Add new item',
        category: 'global',
        action: () => {
          // Will trigger onAdd callback if available
          const addButton = document.querySelector('[data-keyboard-target="add-button"]') as HTMLButtonElement
          if (addButton) {
            addButton.click()
          }
        },
        preventDefault: true,
        allowInInput: true,
      },
      {
        key: 'f',
        description: 'Toggle filters',
        category: 'global',
        action: () => {
          const filtersButton = document.querySelector('[data-keyboard-target="filters-button"]') as HTMLButtonElement
          if (filtersButton) {
            filtersButton.click()
          }
        },
        preventDefault: true,
        allowInInput: false,
      },
      {
        key: 'r',
        ctrlKey: true,
        description: 'Refresh data',
        category: 'global',
        action: () => {
          window.location.reload()
        },
        preventDefault: true,
        allowInInput: true,
      },
    ]
  }, [
    data, 
    columns, 
    navigationState, 
    toggleCommandPalette, 
    setCurrentView, 
    toggleBulkEditMode,
    toggleRowSelection,
    selectAllRows,
    clearSelection,
    startCellEdit,
    stopCellEdit,
    commitPendingChanges,
    discardPendingChanges,
    tableRef
  ])

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const target = event.target as HTMLElement
    const isInputElement = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.contentEditable === 'true'

    // Find matching shortcut
    const shortcut = shortcuts.current.find(s => {
      const keyMatch = s.key.toLowerCase() === event.key.toLowerCase()
      const ctrlMatch = !!s.ctrlKey === event.ctrlKey
      const altMatch = !!s.altKey === event.altKey  
      const shiftMatch = !!s.shiftKey === event.shiftKey
      const metaMatch = !!s.metaKey === event.metaKey

      return keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch
    })

    if (shortcut) {
      // Check if we should allow this shortcut in input elements
      if (isInputElement && !shortcut.allowInInput) {
        return
      }

      if (shortcut.preventDefault) {
        event.preventDefault()
      }

      shortcut.action()
    }
  }, [])

  // Focus management
  const focusCell = useCallback((rowIndex: number, columnIndex: number) => {
    if (!tableRef?.current) return

    const cell = tableRef.current.querySelector(
      `tbody tr:nth-child(${rowIndex + 1}) td:nth-child(${columnIndex + 1})`
    ) as HTMLElement

    if (cell) {
      cell.focus()
      setNavigationState(prev => ({
        ...prev,
        focusedRowIndex: rowIndex,
        focusedColumnIndex: columnIndex
      }))
    }
  }, [tableRef])

  const getFocusedCellId = useCallback(() => {
    const { focusedRowIndex, focusedColumnIndex } = navigationState
    if (data && columns && 
        focusedRowIndex >= 0 && focusedRowIndex < data.length &&
        focusedColumnIndex >= 0 && focusedColumnIndex < columns.length) {
      return `${focusedRowIndex}_${columns[focusedColumnIndex].id}`
    }
    return null
  }, [navigationState, data, columns])

  // Initialize shortcuts on mount
  useEffect(() => {
    initializeShortcuts()
  }, [initializeShortcuts])

  // Add/remove event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  // Update focused cell visual indicators
  useEffect(() => {
    if (!tableRef?.current) return

    // Remove previous focus indicators
    const prevFocused = tableRef.current.querySelector('.keyboard-focused')
    if (prevFocused) {
      prevFocused.classList.remove('keyboard-focused')
    }

    // Add new focus indicator
    const cell = tableRef.current.querySelector(
      `tbody tr:nth-child(${navigationState.focusedRowIndex + 1}) td:nth-child(${navigationState.focusedColumnIndex + 1})`
    )
    if (cell) {
      cell.classList.add('keyboard-focused')
    }
  }, [navigationState.focusedRowIndex, navigationState.focusedColumnIndex, tableRef])

  return {
    navigationState,
    shortcuts: shortcuts.current,
    focusCell,
    getFocusedCellId,
    setNavigationState,
  }
}

// Helper function to get shortcut display text
export const getShortcutText = (shortcut: KeyboardShortcut): string => {
  const parts: string[] = []
  
  if (shortcut.metaKey) parts.push('⌘')
  if (shortcut.ctrlKey) parts.push('Ctrl')
  if (shortcut.altKey) parts.push('Alt')
  if (shortcut.shiftKey) parts.push('Shift')
  
  parts.push(shortcut.key === ' ' ? 'Space' : shortcut.key)
  
  return parts.join('+')
}

// Categories for organizing shortcuts in help displays
export const shortcutCategories = {
  global: 'Global',
  table: 'Table Navigation', 
  editing: 'Editing',
  navigation: 'View Navigation',
  manufacturing: 'Manufacturing Workflow'
} as const