'use client'

import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
} from '@tanstack/react-table'
import { 
  ChevronDown,
  ChevronUp,
  Filter,
  MoreHorizontal,
  Download,
  Plus,
  Eye,
  EyeOff,
  Settings,
  Loader2,
  Database,
  X,
  Check,
  Keyboard,
  Navigation,
} from 'lucide-react'
import { useAppStore } from '@/stores/useAppStore'
import { useTableStore } from '@/stores/useTableStore'
import { useKeyboardNavigation, getShortcutText } from '@/hooks/useKeyboardNavigation'
import styles from './DataTable.module.css'
import keyboardStyles from './KeyboardNavigation.module.css'

export interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  loading?: boolean
  error?: string | null
  title?: string
  subtitle?: string
  onRowClick?: (row: T) => void
  onRowEdit?: (row: T) => void
  onBulkEdit?: (rows: T[]) => void
  onExport?: (data: T[]) => void
  onAdd?: () => void
  enableRowSelection?: boolean
  enableBulkOperations?: boolean
  enableColumnFilters?: boolean
  enableGlobalFilter?: boolean
  enableSorting?: boolean
  enablePagination?: boolean
  enableColumnResizing?: boolean
  enableColumnVisibility?: boolean
  pageSize?: number
}

export default function DataTable<T>({
  data,
  columns,
  loading = false,
  error = null,
  title = 'Data Table',
  subtitle,
  onRowClick,
  onRowEdit,
  onBulkEdit,
  onExport,
  onAdd,
  enableRowSelection = true,
  enableBulkOperations = true,
  enableColumnFilters = true,
  enableGlobalFilter = true,
  enableSorting = true,
  enablePagination = true,
  enableColumnResizing = true,
  enableColumnVisibility = true,
  pageSize = 50,
}: DataTableProps<T>) {
  const { viewDensity, selectedRowIds, setSelectedRowIds, bulkEditMode, toggleBulkEditMode } = useAppStore()
  const {
    columnVisibility,
    columnSizing,
    columnFilters,
    sorting,
    globalFilter,
    pagination,
    setColumnVisibility,
    setColumnSizing,
    setColumnFilters,
    setSorting,
    setGlobalFilter,
    setPagination,
  } = useTableStore()

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnVisibilityMenuOpen, setColumnVisibilityMenuOpen] = useState(false)
  const [showNavigationMode, setShowNavigationMode] = useState(false)
  const [showStatusHints, setShowStatusHints] = useState(false)
  
  const tableRef = useRef<HTMLTableElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Initialize keyboard navigation
  const { 
    navigationState, 
    shortcuts, 
    focusCell, 
    getFocusedCellId,
    setNavigationState 
  } = useKeyboardNavigation(tableRef, data, columns)

  // Update row selection based on app store
  useEffect(() => {
    const newSelection: RowSelectionState = {}
    selectedRowIds.forEach((id) => {
      newSelection[id] = true
    })
    setRowSelection(newSelection)
  }, [selectedRowIds])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    
    // State
    state: {
      columnVisibility,
      columnSizing,
      columnFilters,
      sorting,
      globalFilter,
      pagination,
      rowSelection,
    },
    
    // Options
    enableRowSelection,
    enableColumnFilters,
    enableGlobalFilter,
    enableSorting,
    enableColumnResizing,
    
    // State setters
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    onRowSelectionChange: (updater) => {
      const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater
      setRowSelection(newSelection)
      
      // Sync with app store
      const selectedIds = Object.keys(newSelection).filter(id => newSelection[id])
      setSelectedRowIds(selectedIds)
    },
    
    // Pagination
    initialState: {
      pagination: {
        pageSize,
        pageIndex: 0,
      },
    },
    
    // Get row ID for selection
    getRowId: (row, index) => {
      // Try to get ID from row data, fallback to index
      return (row as any)?.id?.toString() || index.toString()
    },
  })

  const selectedRows = useMemo(() => {
    return table.getFilteredSelectedRowModel().rows.map(row => row.original)
  }, [table, rowSelection])

  const handleBulkAction = useCallback((action: string) => {
    switch (action) {
      case 'edit':
        onBulkEdit?.(selectedRows)
        break
      case 'export':
        onExport?.(selectedRows)
        break
      case 'delete':
        // Handle bulk delete
        break
    }
  }, [selectedRows, onBulkEdit, onExport])

  const handleSelectAll = useCallback(() => {
    const allRowIds = table.getRowModel().rows.map(row => row.id)
    if (selectedRowIds.length === allRowIds.length) {
      setSelectedRowIds([])
    } else {
      setSelectedRowIds(allRowIds)
    }
  }, [table, selectedRowIds, setSelectedRowIds])

  const toggleColumnVisibility = useCallback((columnId: string) => {
    setColumnVisibility({
      ...columnVisibility,
      [columnId]: !columnVisibility[columnId]
    })
  }, [columnVisibility, setColumnVisibility])

  // Show navigation mode indicator temporarily
  const showNavigationModeIndicator = useCallback((mode: string, duration = 2000) => {
    setShowNavigationMode(true)
    setTimeout(() => setShowNavigationMode(false), duration)
  }, [])

  // Show status transition hints when in editing mode
  const showStatusTransitionHints = useCallback(() => {
    setShowStatusHints(true)
    setTimeout(() => setShowStatusHints(false), 5000)
  }, [])

  // Handle table focus for keyboard navigation
  const handleTableFocus = useCallback(() => {
    showNavigationModeIndicator('Table Navigation')
  }, [showNavigationModeIndicator])

  // Enhanced cell click handler with keyboard navigation support
  const handleCellClick = useCallback((rowIndex: number, columnIndex: number, event: React.MouseEvent) => {
    // Update keyboard navigation state
    setNavigationState(prev => ({
      ...prev,
      focusedRowIndex: rowIndex,
      focusedColumnIndex: columnIndex
    }))
    
    // Show editing hints if applicable
    if (event.detail === 2) { // Double click
      showStatusTransitionHints()
    }
  }, [setNavigationState, showStatusTransitionHints])

  // Keyboard shortcut display helpers
  const getShortcutsByCategory = useCallback(() => {
    return shortcuts.reduce((acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = []
      }
      acc[shortcut.category].push(shortcut)
      return acc
    }, {} as Record<string, typeof shortcuts>)
  }, [shortcuts])

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <Database className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>Error loading data</h3>
          <p className={styles.emptyDescription}>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={styles.container}>
      {/* Skip Links for Accessibility */}
      <a 
        href="#table-content" 
        className={keyboardStyles.skipLink}
        aria-label="Skip to table content"
      >
        Skip to table content
      </a>
      
      {/* Navigation Mode Indicator */}
      {showNavigationMode && (
        <div className={`${keyboardStyles.navigationMode} ${keyboardStyles.visible}`}>
          <div className={keyboardStyles.navigationModeIndicator}>
            <Keyboard className={keyboardStyles.navigationModeIcon} />
            Table Navigation Active
          </div>
        </div>
      )}
      
      {/* Status Transition Hints */}
      {showStatusHints && (
        <div className={`${keyboardStyles.statusTransitionHints} ${keyboardStyles.visible}`}>
          <div className={keyboardStyles.statusHint}>
            <span className={keyboardStyles.statusHintKey}>N</span>
            <div className={`${keyboardStyles.statusIndicator} ${keyboardStyles.notStarted}`}></div>
            Not Started
          </div>
          <div className={keyboardStyles.statusHint}>
            <span className={keyboardStyles.statusHintKey}>I</span>
            <div className={`${keyboardStyles.statusIndicator} ${keyboardStyles.inProgress}`}></div>
            In Progress
          </div>
          <div className={keyboardStyles.statusHint}>
            <span className={keyboardStyles.statusHintKey}>S</span>
            <div className={`${keyboardStyles.statusIndicator} ${keyboardStyles.submitted}`}></div>
            Submitted
          </div>
          <div className={keyboardStyles.statusHint}>
            <span className={keyboardStyles.statusHintKey}>A</span>
            <div className={`${keyboardStyles.statusIndicator} ${keyboardStyles.approved}`}></div>
            Approved
          </div>
          <div className={keyboardStyles.statusHint}>
            <span className={keyboardStyles.statusHintKey}>X</span>
            <div className={`${keyboardStyles.statusIndicator} ${keyboardStyles.blocked}`}></div>
            Blocked
          </div>
        </div>
      )}
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>{title}</h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        
        <div className={styles.toolbar}>
          {/* Global Search */}
          {enableGlobalFilter && (
            <div className={styles.toolbarGroup}>
              <input
                data-keyboard-target="global-search"
                value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search all columns... (Press / to focus)"
                className={styles.searchInput}
                aria-label="Global search across all table columns"
              />
            </div>
          )}
          
          {/* Actions */}
          <div className={styles.toolbarGroup}>
            {onAdd && (
              <button
                data-keyboard-target="add-button"
                onClick={onAdd}
                className={styles.toolbarButton}
                title="Add new item (Ctrl+N)"
                aria-label="Add new item"
              >
                <Plus size={16} />
                Add
              </button>
            )}
            
            {enableBulkOperations && (
              <button
                data-keyboard-target="bulk-edit-button"
                onClick={toggleBulkEditMode}
                className={`${styles.toolbarButton} ${bulkEditMode ? styles.active : ''}`}
                title="Toggle bulk selection mode (B)"
                aria-label={`${bulkEditMode ? 'Exit' : 'Enter'} bulk edit mode`}
                aria-pressed={bulkEditMode}
              >
                <Check size={16} />
                Bulk Edit
              </button>
            )}
            
            {enableColumnVisibility && (
              <div className={styles.toolbarGroup}>
                <button
                  data-keyboard-target="columns-button"
                  onClick={() => setColumnVisibilityMenuOpen(!columnVisibilityMenuOpen)}
                  className={styles.toolbarButton}
                  title="Toggle column visibility"
                  aria-label="Manage column visibility"
                  aria-expanded={columnVisibilityMenuOpen}
                >
                  {columnVisibilityMenuOpen ? <EyeOff size={16} /> : <Eye size={16} />}
                  Columns
                </button>
                
                {/* Column Visibility Menu */}
                {columnVisibilityMenuOpen && (
                  <div className={styles.columnMenu}>
                    {table.getAllLeafColumns().map((column) => (
                      <label key={column.id} className={styles.columnMenuItem}>
                        <input
                          type="checkbox"
                          checked={column.getIsVisible()}
                          onChange={() => toggleColumnVisibility(column.id)}
                        />
                        <span>{column.columnDef.header?.toString() || column.id}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {onExport && (
              <button
                onClick={() => onExport(data)}
                className={styles.toolbarButton}
                title="Export data"
              >
                <Download size={16} />
                Export
              </button>
            )}
            
            <button
              className={styles.toolbarButton}
              title="Table settings"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Operations Bar */}
      {bulkEditMode && selectedRows.length > 0 && (
        <div className={styles.bulkBar}>
          <div className={styles.bulkInfo}>
            <span>{selectedRows.length} items selected</span>
          </div>
          
          <div className={styles.bulkActions}>
            <button
              onClick={() => handleBulkAction('edit')}
              className={styles.bulkButton}
            >
              Edit Selected
            </button>
            <button
              onClick={() => handleBulkAction('export')}
              className={styles.bulkButton}
            >
              Export Selected
            </button>
            <button
              onClick={() => setSelectedRowIds([])}
              className={styles.bulkCancel}
              title="Clear selection"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className={styles.tableContainer}>
        {loading ? (
          <div className={styles.loading}>
            <Loader2 className={`${styles.loadingSpinner} animate-spin`} />
            <span>Loading data...</span>
          </div>
        ) : data.length === 0 ? (
          <div className={styles.empty}>
            <Database className={styles.emptyIcon} />
            <h3 className={styles.emptyTitle}>No data available</h3>
            <p className={styles.emptyDescription}>
              There are no items to display. Try adjusting your filters or add some data.
            </p>
            {onAdd && (
              <button onClick={onAdd} className={styles.toolbarButton}>
                <Plus size={16} />
                Add First Item
              </button>
            )}
          </div>
        ) : (
          <table 
            ref={tableRef}
            id="table-content"
            className={`${styles.table} ${styles[viewDensity]} ${bulkEditMode ? keyboardStyles.bulkSelectionMode : ''}`}
            role="grid"
            aria-label={`${title} - ${data.length} rows`}
            aria-rowcount={data.length}
            aria-colcount={columns.length}
            tabIndex={0}
            onFocus={handleTableFocus}
          >
            <thead className={styles.thead}>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className={styles.headerRow}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={styles.headerCell}
                      style={{
                        width: header.getSize(),
                      }}
                    >
                      <div className={styles.headerContent}>
                        {header.isPlaceholder ? null : (
                          <>
                            <div
                              className={`${styles.sortableHeader} ${
                                header.column.getIsSorted() ? styles.sorted : ''
                              }`}
                              onClick={
                                enableSorting && header.column.getCanSort()
                                  ? header.column.getToggleSortingHandler()
                                  : undefined
                              }
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              {enableSorting && header.column.getCanSort() && (
                                <span className={styles.sortIcon}>
                                  {{
                                    asc: <ChevronUp size={14} />,
                                    desc: <ChevronDown size={14} />,
                                    false: <MoreHorizontal size={14} />,
                                  }[header.column.getIsSorted() as string] ?? <MoreHorizontal size={14} />}
                                </span>
                              )}
                            </div>
                            
                            {enableColumnFilters && header.column.getCanFilter() && (
                              <Filter
                                className={`${styles.filterIcon} ${
                                  header.column.getIsFiltered() ? styles.active : ''
                                }`}
                                size={12}
                              />
                            )}
                          </>
                        )}
                        
                        {/* Resize Handle */}
                        {enableColumnResizing && (
                          <div
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            className={`${styles.resizeHandle} ${
                              header.column.getIsResizing() ? styles.isResizing : ''
                            }`}
                          />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            
            <tbody className={styles.tbody}>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`${styles.row} ${
                    row.getIsSelected() ? styles.selected : ''
                  }`}
                  onClick={() => {
                    if (bulkEditMode) {
                      row.toggleSelected()
                    } else {
                      onRowClick?.(row.original)
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell, cellIndex) => {
                    const isFocusedCell = isFocusedRow && navigationState.focusedColumnIndex === cellIndex
                    const cellId = `${rowIndex}_${cell.column.id}`
                    
                    return (
                      <td
                        key={cell.id}
                        className={`${styles.cell} ${
                          isFocusedCell ? keyboardStyles.keyboardFocused : ''
                        } ${keyboardStyles.cell}`}
                        style={{
                          width: cell.column.getSize(),
                        }}
                        role="gridcell"
                        aria-colindex={cellIndex + 1}
                        tabIndex={isFocusedCell ? 0 : -1}
                        onClick={(e) => handleCellClick(rowIndex, cellIndex, e)}
                        data-cell-id={cellId}
                      >
                        <div className={styles.cellContent}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          {/* Keyboard shortcut hint for focused cell */}
                          {isFocusedCell && (
                            <div className={keyboardStyles.shortcutHint}>
                              Enter to edit
                            </div>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer with Pagination */}
      {enablePagination && data.length > 0 && (
        <div className={styles.footer}>
          <div className={styles.footerInfo}>
            <span>
              Showing {table.getRowModel().rows.length} of{' '}
              {table.getFilteredRowModel().rows.length} filtered results
              ({data.length} total)
            </span>
            {selectedRows.length > 0 && (
              <span>
                {selectedRows.length} selected
              </span>
            )}
          </div>
          
          <div className={styles.footerControls}>
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className={styles.toolbarButton}
            >
              First
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className={styles.toolbarButton}
            >
              Previous
            </button>
            
            <select
              value={table.getState().pagination.pageIndex}
              onChange={(e) => table.setPageIndex(Number(e.target.value))}
              className={styles.pageSelect}
            >
              {Array.from({ length: table.getPageCount() }, (_, i) => (
                <option key={i} value={i}>
                  Page {i + 1}
                </option>
              ))}
            </select>
            
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className={styles.toolbarButton}
            >
              Next
            </button>
            <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className={styles.toolbarButton}
            >
              Last
            </button>
            
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className={styles.pageSelect}
            >
              {[10, 25, 50, 100, 200].map((size) => (
                <option key={size} value={size}>
                  {size} rows
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}