import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Task Synchronization Service
 * Handles automatic task instance generation and synchronization
 */
export class TaskSyncService {
  /**
   * Auto-generate task instances for a supplier when assigned to a project
   */
  static async generateTaskInstancesForSupplier(
    supplierId: string, 
    projectId: string
  ): Promise<{ created: number; failed: number }> {
    try {
      // Get the supplier project relationship
      const supplierProject = await prisma.supplierProject.findUnique({
        where: {
          supplierId_projectId: {
            supplierId,
            projectId
          }
        }
      })

      if (!supplierProject) {
        throw new Error('Supplier not assigned to project')
      }

      // Get all task templates for this project
      const taskTemplates = await prisma.taskTemplate.findMany({
        where: { projectId },
        include: {
          taskType: {
            select: { name: true, category: true }
          }
        }
      })

      if (taskTemplates.length === 0) {
        return { created: 0, failed: 0 }
      }

      // Check which task instances already exist to avoid duplicates
      const existingInstances = await prisma.taskInstance.findMany({
        where: {
          supplierProjectId: supplierProject.id
        },
        select: { taskTemplateId: true }
      })

      const existingTemplateIds = new Set(existingInstances.map(ti => ti.taskTemplateId))

      // Filter out templates that already have instances
      const templatesToCreate = taskTemplates.filter(
        template => !existingTemplateIds.has(template.id)
      )

      if (templatesToCreate.length === 0) {
        return { created: 0, failed: 0 }
      }

      // Create task instances in a transaction
      const result = await prisma.$transaction(async (tx) => {
        const taskInstances = await Promise.allSettled(
          templatesToCreate.map(template =>
            tx.taskInstance.create({
              data: {
                supplierProjectId: supplierProject.id,
                taskTemplateId: template.id,
                actualDue: template.canonicalDue,
                status: 'not_started'
              }
            })
          )
        )

        return taskInstances
      })

      const successful = result.filter(r => r.status === 'fulfilled').length
      const failed = result.filter(r => r.status === 'rejected').length

      return { created: successful, failed }
    } catch (error) {
      console.error('Error generating task instances:', error)
      throw error
    }
  }

  /**
   * Auto-generate task instances for all suppliers when a new template is added
   */
  static async generateTaskInstancesForTemplate(
    templateId: string
  ): Promise<{ created: number; failed: number }> {
    try {
      // Get the template with project info
      const template = await prisma.taskTemplate.findUnique({
        where: { id: templateId },
        include: {
          project: { select: { id: true } },
          taskType: { select: { name: true, category: true } }
        }
      })

      if (!template) {
        throw new Error('Template not found')
      }

      // Get all supplier projects for this project
      const supplierProjects = await prisma.supplierProject.findMany({
        where: { 
          projectId: template.projectId,
          status: 'active' // Only create for active assignments
        },
        select: { id: true }
      })

      if (supplierProjects.length === 0) {
        return { created: 0, failed: 0 }
      }

      // Check for existing instances to avoid duplicates
      const existingInstances = await prisma.taskInstance.findMany({
        where: {
          taskTemplateId: templateId
        },
        select: { supplierProjectId: true }
      })

      const existingSupplierProjectIds = new Set(
        existingInstances.map(ti => ti.supplierProjectId)
      )

      // Filter out supplier projects that already have this task instance
      const supplierProjectsToCreate = supplierProjects.filter(
        sp => !existingSupplierProjectIds.has(sp.id)
      )

      if (supplierProjectsToCreate.length === 0) {
        return { created: 0, failed: 0 }
      }

      // Create task instances in a transaction
      const result = await prisma.$transaction(async (tx) => {
        const taskInstances = await Promise.allSettled(
          supplierProjectsToCreate.map(sp =>
            tx.taskInstance.create({
              data: {
                supplierProjectId: sp.id,
                taskTemplateId: templateId,
                actualDue: template.canonicalDue,
                status: 'not_started'
              }
            })
          )
        )

        return taskInstances
      })

      const successful = result.filter(r => r.status === 'fulfilled').length
      const failed = result.filter(r => r.status === 'rejected').length

      return { created: successful, failed }
    } catch (error) {
      console.error('Error generating task instances for template:', error)
      throw error
    }
  }

