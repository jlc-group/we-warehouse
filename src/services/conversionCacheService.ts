import type { ConversionRateData, ProductWithConversion } from '@/types';

// Cache configuration
interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of entries
  strategy: 'lru' | 'lfu' | 'fifo'; // Cache eviction strategy
}

// Cache entry
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

// Cache statistics
interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalEntries: number;
  memoryUsage: number;
  hitRate: number;
}

// Cacheable query types
export type CacheKey =
  | `conversion:${string}` // Single conversion rate by SKU
  | `conversions:all` // All conversion rates
  | `conversions:search:${string}` // Search results
  | `products:with-conversions` // Products with conversion rates
  | `products:conversions:${string}` // Product-specific conversions
  | `stats:conversions` // Conversion statistics
  | `validation:${string}`; // Validation results

class ConversionCacheService {
  private static instance: ConversionCacheService;
  private cache: Map<CacheKey, CacheEntry<any>> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalEntries: 0,
    memoryUsage: 0,
    hitRate: 0
  };

  private readonly configs: Record<string, CacheConfig> = {
    conversion: { ttl: 30 * 60 * 1000, maxSize: 1000, strategy: 'lru' }, // 30 minutes
    conversions: { ttl: 15 * 60 * 1000, maxSize: 100, strategy: 'lru' }, // 15 minutes
    products: { ttl: 10 * 60 * 1000, maxSize: 50, strategy: 'lru' }, // 10 minutes
    search: { ttl: 5 * 60 * 1000, maxSize: 200, strategy: 'lfu' }, // 5 minutes
    stats: { ttl: 2 * 60 * 1000, maxSize: 20, strategy: 'fifo' }, // 2 minutes
    validation: { ttl: 60 * 60 * 1000, maxSize: 500, strategy: 'lru' } // 1 hour
  };

  static getInstance(): ConversionCacheService {
    if (!ConversionCacheService.instance) {
      ConversionCacheService.instance = new ConversionCacheService();
    }
    return ConversionCacheService.instance;
  }

  // Get cache configuration for key type
  private getConfig(key: CacheKey): CacheConfig {
    const keyType = key.split(':')[0];
    return this.configs[keyType] || this.configs.conversion;
  }

  // Calculate approximate memory size of data
  private calculateSize(data: any): number {
    const jsonString = JSON.stringify(data);
    return new Blob([jsonString]).size;
  }

  // Check if cache entry is valid
  private isValid(entry: CacheEntry<any>, config: CacheConfig): boolean {
    return Date.now() - entry.timestamp < config.ttl;
  }

  // Get from cache
  get<T>(key: CacheKey): T | null {
    const entry = this.cache.get(key);
    const config = this.getConfig(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    if (!this.isValid(entry, config)) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.evictions++;
      this.updateStats();
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;
    this.updateHitRate();

    console.log(`📦 Cache hit for ${key}`);
    return entry.data;
  }

  // Set cache entry
  set<T>(key: CacheKey, data: T): void {
    const config = this.getConfig(key);
    const size = this.calculateSize(data);

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
      size
    };

    // Check if we need to evict entries
    this.evictIfNeeded(config);

    this.cache.set(key, entry);
    this.updateStats();

    console.log(`💾 Cached ${key} (size: ${size} bytes)`);
  }

  // Evict entries if cache is full
  private evictIfNeeded(config: CacheConfig): void {
    const keyType = Object.keys(this.configs).find(type =>
      this.configs[type] === config
    ) || 'conversion';

    const typeEntries = Array.from(this.cache.entries())
      .filter(([key]) => key.startsWith(keyType));

    if (typeEntries.length >= config.maxSize) {
      const evictCount = Math.ceil(config.maxSize * 0.1); // Evict 10% when full
      const toEvict = this.selectEntriesForEviction(typeEntries, config.strategy, evictCount);

      toEvict.forEach(([key]) => {
        this.cache.delete(key);
        this.stats.evictions++;
      });

      console.log(`🗑️ Evicted ${evictCount} entries using ${config.strategy} strategy`);
    }
  }

  // Select entries for eviction based on strategy
  private selectEntriesForEviction(
    entries: [CacheKey, CacheEntry<any>][],
    strategy: 'lru' | 'lfu' | 'fifo',
    count: number
  ): [CacheKey, CacheEntry<any>][] {
    let sorted: [CacheKey, CacheEntry<any>][];

    switch (strategy) {
      case 'lru': // Least Recently Used
        sorted = entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
        break;
      case 'lfu': // Least Frequently Used
        sorted = entries.sort((a, b) => a[1].accessCount - b[1].accessCount);
        break;
      case 'fifo': // First In, First Out
        sorted = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        break;
      default:
        sorted = entries;
    }

    return sorted.slice(0, count);
  }

  // Update cache statistics
  private updateStats(): void {
    this.stats.totalEntries = this.cache.size;
    this.stats.memoryUsage = Array.from(this.cache.values())
      .reduce((total, entry) => total + entry.size, 0);
  }

  // Update hit rate
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  // Clear cache entries by pattern
  clear(pattern?: string): number {
    let cleared = 0;

    if (!pattern) {
      cleared = this.cache.size;
      this.cache.clear();
    } else {
      const keysToDelete: CacheKey[] = [];
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => {
        this.cache.delete(key);
        cleared++;
      });
    }

    this.updateStats();
    console.log(`🧹 Cleared ${cleared} cache entries${pattern ? ` matching "${pattern}"` : ''}`);
    return cleared;
  }

  // Invalidate cache entries related to specific SKU
  invalidateSKU(sku: string): number {
    const patterns = [
      `conversion:${sku}`,
      `products:conversions:${sku}`,
      'conversions:all',
      'products:with-conversions',
      'stats:conversions'
    ];

    let invalidated = 0;
    patterns.forEach(pattern => {
      invalidated += this.clear(pattern);
    });

    console.log(`♻️ Invalidated ${invalidated} cache entries for SKU: ${sku}`);
    return invalidated;
  }

  // Preload cache with commonly accessed data
  async preloadCache(
    conversionRates: ConversionRateData[],
    products?: ProductWithConversion[]
  ): Promise<void> {
    console.log('🚀 Preloading cache with conversion data...');

    // Cache all conversion rates
    this.set('conversions:all', conversionRates);

    // Cache individual conversion rates
    conversionRates.forEach(rate => {
      this.set(`conversion:${rate.sku}` as CacheKey, rate);
    });

    // Cache products with conversions if provided
    if (products) {
      this.set('products:with-conversions', products);

      products.forEach(product => {
        if (product.conversion_rates) {
          this.set(`products:conversions:${product.sku_code}` as CacheKey, product.conversion_rates);
        }
      });
    }

    // Cache conversion statistics
    const stats = this.calculateConversionStats(conversionRates);
    this.set('stats:conversions', stats);

    console.log(`✅ Preloaded cache with ${conversionRates.length} conversion rates`);
  }

  // Calculate conversion statistics
  private calculateConversionStats(rates: ConversionRateData[]) {
    const total = rates.length;
    const customRates = rates.filter(r => !r.isDefault).length;
    const defaultRates = total - customRates;

    const avgLevel1Rate = rates.reduce((sum, r) => sum + r.unit_level1_rate, 0) / total;
    const avgLevel2Rate = rates.reduce((sum, r) => sum + r.unit_level2_rate, 0) / total;

    const unitNames = {
      level1: [...new Set(rates.map(r => r.unit_level1_name))],
      level2: [...new Set(rates.map(r => r.unit_level2_name))],
      level3: [...new Set(rates.map(r => r.unit_level3_name))]
    };

    return {
      total,
      customRates,
      defaultRates,
      conversionCoverage: (customRates / total) * 100,
      avgLevel1Rate: Math.round(avgLevel1Rate * 100) / 100,
      avgLevel2Rate: Math.round(avgLevel2Rate * 100) / 100,
      unitNames,
      lastUpdated: new Date().toISOString()
    };
  }

  // Get cache statistics
  getStats(): CacheStats & {
    configSummary: Record<string, CacheConfig>;
    topEntries: { key: string; accessCount: number; size: number }[];
  } {
    const topEntries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        key,
        accessCount: entry.accessCount,
        size: entry.size
      }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);

    return {
      ...this.stats,
      configSummary: this.configs,
      topEntries
    };
  }

  // Warm up cache with predicted queries
  async warmUp(commonSKUs: string[]): Promise<void> {
    console.log(`🔥 Warming up cache for ${commonSKUs.length} common SKUs...`);

    // This would typically involve pre-fetching data for common SKUs
    // For now, we'll just ensure cache space is optimized
    const config = this.getConfig('conversion:' as CacheKey);
    if (this.cache.size > config.maxSize * 0.8) {
      this.evictIfNeeded(config);
    }

    console.log('✅ Cache warm-up completed');
  }

  // Export cache data for analysis
  exportCacheData(): {
    entries: { key: string; data: any; metadata: Omit<CacheEntry<any>, 'data'> }[];
    stats: CacheStats;
    timestamp: string;
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      data: entry.data,
      metadata: {
        timestamp: entry.timestamp,
        accessCount: entry.accessCount,
        lastAccessed: entry.lastAccessed,
        size: entry.size
      }
    }));

    return {
      entries,
      stats: this.stats,
      timestamp: new Date().toISOString()
    };
  }

  // Reset all cache statistics
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalEntries: this.cache.size,
      memoryUsage: this.stats.memoryUsage,
      hitRate: 0
    };
    console.log('📊 Reset cache statistics');
  }
}

