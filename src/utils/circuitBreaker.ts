// CRITICAL: Circuit Breaker Pattern to prevent infinite fetch loops
// This utility prevents auto-refresh issues by monitoring and stopping excessive requests

interface CircuitBreakerConfig {
  maxRequests: number;      // Max requests per window
  timeWindow: number;       // Time window in milliseconds
  cooldownPeriod: number;   // Cooldown period when circuit is open
}

interface RequestLog {
  timestamp: number;
  endpoint: string;
  source: string;
}

class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private requests: RequestLog[] = [];
  private isOpen: boolean = false;
  private lastFailureTime: number = 0;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  // Check if circuit is open (blocking requests)
  public isCircuitOpen(): boolean {
    // Auto-reset after cooldown period
    if (this.isOpen && Date.now() - this.lastFailureTime > this.config.cooldownPeriod) {
      this.isOpen = false;
      this.requests = [];
      console.log('🔄 Circuit Breaker: Auto-reset after cooldown');
    }

    return this.isOpen;
  }

  // Record a request and check if circuit should open
  public recordRequest(endpoint: string, source: string = 'unknown'): boolean {
    if (this.isCircuitOpen()) {
      console.log(`🚫 Circuit Breaker: Request blocked for ${endpoint}`);
      return false;
    }

    const now = Date.now();

    // Add current request
    this.requests.push({
      timestamp: now,
      endpoint,
      source
    });

    // Remove old requests outside time window
    this.requests = this.requests.filter(
      req => now - req.timestamp < this.config.timeWindow
    );

    // Check if we exceeded max requests
    if (this.requests.length > this.config.maxRequests) {
      this.openCircuit();
      return false;
    }

    console.log(`✅ Circuit Breaker: Request allowed (${this.requests.length}/${this.config.maxRequests})`);
    return true;
  }

  // Force open the circuit
  private openCircuit(): void {
    this.isOpen = true;
    this.lastFailureTime = Date.now();

    // Log request analysis
    const endpointCounts = this.requests.reduce((acc, req) => {
      acc[req.endpoint] = (acc[req.endpoint] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.error('🔥 Circuit Breaker: OPENED - Too many requests detected!');
    console.error('📊 Request breakdown:', endpointCounts);
    console.error(`⏰ Cooldown period: ${this.config.cooldownPeriod / 1000}s`);
  }

  // Get current status
  public getStatus() {
    return {
      isOpen: this.isOpen,
      requestCount: this.requests.length,
      maxRequests: this.config.maxRequests,
      timeWindow: this.config.timeWindow,
      cooldownEnds: this.isOpen ? this.lastFailureTime + this.config.cooldownPeriod : null
    };
  }

  // Reset circuit manually
  public reset(): void {
    this.isOpen = false;
    this.requests = [];
    this.lastFailureTime = 0;
    console.log('🔄 Circuit Breaker: Manual reset');
  }
}

// Global circuit breaker instance for inventory operations
export const inventoryCircuitBreaker = new CircuitBreaker({
  maxRequests: 10,          // Max 10 requests per minute
  timeWindow: 60000,        // 1 minute window
  cooldownPeriod: 30000,    // 30 second cooldown
});

// Circuit breaker for auth operations
export const authCircuitBreaker = new CircuitBreaker({
  maxRequests: 5,           // Max 5 auth requests per minute
  timeWindow: 60000,        // 1 minute window
  cooldownPeriod: 60000,    // 1 minute cooldown
});

// Circuit breaker for general API operations
export const apiCircuitBreaker = new CircuitBreaker({
  maxRequests: 20,          // Max 20 general requests per minute
  timeWindow: 60000,        // 1 minute window
  cooldownPeriod: 15000,    // 15 second cooldown
});

// Helper function to check if any circuit breaker is open
export const isAnyCircuitOpen = (): boolean => {
  return inventoryCircuitBreaker.isCircuitOpen() ||
         authCircuitBreaker.isCircuitOpen() ||
         apiCircuitBreaker.isCircuitOpen();
};

// Helper to get all circuit statuses
export const getAllCircuitStatuses = () => {
  return {
    inventory: inventoryCircuitBreaker.getStatus(),
    auth: authCircuitBreaker.getStatus(),
    api: apiCircuitBreaker.getStatus(),
  };
};