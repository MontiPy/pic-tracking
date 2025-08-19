import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { cache, CacheKeys } from '@/lib/cache'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const startTime = Date.now()

    // Collect various performance metrics
    const [
      // Database metrics
      totalSuppliers,
      totalProjects,
      totalTaskInstances,
      totalTaskTemplates,
      
      // Cache metrics
      cacheStats,
      
      // Recent activity metrics
      recentTasks,
      activeSessions
    ] = await Promise.all([
      prisma.supplier.count(),
      prisma.project.count(),
      prisma.taskInstance.count(),
      prisma.taskTemplate.count(),
      
      // Cache statistics
      Promise.resolve(cache.getStats()),
      
      // Recent task activity (last hour)
      prisma.taskInstance.count({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000)
          }
        }
      }),
      
      // This would be replaced with actual session tracking
      Promise.resolve(1)
    ])

    // Calculate some performance indicators
    const avgTasksPerSupplier = totalSuppliers > 0 ? totalTaskInstances / totalSuppliers : 0
    const avgTasksPerProject = totalProjects > 0 ? totalTaskInstances / totalProjects : 0
    
    // Query performance test
    const queryStartTime = Date.now()
    await prisma.taskInstance.findFirst({
      include: {
        supplierProject: {
          include: {
            supplier: true,
            project: true
          }
        },
        taskTemplate: {
          include: {
            taskType: true
          }
        }
      }
    })
    const complexQueryTime = Date.now() - queryStartTime

    // Database size estimation (simplified)
    const estimatedDbSize = {
      suppliers: totalSuppliers * 200, // Approximate bytes per supplier
      projects: totalProjects * 150,
      taskInstances: totalTaskInstances * 300,
      taskTemplates: totalTaskTemplates * 200,
      total: (totalSuppliers * 200) + (totalProjects * 150) + (totalTaskInstances * 300) + (totalTaskTemplates * 200)
    }

    const totalTime = Date.now() - startTime

    const performanceData = {
      timestamp: new Date().toISOString(),
      responseTime: totalTime,
      database: {
        counts: {
          suppliers: totalSuppliers,
          projects: totalProjects,
          taskInstances: totalTaskInstances,
          taskTemplates: totalTaskTemplates
        },
        performance: {
          complexQueryTime,
          avgTasksPerSupplier: Math.round(avgTasksPerSupplier * 100) / 100,
          avgTasksPerProject: Math.round(avgTasksPerProject * 100) / 100
        },
        estimatedSize: estimatedDbSize
      },
      cache: {
        stats: cacheStats,
        hitRatio: cacheStats.validEntries > 0 
          ? ((cacheStats.validEntries / (cacheStats.validEntries + cacheStats.expiredEntries)) * 100).toFixed(2)
          : 0
      },
      activity: {
        recentTaskUpdates: recentTasks,
        activeSessions
      },
      recommendations: []
    }

    // Add performance recommendations
    if (complexQueryTime > 100) {
      performanceData.recommendations.push({
        type: 'warning',
        message: 'Complex queries are taking longer than expected. Consider adding database indexes.',
        metric: 'complexQueryTime',
        value: complexQueryTime,
        threshold: 100
      })
    }

    if (cacheStats.expiredEntries > cacheStats.validEntries) {
      performanceData.recommendations.push({
        type: 'info',
        message: 'High cache expiry rate detected. Consider increasing TTL for stable data.',
        metric: 'cacheExpiredRatio',
        value: cacheStats.expiredEntries,
        threshold: cacheStats.validEntries
      })
    }

    if (totalTaskInstances > 10000) {
      performanceData.recommendations.push({
        type: 'info',
        message: 'Large number of task instances. Consider implementing data archiving for completed tasks.',
        metric: 'totalTaskInstances',
        value: totalTaskInstances,
        threshold: 10000
      })
    }

    if (avgTasksPerSupplier > 100) {
      performanceData.recommendations.push({
        type: 'warning',
        message: 'High task count per supplier. Consider reviewing task template efficiency.',
        metric: 'avgTasksPerSupplier',
        value: avgTasksPerSupplier,
        threshold: 100
      })
    }

    return NextResponse.json(performanceData)
  } catch (error) {
    console.error('Error collecting performance metrics:', error)
    return NextResponse.json({ error: 'Failed to collect performance metrics' }, { status: 500 })
  }
}

// Cache cleanup endpoint
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body as { action: 'cleanup' | 'clear' | 'stats' }

    let result: any = {}

    switch (action) {
      case 'cleanup':
        const cleaned = cache.cleanup()
        result = {
          action: 'cleanup',
          entriesRemoved: cleaned,
          message: `Removed ${cleaned} expired cache entries`
        }
        break

      case 'clear':
        cache.clear()
        result = {
          action: 'clear',
          message: 'All cache entries cleared'
        }
        break

      case 'stats':
        result = {
          action: 'stats',
          stats: cache.getStats()
        }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error performing cache operation:', error)
    return NextResponse.json({ error: 'Failed to perform cache operation' }, { status: 500 })
  }
}