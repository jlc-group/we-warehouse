import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MapPin,
  Search,
  Filter,
  X,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Package
} from 'lucide-react';
import type { InventoryItem } from '@/hooks/useInventory';

interface LocationInfo {
  location: string;
  itemCount: number;
  productCount: number;
  stockLevel: 'empty' | 'low' | 'medium' | 'high';
  totalStock: number;
  color: string;
}

interface LocationFilterProps {
  inventoryItems: InventoryItem[];
  selectedLocation: string | null;
  onLocationChange: (location: string | null) => void;
  searchTerm: string;
  onSearchChange: (search: string) => void;
  stockFilter: 'all' | 'empty' | 'low' | 'medium' | 'high';
  onStockFilterChange: (filter: 'all' | 'empty' | 'low' | 'medium' | 'high') => void;
}

// Location color mapping for consistency
const LOCATION_COLORS: Record<string, string> = {
  'A1': 'bg-blue-100 text-blue-800 border-blue-200',
  'A2': 'bg-green-100 text-green-800 border-green-200',
  'A3': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'B1': 'bg-purple-100 text-purple-800 border-purple-200',
  'B2': 'bg-pink-100 text-pink-800 border-pink-200',
  'B3': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'C1': 'bg-orange-100 text-orange-800 border-orange-200',
  'C2': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'C3': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'default': 'bg-gray-100 text-gray-800 border-gray-200'
};

export function LocationFilter({
  inventoryItems,
  selectedLocation,
  onLocationChange,
  searchTerm,
  onSearchChange,
  stockFilter,
  onStockFilterChange
}: LocationFilterProps) {
  const [showAllLocations, setShowAllLocations] = useState(false);

  // Process location data
  const locationData = useMemo((): LocationInfo[] => {
    const locationMap = new Map<string, LocationInfo>();

    inventoryItems.forEach(item => {
      const location = item.location || 'ไม่ระบุตำแหน่ง';

      if (!locationMap.has(location)) {
        locationMap.set(location, {
          location,
          itemCount: 0,
          productCount: 0,
          stockLevel: 'empty',
          totalStock: 0,
          color: LOCATION_COLORS[location] || LOCATION_COLORS['default']
        });
      }

      const locationInfo = locationMap.get(location)!;
      locationInfo.itemCount++;
      locationInfo.totalStock += (item.unit_level1_quantity || 0) +
                                 (item.unit_level2_quantity || 0) +
                                 (item.unit_level3_quantity || 0);
    });

    // Calculate unique products per location and stock levels
    locationMap.forEach((locationInfo, location) => {
      const locationItems = inventoryItems.filter(item =>
        (item.location || 'ไม่ระบุตำแหน่ง') === location
      );

      const uniqueProducts = new Set(locationItems.map(item => item.product_name));
      locationInfo.productCount = uniqueProducts.size;

      // Determine stock level
      if (locationInfo.totalStock === 0) {
        locationInfo.stockLevel = 'empty';
      } else if (locationInfo.totalStock < 10) {
        locationInfo.stockLevel = 'low';
      } else if (locationInfo.totalStock < 50) {
        locationInfo.stockLevel = 'medium';
      } else {
        locationInfo.stockLevel = 'high';
      }
    });

    return Array.from(locationMap.values()).sort((a, b) => {
      // Sort by stock level (high first) then by location name
      const stockOrder = { high: 0, medium: 1, low: 2, empty: 3 };
      if (stockOrder[a.stockLevel] !== stockOrder[b.stockLevel]) {
        return stockOrder[a.stockLevel] - stockOrder[b.stockLevel];
      }
      return a.location.localeCompare(b.location);
    });
  }, [inventoryItems]);

  // Filter locations based on stock filter
  const filteredLocations = useMemo(() => {
    if (stockFilter === 'all') return locationData;
    return locationData.filter(location => location.stockLevel === stockFilter);
  }, [locationData, stockFilter]);

  const displayedLocations = showAllLocations ? filteredLocations : filteredLocations.slice(0, 8);

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
      case 'empty': return 'หมด';
      case 'low': return 'น้อย';
      case 'medium': return 'ปกติ';
      case 'high': return 'เยอะ';
      default: return 'ไม่ทราบ';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Row */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="ค้นหาสินค้า, SKU หรือตำแหน่ง..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stock Level Filter */}
        <Select value={stockFilter} onValueChange={(value: any) => onStockFilterChange(value)}>
          <SelectTrigger className="w-full sm:w-48">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <SelectValue placeholder="กรองตามสต็อก" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกระดับสต็อก</SelectItem>
            <SelectItem value="high">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                สต็อกเยอะ
              </div>
            </SelectItem>
            <SelectItem value="medium">
              <div className="flex items-center gap-2">
                <Package className="h-3 w-3 text-blue-600" />
                สต็อกปกติ
              </div>
            </SelectItem>
            <SelectItem value="low">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3 w-3 text-orange-600" />
                สต็อกน้อย
              </div>
            </SelectItem>
            <SelectItem value="empty">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 text-red-600" />
                สต็อกหมด
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Location Tabs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              ตำแหน่งคลังสินค้า ({filteredLocations.length})
            </span>
          </div>

          {selectedLocation && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onLocationChange(null)}
              className="text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              ล้างตัวกรอง
            </Button>
          )}
        </div>

        {/* All Locations Button */}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={selectedLocation === null ? "default" : "outline"}
            size="sm"
            onClick={() => onLocationChange(null)}
            className="flex items-center gap-2"
          >
            <Package className="h-3 w-3" />
            ทุกตำแหน่ง
            <Badge variant="secondary" className="ml-1">
              {locationData.reduce((sum, loc) => sum + loc.itemCount, 0)}
            </Badge>
          </Button>
        </div>

        {/* Location Buttons */}
        <div className="flex flex-wrap gap-2">
          {displayedLocations.map((location) => (
            <Button
              key={location.location}
              type="button"
              variant={selectedLocation === location.location ? "default" : "outline"}
              size="sm"
              onClick={() => onLocationChange(
                selectedLocation === location.location ? null : location.location
              )}
              className={`flex items-center gap-2 ${
                selectedLocation === location.location
                  ? ''
                  : `hover:${location.color.split(' ')[0]}`
              }`}
            >
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>{location.location}</span>
              </div>

              <div className="flex items-center gap-1">
                {getStockIcon(location.stockLevel)}
                <Badge variant="secondary" className="ml-1">
                  {location.itemCount}
                </Badge>
              </div>
            </Button>
          ))}

          {filteredLocations.length > 8 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAllLocations(!showAllLocations)}
              className="text-blue-600 hover:text-blue-700"
            >
              {showAllLocations ? 'ย่อ' : `แสดงทั้งหมด (+${filteredLocations.length - 8})`}
            </Button>
          )}
        </div>
      </div>

      {/* Active Filter Summary */}
      {(selectedLocation || stockFilter !== 'all') && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border">
          <Filter className="h-4 w-4 text-blue-600" />
          <span className="text-sm text-blue-700">
            แสดงผล:
            {selectedLocation && ` ตำแหน่ง "${selectedLocation}"`}
            {selectedLocation && stockFilter !== 'all' && ' • '}
            {stockFilter !== 'all' && ` สต็อก${getStockLabel(stockFilter)}`}
          </span>
        </div>
      )}

      {/* Empty State */}
      {filteredLocations.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">ไม่พบตำแหน่งที่ตรงกับเงื่อนไข</p>
        </div>
      )}
    </div>
  );
}

// Export location colors for use in other components
export { LOCATION_COLORS };