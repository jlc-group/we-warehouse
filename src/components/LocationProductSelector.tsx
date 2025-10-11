import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MapPin,
  Package,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import type { InventoryItem } from '@/hooks/useInventory';
import { formatUnitsDisplay } from '@/utils/unitCalculations';

interface LocationGroup {
  location: string;
  items: InventoryItem[];
  totalItems: number;
  totalUnits: {
    level1: number;
    level2: number;
    level3: number;
  };
}

interface SelectedItem {
  item: InventoryItem;
  selectedQuantity: {
    level1: number;
    level2: number;
    level3: number;
  };
}

interface LocationProductSelectorProps {
  inventoryItems: InventoryItem[];
  selectedItems: SelectedItem[];
  onItemSelect: (item: InventoryItem, quantity: { level1: number; level2: number; level3: number }) => void;
  onItemRemove: (itemId: string) => void;
  warehouseId?: string;
  searchTerm?: string;
  onSearchChange?: (search: string) => void;
}

export function LocationProductSelector({
  inventoryItems,
  selectedItems,
  onItemSelect,
  onItemRemove,
  warehouseId,
  searchTerm = '',
  onSearchChange
}: LocationProductSelectorProps) {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  // Group inventory items by location
  const locationGroups = useMemo(() => {
    const filtered = inventoryItems.filter(item => {
      const matchesSearch = !localSearchTerm ||
        item.product_name.toLowerCase().includes(localSearchTerm.toLowerCase()) ||
        item.sku?.toLowerCase().includes(localSearchTerm.toLowerCase()) ||
        item.location.toLowerCase().includes(localSearchTerm.toLowerCase());

      return matchesSearch;
    });

    const groups = filtered.reduce((acc, item) => {
      const location = item.location || 'ไม่ระบุตำแหน่ง';

      if (!acc[location]) {
        acc[location] = {
          location,
          items: [],
          totalItems: 0,
          totalUnits: { level1: 0, level2: 0, level3: 0 }
        };
      }

      acc[location].items.push(item);
      acc[location].totalItems++;
      acc[location].totalUnits.level1 += item.unit_level1_quantity || 0;
      acc[location].totalUnits.level2 += item.unit_level2_quantity || 0;
      acc[location].totalUnits.level3 += item.unit_level3_quantity || 0;

      return acc;
    }, {} as Record<string, LocationGroup>);

    return Object.values(groups).sort((a, b) => a.location.localeCompare(b.location));
  }, [inventoryItems, localSearchTerm]);

  const handleSearchChange = (value: string) => {
    setLocalSearchTerm(value);
    onSearchChange?.(value);
  };

  const isItemSelected = (itemId: string) => {
    return selectedItems.some(selected => selected.item.id === itemId);
  };

  const getSelectedQuantity = (itemId: string) => {
    const selected = selectedItems.find(s => s.item.id === itemId);
    return selected?.selectedQuantity || { level1: 0, level2: 0, level3: 0 };
  };

  const handleQuickSelect = (item: InventoryItem, level: 'level1' | 'level2' | 'level3') => {
    const quantity = { level1: 0, level2: 0, level3: 0 };

    if (level === 'level1' && item.unit_level1_quantity) {
      quantity.level1 = Math.min(1, item.unit_level1_quantity);
    } else if (level === 'level2' && item.unit_level2_quantity) {
      quantity.level2 = Math.min(1, item.unit_level2_quantity);
    } else if (level === 'level3' && item.unit_level3_quantity) {
      quantity.level3 = Math.min(1, item.unit_level3_quantity);
    }

    onItemSelect(item, quantity);
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="ค้นหาสินค้า, SKU หรือตำแหน่ง..."
          value={localSearchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Location List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              ตำแหน่งคลังสินค้า ({locationGroups.length} ตำแหน่ง)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {locationGroups.map((group) => (
                  <Card
                    key={group.location}
                    className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                      selectedLocation === group.location ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedLocation(
                      selectedLocation === group.location ? null : group.location
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-sm">{group.location}</div>
                          <div className="text-xs text-gray-500">
                            {group.totalItems} รายการ
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {group.items.length} ชนิด
                        </Badge>
                      </div>

                      {/* Stock Summary */}
                      <div className="text-xs text-gray-600 space-y-1">
                        {group.totalUnits.level1 > 0 && (
                          <div>
                            {group.items[0]?.unit_level1_name || 'ลัง'}: {group.totalUnits.level1.toLocaleString()}
                          </div>
                        )}
                        {group.totalUnits.level2 > 0 && (
                          <div>
                            {group.items[0]?.unit_level2_name || 'กล่อง'}: {group.totalUnits.level2.toLocaleString()}
                          </div>
                        )}
                        {group.totalUnits.level3 > 0 && (
                          <div>
                            {group.items[0]?.unit_level3_name || 'ชิ้น'}: {group.totalUnits.level3.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Product List for Selected Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {selectedLocation ? `สินค้าในตำแหน่ง: ${selectedLocation}` : 'เลือกตำแหน่งเพื่อดูสินค้า'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedLocation ? (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {locationGroups
                    .find(g => g.location === selectedLocation)
                    ?.items.map((item) => {
                      const isSelected = isItemSelected(item.id);
                      const selectedQty = getSelectedQuantity(item.id);

                      return (
                        <Card
                          key={item.id}
                          className={`${isSelected ? 'ring-2 ring-green-500 bg-green-50' : ''}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <div className="font-medium text-sm mb-1">
                                  {item.product_name}
                                </div>
                                {item.sku && (
                                  <div className="text-xs text-gray-500 mb-1">
                                    SKU: {item.sku}
                                  </div>
                                )}
                                <div className="text-xs text-blue-600">
                                  📍 {item.location}
                                </div>
                              </div>
                              {isSelected && (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                            </div>

                            {/* Stock Display */}
                            <div className="text-xs space-y-1 mb-3">
                              <div className="font-medium text-gray-700">สต็อกคงเหลือ:</div>
                              {formatUnitsDisplay(item).split(' | ').map((unit, index) => (
                                <div key={index} className="text-gray-600">• {unit}</div>
                              ))}
                            </div>

                            {/* Quick Select Buttons */}
                            <div className="flex gap-2 flex-wrap">
                              {item.unit_level1_quantity && item.unit_level1_quantity > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickSelect(item, 'level1');
                                  }}
                                  className="text-xs h-7"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  +1 {item.unit_level1_name}
                                </Button>
                              )}
                              {item.unit_level2_quantity && item.unit_level2_quantity > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickSelect(item, 'level2');
                                  }}
                                  className="text-xs h-7"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  +1 {item.unit_level2_name}
                                </Button>
                              )}
                              {item.unit_level3_quantity && item.unit_level3_quantity > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickSelect(item, 'level3');
                                  }}
                                  className="text-xs h-7"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  +1 {item.unit_level3_name}
                                </Button>
                              )}
                            </div>

                            {/* Selected Quantity Display */}
                            {isSelected && (
                              <div className="mt-3 p-2 bg-green-100 rounded text-xs">
                                <div className="font-medium text-green-800 mb-1">เลือกแล้ว:</div>
                                {selectedQty.level1 > 0 && (
                                  <div>• {selectedQty.level1} {item.unit_level1_name}</div>
                                )}
                                {selectedQty.level2 > 0 && (
                                  <div>• {selectedQty.level2} {item.unit_level2_name}</div>
                                )}
                                {selectedQty.level3 > 0 && (
                                  <div>• {selectedQty.level3} {item.unit_level3_name}</div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>เลือกตำแหน่งจากด้านซ้ายเพื่อดูสินค้า</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Selected Items Summary */}
      {selectedItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              สินค้าที่เลือก ({selectedItems.length} รายการ)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedItems.map((selected, index) => (
                <div key={selected.item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{selected.item.product_name}</div>
                    <div className="text-xs text-gray-500">
                      📍 {selected.item.location} | SKU: {selected.item.sku}
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      เลือก: {formatUnitsDisplay(selected.item, selected.selectedQuantity)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onItemRemove(selected.item.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    ลบ
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}