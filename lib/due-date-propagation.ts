import { prisma } from './prisma'
import { AnchorType } from '@prisma/client'

export interface PropagationResult {
  updatedCount: number
  errors: string[]
}

/**
 * Propagates due date changes from ProjectTaskTemplate to SupplierTaskInstance
 * Only updates instances where actualDueDate is NULL (no override)
 */
export async function propagateTemplateDateChange(
  templateId: string,
  newDueDate: Date,
  scope: 'project' | 'all-projects-using-type'
): Promise<PropagationResult> {
  try {
    const template = await prisma.projectTaskTemplate.findUnique({
      where: { id: templateId },
      include: {
        task: {
          include: { taskType: true }
        },
        project: true
      }
    })

    if (!template) {
      return { updatedCount: 0, errors: ['Template not found'] }
    }

    let whereClause: any = {
      actualDueDate: null, // Only update instances without overrides
      isApplied: true
    }

    if (scope === 'project') {
      // Only update instances for this specific project template
      whereClause.projectTaskTemplateId = templateId
    } else if (scope === 'all-projects-using-type') {
      // Update instances for all projects using the same task type
      whereClause.projectTaskTemplate = {
        task: {
          taskTypeId: template.task.taskTypeId
        }
      }
    }

    const result = await prisma.supplierTaskInstance.updateMany({
      where: whereClause,
      data: {
        dueDate: newDueDate,
        updatedAt: new Date()
      }
    })

    return { updatedCount: result.count, errors: [] }
  } catch (error) {
    console.error('Due date propagation error:', error)
    return { 
      updatedCount: 0, 
      errors: [error instanceof Error ? error.message : 'Unknown error occurred'] 
    }
  }
}

/**
 * Bulk shift dates for multiple tasks with scope control
 */
export async function bulkShiftDates(
  projectId: string,
  days: number,
  options: {
    taskTypeId?: string
    sectionId?: string
    scope: 'project' | 'all-projects-using-type'
  }
): Promise<PropagationResult> {
  try {
    const { taskTypeId, sectionId, scope } = options
    
    // Build the where clause for ProjectTaskTemplates
    let templateWhereClause: any = {}
    
    if (scope === 'project') {
      templateWhereClause.projectId = projectId
    }
    
    if (taskTypeId) {
      templateWhereClause.task = { taskTypeId }
    }
    
    if (sectionId) {
      templateWhereClause.sectionId = sectionId
    }

    // Get affected templates
    const templates = await prisma.projectTaskTemplate.findMany({
      where: templateWhereClause,
      include: {
        task: {
          include: { taskType: true }
        }
      }
    })

    if (templates.length === 0) {
      return { updatedCount: 0, errors: ['No templates found matching criteria'] }
    }

    let totalUpdated = 0
    const errors: string[] = []

    // Use transaction for consistency
    await prisma.$transaction(async (tx) => {
      // Update ProjectTaskTemplates
      for (const template of templates) {
        const newDueDate = new Date(template.dueDate.getTime() + (days * 24 * 60 * 60 * 1000))
        
        await tx.projectTaskTemplate.update({
          where: { id: template.id },
          data: { 
            dueDate: newDueDate,
            updatedAt: new Date()
          }
        })

        // Propagate to SupplierTaskInstances
        let instanceWhereClause: any = {
          actualDueDate: null, // Only update instances without overrides
          isApplied: true
        }

        if (scope === 'project') {
          instanceWhereClause.projectTaskTemplateId = template.id
        } else if (scope === 'all-projects-using-type') {
          instanceWhereClause.projectTaskTemplate = {
            task: {
              taskTypeId: template.task.taskTypeId
            }
          }
        }

        const instanceResult = await tx.supplierTaskInstance.updateMany({
          where: instanceWhereClause,
          data: {
            dueDate: newDueDate,
            updatedAt: new Date()
          }
        })

        totalUpdated += instanceResult.count
      }
    })

    return { updatedCount: totalUpdated, errors }
  } catch (error) {
    console.error('Bulk date shift error:', error)
    return { 
      updatedCount: 0, 
      errors: [error instanceof Error ? error.message : 'Unknown error occurred'] 
    }
  }
}

/**
 * Calculate due date based on anchor type and offset
 */
