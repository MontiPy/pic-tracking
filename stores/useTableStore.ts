'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { 
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  ColumnSizingState,
  ExpandedState,
} from '@tanstack/react-table'

export interface TableState {
  // Column Management
  columnVisibility: VisibilityState
  columnOrder: string[]
  columnSizing: ColumnSizingState
  columnFilters: ColumnFiltersState
  
  // Sorting and Filtering
  sorting: SortingState
  globalFilter: string
  
  // Row Expansion (for hierarchical data)
  expanded: ExpandedState
  
  // Pagination
  pagination: {
    pageIndex: number
    pageSize: number
  }
  
  // Inline Editing State
  editingCells: Set<string> // cellId format: `${rowId}_${columnId}`
  editingRows: Set<string>
  pendingChanges: Record<string, Record<string, any>> // rowId -> column -> value
  optimisticUpdates: Record<string, Record<string, any>>
  
  // Actions - Column Management
  setColumnVisibility: (visibility: VisibilityState) => void
  toggleColumnVisibility: (columnId: string) => void
  setColumnOrder: (order: string[]) => void
  setColumnSizing: (sizing: ColumnSizingState) => void
  resetColumnSizing: () => void
  
  // Actions - Sorting and Filtering
  setSorting: (sorting: SortingState) => void
  setColumnFilters: (filters: ColumnFiltersState) => void
  setGlobalFilter: (filter: string) => void
  
  // Actions - Row Expansion
  setExpanded: (expanded: ExpandedState) => void
  toggleRowExpansion: (rowId: string) => void
  
  // Actions - Pagination
  setPagination: (pagination: { pageIndex: number; pageSize: number }) => void
  setPageIndex: (pageIndex: number) => void
  setPageSize: (pageSize: number) => void
  
  // Actions - Inline Editing
  startCellEdit: (rowId: string, columnId: string) => void
  stopCellEdit: (rowId: string, columnId: string) => void
  startRowEdit: (rowId: string) => void
  stopRowEdit: (rowId: string) => void
  updatePendingChange: (rowId: string, columnId: string, value: any) => void
  commitPendingChanges: (rowId: string) => Promise<void>
  discardPendingChanges: (rowId: string) => void
  setOptimisticUpdate: (rowId: string, columnId: string, value: any) => void
  clearOptimisticUpdates: (rowId: string) => void
  
  // Utility Actions
  resetTable: () => void
  exportTableState: () => object
  importTableState: (state: object) => void
}

const defaultColumnOrder = [
  'select',
  'supplier',
  'task',
  'section',
  'milestone',
  'effectiveDue',
  'status', 
  'owner',
  'notes',
  'attachments',
  'actions'
]

const defaultColumnVisibility: VisibilityState = {
  select: false,
  supplier: true,
  task: true,
  section: true,
  milestone: false,
  effectiveDue: true,
  status: true,
  owner: true,
  notes: true,
  attachments: true,
  actions: false,
}

