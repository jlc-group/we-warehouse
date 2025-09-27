import { useState, useEffect, useCallback, useMemo } from 'react';
import { productConversionService } from '@/services/productConversionService';
import type {
  ProductWithConversion,
  ConversionRateData
} from '@/types';
import { secureGatewayClient } from '@/utils/secureGatewayClient';

export interface ProductConversionFilters {
  search?: string;
  productType?: string;
  hasConversionRate?: boolean;
  brand?: string;
  category?: string;
}

export interface UnitConversionCalculation {
  originalQuantity: number;
  level1: { quantity: number; unit: string };
  level2: { quantity: number; unit: string };
  level3: { quantity: number; unit: string };
}

export function useProductConversions() {
  const [products, setProducts] = useState<ProductWithConversion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProductConversionFilters>({});

  // Fetch products with conversion rates
  const fetchProductsWithConversions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Fetching products with conversions via gateway...');
      const result = await secureGatewayClient.get<ProductWithConversion[]>('productsWithConversions');

      if (result.success && result.data) {
        setProducts(result.data);
        console.log(`✅ Loaded ${result.data.length} products with conversion data`);
      } else {
        // Fallback to service
        console.log('🔄 Gateway failed, using service fallback...');
        const data = await productConversionService.getProductsWithConversions();
        setProducts(data);
      }
    } catch (err) {
      console.error('❌ Error fetching products with conversions:', err);
      setError('ไม่สามารถโหลดข้อมูลสินค้าและอัตราแปลงได้');
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter products based on criteria
  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(product =>
        product.product_name.toLowerCase().includes(searchLower) ||
        product.sku_code.toLowerCase().includes(searchLower) ||
        (product.brand && product.brand.toLowerCase().includes(searchLower)) ||
        (product.category && product.category.toLowerCase().includes(searchLower))
      );
    }

    if (filters.productType && filters.productType !== 'all') {
      filtered = filtered.filter(product => product.product_type === filters.productType);
    }

    if (filters.hasConversionRate !== undefined) {
      filtered = filtered.filter(product =>
        filters.hasConversionRate
          ? !!product.conversion_rates && !product.conversion_rates.isDefault
          : !product.conversion_rates || product.conversion_rates.isDefault
      );
    }

    if (filters.brand && filters.brand !== 'all') {
      filtered = filtered.filter(product => product.brand === filters.brand);
    }

    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter(product => product.category === filters.category);
    }

    return filtered;
  }, [products, filters]);

  // Get unique brands and categories for filters
  const availableFilters = useMemo(() => {
    const brands = new Set<string>();
    const categories = new Set<string>();
    const productTypes = new Set<string>();

    products.forEach(product => {
      if (product.brand) brands.add(product.brand);
      if (product.category) categories.add(product.category);
      productTypes.add(product.product_type);
    });

    return {
      brands: Array.from(brands).sort(),
      categories: Array.from(categories).sort(),
      productTypes: Array.from(productTypes).sort()
    };
  }, [products]);

  // Get conversion rate for specific product
  const getProductConversionRate = useCallback((sku: string): ConversionRateData => {
    const product = products.find(p => p.sku_code === sku);

    if (product && product.conversion_rates) {
      return product.conversion_rates;
    }

    // Return default conversion rate
    return {
      sku,
      product_name: product?.product_name || 'ไม่ระบุ',
      unit_level1_name: 'ลัง',
      unit_level1_rate: 144,
      unit_level2_name: 'กล่อง',
      unit_level2_rate: 12,
      unit_level3_name: 'ชิ้น',
      isDefault: true
    };
  }, [products]);

  // Calculate unit conversions for a given quantity
  const calculateUnitConversions = useCallback((
    baseQuantity: number,
    sku: string
  ): UnitConversionCalculation => {
    const conversionRate = getProductConversionRate(sku);
    const conversions = productConversionService.calculateConversions(baseQuantity, conversionRate);

    return {
      originalQuantity: baseQuantity,
      level1: {
        quantity: conversions.level1,
        unit: conversionRate.unit_level1_name
      },
      level2: {
        quantity: conversions.level2,
        unit: conversionRate.unit_level2_name
      },
      level3: {
        quantity: conversions.level3,
        unit: conversionRate.unit_level3_name
      }
    };
  }, [getProductConversionRate]);

  // Convert quantity between unit levels
  const convertQuantityBetweenUnits = useCallback((
    quantity: number,
    fromLevel: 1 | 2 | 3,
    toLevel: 1 | 2 | 3,
    sku: string
  ): number => {
    const conversionRate = getProductConversionRate(sku);
    return productConversionService.convertUnits(quantity, fromLevel, toLevel, conversionRate);
  }, [getProductConversionRate]);

  // Statistics
  const statistics = useMemo(() => {
    const total = products.length;
    const withConversions = products.filter(p => p.conversion_rates && !p.conversion_rates.isDefault).length;
    const withoutConversions = total - withConversions;
    const byType = products.reduce((acc, product) => {
      acc[product.product_type] = (acc[product.product_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      withConversions,
      withoutConversions,
      byType,
      conversionCoverage: total > 0 ? (withConversions / total) * 100 : 0
    };
  }, [products]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<ProductConversionFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Export data to CSV
  const exportToCSV = useCallback(() => {
    if (filteredProducts.length === 0) {
      throw new Error('ไม่มีข้อมูลที่จะส่งออก');
    }

    const headers = [
      'ชื่อสินค้า',
      'รหัสสินค้า (SKU)',
      'ประเภท',
      'แบรนด์',
      'หมวดหมู่',
      'หน่วยนับ',
      'หน่วยระดับ 1',
      'อัตราแปลง 1→3',
      'หน่วยระดับ 2',
      'อัตราแปลง 2→3',
      'หน่วยฐาน',
      'สถานะการแปลง',
      'วันที่สร้าง'
    ];

    const rows = filteredProducts.map(product => {
      const conv = product.conversion_rates;
      return [
        product.product_name,
        product.sku_code,
        product.product_type === 'FG' ? 'สินค้าสำเร็จรูป' : 'บรรจุภัณฑ์',
        product.brand || '',
        product.category || '',
        product.unit_of_measure,
        conv ? conv.unit_level1_name : 'ลัง',
        conv ? conv.unit_level1_rate.toString() : '144',
        conv ? conv.unit_level2_name : 'กล่อง',
        conv ? conv.unit_level2_rate.toString() : '12',
        conv ? conv.unit_level3_name : 'ชิ้น',
        conv && !conv.isDefault ? 'กำหนดเอง' : 'ค่าเริ่มต้น',
        new Date(product.created_at).toLocaleDateString('th-TH')
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `products_conversions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return csvContent;
  }, [filteredProducts]);

  // Initial fetch
  useEffect(() => {
    fetchProductsWithConversions();
  }, [fetchProductsWithConversions]);

  return {
    products: filteredProducts,
    allProducts: products,
    loading,
    error,
    filters,
    availableFilters,
    statistics,
    fetchProductsWithConversions,
    getProductConversionRate,
    calculateUnitConversions,
    convertQuantityBetweenUnits,
    updateFilters,
    clearFilters,
    exportToCSV,
  };
}