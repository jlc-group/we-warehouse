import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Package,
  Grid3X3,
  List,
  ShoppingCart,
  AlertCircle,
  Loader2
} from 'lucide-react';
import type { ProductSummary } from '@/hooks/useProductsSummary';
import { ProductCard } from './ProductCard';

interface ProductSelection {
  item: ProductSummary;
  quantities: {
    level1: number;
    level2: number;
    level3: number;
  };
}

interface ProductSelectionGridProps {
  productSummaries: ProductSummary[];
  selectedItems: ProductSelection[];
  onItemSelect: (item: ProductSummary, quantities: {
    level1: number;
    level2: number;
    level3: number;
  }) => void;
  onItemRemove: (itemId: string) => void;
  warehouseId?: string;
  isLoading?: boolean;
}

export function ProductSelectionGrid({
  productSummaries,
  selectedItems,
  onItemSelect,
  onItemRemove,
  warehouseId,
  isLoading = false
}: ProductSelectionGridProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'empty' | 'low' | 'medium' | 'high'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'FG' | 'PK'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    if (!productSummaries) return [];

    const filtered = productSummaries.filter(item => {
      // Search filter
      const matchesSearch = !searchTerm ||
        item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase());

      // ✅ ใช้ total_pieces จาก ProductSummary (แม่นยำกว่า)
      const totalStock = item.total_pieces || 0;

      // Stock filter
      let matchesStock = true;
      if (stockFilter !== 'all') {
        if (stockFilter === 'empty') matchesStock = totalStock === 0;
        else if (stockFilter === 'low') matchesStock = totalStock > 0 && totalStock < 10;
        else if (stockFilter === 'medium') matchesStock = totalStock >= 10 && totalStock < 50;
        else if (stockFilter === 'high') matchesStock = totalStock >= 50;
      }

      // ✅ Product type filter
      const matchesType = typeFilter === 'all' ||
        (item.product_type && item.product_type.toUpperCase() === typeFilter);

      return matchesSearch && matchesStock && matchesType;
    });

    // Sort products
    return filtered.sort((a, b) => {
      // ✅ เรียงตาม product_type ก่อน
      if (a.product_type !== b.product_type) {
        return (a.product_type || '').localeCompare(b.product_type || '');
      }

      // ✅ จากนั้นเรียงตาม total_pieces (สูงไปต่ำ)
      const stockA = a.total_pieces || 0;
      const stockB = b.total_pieces || 0;
      if (stockA !== stockB) {
        return stockB - stockA;
      }

      // สุดท้ายเรียงตามชื่อสินค้า
      return a.product_name.localeCompare(b.product_name);
    });
  }, [productSummaries, searchTerm, stockFilter, typeFilter]);

  // Get selected quantity for an item
  const getSelectedQuantity = (itemId: string) => {
    const selected = selectedItems.find(s => s.item.product_id === itemId);
    return selected?.quantities || { level1: 0, level2: 0, level3: 0 };
  };

  // Handle quantity changes
  const handleQuantityChange = (item: ProductSummary, quantities: {
    level1: number;
    level2: number;
    level3: number;
  }) => {
    const totalQuantity = quantities.level1 + quantities.level2 + quantities.level3;

    if (totalQuantity === 0) {
      // Remove item if no quantity selected
      onItemRemove(item.product_id);
    } else {
      // Add or update item
      onItemSelect(item, quantities);
    }
  };


  // Calculate totals
  const totalSelected = selectedItems.length;
  const totalProducts = filteredProducts.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500">กำลังโหลดข้อมูลสินค้า...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-5 w-5 text-gray-600" />
          <div>
            <h3 className="font-semibold text-gray-900">เลือกสินค้า</h3>
            <p className="text-sm text-gray-500">
              แสดง {totalProducts.toLocaleString()} สินค้า
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex border rounded-lg p-1">
            <Button
              type="button"
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="px-3"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="px-3"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Selected Items Badge */}
          {totalSelected > 0 && (
            <Badge variant="default" className="flex items-center gap-1">
              <ShoppingCart className="h-3 w-3" />
              เลือกแล้ว {totalSelected}
            </Badge>
          )}
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="ค้นหาด้วยชื่อสินค้าหรือรหัส SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Stock Filter & Type Filter */}
        <div className="flex gap-2">
          {/* ✅ เพิ่ม Product Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">ทุกประเภท</option>
            <option value="FG">สินค้าสำเร็จรูป (FG)</option>
            <option value="PK">วัสดุบรรจุ (PK)</option>
          </select>

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">ทุกสต็อก</option>
            <option value="high">สต็อกสูง (50+)</option>
            <option value="medium">สต็อกปานกลาง (10-49)</option>
            <option value="low">สต็อกต่ำ (1-9)</option>
            <option value="empty">หมดสต็อก (0)</option>
          </select>
        </div>
      </div>

      {/* Products Grid/List */}
      <div className="min-h-[400px]">
        {filteredProducts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h4 className="font-medium text-gray-700 mb-2">
                ไม่พบสินค้าที่ตรงกับเงื่อนไข
              </h4>
              <p className="text-sm text-gray-500 mb-4">
                ลองเปลี่ยนคำค้นหาหรือเงื่อนไขการกรอง
              </p>
              {(stockFilter !== 'all' || typeFilter !== 'all' || searchTerm) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStockFilter('all');
                    setTypeFilter('all');
                    setSearchTerm('');
                  }}
                  className="text-sm"
                >
                  ล้างตัวกรอง
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[600px]">
            <div className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4'
                : 'space-y-3 pb-4'
            }>
              {filteredProducts.map((item) => (
                <ProductCard
                  key={item.product_id}
                  item={item}
                  selectedQuantity={getSelectedQuantity(item.product_id)}
                  onQuantityChange={handleQuantityChange}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}