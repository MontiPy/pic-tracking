import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { cache, CacheKeys, CacheTTL } from '@/lib/cache'

const prisma = new PrismaClient()

export async function GET() {
  try {
    // Try to get cached dashboard data first
    const cachedData = cache.get(CacheKeys.DASHBOARD_OVERVIEW)
    if (cachedData) {
      return NextResponse.json(cachedData)
    }

    // Get current date for overdue calculations
    const now = new Date()
    const weekFromNow = new Date()
    weekFromNow.setDate(weekFromNow.getDate() + 7)

    // Execute multiple queries in parallel for performance
    const [
      supplierCount,
      projectCount,
      taskStats,
      overdueTasks,
      upcomingTasks,
      recentActivity,
      supplierPerformance
    ] = await Promise.all([
      // Total suppliers
      prisma.supplier.count(),
      
      // Total active projects
      prisma.project.count(),
      
      // Task status distribution
      prisma.taskInstance.groupBy({
        by: ['status'],
        _count: {
          id: true
        }
      }),
      
      // Overdue tasks
      prisma.taskInstance.count({
        where: {
          status: { not: 'completed' },
          actualDue: { lt: now }
        }
      }),
      
      // Tasks due within a week
      prisma.taskInstance.count({
        where: {
          status: { not: 'completed' },
          actualDue: {
            gte: now,
            lte: weekFromNow
          }
        }
      }),
      
      // Recent activity (tasks updated in last 7 days)
      prisma.taskInstance.count({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Supplier performance summary
      prisma.supplier.findMany({
        select: {
          id: true,
          name: true,
          supplierProjects: {
            select: {
              taskInstances: {
                select: {
                  status: true,
                  actualDue: true,
                  completedAt: true
                }
              }
            }
          }
        }
      })
    ])

    // Process task statistics
    const taskStatusCounts = {
      total: 0,
      not_started: 0,
      in_progress: 0,
      completed: 0,
      blocked: 0,
      cancelled: 0
    }

    taskStats.forEach(stat => {
      taskStatusCounts[stat.status as keyof typeof taskStatusCounts] = stat._count.id
      taskStatusCounts.total += stat._count.id
    })

    // Calculate completion ratio
    const completionRatio = taskStatusCounts.total > 0 
      ? (taskStatusCounts.completed / taskStatusCounts.total) * 100 
      : 0

    // Process supplier performance
    const supplierPerformanceData = supplierPerformance.map(supplier => {
      const allTasks = supplier.supplierProjects.flatMap(sp => sp.taskInstances)
      const completedTasks = allTasks.filter(t => t.status === 'completed')
      const overdueTasks = allTasks.filter(t => 
        t.status !== 'completed' && t.actualDue && new Date(t.actualDue) < now
      )
      
      return {
        id: supplier.id,
        name: supplier.name,
        totalTasks: allTasks.length,
        completedTasks: completedTasks.length,
        overdueTasks: overdueTasks.length,
        completionRatio: allTasks.length > 0 ? (completedTasks.length / allTasks.length) * 100 : 0
      }
    }).sort((a, b) => b.completionRatio - a.completionRatio)

    // Get top performers and those needing attention
    const topPerformers = supplierPerformanceData.slice(0, 5)
    const needsAttention = supplierPerformanceData
      .filter(s => s.overdueTasks > 0 || s.completionRatio < 50)
      .slice(0, 5)

    // Category breakdown
    const categoryStats = await prisma.taskInstance.groupBy({
      by: ['status'],
      _count: { id: true },
      where: {
        taskTemplate: {
          taskType: {
            category: { not: null }
          }
        }
      }
    })

    // Project status overview
    const projectStats = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        supplierProjects: {
          select: {
            taskInstances: {
              select: {
                status: true,
                actualDue: true
              }
            }
          }
        }
      }
    })

    const projectOverview = projectStats.map(project => {
      const allTasks = project.supplierProjects.flatMap(sp => sp.taskInstances)
      const completedTasks = allTasks.filter(t => t.status === 'completed')
      const overdueTasks = allTasks.filter(t => 
        t.status !== 'completed' && t.actualDue && new Date(t.actualDue) < now
      )
      
      return {
        id: project.id,
        name: project.name,
        totalTasks: allTasks.length,
        completedTasks: completedTasks.length,
        overdueTasks: overdueTasks.length,
        completionRatio: allTasks.length > 0 ? (completedTasks.length / allTasks.length) * 100 : 0
      }
    })

    const dashboardData = {
      overview: {
        totalSuppliers: supplierCount,
        totalProjects: projectCount,
        totalTasks: taskStatusCounts.total,
        completedTasks: taskStatusCounts.completed,
        overdueTasks,
        upcomingTasks,
        recentActivity,
        completionRatio: Math.round(completionRatio * 100) / 100
      },
      taskStatus: taskStatusCounts,
      supplierPerformance: {
        topPerformers,
        needsAttention,
        summary: {
          averageCompletion: supplierPerformanceData.length > 0 
            ? supplierPerformanceData.reduce((sum, s) => sum + s.completionRatio, 0) / supplierPerformanceData.length
            : 0,
          suppliersWithOverdue: supplierPerformanceData.filter(s => s.overdueTasks > 0).length
        }
      },
      projectOverview,
      trends: {
        // This could be expanded with historical data
        weeklyCompletion: completionRatio,
        overdueGrowth: 0 // Would need historical data to calculate
      },
      meta: {
        generatedAt: new Date().toISOString(),
        cached: false
      }
    }

    // Cache the dashboard data for 5 minutes
    cache.set(CacheKeys.DASHBOARD_OVERVIEW, dashboardData, CacheTTL.SHORT)

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}