import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Package, Search, MapPin, Filter, X, CheckSquare, Square, Save } from 'lucide-react';
import type { InventoryItem } from '@/hooks/useInventory';

interface ShelfGridProps {
  items: InventoryItem[];
  onShelfClick: (location: string, item?: InventoryItem) => void;
  onBulkSave?: (locations: string[], itemData: any) => void;
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

export function ShelfGrid({ items, onShelfClick, onBulkSave }: ShelfGridProps) {
  const [selectedShelf, setSelectedShelf] = useState<string | null>(null);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [showBulkSaveDialog, setShowBulkSaveDialog] = useState(false);
  const [bulkSaveData, setBulkSaveData] = useState({
    product_name: '',
    product_code: '',
    quantity_boxes: '',
    quantity_loose: '',
    lot: '',
    mfd: ''
  });
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    lotFilter: '',
    productCodeFilter: '',
    selectedFilters: {}
  });
  const [highlightedLocations, setHighlightedLocations] = useState<string[]>([]);

  // Get unique lots and product codes for filter dropdowns
  const { uniqueLots, uniqueProductCodes } = useMemo(() => {
    const lots = new Set<string>();
    const productCodes = new Set<string>();

    items.forEach(item => {
      if (item.lot) lots.add(item.lot);
      if (item.product_code) productCodes.add(item.product_code);
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
        item.product_code.toLowerCase().includes(filters.searchQuery.toLowerCase());

      const matchesLot = !filters.selectedFilters.lot || item.lot === filters.selectedFilters.lot;
      const matchesProductCode = !filters.selectedFilters.productCode || item.product_code === filters.selectedFilters.productCode;

      return matchesSearch && matchesLot && matchesProductCode;
    });
  }, [items, filters]);

  const handleShelfClick = (location: string) => {
    if (isMultiSelectMode) {
      setSelectedLocations(prev => 
        prev.includes(location) 
          ? prev.filter(loc => loc !== location)
          : [...prev, location]
      );
    } else {
      setSelectedShelf(location);
      const locationItems = itemsByLocation[location];
      // Pass the first item or undefined if no items
      onShelfClick(location, locationItems?.[0]);
    }
  };

  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode(!isMultiSelectMode);
    setSelectedLocations([]);
  };

  const handleBulkSave = () => {
    if (selectedLocations.length === 0) return;
    setShowBulkSaveDialog(true);
  };

  const confirmBulkSave = () => {
    if (!onBulkSave) return;
    
    const saveData = {
      product_name: bulkSaveData.product_name,
      product_code: bulkSaveData.product_code,
      quantity_boxes: parseInt(bulkSaveData.quantity_boxes) || 0,
      quantity_loose: parseInt(bulkSaveData.quantity_loose) || 0,
      lot: bulkSaveData.lot || null,
      mfd: bulkSaveData.mfd || null
    };

    onBulkSave(selectedLocations, saveData);
    setShowBulkSaveDialog(false);
    setSelectedLocations([]);
    setIsMultiSelectMode(false);
    setBulkSaveData({
      product_name: '',
      product_code: '',
      quantity_boxes: '',
      quantity_loose: '',
      lot: '',
      mfd: ''
    });
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

  // Generate shelf grid (A-N rows, 4-1 levels from top to bottom, 1-20 positions)
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
  const levels = [4, 3, 2, 1]; // Display from top to bottom: 4, 3, 2, 1
  const positions = Array.from({ length: 20 }, (_, i) => i + 1);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Multi-Select Controls */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant={isMultiSelectMode ? "default" : "outline"}
                  onClick={toggleMultiSelectMode}
                  className="flex items-center gap-2"
                >
                  {isMultiSelectMode ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                  {isMultiSelectMode ? 'ยกเลิกเลือกหลายตำแหน่ง' : 'เลือกหลายตำแหน่ง'}
                </Button>
                
                {isMultiSelectMode && selectedLocations.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      เลือกแล้ว {selectedLocations.length} ตำแหน่ง
                    </Badge>
                    <Button 
                      onClick={handleBulkSave}
                      className="flex items-center gap-2"
                      size="sm"
                    >
                      <Save className="h-4 w-4" />
                      บันทึกทั้งหมด
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setSelectedLocations([])}
                      size="sm"
                    >
                      ล้างการเลือก
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

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
        {rows.map((row) => (
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
                                       const isMultiSelected = selectedLocations.includes(location);
                      const itemCount = locationItems.length;
                      const totalBoxes = locationItems.reduce((sum, item) => sum + item.quantity_boxes, 0);
                      const totalLoose = locationItems.reduce((sum, item) => sum + item.quantity_loose, 0);

                      return (
                        <Tooltip key={location}>
                          <TooltipTrigger asChild>
                             <Card
                               className={`
                                 w-24 h-20 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.01] flex-shrink-0 relative
                                 ${isSelected ? 'ring-2 ring-primary shadow-lg scale-[1.01] z-10' : ''}
                                 ${isHighlighted ? 'ring-2 ring-yellow-400 bg-yellow-100/90 shadow-md' : ''}
                                 ${isMultiSelected ? 'ring-2 ring-blue-500 bg-blue-100/90 shadow-md' : ''}
                                 ${itemCount > 0 ? (itemCount > 1 ? 'bg-blue-50/90 border-blue-300/70 hover:bg-blue-100/90' : 'bg-green-50/90 border-green-300/70 hover:bg-green-100/90') : 'bg-gray-50/50 border-gray-200/50 border-dashed hover:bg-gray-100/70'}
                               `}
                               onClick={() => handleShelfClick(location)}
                             >
                               {/* Multi-select indicator */}
                               {isMultiSelectMode && (
                                 <div className="absolute top-1 right-1 z-20">
                                   {isMultiSelected ? (
                                     <CheckSquare className="h-3 w-3 text-blue-600" />
                                   ) : (
                                     <Square className="h-3 w-3 text-gray-400" />
                                   )}
                                 </div>
                               )}
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
                                      {itemCount === 1 && locationItems[0].product_name && (
                                        <div className="text-[8px] font-semibold text-green-700 mb-1 truncate px-0.5">
                                          {locationItems[0].product_name.slice(0, 10)}
                                        </div>
                                      )}

                                      {/* Quantity */}
                                      <div className={`text-[9px] font-bold ${
                                        itemCount > 1 ? 'text-blue-700' : 'text-green-700'
                                      }`}>
                                        {totalBoxes + totalLoose > 0 ?
                                          `${totalBoxes}+${totalLoose}` :
                                          '0'
                                        }
                                      </div>

                                      {/* Lot for Single Item */}
                                      {itemCount === 1 && locationItems[0].lot && (
                                        <div className="text-[7px] text-muted-foreground mt-0.5 truncate">
                                          L:{locationItems[0].lot}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-center">
                                      <div className="w-3 h-3 bg-gray-300 rounded-full mx-auto"></div>
                                      <div className="text-[8px] text-gray-400 mt-1">ว่าง</div>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-80">
                            <div className="text-sm space-y-2">
                              {/* Header */}
                              <div className="font-bold text-primary border-b pb-1">
                                📍 ตำแหน่ง: {location}
                              </div>

                              {itemCount > 0 ? (
                                <div className="space-y-2">
                                  {/* Summary */}
                                  <div className="flex justify-between items-center bg-muted/50 p-2 rounded">
                                    <span className="font-medium">รายการทั้งหมด:</span>
                                    <span className="font-bold">{itemCount} รายการ</span>
                                  </div>

                                  <div className="flex justify-between items-center">
                                    <span>📦 ลัง: <span className="font-semibold">{totalBoxes}</span></span>
                                    <span>📋 เศษ: <span className="font-semibold">{totalLoose}</span></span>
                                  </div>

                                  {/* Items Detail */}
                                  <div className="space-y-1">
                                    <div className="font-medium text-xs text-muted-foreground uppercase tracking-wide">รายละเอียดสินค้า:</div>
                                    {locationItems.slice(0, 4).map((item) => (
                                      <div key={`${item.id}-${item.location}`} className="text-xs bg-background p-2 rounded border-l-2 border-l-primary/30">
                                        <div className="font-medium">{item.product_name}</div>
                                        <div className="text-muted-foreground flex justify-between mt-1">
                                          <span>รหัส: {item.product_code}</span>
                                          {item.lot && <span>Lot: {item.lot}</span>}
                                        </div>
                                        {item.mfd && (
                                          <div className="text-muted-foreground text-[10px] mt-0.5">
                                            MFD: {item.mfd}
                                          </div>
                                        )}
                                        <div className="font-medium text-xs mt-1">
                                          {item.quantity_boxes}ลัง + {item.quantity_loose}เศษ
                                        </div>
                                      </div>
                                    ))}
                                    {itemCount > 4 && (
                                      <div className="text-xs text-muted-foreground text-center py-1 italic">
                                        และอีก {itemCount - 4} รายการ... (คลิกเพื่อดูทั้งหมด)
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center text-muted-foreground py-4">
                                  <div className="text-2xl mb-2">📂</div>
                                  <div>ตำแหน่งว่าง</div>
                                  <div className="text-xs mt-1">คลิกเพื่อเพิ่มสินค้า</div>
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

      {/* Info */}
      <Card className="border-0 bg-muted/30">
        <CardContent className="p-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-50 border border-green-200 rounded flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                </div>
                <span>มีสินค้า (1 รายการ)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-50 border border-blue-200 rounded flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                </div>
                <span>หลายรายการ</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-50 border border-gray-200 border-dashed rounded flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
                </div>
                <span>ตำแหน่งว่าง</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-50 border-2 border-yellow-400 rounded"></div>
                <span>ผลการค้นหา</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <MapPin className="h-3 w-3" />
              <span>คลิกที่ตำแหน่งเพื่อจัดการสินค้า</span>
            </div>
          </div>

          <div className="mt-3 text-xs text-muted-foreground space-y-1">
            <p>• ระบบคลัง: 14 แถว (A-N) × 4 ชั้น × 20 ตำแหน่ง = {14 * 4 * 20} ตำแหน่งทั้งหมด</p>
            <p>• การเรียงชั้น: ชั้น 4 (บนสุด) → ชั้น 3 → ชั้น 2 → ชั้น 1 (ล่างสุด)</p>
            <p>• ตัวเลขในตำแหน่ง: จำนวนลัง+เศษ (เช่น 5+3 = 5 ลัง 3 เศษ)</p>
            <p>• ข้อมูลแสดง: ชื่อสินค้า (รายการเดียว), จำนวนรายการ (หลายรายการ), Lot</p>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Save Dialog */}
      <Dialog open={showBulkSaveDialog} onOpenChange={setShowBulkSaveDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>บันทึกข้อมูลหลายตำแหน่ง</DialogTitle>
            <DialogDescription>
              บันทึกข้อมูลสินค้าให้กับ {selectedLocations.length} ตำแหน่งที่เลือก
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="product_name" className="text-right">
                ชื่อสินค้า
              </Label>
              <Input
                id="product_name"
                value={bulkSaveData.product_name}
                onChange={(e) => setBulkSaveData(prev => ({ ...prev, product_name: e.target.value }))}
                className="col-span-3"
                placeholder="ป้อนชื่อสินค้า"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="product_code" className="text-right">
                รหัสสินค้า
              </Label>
              <Input
                id="product_code"
                value={bulkSaveData.product_code}
                onChange={(e) => setBulkSaveData(prev => ({ ...prev, product_code: e.target.value }))}
                className="col-span-3"
                placeholder="ป้อนรหัสสินค้า"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity_boxes" className="text-right">
                จำนวนลัง
              </Label>
              <Input
                id="quantity_boxes"
                type="number"
                value={bulkSaveData.quantity_boxes}
                onChange={(e) => setBulkSaveData(prev => ({ ...prev, quantity_boxes: e.target.value }))}
                className="col-span-3"
                placeholder="0"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity_loose" className="text-right">
                จำนวนเศษ
              </Label>
              <Input
                id="quantity_loose"
                type="number"
                value={bulkSaveData.quantity_loose}
                onChange={(e) => setBulkSaveData(prev => ({ ...prev, quantity_loose: e.target.value }))}
                className="col-span-3"
                placeholder="0"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="lot" className="text-right">
                Lot
              </Label>
              <Input
                id="lot"
                value={bulkSaveData.lot}
                onChange={(e) => setBulkSaveData(prev => ({ ...prev, lot: e.target.value }))}
                className="col-span-3"
                placeholder="ป้อน Lot (ไม่บังคับ)"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="mfd" className="text-right">
                วันที่ผลิต
              </Label>
              <Input
                id="mfd"
                type="date"
                value={bulkSaveData.mfd}
                onChange={(e) => setBulkSaveData(prev => ({ ...prev, mfd: e.target.value }))}
                className="col-span-3"
              />
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground mb-4">
            <div className="font-medium mb-2">ตำแหน่งที่จะบันทึก:</div>
            <div className="flex flex-wrap gap-1">
              {selectedLocations.map(location => (
                <Badge key={location} variant="outline" className="text-xs">
                  {location}
                </Badge>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowBulkSaveDialog(false)}>
              ยกเลิก
            </Button>
            <Button 
              type="button" 
              onClick={confirmBulkSave}
              disabled={!bulkSaveData.product_name || !bulkSaveData.product_code}
            >
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </TooltipProvider>
  );
}