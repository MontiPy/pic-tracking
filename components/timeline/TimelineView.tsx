'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  format,
  isToday,
  isPast,
  isWithinInterval,
  differenceInDays,
  addDays,
  startOfDay,
  endOfDay,
} from 'date-fns'
import {
  ChevronRight,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Circle,
  XCircle,
  Users,
  Building2,
  Filter,
  ZoomIn,
  ZoomOut,
  Settings,
  Loader2,
} from 'lucide-react'
import { TaskStatus } from '../table/cells/StatusCell'
import styles from './TimelineView.module.css'

export interface TimelineTask {
  id: string
  title: string
  supplier: string
  project: string
  section: string
  category: 'Part Approval' | 'NMR' | 'New Model Builds' | 'Production Readiness' | 'General'
  status: TaskStatus
  dueDate: string
  startDate?: string
  assignee?: string
  description?: string
}

export type TimelineViewMode = 'days' | 'weeks' | 'months'
export type TimelineGroupBy = 'supplier' | 'project' | 'category' | 'status'

export interface TimelineViewProps {
  tasks: TimelineTask[]
  onTaskClick?: (task: TimelineTask) => void
  onTaskEdit?: (task: TimelineTask) => void
  loading?: boolean
  title?: string
  subtitle?: string
  className?: string
  dateRange?: {
    start: Date
    end: Date
  }
  onDateRangeChange?: (start: Date, end: Date) => void
}

interface TaskGroup {
  id: string
  title: string
  icon: React.ComponentType<{ size?: number }>
  tasks: TimelineTask[]
  color?: string
}

const statusConfig = {
  not_started: { color: '#64748b', label: 'Not Started' },
  in_progress: { color: '#3b82f6', label: 'In Progress' },
  submitted: { color: '#f59e0b', label: 'Submitted' },
  approved: { color: '#10b981', label: 'Approved' },
  blocked: { color: '#ef4444', label: 'Blocked' },
  cancelled: { color: '#6b7280', label: 'Cancelled' },
}

