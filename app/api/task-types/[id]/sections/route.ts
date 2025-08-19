import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  taskTypeSectionSchema, 
  createNotFoundError, 
  createValidationError 
} from '@/lib/validation'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskTypeId } = await params

    // Verify task type exists
    const taskType = await prisma.taskType.findUnique({
      where: { id: taskTypeId },
      select: { id: true, name: true }
    })

    if (!taskType) {
      return NextResponse.json(
        createNotFoundError('TaskType', taskTypeId),
        { status: 404 }
      )
    }

    const sections = await prisma.taskTypeSection.findMany({
      where: { taskTypeId },
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
    })

    return NextResponse.json({
      sections,
      taskType,
      meta: {
        total: sections.length,
        generatedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error fetching task type sections:', error)
    return NextResponse.json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch task type sections'
    }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskTypeId } = await params
    const body = await request.json()

    // Add taskTypeId to the body for validation
    const dataWithTaskTypeId = { ...body, taskTypeId }

    // Validate input
    const validationResult = taskTypeSectionSchema.safeParse(dataWithTaskTypeId)
    if (!validationResult.success) {
      return NextResponse.json(
        createValidationError('body', validationResult.error.issues[0].message),
        { status: 400 }
      )
    }

    // Verify task type exists
    const taskType = await prisma.taskType.findUnique({
      where: { id: taskTypeId }
    })

    if (!taskType) {
      return NextResponse.json(
        createNotFoundError('TaskType', taskTypeId),
        { status: 404 }
      )
    }

    const { name, sequence, description } = validationResult.data

    const section = await prisma.taskTypeSection.create({
      data: {
        taskTypeId,
        name,
        sequence,
        description: description || ''
      },
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
      }
    })

    return NextResponse.json(section, { status: 201 })
  } catch (error) {
    console.error('Error creating task type section:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({
        error: 'CONFLICT',
        message: 'Section name must be unique within task type'
      }, { status: 409 })
    }
    return NextResponse.json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to create task type section'
    }, { status: 500 })
  }
}