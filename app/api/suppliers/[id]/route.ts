import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Interface for supplier task statistics
interface TaskStats {
  total: number
  notStarted: number
  inProgress: number
  completed: number
  blocked: number
  cancelled: number
  completionRatio: number
  overdue: number
}

// Helper function to calculate task statistics
function calculateTaskStats(taskInstances: any[]): TaskStats {
  const now = new Date()
  const stats = {
    total: taskInstances.length,
    notStarted: 0,
    inProgress: 0,
    completed: 0,
    blocked: 0,
    cancelled: 0,
    completionRatio: 0,
    overdue: 0
  }

  taskInstances.forEach(task => {
    switch (task.status) {
      case 'not_started': stats.notStarted++; break
      case 'in_progress': stats.inProgress++; break
      case 'completed': stats.completed++; break
      case 'blocked': stats.blocked++; break
      case 'cancelled': stats.cancelled++; break
    }

    // Check if task is overdue (not completed and past due date)
    if (task.status !== 'completed' && task.actualDue && new Date(task.actualDue) < now) {
      stats.overdue++
    }
  })

  stats.completionRatio = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0
  return stats
}

// GET endpoint for individual supplier with enhanced data
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: params.id },
      include: {
        supplierProjectInstances: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                description: true
              }
            },
            supplierTaskInstances: {
              where: { isApplied: true },
              include: {
                projectMilestoneTask: {
                  select: {
                    id: true,
                    dueDate: true,
                    notes: true,
                    milestone: {
                      select: {
                        code: true,
                        name: true,
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
                        name: true,
                        description: true
                      }
                    }
                  }
                }
              },
              orderBy: [
                { status: 'asc' },
                { dueDate: 'asc' }
              ]
            }
          }
        },
        // Keep old relationships for backward compatibility
        supplierProjects: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                description: true
              }
            },
            taskInstances: {
              include: {
                taskTemplate: {
                  select: {
                    id: true,
                    canonicalDue: true,
                    description: true,
                    taskType: {
                      select: {
                        id: true,
                        name: true,
                        category: true
                      }
                    }
                  }
                }
              },
              orderBy: [
                { status: 'asc' }, // Show active tasks first
                { actualDue: 'asc' } // Then by due date
              ]
            }
          }
        }
      }
    })

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // Calculate comprehensive statistics using new model
    const newModelTasks = supplier.supplierProjectInstances.flatMap(spi =>
      spi.supplierTaskInstances.map(sti => ({
        id: sti.id,
        status: sti.status,
        actualDue: sti.actualDueDate || sti.dueDate,
        completedAt: sti.completedAt,
        updatedAt: sti.updatedAt
      }))
    )
    
    // Fallback to old model
    const oldModelTasks = supplier.supplierProjects.flatMap(sp => sp.taskInstances)
    const allTasks = newModelTasks.length > 0 ? newModelTasks : oldModelTasks
    const overallStats = calculateTaskStats(allTasks)
    
    // Calculate project-level stats for new model
    const newProjectsWithStats = supplier.supplierProjectInstances.map(spi => {
      const projectTasks = spi.supplierTaskInstances.map(sti => ({
        id: sti.id,
        status: sti.status,
        actualDue: sti.actualDueDate || sti.dueDate,
        completedAt: sti.completedAt,
        updatedAt: sti.updatedAt
      }))
      const projectStats = calculateTaskStats(projectTasks)
      
      // Recent activity (last 7 days)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const recentActivity = spi.supplierTaskInstances.filter(sti => 
        new Date(sti.updatedAt) > weekAgo
      )

      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      const upcomingTasks = spi.supplierTaskInstances.filter(sti => {
        if (sti.status === 'completed') return false
        const dueDate = sti.actualDueDate || sti.dueDate
        return dueDate && new Date(dueDate) <= nextWeek
      })

      return {
        ...spi,
        taskStats: projectStats,
        recentActivity: recentActivity.length,
        upcomingTasks: upcomingTasks.length
      }
    })

    // Keep old model stats for backward compatibility
    const oldProjectsWithStats = supplier.supplierProjects.map(sp => {
      const projectStats = calculateTaskStats(sp.taskInstances)
      
      // Recent activity (last 7 days)
      const recentActivity = sp.taskInstances.filter(task => {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        return new Date(task.updatedAt) > weekAgo
      })

      return {
        ...sp,
        taskStats: projectStats,
        recentActivity: recentActivity.length,
        upcomingTasks: sp.taskInstances.filter(task => {
          if (task.status === 'completed') return false
          const nextWeek = new Date()
          nextWeek.setDate(nextWeek.getDate() + 7)
          return task.actualDue && new Date(task.actualDue) <= nextWeek
        }).length
      }
    })

    const enhancedSupplier = {
      ...supplier,
      taskStats: overallStats,
      supplierProjectInstances: newProjectsWithStats,
      supplierProjects: oldProjectsWithStats, // Keep for backward compatibility
      // Parse contacts JSON if present
      parsedContacts: supplier.contacts ? JSON.parse(supplier.contacts) : null,
      summary: {
        totalProjects: newProjectsWithStats.length > 0 ? newProjectsWithStats.length : supplier.supplierProjects.length,
        activeProjects: newProjectsWithStats.length > 0 
          ? newProjectsWithStats.filter(spi => spi.status === 'active').length
          : supplier.supplierProjects.filter(sp => sp.status === 'active').length,
        totalTasks: allTasks.length,
        completedTasks: allTasks.filter(t => t.status === 'completed').length,
        overdueTasks: overallStats.overdue,
        recentActivity: allTasks.filter(task => {
          const weekAgo = new Date()
          weekAgo.setDate(weekAgo.getDate() - 7)
          return new Date(task.updatedAt) > weekAgo
        }).length
      }
    }

    return NextResponse.json(enhancedSupplier)
  } catch (error) {
    console.error('Error fetching supplier:', error)
    return NextResponse.json({ error: 'Failed to fetch supplier' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, contactInfo, supplierNumber, location, contacts } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Check if supplier exists
    const existingSupplier = await prisma.supplier.findUnique({
      where: { id: params.id }
    })

    if (!existingSupplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // Validate contacts format if provided
    let contactsJson = null
    if (contacts) {
      try {
        contactsJson = typeof contacts === 'string' ? contacts : JSON.stringify(contacts)
        // Validate it's valid JSON
        JSON.parse(contactsJson)
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid contacts format' },
          { status: 400 }
        )
      }
    }

    // Update supplier with enhanced fields
    const supplier = await prisma.supplier.update({
      where: { id: params.id },
      data: {
        name,
        contactInfo: contactInfo || existingSupplier.contactInfo, // Keep existing if not provided
        supplierNumber,
        location,
        contacts: contactsJson
      },
      select: {
        id: true,
        name: true,
        supplierNumber: true,
        location: true,
        contacts: true,
        contactInfo: true,
        updatedAt: true
      }
    })

    return NextResponse.json(supplier)
  } catch (error) {
    console.error('Error updating supplier:', error)
    return NextResponse.json({ error: 'Failed to update supplier' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.supplier.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting supplier:', error)
    return NextResponse.json({ error: 'Failed to delete supplier' }, { status: 500 })
  }
}
