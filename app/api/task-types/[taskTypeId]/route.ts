import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  updateTaskTypeSchema, 
  createNotFoundError, 
  createValidationError,
  createConflictError 
} from '@/lib/validation'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskTypeId: string }> }
) {
  try {
    const { taskTypeId } = await params
    const { searchParams } = new URL(request.url)
    const includeSections = searchParams.get('includeSections') === 'true'

    const taskType = await prisma.taskType.findUnique({
      where: { id: taskTypeId },
      include: includeSections ? {
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
      } : undefined
    })

    if (!taskType) {
      return NextResponse.json(
        createNotFoundError('TaskType', taskTypeId),
        { status: 404 }
      )
    }

    return NextResponse.json(taskType)
  } catch (error) {
    console.error('Error fetching task type:', error)
    return NextResponse.json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch task type'
    }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ taskTypeId: string }> }
) {
  try {
    const { taskTypeId } = await params
    const body = await request.json()

    // Validate input
    const validationResult = updateTaskTypeSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        createValidationError('body', validationResult.error.issues[0].message),
        { status: 400 }
      )
    }

    // Check if task type exists
    const existingTaskType = await prisma.taskType.findUnique({
      where: { id: taskTypeId }
    })

    if (!existingTaskType) {
      return NextResponse.json(
        createNotFoundError('TaskType', taskTypeId),
        { status: 404 }
      )
    }

    const updatedTaskType = await prisma.taskType.update({
      where: { id: taskTypeId },
      data: validationResult.data,
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

    return NextResponse.json(updatedTaskType)
  } catch (error) {
    console.error('Error updating task type:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        createConflictError('Task type name must be unique'),
        { status: 409 }
      )
    }
    return NextResponse.json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to update task type'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ taskTypeId: string }> }
) {
  try {
    const { taskTypeId } = await params

    // Check if task type exists
    const existingTaskType = await prisma.taskType.findUnique({
      where: { id: taskTypeId },
      include: {
        _count: {
          select: {
            sections: true,
            tasks: true,
            projectTaskTypes: true
          }
        }
      }
    })

    if (!existingTaskType) {
      return NextResponse.json(
        createNotFoundError('TaskType', taskTypeId),
        { status: 404 }
      )
    }

    // Check if task type is in use
    if (existingTaskType._count.projectTaskTypes > 0) {
      return NextResponse.json(
        createConflictError('Cannot delete task type that is assigned to projects'),
        { status: 409 }
      )
    }

    // Delete the task type (cascading will handle sections and tasks)
    await prisma.taskType.delete({
      where: { id: taskTypeId }
    })

    return NextResponse.json({ 
      message: 'Task type deleted successfully',
      deletedId: taskTypeId
    })
  } catch (error) {
    console.error('Error deleting task type:', error)
    return NextResponse.json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to delete task type'
    }, { status: 500 })
  }
}