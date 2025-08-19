/**
 * Simple in-memory cache implementation for dashboard metrics
 * In production, this should be replaced with Redis or similar
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

class Cache {
  private store = new Map<string, CacheEntry<any>>()
  private defaultTTL = 5 * 60 * 1000 // 5 minutes default

  /**
   * Get cached data if available and not expired
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    
    if (!entry) {
      return null
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.store.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Set cache entry with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    }

    this.store.set(key, entry)
  }

  /**
   * Delete cache entry
   */
  delete(key: string): boolean {
    return this.store.delete(key)
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.store.clear()
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now()
    let validEntries = 0
    let expiredEntries = 0

    for (const [key, entry] of this.store.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredEntries++
      } else {
        validEntries++
      }
    }

    return {
      totalEntries: this.store.size,
      validEntries,
      expiredEntries,
      memoryUsage: JSON.stringify([...this.store.entries()]).length
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.store.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.store.delete(key)
        cleaned++
      }
    }

    return cleaned
  }

  /**
   * Get or set pattern - retrieve from cache or execute function and cache result
   */
  async getOrSet<T>(
    key: string, 
    fetchFunction: () => Promise<T>, 
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Execute function and cache result
    const data = await fetchFunction()
    this.set(key, data, ttl)
    return data
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidatePattern(pattern: string): number {
    const regex = new RegExp(pattern.replace('*', '.*'))
    let invalidated = 0

    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key)
        invalidated++
      }
    }

    return invalidated
  }
}

// Global cache instance
export const cache = new Cache()

// Cache key generators for consistency
export const CacheKeys = {
  // Dashboard data
  DASHBOARD_OVERVIEW: 'dashboard:overview',
  DASHBOARD_SUPPLIER_PERFORMANCE: 'dashboard:supplier-performance',
  DASHBOARD_PROJECT_OVERVIEW: 'dashboard:project-overview',
  
  // Supplier data
  SUPPLIER_LIST: (includeStats: boolean) => `suppliers:list:${includeStats}`,
  SUPPLIER_DETAIL: (id: string) => `supplier:${id}:detail`,
  SUPPLIER_STATS: (id: string) => `supplier:${id}:stats`,
  
  // Task data
  TASKS_FILTERED: (filters: string) => `tasks:filtered:${filters}`,
  TASK_STATS_BY_PROJECT: (projectId: string) => `tasks:stats:project:${projectId}`,
  TASK_STATS_BY_SUPPLIER: (supplierId: string) => `tasks:stats:supplier:${supplierId}`,
  
  // Project data
  PROJECT_DASHBOARD: (id: string) => `project:${id}:dashboard`,
  
  // Search results
  SEARCH_SUPPLIERS: (query: string) => `search:suppliers:${query}`,
  SEARCH_TASKS: (query: string) => `search:tasks:${query}`
}

// Cache TTL constants (in milliseconds)
export const CacheTTL = {
  VERY_SHORT: 1 * 60 * 1000,      // 1 minute
  SHORT: 5 * 60 * 1000,           // 5 minutes  
  MEDIUM: 15 * 60 * 1000,         // 15 minutes
  LONG: 60 * 60 * 1000,           // 1 hour
  VERY_LONG: 24 * 60 * 60 * 1000  // 24 hours
}

// Utility functions for cache invalidation
export const CacheInvalidation = {
  /**
   * Invalidate all supplier-related cache when supplier data changes
   */
  invalidateSupplier(supplierId: string) {
    cache.invalidatePattern(`supplier:${supplierId}:*`)
    cache.invalidatePattern('suppliers:*')
    cache.invalidatePattern('dashboard:*')
    cache.invalidatePattern('search:suppliers:*')
  },

  /**
   * Invalidate task-related cache when task data changes
   */
  invalidateTask(taskId?: string, supplierId?: string, projectId?: string) {
    cache.invalidatePattern('tasks:*')
    cache.invalidatePattern('dashboard:*')
    cache.invalidatePattern('search:tasks:*')
    
    if (supplierId) {
      cache.invalidatePattern(`supplier:${supplierId}:*`)
      cache.invalidatePattern(`tasks:stats:supplier:${supplierId}`)
    }
    
    if (projectId) {
      cache.invalidatePattern(`project:${projectId}:*`)
      cache.invalidatePattern(`tasks:stats:project:${projectId}`)
    }
  },

  /**
   * Invalidate project-related cache when project data changes
   */
  invalidateProject(projectId: string) {
    cache.invalidatePattern(`project:${projectId}:*`)
    cache.invalidatePattern('dashboard:*')
    cache.invalidatePattern('tasks:*')
  },

  /**
   * Invalidate all dashboard cache
   */
  invalidateDashboard() {
    cache.invalidatePattern('dashboard:*')
  },

  /**
   * Full cache clear for major data changes
   */
  invalidateAll() {
    cache.clear()
  }
}

// Middleware for automatic cache cleanup
export function startCacheCleanup(intervalMs = 5 * 60 * 1000) {
  setInterval(() => {
    const cleaned = cache.cleanup()
    if (cleaned > 0) {
      console.log(`Cache cleanup: removed ${cleaned} expired entries`)
    }
  }, intervalMs)
}