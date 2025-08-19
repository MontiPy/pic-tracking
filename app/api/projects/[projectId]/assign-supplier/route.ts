import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const body = await request.json()
    const { supplierId } = body as { supplierId: string }

    if (!supplierId) {
      return NextResponse.json({ error: 'supplierId is required' }, { status: 400 })
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
      include: {
        taskTemplates: {
          include: {
            taskType: {
              select: {
                name: true,
                category: true
              }
            }
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Verify supplier exists
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId }
    })

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // Check if supplier is already assigned to this project
    const existingAssignment = await prisma.supplierProject.findUnique({
      where: {
        supplierId_projectId: {
          supplierId,
          projectId: params.projectId
        }
      }
    })

    if (existingAssignment) {
      return NextResponse.json({ error: 'Supplier already assigned to this project' }, { status: 409 })
    }

    // Create supplier project assignment and auto-generate task instances
    const result = await prisma.$transaction(async (tx) => {
      // Create the supplier project relationship
      const supplierProject = await tx.supplierProject.create({
        data: {
          supplierId,
          projectId: params.projectId,
          status: 'active'
        }
      })

      // Auto-generate task instances for all task templates in this project
      const taskInstancesToCreate = project.taskTemplates.map(template => ({
        supplierProjectId: supplierProject.id,
        taskTemplateId: template.id,
        actualDue: template.canonicalDue, // Inherit due date from template
        status: 'not_started'
      }))

      let taskInstances: any[] = []
      if (taskInstancesToCreate.length > 0) {
        // Create all task instances in bulk
        await tx.taskInstance.createMany({
          data: taskInstancesToCreate
        })

        // Fetch the created task instances with full details
        taskInstances = await tx.taskInstance.findMany({
          where: {
            supplierProjectId: supplierProject.id
          },
          include: {
            taskTemplate: {
              include: {
                taskType: {
                  select: {
                    id: true,
                    name: true,
                    category: true
                  }
                }
              }
            }
          },
          orderBy: {
            actualDue: 'asc'
          }
        })
      }

      return {
        supplierProject,
        taskInstances,
        createdCount: taskInstances.length
      }
    })

    // Return comprehensive result
    return NextResponse.json({
      message: 'Supplier assigned successfully',
      supplierProject: result.supplierProject,
      taskInstances: result.taskInstances,
      summary: {
        supplierId,
        supplierName: supplier.name,
        projectId: params.projectId,
        projectName: project.name,
        tasksCreated: result.createdCount,
        taskBreakdown: project.taskTemplates.reduce((acc, template) => {
          const category = template.taskType.category
          acc[category] = (acc[category] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      }
    })
  } catch (error) {
    console.error('Error assigning supplier to project:', error)
    return NextResponse.json({ error: 'Failed to assign supplier to project' }, { status: 500 })
  }
}

// Remove supplier from project and cleanup task instances
export async function DELETE(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const supplierId = searchParams.get('supplierId')

    if (!supplierId) {
      return NextResponse.json({ error: 'supplierId query parameter is required' }, { status: 400 })
    }

    // Find the supplier project relationship
    const supplierProject = await prisma.supplierProject.findUnique({
      where: {
        supplierId_projectId: {
          supplierId,
          projectId: params.projectId
        }
      },
      include: {
        taskInstances: {
          select: {
            id: true,
            status: true
          }
        }
      }
    })

    if (!supplierProject) {
      return NextResponse.json({ error: 'Supplier not assigned to this project' }, { status: 404 })
    }

    // Check if there are completed tasks (might want to preserve data)
    const completedTasks = supplierProject.taskInstances.filter(t => t.status === 'completed')
    
    const result = await prisma.$transaction(async (tx) => {
      // Delete all task instances (cascades due to foreign key constraint)
      const deletedTaskCount = await tx.taskInstance.deleteMany({
        where: {
          supplierProjectId: supplierProject.id
        }
      })

      // Delete the supplier project relationship
      await tx.supplierProject.delete({
        where: {
          id: supplierProject.id
        }
      })

      return {
        deletedTaskCount: deletedTaskCount.count,
        completedTasksLost: completedTasks.length
      }
    })

    return NextResponse.json({
      message: 'Supplier removed from project successfully',
      summary: {
        supplierId,
        projectId: params.projectId,
        tasksDeleted: result.deletedTaskCount,
        completedTasksLost: result.completedTasksLost
      }
    })
  } catch (error) {
    console.error('Error removing supplier from project:', error)
    return NextResponse.json({ error: 'Failed to remove supplier from project' }, { status: 500 })
  }
}