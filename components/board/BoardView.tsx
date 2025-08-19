'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  Circle,
  XCircle,
  Pause,
  Building2,
  Users,
  Calendar,
  Paperclip,
  MoreHorizontal,
  Plus,
  Filter,
  Settings,
  Loader2,
  Archive,
} from 'lucide-react'
import { format, isToday, isPast } from 'date-fns'
import { TaskStatus } from '../table/cells/StatusCell'
import styles from './BoardView.module.css'

export interface BoardTask {
  id: string
  title: string
  supplier: string
  project: string
  section: string
  category: 'Part Approval' | 'NMR' | 'New Model Builds' | 'Production Readiness' | 'General'
  status: TaskStatus
  dueDate: string
  assignee?: string
  attachments?: number
  priority?: 'high' | 'medium' | 'low'
  description?: string
}

export interface BoardViewProps {
  tasks: BoardTask[]
  onTaskMove: (taskId: string, newStatus: TaskStatus) => Promise<void>
  onTaskClick?: (task: BoardTask) => void
  onTaskEdit?: (task: BoardTask) => void
  loading?: boolean
  title?: string
  subtitle?: string
  onAddTask?: (status: TaskStatus) => void
  className?: string
}

const statusColumns = [
  {
    id: 'not_started' as TaskStatus,
    title: 'Not Started',
    icon: Circle,
    description: 'Tasks that haven\'t been started yet',
    color: '#64748b',
  },
  {
    id: 'in_progress' as TaskStatus,
    title: 'In Progress',
    icon: Clock,
    description: 'Tasks currently being worked on',
    color: '#3b82f6',
  },
  {
    id: 'submitted' as TaskStatus,
    title: 'Submitted',
    icon: AlertTriangle,
    description: 'Tasks submitted and awaiting review',
    color: '#f59e0b',
  },
  {
    id: 'approved' as TaskStatus,
    title: 'Approved',
    icon: CheckCircle,
    description: 'Tasks that have been approved',
    color: '#10b981',
  },
  {
    id: 'blocked' as TaskStatus,
    title: 'Blocked',
    icon: XCircle,
    description: 'Tasks that are blocked or need attention',
    color: '#ef4444',
  },
]

interface TaskCardProps {
  task: BoardTask
  onTaskClick?: (task: BoardTask) => void
  onTaskEdit?: (task: BoardTask) => void
}

