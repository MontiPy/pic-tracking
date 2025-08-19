import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeMilestones = searchParams.get('includeMilestones') === 'true'
    const category = searchParams.get('category')

    // Build where clause for category filter
    const whereClause = category ? { category } : {}

    if (!includeMilestones) {
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

    // Enhanced query with milestones and tasks
    const taskTypes = await prisma.taskType.findMany({
      where: whereClause,
      include: {
        milestones: {
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
        },
        _count: {
          select: {
            milestones: true
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
        includeMilestones,
        generatedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error fetching task types:', error)
    return NextResponse.json({ error: 'Failed to fetch task types' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, category, description } = body

    if (!name || !category) {
      return NextResponse.json(
        { error: 'Name and category are required' },
        { status: 400 }
      )
    }

    // Validate category against manufacturing categories
    const validCategories = [
      'Part Approval',
      'Production Readiness', 
      'New Model Builds',
      'General'
    ]

    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { 
          error: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
          validCategories 
        },
        { status: 400 }
      )
    }

    const taskType = await prisma.taskType.create({
      data: {
        name,
        category,
        description: description || ''
      },
      include: {
        milestones: {
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
            }
          },
          orderBy: { sequence: 'asc' }
        },
        _count: {
          select: {
            milestones: true
          }
        }
      }
    })

    return NextResponse.json(taskType)
  } catch (error) {
    console.error('Error creating task type:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Task type name must be unique' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Failed to create task type' }, { status: 500 })
  }
}

