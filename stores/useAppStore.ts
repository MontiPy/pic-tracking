'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ViewMode = 'table' | 'board' | 'timeline'
export type ViewDensity = 'comfortable' | 'normal' | 'compact'

export interface FilterState {
  searchTerm: string
  projectIds: string[]
  supplierIds: string[]
  statuses: string[]
  categories: string[]
  dueDateRange: {
    start?: string
    end?: string
  }
  overdue: boolean
  today: boolean
  thisWeek: boolean
}

export interface SavedView {
  id: string
  name: string
  viewMode: ViewMode
  filters: FilterState
  columnVisibility: Record<string, boolean>
  columnOrder: string[]
  sorting: Array<{ id: string; desc: boolean }>
  density: ViewDensity
}

interface AppState {
  // View Management
  currentView: ViewMode
  viewDensity: ViewDensity
  sidebarCollapsed: boolean
  
  // Selection and Bulk Operations
  selectedRowIds: string[]
  bulkEditMode: boolean
  
  // Filters and Search
  filters: FilterState
  
  // Saved Views
  savedViews: SavedView[]
  activeSavedViewId: string | null
  
  // UI State
  commandPaletteOpen: boolean
  settingsOpen: boolean
  
  // Actions
  setCurrentView: (view: ViewMode) => void
  setViewDensity: (density: ViewDensity) => void
  toggleSidebar: () => void
  
  // Selection Actions
  setSelectedRowIds: (ids: string[]) => void
  toggleRowSelection: (id: string) => void
  selectAllRows: (ids: string[]) => void
  clearSelection: () => void
  toggleBulkEditMode: () => void
  
  // Filter Actions
  setFilters: (filters: Partial<FilterState>) => void
  resetFilters: () => void
  
  // Saved Views
  createSavedView: (view: Omit<SavedView, 'id'>) => void
  updateSavedView: (id: string, updates: Partial<SavedView>) => void
  deleteSavedView: (id: string) => void
  setActiveSavedView: (id: string | null) => void
  
  // UI Actions
  toggleCommandPalette: () => void
  toggleSettings: () => void
}

const defaultFilters: FilterState = {
  searchTerm: '',
  projectIds: [],
  supplierIds: [],
  statuses: [],
  categories: [],
  dueDateRange: {},
  overdue: false,
  today: false,
  thisWeek: false,
}