export default function TimelineView({
  tasks,
  onTaskClick,
  onTaskEdit,
  loading = false,
  title = 'Timeline View',
  subtitle = 'Visualize task schedules and dependencies',
  className = '',
  dateRange,
  onDateRangeChange,
}: TimelineViewProps) {
  const [viewMode, setViewMode] = useState<TimelineViewMode>('weeks')
  const [groupBy, setGroupBy] = useState<TimelineGroupBy>('supplier')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [selectedTask, setSelectedTask] = useState<string | null>(null)

  // Calculate date range
  const calculatedDateRange = useMemo(() => {
    if (dateRange) return dateRange

    if (tasks.length === 0) {
      const today = new Date()
      return {
        start: startOfWeek(today),
        end: endOfWeek(addDays(today, 30)),
      }
    }

    const taskDates = tasks
      .map(task => new Date(task.dueDate))
      .filter(date => !isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())

    const earliest = taskDates[0]
    const latest = taskDates[taskDates.length - 1]
    const today = new Date()

    const start = earliest < today ? 
      startOfWeek(earliest) : 
      startOfWeek(today)
    
    const end = latest > addDays(today, 30) ?
      endOfWeek(latest) :
      endOfWeek(addDays(today, 30))

    return { start, end }
  }, [dateRange, tasks])

  // Generate time slots based on view mode
  const timeSlots = useMemo(() => {
    const { start, end } = calculatedDateRange

    switch (viewMode) {
      case 'days':
        return eachDayOfInterval({ start, end }).map(date => ({
          date,
          label: format(date, 'MMM d'),
          isToday: isToday(date),
        }))
      
      case 'weeks':
        return eachWeekOfInterval({ start, end }, { weekStartsOn: 1 }).map(date => ({
          date,
          label: format(date, 'MMM d'),
          isToday: isWithinInterval(new Date(), { start: date, end: endOfWeek(date) }),
        }))
      
      case 'months':
        return eachMonthOfInterval({ start, end }).map(date => ({
          date,
          label: format(date, 'MMM yyyy'),
          isToday: isWithinInterval(new Date(), { 
            start: startOfDay(date), 
            end: endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0)) 
          }),
        }))
    }
  }, [calculatedDateRange, viewMode])

  // Group tasks
  const taskGroups = useMemo((): TaskGroup[] => {
    const groups: Record<string, TaskGroup> = {}

    tasks.forEach(task => {
      let groupKey: string
      let groupTitle: string
      let groupIcon: React.ComponentType<{ size?: number }>
      let groupColor: string | undefined

      switch (groupBy) {
        case 'supplier':
          groupKey = task.supplier
          groupTitle = task.supplier
          groupIcon = Users
          break
        case 'project':
          groupKey = task.project
          groupTitle = task.project
          groupIcon = Building2
          break
        case 'category':
          groupKey = task.category
          groupTitle = task.category
          groupIcon = Calendar
          break
        case 'status':
          groupKey = task.status
          groupTitle = statusConfig[task.status]?.label || task.status
          groupIcon = getStatusIcon(task.status)
          groupColor = statusConfig[task.status]?.color
          break
        default:
          groupKey = 'all'
          groupTitle = 'All Tasks'
          groupIcon = Calendar
      }

      if (!groups[groupKey]) {
        groups[groupKey] = {
          id: groupKey,
          title: groupTitle,
          icon: groupIcon,
          tasks: [],
          color: groupColor,
        }
      }

      groups[groupKey].tasks.push(task)
    })

    // Sort groups by task count (descending)
    return Object.values(groups).sort((a, b) => b.tasks.length - a.tasks.length)
  }, [tasks, groupBy])

  function getStatusIcon(status: TaskStatus) {
    switch (status) {
      case 'not_started': return Circle
      case 'in_progress': return Clock
      case 'submitted': return AlertTriangle
      case 'approved': return CheckCircle
      case 'blocked': return XCircle
      default: return Circle
    }
  }

  const toggleGroupExpanded = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      return newSet
    })
  }, [])

  const getTaskPosition = useCallback((task: TimelineTask) => {
    const taskDate = new Date(task.dueDate)
    const { start } = calculatedDateRange
    
    let slotIndex = 0
    let slotWidth = 0

    switch (viewMode) {
      case 'days':
        slotIndex = differenceInDays(taskDate, start)
        slotWidth = 80 // min-width from CSS
        break
      case 'weeks':
        slotIndex = Math.floor(differenceInDays(taskDate, start) / 7)
        slotWidth = 80
        break
      case 'months':
        slotIndex = (taskDate.getFullYear() - start.getFullYear()) * 12 + 
                   (taskDate.getMonth() - start.getMonth())
        slotWidth = 80
        break
    }

    return {
      left: slotIndex * slotWidth,
      width: Math.max(slotWidth - 8, 60), // Minimum task bar width
    }
  }, [calculatedDateRange, viewMode])

  const getTodayPosition = useCallback(() => {
    const today = new Date()
    const { start } = calculatedDateRange
    
    let position = 0

    switch (viewMode) {
      case 'days':
        position = differenceInDays(today, start) * 80
        break
      case 'weeks':
        position = Math.floor(differenceInDays(today, start) / 7) * 80
        break
      case 'months':
        position = ((today.getFullYear() - start.getFullYear()) * 12 + 
                   (today.getMonth() - start.getMonth())) * 80
        break
    }

    return position + 40 // Center in the slot
  }, [calculatedDateRange, viewMode])

  const getTaskBarClass = useCallback((task: TimelineTask) => {
    const isOverdue = isPast(new Date(task.dueDate)) && task.status !== 'approved'
    
    if (isOverdue) return 'overdue'
    return task.status.replace('_', '')
  }, [])

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Loader2 className={`${styles.loadingSpinner} animate-spin`} />
          <span>Loading timeline...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>{title}</h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        
        <div className={styles.toolbar}>
          <button
            className={styles.toolbarButton}
            title="Zoom out"
            onClick={() => {
              if (viewMode === 'days') setViewMode('weeks')
              else if (viewMode === 'weeks') setViewMode('months')
            }}
            disabled={viewMode === 'months'}
          >
            <ZoomOut size={16} />
          </button>
          
          <button
            className={styles.toolbarButton}
            title="Zoom in"
            onClick={() => {
              if (viewMode === 'months') setViewMode('weeks')
              else if (viewMode === 'weeks') setViewMode('days')
            }}
            disabled={viewMode === 'days'}
          >
            <ZoomIn size={16} />
          </button>
          
          <button
            className={styles.toolbarButton}
            title="Filter timeline"
          >
            <Filter size={16} />
            Filter
          </button>
          
          <button
            className={styles.toolbarButton}
            title="Timeline settings"
          >
            <Settings size={16} />
            Settings
          </button>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.timeRange}>
          <label htmlFor="group-by">Group by:</label>
          <select
            id="group-by"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as TimelineGroupBy)}
            className={styles.timeRangeSelect}
          >
            <option value="supplier">Supplier</option>
            <option value="project">Project</option>
            <option value="category">Category</option>
            <option value="status">Status</option>
          </select>
        </div>

        <div className={styles.viewModeToggle}>
          <button
            className={`${styles.viewModeButton} ${viewMode === 'days' ? styles.active : ''}`}
            onClick={() => setViewMode('days')}
          >
            Days
          </button>
          <button
            className={`${styles.viewModeButton} ${viewMode === 'weeks' ? styles.active : ''}`}
            onClick={() => setViewMode('weeks')}
          >
            Weeks
          </button>
          <button
            className={`${styles.viewModeButton} ${viewMode === 'months' ? styles.active : ''}`}
            onClick={() => setViewMode('months')}
          >
            Months
          </button>
        </div>
      </div>

      <div className={styles.timelineContainer}>
        <div className={styles.taskList}>
          <div className={styles.taskListHeader}>
            Tasks ({tasks.length})
          </div>
          
          {taskGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.id)
            const GroupIcon = group.icon
            
            return (
              <div key={group.id} className={styles.taskGroup}>
                <div
                  className={styles.taskGroupHeader}
                  onClick={() => toggleGroupExpanded(group.id)}
                >
                  <div className={styles.taskGroupTitle}>
                    <ChevronRight 
                      className={`${styles.taskGroupToggle} ${isExpanded ? styles.expanded : ''}`} 
                    />
                    <GroupIcon className={styles.taskGroupIcon} />
                    <span>{group.title}</span>
                  </div>
                  <span className={styles.taskGroupCount}>{group.tasks.length}</span>
                </div>
                
                <div className={`${styles.taskGroupContent} ${!isExpanded ? styles.collapsed : ''}`}>
                  {isExpanded && group.tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`${styles.taskItem} ${selectedTask === task.id ? styles.selected : ''}`}
                      onClick={() => {
                        setSelectedTask(task.id)
                        onTaskClick?.(task)
                      }}
                    >
                      <div 
                        className={`${styles.taskItemStatus} ${styles[task.status.replace('_', '')]}`}
                      />
                      <div className={styles.taskItemContent}>
                        <div className={styles.taskItemTitle}>{task.title}</div>
                        <div className={styles.taskItemMeta}>
                          Due {format(new Date(task.dueDate), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className={styles.chart}>
          <div className={styles.chartHeader}>
            {timeSlots.map((slot, index) => (
              <div
                key={index}
                className={`${styles.timeSlot} ${slot.isToday ? styles.today : ''}`}
              >
                {slot.label}
              </div>
            ))}
          </div>

          <div className={styles.chartContent}>
            {/* Today line */}
            <div
              className={styles.todayLine}
              style={{ left: getTodayPosition() }}
            >
              <div className={styles.todayMarker} />
            </div>

            {taskGroups.map((group) => {
              const isExpanded = expandedGroups.has(group.id)
              
              return (
                <div key={group.id}>
                  <div className={`${styles.chartRow} ${styles.group}`}>
                    {timeSlots.map((_, index) => (
                      <div
                        key={index}
                        className={`${styles.chartCell} ${isToday(timeSlots[index]?.date) ? styles.today : ''}`}
                      />
                    ))}
                  </div>
                  
                  {isExpanded && group.tasks.map((task) => (
                    <div key={task.id} className={styles.chartRow}>
                      {timeSlots.map((_, index) => (
                        <div
                          key={index}
                          className={`${styles.chartCell} ${isToday(timeSlots[index]?.date) ? styles.today : ''}`}
                        />
                      ))}
                      
                      {/* Task bar */}
                      <div
                        className={`${styles.timelineBar} ${styles[getTaskBarClass(task)]}`}
                        style={getTaskPosition(task)}
                        onClick={() => onTaskClick?.(task)}
                        title={`${task.title} - ${task.supplier} - Due ${format(new Date(task.dueDate), 'MMM d, yyyy')}`}
                      >
                        <div className={styles.timelineBarContent}>
                          {task.title}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}