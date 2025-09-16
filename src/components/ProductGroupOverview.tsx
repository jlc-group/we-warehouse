import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PieChart, Package, MapPin, Palette, BarChart3, Eye, EyeOff, Search, Filter, X, ChevronDown, ChevronUp, CheckSquare, Square, RotateCcw } from 'lucide-react';
import type { InventoryItem } from '@/hooks/useInventory';

interface ProductGroupOverviewProps {
  items: InventoryItem[];
  onShelfClick: (location: string, item?: InventoryItem) => void;
}

type ViewMode = 'product' | 'lot' | 'density';

interface FilterState {
  searchQuery: string;
  selectedLot: string;
  selectedProductCode: string;
  selectedRow: string;
}

// Color palette for different products (colorblind-friendly)
const COLOR_PALETTE = [
  '#2563eb', // Blue
  '#dc2626', // Red
  '#16a34a', // Green
  '#ca8a04', // Yellow
  '#9333ea', // Purple
  '#c2410c', // Orange
  '#0891b2', // Cyan
  '#be185d', // Pink
  '#65a30d', // Lime
  '#7c2d12', // Brown
  '#1f2937', // Gray
  '#0f766e', // Teal
  '#a21caf', // Magenta
  '#166534', // Dark Green
  '#7c3aed', // Violet
  '#b91c1c', // Dark Red
  '#0369a1', // Dark Blue
  '#059669', // Emerald
  '#d97706', // Amber
  '#7e22ce', // Deep Purple
];

