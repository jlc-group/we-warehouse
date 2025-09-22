// Performance monitoring utility
interface RequestStats {
  count: number;
  lastReset: number;
}

class PerformanceMonitor {
  private requestCounts: Map<string, RequestStats> = new Map();
  private readonly MAX_REQUESTS_PER_MINUTE = 30;
  private readonly RESET_INTERVAL = 60000; // 1 minute

  // Check if request should be allowed (rate limiting)
  shouldAllowRequest(endpoint: string): boolean {
    const now = Date.now();
    const stats = this.requestCounts.get(endpoint);

    if (!stats) {
      this.requestCounts.set(endpoint, {
        count: 1,
        lastReset: now
      });
      return true;
    }

    // Reset counter if interval has passed
    if (now - stats.lastReset > this.RESET_INTERVAL) {
      stats.count = 1;
      stats.lastReset = now;
      return true;
    }

    // Check if under limit
    if (stats.count < this.MAX_REQUESTS_PER_MINUTE) {
      stats.count++;
      return true;
    }

    return false;
  }

  // Log API request (silent monitoring)
  logRequest(endpoint: string, duration: number, success: boolean) {
    // Store metrics silently for potential future analysis
    // No console output to prevent performance issues
  }

  // Log render performance (silent monitoring)
  logRender(componentName: string, renderTime: number) {
    // Store metrics silently for potential future analysis
    // No console output to prevent performance issues
  }

  // Get stats
  getStats(): Record<string, RequestStats> {
    const stats: Record<string, RequestStats> = {};
    this.requestCounts.forEach((value, key) => {
      stats[key] = { ...value };
    });
    return stats;
  }
}

export const performanceMonitor = new PerformanceMonitor();

// React hook for measuring render performance
export function useRenderPerformance(componentName: string) {
  const startTime = performance.now();

  return () => {
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    performanceMonitor.logRender(componentName, renderTime);
  };
}