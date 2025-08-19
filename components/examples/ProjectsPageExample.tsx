'use client'

import { useEffect, useState, useMemo } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import Layout from '@/components/layout/Layout'
import ViewContainer, { type BaseTaskData } from '@/components/views/ViewContainer'
import EditableTextCell from '@/components/table/cells/EditableTextCell'
import StatusCell from '@/components/table/cells/StatusCell'
import DateCell from '@/components/table/cells/DateCell'
import { Building2, Users, Calendar, Paperclip } from 'lucide-react'

// Extended interface for project task data
interface ProjectTask extends BaseTaskData {
  supplierName: string
  projectName: string
  taskTypeName: string
  sectionName: string
  effectiveDueDate: string
  owner: string
  notes: string
  createdAt: string
  updatedAt: string
}

const columnHelper = createColumnHelper<ProjectTask>()

const columns = [
  // Checkbox column for selection
  columnHelper.display({
    id: 'select',
    size: 40,
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        onChange={table.getToggleAllPageRowsSelectedHandler()}
        aria-label="Select all rows"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        aria-label={`Select row ${row.index + 1}`}
      />
    ),
  }),

  // Supplier column with inline editing
  columnHelper.accessor('supplierName', {
    id: 'supplier',
    header: 'Supplier',
    size: 180,
    cell: ({ getValue, row, table }) => (
      <div className="flex items-center gap-2">
        <Users size={16} className="text-blue-600" />
        <EditableTextCell
          value={getValue() || ''}
          onSave={async (value) => {
            // Update supplier name
            console.log('Updating supplier:', row.original.id, value)
            // TODO: Call API to update supplier
          }}
          placeholder="Enter supplier name"
          required
        />
      </div>
    ),
  }),

  // Task name column
  columnHelper.accessor('title', {
    id: 'task',
    header: 'Task',
    size: 250,
    cell: ({ getValue, row }) => (
      <EditableTextCell
        value={getValue() || ''}
        onSave={async (value) => {
          console.log('Updating task title:', row.original.id, value)
          // TODO: Call API to update task title
        }}
        placeholder="Enter task name"
        required
      />
    ),
  }),

  // Section column
  columnHelper.accessor('sectionName', {
    id: 'section',
    header: 'Section',
    size: 150,
    cell: ({ getValue }) => (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        {getValue()}
      </span>
    ),
  }),

  // Effective due date with inline editing
  columnHelper.accessor('effectiveDueDate', {
    id: 'effectiveDue',
    header: 'Effective Due',
    size: 150,
    cell: ({ getValue, row }) => (
      <DateCell
        value={getValue() || null}
        onSave={async (value) => {
          console.log('Updating due date:', row.original.id, value)
          // TODO: Call API to update due date with propagation
        }}
        required
      />
    ),
  }),

  // Status column with dropdown editing
  columnHelper.accessor('status', {
    id: 'status',
    header: 'Status',
    size: 130,
    cell: ({ getValue, row }) => (
      <StatusCell
        value={getValue()}
        onSave={async (value) => {
          console.log('Updating status:', row.original.id, value)
          // TODO: Call API to update status
        }}
      />
    ),
  }),

  // Owner column
  columnHelper.accessor('owner', {
    id: 'owner',
    header: 'Owner',
    size: 120,
    cell: ({ getValue, row }) => (
      <EditableTextCell
        value={getValue() || ''}
        onSave={async (value) => {
          console.log('Updating owner:', row.original.id, value)
          // TODO: Call API to update owner
        }}
        placeholder="Assign owner"
      />
    ),
  }),

  // Notes column with multiline editing
  columnHelper.accessor('notes', {
    id: 'notes',
    header: 'Notes',
    size: 200,
    cell: ({ getValue, row }) => (
      <EditableTextCell
        value={getValue() || ''}
        onSave={async (value) => {
          console.log('Updating notes:', row.original.id, value)
          // TODO: Call API to update notes
        }}
        placeholder="Add notes..."
        multiline
        maxLength={500}
      />
    ),
  }),

  // Attachments column (read-only for now)
  columnHelper.display({
    id: 'attachments',
    header: '📎',
    size: 60,
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        {row.original.attachments && row.original.attachments > 0 ? (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Paperclip size={12} />
            <span>{row.original.attachments}</span>
          </div>
        ) : (
          <button 
            className="text-gray-400 hover:text-gray-600 p-1"
            title="Add attachment"
          >
            <Paperclip size={12} />
          </button>
        )}
      </div>
    ),
  }),
]

