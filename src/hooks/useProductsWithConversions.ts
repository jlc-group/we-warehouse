import { useState, useEffect, useCallback } from 'react';
import type {
  ProductWithConversionRate,
  ConversionRateData
} from '@/types';
import { secureGatewayClient } from '@/utils/secureGatewayClient';

export interface ProductConversionFilters {
  search?: string;
  productType?: string;
  hasConversion?: boolean;
  brand?: string;
  category?: string;
}

export function useProductsWithConversions() {
  const [products, setProducts] = useState<ProductWithConversionRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch products with conversions
  const fetchProductsWithConversions = useCallback(async (filters?: ProductConversionFilters) => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Fetching products with conversions...', filters);

      const result = await secureGatewayClient.get<ProductWithConversionRate[]>(
        'productsWithConversionsView',
        filters
      );

      if (result.success && result.data) {

        setProducts(result.data);
        console.log(`✅ Loaded ${result.data.length} products with conversion data`);
      } else {
        // Fallback to manual join if view doesn't exist yet
        console.log('🔄 View not available, using manual join...');
        const fallbackResult = await secureGatewayClient.get<any[]>('productsWithConversions');
        if (fallbackResult.success && fallbackResult.data) {
          // Transform the data to match our interface
          const transformedData: ProductWithConversionRate[] = fallbackResult.data.map(item => ({
            id: item.id,
            sku_code: item.sku_code,
            product_name: item.product_name,
            product_type: item.product_type || 'N/A',
            category: item.category,
            brand: item.brand,
            unit_of_measure: item.unit_of_measure,
            is_active: item.is_active,
            product_created_at: item.created_at,
            product_updated_at: item.updated_at,
            conversion_id: item.conversion_rates?.id || null,
            unit_level1_name: item.conversion_rates?.unit_level1_name || null,
            unit_level1_rate: item.conversion_rates?.unit_level1_rate || null,
            unit_level2_name: item.conversion_rates?.unit_level2_name || null,
            unit_level2_rate: item.conversion_rates?.unit_level2_rate || null,
            unit_level3_name: item.conversion_rates?.unit_level3_name || null,
            conversion_created_at: item.conversion_rates?.created_at || null,
            conversion_updated_at: item.conversion_rates?.updated_at || null
          }));


          setProducts(transformedData);
          console.log(`✅ Loaded ${transformedData.length} products via fallback`);
        }
      }
    } catch (err) {
      console.error('❌ Error fetching products with conversions:', err);
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  }, []);

  // Get products without conversion rates
  const getProductsWithoutConversions = useCallback(() => {
    return products.filter(p => !p.conversion_id);
  }, [products]);

  // Get products with conversion rates
  const getProductsWithConversions = useCallback(() => {
    return products.filter(p => p.conversion_id);
  }, [products]);

  // Create conversion rate for existing product
  const createConversionForProduct = useCallback(async (
    productId: string,
    conversionData: Omit<ConversionRateData, 'product_id' | 'sku' | 'product_name'>
  ): Promise<boolean> => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) {
        throw new Error('ไม่พบข้อมูลสินค้า');
      }

      const fullConversionData: ConversionRateData = {
        sku: product.sku_code,
        product_name: product.product_name,
        product_id: productId,
        product_type: product.product_type,
        ...conversionData
      };

      const result = await secureGatewayClient.mutate('createConversionRate', fullConversionData);

      if (result.success) {
        await fetchProductsWithConversions(); // Refresh data
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error creating conversion rate:', error);
      setError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการสร้างอัตราแปลงหน่วย');
      return false;
    }
  }, [products, fetchProductsWithConversions]);

  // Update conversion rate
  const updateConversionRate = useCallback(async (
    sku: string,
    updates: Partial<ConversionRateData>
  ): Promise<boolean> => {
    try {
      const result = await secureGatewayClient.mutate('updateConversionRate', { sku, updates });

      if (result.success) {
        await fetchProductsWithConversions(); // Refresh data
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error updating conversion rate:', error);
      setError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการอัปเดตอัตราแปลงหน่วย');
      return false;
    }
  }, [fetchProductsWithConversions]);

  // Delete conversion rate
  const deleteConversionRate = useCallback(async (sku: string): Promise<boolean> => {
    try {
      const result = await secureGatewayClient.mutate('deleteConversionRate', { sku });

      if (result.success) {
        await fetchProductsWithConversions(); // Refresh data
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error deleting conversion rate:', error);
      setError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการลบอัตราแปลงหน่วย');
      return false;
    }
  }, [fetchProductsWithConversions]);

  useEffect(() => {
    fetchProductsWithConversions();
  }, [fetchProductsWithConversions]);

  return {
    products,
    loading,
    error,
    fetchProductsWithConversions,
    getProductsWithoutConversions,
    getProductsWithConversions,
    createConversionForProduct,
    updateConversionRate,
    deleteConversionRate,
  };
}