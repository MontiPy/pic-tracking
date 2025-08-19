import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET endpoint for tasks with optional filtering
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const milestoneId = searchParams.get('milestoneId')
    const includeUsage = searchParams.get('includeUsage') === 'true'

    // Build where clause for milestone filter
    const whereClause = milestoneId ? { milestoneId } : {}

    if (!includeUsage) {
      const tasks = await prisma.task.findMany({
        where: whereClause,
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
          }
        },
        orderBy: [
          { milestone: { taskType: { category: 'asc' } } },
          { milestone: { taskType: { name: 'asc' } } },
          { milestone: { sequence: 'asc' } },
          { sequence: 'asc' }
        ]
      })
      return NextResponse.json(tasks)
    }

    // Enhanced query with usage statistics
    const tasks = await prisma.task.findMany({
      where: whereClause,
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
        projectMilestoneTasks: {
          include: {
            project: {
              select: {
                id: true,
                name: true
              }
            },
            supplierTaskInstances: {
              select: {
                id: true,
                status: true,
                dueDate: true,
                isApplied: true,
                supplierProjectInstance: {
                  select: {
                    supplier: {
                      select: {
                        name: true
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
      },
      orderBy: [
        { milestone: { taskType: { category: 'asc' } } },
        { milestone: { taskType: { name: 'asc' } } },
        { milestone: { sequence: 'asc' } },
        { sequence: 'asc' }
      ]
    })

    // Add usage statistics
    const tasksWithStats = tasks.map(task => {
      const allInstances = task.projectMilestoneTasks.flatMap(pmt => pmt.supplierTaskInstances)
      const appliedInstances = allInstances.filter(sti => sti.isApplied)
      
      return {
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
          }
        }
      }
    })

    return NextResponse.json({
      tasks: tasksWithStats,
      meta: {
        total: tasks.length,
        milestones: [...new Set(tasks.map(t => t.milestone.name))],
        categories: [...new Set(tasks.map(t => t.milestone.taskType.category))],
        includeUsage,
        generatedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

// POST endpoint for creating new tasks
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { milestoneId, name, description, sequence, isRequired = true } = body

    if (!milestoneId || !name) {
      return NextResponse.json(
        { error: 'MilestoneId and name are required' },
        { status: 400 }
      )
    }

    // Validate milestone exists
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        taskType: {
          select: {
            name: true,
            category: true
          }
        }
      }
    })

    if (!milestone) {
      return NextResponse.json(
        { error: 'Milestone not found' },
        { status: 404 }
      )
    }

    // Auto-assign sequence if not provided
    let finalSequence = sequence
    if (!finalSequence) {
      const lastTask = await prisma.task.findFirst({
        where: { milestoneId },
        orderBy: { sequence: 'desc' }
      })
      finalSequence = (lastTask?.sequence || 0) + 1
    }

    const task = await prisma.task.create({
      data: {
        milestoneId,
        name,
        description,
        sequence: finalSequence,
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
    console.error('Error creating task:', error)
    if (error.code === 'P2002') {
      // Check if it's the unique constraint on milestoneId + name
      if (error.meta?.target?.includes('name')) {
        return NextResponse.json(
          { error: 'Task name must be unique within the milestone' },
          { status: 409 }
        )
      }
    }
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}