const defaultSavedViews: SavedView[] = [
  {
    id: 'all-tasks',
    name: 'All Tasks',
    viewMode: 'table',
    filters: defaultFilters,
    columnVisibility: {
      supplier: true,
      task: true,
      section: true,
      effectiveDue: true,
      status: true,
      owner: true,
      notes: true,
      attachments: true,
    },
    columnOrder: ['supplier', 'task', 'section', 'effectiveDue', 'status', 'owner', 'notes', 'attachments'],
    sorting: [{ id: 'effectiveDue', desc: false }],
    density: 'normal',
  },
  {
    id: 'due-this-week',
    name: 'Due This Week',
    viewMode: 'table',
    filters: { ...defaultFilters, thisWeek: true },
    columnVisibility: {
      supplier: true,
      task: true,
      effectiveDue: true,
      status: true,
      owner: false,
      notes: false,
      attachments: false,
    },
    columnOrder: ['supplier', 'task', 'effectiveDue', 'status'],
    sorting: [{ id: 'effectiveDue', desc: false }],
    density: 'compact',
  },
  {
    id: 'overdue',
    name: 'Overdue Tasks',
    viewMode: 'table',
    filters: { ...defaultFilters, overdue: true },
    columnVisibility: {
      supplier: true,
      task: true,
      effectiveDue: true,
      status: true,
      owner: true,
      notes: false,
      attachments: false,
    },
    columnOrder: ['effectiveDue', 'supplier', 'task', 'status', 'owner'],
    sorting: [{ id: 'effectiveDue', desc: false }],
    density: 'normal',
  },
  {
    id: 'part-approval-only',
    name: 'Part Approval Only',
    viewMode: 'board',
    filters: { ...defaultFilters, categories: ['Part Approval'] },
    columnVisibility: {
      supplier: true,
      task: true,
      section: true,
      effectiveDue: true,
      status: true,
      owner: true,
      notes: false,
      attachments: true,
    },
    columnOrder: ['supplier', 'task', 'section', 'effectiveDue', 'status', 'owner', 'attachments'],
    sorting: [{ id: 'effectiveDue', desc: false }],
    density: 'normal',
  },
]

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentView: 'table',
      viewDensity: 'normal',
      sidebarCollapsed: false,
      selectedRowIds: [],
      bulkEditMode: false,
      filters: defaultFilters,
      savedViews: defaultSavedViews,
      activeSavedViewId: 'all-tasks',
      commandPaletteOpen: false,
      settingsOpen: false,

      // View Actions
      setCurrentView: (view) => set({ currentView: view }),
      setViewDensity: (density) => set({ viewDensity: density }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      // Selection Actions
      setSelectedRowIds: (ids) => set({ selectedRowIds: ids }),
      toggleRowSelection: (id) =>
        set((state) => ({
          selectedRowIds: state.selectedRowIds.includes(id)
            ? state.selectedRowIds.filter((rowId) => rowId !== id)
            : [...state.selectedRowIds, id],
        })),
      selectAllRows: (ids) => set({ selectedRowIds: ids }),
      clearSelection: () => set({ selectedRowIds: [] }),
      toggleBulkEditMode: () => set((state) => ({ 
        bulkEditMode: !state.bulkEditMode,
        selectedRowIds: state.bulkEditMode ? [] : state.selectedRowIds 
      })),

      // Filter Actions
      setFilters: (newFilters) =>
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        })),
      resetFilters: () => set({ filters: defaultFilters }),

      // Saved Views
      createSavedView: (view) =>
        set((state) => {
          const id = `view-${Date.now()}`
          const newView = { ...view, id }
          return {
            savedViews: [...state.savedViews, newView],
            activeSavedViewId: id,
          }
        }),
      updateSavedView: (id, updates) =>
        set((state) => ({
          savedViews: state.savedViews.map((view) =>
            view.id === id ? { ...view, ...updates } : view
          ),
        })),
      deleteSavedView: (id) =>
        set((state) => ({
          savedViews: state.savedViews.filter((view) => view.id !== id),
          activeSavedViewId: state.activeSavedViewId === id ? 'all-tasks' : state.activeSavedViewId,
        })),
      setActiveSavedView: (id) => {
        const state = get()
        const savedView = state.savedViews.find((v) => v.id === id)
        if (savedView) {
          set({
            activeSavedViewId: id,
            currentView: savedView.viewMode,
            filters: savedView.filters,
            viewDensity: savedView.density,
          })
        }
      },

      // UI Actions
      toggleCommandPalette: () =>
        set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
      toggleSettings: () =>
        set((state) => ({ settingsOpen: !state.settingsOpen })),
    }),
    {
      name: 'app-store',
      // Only persist certain keys
      partialize: (state) => ({
        viewDensity: state.viewDensity,
        sidebarCollapsed: state.sidebarCollapsed,
        savedViews: state.savedViews,
        activeSavedViewId: state.activeSavedViewId,
      }),
    }
  )
)

// Selectors for common computed values
export const useCurrentSavedView = () => {
  const { savedViews, activeSavedViewId } = useAppStore()
  return savedViews.find((v) => v.id === activeSavedViewId) || savedViews[0]
}

export const useHasActiveFilters = () => {
  const { filters } = useAppStore()
  return (
    filters.searchTerm.length > 0 ||
    filters.projectIds.length > 0 ||
    filters.supplierIds.length > 0 ||
    filters.statuses.length > 0 ||
    filters.categories.length > 0 ||
    filters.overdue ||
    filters.today ||
    filters.thisWeek ||
    !!filters.dueDateRange.start ||
    !!filters.dueDateRange.end
  )
}