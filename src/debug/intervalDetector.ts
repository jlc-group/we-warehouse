// CRITICAL: Global interval monitoring to detect hidden setInterval sources
// This will help us find the source of the "[Violation] 'setInterval' handler took 63ms" error

interface IntervalInfo {
  id: number;
  callback: string;
  delay: number;
  createdAt: Date;
  stack: string;
}

class IntervalDetector {
  private intervals: Map<number, IntervalInfo> = new Map();
  private originalSetInterval: typeof setInterval;
  private originalClearInterval: typeof clearInterval;

  constructor() {
    this.originalSetInterval = window.setInterval;
    this.originalClearInterval = window.clearInterval;
    this.init();
  }

  private init() {
    // Override setInterval to track all intervals
    window.setInterval = ((callback: any, delay?: number, ...args: any[]) => {
      const stack = new Error().stack || 'Unknown stack';
      const callbackStr = typeof callback === 'function'
        ? callback.toString().substring(0, 100) + '...'
        : String(callback);

      const id = this.originalSetInterval.call(window, (...innerArgs: any[]) => {
        // Silent execution - only log if error or very slow
        const startTime = performance.now();
        try {
          if (typeof callback === 'function') {
            callback.apply(this, innerArgs);
          }
        } catch (error) {
          console.error(`❌ setInterval error (ID: ${id}):`, error);
        }
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Only log if VERY slow (>100ms)
        if (duration > 100) {
          console.warn(`🚨 SLOW setInterval (ID: ${id}): ${duration.toFixed(2)}ms`, callbackStr.substring(0, 50));
        }
      }, delay, ...args);

      // Track this interval silently
      this.intervals.set(id, {
        id,
        callback: callbackStr,
        delay: delay || 0,
        createdAt: new Date(),
        stack
      });

      // Silent tracking - only log if in verbose mode
      // console.log(`✅ setInterval created (ID: ${id}, delay: ${delay}ms):`, callbackStr.substring(0, 50));

      return id;
    }) as typeof setInterval;

    // Override clearInterval to track cleanup
    window.clearInterval = (id: number) => {
      if (this.intervals.has(id)) {
        // Silent cleanup
        // console.log(`🧹 clearInterval called for ID: ${id}`);
        this.intervals.delete(id);
      }
      return this.originalClearInterval.call(window, id);
    };

    // Silent initialization
    // console.log('🔍 IntervalDetector initialized - monitoring all setInterval calls');
  }

  public getActiveIntervals(): IntervalInfo[] {
    return Array.from(this.intervals.values());
  }

  public logActiveIntervals(): void {
    console.group('🔍 Active setInterval Summary');
    console.log(`Total active intervals: ${this.intervals.size}`);

    if (this.intervals.size === 0) {
      console.log('✅ No active intervals detected');
    } else {
      this.intervals.forEach((info, id) => {
        console.log(`ID ${id}: ${info.delay}ms - ${info.callback.substring(0, 50)}`);
        console.log(`  Created: ${info.createdAt.toLocaleTimeString()}`);
        console.log(`  Stack: ${info.stack.split('\n')[2]}`);
      });
    }
    console.groupEnd();
  }

  public cleanup(): void {
    // Restore original functions
    window.setInterval = this.originalSetInterval;
    window.clearInterval = this.originalClearInterval;
    console.log('🧹 IntervalDetector cleanup completed');
  }
}

// Global instance
export const intervalDetector = new IntervalDetector();

// Utility functions for debugging
export const logActiveIntervals = () => intervalDetector.logActiveIntervals();
export const getActiveIntervals = () => intervalDetector.getActiveIntervals();

// CRITICAL: DISABLE AUTO-LOGGING TO PREVENT CREATING OUR OWN INTERVAL PROBLEM
// if (process.env.NODE_ENV === 'development') {
//   const logInterval = setInterval(() => {
//     if (intervalDetector.getActiveIntervals().length > 0) {
//       console.warn('🔄 Periodic interval check:');
//       intervalDetector.logActiveIntervals();
//     }
//   }, 10000);
//
//   // Clean up when page unloads
//   window.addEventListener('beforeunload', () => {
//     clearInterval(logInterval);
//     intervalDetector.cleanup();
//   });
// }

// Manual logging only - call logActiveIntervals() from browser console if needed
// console.log('🔍 IntervalDetector ready - use logActiveIntervals() to check manually');