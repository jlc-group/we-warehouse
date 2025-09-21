/**
 * API Optimization Utilities
 * ปรับปรุงประสิทธิภาพการเรียก API และลด resource usage
 */

// Debounce function เพื่อลดจำนวน API calls
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Request queue เพื่อ batch API calls
class RequestQueue {
  private queue: Array<{
    operation: string;
    data: any;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  private processing = false;
  private batchSize = 10;
  private batchDelay = 500; // ms

  add<T>(operation: string, data: any): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ operation, data, resolve, reject });
      this.processBatch();
    });
  }

  private async processBatch() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    
    // Wait for more requests to accumulate
    await new Promise(resolve => setTimeout(resolve, this.batchDelay));

    const batch = this.queue.splice(0, this.batchSize);
    
    try {
      // Group by operation type
      const grouped = batch.reduce((acc, item) => {
        if (!acc[item.operation]) acc[item.operation] = [];
        acc[item.operation].push(item);
        return acc;
      }, {} as Record<string, typeof batch>);

      // Process each operation type
      for (const [operation, items] of Object.entries(grouped)) {
        try {
          const results = await this.processBatchOperation(operation, items);
          items.forEach((item, index) => {
            item.resolve(results[index]);
          });
        } catch (error) {
          items.forEach(item => item.reject(error));
        }
      }
    } catch (error) {
      batch.forEach(item => item.reject(error));
    } finally {
      this.processing = false;
      // Process remaining items
      if (this.queue.length > 0) {
        setTimeout(() => this.processBatch(), this.batchDelay);
      }
    }
  }

  private async processBatchOperation(operation: string, items: any[]): Promise<any[]> {
    // This would be implemented based on specific operations
    // For now, just return individual results
    return items.map(item => ({ success: true, data: item.data }));
  }
}

export const requestQueue = new RequestQueue();

// Rate limiter
class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private timeWindow: number; // ms

  constructor(maxRequests: number = 60, timeWindow: number = 60000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
  }

  async checkLimit(): Promise<boolean> {
    const now = Date.now();
    
    // Remove old requests outside time window
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.timeWindow - (now - oldestRequest);
      
      console.warn(`🚦 Rate limit reached. Waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.checkLimit();
    }
    
    this.requests.push(now);
    return true;
  }
}

export const rateLimiter = new RateLimiter(30, 60000); // 30 requests per minute

// Connection pool manager
class ConnectionManager {
  private activeConnections = 0;
  private maxConnections = 5;
  private queue: Array<() => void> = [];

  async acquire(): Promise<void> {
    if (this.activeConnections < this.maxConnections) {
      this.activeConnections++;
      return;
    }

    return new Promise(resolve => {
      this.queue.push(() => {
        this.activeConnections++;
        resolve();
      });
    });
  }

  release(): void {
    this.activeConnections--;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
    }
  }

  getStatus() {
    return {
      active: this.activeConnections,
      queued: this.queue.length,
      available: this.maxConnections - this.activeConnections
    };
  }
}

export const connectionManager = new ConnectionManager();

// Optimized query builder
export function optimizeQuery(baseQuery: any, options: {
  limit?: number;
  select?: string;
  useCache?: boolean;
} = {}) {
  let query = baseQuery;

  // Apply limit to reduce data transfer
  if (options.limit && options.limit > 0) {
    query = query.limit(options.limit);
  }

  // Select only needed fields
  if (options.select) {
    query = query.select(options.select);
  }

  return query;
}

// Cache manager for reducing duplicate requests
class CacheManager {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > cached.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const cacheManager = new CacheManager();

// Resource monitor
export class ResourceMonitor {
  private metrics = {
    apiCalls: 0,
    errors: 0,
    cacheHits: 0,
    cacheMisses: 0,
    avgResponseTime: 0,
    responseTimes: [] as number[]
  };

  recordApiCall(responseTime: number, error?: boolean): void {
    this.metrics.apiCalls++;
    if (error) this.metrics.errors++;
    
    this.metrics.responseTimes.push(responseTime);
    if (this.metrics.responseTimes.length > 100) {
      this.metrics.responseTimes.shift();
    }
    
    this.metrics.avgResponseTime = 
      this.metrics.responseTimes.reduce((a, b) => a + b, 0) / 
      this.metrics.responseTimes.length;
  }

  recordCacheHit(): void {
    this.metrics.cacheHits++;
  }

  recordCacheMiss(): void {
    this.metrics.cacheMisses++;
  }

  getMetrics() {
    return {
      ...this.metrics,
      cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100,
      errorRate: this.metrics.errors / this.metrics.apiCalls * 100,
      connectionStatus: connectionManager.getStatus()
    };
  }

  reset(): void {
    this.metrics = {
      apiCalls: 0,
      errors: 0,
      cacheHits: 0,
      cacheMisses: 0,
      avgResponseTime: 0,
      responseTimes: []
    };
  }
}

export const resourceMonitor = new ResourceMonitor();
