import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MapPin, Package, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import type { InventoryItem } from '@/hooks/useInventory';
import { formatUnitsDisplay } from '@/utils/unitCalculations';

interface LocationStockInfo {
  location: string;
  items: InventoryItem[];
  totalStock: {
    level1: number;
    level2: number;
    level3: number;
  };
  productCount: number;
  itemCount: number;
}

interface LocationStockIndicatorProps {
  inventoryItems: InventoryItem[];
  showItemCount?: boolean;
  showProductCount?: boolean;
  compact?: boolean;
  maxLocations?: number;
  onLocationClick?: (location: string) => void;
}

export function LocationStockIndicator({
  inventoryItems,
  showItemCount = true,
  showProductCount = true,
  compact = false,
  maxLocations,
  onLocationClick
}: LocationStockIndicatorProps) {
  // Group inventory by location
  const locationStats = inventoryItems.reduce((acc, item) => {
    const location = item.location || 'ไม่ระบุตำแหน่ง';

    if (!acc[location]) {
      acc[location] = {
        location,
        items: [],
        totalStock: { level1: 0, level2: 0, level3: 0 },
        productCount: 0,
        itemCount: 0
      };
    }

    acc[location].items.push(item);
    acc[location].totalStock.level1 += item.unit_level1_quantity || 0;
    acc[location].totalStock.level2 += item.unit_level2_quantity || 0;
    acc[location].totalStock.level3 += item.unit_level3_quantity || 0;
    acc[location].itemCount++;

    // Count unique products (by product name)
    const uniqueProducts = new Set(acc[location].items.map(i => i.product_name));
    acc[location].productCount = uniqueProducts.size;

    return acc;
  }, {} as Record<string, LocationStockInfo>);

  const locations = Object.values(locationStats)
    .sort((a, b) => b.itemCount - a.itemCount) // Sort by item count, highest first
    .slice(0, maxLocations);

  const getStockLevel = (stock: LocationStockInfo['totalStock']) => {
    const totalItems = stock.level1 + stock.level2 + stock.level3;

    if (totalItems === 0) return 'empty';
    if (totalItems < 10) return 'low';
    if (totalItems < 50) return 'medium';
    return 'high';
  };

  const getStockBadgeColor = (level: string) => {
    switch (level) {
      case 'empty': return 'bg-red-100 text-red-800 border-red-200';
      case 'low': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'high': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStockIcon = (level: string) => {
    switch (level) {
      case 'empty': return <AlertTriangle className="h-3 w-3" />;
      case 'low': return <AlertCircle className="h-3 w-3" />;
      case 'medium': return <Package className="h-3 w-3" />;
      case 'high': return <CheckCircle className="h-3 w-3" />;
      default: return <Package className="h-3 w-3" />;
    }
  };

  const getStockLabel = (level: string) => {
    switch (level) {
      case 'empty': return 'ว่าง';
      case 'low': return 'น้อย';
      case 'medium': return 'ปานกลาง';
      case 'high': return 'เยอะ';
      default: return 'ไม่ทราบ';
    }
  };

  if (locations.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">ไม่พบข้อมูลตำแหน่ง</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {locations.map((location) => {
          const stockLevel = getStockLevel(location.totalStock);

          return (
            <TooltipProvider key={location.location}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className={`cursor-pointer hover:shadow-md transition-all ${getStockBadgeColor(stockLevel)}`}
                    onClick={() => onLocationClick?.(location.location)}
                  >
                    <div className="flex items-center gap-1">
                      {getStockIcon(stockLevel)}
                      <span>{location.location}</span>
                      {showItemCount && (
                        <span className="ml-1 text-xs">({location.itemCount})</span>
                      )}
                    </div>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <div className="font-medium">{location.location}</div>
                    <div className="text-xs space-y-1">
                      <div>รายการทั้งหมด: {location.itemCount}</div>
                      {showProductCount && (
                        <div>ผลิตภัณฑ์: {location.productCount} ชนิด</div>
                      )}
                      <div>สถานะ: {getStockLabel(stockLevel)}</div>
                      <div className="pt-1 border-t">
                        {location.totalStock.level1 > 0 && location.items[0]?.unit_level1_name && (
                          <div>{location.items[0].unit_level1_name}: {location.totalStock.level1.toLocaleString()}</div>
                        )}
                        {location.totalStock.level2 > 0 && location.items[0]?.unit_level2_name && (
                          <div>{location.items[0].unit_level2_name}: {location.totalStock.level2.toLocaleString()}</div>
                        )}
                        {location.totalStock.level3 > 0 && location.items[0]?.unit_level3_name && (
                          <div>{location.items[0].unit_level3_name}: {location.totalStock.level3.toLocaleString()}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {locations.map((location) => {
        const stockLevel = getStockLevel(location.totalStock);

        return (
          <Card
            key={location.location}
            className={`cursor-pointer hover:shadow-md transition-all ${
              onLocationClick ? 'hover:ring-2 hover:ring-blue-500' : ''
            }`}
            onClick={() => onLocationClick?.(location.location)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-sm">{location.location}</span>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs ${getStockBadgeColor(stockLevel)}`}
                >
                  <div className="flex items-center gap-1">
                    {getStockIcon(stockLevel)}
                    {getStockLabel(stockLevel)}
                  </div>
                </Badge>
              </div>

              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>รายการทั้งหมด:</span>
                  <span className="font-medium">{location.itemCount.toLocaleString()}</span>
                </div>

                {showProductCount && (
                  <div className="flex justify-between">
                    <span>ผลิตภัณฑ์:</span>
                    <span className="font-medium">{location.productCount} ชนิด</span>
                  </div>
                )}

                {/* Stock Details */}
                {location.totalStock.level1 > 0 && location.items[0]?.unit_level1_name && (
                  <div className="flex justify-between">
                    <span>{location.items[0].unit_level1_name}:</span>
                    <span className="font-medium">{location.totalStock.level1.toLocaleString()}</span>
                  </div>
                )}

                {location.totalStock.level2 > 0 && location.items[0]?.unit_level2_name && (
                  <div className="flex justify-between">
                    <span>{location.items[0].unit_level2_name}:</span>
                    <span className="font-medium">{location.totalStock.level2.toLocaleString()}</span>
                  </div>
                )}

                {location.totalStock.level3 > 0 && location.items[0]?.unit_level3_name && (
                  <div className="flex justify-between">
                    <span>{location.items[0].unit_level3_name}:</span>
                    <span className="font-medium">{location.totalStock.level3.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Quick Preview of Top Items */}
              {location.items.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <div className="text-xs text-gray-500 mb-1">สินค้าหลัก:</div>
                  <div className="space-y-1">
                    {location.items.slice(0, 2).map((item) => (
                      <div key={item.id} className="text-xs text-gray-700 truncate">
                        • {item.product_name}
                      </div>
                    ))}
                    {location.items.length > 2 && (
                      <div className="text-xs text-blue-600">
                        และอีก {location.items.length - 2} รายการ...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Alternative compact version for use in headers or summary views
export function LocationStockSummary({
  inventoryItems,
  maxDisplay = 3,
  onViewAll
}: {
  inventoryItems: InventoryItem[];
  maxDisplay?: number;
  onViewAll?: () => void;
}) {
  const locationCount = new Set(inventoryItems.map(item => item.location)).size;
  const totalItems = inventoryItems.length;

  return (
    <div className="flex items-center gap-2 text-sm">
      <MapPin className="h-4 w-4 text-blue-600" />
      <span className="font-medium">{locationCount} ตำแหน่ง</span>
      <span className="text-gray-500">({totalItems.toLocaleString()} รายการ)</span>
      {onViewAll && (
        <button
          onClick={onViewAll}
          className="text-blue-600 hover:text-blue-700 text-xs underline"
        >
          ดูทั้งหมด
        </button>
      )}
    </div>
  );
}