  /**
   * Synchronize due dates when a template's canonical due date is updated
   */
  static async syncDueDatesFromTemplate(
    templateId: string,
    newDueDate: Date,
    options: {
      syncCompleted?: boolean // Whether to update completed tasks
      syncModified?: boolean  // Whether to update manually modified due dates
    } = {}
  ): Promise<{ updated: number; skipped: number }> {
    try {
      const { syncCompleted = false, syncModified = false } = options

      // Build where clause based on options
      const whereClause: any = {
        taskTemplateId: templateId
      }

      if (!syncCompleted) {
        whereClause.status = { not: 'completed' }
      }

      // If we don't want to sync manually modified dates, we need to identify them
      // For now, we'll assume all should be synced unless specified otherwise
      if (!syncModified) {
        // This would require tracking original vs modified due dates
        // For simplicity, we'll sync all for now
      }

      // Get tasks that will be updated
      const tasksToUpdate = await prisma.taskInstance.findMany({
        where: whereClause,
        select: { id: true, status: true, actualDue: true }
      })

      if (tasksToUpdate.length === 0) {
        return { updated: 0, skipped: 0 }
      }

      // Update in transaction
      const updateResult = await prisma.$transaction(async (tx) => {
        const updateCount = await tx.taskInstance.updateMany({
          where: whereClause,
          data: { actualDue: newDueDate }
        })

        return updateCount.count
      })

      return { 
        updated: updateResult, 
        skipped: tasksToUpdate.length - updateResult 
      }
    } catch (error) {
      console.error('Error syncing due dates:', error)
      throw error
    }
  }

  /**
   * Clean up orphaned task instances (tasks without valid supplier projects or templates)
   */
  static async cleanupOrphanedTasks(): Promise<{ deleted: number }> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Find task instances with invalid supplier projects
        const orphanedBySupplierProject = await tx.taskInstance.findMany({
          where: {
            supplierProject: null
          },
          select: { id: true }
        })

        // Find task instances with invalid templates
        const orphanedByTemplate = await tx.taskInstance.findMany({
          where: {
            taskTemplate: null
          },
          select: { id: true }
        })

        const allOrphanedIds = [
          ...orphanedBySupplierProject.map(t => t.id),
          ...orphanedByTemplate.map(t => t.id)
        ]

        if (allOrphanedIds.length === 0) {
          return 0
        }

        const deleteResult = await tx.taskInstance.deleteMany({
          where: {
            id: { in: allOrphanedIds }
          }
        })

        return deleteResult.count
      })

      return { deleted: result }
    } catch (error) {
      console.error('Error cleaning up orphaned tasks:', error)
      throw error
    }
  }

  /**
   * Validate task consistency across the system
   */
  static async validateTaskConsistency(): Promise<{
    missingInstances: Array<{ supplierId: string; projectId: string; templateId: string }>
    orphanedInstances: Array<{ taskInstanceId: string; reason: string }>
    duplicateInstances: Array<{ supplierProjectId: string; templateId: string; count: number }>
  }> {
    try {
      // Find missing task instances (supplier projects without corresponding task instances)
      const supplierProjects = await prisma.supplierProject.findMany({
        where: { status: 'active' },
        include: {
          project: {
            include: {
              taskTemplates: { select: { id: true } }
            }
          },
          taskInstances: { select: { taskTemplateId: true } }
        }
      })

      const missingInstances: Array<{ supplierId: string; projectId: string; templateId: string }> = []

      supplierProjects.forEach(sp => {
        const existingTemplateIds = new Set(sp.taskInstances.map(ti => ti.taskTemplateId))
        sp.project.taskTemplates.forEach(template => {
          if (!existingTemplateIds.has(template.id)) {
            missingInstances.push({
              supplierId: sp.supplierId,
              projectId: sp.projectId,
              templateId: template.id
            })
          }
        })
      })

      // Find orphaned instances (task instances without valid supplier projects or templates)
      const orphanedInstances: Array<{ taskInstanceId: string; reason: string }> = []
      
      const allTaskInstances = await prisma.taskInstance.findMany({
        include: {
          supplierProject: true,
          taskTemplate: true
        }
      })

      allTaskInstances.forEach(ti => {
        if (!ti.supplierProject) {
          orphanedInstances.push({
            taskInstanceId: ti.id,
            reason: 'Missing supplier project'
          })
        }
        if (!ti.taskTemplate) {
          orphanedInstances.push({
            taskInstanceId: ti.id,
            reason: 'Missing task template'
          })
        }
      })

      // Find duplicate instances
      const duplicateInstances: Array<{ supplierProjectId: string; templateId: string; count: number }> = []
      
      const duplicates = await prisma.taskInstance.groupBy({
        by: ['supplierProjectId', 'taskTemplateId'],
        _count: { id: true },
        having: {
          id: {
            _count: {
              gt: 1
            }
          }
        }
      })

      duplicates.forEach(dup => {
        duplicateInstances.push({
          supplierProjectId: dup.supplierProjectId,
          templateId: dup.taskTemplateId,
          count: dup._count.id
        })
      })

      return {
        missingInstances,
        orphanedInstances,
        duplicateInstances
      }
    } catch (error) {
      console.error('Error validating task consistency:', error)
      throw error
    }
  }
}