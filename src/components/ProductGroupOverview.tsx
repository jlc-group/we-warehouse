import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FilterButton } from '@/components/ui/filter-button';
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
  const [gridViewMode, setGridViewMode] = useState<'filtered' | 'all'>('filtered');

  // Get filter options
  const filterOptions = useMemo(() => {
    const lots = new Set<string>();
    const productCodes = new Set<string>();
    const rows = new Set<string>();

    items.forEach(item => {
      if (item.lot) lots.add(item.lot);
      if (item.sku) productCodes.add(item.sku);
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
          item.sku.toLowerCase().includes(query) ||
          item.location.toLowerCase().includes(query) ||
          (item.lot && item.lot.toLowerCase().includes(query));

        if (!matchesSearch) return false;
      }

      // Lot filter
      if (filters.selectedLot && item.lot !== filters.selectedLot) {
        return false;
      }

      // Product code filter
      if (filters.selectedProductCode && item.sku !== filters.selectedProductCode) {
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
    const uniqueProducts = [...new Set(items.map(item => item.sku))].sort();
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
      totalProducts: new Set(filteredItems.map(item => item.sku)).size,
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
      if (!dist[item.sku]) {
        dist[item.sku] = { count: 0, locations: 0, totalBoxes: 0, totalLoose: 0 };
      }
      dist[item.sku].count++;
      dist[item.sku].totalBoxes += ((item as any).carton_quantity_legacy || 0);
      dist[item.sku].totalLoose += ((item as any).box_quantity_legacy || 0);
    });

    // Count unique locations per product
    Object.keys(dist).forEach(productCode => {
      const locations = new Set(filteredItems.filter(item => item.sku === productCode).map(item => item.location));
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
          productCounts[item.sku] = (productCounts[item.sku] || 0) + 1;
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
        const totalQuantity = locationItems.reduce((sum, item) => sum + ((item as any).carton_quantity_legacy || 0) + ((item as any).box_quantity_legacy || 0), 0);
        const maxQuantity = Math.max(...Object.values(itemsByLocation).map(items =>
          items.reduce((sum, item) => sum + ((item as any).carton_quantity_legacy || 0) + ((item as any).box_quantity_legacy || 0), 0)
        ));
        const intensity = totalQuantity / (maxQuantity || 1);
        const alpha = Math.max(0.2, intensity);
        return `rgba(37, 99, 235, ${alpha})`; // Blue with varying opacity
      }

      default:
        return '#e5e7eb';
    }
  };

  // Generate shelf grid (A-Z rows, 4-1 levels from top to bottom, 1-20 positions)
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
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
                    <Button variant="outline" size="sm" onClick={showAllProducts} className="flex items-center gap-1 text-xs">
                      <CheckSquare className="h-3 w-3" />
                      แสดงทั้งหมด
                    </Button>
                    <Button variant="outline" size="sm" onClick={hideAllProducts} className="flex items-center gap-1 text-xs">
                      <Square className="h-3 w-3" />
                      ซ่อนทั้งหมด
                    </Button>
                    <Button variant="outline" size="sm" onClick={invertSelection} className="flex items-center gap-1 text-xs">
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

        {/* Enhanced Warehouse Grid with Smart Filtering */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>แผนผังคลัง - {viewMode === 'product' ? 'ตามรหัสสินค้า' : viewMode === 'lot' ? 'ตาม Lot' : 'ความหนาแน่น'}</span>
              <div className="flex items-center gap-2">
                {/* Grid View Mode Toggle */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
                  <Button
                    variant={gridViewMode === 'filtered' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setGridViewMode('filtered')}
                    className="h-7 px-2 text-xs"
                  >
                    เฉพาะฟิลเตอร์
                  </Button>
                  <Button
                    variant={gridViewMode === 'all' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setGridViewMode('all')}
                    className="h-7 px-2 text-xs"
                  >
                    ทั้งหมด
                  </Button>
                </div>
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    แสดง: {statistics.totalLocations} ตำแหน่ง
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {Object.keys(itemsByLocation).length > 0 ? 'มีสินค้า' : 'ไม่มีสินค้า'}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(itemsByLocation).length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Package className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <h3 className="text-lg font-medium mb-2">ไม่พบสินค้าตามเงื่อนไขที่เลือก</h3>
                <p className="text-sm">ลองปรับเปลี่ยนตัวกรองหรือล้างการค้นหาเพื่อดูสินค้าทั้งหมด</p>
                <Button
                  variant="outline"
                  onClick={clearAllFilters}
                  className="mt-4 flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  ล้างตัวกรองทั้งหมด
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Filter Summary */}
                {activeFilterCount > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-blue-700">
                        <Filter className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          ผลการฟิลเตอร์: แสดง {statistics.totalItems} รายการ ใน {statistics.totalLocations} ตำแหน่ง
                        </span>
                      </div>
                      <div className="text-xs text-blue-600">
                        โหมด: {gridViewMode === 'filtered' ? 'เฉพาะฟิลเตอร์' : 'ทั้งหมด'}
                      </div>
                    </div>
                    {statistics.totalItems !== items.length && (
                      <div className="text-xs text-blue-600 mt-1">
                        (กรองจาก {items.length} รายการทั้งหมด)
                      </div>
                    )}
                  </div>
                )}

                {/* Grid Mode Explanation */}
                {gridViewMode === 'filtered' && activeFilterCount > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                    <div className="text-xs text-green-700">
                      💡 <strong>โหมดเฉพาะฟิลเตอร์:</strong> แสดงเฉพาะแถว/ชั้นที่มีสินค้าตามเงื่อนไขที่เลือก
                    </div>
                  </div>
                )}
                {gridViewMode === 'all' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                    <div className="text-xs text-amber-700">
                      📋 <strong>โหมดทั้งหมด:</strong> แสดงทุกตำแหน่งในคลัง (ตำแหน่งที่มีสินค้าตามฟิลเตอร์จะเด่นชัด)
                    </div>
                  </div>
                )}

                {/* Smart Grid Display - Show based on selected mode */}
                <div className="space-y-3">
                  {rows
                    .filter(row => {
                      if (gridViewMode === 'all') {
                        return true; // Show all rows
                      }
                      // Only show rows that have items after filtering
                      return levels.some(level =>
                        positions.some(position => {
                          const location = `${row}/${level}/${position.toString().padStart(2, '0')}`;
                          return (itemsByLocation[location] || []).length > 0;
                        })
                      );
                    })
                    .map((row) => {
                      // Count items in this row for display
                      const rowItemCount = levels.reduce((rowSum, level) =>
                        rowSum + positions.reduce((levelSum, position) => {
                          const location = `${row}/${level}/${position.toString().padStart(2, '0')}`;
                          return levelSum + (itemsByLocation[location] || []).length;
                        }, 0), 0
                      );

                      return (
                        <div key={row} className="space-y-1 border rounded-lg p-3 bg-gray-50/50">
                          <h3 className="text-md font-semibold text-primary flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-primary text-primary-foreground rounded flex items-center justify-center text-xs font-bold">
                                {row}
                              </div>
                              <span>แถว {row}</span>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {rowItemCount} รายการ
                            </Badge>
                          </h3>

                          {levels
                            .filter(level => {
                              if (gridViewMode === 'all') {
                                return true; // Show all levels
                              }
                              // Only show levels that have items after filtering
                              return positions.some(position => {
                                const location = `${row}/${level}/${position.toString().padStart(2, '0')}`;
                                return (itemsByLocation[location] || []).length > 0;
                              });
                            })
                            .map((level) => {
                              const levelItemCount = positions.reduce((sum, position) => {
                                const location = `${row}/${level}/${position.toString().padStart(2, '0')}`;
                                return sum + (itemsByLocation[location] || []).length;
                              }, 0);

                              return (
                                <div key={level} className="mb-2">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-gray-600">ชั้น {level}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {levelItemCount} รายการ
                                    </Badge>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <div className="flex gap-1 pb-2 min-w-max">
                                      {positions
                                        .filter(position => {
                                          // Show all positions but highlight only those with filtered items
                                          return true; // Show all for context
                                        })
                                        .map((position) => {
                                          const location = `${row}/${level}/${position.toString().padStart(2, '0')}`;
                                          const locationItems = itemsByLocation[location] || [];
                                          const hasFilteredItems = locationItems.length > 0;
                                          const locationColor = hasFilteredItems ? getLocationColor(location) : '#f8f9fa';
                                          const totalQuantity = locationItems.reduce((sum, item) => sum + ((item as any).carton_quantity_legacy || 0) + ((item as any).box_quantity_legacy || 0), 0);

                                          return (
                                            <Tooltip key={location}>
                                              <TooltipTrigger asChild>
                                                <div
                                                  className={`w-20 h-16 border rounded cursor-pointer transition-all duration-200 flex flex-col justify-between p-1 ${
                                                    hasFilteredItems 
                                                      ? 'border-gray-400 hover:shadow-md hover:scale-105' 
                                                      : 'border-gray-200 opacity-30'
                                                  }`}
                                                  style={{ backgroundColor: locationColor }}
                                                  onClick={() => handleShelfClick(location)}
                                                >
                                                  <div className={`text-[8px] font-mono text-center leading-none ${
                                                    hasFilteredItems ? 'text-gray-700 font-bold' : 'text-gray-400'
                                                  }`}>
                                                    {row}{position}/{level}
                                                  </div>

                                                  {hasFilteredItems && (
                                                    <div className="text-center">
                                                      <div className="text-[8px] font-bold text-gray-700">
                                                        {locationItems.length} รายการ
                                                      </div>
                                                      <div className="text-[7px] text-gray-600">
                                                        {totalQuantity} ชิ้น
                                                      </div>
                                                    </div>
                                                  )}

                                                  {/* Highlight filtered items */}
                                                  {hasFilteredItems && (
                                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></div>
                                                  )}
                                                </div>
                                              </TooltipTrigger>
                                              <TooltipContent className="max-w-80">
                                                <div className="text-sm space-y-2">
                                                  <div className="font-bold text-primary">📍 ตำแหน่ง: {location}</div>
                                                  {hasFilteredItems ? (
                                                    <>
                                                      <div className="text-xs">รายการสินค้า: {locationItems.length}</div>
                                                      <div className="space-y-1">
                                                        {locationItems.slice(0, 3).map((item, idx) => (
                                                          <div key={idx} className="text-xs bg-background p-1 rounded border-l-2 border-l-primary/30">
                                                            <div className="font-medium">{item.product_name}</div>
                                                            <div className="text-muted-foreground">
                                                               รหัส: {item.sku} {item.lot && `• Lot: ${item.lot}`}
                                                             </div>
                                                             <div>{((item as any).carton_quantity_legacy || 0)} ลัง + {((item as any).box_quantity_legacy || 0)} เศษ</div>
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
                                                    <div className="text-muted-foreground">
                                                      {activeFilterCount > 0 ? 'ไม่มีสินค้าตามเงื่อนไขที่เลือก' : 'ตำแหน่งว่าง'}
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
                              );
                            })}
                        </div>
                      );
                    })}
                </div>

                {/* Show message if no rows have filtered items */}
                {rows.every(row =>
                  !levels.some(level =>
                    positions.some(position => {
                      const location = `${row}/${level}/${position.toString().padStart(2, '0')}`;
                      return (itemsByLocation[location] || []).length > 0;
                    })
                  )
                ) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">ไม่พบตำแหน่งที่มีสินค้าตามเงื่อนไขที่เลือก</p>
                  </div>
                )}
              </div>
            )}
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