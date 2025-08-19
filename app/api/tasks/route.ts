import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createValidationError } from '@/lib/validation'

// GET endpoint for tasks with optional filtering (V2 and legacy support)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const taskTypeId = searchParams.get('taskTypeId')
    const sectionId = searchParams.get('sectionId')
    const milestoneId = searchParams.get('milestoneId') // legacy support
    const includeSubTasks = searchParams.get('includeSubTasks') === 'true'
    const includeUsage = searchParams.get('includeUsage') === 'true'
    const parentOnly = searchParams.get('parentOnly') === 'true'

    // Build where clause for V2 filtering
    let whereClause: any = {}
    
    if (taskTypeId) {
      whereClause.taskTypeId = taskTypeId
    }
    
    if (sectionId) {
      whereClause.sectionId = sectionId
    }
    
    if (milestoneId) {
      whereClause.milestoneId = milestoneId // legacy support
    }
    
    if (parentOnly) {
      whereClause.parentTaskId = null
    }

    const includeConfig = {
      // V2 relationships
      taskType: {
        select: {
          id: true,
          name: true,
          category: true
        }
      },
      section: {
        select: {
          id: true,
          name: true,
          sequence: true
        }
      },
      parent: {
        select: {
          id: true,
          name: true,
          sequence: true
        }
      },
      // Legacy relationships
      milestone: milestoneId ? {
        include: {
          taskType: {
            select: {
              id: true,
              name: true,
              category: true
            }
          }
        }
      } : undefined
    }

    if (includeSubTasks) {
      includeConfig.subTasks = {
        select: {
          id: true,
          name: true,
          description: true,
          sequence: true,
          isRequired: true,
          defaultOwner: true,
          defaultNotes: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { sequence: 'asc' }
      }
    }

    if (!includeUsage) {
      const tasks = await prisma.task.findMany({
        where: whereClause,
        include: includeConfig,
        orderBy: [
          { taskType: { category: 'asc' } },
          { taskType: { name: 'asc' } },
          { section: { sequence: 'asc' } },
          { sequence: 'asc' }
        ]
      })
      return NextResponse.json(tasks)
    }

    // Enhanced query with usage statistics
    const usageIncludeConfig = {
      ...includeConfig,
      // V2 usage stats
      projectTaskTemplates: {
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
      // Legacy usage stats
      projectMilestoneTasks: milestoneId ? {
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
      } : undefined,
      _count: {
        select: {
          projectTaskTemplates: true,
          projectMilestoneTasks: true,
          subTasks: true
        }
      }
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: usageIncludeConfig,
      orderBy: [
        { taskType: { category: 'asc' } },
        { taskType: { name: 'asc' } },
        { section: { sequence: 'asc' } },
        { sequence: 'asc' }
      ]
    })

    // Add usage statistics (V2 and legacy)
    const tasksWithStats = tasks.map(task => {
      const allInstances = [
        ...(task.projectTaskTemplates?.flatMap(ptt => ptt.supplierTaskInstances) || []),
        ...(task.projectMilestoneTasks?.flatMap(pmt => pmt.supplierTaskInstances) || [])
      ]
      const appliedInstances = allInstances.filter(sti => sti.isApplied)
      
      return {
        ...task,
        usage: {
          totalProjects: (task.projectTaskTemplates?.length || 0) + (task.projectMilestoneTasks?.length || 0),
          totalSupplierInstances: allInstances.length,
          appliedInstances: appliedInstances.length,
          subTaskCount: task._count?.subTasks || 0,
          statusBreakdown: {
            not_started: appliedInstances.filter(sti => sti.status === 'not_started').length,
            in_progress: appliedInstances.filter(sti => sti.status === 'in_progress').length,
            completed: appliedInstances.filter(sti => sti.status === 'completed').length,
            submitted: appliedInstances.filter(sti => sti.status === 'submitted').length,
            approved: appliedInstances.filter(sti => sti.status === 'approved').length,
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
        sections: [...new Set(tasks.map(t => t.section?.name).filter(Boolean))],
        milestones: [...new Set(tasks.map(t => t.milestone?.name).filter(Boolean))],
        categories: [...new Set(tasks.map(t => t.taskType.category))],
        includeUsage,
        includeSubTasks,
        generatedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json({ 
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch tasks' 
    }, { status: 500 })
  }
}

// POST endpoint for creating new tasks (V2 with sub-task support)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { taskSchema } = await import('@/lib/validation')
    
    // Validate input
    const validationResult = taskSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        createValidationError('body', validationResult.error.issues[0].message),
        { status: 400 }
      )
    }

    const { 
      taskTypeId, 
      sectionId, 
      parentTaskId, 
      name, 
      description, 
      sequence, 
      defaultOwner, 
      defaultNotes, 
      isRequired 
    } = validationResult.data

    // Validate task type exists
    const taskType = await prisma.taskType.findUnique({ 
      where: { id: taskTypeId },
      select: { id: true, name: true, category: true }
    })
    if (!taskType) {
      return NextResponse.json(
        createValidationError('taskTypeId', 'Task type not found'),
        { status: 404 }
      )
    }

    // Validate section exists if provided
    if (sectionId) {
      const section = await prisma.taskTypeSection.findUnique({
        where: { id: sectionId, taskTypeId }
      })
      if (!section) {
        return NextResponse.json(
          createValidationError('sectionId', 'Section not found in specified task type'),
          { status: 404 }
        )
      }
    }

    // Validate parent task exists if provided (sub-task creation)
    if (parentTaskId) {
      const parentTask = await prisma.task.findUnique({
        where: { id: parentTaskId, taskTypeId }
      })
      if (!parentTask) {
        return NextResponse.json(
          createValidationError('parentTaskId', 'Parent task not found in specified task type'),
          { status: 404 }
        )
      }
      // Ensure parent task isn't already a sub-task (prevent nesting beyond 1 level)
      if (parentTask.parentTaskId) {
        return NextResponse.json(
          createValidationError('parentTaskId', 'Cannot create sub-task of a sub-task'),
          { status: 400 }
        )
      }
    }

    // Auto-assign sequence if not provided
    let finalSequence = sequence
    if (finalSequence === undefined) {
      const whereClause: any = { taskTypeId }
      if (sectionId) whereClause.sectionId = sectionId
      if (parentTaskId) whereClause.parentTaskId = parentTaskId
      
      const lastTask = await prisma.task.findFirst({
        where: whereClause,
        orderBy: { sequence: 'desc' }
      })
      finalSequence = (lastTask?.sequence || 0) + 1
    }

    const task = await prisma.task.create({
      data: {
        taskTypeId,
        sectionId,
        parentTaskId,
        name,
        description,
        sequence: finalSequence,
        defaultOwner,
        defaultNotes,
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
        section: {
          select: {
            id: true,
            name: true,
            sequence: true
          }
        },
        parent: {
          select: {
            id: true,
            name: true,
            sequence: true
          }
        },
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
        },
        _count: {
          select: {
            projectTaskTemplates: true,
            subTasks: true
          }
        }
      }
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Error creating task:', error)
    if (error.code === 'P2002') {
      // Check unique constraint violations
      if (error.meta?.target?.includes('name')) {
        return NextResponse.json({
          error: 'CONFLICT',
          message: 'Task name must be unique within the task type/parent'
        }, { status: 409 })
      }
    }
    return NextResponse.json({ 
      error: 'INTERNAL_ERROR',
      message: 'Failed to create task' 
    }, { status: 500 })
  }
}
