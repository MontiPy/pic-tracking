import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  createNotFoundError,
  createConflictError 
} from '@/lib/validation'

export async function DELETE(
  request: Request,
  { params }: { params: { projectId: string; taskTypeId: string } }
) {
  try {
    const { projectId, taskTypeId } = params

    // Check if the association exists
    const projectTaskType = await prisma.projectTaskType.findUnique({
      where: {
        projectId_taskTypeId: {
          projectId,
          taskTypeId
        }
      },
      include: {
        taskType: {
          include: {
            tasks: {
              include: {
                _count: {
                  select: {
                    projectTaskTemplates: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!projectTaskType) {
      return NextResponse.json(
        createNotFoundError('ProjectTaskType', `${projectId}-${taskTypeId}`),
        { status: 404 }
      )
    }

    // Check if there are any supplier task instances that would be affected
    const supplierTaskInstanceCount = await prisma.supplierTaskInstance.count({
      where: {
        projectTaskTemplate: {
          projectId,
          task: {
            taskTypeId
          }
        }
      }
    })

    if (supplierTaskInstanceCount > 0) {
      return NextResponse.json(
        createConflictError(`Cannot remove task type from project. ${supplierTaskInstanceCount} supplier task instances exist.`),
        { status: 409 }
      )
    }

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Delete ProjectTaskTemplates
      await tx.projectTaskTemplate.deleteMany({
        where: {
          projectId,
          task: {
            taskTypeId
          }
        }
      })

      // Delete the ProjectTaskType association
      await tx.projectTaskType.delete({
        where: {
          projectId_taskTypeId: {
            projectId,
            taskTypeId
          }
        }
      })
    })

    return NextResponse.json({ 
      message: 'Task type removed from project successfully',
      deletedProjectId: projectId,
      deletedTaskTypeId: taskTypeId
    })
  } catch (error) {
    console.error('Error removing project task type:', error)
    return NextResponse.json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to remove task type from project'
    }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { projectId: string; taskTypeId: string } }
) {
  try {
    const { projectId, taskTypeId } = params
    const body = await request.json()
    const { isActive } = body

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({
        error: 'VALIDATION_ERROR',
        message: 'isActive must be a boolean value',
        field: 'isActive'
      }, { status: 400 })
    }

    // Check if the association exists
    const existingProjectTaskType = await prisma.projectTaskType.findUnique({
      where: {
        projectId_taskTypeId: {
          projectId,
          taskTypeId
        }
      }
    })

    if (!existingProjectTaskType) {
      return NextResponse.json(
        createNotFoundError('ProjectTaskType', `${projectId}-${taskTypeId}`),
        { status: 404 }
      )
    }

    // Update the association
    const updatedProjectTaskType = await prisma.projectTaskType.update({
      where: {
        projectId_taskTypeId: {
          projectId,
          taskTypeId
        }
      },
      data: { isActive },
      include: {
        taskType: {
          include: {
            sections: {
              include: {
                tasks: {
                  include: {
                    subTasks: {
                      select: {
                        id: true,
                        name: true,
                        sequence: true,
                        isRequired: true
                      },
                      orderBy: { sequence: 'asc' }
                    },
                    projectTaskTemplates: {
                      where: { projectId },
                      select: {
                        id: true,
                        dueDate: true,
                        owner: true,
                        notes: true,
                        isActive: true
                      }
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
            }
          }
        }
      }
    })

    // If deactivating, also deactivate related ProjectTaskTemplates
    if (!isActive) {
      await prisma.projectTaskTemplate.updateMany({
        where: {
          projectId,
          task: {
            taskTypeId
          }
        },
        data: { isActive: false }
      })
    }

    return NextResponse.json(updatedProjectTaskType)
  } catch (error) {
    console.error('Error updating project task type:', error)
    return NextResponse.json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to update project task type'
    }, { status: 500 })
  }
}