import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  projectTaskTypeSchema, 
  createNotFoundError, 
  createValidationError,
  createConflictError 
} from '@/lib/validation'
import { createSupplierTaskInstances } from '@/lib/due-date-propagation'

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true }
    })

    if (!project) {
      return NextResponse.json(
        createNotFoundError('Project', projectId),
        { status: 404 }
      )
    }

    const projectTaskTypes = await prisma.projectTaskType.findMany({
      where: { projectId },
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
            },
            _count: {
              select: {
                sections: true,
                tasks: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json({
      projectTaskTypes,
      project,
      meta: {
        total: projectTaskTypes.length,
        generatedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error fetching project task types:', error)
    return NextResponse.json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch project task types'
    }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params
    const body = await request.json()

    // Add projectId to the body for validation
    const dataWithProjectId = { ...body, projectId }

    // Validate input
    const validationResult = projectTaskTypeSchema.safeParse(dataWithProjectId)
    if (!validationResult.success) {
      return NextResponse.json(
        createValidationError('body', validationResult.error.issues[0].message),
        { status: 400 }
      )
    }

    const { taskTypeId, isActive } = validationResult.data

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    })

    if (!project) {
      return NextResponse.json(
        createNotFoundError('Project', projectId),
        { status: 404 }
      )
    }

    // Verify task type exists
    const taskType = await prisma.taskType.findUnique({
      where: { id: taskTypeId },
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
                    isRequired: true,
                    defaultOwner: true,
                    defaultNotes: true
                  },
                  orderBy: { sequence: 'asc' }
                }
              },
              where: { parentTaskId: null },
              orderBy: { sequence: 'asc' }
            }
          },
          orderBy: { sequence: 'asc' }
        }
      }
    })

    if (!taskType) {
      return NextResponse.json(
        createNotFoundError('TaskType', taskTypeId),
        { status: 404 }
      )
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Create ProjectTaskType association
      const projectTaskType = await tx.projectTaskType.create({
        data: {
          projectId,
          taskTypeId,
          isActive
        }
      })

      // Create ProjectTaskTemplate entries for all tasks in the task type
      const allTasks = taskType.sections.flatMap(section => 
        section.tasks.flatMap(task => [
          task,
          ...task.subTasks
        ])
      )

      const templatePromises = allTasks.map(task => 
        tx.projectTaskTemplate.create({
          data: {
            projectId,
            taskId: task.id,
            sectionId: task.sectionId,
            dueDate: new Date(), // Default to today, should be updated later
            owner: task.defaultOwner,
            notes: task.defaultNotes,
            isActive: true
          }
        })
      )

      const templates = await Promise.all(templatePromises)

      return { projectTaskType, templates }
    })

    // Auto-generate SupplierTaskInstances for existing suppliers
    const supplierProjectInstances = await prisma.supplierProjectInstance.findMany({
      where: { projectId }
    })

    for (const spi of supplierProjectInstances) {
      try {
        await createSupplierTaskInstances(spi.supplierId, projectId)
      } catch (error) {
        console.error(`Failed to create supplier task instances for supplier ${spi.supplierId}:`, error)
      }
    }

    // Return the created association with full details
    const createdProjectTaskType = await prisma.projectTaskType.findUnique({
      where: { id: result.projectTaskType.id },
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

    return NextResponse.json({
      ...createdProjectTaskType,
      materialized: {
        templates: result.templates.length,
        supplierInstances: supplierProjectInstances.length
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating project task type:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        createConflictError('Task type already associated with this project'),
        { status: 409 }
      )
    }
    return NextResponse.json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to create project task type association'
    }, { status: 500 })
  }
}