import { useState, useEffect, useCallback } from 'react';
import type {
  ConversionRateData,
  ConversionValidationResult,
  ConversionRateInput
} from '@/types';
import { productConversionService } from '@/services/productConversionService';
import { secureGatewayClient } from '@/utils/secureGatewayClient';

export type { ConversionRateData, ConversionValidationResult };

export function useConversionRates() {
  const [conversionRates, setConversionRates] = useState<ConversionRateData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<Map<string, ConversionValidationResult>>(new Map());

  // Fetch all conversion rates
  const fetchConversionRates = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 useConversionRates: Starting fetchConversionRates...');
      const result = await secureGatewayClient.get<ConversionRateData[]>('conversionRates');

      if (result.success && result.data) {
        console.log(`✅ useConversionRates: Gateway returned ${result.data.length} records`);
        console.log(`✅ useConversionRates: First 3 items:`, result.data.slice(0, 3));
        setConversionRates(result.data);
        console.log(`✅ useConversionRates: State updated with ${result.data.length} conversion rates`);
      } else {
        console.warn('⚠️ useConversionRates: Gateway returned success but no data');
        setConversionRates([]);
      }
    } catch (err) {
      console.error('❌ useConversionRates: Error fetching conversion rates:', err);
      console.error('❌ useConversionRates: Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
      setError(`ไม่สามารถโหลดข้อมูลการแปลงหน่วยได้: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get specific conversion rate
  const getConversionRate = useCallback(async (sku: string): Promise<ConversionRateData | null> => {
    try {
      console.log(`🔍 Getting conversion rate for ${sku} via gateway...`);
      const result = await secureGatewayClient.get<ConversionRateData>('conversionRateBySku', { sku });

      if (result.success && result.data) {
        return result.data;
      }

      // Fallback to service
      console.log(`🔄 Gateway failed for ${sku}, using service fallback...`);
      return await productConversionService.getConversionRateBySku(sku);
    } catch (error) {
      console.error(`❌ Error fetching conversion rate for ${sku}:`, error);
      return {
        sku,
        product_name: 'ไม่ระบุ',
        unit_level1_name: 'ลัง',
        unit_level1_rate: 144,
        unit_level2_name: 'กล่อง',
        unit_level2_rate: 12,
        unit_level3_name: 'ชิ้น',
        isDefault: true
      };
    }
  }, []);

  // Validate conversion data
  const validateConversionData = useCallback((data: Partial<ConversionRateData>): ConversionValidationResult => {
    const result = productConversionService.validateConversionData(data);
    setValidationResults(prev => new Map(prev.set(data.sku || 'temp', result)));
    return result;
  }, []);

  // Create conversion rate
  const createConversionRate = useCallback(async (data: ConversionRateInput): Promise<boolean> => {
    try {
      const conversionData: ConversionRateData = {
        sku: data.sku,
        product_name: data.product_name,
        unit_level1_name: data.unit_level1_name || 'ลัง',
        unit_level1_rate: data.unit_level1_rate || 144,
        unit_level2_name: data.unit_level2_name || 'กล่อง',
        unit_level2_rate: data.unit_level2_rate || 12,
        unit_level3_name: data.unit_level3_name || 'ชิ้น'
      };

      // Validate before creating
      const validation = validateConversionData(conversionData);
      if (!validation.isValid) {
        setError(`การตรวจสอบล้มเหลว: ${validation.errors.join(', ')}`);
        return false;
      }

      console.log(`➕ Creating conversion rate for ${data.sku} via gateway...`);
      const result = await secureGatewayClient.mutate('createConversionRate', conversionData);

      if (result.success && result.data) {
        await fetchConversionRates(); // Refresh data
        console.log(`✅ Created conversion rate for ${data.sku}`);
        return true;
      } else {
        // Fallback to service
        console.log(`🔄 Gateway failed for ${data.sku}, using service fallback...`);
        await productConversionService.createConversionRate(conversionData);
        await fetchConversionRates();
        return true;
      }
    } catch (error) {
      console.error('❌ Error creating conversion rate:', error);
      setError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการสร้างข้อมูล');
      return false;
    }
  }, [fetchConversionRates, validateConversionData]);

  // Update conversion rate
  const updateConversionRate = useCallback(async (sku: string, data: Partial<ConversionRateInput>): Promise<boolean> => {
    try {
      // Validate before updating
      if (Object.keys(data).length > 0) {
        const validation = validateConversionData({ sku, ...data } as ConversionRateData);
        if (!validation.isValid) {
          setError(`การตรวจสอบล้มเหลว: ${validation.errors.join(', ')}`);
          return false;
        }
      }

      console.log(`📝 Updating conversion rate for ${sku} via gateway...`);
      const result = await secureGatewayClient.mutate('updateConversionRate', { sku, updates: data });

      if (result.success && result.data) {
        await fetchConversionRates(); // Refresh data
        console.log(`✅ Updated conversion rate for ${sku}`);
        return true;
      } else {
        // Fallback to service
        console.log(`🔄 Gateway failed for ${sku}, using service fallback...`);
        await productConversionService.updateConversionRate(sku, data);
        await fetchConversionRates();
        return true;
      }
    } catch (error) {
      console.error('❌ Error updating conversion rate:', error);
      setError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล');
      return false;
    }
  }, [fetchConversionRates, validateConversionData]);

  // Delete conversion rate
  const deleteConversionRate = useCallback(async (sku: string): Promise<boolean> => {
    try {
      console.log(`🗑️ Deleting conversion rate for ${sku} via gateway...`);
      const result = await secureGatewayClient.mutate('deleteConversionRate', { sku });

      if (result.success) {
        await fetchConversionRates(); // Refresh data
        console.log(`✅ Deleted conversion rate for ${sku}`);
        return true;
      } else {
        // Fallback to service
        console.log(`🔄 Gateway failed for ${sku}, using service fallback...`);
        await productConversionService.deleteConversionRate(sku);
        await fetchConversionRates();
        return true;
      }
    } catch (error) {
      console.error('❌ Error deleting conversion rate:', error);
      setError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการลบข้อมูล');
      return false;
    }
  }, [fetchConversionRates]);

  // Batch operations
  const batchUpdateConversionRates = useCallback(async (conversions: ConversionRateData[]): Promise<boolean> => {
    try {
      console.log(`📦 Batch updating ${conversions.length} conversion rates via gateway...`);

      // Validate all conversions first
      for (const conv of conversions) {
        const validation = validateConversionData(conv);
        if (!validation.isValid) {
          setError(`การตรวจสอบล้มเหลวสำหรับ ${conv.sku}: ${validation.errors.join(', ')}`);
          return false;
        }
      }

      const result = await secureGatewayClient.mutate('batchUpdateConversionRates', { conversions });

      if (result.success && result.data) {
        await fetchConversionRates(); // Refresh data
        console.log(`✅ Batch updated ${result.data.length} conversion rates`);
        return true;
      } else {
        // Fallback to service
        console.log('🔄 Gateway failed, using service fallback...');
        await productConversionService.batchUpdateConversionRates(conversions);
        await fetchConversionRates();
        return true;
      }
    } catch (error) {
      console.error('❌ Error in batch update:', error);
      setError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการอัปเดตแบบกลุ่ม');
      return false;
    }
  }, [fetchConversionRates, validateConversionData]);

  // Clear caches
  const clearCaches = useCallback(() => {
    productConversionService.clearAllCaches();
    console.log('🧹 Cleared conversion rate caches');
  }, []);

  useEffect(() => {
    console.log('🔄 useConversionRates: useEffect triggered, calling fetchConversionRates...');
    fetchConversionRates();
  }, [fetchConversionRates]);

  return {
    conversionRates,
    loading,
    error,
    validationResults,
    fetchConversionRates,
    getConversionRate,
    createConversionRate,
    updateConversionRate,
    deleteConversionRate,
    batchUpdateConversionRates,
    validateConversionData,
    clearCaches,
  };
}