export function ProductGroupOverview({ items, onShelfClick }: ProductGroupOverviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('product');
  const [hiddenGroups, setHiddenGroups] = useState<Set<string>>(new Set());
  const [legendSearch, setLegendSearch] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    selectedLot: '',
    selectedProductCode: '',
    selectedRow: ''
  });

  // Get filter options
  const filterOptions = useMemo(() => {
    const lots = new Set<string>();
    const productCodes = new Set<string>();
    const rows = new Set<string>();

    items.forEach(item => {
      if (item.lot) lots.add(item.lot);
      if (item.product_code) productCodes.add(item.product_code);
      const row = item.location.split('/')[0];
      if (row) rows.add(row);
    });

    return {
      lots: Array.from(lots).sort(),
      productCodes: Array.from(productCodes).sort(),
      rows: Array.from(rows).sort()
    };
  }, [items]);

  // Filter items based on search and filter criteria
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Search query filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesSearch =
          item.product_name.toLowerCase().includes(query) ||
          item.product_code.toLowerCase().includes(query) ||
          item.location.toLowerCase().includes(query) ||
          (item.lot && item.lot.toLowerCase().includes(query));

        if (!matchesSearch) return false;
      }

      // Lot filter
      if (filters.selectedLot && item.lot !== filters.selectedLot) {
        return false;
      }

      // Product code filter
      if (filters.selectedProductCode && item.product_code !== filters.selectedProductCode) {
        return false;
      }

      // Row filter
      if (filters.selectedRow) {
        const itemRow = item.location.split('/')[0];
        if (itemRow !== filters.selectedRow) {
          return false;
        }
      }

      return true;
    });
  }, [items, filters]);

  // Update filter state
  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      searchQuery: '',
      selectedLot: '',
      selectedProductCode: '',
      selectedRow: ''
    });
  };

  // Get active filter count
  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(value => value !== '').length;
  }, [filters]);


  // Master control functions
  const showAllProducts = () => {
    setHiddenGroups(new Set());
  };

  const hideAllProducts = () => {
    const allProducts = new Set(Object.keys(productDistribution));
    setHiddenGroups(allProducts);
  };

  const invertSelection = () => {
    const allProducts = new Set(Object.keys(productDistribution));
    const newHidden = new Set<string>();

    allProducts.forEach(product => {
      if (!hiddenGroups.has(product)) {
        newHidden.add(product);
      }
    });

    setHiddenGroups(newHidden);
  };

  const toggleGroupCollapse = (groupName: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(groupName)) {
      newCollapsed.delete(groupName);
    } else {
      newCollapsed.add(groupName);
    }
    setCollapsedGroups(newCollapsed);
  };

  const toggleGroupVisibility = (groupName: string, products: string[]) => {
    const newHidden = new Set(hiddenGroups);
    const isGroupHidden = products.every(product => hiddenGroups.has(product));

    if (isGroupHidden) {
      // Show all products in group
      products.forEach(product => newHidden.delete(product));
    } else {
      // Hide all products in group
      products.forEach(product => newHidden.add(product));
    }

    setHiddenGroups(newHidden);
  };

  // Get unique products and assign colors (using all items for consistent colors)
  const productColorMap = useMemo(() => {
    const uniqueProducts = [...new Set(items.map(item => item.product_code))].sort();
    const colorMap: Record<string, string> = {};

    uniqueProducts.forEach((product, index) => {
      colorMap[product] = COLOR_PALETTE[index % COLOR_PALETTE.length];
    });

    return colorMap;
  }, [items]);

  // Get unique lots and assign colors (using all items for consistent colors)
  const lotColorMap = useMemo(() => {
    const uniqueLots = [...new Set(items.map(item => item.lot).filter(Boolean))].sort();
    const colorMap: Record<string, string> = {};

    uniqueLots.forEach((lot, index) => {
      colorMap[lot] = COLOR_PALETTE[index % COLOR_PALETTE.length];
    });

    return colorMap;
  }, [items]);

  // Group filtered items by location
  const itemsByLocation = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
      if (!acc[item.location]) {
        acc[item.location] = [];
      }
      acc[item.location].push(item);
      return acc;
    }, {} as Record<string, InventoryItem[]>);
  }, [filteredItems]);

  // Calculate statistics based on filtered data
  const statistics = useMemo(() => {
    const stats = {
      totalLocations: Object.keys(itemsByLocation).length,
      totalProducts: new Set(filteredItems.map(item => item.product_code)).size,
      totalLots: new Set(filteredItems.map(item => item.lot).filter(Boolean)).size,
      totalItems: filteredItems.length,
      avgItemsPerLocation: 0
    };

    stats.avgItemsPerLocation = stats.totalItems / (stats.totalLocations || 1);

    return stats;
  }, [filteredItems, itemsByLocation]);

  // Get product distribution based on filtered data
  const productDistribution = useMemo(() => {
    const dist: Record<string, { count: number; locations: number; totalBoxes: number; totalLoose: number }> = {};

    filteredItems.forEach(item => {
      if (!dist[item.product_code]) {
        dist[item.product_code] = { count: 0, locations: 0, totalBoxes: 0, totalLoose: 0 };
      }
      dist[item.product_code].count++;
      dist[item.product_code].totalBoxes += item.quantity_boxes;
      dist[item.product_code].totalLoose += item.quantity_loose;
    });

    // Count unique locations per product
    Object.keys(dist).forEach(productCode => {
      const locations = new Set(filteredItems.filter(item => item.product_code === productCode).map(item => item.location));
      dist[productCode].locations = locations.size;
    });

    return dist;
  }, [filteredItems]);

  // Group products by popularity (number of locations)
  const productGroups = useMemo(() => {
    const groups = {
      major: [] as Array<[string, typeof productDistribution[string]]>,
      regular: [] as Array<[string, typeof productDistribution[string]]>,
      minor: [] as Array<[string, typeof productDistribution[string]]>
    };

    Object.entries(productDistribution).forEach(([productCode, data]) => {
      if (legendSearch && !productCode.toLowerCase().includes(legendSearch.toLowerCase())) {
        return; // Skip if doesn't match search
      }

      if (data.locations >= 10) {
        groups.major.push([productCode, data]);
      } else if (data.locations >= 5) {
        groups.regular.push([productCode, data]);
      } else {
        groups.minor.push([productCode, data]);
      }
    });

    // Sort each group by location count (descending)
    groups.major.sort(([, a], [, b]) => b.locations - a.locations);
    groups.regular.sort(([, a], [, b]) => b.locations - a.locations);
    groups.minor.sort(([, a], [, b]) => b.locations - a.locations);

    return groups;
  }, [productDistribution, legendSearch]);

  const toggleSingleGroupVisibility = (group: string) => {
    const newHidden = new Set(hiddenGroups);
    if (newHidden.has(group)) {
      newHidden.delete(group);
    } else {
      newHidden.add(group);
    }
    setHiddenGroups(newHidden);
  };

  const getLocationColor = (location: string) => {
    const locationItems = itemsByLocation[location] || [];
    if (locationItems.length === 0) return '#f3f4f6'; // Gray for empty

    switch (viewMode) {
      case 'product': {
        // Use color of the most common product in this location
        const productCounts: Record<string, number> = {};
        locationItems.forEach(item => {
          productCounts[item.product_code] = (productCounts[item.product_code] || 0) + 1;
        });
        const dominantProduct = Object.keys(productCounts).reduce((a, b) =>
          productCounts[a] > productCounts[b] ? a : b
        );
        return hiddenGroups.has(dominantProduct) ? '#f3f4f6' : productColorMap[dominantProduct];
      }

      case 'lot': {
        // Use color of the most common lot in this location
        const lotCounts: Record<string, number> = {};
        locationItems.forEach(item => {
          if (item.lot) {
            lotCounts[item.lot] = (lotCounts[item.lot] || 0) + 1;
          }
        });
        if (Object.keys(lotCounts).length === 0) return '#e5e7eb';
        const dominantLot = Object.keys(lotCounts).reduce((a, b) =>
          lotCounts[a] > lotCounts[b] ? a : b
        );
        return hiddenGroups.has(dominantLot) ? '#f3f4f6' : lotColorMap[dominantLot];
      }

      case 'density': {
        // Use color intensity based on quantity
        const totalQuantity = locationItems.reduce((sum, item) => sum + item.quantity_boxes + item.quantity_loose, 0);
        const maxQuantity = Math.max(...Object.values(itemsByLocation).map(items =>
          items.reduce((sum, item) => sum + item.quantity_boxes + item.quantity_loose, 0)
        ));
        const intensity = totalQuantity / (maxQuantity || 1);
        const alpha = Math.max(0.2, intensity);
        return `rgba(37, 99, 235, ${alpha})`; // Blue with varying opacity
      }

      default:
        return '#e5e7eb';
    }
  };

  // Generate shelf grid (A-N rows, 4-1 levels from top to bottom, 1-20 positions)
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
  const levels = [4, 3, 2, 1];
  const positions = Array.from({ length: 20 }, (_, i) => i + 1);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              ภาพรวมตามกลุ่มสินค้า
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{statistics.totalLocations}</div>
                <div className="text-sm text-muted-foreground">ตำแหน่งที่มีสินค้า</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{statistics.totalProducts}</div>
                <div className="text-sm text-muted-foreground">สินค้าต่างชนิด</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{statistics.totalLots}</div>
                <div className="text-sm text-muted-foreground">Lot ต่างกัน</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{statistics.totalItems}</div>
                <div className="text-sm text-muted-foreground">รายการทั้งหมด</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{statistics.avgItemsPerLocation.toFixed(1)}</div>
                <div className="text-sm text-muted-foreground">เฉลี่ย/ตำแหน่ง</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search and Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              ค้นหาและกรองข้อมูล
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFilterCount} ตัวกรอง
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="ค้นหาตามชื่อสินค้า รหัสสินค้า ตำแหน่ง หรือ Lot..."
                value={filters.searchQuery}
                onChange={(e) => updateFilter('searchQuery', e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select value={filters.selectedProductCode || "__all__"} onValueChange={(value) => updateFilter('selectedProductCode', value === "__all__" ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกรหัสสินค้า" />
                </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="__all__">ทั้งหมด</SelectItem>
                   {filterOptions.productCodes.filter(code => code && code.trim()).map(code => (
                     <SelectItem key={code} value={code}>{code}</SelectItem>
                   ))}
                 </SelectContent>
              </Select>

              <Select value={filters.selectedLot || "__all__"} onValueChange={(value) => updateFilter('selectedLot', value === "__all__" ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือก Lot" />
                </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="__all__">ทั้งหมด</SelectItem>
                   {filterOptions.lots.filter(lot => lot && lot.trim()).map(lot => (
                     <SelectItem key={lot} value={lot}>Lot: {lot}</SelectItem>
                   ))}
                 </SelectContent>
              </Select>

              <Select value={filters.selectedRow || "__all__"} onValueChange={(value) => updateFilter('selectedRow', value === "__all__" ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกแถว" />
                </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="__all__">ทั้งหมด</SelectItem>
                   {filterOptions.rows.filter(row => row && row.trim()).map(row => (
                     <SelectItem key={row} value={row}>แถว {row}</SelectItem>
                   ))}
                 </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={clearAllFilters}
                disabled={activeFilterCount === 0}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                ล้างทั้งหมด
              </Button>
            </div>

            {/* Active Filter Tags */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2">
                {filters.searchQuery && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    ค้นหา: "{filters.searchQuery}"
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => updateFilter('searchQuery', '')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {filters.selectedProductCode && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    รหัส: {filters.selectedProductCode}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => updateFilter('selectedProductCode', '')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {filters.selectedLot && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Lot: {filters.selectedLot}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => updateFilter('selectedLot', '')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {filters.selectedRow && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    แถว: {filters.selectedRow}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => updateFilter('selectedRow', '')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
              </div>
            )}

            {/* Filter Results Summary */}
            {activeFilterCount > 0 && (
              <div className="text-sm text-muted-foreground">
                📊 แสดงผลลัพธ์: {statistics.totalItems} รายการ ใน {statistics.totalLocations} ตำแหน่ง
                {statistics.totalItems !== items.length && (
                  <span className="ml-2 text-orange-600 font-medium">
                    (กรองจาก {items.length} รายการ)
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Mode Selection */}
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="product" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              ตามรหัสสินค้า
            </TabsTrigger>
            <TabsTrigger value="lot" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              ตาม Lot
            </TabsTrigger>
            <TabsTrigger value="density" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              ความหนาแน่น
            </TabsTrigger>
          </TabsList>

          {/* Product View */}
          <TabsContent value="product" className="space-y-4">
            {/* Enhanced Product Legend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>ตำนานสี - รหัสสินค้า</span>
                  <Badge variant="secondary">
                    {Object.keys(productDistribution).length - hiddenGroups.size} / {Object.keys(productDistribution).length} แสดง
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search and Master Controls */}
                <div className="space-y-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="ค้นหาในตำนาน..."
                      value={legendSearch}
                      onChange={(e) => setLegendSearch(e.target.value)}
                      className="pl-10 h-9"
                    />
                  </div>

                  {/* Master Controls */}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={showAllProducts} className="flex items-center gap-1">
                      <CheckSquare className="h-3 w-3" />
                      แสดงทั้งหมด
                    </Button>
                    <Button variant="outline" size="sm" onClick={hideAllProducts} className="flex items-center gap-1">
                      <Square className="h-3 w-3" />
                      ซ่อนทั้งหมด
                    </Button>
                    <Button variant="outline" size="sm" onClick={invertSelection} className="flex items-center gap-1">
                      <RotateCcw className="h-3 w-3" />
                      กลับด้าน
                    </Button>
                  </div>
                </div>

                {/* Product Groups */}
                <div className="space-y-3">
                  {/* Major Products Group */}
                  {productGroups.major.length > 0 && (
                    <div className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-3">
                        <Button
                          variant="ghost"
                          onClick={() => toggleGroupCollapse('major')}
                          className="flex items-center gap-2 p-0 h-auto"
                        >
                          {collapsedGroups.has('major') ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                          <Package className="h-4 w-4 text-red-600" />
                          <span className="font-medium">สินค้าหลัก ({productGroups.major.length} รายการ)</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleGroupVisibility('major', productGroups.major.map(([code]) => code))}
                          className="h-6 text-xs"
                        >
                          {productGroups.major.every(([code]) => hiddenGroups.has(code)) ? 'แสดง' : 'ซ่อน'}กลุ่ม
                        </Button>
                      </div>

                      {!collapsedGroups.has('major') && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {productGroups.major.map(([productCode, data]) => (
                            <div key={productCode} className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 border-2"
                                style={{
                                  backgroundColor: hiddenGroups.has(productCode) ? '#f3f4f6' : productColorMap[productCode],
                                  borderColor: productColorMap[productCode]
                                }}
                                onClick={() => toggleSingleGroupVisibility(productCode)}
                              >
                                {hiddenGroups.has(productCode) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </Button>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{productCode}</div>
                                <div className="text-xs text-muted-foreground">{data.locations} ตำแหน่ง</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Regular Products Group */}
                  {productGroups.regular.length > 0 && (
                    <div className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-3">
                        <Button
                          variant="ghost"
                          onClick={() => toggleGroupCollapse('regular')}
                          className="flex items-center gap-2 p-0 h-auto"
                        >
                          {collapsedGroups.has('regular') ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                          <Package className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">สินค้าทั่วไป ({productGroups.regular.length} รายการ)</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleGroupVisibility('regular', productGroups.regular.map(([code]) => code))}
                          className="h-6 text-xs"
                        >
                          {productGroups.regular.every(([code]) => hiddenGroups.has(code)) ? 'แสดง' : 'ซ่อน'}กลุ่ม
                        </Button>
                      </div>

                      {!collapsedGroups.has('regular') && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {productGroups.regular.map(([productCode, data]) => (
                            <div key={productCode} className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 border-2"
                                style={{
                                  backgroundColor: hiddenGroups.has(productCode) ? '#f3f4f6' : productColorMap[productCode],
                                  borderColor: productColorMap[productCode]
                                }}
                                onClick={() => toggleSingleGroupVisibility(productCode)}
                              >
                                {hiddenGroups.has(productCode) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </Button>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{productCode}</div>
                                <div className="text-xs text-muted-foreground">{data.locations} ตำแหน่ง</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Minor Products Group */}
                  {productGroups.minor.length > 0 && (
                    <div className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-3">
                        <Button
                          variant="ghost"
                          onClick={() => toggleGroupCollapse('minor')}
                          className="flex items-center gap-2 p-0 h-auto"
                        >
                          {collapsedGroups.has('minor') ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                          <Package className="h-4 w-4 text-gray-600" />
                          <span className="font-medium">สินค้าน้อย ({productGroups.minor.length} รายการ)</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleGroupVisibility('minor', productGroups.minor.map(([code]) => code))}
                          className="h-6 text-xs"
                        >
                          {productGroups.minor.every(([code]) => hiddenGroups.has(code)) ? 'แสดง' : 'ซ่อน'}กลุ่ม
                        </Button>
                      </div>

                      {!collapsedGroups.has('minor') && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {productGroups.minor.map(([productCode, data]) => (
                            <div key={productCode} className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 border-2"
                                style={{
                                  backgroundColor: hiddenGroups.has(productCode) ? '#f3f4f6' : productColorMap[productCode],
                                  borderColor: productColorMap[productCode]
                                }}
                                onClick={() => toggleSingleGroupVisibility(productCode)}
                              >
                                {hiddenGroups.has(productCode) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </Button>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{productCode}</div>
                                <div className="text-xs text-muted-foreground">{data.locations} ตำแหน่ง</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* No Results */}
                  {legendSearch && productGroups.major.length === 0 && productGroups.regular.length === 0 && productGroups.minor.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>ไม่พบสินค้าที่ตรงกับ "{legendSearch}"</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Lot View */}
          <TabsContent value="lot" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ตำนานสี - Lot</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {Object.keys(lotColorMap).sort().map((lot) => (
                    <div key={lot} className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 border-2"
                        style={{
                          backgroundColor: hiddenGroups.has(lot) ? '#f3f4f6' : lotColorMap[lot],
                          borderColor: lotColorMap[lot]
                        }}
                        onClick={() => toggleSingleGroupVisibility(lot)}
                      >
                        {hiddenGroups.has(lot) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">Lot: {lot}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Density View */}
          <TabsContent value="density" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ความหนาแน่นสินค้า</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">น้อย</span>
                  <div className="flex gap-1">
                    {[0.2, 0.4, 0.6, 0.8, 1.0].map((opacity) => (
                      <div
                        key={opacity}
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: `rgba(37, 99, 235, ${opacity})` }}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">มาก</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Warehouse Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">แผนผังคลัง - {viewMode === 'product' ? 'ตามรหัสสินค้า' : viewMode === 'lot' ? 'ตาม Lot' : 'ความหนาแน่น'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rows.map((row) => (
                <div key={row} className="space-y-1">
                  <h3 className="text-md font-semibold text-primary flex items-center gap-2">
                    <div className="w-5 h-5 bg-primary text-primary-foreground rounded flex items-center justify-center text-xs font-bold">
                      {row}
                    </div>
                    แถว {row}
                  </h3>

                  {levels.map((level) => (
                    <div key={level} className="mb-2">
                      <div className="overflow-x-auto">
                        <div className="flex gap-1 pb-2" style={{ minWidth: 'max-content' }}>
                          {positions.map((position) => {
                            const location = `${row}/${level}/${position}`;
                            const locationItems = itemsByLocation[location] || [];
                            const locationColor = getLocationColor(location);
                            const totalQuantity = locationItems.reduce((sum, item) => sum + item.quantity_boxes + item.quantity_loose, 0);

                            return (
                              <Tooltip key={location}>
                                <TooltipTrigger asChild>
                                  <div
                                    className="w-20 h-16 border border-gray-300 rounded cursor-pointer hover:shadow-md transition-all duration-200 flex flex-col justify-between p-1"
                                    style={{ backgroundColor: locationColor }}
                                    onClick={() => handleShelfClick(location)}
                                  >
                                    <div className="text-[8px] font-mono text-gray-700 text-center leading-none">
                                      {row}{position}/{level}
                                    </div>

                                    {locationItems.length > 0 && (
                                      <div className="text-center">
                                        <div className="text-[8px] font-bold text-gray-700">
                                          {locationItems.length} รายการ
                                        </div>
                                        <div className="text-[7px] text-gray-600">
                                          {totalQuantity} ชิ้น
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-80">
                                  <div className="text-sm space-y-2">
                                    <div className="font-bold text-primary">📍 ตำแหน่ง: {location}</div>
                                    {locationItems.length > 0 ? (
                                      <>
                                        <div className="text-xs">รายการสินค้า: {locationItems.length}</div>
                                        <div className="space-y-1">
                                          {locationItems.slice(0, 3).map((item, idx) => (
                                            <div key={idx} className="text-xs bg-background p-1 rounded border-l-2 border-l-primary/30">
                                              <div className="font-medium">{item.product_name}</div>
                                              <div className="text-muted-foreground">
                                                รหัส: {item.product_code} {item.lot && `• Lot: ${item.lot}`}
                                              </div>
                                              <div>{item.quantity_boxes} ลัง + {item.quantity_loose} เศษ</div>
                                            </div>
                                          ))}
                                          {locationItems.length > 3 && (
                                            <div className="text-xs text-muted-foreground text-center">
                                              และอีก {locationItems.length - 3} รายการ...
                                            </div>
                                          )}
                                        </div>
                                      </>
                                    ) : (
                                      <div className="text-muted-foreground">ตำแหน่งว่าง</div>
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
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );

  function handleShelfClick(location: string) {
    const locationItems = itemsByLocation[location] || [];
    onShelfClick(location, locationItems[0]);
  }
}