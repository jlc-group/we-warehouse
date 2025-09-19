import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PieChart, Package, MapPin, Search, Filter, X, Grid3X3, List, Hash, BarChart3, Eye, EyeOff, ChevronDown, ChevronUp, CheckSquare, Square, RotateCcw, QrCode } from 'lucide-react';
import type { InventoryItem } from '@/hooks/useInventory';
import { useLocationQR } from '@/hooks/useLocationQR';
import { useDebounce } from '@/hooks/useDebounce';

interface ProductOverviewAndSearchProps {
  items: InventoryItem[];
  onShelfClick: (location: string, item?: InventoryItem) => void;
}

type ViewMode = 'visual' | 'location' | 'product' | 'list';
type VisualMode = 'product' | 'lot' | 'density';

interface FilterState {
  searchQuery: string;
  selectedLot: string;
  selectedProductCode: string;
  selectedRow: string;
}

// Color palette for different products (colorblind-friendly)
const COLOR_PALETTE = [
  '#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', '#c2410c',
  '#0891b2', '#be185d', '#65a30d', '#7c2d12', '#1f2937', '#0f766e',
  '#a21caf', '#166534', '#7c3aed', '#b91c1c', '#0369a1', '#059669',
  '#d97706', '#7e22ce'
];

export function ProductOverviewAndSearch({ items, onShelfClick }: ProductOverviewAndSearchProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('visual');
  const [visualMode, setVisualMode] = useState<VisualMode>('product');
  const [hiddenGroups, setHiddenGroups] = useState<Set<string>>(new Set());
  const [legendSearch, setLegendSearch] = useState('');
  const debouncedLegendSearch = useDebounce(legendSearch, 300);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    selectedLot: '',
    selectedProductCode: '',
    selectedRow: ''
  });

  const debouncedSearchQuery = useDebounce(filters.searchQuery, 300);
  const debouncedFilters = useMemo(() => ({
    ...filters,
    searchQuery: debouncedSearchQuery
  }), [filters.selectedLot, filters.selectedProductCode, filters.selectedRow, debouncedSearchQuery]);

  // Use QR code data
  const { qrCodes, getQRByLocation } = useLocationQR();


  // Standard product codes - อัปเดตตามรายการใหม่
  const standardProductCodes = [
    'A1-40G', 'L13-10G', 'L8A-6G', 'L8B-6G', 'L8A-30G', 'L3-40G', 'L7-6G', 'L4-40G',
    'L10-7G', 'L3-8G', 'L11-40G', 'L14-40G', 'L4-8G', 'T6A-10G', 'T6A-5G', 'L5-15G',
    'S3-70G', 'C4-40G', 'L6-8G', 'J8-40G', 'T5A-2G', 'T5B-2G', 'C3-7G', 'L6-40G',
    'J3-8G', 'L10-30G', 'C3-30G', 'C1-6G', 'L9-8G', 'C4-8G', 'L8B-30G', 'S1-70G',
    'C4-35G', 'S2-70G', 'T5A-2.5G', 'L7-30G', 'M2-4G', 'T5B-2.5G', 'A2-40G', 'K3-6G',
    'C2-35G', 'C2-8G', 'T5C-2G', 'C2-40G', 'D1-70G', 'D2-70G'
  ];

  // Get filter options
  const filterOptions = useMemo(() => {
    const lots = new Set<string>();
    const dbProductCodes = new Set<string>();
    const rows = new Set<string>();

    items.forEach(item => {
      if (item.lot) lots.add(item.lot);
      if (item.sku) dbProductCodes.add(item.sku);
      const row = item.location.split('/')[0];
      if (row) rows.add(row);
    });

    // Combine standard codes with DB codes, prioritizing standard order
    const allProductCodes = [...standardProductCodes];
    dbProductCodes.forEach(code => {
      if (!standardProductCodes.includes(code)) {
        allProductCodes.push(code);
      }
    });

    return {
      lots: Array.from(lots).sort(),
      productCodes: allProductCodes,
      rows: Array.from(rows).sort()
    };
  }, [items]);

  // Filter items based on search and filter criteria
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Search query filter
      if (debouncedFilters.searchQuery) {
        const query = debouncedFilters.searchQuery.toLowerCase();
        const matchesSearch =
          item.product_name.toLowerCase().includes(query) ||
          item.sku.toLowerCase().includes(query) ||
          item.location.toLowerCase().includes(query) ||
          (item.lot && item.lot.toLowerCase().includes(query));

        if (!matchesSearch) return false;
      }

      // Lot filter
      if (debouncedFilters.selectedLot && item.lot !== debouncedFilters.selectedLot) {
        return false;
      }

      // Product code filter
      if (debouncedFilters.selectedProductCode && debouncedFilters.selectedProductCode !== 'all' && item.sku !== debouncedFilters.selectedProductCode) {
        return false;
      }

      // Row filter
      if (debouncedFilters.selectedRow) {
        const itemRow = item.location.split('/')[0];
        if (itemRow !== debouncedFilters.selectedRow) {
          return false;
        }
      }

      return true;
    });
  }, [items, debouncedFilters]);

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
    return Object.values(debouncedFilters).filter(value => value !== '').length;
  }, [debouncedFilters]);

  // Get unique products and assign colors
  const productColorMap = useMemo(() => {
    const uniqueProducts = [...new Set(items.map(item => item.sku))].sort();
    const colorMap: Record<string, string> = {};

    uniqueProducts.forEach((product, index) => {
      colorMap[product] = COLOR_PALETTE[index % COLOR_PALETTE.length];
    });

    return colorMap;
  }, [items]);

  // Get unique lots and assign colors
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

  // Group items by product
  const itemsByProduct = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
      const key = `${item.sku}-${item.product_name}`;
      if (!acc[key]) {
        acc[key] = {
          product_code: item.sku,
          product_name: item.product_name,
          items: [],
          totalBoxes: 0,
          totalLoose: 0,
          locations: new Set<string>()
        };
      }
      acc[key].items.push(item);
      acc[key].totalBoxes += (item.unit_level1_quantity || (item as any).carton_quantity_legacy || 0);
      acc[key].totalLoose += (item.unit_level2_quantity || (item as any).box_quantity_legacy || 0);
      acc[key].locations.add(item.location);
      return acc;
    }, {} as Record<string, {
      product_code: string;
      product_name: string;
      items: InventoryItem[];
      totalBoxes: number;
      totalLoose: number;
      locations: Set<string>;
    }>);
  }, [filteredItems]);

  // Calculate statistics based on filtered data
  const statistics = useMemo(() => {
    const stats = {
      totalLocations: Object.keys(itemsByLocation).length,
      totalProducts: new Set(filteredItems.map(item => item.sku)).size,
      totalLots: new Set(filteredItems.map(item => item.lot).filter(Boolean)).size,
      totalItems: filteredItems.length,
      totalBoxes: filteredItems.reduce((sum, item) => sum + (item.unit_level1_quantity || (item as any).carton_quantity_legacy || 0), 0),
      totalLoose: filteredItems.reduce((sum, item) => sum + (item.unit_level2_quantity || (item as any).box_quantity_legacy || 0), 0),
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
      dist[item.sku].totalBoxes += (item.unit_level1_quantity || (item as any).carton_quantity_legacy || 0);
      dist[item.sku].totalLoose += (item.unit_level2_quantity || (item as any).box_quantity_legacy || 0);
    });

    // Count unique locations per product
    Object.keys(dist).forEach(productCode => {
      const locations = new Set(filteredItems.filter(item => item.sku === productCode).map(item => item.location));
      dist[productCode].locations = locations.size;
    });

    return dist;
  }, [filteredItems]);

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
    if (locationItems.length === 0) return '#f3f4f6';

    switch (visualMode) {
      case 'product': {
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
        const totalQuantity = locationItems.reduce((sum, item) => sum + (item.unit_level1_quantity || (item as any).carton_quantity_legacy || 0) + (item.unit_level2_quantity || (item as any).box_quantity_legacy || 0), 0);
        const maxQuantity = Math.max(...Object.values(itemsByLocation).map(items =>
          items.reduce((sum, item) => sum + (item.unit_level1_quantity || (item as any).carton_quantity_legacy || 0) + (item.unit_level2_quantity || (item as any).box_quantity_legacy || 0), 0)
        ));
        const intensity = totalQuantity / (maxQuantity || 1);
        const alpha = Math.max(0.2, intensity);
        return `rgba(37, 99, 235, ${alpha})`;
      }
      default:
        return '#e5e7eb';
    }
  };

  // Generate shelf grid
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
  const levels = [4, 3, 2, 1];
  const positions = Array.from({ length: 20 }, (_, i) => i + 1);

  return (
    <TooltipProvider>
      <div className="container mx-auto max-w-full space-y-6 px-6">
        {/* Header */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
              <PieChart className="h-6 w-6" />
              ภาพรวมกลุ่มสินค้าและการค้นหา
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <div className="text-3xl font-bold text-primary mb-1">{statistics.totalLocations}</div>
                <div className="text-sm text-muted-foreground">ตำแหน่งที่มีสินค้า</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
                <div className="text-3xl font-bold text-blue-600 mb-1">{statistics.totalProducts}</div>
                <div className="text-sm text-muted-foreground">สินค้าต่างชนิด</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
                <div className="text-3xl font-bold text-green-600 mb-1">{statistics.totalLots}</div>
                <div className="text-sm text-muted-foreground">Lot ต่างกัน</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20">
                <div className="text-3xl font-bold text-orange-600 mb-1">{statistics.totalItems}</div>
                <div className="text-sm text-muted-foreground">รายการทั้งหมด</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
                <div className="text-3xl font-bold text-purple-600 mb-1">{statistics.totalBoxes}</div>
                <div className="text-sm text-muted-foreground">ลังรวม</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20">
                <div className="text-3xl font-bold text-cyan-600 mb-1">{statistics.totalLoose}</div>
                <div className="text-sm text-muted-foreground">กล่องรวม</div>
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
                   {filterOptions.productCodes.filter(code => code && code.trim()).map((code, index) => (
                     <SelectItem key={`${code}-${index}`} value={code}>{code}</SelectItem>
                   ))}
                 </SelectContent>
              </Select>

              <Select value={filters.selectedLot || "__all__"} onValueChange={(value) => updateFilter('selectedLot', value === "__all__" ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือก Lot" />
                </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="__all__">ทั้งหมด</SelectItem>
                   {filterOptions.lots.filter(lot => lot && lot.trim()).map((lot, index) => (
                     <SelectItem key={`${lot}-${index}`} value={lot}>Lot: {lot}</SelectItem>
                   ))}
                 </SelectContent>
              </Select>

              <Select value={filters.selectedRow || "__all__"} onValueChange={(value) => updateFilter('selectedRow', value === "__all__" ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกแถว" />
                </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="__all__">ทั้งหมด</SelectItem>
                   {filterOptions.rows.filter(row => row && row.trim()).map((row, index) => (
                     <SelectItem key={`${row}-${index}`} value={row}>แถว {row}</SelectItem>
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
                {debouncedFilters.searchQuery && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    ค้นหา: "{debouncedFilters.searchQuery}"
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
                {debouncedFilters.selectedProductCode && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    รหัส: {debouncedFilters.selectedProductCode}
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
                {debouncedFilters.selectedLot && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Lot: {debouncedFilters.selectedLot}
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
                {debouncedFilters.selectedRow && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    แถว: {debouncedFilters.selectedRow}
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
          </CardContent>
        </Card>

        {/* View Mode Tabs */}
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="visual" className="flex items-center gap-2">
              <Grid3X3 className="h-4 w-4" />
              แผนผังคลัง
            </TabsTrigger>
            <TabsTrigger value="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              จัดกลุ่มตามตำแหน่ง
            </TabsTrigger>
            <TabsTrigger value="product" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              จัดกลุ่มตามสินค้า
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              รายการเดียว
            </TabsTrigger>
          </TabsList>

          {/* Visual Grid View */}
          <TabsContent value="visual" className="space-y-6">
            <div className="flex flex-col xl:flex-row gap-8">
              {/* Visual Mode Selector */}
              <Card className="xl:w-96">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    โหมดการแสดงผล
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Tabs value={visualMode} onValueChange={(value) => setVisualMode(value as VisualMode)}>
                    <TabsList className="grid w-full grid-cols-3 h-12">
                      <TabsTrigger value="product" className="text-sm">สินค้า</TabsTrigger>
                      <TabsTrigger value="lot" className="text-sm">Lot</TabsTrigger>
                      <TabsTrigger value="density" className="text-sm">ความหนาแน่น</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* Product Code Filter for Visual Mode */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">เลือกรหัสสินค้า</label>
                    <Select
                      value={filters.selectedProductCode || 'all'}
                      onValueChange={(value) => updateFilter('selectedProductCode', value === 'all' ? '' : value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="เลือกรหัสสินค้า..." />
                      </SelectTrigger>
                       <SelectContent className="max-h-60">
                         <SelectItem value="all">ทั้งหมด</SelectItem>
                         {filterOptions.productCodes.filter(code => code && code.trim()).map((code, index) => {
                           const count = items.filter(item => item.sku === code).length;
                           return (
                             <SelectItem key={`${code}-${index}`} value={code}>
                               {code} ({count} รายการ)
                             </SelectItem>
                           );
                         })}
                       </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Warehouse Grid */}
              <Card className="flex-1 min-w-0">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Grid3X3 className="h-5 w-5" />
                    แผนผังคลัง - ภาพรวมขยาย
                  </CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto scroll-smooth">
                  <div className="space-y-3 min-w-max">
                    {rows.map(row => (
                      <div key={row} className="flex items-center gap-3">
                        <div className="w-8 h-8 text-center text-sm font-bold text-primary-foreground bg-primary rounded-lg flex items-center justify-center">
                          {row}
                        </div>
                        <div className="flex gap-1">
                          {positions.map(pos => (
                            <div key={pos} className="flex flex-col gap-1">
                              {levels.map(level => {
                                const location = `${row}/${level}/${pos}`;
                                const hasItems = itemsByLocation[location]?.length > 0;
                                const color = getLocationColor(location);
                                
                                return (
                                  <Tooltip key={location}>
                                    <TooltipTrigger asChild>
                                      <button
                                        className="w-9 h-7 text-sm border border-gray-300 hover:border-primary/60 transition-colors duration-200 ease-out flex items-center justify-center rounded hover:scale-[1.02] shadow-sm hover:shadow-md"
                                        style={{
                                          backgroundColor: color,
                                          willChange: 'transform'
                                        }}
                                        onClick={() => onShelfClick(location, itemsByLocation[location]?.[0])}
                                      >
                                        {hasItems && (
                                          <span className="text-white text-sm font-bold drop-shadow">
                                            •
                                          </span>
                                        )}
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs">
                                      <div className="text-sm">
                                        <div className="font-bold text-primary mb-1 border-b border-primary/20 pb-1">
                                          📍 {location}
                                        </div>
                                        {hasItems ? (
                                          <div className="space-y-1">
                                            {itemsByLocation[location].map(item => (
                                              <div key={item.id} className="bg-muted/50 p-2 rounded">
                                                <div className="font-medium text-xs text-primary">{item.sku}</div>
                                                <div className="text-xs text-muted-foreground truncate">
                                                  {item.product_name.length > 30 ? 
                                                    `${item.product_name.substring(0, 30)}...` : 
                                                    item.product_name
                                                  }
                                                </div>
                                                <div className="text-xs font-medium">
                                                  📦 {item.unit_level1_quantity || (item as any).carton_quantity_legacy || 0} ลัง + {item.unit_level2_quantity || (item as any).box_quantity_legacy || 0} กล่อง
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="text-muted-foreground text-xs">ไม่มีสินค้า</div>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Location View */}
          <TabsContent value="location" className="space-y-4">
            {Object.entries(itemsByLocation).sort(([a], [b]) => a.localeCompare(b)).map(([location, locationItems]) => (
              <Card key={location}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-blue-600" />
                      <span>ตำแหน่ง: {location}</span>
                      {getQRByLocation(location) && (
                        <Tooltip>
                          <TooltipTrigger>
                            <QrCode className="h-4 w-4 text-green-600" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>มี QR Code แล้ว</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{locationItems.length} รายการ</Badge>
                      {getQRByLocation(location) ? (
                        <Badge
                          variant="default"
                          className="bg-green-100 text-green-800 cursor-pointer hover:bg-green-200"
                          onClick={() => {
                            const params = new URLSearchParams();
                            params.set('tab', 'overview');
                            params.set('location', location);
                            params.set('action', 'add');
                            window.location.href = `${window.location.origin}?${params.toString()}`;
                          }}
                        >
                          มี QR
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          ไม่มี QR
                        </Badge>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {locationItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => onShelfClick(item.location, item)}
                      >
                        <div className="flex items-center gap-3">
                          <Package className="h-4 w-4 text-primary" />
                          <div>
                            <div className="font-medium">{item.product_name}</div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Hash className="h-3 w-3" />
                               <span>{item.sku}</span>
                              {item.lot && (
                                <>
                                  <span className="mx-1">•</span>
                                  <span>Lot: {item.lot}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                           <div className="font-medium">{item.unit_level1_quantity || (item as any).carton_quantity_legacy || 0} ลัง + {item.unit_level2_quantity || (item as any).box_quantity_legacy || 0} กล่อง</div>
                          {item.mfd && (
                            <div className="text-xs text-muted-foreground">MFD: {item.mfd}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Product View */}
          <TabsContent value="product" className="space-y-4">
            {Object.values(itemsByProduct).sort((a, b) => a.product_name.localeCompare(b.product_name)).map((productGroup) => (
              <Card key={`${productGroup.product_code}-${productGroup.product_name}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-green-600" />
                      <div>
                        <div>{productGroup.product_name}</div>
                        <div className="text-sm font-normal text-muted-foreground">รหัส: {productGroup.product_code}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">{productGroup.locations.size} ตำแหน่ง</Badge>
                      <div className="text-sm text-muted-foreground mt-1">
                        รวม: {productGroup.totalBoxes} ลัง + {productGroup.totalLoose} กล่อง
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {productGroup.items.sort((a, b) => a.location.localeCompare(b.location)).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => onShelfClick(item.location, item)}
                      >
                        <div className="flex items-center gap-3">
                          <MapPin className="h-4 w-4 text-blue-600" />
                          <div>
                            <div className="font-medium">{item.location}</div>
                            {item.lot && (
                              <div className="text-sm text-muted-foreground">Lot: {item.lot}</div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{item.unit_level1_quantity} ลัง + {item.unit_level2_quantity} กล่อง</div>
                          {item.mfd && (
                            <div className="text-xs text-muted-foreground">MFD: {item.mfd}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* List View */}
          <TabsContent value="list" className="space-y-4">
            <div className="grid gap-4">
              {filteredItems.map((item) => (
                <Card
                  key={item.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onShelfClick(item.location, item)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-primary" />
                        <div>
                          <h3 className="font-medium">{item.product_name}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Hash className="h-3 w-3" />
                            <span>{item.sku}</span>
                            <MapPin className="h-3 w-3 ml-2" />
                            <span>{item.location}</span>
                            {item.lot && (
                              <>
                                <span className="mx-1">•</span>
                                <span>Lot: {item.lot}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">
                           <span className="font-medium">{item.unit_level1_quantity || (item as any).carton_quantity_legacy || 0}</span> ลัง
                         </div>
                         <div className="text-sm text-muted-foreground">
                           <span>{item.unit_level2_quantity || (item as any).box_quantity_legacy || 0}</span> กล่อง
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

          {/* No Results */}
        {activeFilterCount > 0 && filteredItems.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">ไม่พบสินค้าที่ค้นหา</h3>
              <p className="text-muted-foreground">
                ลองค้นหาด้วยคำที่แตกต่างหรือตรวจสอบการสะกดคำ
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}