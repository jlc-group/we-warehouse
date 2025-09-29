import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Filter, Download, RefreshCw, X } from 'lucide-react';
import type { ProductSummary } from '@/hooks/useProductsSummary';

export interface FilterOptions {
  searchTerm: string;
  stockStatus: string;
  category: string;
  brand: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface StockSummaryFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  products: ProductSummary[];
  onExport: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export function StockSummaryFilters({
  filters,
  onFiltersChange,
  products,
  onExport,
  onRefresh,
  isLoading = false
}: StockSummaryFiltersProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // สร้างรายการหมวดหมู่และแบรนด์จากข้อมูลสินค้า
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)))
    .sort();
  const brands = Array.from(new Set(products.map(p => p.brand).filter(Boolean)))
    .sort();

  const updateFilter = (key: keyof FilterOptions, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      searchTerm: '',
      stockStatus: 'all',
      category: 'all',
      brand: 'all',
      sortBy: 'total_pieces',
      sortOrder: 'desc'
    });
    setIsFilterOpen(false);
  };

  const hasActiveFilters = filters.searchTerm ||
                          filters.stockStatus !== 'all' ||
                          filters.category !== 'all' ||
                          filters.brand !== 'all';

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* แถวแรก - ค้นหาและปุ่มหลัก */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* ค้นหา */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="ค้นหาด้วย SKU, ชื่อสินค้า, หมวดหมู่..."
                value={filters.searchTerm}
                onChange={(e) => updateFilter('searchTerm', e.target.value)}
                className="pl-10"
              />
            </div>

            {/* ปุ่มต่างๆ */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                ตัวกรอง
                {hasActiveFilters && (
                  <span className="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    !
                  </span>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                รีเฟรช
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                ส่งออก
              </Button>
            </div>
          </div>

          {/* แถวที่สอง - ตัวกรองแบบขยาย */}
          {isFilterOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
              {/* สถานะสต็อก */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  สถานะสต็อก
                </label>
                <Select
                  value={filters.stockStatus}
                  onValueChange={(value) => updateFilter('stockStatus', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกสถานะ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    <SelectItem value="high_stock">สต็อกเยอะ</SelectItem>
                    <SelectItem value="medium_stock">สต็อกปานกลาง</SelectItem>
                    <SelectItem value="low_stock">สต็อกน้อย</SelectItem>
                    <SelectItem value="out_of_stock">หมดสต็อก</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* หมวดหมู่ */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  หมวดหมู่
                </label>
                <Select
                  value={filters.category}
                  onValueChange={(value) => updateFilter('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกหมวดหมู่" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* แบรนด์ */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  แบรนด์
                </label>
                <Select
                  value={filters.brand}
                  onValueChange={(value) => updateFilter('brand', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกแบรนด์" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    {brands.map((brand) => (
                      <SelectItem key={brand} value={brand}>
                        {brand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* การเรียงลำดับ */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  เรียงตาม
                </label>
                <div className="flex gap-2">
                  <Select
                    value={filters.sortBy}
                    onValueChange={(value) => updateFilter('sortBy', value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="product_name">ชื่อสินค้า</SelectItem>
                      <SelectItem value="sku">รหัส SKU</SelectItem>
                      <SelectItem value="total_pieces">จำนวนรวม</SelectItem>
                      <SelectItem value="total_level1_quantity">จำนวนลัง</SelectItem>
                      <SelectItem value="total_level2_quantity">จำนวนกล่อง</SelectItem>
                      <SelectItem value="total_level3_quantity">จำนวนชิ้น</SelectItem>
                      <SelectItem value="location_count">จำนวน Location</SelectItem>
                      <SelectItem value="unit_cost">ราคาต้นทุน</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={filters.sortOrder}
                    onValueChange={(value: 'asc' | 'desc') => updateFilter('sortOrder', value)}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">มาก→น้อย</SelectItem>
                      <SelectItem value="asc">น้อย→มาก</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ปุ่มล้างตัวกรอง */}
              {hasActiveFilters && (
                <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    ล้างตัวกรอง
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Hook สำหรับการกรองและเรียงลำดับข้อมูล
export function useFilteredProducts(products: ProductSummary[], filters: FilterOptions) {
  return products
    .filter(product => {
      // ค้นหา
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        const matchesSearch =
          product.sku.toLowerCase().includes(term) ||
          product.product_name.toLowerCase().includes(term) ||
          (product.category && product.category.toLowerCase().includes(term)) ||
          (product.brand && product.brand.toLowerCase().includes(term));

        if (!matchesSearch) return false;
      }

      // สถานะสต็อก
      if (filters.stockStatus !== 'all' && product.stock_status !== filters.stockStatus) {
        return false;
      }

      // หมวดหมู่
      if (filters.category !== 'all' && product.category !== filters.category) {
        return false;
      }

      // แบรนด์
      if (filters.brand !== 'all' && product.brand !== filters.brand) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      const { sortBy, sortOrder } = filters;
      let aValue: any = a[sortBy as keyof ProductSummary];
      let bValue: any = b[sortBy as keyof ProductSummary];

      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      // Handle null/undefined values
      if (aValue == null) aValue = sortOrder === 'asc' ? -Infinity : Infinity;
      if (bValue == null) bValue = sortOrder === 'asc' ? -Infinity : Infinity;

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
}