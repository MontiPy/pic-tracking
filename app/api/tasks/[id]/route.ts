import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET endpoint for individual task with full details
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
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
            projectMilestoneTasks: true
          }
        }
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Calculate usage statistics
    const allInstances = task.projectMilestoneTasks.flatMap(pmt => pmt.supplierTaskInstances)
    const appliedInstances = allInstances.filter(sti => sti.isApplied)
    
    const enhancedTask = {
      ...task,
      usage: {
        totalProjects: task.projectMilestoneTasks.length,
        totalSupplierInstances: allInstances.length,
        appliedInstances: appliedInstances.length,
        statusBreakdown: {
          not_started: appliedInstances.filter(sti => sti.status === 'not_started').length,
          in_progress: appliedInstances.filter(sti => sti.status === 'in_progress').length,
          completed: appliedInstances.filter(sti => sti.status === 'completed').length,
          blocked: appliedInstances.filter(sti => sti.status === 'blocked').length,
          cancelled: appliedInstances.filter(sti => sti.status === 'cancelled').length
        },
        projectBreakdown: task.projectMilestoneTasks.map(pmt => ({
          project: pmt.project,
          supplierCount: pmt.supplierTaskInstances.length,
          appliedCount: pmt.supplierTaskInstances.filter(sti => sti.isApplied).length,
          completedCount: pmt.supplierTaskInstances.filter(sti => sti.status === 'completed').length
        }))
      }
    }

    return NextResponse.json(enhancedTask)
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 })
  }
}

// PUT endpoint for updating tasks
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, description, sequence, isRequired } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Check if task exists
    const existingTask = await prisma.task.findUnique({
      where: { id: params.id }
    })

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const task = await prisma.task.update({
      where: { id: params.id },
      data: {
        name,
        description,
        sequence,
        isRequired
      },
      include: {
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
            projectMilestoneTasks: true
          }
        }
      }
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error('Error updating task:', error)
    if (error.code === 'P2002') {
      if (error.meta?.target?.includes('name')) {
        return NextResponse.json(
          { error: 'Task name must be unique within the milestone' },
          { status: 409 }
        )
      }
    }
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

// DELETE endpoint for tasks
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if task exists and has dependencies
    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            projectMilestoneTasks: true
          }
        }
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Check for dependencies
    if (task._count.projectMilestoneTasks > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete task used in projects',
          details: `This task is used in ${task._count.projectMilestoneTasks} project template(s).`
        },
        { status: 409 }
      )
    }

    await prisma.task.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}