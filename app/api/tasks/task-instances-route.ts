import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { CacheInvalidation } from '@/lib/cache'

const prisma = new PrismaClient()

// Task filtering and sorting interface
interface TaskFilters {
  status?: string[]
  supplierId?: string
  projectId?: string
  category?: string
  overdue?: boolean
  dueWithin?: number // days
  search?: string
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Extract query parameters
    const filters: TaskFilters = {
      status: searchParams.get('status')?.split(','),
      supplierId: searchParams.get('supplierId') || undefined,
      projectId: searchParams.get('projectId') || undefined,
      category: searchParams.get('category') || undefined,
      overdue: searchParams.get('overdue') === 'true',
      dueWithin: searchParams.get('dueWithin') ? parseInt(searchParams.get('dueWithin')!) : undefined,
      search: searchParams.get('search') || undefined
    }
    
    const sortBy = searchParams.get('sortBy') || 'updatedAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0

    // Build where clause
    const whereClause: any = {}
    
    if (filters.status && filters.status.length > 0) {
      whereClause.status = { in: filters.status }
    }
    
    if (filters.supplierId) {
      whereClause.supplierProject = {
        supplierId: filters.supplierId
      }
    }
    
    if (filters.projectId) {
      whereClause.supplierProject = {
        ...whereClause.supplierProject,
        projectId: filters.projectId
      }
    }
    
    if (filters.category) {
      whereClause.taskTemplate = {
        taskType: {
          category: filters.category
        }
      }
    }
    
    // Handle overdue tasks
    if (filters.overdue) {
      const now = new Date()
      whereClause.AND = [
        { status: { not: 'completed' } },
        { actualDue: { lt: now } }
      ]
    }
    
    // Handle due within X days
    if (filters.dueWithin) {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + filters.dueWithin)
      whereClause.AND = [
        ...(whereClause.AND || []),
        { status: { not: 'completed' } },
        { actualDue: { lte: futureDate } }
      ]
    }
    
    // Handle search
    if (filters.search) {
      whereClause.OR = [
        {
          taskTemplate: {
            description: {
              contains: filters.search,
              mode: 'insensitive'
            }
          }
        },
        {
          taskTemplate: {
            taskType: {
              name: {
                contains: filters.search,
                mode: 'insensitive'
              }
            }
          }
        },
        {
          supplierProject: {
            supplier: {
              name: {
                contains: filters.search,
                mode: 'insensitive'
              }
            }
          }
        },
        {
          notes: {
            contains: filters.search,
            mode: 'insensitive'
          }
        }
      ]
    }

    // Build order by clause
    const orderByClause: any = {}
    switch (sortBy) {
      case 'dueDate':
        orderByClause.actualDue = sortOrder
        break
      case 'status':
        orderByClause.status = sortOrder
        break
      case 'supplier':
        orderByClause.supplierProject = {
          supplier: {
            name: sortOrder
          }
        }
        break
      case 'project':
        orderByClause.supplierProject = {
          project: {
            name: sortOrder
          }
        }
        break
      case 'taskType':
        orderByClause.taskTemplate = {
          taskType: {
            name: sortOrder
          }
        }
        break
      default:
        orderByClause[sortBy] = sortOrder
    }

    // Execute query
    const [taskInstances, totalCount] = await Promise.all([
      prisma.taskInstance.findMany({
        where: whereClause,
        include: {
          supplierProject: {
            include: {
              supplier: {
                select: {
                  id: true,
                  name: true
                }
              },
              project: {
                select: {
                  id: true,
                  name: true,
                  description: true
                }
              }
            }
          },
          taskTemplate: {
            include: {
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
        orderBy: orderByClause,
        take: limit,
        skip: offset
      }),
      prisma.taskInstance.count({ where: whereClause })
    ])

    // Calculate additional metadata
    const now = new Date()
    const enhancedTasks = taskInstances.map(task => ({
      ...task,
      isOverdue: task.status !== 'completed' && task.actualDue && new Date(task.actualDue) < now,
      daysUntilDue: task.actualDue ? 
        Math.ceil((new Date(task.actualDue).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null,
      supplierName: task.supplierProject.supplier.name,
      projectName: task.supplierProject.project.name,
      taskTypeName: task.taskTemplate.taskType.name,
      taskCategory: task.taskTemplate.taskType.category
    }))

    return NextResponse.json({
      tasks: enhancedTasks,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasNext: offset + limit < totalCount,
        hasPrev: offset > 0
      },
      filters: filters
    })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

// Bulk update tasks endpoint
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { taskIds, updates } = body as {
      taskIds: string[]
      updates: {
        status?: string
        actualDue?: string
        notes?: string
      }
    }

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ error: 'taskIds array is required' }, { status: 400 })
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'updates object is required' }, { status: 400 })
    }

    // Prepare update data
    const updateData: any = {}
    if (updates.status) updateData.status = updates.status
    if (updates.actualDue) updateData.actualDue = new Date(updates.actualDue)
    if (updates.notes !== undefined) updateData.notes = updates.notes
    if (updates.status === 'completed' && !updateData.completedAt) {
      updateData.completedAt = new Date()
    }

    // Update tasks in transaction
    const updatedTasks = await prisma.$transaction(async (tx) => {
      // Update all tasks
      await tx.taskInstance.updateMany({
        where: {
          id: { in: taskIds }
        },
        data: updateData
      })

      // Return updated tasks with full details
      return await tx.taskInstance.findMany({
        where: {
          id: { in: taskIds }
        },
        include: {
          supplierProject: {
            include: {
              supplier: { select: { id: true, name: true } },
              project: { select: { id: true, name: true } }
            }
          },
          taskTemplate: {
            include: {
              taskType: { select: { id: true, name: true, category: true } }
            }
          }
        }
      })
    })

    // Invalidate caches for all affected suppliers and projects
    const affectedSuppliers = new Set<string>()
    const affectedProjects = new Set<string>()
    
    updatedTasks.forEach(task => {
      affectedSuppliers.add(task.supplierProject.supplier.id)
      affectedProjects.add(task.supplierProject.project.id)
    })

    // Invalidate caches
    affectedSuppliers.forEach(supplierId => {
      CacheInvalidation.invalidateSupplier(supplierId)
    })
    
    affectedProjects.forEach(projectId => {
      CacheInvalidation.invalidateProject(projectId)
    })
    
    CacheInvalidation.invalidateDashboard()

    return NextResponse.json({
      updated: updatedTasks.length,
      tasks: updatedTasks,
      meta: {
        affectedSuppliers: affectedSuppliers.size,
        affectedProjects: affectedProjects.size
      }
    })
  } catch (error) {
    console.error('Error bulk updating tasks:', error)
    return NextResponse.json({ error: 'Failed to update tasks' }, { status: 500 })
  }
}