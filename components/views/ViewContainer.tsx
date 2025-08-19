'use client'

import { useMemo } from 'react'
import { useAppStore } from '@/stores/useAppStore'
import DataTable from '../table/DataTable'
import BoardView, { type BoardTask } from '../board/BoardView'
import TimelineView, { type TimelineTask } from '../timeline/TimelineView'
import type { ColumnDef } from '@tanstack/react-table'

// Base interface that all view data should extend
export interface BaseTaskData {
  id: string
  title: string
  supplier: string
  project: string
  section: string
  category: 'Part Approval' | 'NMR' | 'New Model Builds' | 'Production Readiness' | 'General'
  status: 'not_started' | 'in_progress' | 'submitted' | 'approved' | 'blocked' | 'cancelled'
  dueDate: string
  assignee?: string
  description?: string
  attachments?: number
  priority?: 'high' | 'medium' | 'low'
}

export interface ViewContainerProps<T extends BaseTaskData> {
  data: T[]
  loading?: boolean
  error?: string | null
  title?: string
  subtitle?: string
  
  // Table-specific props
  columns?: ColumnDef<T>[]
  onRowClick?: (row: T) => void
  onRowEdit?: (row: T) => void
  onBulkEdit?: (rows: T[]) => void
  onExport?: (data: T[]) => void
  onAdd?: () => void
  
  // Board-specific props  
  onTaskMove?: (taskId: string, newStatus: T['status']) => Promise<void>
  onTaskClick?: (task: T) => void
  onTaskEdit?: (task: T) => void
  onAddTask?: (status: T['status']) => void
  
  // Timeline-specific props
  dateRange?: {
    start: Date
    end: Date
  }
  onDateRangeChange?: (start: Date, end: Date) => void
  
  // Common props
  className?: string
}

export default function ViewContainer<T extends BaseTaskData>({
  data,
  loading = false,
  error = null,
  title,
  subtitle,
  columns,
  onRowClick,
  onRowEdit,
  onBulkEdit,
  onExport,
  onAdd,
  onTaskMove,
  onTaskClick,
  onTaskEdit,
  onAddTask,
  dateRange,
  onDateRangeChange,
  className = '',
}: ViewContainerProps<T>) {
  const { currentView } = useAppStore()

  // Transform data for different view types
  const boardTasks = useMemo((): BoardTask[] => {
    return data.map(item => ({
      id: item.id,
      title: item.title,
      supplier: item.supplier,
      project: item.project,
      section: item.section,
      category: item.category,
      status: item.status,
      dueDate: item.dueDate,
      assignee: item.assignee,
      attachments: item.attachments,
      priority: item.priority,
      description: item.description,
    }))
  }, [data])

  const timelineTasks = useMemo((): TimelineTask[] => {
    return data.map(item => ({
      id: item.id,
      title: item.title,
      supplier: item.supplier,
      project: item.project,
      section: item.section,
      category: item.category,
      status: item.status,
      dueDate: item.dueDate,
      assignee: item.assignee,
      description: item.description,
    }))
  }, [data])

  switch (currentView) {
    case 'table':
      return (
        <DataTable
          data={data}
          columns={columns || []}
          loading={loading}
          error={error}
          title={title}
          subtitle={subtitle}
          onRowClick={onRowClick}
          onRowEdit={onRowEdit}
          onBulkEdit={onBulkEdit}
          onExport={onExport}
          onAdd={onAdd}
          className={className}
        />
      )

    case 'board':
      return (
        <BoardView
          tasks={boardTasks}
          onTaskMove={onTaskMove || (async () => {})}
          onTaskClick={onTaskClick}
          onTaskEdit={onTaskEdit}
          loading={loading}
          title={title}
          subtitle={subtitle}
          onAddTask={onAddTask}
          className={className}
        />
      )

    case 'timeline':
      return (
        <TimelineView
          tasks={timelineTasks}
          onTaskClick={onTaskClick}
          onTaskEdit={onTaskEdit}
          loading={loading}
          title={title}
          subtitle={subtitle}
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange}
          className={className}
        />
      )

    default:
      return (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Unknown view type: {currentView}</p>
        </div>
      )
  }
}