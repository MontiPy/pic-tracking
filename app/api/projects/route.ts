import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createProjectSchema } from '@/lib/validation'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeTemplates = searchParams.get('includeTemplates') === 'true'
    const includeSuppliers = searchParams.get('includeSuppliers') === 'true'

    const projects = await prisma.project.findMany({
      include: {
        // New model relationships
        supplierProjectInstances: includeSuppliers ? {
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
                supplierNumber: true,
                location: true
              }
            },
            supplierTaskInstances: {
              where: { isApplied: true },
              select: {
                id: true,
                status: true,
                dueDate: true,
                completedAt: true
              }
            }
          }
        } : false,
        projectMilestoneTasks: includeTemplates ? {
          include: {
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
                sequence: true
              }
            },
            _count: {
              select: {
                supplierTaskInstances: true
              }
            }
          },
          orderBy: [
            { milestone: { taskType: { category: 'asc' } } },
            { milestone: { sequence: 'asc' } },
            { task: { sequence: 'asc' } }
          ]
        } : false,
        // Keep old relationships for backward compatibility
        supplierProjects: {
          include: {
            supplier: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        taskTemplates: {
          include: {
            taskType: {
              select: {
                id: true,
                name: true,
                category: true
              }
            }
          },
          orderBy: {
            canonicalDue: 'asc'
          }
        },
        _count: {
          select: {
            supplierProjectInstances: true,
            projectMilestoneTasks: true,
            supplierProjects: true,
            taskTemplates: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Add statistics for each project
    const projectsWithStats = projects.map(project => {
      // Calculate stats from new model
      const newModelTasks = project.supplierProjectInstances?.flatMap(spi => 
        spi.supplierTaskInstances
      ) || []
      
      // Fallback to old model
      const oldModelTasks = project.supplierProjects?.flatMap(sp => 
        sp.taskInstances || []
      ) || []
      
      const allTasks = newModelTasks.length > 0 ? newModelTasks : oldModelTasks
      
      const stats = {
        totalSuppliers: project._count.supplierProjectInstances || project._count.supplierProjects,
        totalTemplates: project._count.projectMilestoneTasks || project._count.taskTemplates,
        totalTasks: allTasks.length,
        completedTasks: allTasks.filter(t => t.status === 'completed').length,
        overdueTasks: allTasks.filter(t => {
          if (t.status === 'completed') return false
          const dueDate = t.actualDueDate || t.dueDate || t.actualDue
          return dueDate && new Date(dueDate) < new Date()
        }).length
      }

      return {
        ...project,
        stats,
        completionRatio: stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0
      }
    })

    return NextResponse.json({
      projects: projectsWithStats,
      meta: {
        total: projects.length,
        includeTemplates,
        includeSuppliers,
        generatedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = createProjectSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.flatten() }, { status: 400 })
    }
    const { name, description } = parsed.data

    if (!name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      )
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: description || ''
      },
      include: {
        // New model relationships
        supplierProjectInstances: {
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
                supplierNumber: true
              }
            }
          }
        },
        projectMilestoneTasks: {
          include: {
            milestone: {
              include: {
                taskType: {
                  select: {
                    name: true,
                    category: true
                  }
                }
              }
            },
            task: {
              select: {
                name: true,
                description: true
              }
            }
          }
        },
        // Keep old relationships for backward compatibility
        supplierProjects: {
          include: {
            supplier: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        taskTemplates: {
          include: {
            taskType: {
              select: {
                id: true,
                name: true,
                category: true
              }
            }
          },
          orderBy: {
            canonicalDue: 'asc'
          }
        }
      }
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
