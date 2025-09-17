import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Package, Search, MapPin, Filter, X, Plus, Edit, QrCode } from 'lucide-react';
import type { InventoryItem } from '@/hooks/useInventory';

interface ShelfGridProps {
  items: InventoryItem[];
  onShelfClick: (location: string, item?: InventoryItem) => void;
  onQRCodeClick?: (location: string) => void;
}

interface FilterState {
  searchQuery: string;
  lotFilter: string;
  productCodeFilter: string;
  selectedFilters: {
    lot?: string;
    productCode?: string;
    name?: string;
  };
}

export function ShelfGrid({ items, onShelfClick, onQRCodeClick }: ShelfGridProps) {
  const [selectedShelf, setSelectedShelf] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    lotFilter: '',
    productCodeFilter: '',
    selectedFilters: {}
  });
  const [highlightedLocations, setHighlightedLocations] = useState<string[]>([]);
  const [availableRows, setAvailableRows] = useState(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N']);

  // Function to add new row
  const addNewRow = () => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lastRow = availableRows[availableRows.length - 1];
    const lastIndex = alphabet.indexOf(lastRow);

    if (lastIndex < alphabet.length - 1) {
      const nextRow = alphabet[lastIndex + 1];
      setAvailableRows(prev => [...prev, nextRow]);
    }
  };

  // Get unique lots and product codes for filter dropdowns
  const { uniqueLots, uniqueProductCodes } = useMemo(() => {
    const lots = new Set<string>();
    const productCodes = new Set<string>();

    items.forEach(item => {
      if (item.lot) lots.add(item.lot);
      if (item.sku) productCodes.add(item.sku);
    });

    return {
      uniqueLots: Array.from(lots).sort(),
      uniqueProductCodes: Array.from(productCodes).sort()
    };
  }, [items]);

  // Create a map for multiple items per location
  const itemsByLocation = useMemo(() => {
    return items.reduce((acc, item) => {
      if (!acc[item.location]) {
        acc[item.location] = [];
      }
      acc[item.location].push(item);
      return acc;
    }, {} as Record<string, InventoryItem[]>);
  }, [items]);

  // Filter items based on current filter state
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = filters.searchQuery === '' ||
        item.product_name.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(filters.searchQuery.toLowerCase());

      const matchesLot = !filters.selectedFilters.lot || item.lot === filters.selectedFilters.lot;
      const matchesProductCode = !filters.selectedFilters.productCode || item.sku === filters.selectedFilters.productCode;

      return matchesSearch && matchesLot && matchesProductCode;
    });
  }, [items, filters]);

  const handleShelfClick = (location: string, item?: InventoryItem) => {
    setSelectedShelf(location);
    onShelfClick(location, item);
  };

  const handleFilterChange = (type: 'lot' | 'productCode', value: string) => {
    setFilters(prev => ({
      ...prev,
      selectedFilters: {
        ...prev.selectedFilters,
        [type]: value === 'all' ? undefined : value
      }
    }));
  };

  const clearFilter = (type: 'lot' | 'productCode' | 'name') => {
    setFilters(prev => {
      const newFilters = { ...prev.selectedFilters };
      delete newFilters[type];
      return {
        ...prev,
        selectedFilters: newFilters,
        ...(type === 'name' ? { searchQuery: '' } : {})
      };
    });
  };

  const clearAllFilters = () => {
    setFilters({
      searchQuery: '',
      lotFilter: '',
      productCodeFilter: '',
      selectedFilters: {}
    });
    setHighlightedLocations([]);
  };

  const handleSearch = () => {
    if (filters.searchQuery.trim() === '' && !filters.selectedFilters.lot && !filters.selectedFilters.productCode) {
      setHighlightedLocations([]);
      return;
    }

    const locations = filteredItems.map(item => item.location);
    setHighlightedLocations([...new Set(locations)]); // Remove duplicates
  };

  // Auto-update highlights when filters change
  useMemo(() => {
    if (filters.searchQuery || filters.selectedFilters.lot || filters.selectedFilters.productCode) {
      const locations = filteredItems.map(item => item.location);
      setHighlightedLocations([...new Set(locations)]);
    } else {
      setHighlightedLocations([]);
    }
  }, [filteredItems, filters]);

  // Generate shelf grid (dynamic rows, 4-1 levels from top to bottom, 1-20 positions)
  const levels = [4, 3, 2, 1]; // Display from top to bottom: 4, 3, 2, 1
  const positions = Array.from({ length: 20 }, (_, i) => i + 1);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Advanced Search & Filters */}
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Search Bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="ค้นหาสินค้าตามชื่อหรือรหัส..."
                  value={filters.searchQuery}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {/* Filter Row */}
            <div className="flex gap-4 items-center flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">ฟิลเตอร์:</span>
              </div>

              {/* Lot Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Lot:</span>
                <Select value={filters.selectedFilters.lot || 'all'} onValueChange={(value) => handleFilterChange('lot', value)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="ทั้งหมด" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    {uniqueLots.filter(lot => lot && lot.trim()).map(lot => (
                      <SelectItem key={lot} value={lot}>{lot}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Product Code Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">รหัสสินค้า:</span>
                <Select value={filters.selectedFilters.productCode || 'all'} onValueChange={(value) => handleFilterChange('productCode', value)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="ทั้งหมด" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    {uniqueProductCodes.filter(code => code && code.trim()).map(code => (
                      <SelectItem key={code} value={code}>{code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters */}
              {(filters.searchQuery || filters.selectedFilters.lot || filters.selectedFilters.productCode) && (
                <Button variant="outline" size="sm" onClick={clearAllFilters}>
                  <X className="h-3 w-3 mr-1" />
                  ล้างทั้งหมด
                </Button>
              )}
            </div>

            {/* Active Filters Display */}
            {(filters.searchQuery || filters.selectedFilters.lot || filters.selectedFilters.productCode) && (
              <div className="flex gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">ตัวกรองที่ใช้:</span>
                {filters.searchQuery && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    ค้นหา: {filters.searchQuery}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => clearFilter('name')} />
                  </Badge>
                )}
                {filters.selectedFilters.lot && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Lot: {filters.selectedFilters.lot}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => clearFilter('lot')} />
                  </Badge>
                )}
                {filters.selectedFilters.productCode && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    รหัส: {filters.selectedFilters.productCode}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => clearFilter('productCode')} />
                  </Badge>
                )}
              </div>
            )}

            {/* Results Summary */}
            <div className="text-sm text-muted-foreground">
              แสดงผล: {filteredItems.length} จาก {items.length} รายการ
            </div>
          </CardContent>
        </Card>

        {/* Shelf Grid */}
        <div className="space-y-3">
          {availableRows.map((row) => (
            <div key={row} className="space-y-1">
              <h2 className="text-lg font-semibold text-primary flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-md flex items-center justify-center text-sm font-bold">
                  {row}
                </div>
                แถว {row}
              </h2>

              {levels.map((level) => (
                <div key={level} className="mb-2">
                  <div className="overflow-x-auto">
                    <div className="flex gap-1 pb-2" style={{ minWidth: 'max-content' }}>
                      {positions.map((position) => {
                        const location = `${row}/${level}/${position}`;
                        const locationItems = itemsByLocation[location] || [];
                        const isSelected = selectedShelf === location;
                        const isHighlighted = highlightedLocations.includes(location);
                        const itemCount = locationItems.length;
                         const totalBoxes = locationItems.reduce((sum, item) => sum + item.box_quantity, 0);
                         const totalLoose = locationItems.reduce((sum, item) => sum + item.loose_quantity, 0);

                        return (
                          <Tooltip key={location}>
                            <TooltipTrigger asChild>
                              <Card
                                className={`
                                  w-28 h-24 transition-all duration-200 hover:shadow-md flex-shrink-0 relative group
                                  ${isSelected ? 'ring-2 ring-primary shadow-lg scale-[1.01] z-10' : ''}
                                  ${isHighlighted ? 'ring-2 ring-yellow-400 bg-yellow-100/90 shadow-md' : ''}
                                  ${itemCount > 0 ? (itemCount > 1 ? 'bg-blue-50/90 border-blue-300/70 hover:bg-blue-100/90' : 'bg-green-50/90 border-green-300/70 hover:bg-green-100/90') : 'bg-gray-50/50 border-gray-200/50 border-dashed hover:bg-gray-100/70'}
                                `}
                              >
                                {/* Action Buttons */}
                                <div className="absolute top-1 right-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                  {/* QR Code Button */}
                                  {onQRCodeClick && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 w-6 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onQRCodeClick(location);
                                      }}
                                    >
                                      <QrCode className="h-3 w-3" />
                                    </Button>
                                  )}

                                  {/* Add/Edit Button */}
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-6 w-6 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleShelfClick(location, locationItems[0]);
                                    }}
                                  >
                                    {itemCount > 0 ? <Edit className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                                  </Button>
                                </div>

                                <CardContent className="p-1.5 h-full flex flex-col justify-between">
                                  {/* Location Label */}
                                  <div className="text-[9px] font-mono text-muted-foreground font-bold text-center leading-none">
                                    {row}{position}/{level}
                                  </div>

                                  {/* Main Content */}
                                  <div className="flex-1 flex flex-col items-center justify-center">
                                    {itemCount > 0 ? (
                                      <div className="text-center w-full">
                                        {/* Status Indicator */}
                                        <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${
                                          itemCount > 1 ? 'bg-blue-500' : 'bg-green-500'
                                        }`}></div>

                                        {/* Item Count for Multiple Items */}
                                        {itemCount > 1 && (
                                          <div className="text-[9px] font-bold text-blue-700 mb-1">
                                            {itemCount} รายการ
                                          </div>
                                        )}

                                        {/* Product Name for Single Item */}
                                        {itemCount === 1 && (
                                          <div className="text-[8px] font-semibold text-green-800 leading-tight mb-1 truncate px-1">
                                            {locationItems[0]?.product_name}
                                          </div>
                                        )}

                                        {/* Quantity Display */}
                                        <div className="text-[8px] font-bold text-foreground">
                                          {totalBoxes > 0 && totalLoose > 0 ? `${totalBoxes}+${totalLoose}` :
                                           totalBoxes > 0 ? `${totalBoxes}` :
                                           totalLoose > 0 ? `${totalLoose}` : '0'}
                                        </div>

                                        {/* LOT for single item */}
                                        {itemCount === 1 && locationItems[0]?.lot && (
                                          <div className="text-[7px] text-muted-foreground mt-1 truncate px-1">
                                            {locationItems[0]?.lot}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-center justify-center h-full">
                                        <Package className="h-3 w-3 text-gray-400 mb-1" />
                                        <div className="text-[8px] text-gray-500">ว่าง</div>
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-3 w-3" />
                                  <span className="font-semibold">ตำแหน่ง: {location}</span>
                                </div>
                                {itemCount > 0 ? (
                                  <>
                                    <div className="text-sm">
                                      จำนวนรายการ: {itemCount}
                                    </div>
                                    <div className="text-sm">
                                      จำนวนรวม: {totalBoxes} ลัง {totalLoose} เศษ
                                    </div>
                                    {itemCount === 1 ? (
                                      <div className="space-y-1 pt-1 border-t">
                                        <div className="font-medium">{locationItems[0]?.product_name}</div>
                                        <div className="text-xs">รหัส: {locationItems[0]?.sku}</div>
                                        {locationItems[0]?.lot && (
                                          <div className="text-xs">Lot: {locationItems[0]?.lot}</div>
                                        )}
                                        {locationItems[0]?.mfd && (
                                          <div className="text-xs">MFD: {locationItems[0]?.mfd}</div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="pt-1 border-t text-xs">
                                        มีสินค้าหลายรายการ คลิกเพื่อดูรายละเอียด
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="text-sm text-muted-foreground">
                                    ตำแหน่งว่าง - คลิกเพื่อเพิ่มสินค้า
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Add New Row Button */}
        <div className="flex justify-center">
          <Button
            onClick={addNewRow}
            variant="outline"
            className="flex items-center gap-2"
            disabled={availableRows.length >= 26} // Max Z
          >
            <Plus className="h-4 w-4" />
            เพิ่มแถวใหม่ ({availableRows.length < 26 ? String.fromCharCode(65 + availableRows.length) : 'สูงสุดแล้ว'})
          </Button>
        </div>

        {/* Legend and Info */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Package className="h-4 w-4" />
              คำอธิบายสัญลักษณ์
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <span>สินค้า 1 รายการ</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                  <span>สินค้าหลายรายการ</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-dashed border-gray-300 bg-gray-50"></div>
                  <span>ตำแหน่งว่าง</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-yellow-400 bg-yellow-100"></div>
                  <span>ผลการค้นหา</span>
                </div>
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-muted-foreground" />
                  <span>เพิ่มสินค้า (hover)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Edit className="h-4 w-4 text-muted-foreground" />
                  <span>แก้ไขสินค้า (hover)</span>
                </div>
              </div>
              <div className="space-y-2">
                <div><strong>ตัวเลขแสดง:</strong> ลัง+เศษ</div>
                <div><strong>5+3</strong> = 5 ลัง 3 เศษ</div>
                <div><strong>10</strong> = 10 ลัง</div>
              </div>
            </div>

            <div className="mt-3 text-xs text-muted-foreground space-y-1">
              <p>• ระบบคลัง: 14 แถว (A-N) × 4 ชั้น × 20 ตำแหน่ง = {14 * 4 * 20} ตำแหน่งทั้งหมด</p>
              <p>• การเรียงชั้น: ชั้น 4 (บนสุด) → ชั้น 3 → ชั้น 2 → ชั้น 1 (ล่างสุด)</p>
              <p>• ตัวเลขในตำแหน่ง: จำนวนลัง+เศษ (เช่น 5+3 = 5 ลัง 3 เศษ)</p>
              <p>• ข้อมูลแสดง: ชื่อสินค้า (รายการเดียว), จำนวนรายการ (หลายรายการ), Lot</p>
              <p>• <strong>Hover ที่ตำแหน่งเพื่อเห็นปุ่มเพิ่ม/แก้ไขสินค้า</strong></p>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}