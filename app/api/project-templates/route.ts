import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET endpoint for project milestone task templates
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const includeInstances = searchParams.get('includeInstances') === 'true'

    // Build where clause for project filter
    const whereClause = projectId ? { projectId } : {}

    if (!includeInstances) {
      const templates = await prisma.projectMilestoneTask.findMany({
        where: whereClause,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
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
          task: {
            select: {
              id: true,
              name: true,
              description: true,
              sequence: true,
              isRequired: true
            }
          }
        },
        orderBy: [
          { project: { name: 'asc' } },
          { milestone: { taskType: { category: 'asc' } } },
          { milestone: { sequence: 'asc' } },
          { task: { sequence: 'asc' } }
        ]
      })
      return NextResponse.json(templates)
    }

    // Enhanced query with supplier task instances
    const templates = await prisma.projectMilestoneTask.findMany({
      where: whereClause,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
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
        task: {
          select: {
            id: true,
            name: true,
            description: true,
            sequence: true,
            isRequired: true
          }
        },
        supplierTaskInstances: {
          include: {
            supplierProjectInstance: {
              include: {
                supplier: {
                  select: {
                    id: true,
                    name: true,
                    supplierNumber: true
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            supplierTaskInstances: true
          }
        }
      },
      orderBy: [
        { project: { name: 'asc' } },
        { milestone: { taskType: { category: 'asc' } } },
        { milestone: { sequence: 'asc' } },
        { task: { sequence: 'asc' } }
      ]
    })

    // Add statistics
    const templatesWithStats = templates.map(template => {
      const appliedInstances = template.supplierTaskInstances.filter(sti => sti.isApplied)
      
      return {
        ...template,
        stats: {
          totalSuppliers: template.supplierTaskInstances.length,
          appliedSuppliers: appliedInstances.length,
          completedSuppliers: appliedInstances.filter(sti => sti.status === 'completed').length,
          overdueSuppliers: appliedInstances.filter(sti => {
            if (sti.status === 'completed') return false
            const dueDate = sti.actualDueDate || sti.dueDate
            return dueDate && new Date(dueDate) < new Date()
          }).length
        }
      }
    })

    return NextResponse.json({
      templates: templatesWithStats,
      meta: {
        total: templates.length,
        projects: [...new Set(templates.map(t => t.project.name))],
        categories: [...new Set(templates.map(t => t.milestone.taskType.category))],
        includeInstances,
        generatedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error fetching project templates:', error)
    return NextResponse.json({ error: 'Failed to fetch project templates' }, { status: 500 })
  }
}

// POST endpoint for creating new project milestone task templates
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { projectId, milestoneId, taskId, dueDate, notes, isActive = true } = body

    if (!projectId || !milestoneId || !taskId || !dueDate) {
      return NextResponse.json(
        { error: 'ProjectId, milestoneId, taskId, and dueDate are required' },
        { status: 400 }
      )
    }

    // Validate entities exist
    const [project, milestone, task] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId } }),
      prisma.milestone.findUnique({ where: { id: milestoneId } }),
      prisma.task.findUnique({ where: { id: taskId } })
    ])

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Validate that task belongs to milestone
    if (task.milestoneId !== milestoneId) {
      return NextResponse.json(
        { error: 'Task does not belong to the specified milestone' },
        { status: 400 }
      )
    }

    const template = await prisma.projectMilestoneTask.create({
      data: {
        projectId,
        milestoneId,
        taskId,
        dueDate: new Date(dueDate),
        notes,
        isActive
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
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
        task: {
          select: {
            id: true,
            name: true,
            description: true,
            sequence: true,
            isRequired: true
          }
        },
        _count: {
          select: {
            supplierTaskInstances: true
          }
        }
      }
    })

    // Automatically create supplier task instances for existing supplier project instances
    const supplierProjectInstances = await prisma.supplierProjectInstance.findMany({
      where: { projectId }
    })

    if (supplierProjectInstances.length > 0) {
      await prisma.supplierTaskInstance.createMany({
        data: supplierProjectInstances.map(spi => ({
          supplierProjectInstanceId: spi.id,
          projectMilestoneTaskId: template.id,
          dueDate: template.dueDate,
          status: 'not_started',
          isApplied: true
        }))
      })
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error creating project template:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Project milestone task template already exists' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Failed to create project template' }, { status: 500 })
  }
}