import { useMemo } from 'react';
import { useProductsSummary, type ProductSummary } from './useProductsSummary';

// Interface สำหรับสถิติรวมของสต็อก
export interface StockSummaryStats {
  // สถิติรวมทั้งระบบ
  totalProducts: number;
  totalActiveProducts: number;
  totalLocations: number;

  // สถิติสต็อก
  totalStockValue: number;
  totalPieces: number;
  totalLevel1: number;
  totalLevel2: number;
  totalLevel3: number;

  // สถิติตามสถานะสต็อก
  outOfStockCount: number;
  lowStockCount: number;
  mediumStockCount: number;
  highStockCount: number;

  // สถิติตามหมวดหมู่
  categoriesCount: number;
  topCategories: Array<{
    category: string;
    count: number;
    totalPieces: number;
  }>;

  // สถิติตามแบรนด์
  brandsCount: number;
  topBrands: Array<{
    brand: string;
    count: number;
    totalPieces: number;
  }>;

  // สินค้าที่มีสต็อกมากที่สุด
  topStockItems: Array<{
    sku: string;
    product_name: string;
    total_pieces: number;
    stock_status: string;
  }>;

  // สินค้าที่มีมูลค่าสูงที่สุด
  topValueItems: Array<{
    sku: string;
    product_name: string;
    unit_cost: number;
    total_pieces: number;
    total_value: number;
  }>;
}

export function useStockSummaryStats() {
  const query = useProductsSummary();
  const products = query.data?.data || [];
  const { isLoading, error } = query;

  const stats = useMemo(() => {
    if (!products || products.length === 0) {
      return {
        totalProducts: 0,
        totalActiveProducts: 0,
        totalLocations: 0,
        totalStockValue: 0,
        totalPieces: 0,
        totalLevel1: 0,
        totalLevel2: 0,
        totalLevel3: 0,
        outOfStockCount: 0,
        lowStockCount: 0,
        mediumStockCount: 0,
        highStockCount: 0,
        categoriesCount: 0,
        topCategories: [],
        brandsCount: 0,
        topBrands: [],
        topStockItems: [],
        topValueItems: []
      };
    }

    // คำนวณสถิติพื้นฐาน
    const totalProducts = products.length;
    const totalActiveProducts = products.filter(p => p.is_active).length;

    const totalPieces = products.reduce((sum, p) => sum + (p.total_pieces || 0), 0);
    const totalLevel1 = products.reduce((sum, p) => sum + (p.total_level1_quantity || 0), 0);
    const totalLevel2 = products.reduce((sum, p) => sum + (p.total_level2_quantity || 0), 0);
    const totalLevel3 = products.reduce((sum, p) => sum + (p.total_level3_quantity || 0), 0);

    const totalStockValue = products.reduce((sum, p) => {
      const cost = p.unit_cost || 0;
      const pieces = p.total_pieces || 0;
      return sum + (cost * pieces);
    }, 0);

    const totalLocations = products.reduce((sum, p) => sum + (p.location_count || 0), 0);

    // สถิติตามสถานะสต็อก
    const stockStatusCounts = products.reduce((acc, p) => {
      const status = p.stock_status || 'out_of_stock';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // สถิติตามหมวดหมู่
    const categoryMap = new Map<string, { count: number; totalPieces: number }>();
    products.forEach(p => {
      const category = p.category || 'ไม่ระบุ';
      const existing = categoryMap.get(category) || { count: 0, totalPieces: 0 };
      categoryMap.set(category, {
        count: existing.count + 1,
        totalPieces: existing.totalPieces + (p.total_pieces || 0)
      });
    });

    const topCategories = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        count: data.count,
        totalPieces: data.totalPieces
      }))
      .sort((a, b) => b.totalPieces - a.totalPieces)
      .slice(0, 5);

    // สถิติตามแบรนด์
    const brandMap = new Map<string, { count: number; totalPieces: number }>();
    products.forEach(p => {
      const brand = p.brand || 'ไม่ระบุ';
      const existing = brandMap.get(brand) || { count: 0, totalPieces: 0 };
      brandMap.set(brand, {
        count: existing.count + 1,
        totalPieces: existing.totalPieces + (p.total_pieces || 0)
      });
    });

    const topBrands = Array.from(brandMap.entries())
      .map(([brand, data]) => ({
        brand,
        count: data.count,
        totalPieces: data.totalPieces
      }))
      .sort((a, b) => b.totalPieces - a.totalPieces)
      .slice(0, 5);

    // สินค้าที่มีสต็อกมากที่สุด
    const topStockItems = products
      .filter(p => (p.total_pieces || 0) > 0)
      .sort((a, b) => (b.total_pieces || 0) - (a.total_pieces || 0))
      .slice(0, 10)
      .map(p => ({
        sku: p.sku,
        product_name: p.product_name,
        total_pieces: p.total_pieces || 0,
        stock_status: p.stock_status || 'out_of_stock'
      }));

    // สินค้าที่มีมูลค่าสูงที่สุด
    const topValueItems = products
      .filter(p => (p.unit_cost || 0) > 0 && (p.total_pieces || 0) > 0)
      .map(p => ({
        sku: p.sku,
        product_name: p.product_name,
        unit_cost: p.unit_cost || 0,
        total_pieces: p.total_pieces || 0,
        total_value: (p.unit_cost || 0) * (p.total_pieces || 0)
      }))
      .sort((a, b) => b.total_value - a.total_value)
      .slice(0, 10);

    return {
      totalProducts,
      totalActiveProducts,
      totalLocations,
      totalStockValue,
      totalPieces,
      totalLevel1,
      totalLevel2,
      totalLevel3,
      outOfStockCount: stockStatusCounts.out_of_stock || 0,
      lowStockCount: stockStatusCounts.low_stock || 0,
      mediumStockCount: stockStatusCounts.medium_stock || 0,
      highStockCount: stockStatusCounts.high_stock || 0,
      categoriesCount: categoryMap.size,
      topCategories,
      brandsCount: brandMap.size,
      topBrands,
      topStockItems,
      topValueItems
    };
  }, [products]);

  return {
    stats,
    isLoading,
    error,
    hasData: products && products.length > 0
  };
}

// Helper functions สำหรับการแสดงผล
export const formatStockValue = (value: number): string => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('th-TH').format(value);
};

export const getStockStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    out_of_stock: 'หมดสต็อก',
    low_stock: 'สต็อกน้อย',
    medium_stock: 'สต็อกปานกลาง',
    high_stock: 'สต็อกเยอะ'
  };
  return labels[status] || 'ไม่ทราบ';
};

export const getStockStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    out_of_stock: 'text-red-600 bg-red-100',
    low_stock: 'text-orange-600 bg-orange-100',
    medium_stock: 'text-blue-600 bg-blue-100',
    high_stock: 'text-green-600 bg-green-100'
  };
  return colors[status] || 'text-gray-600 bg-gray-100';
};