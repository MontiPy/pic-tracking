import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { cache, CacheKeys, CacheTTL, CacheInvalidation } from '@/lib/cache'

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get('includeStats') === 'true'
    const search = searchParams.get('search')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined

    // Create cache key based on parameters
    const cacheKey = search 
      ? CacheKeys.SEARCH_SUPPLIERS(search)
      : CacheKeys.SUPPLIER_LIST(includeStats)
    
    // Only use cache for non-paginated requests to avoid complexity
    if (!limit && !offset && !search) {
      const cachedData = cache.get(cacheKey)
      if (cachedData) {
        return NextResponse.json({
          ...cachedData,
          meta: { ...cachedData.meta, cached: true }
        })
      }
    }

    // Build where clause for search
    const whereClause = search ? {
      name: {
        contains: search,
        mode: 'insensitive' as const
      }
    } : {}

    // Basic supplier query for performance
    if (!includeStats) {
      const suppliers = await prisma.supplier.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          supplierNumber: true,
          location: true,
          contacts: true,
          contactInfo: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { name: 'asc' },
        take: limit,
        skip: offset
      })
      return NextResponse.json(suppliers)
    }

    // Enhanced query with task statistics - using new model
    const suppliers = await prisma.supplier.findMany({
      where: whereClause,
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
              where: { isApplied: true }, // Only include applied tasks
              select: {
                id: true,
                status: true,
                dueDate: true,
                actualDueDate: true,
                completedAt: true,
                updatedAt: true,
                isApplied: true,
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
              orderBy: { updatedAt: 'desc' }
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
              select: {
                id: true,
                status: true,
                actualDue: true,
                completedAt: true,
                updatedAt: true,
                taskTemplate: {
                  select: {
                    id: true,
                    canonicalDue: true,
                    description: true,
                    taskType: {
                      select: {
                        name: true,
                        category: true
                      }
                    }
                  }
                }
              },
              orderBy: { updatedAt: 'desc' }
            }
          }
        }
      },
      orderBy: { name: 'asc' },
      take: limit,
      skip: offset
    })

    // Calculate statistics for each supplier using new model
    const suppliersWithStats = suppliers.map(supplier => {
      // Get tasks from new model
      const newModelTasks = supplier.supplierProjectInstances.flatMap(spi => 
        spi.supplierTaskInstances.map(sti => ({
          id: sti.id,
          status: sti.status,
          actualDue: sti.actualDueDate || sti.dueDate, // Use override or template due date
          completedAt: sti.completedAt,
          updatedAt: sti.updatedAt
        }))
      )
      
      // Fallback to old model for backward compatibility
      const oldModelTasks = supplier.supplierProjects.flatMap(sp => sp.taskInstances)
      
      // Use new model if available, otherwise fall back to old model
      const allTasks = newModelTasks.length > 0 ? newModelTasks : oldModelTasks
      const taskStats = calculateTaskStats(allTasks)
      
      // Calculate project-level stats for new model
      const newProjectStats = supplier.supplierProjectInstances.map(spi => {
        const projectTasks = spi.supplierTaskInstances.map(sti => ({
          id: sti.id,
          status: sti.status,
          actualDue: sti.actualDueDate || sti.dueDate,
          completedAt: sti.completedAt,
          updatedAt: sti.updatedAt
        }))
        const projectTaskStats = calculateTaskStats(projectTasks)
        return {
          ...spi,
          taskStats: projectTaskStats
        }
      })
      
      // Keep old project stats for backward compatibility
      const oldProjectStats = supplier.supplierProjects.map(sp => {
        const projectTaskStats = calculateTaskStats(sp.taskInstances)
        return {
          ...sp,
          taskStats: projectTaskStats
        }
      })

      return {
        ...supplier,
        taskStats,
        supplierProjectInstances: newProjectStats,
        supplierProjects: oldProjectStats, // Keep for backward compatibility
        // Parse contacts JSON if present
        parsedContacts: supplier.contacts ? JSON.parse(supplier.contacts) : null
      }
    })

    const result = {
      suppliers: suppliersWithStats,
      meta: {
        total: suppliersWithStats.length,
        includeStats,
        generatedAt: new Date().toISOString(),
        cached: false
      }
    }

    // Cache the result for basic queries
    if (!limit && !offset && !search) {
      cache.set(cacheKey, result, includeStats ? CacheTTL.SHORT : CacheTTL.MEDIUM)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching suppliers:', error)
    return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, contactInfo, supplierNumber, location, contacts } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
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

    const supplier = await prisma.supplier.create({
      data: {
        name,
        contactInfo: contactInfo || '', // Keep for backward compatibility
        supplierNumber,
        location,
        contacts: contactsJson
      },
      include: {
        supplierProjects: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                description: true,
                taskTemplates: {
                  select: {
                    id: true,
                    canonicalDue: true,
                    description: true,
                    taskType: {
                      select: {
                        name: true,
                        category: true
                      }
                    }
                  }
                }
              }
            },
            taskInstances: {
              include: {
                taskTemplate: {
                  select: {
                    id: true,
                    canonicalDue: true,
                    description: true,
                    taskType: { select: { name: true, category: true } }
                  }
                }
              },
              orderBy: { updatedAt: 'desc' }
            }
          }
        }
      }
    })

    return NextResponse.json(supplier)
  } catch (error) {
    console.error('Error creating supplier:', error)
    return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 })
  }
}