export const useTableStore = create<TableState>()(
  persist(
    (set, get) => ({
      // Initial State
      columnVisibility: defaultColumnVisibility,
      columnOrder: defaultColumnOrder,
      columnSizing: {},
      columnFilters: [],
      sorting: [{ id: 'effectiveDue', desc: false }],
      globalFilter: '',
      expanded: {},
      pagination: {
        pageIndex: 0,
        pageSize: 50,
      },
      editingCells: new Set(),
      editingRows: new Set(),
      pendingChanges: {},
      optimisticUpdates: {},

      // Column Management Actions
      setColumnVisibility: (visibility) => set({ columnVisibility: visibility }),
      toggleColumnVisibility: (columnId) =>
        set((state) => ({
          columnVisibility: {
            ...state.columnVisibility,
            [columnId]: !state.columnVisibility[columnId],
          },
        })),
      setColumnOrder: (order) => set({ columnOrder: order }),
      setColumnSizing: (sizing) => set({ columnSizing: sizing }),
      resetColumnSizing: () => set({ columnSizing: {} }),

      // Sorting and Filtering Actions
      setSorting: (sorting) => set({ sorting }),
      setColumnFilters: (filters) => set({ columnFilters: filters }),
      setGlobalFilter: (filter) => set({ globalFilter: filter }),

      // Row Expansion Actions
      setExpanded: (expanded) => set({ expanded }),
      toggleRowExpansion: (rowId) =>
        set((state) => ({
          expanded: {
            ...state.expanded,
            [rowId]: !state.expanded[rowId],
          },
        })),

      // Pagination Actions
      setPagination: (pagination) => set({ pagination }),
      setPageIndex: (pageIndex) =>
        set((state) => ({ pagination: { ...state.pagination, pageIndex } })),
      setPageSize: (pageSize) =>
        set((state) => ({ 
          pagination: { ...state.pagination, pageSize, pageIndex: 0 }
        })),

      // Inline Editing Actions
      startCellEdit: (rowId, columnId) => {
        const cellId = `${rowId}_${columnId}`
        set((state) => ({
          editingCells: new Set([...state.editingCells, cellId]),
        }))
      },

      stopCellEdit: (rowId, columnId) => {
        const cellId = `${rowId}_${columnId}`
        set((state) => {
          const newEditingCells = new Set(state.editingCells)
          newEditingCells.delete(cellId)
          return { editingCells: newEditingCells }
        })
      },

      startRowEdit: (rowId) =>
        set((state) => ({
          editingRows: new Set([...state.editingRows, rowId]),
        })),

      stopRowEdit: (rowId) =>
        set((state) => {
          const newEditingRows = new Set(state.editingRows)
          newEditingRows.delete(rowId)
          return { editingRows: newEditingRows }
        }),

      updatePendingChange: (rowId, columnId, value) =>
        set((state) => ({
          pendingChanges: {
            ...state.pendingChanges,
            [rowId]: {
              ...state.pendingChanges[rowId],
              [columnId]: value,
            },
          },
        })),

      commitPendingChanges: async (rowId) => {
        const state = get()
        const changes = state.pendingChanges[rowId]
        
        if (!changes) return

        try {
          // Here you would typically make an API call
          // For now, we'll just move the changes to optimistic updates
          set((state) => {
            const newPendingChanges = { ...state.pendingChanges }
            delete newPendingChanges[rowId]
            
            return {
              pendingChanges: newPendingChanges,
              optimisticUpdates: {
                ...state.optimisticUpdates,
                [rowId]: {
                  ...state.optimisticUpdates[rowId],
                  ...changes,
                },
              },
            }
          })
          
          // Clear editing state
          state.stopRowEdit(rowId)
        } catch (error) {
          console.error('Failed to commit changes:', error)
          // In a real app, you'd show an error toast here
        }
      },

      discardPendingChanges: (rowId) =>
        set((state) => {
          const newPendingChanges = { ...state.pendingChanges }
          delete newPendingChanges[rowId]
          
          return {
            pendingChanges: newPendingChanges,
          }
        }),

      setOptimisticUpdate: (rowId, columnId, value) =>
        set((state) => ({
          optimisticUpdates: {
            ...state.optimisticUpdates,
            [rowId]: {
              ...state.optimisticUpdates[rowId],
              [columnId]: value,
            },
          },
        })),

      clearOptimisticUpdates: (rowId) =>
        set((state) => {
          const newOptimisticUpdates = { ...state.optimisticUpdates }
          delete newOptimisticUpdates[rowId]
          return { optimisticUpdates: newOptimisticUpdates }
        }),

      // Utility Actions
      resetTable: () =>
        set({
          columnVisibility: defaultColumnVisibility,
          columnOrder: defaultColumnOrder,
          columnSizing: {},
          columnFilters: [],
          sorting: [{ id: 'effectiveDue', desc: false }],
          globalFilter: '',
          expanded: {},
          pagination: { pageIndex: 0, pageSize: 50 },
          editingCells: new Set(),
          editingRows: new Set(),
          pendingChanges: {},
          optimisticUpdates: {},
        }),

      exportTableState: () => {
        const state = get()
        return {
          columnVisibility: state.columnVisibility,
          columnOrder: state.columnOrder,
          columnSizing: state.columnSizing,
          sorting: state.sorting,
          pagination: state.pagination,
        }
      },

      importTableState: (importedState: any) =>
        set((state) => ({
          ...state,
          ...importedState,
          // Reset editing state on import
          editingCells: new Set(),
          editingRows: new Set(),
          pendingChanges: {},
          optimisticUpdates: {},
        })),
    }),
    {
      name: 'table-store',
      // Persist only non-editing state
      partialize: (state) => ({
        columnVisibility: state.columnVisibility,
        columnOrder: state.columnOrder,
        columnSizing: state.columnSizing,
        sorting: state.sorting,
        pagination: state.pagination,
      }),
    }
  )
)

// Selectors for common computed values
export const useIsCellEditing = (rowId: string, columnId: string) => {
  const { editingCells } = useTableStore()
  return editingCells.has(`${rowId}_${columnId}`)
}

export const useIsRowEditing = (rowId: string) => {
  const { editingRows } = useTableStore()
  return editingRows.has(rowId)
}

export const useRowPendingChanges = (rowId: string) => {
  const { pendingChanges } = useTableStore()
  return pendingChanges[rowId] || {}
}

export const useRowOptimisticUpdates = (rowId: string) => {
  const { optimisticUpdates } = useTableStore()
  return optimisticUpdates[rowId] || {}
}