// Export singleton instance
export const conversionCacheService = ConversionCacheService.getInstance();

// Export convenience functions
export const getCachedConversion = (sku: string) =>
  conversionCacheService.get(`conversion:${sku}` as CacheKey);

export const setCachedConversion = (sku: string, data: ConversionRateData) =>
  conversionCacheService.set(`conversion:${sku}` as CacheKey, data);

export const getCachedConversions = () =>
  conversionCacheService.get('conversions:all');

export const setCachedConversions = (data: ConversionRateData[]) =>
  conversionCacheService.set('conversions:all', data);

export const getCachedProductsWithConversions = () =>
  conversionCacheService.get('products:with-conversions');

export const setCachedProductsWithConversions = (data: ProductWithConversion[]) =>
  conversionCacheService.set('products:with-conversions', data);

export const invalidateConversionCache = (sku?: string) =>
  sku ? conversionCacheService.invalidateSKU(sku) : conversionCacheService.clear();

export const getCacheStats = () => conversionCacheService.getStats();

export const preloadConversionCache = (
  conversionRates: ConversionRateData[],
  products?: ProductWithConversion[]
) => conversionCacheService.preloadCache(conversionRates, products);

export const warmUpCache = (commonSKUs: string[]) => conversionCacheService.warmUp(commonSKUs);