import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createNotFoundError } from '@/lib/validation'

// GET endpoint for individual task with full details (V2 and legacy support)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        // V2 relationships
        taskType: {
          select: {
            id: true,
            name: true,
            category: true,
            description: true
          }
        },
        section: {
          select: {
            id: true,
            name: true,
            sequence: true,
            description: true
          }
        },
        parent: {
          select: {
            id: true,
            name: true,
            sequence: true
          }
        },
        subTasks: {
          select: {
            id: true,
            name: true,
            description: true,
            sequence: true,
            isRequired: true,
            defaultOwner: true,
            defaultNotes: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: { sequence: 'asc' }
        },
        projectTaskTemplates: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                description: true
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
                        supplierNumber: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        // Legacy relationships
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
        projectMilestoneTasks: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                description: true
              }
            },
            milestone: {
              select: {
                code: true,
                name: true
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
                        supplierNumber: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            projectTaskTemplates: true,
            projectMilestoneTasks: true,
            subTasks: true
          }
        }
      }
    })

    if (!task) {
      return NextResponse.json(
        createNotFoundError('Task', id),
        { status: 404 }
      )
    }

    // Calculate usage statistics (V2 and legacy)
    const allInstances = [
      ...(task.projectTaskTemplates?.flatMap(ptt => ptt.supplierTaskInstances) || []),
      ...(task.projectMilestoneTasks?.flatMap(pmt => pmt.supplierTaskInstances) || [])
    ]
    const appliedInstances = allInstances.filter(sti => sti.isApplied)
    
    const enhancedTask = {
      ...task,
      usage: {
        totalProjects: (task.projectTaskTemplates?.length || 0) + (task.projectMilestoneTasks?.length || 0),
        totalSupplierInstances: allInstances.length,
        appliedInstances: appliedInstances.length,
        subTaskCount: task._count?.subTasks || 0,
        statusBreakdown: {
          not_started: appliedInstances.filter(sti => sti.status === 'not_started').length,
          in_progress: appliedInstances.filter(sti => sti.status === 'in_progress').length,
          completed: appliedInstances.filter(sti => sti.status === 'completed').length,
          submitted: appliedInstances.filter(sti => sti.status === 'submitted').length,
          approved: appliedInstances.filter(sti => sti.status === 'approved').length,
          blocked: appliedInstances.filter(sti => sti.status === 'blocked').length,
          cancelled: appliedInstances.filter(sti => sti.status === 'cancelled').length
        },
        projectBreakdown: [
          ...(task.projectTaskTemplates?.map(ptt => ({
            project: ptt.project,
            supplierCount: ptt.supplierTaskInstances.length,
            appliedCount: ptt.supplierTaskInstances.filter(sti => sti.isApplied).length,
            completedCount: ptt.supplierTaskInstances.filter(sti => sti.status === 'completed').length,
            type: 'v2' as const
          })) || []),
          ...(task.projectMilestoneTasks?.map(pmt => ({
            project: pmt.project,
            supplierCount: pmt.supplierTaskInstances.length,
            appliedCount: pmt.supplierTaskInstances.filter(sti => sti.isApplied).length,
            completedCount: pmt.supplierTaskInstances.filter(sti => sti.status === 'completed').length,
            milestone: pmt.milestone,
            type: 'legacy' as const
          })) || [])
        ]
      }
    }

    return NextResponse.json(enhancedTask)
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json({ 
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch task' 
    }, { status: 500 })
  }
}

// PUT endpoint for updating tasks (V2 support)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { updateTaskSchema } = await import('@/lib/validation')

    // Validate input
    const validationResult = updateTaskSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'VALIDATION_ERROR',
          message: validationResult.error.issues[0].message,
          field: validationResult.error.issues[0].path[0]
        },
        { status: 400 }
      )
    }

    // Check if task exists
    const existingTask = await prisma.task.findUnique({
      where: { id }
    })

    if (!existingTask) {
      return NextResponse.json(
        createNotFoundError('Task', id),
        { status: 404 }
      )
    }

    const task = await prisma.task.update({
      where: { id },
      data: validationResult.data,
      include: {
        taskType: {
          select: {
            id: true,
            name: true,
            category: true
          }
        },
        section: {
          select: {
            id: true,
            name: true,
            sequence: true
          }
        },
        parent: {
          select: {
            id: true,
            name: true,
            sequence: true
          }
        },
        subTasks: {
          select: {
            id: true,
            name: true,
            description: true,
            sequence: true,
            isRequired: true,
            defaultOwner: true,
            defaultNotes: true
          },
          orderBy: { sequence: 'asc' }
        },
        // Legacy relationship for compatibility
        milestone: {
          include: {
            taskType: {
              select: {
                id: true,
                name: true,
                category: true
              }
            }
          }
        },
        _count: {
          select: {
            projectTaskTemplates: true,
            projectMilestoneTasks: true,
            subTasks: true
          }
        }
      }
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error('Error updating task:', error)
    if (error.code === 'P2002') {
      if (error.meta?.target?.includes('name')) {
        return NextResponse.json({
          error: 'CONFLICT',
          message: 'Task name must be unique within the task type/parent'
        }, { status: 409 })
      }
    }
    return NextResponse.json({ 
      error: 'INTERNAL_ERROR',
      message: 'Failed to update task' 
    }, { status: 500 })
  }
}

// DELETE endpoint for tasks (V2 support)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if task exists and has dependencies
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            projectTaskTemplates: true,
            projectMilestoneTasks: true,
            subTasks: true
          }
        }
      }
    })

    if (!task) {
      return NextResponse.json(
        createNotFoundError('Task', id),
        { status: 404 }
      )
    }

    // Check for dependencies (V2 and legacy)
    const totalUsage = (task._count.projectTaskTemplates || 0) + (task._count.projectMilestoneTasks || 0)
    if (totalUsage > 0) {
      return NextResponse.json({
        error: 'CONFLICT',
        message: 'Cannot delete task used in projects',
        details: `This task is used in ${totalUsage} project template(s).`
      }, { status: 409 })
    }

    // Check for sub-tasks
    if (task._count.subTasks > 0) {
      return NextResponse.json({
        error: 'CONFLICT',
        message: 'Cannot delete task that has sub-tasks',
        details: `This task has ${task._count.subTasks} sub-task(s). Delete them first.`
      }, { status: 409 })
    }

    await prisma.task.delete({
      where: { id }
    })

    return NextResponse.json({ 
      message: 'Task deleted successfully',
      deletedId: id 
    })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json({ 
      error: 'INTERNAL_ERROR',
      message: 'Failed to delete task' 
    }, { status: 500 })
  }
}