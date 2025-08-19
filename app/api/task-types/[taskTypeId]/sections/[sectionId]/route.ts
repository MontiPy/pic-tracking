import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  updateTaskTypeSectionSchema, 
  createNotFoundError, 
  createValidationError,
  createConflictError 
} from '@/lib/validation'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskTypeId: string; sectionId: string }> }
) {
  try {
    const { taskTypeId, sectionId } = await params

    const section = await prisma.taskTypeSection.findUnique({
      where: {
        id: sectionId,
        taskTypeId
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
        taskType: {
          select: {
            id: true,
            name: true,
            category: true
          }
        },
        _count: {
          select: { tasks: true }
        }
      }
    })

    if (!section) {
      return NextResponse.json(
        createNotFoundError('TaskTypeSection', sectionId),
        { status: 404 }
      )
    }

    return NextResponse.json(section)
  } catch (error) {
    console.error('Error fetching task type section:', error)
    return NextResponse.json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch task type section'
    }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ taskTypeId: string; sectionId: string }> }
) {
  try {
    const { taskTypeId, sectionId } = await params
    const body = await request.json()

    // Validate input
    const validationResult = updateTaskTypeSectionSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        createValidationError('body', validationResult.error.issues[0].message),
        { status: 400 }
      )
    }

    // Check if section exists and belongs to the task type
    const existingSection = await prisma.taskTypeSection.findUnique({
      where: {
        id: sectionId,
        taskTypeId
      }
    })

    if (!existingSection) {
      return NextResponse.json(
        createNotFoundError('TaskTypeSection', sectionId),
        { status: 404 }
      )
    }

    const updatedSection = await prisma.taskTypeSection.update({
      where: { id: sectionId },
      data: validationResult.data,
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
        taskType: {
          select: {
            id: true,
            name: true,
            category: true
          }
        },
        _count: {
          select: { tasks: true }
        }
      }
    })

    return NextResponse.json(updatedSection)
  } catch (error) {
    console.error('Error updating task type section:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        createConflictError('Section name must be unique within task type'),
        { status: 409 }
      )
    }
    return NextResponse.json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to update task type section'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ taskTypeId: string; sectionId: string }> }
) {
  try {
    const { taskTypeId, sectionId } = await params

    // Check if section exists and belongs to the task type
    const existingSection = await prisma.taskTypeSection.findUnique({
      where: {
        id: sectionId,
        taskTypeId
      },
      include: {
        _count: {
          select: { tasks: true }
        }
      }
    })

    if (!existingSection) {
      return NextResponse.json(
        createNotFoundError('TaskTypeSection', sectionId),
        { status: 404 }
      )
    }

    // Check if section has tasks
    if (existingSection._count.tasks > 0) {
      return NextResponse.json(
        createConflictError('Cannot delete section that contains tasks'),
        { status: 409 }
      )
    }

    // Delete the section
    await prisma.taskTypeSection.delete({
      where: { id: sectionId }
    })

    return NextResponse.json({ 
      message: 'Task type section deleted successfully',
      deletedId: sectionId
    })
  } catch (error) {
    console.error('Error deleting task type section:', error)
    return NextResponse.json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to delete task type section'
    }, { status: 500 })
  }
}