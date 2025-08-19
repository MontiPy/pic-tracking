import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createNotFoundError, createValidationError } from '@/lib/validation'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeSections = searchParams.get('includeSections') === 'true'
    const includeMilestones = searchParams.get('includeMilestones') === 'true' // legacy support
    const category = searchParams.get('category')

    // Build where clause for category filter
    const whereClause = category ? { category } : {}

    // Support both new sections and legacy milestones
    const includeDetails = includeSections || includeMilestones

    if (!includeDetails) {
      const taskTypes = await prisma.taskType.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          category: true,
          description: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: [
          { category: 'asc' },
          { name: 'asc' }
        ]
      })
      return NextResponse.json(taskTypes)
    }

    // Enhanced query with sections/milestones and tasks
    const taskTypes = await prisma.taskType.findMany({
      where: whereClause,
      include: {
        // V2 sections
        sections: {
          include: {
            tasks: {
              include: {
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
                }
              },
              where: { parentTaskId: null }, // Only parent tasks
              orderBy: { sequence: 'asc' }
            },
            _count: {
              select: { tasks: true }
            }
          },
          orderBy: { sequence: 'asc' }
        },
        // Legacy milestones (for backward compatibility)
        milestones: includeMilestones ? {
          include: {
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
          },
          orderBy: { sequence: 'asc' }
        } : false,
        _count: {
          select: {
            sections: true,
            milestones: true,
            tasks: true
          }
        }
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json({
      taskTypes,
      meta: {
        total: taskTypes.length,
        categories: [...new Set(taskTypes.map(tt => tt.category))],
        includeSections,
        includeMilestones: includeMilestones || false,
        generatedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error fetching task types:', error)
    return NextResponse.json({ 
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch task types' 
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { taskTypeSchema } = await import('@/lib/validation')
    
    // Validate input
    const validationResult = taskTypeSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        createValidationError('body', validationResult.error.issues[0].message),
        { status: 400 }
      )
    }

    const { name, category, description } = validationResult.data

    const taskType = await prisma.taskType.create({
      data: {
        name,
        category,
        description: description || ''
      },
      include: {
        sections: {
          include: {
            tasks: {
              include: {
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
                }
              },
              where: { parentTaskId: null },
              orderBy: { sequence: 'asc' }
            },
            _count: {
              select: { tasks: true }
            }
          },
          orderBy: { sequence: 'asc' }
        },
        _count: {
          select: {
            sections: true,
            tasks: true
          }
        }
      }
    })

    return NextResponse.json(taskType, { status: 201 })
  } catch (error) {
    console.error('Error creating task type:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { 
          error: 'CONFLICT',
          message: 'Task type name must be unique' 
        },
        { status: 409 }
      )
    }
    return NextResponse.json({ 
      error: 'INTERNAL_ERROR',
      message: 'Failed to create task type' 
    }, { status: 500 })
  }
}
