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
import type { InventoryItem } from '@/hooks/useInventory';
import { ProductCard } from './ProductCard';
import { LocationFilter, LOCATION_COLORS } from './LocationFilter';

interface ProductSelection {
  item: InventoryItem;
  quantities: {
    level1: number;
    level2: number;
    level3: number;
  };
}

interface ProductSelectionGridProps {
  inventoryItems: InventoryItem[];
  selectedItems: ProductSelection[];
  onItemSelect: (item: InventoryItem, quantities: {
    level1: number;
    level2: number;
    level3: number;
  }) => void;
  onItemRemove: (itemId: string) => void;
  warehouseId?: string;
  isLoading?: boolean;
}

export function ProductSelectionGrid({
  inventoryItems,
  selectedItems,
  onItemSelect,
  onItemRemove,
  warehouseId,
  isLoading = false
}: ProductSelectionGridProps) {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'empty' | 'low' | 'medium' | 'high'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    if (!inventoryItems) return [];

    const filtered = inventoryItems.filter(item => {
      // Search filter
      const matchesSearch = !searchTerm ||
        item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.location && item.location.toLowerCase().includes(searchTerm.toLowerCase()));

      // Location filter
      const matchesLocation = !selectedLocation ||
        (item.location || 'ไม่ระบุตำแหน่ง') === selectedLocation;

      // Stock filter
      const totalStock = (item.unit_level1_quantity || 0) +
                        (item.unit_level2_quantity || 0) +
                        (item.unit_level3_quantity || 0);

      let matchesStock = true;
      if (stockFilter !== 'all') {
        if (stockFilter === 'empty') matchesStock = totalStock === 0;
        else if (stockFilter === 'low') matchesStock = totalStock > 0 && totalStock < 10;
        else if (stockFilter === 'medium') matchesStock = totalStock >= 10 && totalStock < 50;
        else if (stockFilter === 'high') matchesStock = totalStock >= 50;
      }

      return matchesSearch && matchesLocation && matchesStock;
    });

    // Sort products
    return filtered.sort((a, b) => {
      // First sort by stock level (high to low)
      const stockA = (a.unit_level1_quantity || 0) + (a.unit_level2_quantity || 0) + (a.unit_level3_quantity || 0);
      const stockB = (b.unit_level1_quantity || 0) + (b.unit_level2_quantity || 0) + (b.unit_level3_quantity || 0);

      if (stockA !== stockB) {
        return stockB - stockA; // Higher stock first
      }

      // Then sort by product name
      return a.product_name.localeCompare(b.product_name);
    });
  }, [inventoryItems, selectedLocation, searchTerm, stockFilter]);

  // Get selected quantity for an item
  const getSelectedQuantity = (itemId: string) => {
    const selected = selectedItems.find(s => s.item.id === itemId);
    return selected?.quantities || { level1: 0, level2: 0, level3: 0 };
  };

  // Handle quantity changes
  const handleQuantityChange = (item: InventoryItem, quantities: {
    level1: number;
    level2: number;
    level3: number;
  }) => {
    const totalQuantity = quantities.level1 + quantities.level2 + quantities.level3;

    if (totalQuantity === 0) {
      // Remove item if no quantity selected
      onItemRemove(item.id);
    } else {
      // Add or update item
      onItemSelect(item, quantities);
    }
  };

  // Get location color
  const getLocationColor = (location: string) => {
    return LOCATION_COLORS[location] || LOCATION_COLORS['default'];
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
              {selectedLocation && ` ในตำแหน่ง "${selectedLocation}"`}
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

      {/* Location Filter */}
      <LocationFilter
        inventoryItems={inventoryItems || []}
        selectedLocation={selectedLocation}
        onLocationChange={setSelectedLocation}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        stockFilter={stockFilter}
        onStockFilterChange={setStockFilter}
      />

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
              {(selectedLocation || stockFilter !== 'all' || searchTerm) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedLocation(null);
                    setStockFilter('all');
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
                  key={item.id}
                  item={item}
                  selectedQuantity={getSelectedQuantity(item.id)}
                  onQuantityChange={handleQuantityChange}
                  locationColor={getLocationColor(item.location || '')}
                  showLocation={!selectedLocation} // Hide location if filtering by specific location
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}