function TaskCard({ task, onTaskClick, onTaskEdit }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const dueDate = new Date(task.dueDate)
  const isOverdue = isPast(dueDate) && !isToday(dueDate)
  const isDueToday = isToday(dueDate)

  const getCategoryClass = (category: string) => {
    switch (category) {
      case 'Part Approval': return 'partApproval'
      case 'NMR': return 'nmr'
      case 'New Model Builds': return 'newModel'
      case 'Production Readiness': return 'production'
      default: return 'general'
    }
  }

  const getDueDateClass = () => {
    if (isOverdue) return 'overdue'
    if (isDueToday) return 'today'
    return 'upcoming'
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`${styles.card} ${isDragging ? styles.dragging : ''}`}
      onClick={() => onTaskClick?.(task)}
    >
      {task.priority && (
        <div className={`${styles.cardPriority} ${styles[task.priority]}`} />
      )}
      
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>{task.title}</h3>
        <button
          className={styles.cardMenu}
          onClick={(e) => {
            e.stopPropagation()
            onTaskEdit?.(task)
          }}
          title="Task options"
        >
          <MoreHorizontal size={14} />
        </button>
      </div>

      <div className={styles.cardMeta}>
        <div className={styles.cardMetaItem}>
          <Users className={styles.cardMetaIcon} />
          <span className={styles.cardSupplier}>{task.supplier}</span>
        </div>
        
        <div className={styles.cardMetaItem}>
          <Building2 className={styles.cardMetaIcon} />
          <span className={styles.cardProject}>{task.project}</span>
        </div>
        
        <span className={`${styles.cardSection} ${styles[getCategoryClass(task.category)]}`}>
          {task.section}
        </span>
      </div>

      {task.description && (
        <p className={styles.cardDescription}>
          {task.description.length > 100 
            ? `${task.description.substring(0, 100)}...`
            : task.description
          }
        </p>
      )}

      <div className={styles.cardFooter}>
        <div className={`${styles.cardDueDate} ${styles[getDueDateClass()]}`}>
          <Calendar size={12} />
          <span>{format(dueDate, 'MMM d')}</span>
        </div>
        
        <div className={styles.cardActions}>
          {task.attachments && task.attachments > 0 && (
            <div className={styles.cardAttachments}>
              <Paperclip size={12} />
              <span>{task.attachments}</span>
            </div>
          )}
          
          {task.assignee && (
            <div
              className={styles.cardAssignee}
              title={`Assigned to ${task.assignee}`}
            >
              <div className={styles.cardAvatar}>
                {task.assignee.split(' ').map(n => n[0]).join('')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface ColumnProps {
  status: TaskStatus
  title: string
  icon: React.ComponentType<{ size?: number }>
  description: string
  color: string
  tasks: BoardTask[]
  onTaskClick?: (task: BoardTask) => void
  onTaskEdit?: (task: BoardTask) => void
  onAddTask?: (status: TaskStatus) => void
}

function Column({
  status,
  title,
  icon: Icon,
  description,
  color,
  tasks,
  onTaskClick,
  onTaskEdit,
  onAddTask,
}: ColumnProps) {
  const { setNodeRef, isOver } = useSortable({
    id: status,
  })

  return (
    <div
      ref={setNodeRef}
      className={`${styles.column} ${isOver ? styles.dragOver : ''}`}
    >
      <div className={styles.columnHeader}>
        <div className={styles.columnTitle}>
          <div className={styles.columnName}>
            <Icon className={styles.columnIcon} style={{ color }} />
            <span>{title}</span>
          </div>
          <div className={styles.columnCount}>{tasks.length}</div>
        </div>
        <p className={styles.columnDescription}>{description}</p>
      </div>

      <div className={styles.columnContent}>
        {tasks.length === 0 ? (
          <div className={styles.columnEmpty}>
            <Archive className={styles.emptyIcon} />
            <p className={styles.emptyText}>No tasks in {title.toLowerCase()}</p>
            {onAddTask && (
              <button
                onClick={() => onAddTask(status)}
                className={styles.toolbarButton}
                title={`Add task to ${title}`}
              >
                <Plus size={12} />
                Add Task
              </button>
            )}
          </div>
        ) : (
          <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onTaskClick={onTaskClick}
                onTaskEdit={onTaskEdit}
              />
            ))}
            
            {onAddTask && (
              <button
                onClick={() => onAddTask(status)}
                className={`${styles.dropZone} ${styles.addTask}`}
                title={`Add task to ${title}`}
              >
                <Plus size={16} />
                Add Task
              </button>
            )}
          </SortableContext>
        )}
      </div>
    </div>
  )
}

export default function BoardView({
  tasks,
  onTaskMove,
  onTaskClick,
  onTaskEdit,
  loading = false,
  title = 'Task Board',
  subtitle = 'Drag tasks between columns to update their status',
  onAddTask,
  className = '',
}: BoardViewProps) {
  const [activeTask, setActiveTask] = useState<BoardTask | null>(null)
  const sensors = useSensors(useSensor(PointerSensor))

  const tasksByStatus = useMemo(() => {
    return statusColumns.reduce((acc, column) => {
      acc[column.id] = tasks.filter(task => task.status === column.id)
      return acc
    }, {} as Record<TaskStatus, BoardTask[]>)
  }, [tasks])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id)
    setActiveTask(task || null)
  }, [tasks])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveTask(null)
    
    const { active, over } = event
    if (!over || active.id === over.id) return

    const taskId = active.id as string
    const newStatus = over.id as TaskStatus

    // Only proceed if dropping on a different status column
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status === newStatus) return

    try {
      await onTaskMove(taskId, newStatus)
    } catch (error) {
      console.error('Failed to move task:', error)
      // TODO: Show error toast and revert optimistic update
    }
  }, [tasks, onTaskMove])

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Loader2 className={`${styles.loadingSpinner} animate-spin`} />
          <span>Loading board...</span>
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
          {onAddTask && (
            <button
              onClick={() => onAddTask('not_started')}
              className={styles.toolbarButton}
              title="Add new task"
            >
              <Plus size={16} />
              Add Task
            </button>
          )}
          
          <button
            className={styles.toolbarButton}
            title="Filter tasks"
          >
            <Filter size={16} />
            Filter
          </button>
          
          <button
            className={styles.toolbarButton}
            title="Board settings"
          >
            <Settings size={16} />
            Settings
          </button>
        </div>
      </div>

      <div className={styles.boardContainer}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className={styles.board}>
            <SortableContext items={statusColumns.map(col => col.id)}>
              {statusColumns.map((column) => (
                <Column
                  key={column.id}
                  status={column.id}
                  title={column.title}
                  icon={column.icon}
                  description={column.description}
                  color={column.color}
                  tasks={tasksByStatus[column.id] || []}
                  onTaskClick={onTaskClick}
                  onTaskEdit={onTaskEdit}
                  onAddTask={onAddTask}
                />
              ))}
            </SortableContext>
          </div>

          <DragOverlay>
            {activeTask && (
              <div className={styles.dragOverlay}>
                <TaskCard
                  task={activeTask}
                  onTaskClick={onTaskClick}
                  onTaskEdit={onTaskEdit}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}