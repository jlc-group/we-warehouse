import { secureGatewayClient } from '@/utils/secureGatewayClient';
import type {
  ConversionRateData,
  ConversionValidationResult,
  ProductWithConversion
} from '@/types';
import {
  conversionSecurityService,
  ConversionPermission,
  SecurityValidationResult,
  logConversionAudit
} from './conversionSecurityService';
import {
  conversionCacheService,
  getCachedConversion,
  setCachedConversion,
  getCachedConversions,
  setCachedConversions,
  invalidateConversionCache
} from './conversionCacheService';

// Core service class
export class ProductConversionService {
  private static instance: ProductConversionService;
  private cache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static getInstance(): ProductConversionService {
    if (!ProductConversionService.instance) {
      ProductConversionService.instance = new ProductConversionService();
    }
    return ProductConversionService.instance;
  }

  private isValidCache(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return expiry ? Date.now() < expiry : false;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
  }

  private clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
          this.cacheExpiry.delete(key);
        }
      }
    } else {
      this.cache.clear();
      this.cacheExpiry.clear();
    }
  }

  // Get all products with their conversion rates
  async getProductsWithConversions(): Promise<ProductWithConversion[]> {
    try {
      console.log('🔍 Fetching products with conversion rates...');

      const cacheKey = 'products-with-conversions';
      if (this.isValidCache(cacheKey)) {
        console.log('📦 Using cached products with conversions');
        return this.cache.get(cacheKey);
      }

      const result = await secureGatewayClient.get<ProductWithConversion[]>('productsWithConversions');

      if (result.success && result.data) {
        this.setCache(cacheKey, result.data);
        console.log(`✅ Retrieved ${result.data.length} products with conversion data`);
        return result.data;
      }

      // Fallback: get products and conversion rates separately
      console.log('🔄 Using fallback method...');
      return await this.getProductsWithConversionsFallback();
    } catch (error) {
      console.error('❌ Error fetching products with conversions:', error);
      throw error;
    }
  }

  private async getProductsWithConversionsFallback(): Promise<ProductWithConversion[]> {
    try {
      // Get all conversion rates first
      const conversionsResult = await secureGatewayClient.get<ConversionRateData[]>('conversionRates');
      const conversions = conversionsResult.success ? conversionsResult.data || [] : [];

      // Create a map for quick lookup
      const conversionMap = new Map<string, ConversionRateData>();
      conversions.forEach(conv => {
        conversionMap.set(conv.sku, conv);
      });

      // Get all products (would need to implement this endpoint)
      // For now, return empty array or implement basic product fetching
      return [];
    } catch (error) {
      console.error('❌ Error in fallback method:', error);
      return [];
    }
  }

  // Get conversion rate for specific SKU
  async getConversionRateBySku(sku: string): Promise<ConversionRateData> {
    try {
      console.log(`🔍 Fetching conversion rate for SKU: ${sku}`);

      // Check security permission
      const securityCheck = conversionSecurityService.validateOperation(ConversionPermission.READ);
      if (!securityCheck.allowed) {
        throw new Error(securityCheck.reason);
      }

      // Try cache first
      const cached = getCachedConversion(sku);
      if (cached) {
        console.log(`📦 Using cached conversion for ${sku}`);
        return cached;
      }

      const result = await secureGatewayClient.get<ConversionRateData>('conversionRateBySku', { sku });

      if (result.success && result.data) {
        setCachedConversion(sku, result.data);
        console.log(`✅ Retrieved conversion rate for ${sku}`);

        // Log audit trail
        logConversionAudit('GET_CONVERSION_RATE', {
          sku,
          success: true
        });

        return result.data;
      }

      // Return default conversion if not found
      const defaultConversion: ConversionRateData = {
        sku,
        product_name: 'ไม่ระบุ',
        unit_level1_name: 'ลัง',
        unit_level1_rate: 144,
        unit_level2_name: 'กล่อง',
        unit_level2_rate: 12,
        unit_level3_name: 'ชิ้น',
        isDefault: true
      };

      setCachedConversion(sku, defaultConversion);
      return defaultConversion;
    } catch (error) {
      console.error(`❌ Error fetching conversion for ${sku}:`, error);

      // Log audit trail for error
      logConversionAudit('GET_CONVERSION_RATE', {
        sku,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  // Create new conversion rate
  async createConversionRate(data: Omit<ConversionRateData, 'created_at' | 'updated_at'>): Promise<ConversionRateData> {
    try {
      console.log(`➕ Creating conversion rate for SKU: ${data.sku}`);

      // Check security permission
      const securityCheck = conversionSecurityService.validateOperation(ConversionPermission.CREATE, data);
      if (!securityCheck.allowed) {
        throw new Error(securityCheck.reason);
      }

      // Show warnings if any
      if (securityCheck.warnings) {
        console.warn('⚠️ Security warnings:', securityCheck.warnings);
      }

      // Validate input
      const validation = this.validateConversionData(data);
      if (!validation.isValid) {
        const errorMessage = `Validation failed: ${validation.errors.join(', ')}`;

        // Log audit trail for validation failure
        logConversionAudit('CREATE_CONVERSION_RATE', {
          sku: data.sku,
          newData: data,
          success: false,
          errorMessage
        });

        throw new Error(errorMessage);
      }

      const result = await secureGatewayClient.mutate('createConversionRate', data);

      if (result.success && result.data) {
        // Invalidate related caches
        invalidateConversionCache(data.sku);

        console.log(`✅ Created conversion rate for ${data.sku}`);

        // Log successful audit trail
        logConversionAudit('CREATE_CONVERSION_RATE', {
          sku: data.sku,
          newData: result.data,
          success: true
        });

        return result.data;
      }

      throw new Error('Failed to create conversion rate');
    } catch (error) {
      console.error(`❌ Error creating conversion for ${data.sku}:`, error);

      // Log audit trail for error
      logConversionAudit('CREATE_CONVERSION_RATE', {
        sku: data.sku,
        newData: data,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  // Update conversion rate
  async updateConversionRate(sku: string, updates: Partial<ConversionRateData>): Promise<ConversionRateData> {
    try {
      console.log(`📝 Updating conversion rate for SKU: ${sku}`);

      // Validate updates
      if (Object.keys(updates).length > 0) {
        const validation = this.validateConversionData({ sku, ...updates } as ConversionRateData);
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }
      }

      const result = await secureGatewayClient.mutate('updateConversionRate', { sku, updates });

      if (result.success && result.data) {
        this.clearCache('conversion');
        this.clearCache('products-with-conversions');
        console.log(`✅ Updated conversion rate for ${sku}`);
        return result.data;
      }

      throw new Error('Failed to update conversion rate');
    } catch (error) {
      console.error(`❌ Error updating conversion for ${sku}:`, error);
      throw error;
    }
  }

  // Delete conversion rate
  async deleteConversionRate(sku: string): Promise<boolean> {
    try {
      console.log(`🗑️ Deleting conversion rate for SKU: ${sku}`);

      const result = await secureGatewayClient.mutate('deleteConversionRate', { sku });

      if (result.success) {
        this.clearCache('conversion');
        this.clearCache('products-with-conversions');
        console.log(`✅ Deleted conversion rate for ${sku}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`❌ Error deleting conversion for ${sku}:`, error);
      throw error;
    }
  }

  // Batch update conversion rates
  async batchUpdateConversionRates(conversions: ConversionRateData[]): Promise<ConversionRateData[]> {
    try {
      console.log(`📦 Batch updating ${conversions.length} conversion rates...`);

      // Validate all conversions
      for (const conv of conversions) {
        const validation = this.validateConversionData(conv);
        if (!validation.isValid) {
          throw new Error(`Validation failed for ${conv.sku}: ${validation.errors.join(', ')}`);
        }
      }

      const result = await secureGatewayClient.mutate('batchUpdateConversionRates', { conversions });

      if (result.success && result.data) {
        this.clearCache();
        console.log(`✅ Batch updated ${result.data.length} conversion rates`);
        return result.data;
      }

      throw new Error('Failed to batch update conversion rates');
    } catch (error) {
      console.error('❌ Error in batch update:', error);
      throw error;
    }
  }

  // Validate conversion data
  validateConversionData(data: Partial<ConversionRateData>): ConversionValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!data.sku) {
      errors.push('SKU จำเป็นต้องระบุ');
    }

    // SKU format validation
    if (data.sku && !/^[A-Z0-9-]+$/i.test(data.sku)) {
      warnings.push('SKU ควรประกอบด้วยตัวอักษร ตัวเลข และเครื่องหมาย - เท่านั้น');
    }

    // Conversion rates validation
    if (data.unit_level1_rate !== undefined) {
      if (!Number.isInteger(data.unit_level1_rate) || data.unit_level1_rate <= 0) {
        errors.push('อัตราแปลงหน่วยระดับ 1 ต้องเป็นจำนวนเต็มบวก');
      }
      if (data.unit_level1_rate > 10000) {
        warnings.push('อัตราแปลงหน่วยระดับ 1 สูงกว่าปกติ (>10,000)');
      }
    }

    if (data.unit_level2_rate !== undefined) {
      if (!Number.isInteger(data.unit_level2_rate) || data.unit_level2_rate <= 0) {
        errors.push('อัตราแปลงหน่วยระดับ 2 ต้องเป็นจำนวนเต็มบวก');
      }
      if (data.unit_level2_rate > 1000) {
        warnings.push('อัตราแปลงหน่วยระดับ 2 สูงกว่าปกติ (>1,000)');
      }
    }

    // Logical validation
    if (data.unit_level1_rate && data.unit_level2_rate) {
      if (data.unit_level1_rate < data.unit_level2_rate) {
        errors.push('อัตราแปลงหน่วยระดับ 1 ควรมากกว่าหรือเท่ากับหน่วยระดับ 2');
      }
    }

    // Unit names validation
    if (data.unit_level1_name && data.unit_level1_name.length < 2) {
      errors.push('ชื่อหน่วยระดับ 1 ต้องมีอย่างน้อย 2 ตัวอักษร');
    }

    if (data.unit_level2_name && data.unit_level2_name.length < 2) {
      errors.push('ชื่อหน่วยระดับ 2 ต้องมีอย่างน้อย 2 ตัวอักษร');
    }

    if (data.unit_level3_name && data.unit_level3_name.length < 2) {
      errors.push('ชื่อหน่วยฐาน ต้องมีอย่างน้อย 2 ตัวอักษร');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Calculate unit conversions
  calculateConversions(
    baseQuantity: number,
    conversionRate: ConversionRateData
  ): { level1: number; level2: number; level3: number } {
    const level3 = baseQuantity;
    const level2 = Math.floor(level3 / conversionRate.unit_level2_rate);
    const level1 = Math.floor(level3 / conversionRate.unit_level1_rate);

    return { level1, level2, level3 };
  }

  // Convert between different unit levels
  convertUnits(
    quantity: number,
    fromLevel: 1 | 2 | 3,
    toLevel: 1 | 2 | 3,
    conversionRate: ConversionRateData
  ): number {
    // Convert to base unit (level 3) first
    let baseQuantity: number;

    switch (fromLevel) {
      case 1:
        baseQuantity = quantity * conversionRate.unit_level1_rate;
        break;
      case 2:
        baseQuantity = quantity * conversionRate.unit_level2_rate;
        break;
      case 3:
        baseQuantity = quantity;
        break;
    }

    // Convert from base unit to target level
    switch (toLevel) {
      case 1:
        return Math.floor(baseQuantity / conversionRate.unit_level1_rate);
      case 2:
        return Math.floor(baseQuantity / conversionRate.unit_level2_rate);
      case 3:
        return baseQuantity;
    }
  }

  // Clear all caches
  clearAllCaches(): void {
    this.clearCache();
    console.log('🧹 Cleared all conversion caches');
  }
}

// Export singleton instance
export const productConversionService = ProductConversionService.getInstance();

// Export convenience functions
export const getProductsWithConversions = () => productConversionService.getProductsWithConversions();
export const getConversionRateBySku = (sku: string) => productConversionService.getConversionRateBySku(sku);
export const createConversionRate = (data: Omit<ConversionRateData, 'created_at' | 'updated_at'>) =>
  productConversionService.createConversionRate(data);
export const updateConversionRate = (sku: string, updates: Partial<ConversionRateData>) =>
  productConversionService.updateConversionRate(sku, updates);
export const deleteConversionRate = (sku: string) => productConversionService.deleteConversionRate(sku);
export const batchUpdateConversionRates = (conversions: ConversionRateData[]) =>
  productConversionService.batchUpdateConversionRates(conversions);
export const validateConversionData = (data: Partial<ConversionRateData>) =>
  productConversionService.validateConversionData(data);
export const calculateConversions = (baseQuantity: number, conversionRate: ConversionRateData) =>
  productConversionService.calculateConversions(baseQuantity, conversionRate);
export const convertUnits = (
  quantity: number,
  fromLevel: 1 | 2 | 3,
  toLevel: 1 | 2 | 3,
  conversionRate: ConversionRateData
) => productConversionService.convertUnits(quantity, fromLevel, toLevel, conversionRate);