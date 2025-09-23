import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Package, Boxes, MapPin, Hash, Calendar, AlertTriangle } from 'lucide-react';
import type { InventoryItem } from '@/hooks/useInventory';

interface InventoryQuickStatsProps {
  items: InventoryItem[];
  className?: string;
}

// Helper functions for quantities
const getCartonQty = (item: any) => Number(item.unit_level1_quantity ?? item.carton_quantity_legacy ?? 0) || 0;
const getBoxQty = (item: any) => Number(item.unit_level2_quantity ?? item.box_quantity_legacy ?? 0) || 0;
const getPiecesQty = (item: any) => Number(item.unit_level3_quantity ?? item.pieces_quantity_legacy ?? 0) || 0;

// Stats calculation functions
const calculateTotalItems = (items: InventoryItem[]) => {
  return items.reduce((total, item) => {
    return total + getCartonQty(item) + getBoxQty(item) + getPiecesQty(item);
  }, 0);
};

const calculateUniqueSkus = (items: InventoryItem[]) => {
  return new Set(items.map(item => item.sku)).size;
};

const calculateUniqueLocations = (items: InventoryItem[]) => {
  return new Set(items.map(item => item.location)).size;
};

const calculateUniqueLots = (items: InventoryItem[]) => {
  return new Set(items.filter(item => item.lot).map(item => item.lot)).size;
};

const calculateLowStockItems = (items: InventoryItem[], threshold: number = 5) => {
  return items.filter(item => {
    const totalQty = getCartonQty(item) + getBoxQty(item) + getPiecesQty(item);
    return totalQty > 0 && totalQty <= threshold;
  }).length;
};

const calculateOutOfStockItems = (items: InventoryItem[]) => {
  return items.filter(item => {
    const totalQty = getCartonQty(item) + getBoxQty(item) + getPiecesQty(item);
    return totalQty === 0;
  }).length;
};

const getTopSkus = (items: InventoryItem[], limit: number = 5) => {
  const skuTotals = items.reduce((acc, item) => {
    const totalQty = getCartonQty(item) + getBoxQty(item) + getPiecesQty(item);
    if (totalQty > 0) {
      acc[item.sku] = (acc[item.sku] || 0) + totalQty;
    }
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(skuTotals)
    .sort(([,a], [,b]) => b - a)
    .slice(0, limit)
    .map(([sku, quantity]) => ({ sku, quantity }));
};

const getTopLocations = (items: InventoryItem[], limit: number = 5) => {
  const locationTotals = items.reduce((acc, item) => {
    const totalQty = getCartonQty(item) + getBoxQty(item) + getPiecesQty(item);
    if (totalQty > 0) {
      acc[item.location] = (acc[item.location] || 0) + totalQty;
    }
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(locationTotals)
    .sort(([,a], [,b]) => b - a)
    .slice(0, limit)
    .map(([location, quantity]) => ({ location, quantity }));
};

export function InventoryQuickStats({ items, className = "" }: InventoryQuickStatsProps) {
  if (!items || items.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            ไม่มีข้อมูลสินค้าในคลังสินค้า
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalItems = calculateTotalItems(items);
  const uniqueSkus = calculateUniqueSkus(items);
  const uniqueLocations = calculateUniqueLocations(items);
  const uniqueLots = calculateUniqueLots(items);
  const lowStockItems = calculateLowStockItems(items);
  const outOfStockItems = calculateOutOfStockItems(items);
  const topSkus = getTopSkus(items);
  const topLocations = getTopLocations(items);

  // Calculate quantities by type
  const totalCartons = items.reduce((sum, item) => sum + getCartonQty(item), 0);
  const totalBoxes = items.reduce((sum, item) => sum + getBoxQty(item), 0);
  const totalPieces = items.reduce((sum, item) => sum + getPiecesQty(item), 0);

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {/* Overview Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4 text-blue-600" />
            ภาพรวมสินค้า
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">รายการทั้งหมด</span>
            <span className="font-bold text-lg text-blue-600">{totalItems.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">SKU ที่แตกต่าง</span>
            <span className="font-semibold text-green-600">{uniqueSkus}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">ตำแหน่งที่ใช้</span>
            <span className="font-semibold text-purple-600">{uniqueLocations}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Lot ที่แตกต่าง</span>
            <span className="font-semibold text-orange-600">{uniqueLots}</span>
          </div>
        </CardContent>
      </Card>

      {/* Quantity Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Boxes className="h-4 w-4 text-green-600" />
            แยกตามหน่วย
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 flex items-center gap-1">
              <Boxes className="h-3 w-3 text-green-600" />
              ลัง
            </span>
            <span className="font-bold text-green-600">{totalCartons.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 flex items-center gap-1">
              <Package className="h-3 w-3 text-blue-600" />
              กล่อง
            </span>
            <span className="font-bold text-blue-600">{totalBoxes.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 flex items-center gap-1">
              <Package className="h-3 w-3 text-orange-600" />
              ชิ้น
            </span>
            <span className="font-bold text-orange-600">{totalPieces.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Stock Alerts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            แจ้งเตือนสต็อก
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">สต็อกใกล้หมด</span>
            <Badge variant={lowStockItems > 0 ? "destructive" : "secondary"} className="font-semibold">
              {lowStockItems}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">สต็อกหมด</span>
            <Badge variant={outOfStockItems > 0 ? "destructive" : "secondary"} className="font-semibold">
              {outOfStockItems}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">สถานะปกติ</span>
            <Badge variant="default" className="font-semibold bg-green-100 text-green-700">
              {uniqueSkus - lowStockItems - outOfStockItems}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Top SKUs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-600" />
            SKU อันดับต้น
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {topSkus.length > 0 ? (
            topSkus.map((item, index) => (
              <div key={item.sku} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">#{index + 1}</span>
                  <code className="text-xs bg-gray-100 px-1 rounded">{item.sku}</code>
                </div>
                <span className="font-semibold text-purple-600">{item.quantity}</span>
              </div>
            ))
          ) : (
            <div className="text-xs text-gray-500 text-center">ไม่มีข้อมูล</div>
          )}
        </CardContent>
      </Card>

      {/* Top Locations - Span 2 columns */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4 text-indigo-600" />
            ตำแหน่งที่มีสินค้ามากที่สุด
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {topLocations.length > 0 ? (
              topLocations.map((item, index) => (
                <div key={item.location} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">#{index + 1}</span>
                    <code className="text-sm bg-white px-2 py-1 rounded font-mono">{item.location}</code>
                  </div>
                  <span className="font-semibold text-indigo-600">{item.quantity} รายการ</span>
                </div>
              ))
            ) : (
              <div className="col-span-2 text-xs text-gray-500 text-center">ไม่มีข้อมูล</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions - Span 2 columns */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Hash className="h-4 w-4 text-gray-600" />
            สรุปข้อมูลสำคัญ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-blue-600">{totalItems.toLocaleString()}</div>
              <div className="text-xs text-gray-600">รายการทั้งหมด</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-green-600">{uniqueSkus}</div>
              <div className="text-xs text-gray-600">SKU แตกต่าง</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-purple-600">{uniqueLocations}</div>
              <div className="text-xs text-gray-600">ตำแหน่งที่ใช้</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-orange-600">{uniqueLots}</div>
              <div className="text-xs text-gray-600">Lot แตกต่าง</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}