import { z } from 'zod'

// Enum schemas
const taskStatusEnum = z.enum(['not_started', 'in_progress', 'completed', 'blocked', 'cancelled', 'submitted', 'approved'])
const anchorTypeEnum = z.enum(['PROJECT_START', 'MILESTONE_DATE', 'RELATIVE_TO_TASK'])
const manufacturingCategories = z.enum(['Part Approval', 'NMR', 'New Model Builds', 'General', 'Production Readiness'])

// V2 Core Entity Schemas
export const supplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  supplierNumber: z.string().optional(),
  location: z.string().optional(),
  contactInfo: z.string().default(''), // backward compatibility
  contacts: z.string().optional() // JSON string for contact objects
})

export const updateSupplierSchema = supplierSchema.partial()

export const taskTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: manufacturingCategories.default('General'),
  description: z.string().optional()
})

export const updateTaskTypeSchema = taskTypeSchema.partial()

export const taskTypeSectionSchema = z.object({
  taskTypeId: z.string().cuid('Invalid task type ID'),
  name: z.string().min(1, 'Section name is required'),
  sequence: z.number().int().min(0, 'Sequence must be non-negative'),
  description: z.string().optional()
})

export const updateTaskTypeSectionSchema = taskTypeSectionSchema.omit({ taskTypeId: true }).partial()

export const taskSchema = z.object({
  taskTypeId: z.string().cuid('Invalid task type ID'),
  sectionId: z.string().cuid('Invalid section ID').optional(),
  parentTaskId: z.string().cuid('Invalid parent task ID').optional(),
  name: z.string().min(1, 'Task name is required'),
  description: z.string().optional(),
  sequence: z.number().int().min(0, 'Sequence must be non-negative'),
  defaultOwner: z.string().optional(),
  defaultNotes: z.string().optional(),
  isRequired: z.boolean().default(true)
})

export const updateTaskSchema = taskSchema.partial()

export const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional()
})

export const updateProjectSchema = projectSchema.partial()

export const projectTaskTypeSchema = z.object({
  projectId: z.string().cuid('Invalid project ID'),
  taskTypeId: z.string().cuid('Invalid task type ID'),
  isActive: z.boolean().default(true)
})

export const projectTaskTemplateSchema = z.object({
  projectId: z.string().cuid('Invalid project ID'),
  taskId: z.string().cuid('Invalid task ID'),
  sectionId: z.string().cuid('Invalid section ID').optional(),
  dueDate: z.string().datetime('Invalid due date format'),
  owner: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
  anchor: anchorTypeEnum.default('PROJECT_START'),
  offsetDays: z.number().int().optional(),
  prevUpdatedAt: z.string().datetime('Invalid timestamp format').optional() // optimistic locking
})

export const updateProjectTaskTemplateSchema = projectTaskTemplateSchema.omit({ projectId: true, taskId: true }).partial()

export const supplierTaskInstanceUpdateSchema = z.object({
  status: taskStatusEnum.optional(),
  actualDueDate: z.string().datetime('Invalid due date format').nullable().optional(),
  owner: z.string().optional(),
  notes: z.string().optional(),
  isApplied: z.boolean().optional(),
  blockedReason: z.string().optional(),
  submissionFiles: z.any().optional(), // JSON for file attachments
  prevUpdatedAt: z.string().datetime('Invalid timestamp format').optional() // optimistic locking
})

export const bulkSupplierTaskInstanceUpdateSchema = z.object({
  instanceIds: z.array(z.string().cuid('Invalid instance ID')).min(1, 'At least one instance ID required'),
  updates: supplierTaskInstanceUpdateSchema.omit({ prevUpdatedAt: true })
})

export const supplierProjectAssignmentSchema = z.object({
  supplierId: z.string().cuid('Invalid supplier ID'),
  projectId: z.string().cuid('Invalid project ID')
})

export const shiftDatesSchema = z.object({
  taskTypeId: z.string().cuid('Invalid task type ID').optional(),
  sectionId: z.string().cuid('Invalid section ID').optional(),
  days: z.number().int('Days must be an integer'),
  scope: z.enum(['project', 'all-projects-using-type'], {
    errorMap: () => ({ message: 'Scope must be either "project" or "all-projects-using-type"' })
  })
})

// Standard error response schema
export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  code: z.string().optional(),
  field: z.string().optional()
})

// Helper functions for validation
export function validateAndParseDateTime(dateString: string | undefined | null): Date | null {
  if (!dateString) return null
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) throw new Error('Invalid date')
    return date
  } catch {
    throw new Error('Invalid date format')
  }
}

export function createValidationError(field: string, message: string) {
  return {
    error: 'VALIDATION_ERROR',
    message,
    field
  }
}

export function createNotFoundError(resource: string, id: string) {
  return {
    error: 'NOT_FOUND',
    message: `${resource} with ID ${id} not found`
  }
}

export function createConflictError(message: string) {
  return {
    error: 'CONFLICT',
    message
  }
}

export function createOptimisticLockError() {
  return {
    error: 'OPTIMISTIC_LOCK_FAILED',
    message: 'The record has been modified by another user. Please refresh and try again.'
  }
}

// Legacy schemas for backward compatibility
export const updateSupplierTaskInstanceSchema = z.object({
  status: z.enum(['not_started','in_progress','completed','blocked','cancelled']).optional(),
  actualDueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isApplied: z.boolean().optional(),
  responsibleParties: z.any().optional()
})

export const updateProjectMilestoneTaskSchema = z.object({
  dueDate: z.string().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional().nullable(),
  responsibleParties: z.any().optional()
})

export const createSupplierProjectInstanceSchema = z.object({
  supplierId: z.string().min(1),
  projectId: z.string().min(1),
  status: z.string().optional()
})

export const createSupplierSchema = z.object({
  name: z.string().min(1),
  contactInfo: z.string().optional().default(''),
  supplierNumber: z.string().optional(),
  location: z.string().optional(),
  contacts: z.union([z.string(), z.array(z.object({
    name: z.string().optional(),
    role: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional()
  }))]).optional()
})

export const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional()
})

export const createLegacyTaskInstanceSchema = z.object({
  supplierProjectId: z.string().min(1),
  taskTemplateId: z.string().min(1),
  actualDue: z.string().optional(),
  status: z.string().optional()
})

export const bulkUpdateLegacyTaskInstancesSchema = z.object({
  taskIds: z.array(z.string().min(1)).min(1),
  updates: z.object({
    status: z.string().optional(),
    actualDue: z.string().optional(),
    notes: z.string().optional(),
  }).refine((u) => Object.keys(u).length > 0, { message: 'updates object is required' })
})
