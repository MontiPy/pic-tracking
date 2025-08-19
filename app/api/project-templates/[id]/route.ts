import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET endpoint for individual project template with full details
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const template = await prisma.projectMilestoneTask.findUnique({
      where: { id: params.id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        milestone: {
          include: {
            taskType: {
              select: {
                id: true,
                name: true,
                category: true,
                description: true
              }
            }
          }
        },
        task: {
          select: {
            id: true,
            name: true,
            description: true,
            sequence: true,
            isRequired: true
          }
        },
        supplierTaskInstances: {
          include: {
            supplierProjectInstance: {
              include: {
                supplier: {
                  select: {
                    id: true,
                    name: true,
                    supplierNumber: true,
                    location: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!template) {
      return NextResponse.json({ error: 'Project template not found' }, { status: 404 })
    }

    // Calculate detailed statistics
    const appliedInstances = template.supplierTaskInstances.filter(sti => sti.isApplied)
    const now = new Date()
    
    const enhancedTemplate = {
      ...template,
      stats: {
        totalSuppliers: template.supplierTaskInstances.length,
        appliedSuppliers: appliedInstances.length,
        statusBreakdown: {
          not_started: appliedInstances.filter(sti => sti.status === 'not_started').length,
          in_progress: appliedInstances.filter(sti => sti.status === 'in_progress').length,
          completed: appliedInstances.filter(sti => sti.status === 'completed').length,
          blocked: appliedInstances.filter(sti => sti.status === 'blocked').length,
          cancelled: appliedInstances.filter(sti => sti.status === 'cancelled').length
        },
        overdueSuppliers: appliedInstances.filter(sti => {
          if (sti.status === 'completed') return false
          const dueDate = sti.actualDueDate || sti.dueDate
          return dueDate && new Date(dueDate) < now
        }).length,
        supplierDetails: template.supplierTaskInstances.map(sti => ({
          supplier: sti.supplierProjectInstance.supplier,
          status: sti.status,
          dueDate: sti.actualDueDate || sti.dueDate,
          isApplied: sti.isApplied,
          isOverdue: sti.status !== 'completed' && 
            ((sti.actualDueDate && new Date(sti.actualDueDate) < now) ||
             (sti.dueDate && new Date(sti.dueDate) < now)),
          completedAt: sti.completedAt,
          notes: sti.notes
        }))
      }
    }

    return NextResponse.json(enhancedTemplate)
  } catch (error) {
    console.error('Error fetching project template:', error)
    return NextResponse.json({ error: 'Failed to fetch project template' }, { status: 500 })
  }
}

// PUT endpoint for updating project templates
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { dueDate, notes, isActive } = body

    if (!dueDate) {
      return NextResponse.json(
        { error: 'Due date is required' },
        { status: 400 }
      )
    }

    // Check if template exists
    const existingTemplate = await prisma.projectMilestoneTask.findUnique({
      where: { id: params.id }
    })

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Project template not found' }, { status: 404 })
    }

    // Update the template and cascade changes to supplier instances
    const template = await prisma.$transaction(async (tx) => {
      // Update the template
      const updatedTemplate = await tx.projectMilestoneTask.update({
        where: { id: params.id },
        data: {
          dueDate: new Date(dueDate),
          notes,
          isActive
        },
        include: {
          project: { select: { id: true, name: true } },
          milestone: { 
            include: { 
              taskType: { select: { name: true, category: true } } 
            } 
          },
          task: { select: { name: true } }
        }
      })

      // Update supplier task instances that haven't been manually overridden
      await tx.supplierTaskInstance.updateMany({
        where: {
          projectMilestoneTaskId: params.id,
          actualDueDate: null // Only update instances without manual due date overrides
        },
        data: {
          dueDate: new Date(dueDate)
        }
      })

      return updatedTemplate
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error updating project template:', error)
    return NextResponse.json({ error: 'Failed to update project template' }, { status: 500 })
  }
}

// DELETE endpoint for project templates
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if template exists
    const template = await prisma.projectMilestoneTask.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            supplierTaskInstances: true
          }
        }
      }
    })

    if (!template) {
      return NextResponse.json({ error: 'Project template not found' }, { status: 404 })
    }

    // Delete in transaction to ensure consistency
    await prisma.$transaction(async (tx) => {
      // Delete all supplier task instances first
      await tx.supplierTaskInstance.deleteMany({
        where: {
          projectMilestoneTaskId: params.id
        }
      })

      // Delete the template
      await tx.projectMilestoneTask.delete({
        where: { id: params.id }
      })
    })

    return NextResponse.json({ 
      success: true,
      deletedInstances: template._count.supplierTaskInstances
    })
  } catch (error) {
    console.error('Error deleting project template:', error)
    return NextResponse.json({ error: 'Failed to delete project template' }, { status: 500 })
  }
}