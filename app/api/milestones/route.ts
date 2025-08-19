import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET endpoint for milestones with optional filtering
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const taskTypeId = searchParams.get('taskTypeId')
    const includeTasks = searchParams.get('includeTasks') === 'true'
    const includeUsage = searchParams.get('includeUsage') === 'true'

    // Build where clause for task type filter
    const whereClause = taskTypeId ? { taskTypeId } : {}

    if (!includeTasks && !includeUsage) {
      const milestones = await prisma.milestone.findMany({
        where: whereClause,
        include: {
          taskType: {
            select: {
              id: true,
              name: true,
              category: true
            }
          }
        },
        orderBy: [
          { taskType: { category: 'asc' } },
          { taskType: { name: 'asc' } },
          { sequence: 'asc' }
        ]
      })
      return NextResponse.json(milestones)
    }

    // Enhanced query with tasks and usage statistics
    const milestones = await prisma.milestone.findMany({
      where: whereClause,
      include: {
        taskType: {
          select: {
            id: true,
            name: true,
            category: true
          }
        },
        ...(includeTasks && {
          tasks: {
            select: {
              id: true,
              name: true,
              description: true,
              sequence: true,
              isRequired: true
            },
            orderBy: { sequence: 'asc' }
          }
        }),
        _count: {
          select: {
            tasks: true,
            projectMilestoneTasks: true
          }
        },
        ...(includeUsage && {
          projectMilestoneTasks: {
            select: {
              id: true,
              projectId: true,
              dueDate: true,
              isActive: true,
              project: {
                select: {
                  name: true
                }
              }
            }
          }
        })
      },
      orderBy: [
        { taskType: { category: 'asc' } },
        { taskType: { name: 'asc' } },
        { sequence: 'asc' }
      ]
    })

    return NextResponse.json({
      milestones,
      meta: {
        total: milestones.length,
        taskTypes: [...new Set(milestones.map(m => m.taskType.name))],
        categories: [...new Set(milestones.map(m => m.taskType.category))],
        includeTasks,
        includeUsage,
        generatedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error fetching milestones:', error)
    return NextResponse.json({ error: 'Failed to fetch milestones' }, { status: 500 })
  }
}

// POST endpoint for creating new milestones
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { taskTypeId, code, name, description, sequence, isRequired = true } = body

    if (!taskTypeId || !code || !name) {
      return NextResponse.json(
        { error: 'TaskTypeId, code, and name are required' },
        { status: 400 }
      )
    }

    // Validate task type exists
    const taskType = await prisma.taskType.findUnique({
      where: { id: taskTypeId }
    })

    if (!taskType) {
      return NextResponse.json(
        { error: 'Task type not found' },
        { status: 404 }
      )
    }

    // Auto-assign sequence if not provided
    let finalSequence = sequence
    if (!finalSequence) {
      const lastMilestone = await prisma.milestone.findFirst({
        where: { taskTypeId },
        orderBy: { sequence: 'desc' }
      })
      finalSequence = (lastMilestone?.sequence || 0) + 1
    }

    const milestone = await prisma.milestone.create({
      data: {
        taskTypeId,
        code,
        name,
        description,
        sequence: finalSequence,
        isRequired
      },
      include: {
        taskType: {
          select: {
            id: true,
            name: true,
            category: true
          }
        },
        tasks: {
          select: {
            id: true,
            name: true,
            description: true,
            sequence: true,
            isRequired: true
          },
          orderBy: { sequence: 'asc' }
        },
        _count: {
          select: {
            tasks: true,
            projectMilestoneTasks: true
          }
        }
      }
    })

    return NextResponse.json(milestone)
  } catch (error) {
    console.error('Error creating milestone:', error)
    if (error.code === 'P2002') {
      // Check if it's the unique constraint on taskTypeId + code
      if (error.meta?.target?.includes('code')) {
        return NextResponse.json(
          { error: 'Milestone code must be unique within the task type' },
          { status: 409 }
        )
      }
    }
    return NextResponse.json({ error: 'Failed to create milestone' }, { status: 500 })
  }
}
