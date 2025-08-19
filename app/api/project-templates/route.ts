import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createValidationError } from '@/lib/validation'

// GET endpoint for project task templates (V2 and legacy support)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const taskTypeId = searchParams.get('taskTypeId')
    const sectionId = searchParams.get('sectionId')
    const includeInstances = searchParams.get('includeInstances') === 'true'
    const legacyMode = searchParams.get('legacyMode') === 'true'

    // Build where clause for filtering
    let whereClause: any = {}
    
    if (projectId) {
      whereClause.projectId = projectId
    }
    
    if (taskTypeId) {
      whereClause.task = {
        taskTypeId
      }
    }
    
    if (sectionId) {
      whereClause.sectionId = sectionId
    }

    const includeConfig = {
      project: {
        select: {
          id: true,
          name: true,
          description: true
        }
      },
      task: {
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
          }
        }
      }
    }

    if (!includeInstances) {
      // Get V2 templates
      const v2Templates = await prisma.projectTaskTemplate.findMany({
        where: whereClause,
        include: includeConfig,
        orderBy: [
          { project: { name: 'asc' } },
          { task: { taskType: { category: 'asc' } } },
          { task: { section: { sequence: 'asc' } } },
          { task: { sequence: 'asc' } }
        ]
      })

      // Get legacy templates if in legacy mode
      let legacyTemplates = []
      if (legacyMode) {
        legacyTemplates = await prisma.projectMilestoneTask.findMany({
          where: projectId ? { projectId } : {},
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
      }

      return NextResponse.json({
        v2Templates,
        legacyTemplates,
        meta: {
          totalV2: v2Templates.length,
          totalLegacy: legacyTemplates.length,
          legacyMode
        }
      })
    }

    // Enhanced query with supplier task instances
    const usageIncludeConfig = {
      ...includeConfig,
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
    }

    const templates = await prisma.projectTaskTemplate.findMany({
      where: whereClause,
      include: usageIncludeConfig,
      orderBy: [
        { project: { name: 'asc' } },
        { task: { taskType: { category: 'asc' } } },
        { task: { section: { sequence: 'asc' } } },
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
          approvedSuppliers: appliedInstances.filter(sti => sti.status === 'approved').length,
          overdueSuppliers: appliedInstances.filter(sti => {
            if (['completed', 'approved'].includes(sti.status)) return false
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
        sections: [...new Set(templates.map(t => t.task.section?.name).filter(Boolean))],
        categories: [...new Set(templates.map(t => t.task.taskType.category))],
        includeInstances,
        generatedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error fetching project templates:', error)
    return NextResponse.json({ 
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch project templates' 
    }, { status: 500 })
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
