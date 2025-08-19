import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET endpoint for individual project with full details
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        // New model relationships
        supplierProjectInstances: {
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
                supplierNumber: true,
                location: true,
                contacts: true
              }
            },
            supplierTaskInstances: {
              where: { isApplied: true },
              include: {
                projectMilestoneTask: {
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
                }
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
            supplierTaskInstances: {
              include: {
                supplierProjectInstance: {
                  include: {
                    supplier: {
                      select: {
                        name: true,
                        supplierNumber: true
                      }
                    }
                  }
                }
              }
            }
          },
          orderBy: [
            { milestone: { taskType: { category: 'asc' } } },
            { milestone: { sequence: 'asc' } },
            { task: { sequence: 'asc' } }
          ]
        },
        // Keep old relationships for backward compatibility
        supplierProjects: {
          include: {
            supplier: {
              select: {
                id: true,
                name: true
              }
            },
            taskInstances: true
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

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Calculate comprehensive statistics
    const newModelTasks = project.supplierProjectInstances.flatMap(spi => 
      spi.supplierTaskInstances
    )
    const oldModelTasks = project.supplierProjects.flatMap(sp => sp.taskInstances)
    const allTasks = newModelTasks.length > 0 ? newModelTasks : oldModelTasks

    const stats = {
      totalSuppliers: project.supplierProjectInstances.length || project.supplierProjects.length,
      totalTemplates: project.projectMilestoneTasks.length || project.taskTemplates.length,
      totalTasks: allTasks.length,
      statusBreakdown: {
        not_started: allTasks.filter(t => t.status === 'not_started').length,
        in_progress: allTasks.filter(t => t.status === 'in_progress').length,
        completed: allTasks.filter(t => t.status === 'completed').length,
        blocked: allTasks.filter(t => t.status === 'blocked').length,
        cancelled: allTasks.filter(t => t.status === 'cancelled').length
      },
      overdueTasks: allTasks.filter(t => {
        if (t.status === 'completed') return false
        const dueDate = t.actualDueDate || t.dueDate || t.actualDue
        return dueDate && new Date(dueDate) < new Date()
      }).length
    }

    const enhancedProject = {
      ...project,
      stats,
      completionRatio: stats.totalTasks > 0 ? (stats.statusBreakdown.completed / stats.totalTasks) * 100 : 0,
      // Parse contacts in suppliers
      supplierProjectInstances: project.supplierProjectInstances.map(spi => ({
        ...spi,
        supplier: {
          ...spi.supplier,
          parsedContacts: spi.supplier.contacts ? JSON.parse(spi.supplier.contacts) : null
        }
      }))
    }

    return NextResponse.json(enhancedProject)
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      )
    }

    const project = await prisma.project.update({
      where: { id: params.id },
      data: {
        name,
        description: description || ''
      },
      include: {
        supplierProjects: {
          include: {
            supplier: {
              select: {
                name: true
              }
            }
          }
        },
        taskTemplates: {
          include: {
            taskType: {
              select: {
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
    console.error('Error updating project:', error)
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.project.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
  }
}