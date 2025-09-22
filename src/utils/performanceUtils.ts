/**
 * Performance utilities for optimizing user interactions and API calls
 */

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 *
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @param immediate - If true, trigger on the leading edge instead of trailing
 * @returns The debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;

    if (timeout !== null) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);

    if (callNow) func(...args);
  };
}

/**
 * Creates a throttled function that only invokes func at most once per every wait milliseconds.
 *
 * @param func - The function to throttle
 * @param wait - The number of milliseconds to throttle invocations to
 * @param options - Options object with leading and trailing flags
 * @returns The throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let previous = 0;
  const { leading = true, trailing = true } = options;

  return function executedFunction(...args: Parameters<T>) {
    const now = Date.now();

    if (!previous && !leading) previous = now;

    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func(...args);
    } else if (!timeout && trailing) {
      timeout = setTimeout(() => {
        previous = leading ? Date.now() : 0;
        timeout = null;
        func(...args);
      }, remaining);
    }
  };
}

/**
 * Creates a function that will only execute once, regardless of how many times it's called.
 *
 * @param func - The function to execute once
 * @returns The function that executes only once
 */
export function once<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let called = false;
  let result: ReturnType<T>;

  return function executedFunction(...args: Parameters<T>): ReturnType<T> | undefined {
    if (!called) {
      called = true;
      result = func(...args);
      return result;
    }
    return result;
  };
}

/**
 * Delays execution of a function using requestAnimationFrame for better performance.
 *
 * @param func - The function to execute
 * @returns Promise that resolves when the function completes
 */
export function nextFrame<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return function executedFunction(...args: Parameters<T>): Promise<ReturnType<T>> {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        const result = func(...args);
        resolve(result);
      });
    });
  };
}

/**
 * Creates a function that batches multiple calls into a single execution using requestAnimationFrame.
 * Useful for batching DOM updates or API calls.
 *
 * @param func - The function to batch
 * @returns The batched function
 */
export function batchUpdates<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  let scheduled = false;
  let latestArgs: Parameters<T>;

  return function executedFunction(...args: Parameters<T>) {
    latestArgs = args;

    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        func(...latestArgs);
      });
    }
  };
}

/**
 * Memoizes the result of a function based on its arguments.
 *
 * @param func - The function to memoize
 * @param keyGenerator - Optional function to generate cache keys
 * @returns The memoized function
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T & { cache: Map<string, ReturnType<T>>; clear: () => void } {
  const cache = new Map<string, ReturnType<T>>();

  const memoized = function (...args: Parameters<T>): ReturnType<T> {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = func(...args);
    cache.set(key, result);
    return result;
  } as T & { cache: Map<string, ReturnType<T>>; clear: () => void };

  memoized.cache = cache;
  memoized.clear = () => cache.clear();

  return memoized;
}

/**
 * Creates a function that limits the rate of function calls.
 * Different from throttle in that it queues calls and executes them at the specified rate.
 *
 * @param func - The function to rate limit
 * @param rateMs - The minimum time between function calls in milliseconds
 * @returns The rate-limited function
 */
export function rateLimit<T extends (...args: any[]) => any>(
  func: T,
  rateMs: number
): (...args: Parameters<T>) => void {
  let lastCallTime = 0;
  let timeoutId: NodeJS.Timeout | null = null;
  let pendingArgs: Parameters<T> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    pendingArgs = args;

    if (timeSinceLastCall >= rateMs) {
      // Execute immediately
      lastCallTime = now;
      func(...args);
      pendingArgs = null;
    } else {
      // Schedule execution
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        if (pendingArgs) {
          lastCallTime = Date.now();
          func(...pendingArgs);
          pendingArgs = null;
        }
        timeoutId = null;
      }, rateMs - timeSinceLastCall);
    }
  };
}

/**
 * Creates a performance-optimized scroll handler using passive listeners and RAF.
 *
 * @param callback - The scroll handler function
 * @param options - Options for the scroll handler
 * @returns Cleanup function to remove the listener
 */
export function optimizedScrollHandler(
  callback: (event: Event) => void,
  options: {
    throttle?: number;
    element?: Element | Window;
    passive?: boolean;
  } = {}
): () => void {
  const {
    throttle: throttleMs = 16, // ~60fps
    element = window,
    passive = true
  } = options;

  const throttledCallback = throttle(callback, throttleMs);

  const handleScroll = (event: Event) => {
    requestAnimationFrame(() => throttledCallback(event));
  };

  const eventOptions = passive ? { passive: true } : false;
  element.addEventListener('scroll', handleScroll, eventOptions);

  return () => {
    element.removeEventListener('scroll', handleScroll, eventOptions as any);
  };
}

/**
 * Performance measurement utility
 */
export class PerformanceTracker {
  private markers = new Map<string, number>();

  start(name: string): void {
    this.markers.set(name, performance.now());
  }

  end(name: string): number {
    const startTime = this.markers.get(name);
    if (!startTime) {
      console.warn(`Performance marker "${name}" not found`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.markers.delete(name);
    return duration;
  }

  measure(name: string, fn: () => void): number {
    this.start(name);
    fn();
    return this.end(name);
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    this.start(name);
    const result = await fn();
    const duration = this.end(name);
    return { result, duration };
  }
}

// Create a global performance tracker instance
export const performanceTracker = new PerformanceTracker();