export function calculateDueDate(
  anchor: AnchorType,
  offsetDays: number | null,
  baseDate: Date,
  milestoneDate?: Date,
  relativeTaskDate?: Date
): Date {
  let anchorDate: Date

  switch (anchor) {
    case 'PROJECT_START':
      anchorDate = baseDate
      break
    case 'MILESTONE_DATE':
      anchorDate = milestoneDate || baseDate
      break
    case 'RELATIVE_TO_TASK':
      anchorDate = relativeTaskDate || baseDate
      break
    default:
      anchorDate = baseDate
  }

  if (offsetDays) {
    const result = new Date(anchorDate)
    result.setDate(result.getDate() + offsetDays)
    return result
  }

  return anchorDate
}

/**
 * Check if a record has been modified (optimistic locking)
 */
export async function checkOptimisticLock(
  model: 'projectTaskTemplate' | 'supplierTaskInstance',
  id: string,
  prevUpdatedAt: string
): Promise<boolean> {
  try {
    const record = await (prisma as any)[model].findUnique({
      where: { id },
      select: { updatedAt: true }
    })

    if (!record) return false

    const currentUpdatedAt = record.updatedAt.toISOString()
    return currentUpdatedAt === prevUpdatedAt
  } catch (error) {
    console.error('Optimistic lock check error:', error)
    return false
  }
}

/**
 * Auto-generate SupplierTaskInstances when suppliers are assigned to projects
 */
export async function createSupplierTaskInstances(
  supplierId: string,
  projectId: string
): Promise<PropagationResult> {
  try {
    // Get all ProjectTaskTemplates for this project
    const templates = await prisma.projectTaskTemplate.findMany({
      where: { 
        projectId,
        isActive: true
      },
      include: {
        task: {
          include: {
            taskType: true,
            section: true
          }
        }
      }
    })

    if (templates.length === 0) {
      return { updatedCount: 0, errors: ['No active task templates found for project'] }
    }

    // Get or create SupplierProjectInstance
    const supplierProjectInstance = await prisma.supplierProjectInstance.upsert({
      where: {
        supplierId_projectId: {
          supplierId,
          projectId
        }
      },
      create: {
        supplierId,
        projectId,
        status: 'active'
      },
      update: {
        status: 'active',
        updatedAt: new Date()
      }
    })

    let createdCount = 0
    const errors: string[] = []

    // Create SupplierTaskInstances for each template
    for (const template of templates) {
      try {
        await prisma.supplierTaskInstance.upsert({
          where: {
            supplierProjectInstanceId_projectTaskTemplateId: {
              supplierProjectInstanceId: supplierProjectInstance.id,
              projectTaskTemplateId: template.id
            }
          },
          create: {
            supplierProjectInstanceId: supplierProjectInstance.id,
            projectTaskTemplateId: template.id,
            status: 'not_started',
            dueDate: template.dueDate,
            owner: template.owner,
            notes: template.notes,
            isApplied: true
          },
          update: {
            // Don't overwrite existing instances, just ensure they exist
            isApplied: true,
            updatedAt: new Date()
          }
        })
        createdCount++
      } catch (instanceError) {
        errors.push(`Failed to create instance for task ${template.task.name}: ${instanceError}`)
      }
    }

    return { updatedCount: createdCount, errors }
  } catch (error) {
    console.error('Create supplier task instances error:', error)
    return { 
      updatedCount: 0, 
      errors: [error instanceof Error ? error.message : 'Unknown error occurred'] 
    }
  }
}

/**
 * Remove SupplierTaskInstances when suppliers are unassigned from projects
 */
export async function removeSupplierTaskInstances(
  supplierId: string,
  projectId: string
): Promise<PropagationResult> {
  try {
    // Find the SupplierProjectInstance
    const supplierProjectInstance = await prisma.supplierProjectInstance.findUnique({
      where: {
        supplierId_projectId: {
          supplierId,
          projectId
        }
      }
    })

    if (!supplierProjectInstance) {
      return { updatedCount: 0, errors: ['Supplier project instance not found'] }
    }

    // Delete all associated SupplierTaskInstances
    const deleteResult = await prisma.supplierTaskInstance.deleteMany({
      where: {
        supplierProjectInstanceId: supplierProjectInstance.id
      }
    })

    // Delete the SupplierProjectInstance
    await prisma.supplierProjectInstance.delete({
      where: { id: supplierProjectInstance.id }
    })

    return { updatedCount: deleteResult.count, errors: [] }
  } catch (error) {
    console.error('Remove supplier task instances error:', error)
    return { 
      updatedCount: 0, 
      errors: [error instanceof Error ? error.message : 'Unknown error occurred'] 
    }
  }
}