export default function ProjectsPageExample() {
  const [tasks, setTasks] = useState<ProjectTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load data
  useEffect(() => {
    loadProjectTasks()
  }, [])

  const loadProjectTasks = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // TODO: Replace with actual API call
      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock data
      const mockTasks: ProjectTask[] = [
        {
          id: '1',
          title: 'PA2 Documentation Review',
          supplier: 'Acme Manufacturing',
          project: 'Model X Production',
          section: 'Part Approval',
          category: 'Part Approval',
          status: 'in_progress',
          dueDate: '2024-09-15T00:00:00Z',
          supplierName: 'Acme Manufacturing',
          projectName: 'Model X Production',
          taskTypeName: 'PPAP Review',
          sectionName: 'PA2 Review',
          effectiveDueDate: '2024-09-15T00:00:00Z',
          owner: 'John Smith',
          notes: 'Pending supplier documentation',
          attachments: 3,
          priority: 'high',
          createdAt: '2024-08-01T00:00:00Z',
          updatedAt: '2024-08-15T00:00:00Z',
          assignee: 'John Smith',
          description: 'Review and approve PA2 documentation from supplier'
        },
        {
          id: '2',
          title: 'Tooling Verification',
          supplier: 'Beta Tools Inc',
          project: 'Model Y Launch',
          section: 'Production Readiness',
          category: 'Production Readiness',
          status: 'not_started',
          dueDate: '2024-09-22T00:00:00Z',
          supplierName: 'Beta Tools Inc',
          projectName: 'Model Y Launch',
          taskTypeName: 'Tooling Check',
          sectionName: 'Pre-Production',
          effectiveDueDate: '2024-09-22T00:00:00Z',
          owner: 'Sarah Johnson',
          notes: '',
          attachments: 0,
          priority: 'medium',
          createdAt: '2024-08-05T00:00:00Z',
          updatedAt: '2024-08-05T00:00:00Z',
          assignee: 'Sarah Johnson',
          description: 'Verify tooling setup and capability'
        },
        // Add more mock data...
      ]
      
      setTasks(mockTasks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const handleTaskMove = async (taskId: string, newStatus: ProjectTask['status']) => {
    try {
      // Optimistic update
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ))
      
      // TODO: Call API to update task status
      console.log('Moving task:', taskId, 'to status:', newStatus)
    } catch (error) {
      console.error('Failed to move task:', error)
      // Revert optimistic update
      loadProjectTasks()
    }
  }

  const handleTaskClick = (task: ProjectTask) => {
    console.log('Task clicked:', task)
    // TODO: Open task detail modal or navigate to task page
  }

  const handleTaskEdit = (task: ProjectTask) => {
    console.log('Edit task:', task)
    // TODO: Open task edit modal
  }

  const handleAddTask = (status?: ProjectTask['status']) => {
    console.log('Add new task with status:', status)
    // TODO: Open new task modal
  }

  const handleBulkEdit = (selectedTasks: ProjectTask[]) => {
    console.log('Bulk edit tasks:', selectedTasks)
    // TODO: Open bulk edit modal
  }

  const handleExport = (data: ProjectTask[]) => {
    console.log('Export data:', data.length, 'tasks')
    // TODO: Export data to CSV/Excel
  }

  return (
    <Layout noPadding>
      <ViewContainer
        data={tasks}
        loading={loading}
        error={error}
        title="Project Task Management"
        subtitle="Manage supplier tasks across all manufacturing projects"
        columns={columns}
        
        // Table handlers
        onRowClick={handleTaskClick}
        onRowEdit={handleTaskEdit}
        onBulkEdit={handleBulkEdit}
        onExport={handleExport}
        onAdd={() => handleAddTask()}
        
        // Board handlers
        onTaskMove={handleTaskMove}
        onTaskClick={handleTaskClick}
        onTaskEdit={handleTaskEdit}
        onAddTask={handleAddTask}
        
        // Timeline handlers (using same click handlers)
        dateRange={{
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          end: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
        }}
      />
    </Layout>
  )
}