import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cache, CacheKeys, CacheTTL } from '@/lib/cache'

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
    const [supplierCount, projectCount] = await Promise.all([
      prisma.supplier.count(),
      prisma.project.count()
    ])

    // Prefer new-model counts; fall back to legacy if none
    const [newTaskStats, newOverdue, newUpcoming, newRecent] = await Promise.all([
      prisma.supplierTaskInstance.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.supplierTaskInstance.count({
        where: { status: { not: 'completed' }, OR: [ { actualDueDate: { lt: now } }, { AND: [ { actualDueDate: null }, { dueDate: { lt: now } } ] } ] }
      }),
      prisma.supplierTaskInstance.count({
        where: { status: { not: 'completed' }, OR: [
          { AND: [ { actualDueDate: { gte: now } }, { actualDueDate: { lte: weekFromNow } } ] },
          { AND: [ { actualDueDate: null }, { dueDate: { gte: now } }, { dueDate: { lte: weekFromNow } } ] }
        ] }
      }),
      prisma.supplierTaskInstance.count({
        where: { updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
      })
    ])

    let taskStats = newTaskStats
    let overdueTasks = newOverdue
    let upcomingTasks = newUpcoming
    let recentActivity = newRecent

    if (taskStats.length === 0) {
      const [legacyStats, legacyOverdue, legacyUpcoming, legacyRecent] = await Promise.all([
        prisma.taskInstance.groupBy({ by: ['status'], _count: { id: true } }),
        prisma.taskInstance.count({ where: { status: { not: 'completed' }, actualDue: { lt: now } } }),
        prisma.taskInstance.count({ where: { status: { not: 'completed' }, actualDue: { gte: now, lte: weekFromNow } } }),
        prisma.taskInstance.count({ where: { updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } })
      ])
      taskStats = legacyStats
      overdueTasks = legacyOverdue
      upcomingTasks = legacyUpcoming
      recentActivity = legacyRecent
    }

    // Process task statistics
    const taskStatusCounts = {
      total: 0,
      not_started: 0,
      in_progress: 0,
      completed: 0,
      blocked: 0,
      cancelled: 0
    }

    taskStats.forEach((stat: any) => {
      taskStatusCounts[stat.status as keyof typeof taskStatusCounts] = stat._count.id
      taskStatusCounts.total += stat._count.id
    })

    // Calculate completion ratio
    const completionRatio = taskStatusCounts.total > 0 
      ? (taskStatusCounts.completed / taskStatusCounts.total) * 100 
      : 0

    // Process supplier performance
    // Supplier performance with new model
    const suppliers = await prisma.supplier.findMany({
      select: {
        id: true,
        name: true,
        supplierProjectInstances: {
          select: {
            supplierTaskInstances: { select: { status: true, dueDate: true, actualDueDate: true, completedAt: true } }
          }
        },
        supplierProjects: {
          select: { taskInstances: { select: { status: true, actualDue: true, completedAt: true } } }
        }
      }
    })

    const supplierPerformanceData = suppliers.map(supplier => {
      const newTasks = supplier.supplierProjectInstances.flatMap(spi => spi.supplierTaskInstances)
      const oldTasks = supplier.supplierProjects.flatMap(sp => sp.taskInstances)
      const useNew = newTasks.length > 0
      const allTasks = useNew ? newTasks : oldTasks

      const isOverdue = (t: any) => {
        const due = useNew ? (t.actualDueDate || t.dueDate) : t.actualDue
        return t.status !== 'completed' && due && new Date(due) < now
      }
      const completed = allTasks.filter(t => t.status === 'completed')
      const overdue = allTasks.filter(isOverdue)

      return {
        id: supplier.id,
        name: supplier.name,
        totalTasks: allTasks.length,
        completedTasks: completed.length,
        overdueTasks: overdue.length,
        completionRatio: allTasks.length > 0 ? (completed.length / allTasks.length) * 100 : 0
      }
    }).sort((a, b) => b.completionRatio - a.completionRatio)

    // Get top performers and those needing attention
    const topPerformers = supplierPerformanceData.slice(0, 5)
    const needsAttention = supplierPerformanceData
      .filter(s => s.overdueTasks > 0 || s.completionRatio < 50)
      .slice(0, 5)

    // Category breakdown
    // Category breakdown (new model not directly grouped by category in a single query)
    const categoryStats = taskStatusCounts

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
