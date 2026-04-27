import { useState, useMemo, useCallback, useRef, useEffect, memo, useDeferredValue } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Package, Search, MapPin, Filter, X, Plus, Edit, QrCode, Scan, RefreshCw, Grid3X3, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { QRScanner } from './QRScanner';
import { BulkTransferModal } from './BulkTransferModal';
import type { InventoryItem } from '@/hooks/useInventory';
import { useLocationQR } from '@/hooks/useLocationQR';
import { formatLocation, normalizeLocation, displayLocation } from '@/utils/locationUtils';

interface ShelfGridProps {
  items: InventoryItem[];
  warehouseId?: string;
  onShelfClick: (location: string, item?: InventoryItem) => void;
  onQRCodeClick?: (location: string) => void;
  onBulkTransferClick?: (location: string) => void;
  selectedItems?: InventoryItem[];
  isOrderMode?: boolean;
}

interface FilterState {
  searchQuery: string;
  lotFilter: string;
  productCodeFilter: string;
  locationStatusFilter: string;
  selectedFilters: {
    lot?: string;
    productCode?: string;
    name?: string;
    locationStatus?: LocationStatus;
  };
}

// Memoized shelf component for better performance
const ShelfCard = memo(({
  location,
  itemCount,
  locationItems,
  isSelected,
  isHighlighted,
  isRecentlyUpdated,
  onShelfClick,
  onQRCodeClick,
  onBulkTransferClick,
  qrCodes,
  loading
}: {
  location: string;
  itemCount: number;
  locationItems: InventoryItem[];
  isSelected: boolean;
  isHighlighted: boolean;
  isRecentlyUpdated: boolean;
  onShelfClick: (location: string, item?: InventoryItem) => void;
  onQRCodeClick?: (location: string) => void;
  onBulkTransferClick?: (location: string) => void;
  qrCodes: any;
  loading: boolean;
}) => {
  const getCartonQty = (item: any) => Number(item.unit_level1_quantity ?? item.carton_quantity_legacy ?? 0) || 0;
  const getBoxQty = (item: any) => Number(item.unit_level2_quantity ?? item.box_quantity_legacy ?? 0) || 0;

  const totalBoxes = useMemo(() =>
    locationItems.reduce((sum, item) => {
      const value = getCartonQty(item);
      return sum + (isNaN(value) ? 0 : value);
    }, 0), [locationItems]
  );

  const totalLoose = useMemo(() =>
    locationItems.reduce((sum, item) => {
      const value = getBoxQty(item);
      return sum + (isNaN(value) ? 0 : value);
    }, 0), [locationItems]
  );

  return (
    <Card
      className={`
        w-32 h-28 transition-all duration-200 ease-out hover:shadow-md flex-shrink-0 relative group cursor-pointer
        ${isSelected ? 'ring-2 ring-primary shadow-lg scale-[1.02] z-10 border-primary/50' : ''}
        ${isHighlighted ? 'ring-2 ring-amber-400 bg-amber-50 shadow-md border-amber-300' : ''}
        ${isRecentlyUpdated ? 'ring-2 ring-green-400 bg-green-100 shadow-lg animate-pulse border-green-400' : ''}
        ${!isSelected && !isHighlighted && !isRecentlyUpdated && itemCount > 0 ? (itemCount > 1 ? 'bg-blue-50 border-blue-400 hover:bg-blue-100 shadow-sm' : 'bg-green-50 border-emerald-400 hover:bg-green-100 shadow-sm') : ''}
        ${!isSelected && !isHighlighted && !isRecentlyUpdated && itemCount === 0 ? 'bg-gray-50 border-gray-300 border-dashed hover:bg-gray-100 hover:border-solid hover:border-gray-400' : ''}
      `}
      onClick={() => onShelfClick(location, locationItems[0])}
    >
      <div className="absolute top-1.5 right-1.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-out flex gap-1">
        {onQRCodeClick && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 w-6 p-0 bg-white/95 hover:bg-white border-gray-200 hover:border-gray-300 transition-colors duration-150"
            onClick={(e) => {
              e.stopPropagation();
              onQRCodeClick(location);
            }}
          >
            <QrCode className="h-3 w-3" />
          </Button>
        )}
        {onBulkTransferClick && itemCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-6 w-6 p-0 bg-blue-50 hover:bg-blue-100 border-blue-300 hover:border-blue-400 transition-colors duration-150"
                onClick={(e) => {
                  e.stopPropagation();
                  onBulkTransferClick(location);
                }}
              >
                <ArrowRightLeft className="h-3 w-3 text-blue-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>ย้ายหลายรายการ</p>
            </TooltipContent>
          </Tooltip>
        )}
        <Button
          size="sm"
          variant="secondary"
          className="h-6 w-6 p-0 bg-white/95 hover:bg-white border-gray-200 hover:border-gray-300 transition-colors duration-150"
          onClick={(e) => {
            e.stopPropagation();
            onShelfClick(location, locationItems[0]);
          }}
        >
          {itemCount > 0 ? <Edit className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
        </Button>
      </div>

      <CardContent className="p-2 h-full flex flex-col justify-between">
        <div className="text-[10px] font-mono text-slate-600 font-bold text-center leading-none">
          {displayLocation(location)}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          {itemCount > 0 ? (
            <div className="text-center w-full">
              <div className={`w-4 h-4 rounded-full mx-auto mb-1 ${
                itemCount > 1 ? 'bg-blue-500' : 'bg-emerald-500'
              }`}></div>

              {itemCount > 1 && (
                <div className="text-[10px] font-bold text-blue-700 mb-1">
                  {itemCount} รายการ
                </div>
              )}

              {itemCount === 1 && (
                <div className="text-xs font-semibold text-emerald-800 leading-snug mb-1 px-1 break-words" title={locationItems[0]?.product_name}>
                  {locationItems[0]?.product_name}
                </div>
              )}

              <div className="text-[9px] font-bold text-slate-700 bg-white/70 px-1 py-0.5 rounded">
                {totalBoxes > 0 && totalLoose > 0 ? `${totalBoxes}+${totalLoose}` :
                 totalBoxes > 0 ? `${totalBoxes}` :
                 totalLoose > 0 ? `${totalLoose}` : '0'}
              </div>

              {itemCount === 1 && locationItems[0]?.lot && (
                <div className="text-[10px] text-slate-500 mt-1 bg-white/50 rounded px-1 py-0.5 break-words" title={locationItems[0]?.lot}>
                  {locationItems[0]?.lot}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <Package className="h-4 w-4 text-gray-400 mb-1" />
              <div className="text-[9px] text-gray-500 font-medium">ว่าง</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

ShelfCard.displayName = 'ShelfCard';

// Helper function to determine location status
type LocationStatus = 'empty' | 'active';

const getLocationStatus = (locationItems: InventoryItem[]): LocationStatus => {
  if (locationItems.length === 0) {
    return 'empty'; // No items at this location - available for new items
  }

  // If there are items, they must have stock (zero-quantity items are deleted)
  return 'active'; // Has stock
};

export const ShelfGrid = memo(function ShelfGrid({
  items,
  warehouseId,
  onShelfClick,
  onQRCodeClick,
  onBulkTransferClick,
  selectedItems = [],
  isOrderMode = false
}: ShelfGridProps) {
  const [selectedShelf, setSelectedShelf] = useState<string | null>(null);
  
  // แยก searchInput (สำหรับ UI) กับ debouncedSearch (สำหรับ filter)
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearchQuery = useDeferredValue(searchInput);
  
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    lotFilter: '',
    productCodeFilter: '',
    locationStatusFilter: '',
    selectedFilters: {}
  });
  const [highlightedLocations, setHighlightedLocations] = useState<string[]>([]);
  // Persist row state across navigation (sessionStorage) — ผู้ใช้กด "โหลดเพิ่ม"/"แสดงทั้งหมด" แล้ว
  // กลับจาก Location detail ไม่ควรเด้งกลับไป A
  const [availableRows, setAvailableRows] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem('shelf-available-rows');
      if (saved) {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr) && arr.length > 0) return arr;
      }
    } catch { /* ignore */ }
    return ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
  });
  const [visibleRowsCount, setVisibleRowsCount] = useState<number>(() => {
    try {
      const n = Number(sessionStorage.getItem('shelf-visible-rows-count'));
      if (Number.isFinite(n) && n > 0) return n;
    } catch { /* ignore */ }
    return 10;
  });

  // Persist on change
  useEffect(() => {
    try { sessionStorage.setItem('shelf-available-rows', JSON.stringify(availableRows)); } catch { /* ignore */ }
  }, [availableRows]);
  useEffect(() => {
    try { sessionStorage.setItem('shelf-visible-rows-count', String(visibleRowsCount)); } catch { /* ignore */ }
  }, [visibleRowsCount]);
  const [showScanner, setShowScanner] = useState(false);
  const [showBulkTransfer, setShowBulkTransfer] = useState(false);
  const [bulkTransferLocation, setBulkTransferLocation] = useState<string>('');
  const [recentlyUpdatedLocations, setRecentlyUpdatedLocations] = useState<Set<string>>(new Set());
  const scrollContainersRef = useRef<Record<string, HTMLDivElement | null>>({});
  const previousHasActiveFiltersRef = useRef(false);
  const dragStateRef = useRef<{ isDragging: boolean; startX: number; scrollLeft: number; activeKey: string | null }>({
    isDragging: false,
    startX: 0,
    scrollLeft: 0,
    activeKey: null
  });
  
  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helpers for quantity fields across schemas (ให้ตรงกับ EnhancedOverview)
  const getCartonQty = (item: any) => Number(item.unit_level1_quantity ?? item.carton_quantity_legacy ?? 0) || 0;
  const getBoxQty = (item: any) => Number(item.unit_level2_quantity ?? item.box_quantity_legacy ?? 0) || 0;

  // Use QR code data
  const { qrCodes, getQRByLocation, refetch, loading } = useLocationQR();

  // Track real-time updates for visual indicators
  const previousItemsRef = useRef(new Map<string, InventoryItem>());

  // Disabled real-time highlighting to prevent flickering
  // useEffect(() => {
  //   // This was causing grid flickering due to frequent re-renders
  //   // Track real-time updates for visual indicators
  // }, [items]);

  // Filter items by warehouse if warehouseId is provided
  const warehouseFilteredItems = useMemo(() => {
    if (!warehouseId) return items;
    return items.filter(item => {
      // If item has no warehouse_id, show it in all warehouses
      if (!item.warehouse_id) return true;
      return item.warehouse_id === warehouseId;
    });
  }, [items, warehouseId]);

  // Handle QR scan success
  const handleScanSuccess = useCallback((location: string, data: any) => {
    setShowScanner(false);

    // Highlight the scanned location
    setHighlightedLocations([normalizeLocation(location)]);

    // Auto-redirect or handle the scan result
    if (data.action === 'add') {
      onShelfClick(normalizeLocation(location));
    }
  }, [onShelfClick]);


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

    // Guard against undefined items
    if (!warehouseFilteredItems || !Array.isArray(warehouseFilteredItems)) {
      return {
        uniqueLots: [],
        uniqueProductCodes: []
      };
    }

    warehouseFilteredItems.forEach(item => {
      if (item.lot) lots.add(item.lot);
      if (item.sku) productCodes.add(item.sku);
    });

    return {
      uniqueLots: Array.from(lots).sort(),
      uniqueProductCodes: Array.from(productCodes).sort()
    };
  }, [warehouseFilteredItems]);

  // Create a map for multiple items per location (with normalized locations)
  const itemsByLocation = useMemo(() => {
    // Guard against undefined items
    if (!warehouseFilteredItems || !Array.isArray(warehouseFilteredItems)) {
      return {};
    }

    const locationMap = warehouseFilteredItems.reduce((acc, item) => {
      const normalizedLocation = normalizeLocation(item.location);
      if (!acc[normalizedLocation]) {
        acc[normalizedLocation] = [];
      }
      acc[normalizedLocation].push(item);
      return acc;
    }, {} as Record<string, InventoryItem[]>);

    // Location mapping optimized

    return locationMap;
  }, [warehouseFilteredItems]);

  // Filter items based on current filter state (search, lot, product code)
  // ใช้ debouncedSearchQuery แทน filters.searchQuery เพื่อลด re-render
  const filteredItems = useMemo(() => {
    // Guard against undefined items
    if (!warehouseFilteredItems || !Array.isArray(warehouseFilteredItems)) {
      return [];
    }

    const searchLower = debouncedSearchQuery.toLowerCase().trim();
    
    return warehouseFilteredItems.filter(item => {
      // Search matching - ใช้ debouncedSearchQuery
      const matchesSearch = searchLower === '' ||
        (item.product_name && item.product_name.toLowerCase().includes(searchLower)) ||
        (item.sku && item.sku.toLowerCase().includes(searchLower));

      const matchesLot = !filters.selectedFilters.lot || item.lot === filters.selectedFilters.lot;
      const matchesProductCode = !filters.selectedFilters.productCode || item.sku === filters.selectedFilters.productCode;

      return matchesSearch && matchesLot && matchesProductCode;
    });
  }, [warehouseFilteredItems, debouncedSearchQuery, filters.selectedFilters.lot, filters.selectedFilters.productCode]);

  const handleShelfClick = useCallback((location: string, item?: InventoryItem) => {
    const normalizedLocation = normalizeLocation(location);
    setSelectedShelf(normalizedLocation);
    onShelfClick(normalizedLocation, item);
  }, [onShelfClick]);

  const handleFilterChange = (type: 'lot' | 'productCode' | 'locationStatus', value: string) => {
    setFilters(prev => ({
      ...prev,
      selectedFilters: {
        ...prev.selectedFilters,
        [type]: value === 'all' ? undefined : (value as any)
      }
    }));
  };

  const clearFilter = (type: 'lot' | 'productCode' | 'name' | 'locationStatus') => {
    if (type === 'name') {
      setSearchInput('');
    }
    setFilters(prev => {
      const newFilters = { ...prev.selectedFilters };
      delete newFilters[type];
      return {
        ...prev,
        selectedFilters: newFilters
      };
    });
  };

  const clearAllFilters = () => {
    setSearchInput('');
    setFilters({
      searchQuery: '',
      lotFilter: '',
      productCodeFilter: '',
      locationStatusFilter: '',
      selectedFilters: {}
    });
    setHighlightedLocations([]);
  };

  const handleSearch = () => {
    const hasItemFilters = !!(searchInput.trim() || filters.selectedFilters.lot || filters.selectedFilters.productCode);
    const hasStatusFilter = !!filters.selectedFilters.locationStatus;
    const hasActiveFilters = hasItemFilters || hasStatusFilter;

    if (!hasActiveFilters) {
      setHighlightedLocations([]);
      return;
    }

    const intersect = (a: Set<string>, b: Set<string>) => {
      const result = new Set<string>();
      a.forEach(value => {
        if (b.has(value)) result.add(value);
      });
      return result;
    };

    let nextLocations: Set<string> | null = null;

    if (hasItemFilters) {
      nextLocations = new Set(
        filteredItems
          .map(item => normalizeLocation(item.location))
          .filter(loc => loc && loc.trim())
      );
    }

    if (filters.selectedFilters.locationStatus === 'active') {
      const activeSet = new Set(Object.keys(itemsByLocation));
      nextLocations = nextLocations ? intersect(nextLocations, activeSet) : activeSet;
    }

    if (filters.selectedFilters.locationStatus === 'empty') {
      const allLocations = new Set<string>();
      availableRows.forEach(row => {
        levels.forEach(level => {
          for (let position = 1; position <= positionsPerRow; position++) {
            allLocations.add(normalizeLocation(formatLocation(row, position, level)));
          }
        });
      });

      const emptySet = new Set<string>();
      allLocations.forEach(loc => {
        const locItems = itemsByLocation[loc] || [];
        if (locItems.length === 0) {
          emptySet.add(loc);
        }
      });

      nextLocations = nextLocations ? intersect(nextLocations, emptySet) : emptySet;
    }

    setHighlightedLocations(Array.from(nextLocations || []).sort());
  };

  const handleBulkTransferClick = (location: string) => {
    setBulkTransferLocation(location);
    setShowBulkTransfer(true);
  };

  const handleBulkTransferComplete = () => {
    setShowBulkTransfer(false);
    setBulkTransferLocation('');
    // Trigger parent refresh if provided
    onBulkTransferClick?.(bulkTransferLocation);
  };

  // Generate shelf grid configuration
  const { levels, positionsPerRow } = useMemo(() => ({
    levels: [4, 3, 2, 1], // Display from top to bottom: 4, 3, 2, 1
    positionsPerRow: 20 // Number of positions per row
  }), []);

  // Auto-update highlights when filters change (ใช้ debouncedSearchQuery)
  useEffect(() => {
    const hasItemFilters = !!(debouncedSearchQuery || filters.selectedFilters.lot || filters.selectedFilters.productCode);
    const hasStatusFilter = !!filters.selectedFilters.locationStatus;
    const hasActiveFilters = hasItemFilters || hasStatusFilter;

    const prevHasActiveFilters = previousHasActiveFiltersRef.current;
    previousHasActiveFiltersRef.current = hasActiveFilters;

    if (!hasActiveFilters) {
      if (prevHasActiveFilters) {
        setHighlightedLocations([]);
      }
      return;
    }

    const intersect = (a: Set<string>, b: Set<string>) => {
      const result = new Set<string>();
      a.forEach(value => {
        if (b.has(value)) result.add(value);
      });
      return result;
    };

    let nextLocations: Set<string> | null = null;

    if (hasItemFilters) {
      nextLocations = new Set(
        filteredItems
          .map(item => normalizeLocation(item.location))
          .filter(loc => loc && loc.trim())
      );
    }

    if (filters.selectedFilters.locationStatus === 'active') {
      const activeSet = new Set(Object.keys(itemsByLocation));
      nextLocations = nextLocations ? intersect(nextLocations, activeSet) : activeSet;
    }

    if (filters.selectedFilters.locationStatus === 'empty') {
      const allLocations = new Set<string>();
      availableRows.forEach(row => {
        levels.forEach(level => {
          for (let position = 1; position <= positionsPerRow; position++) {
            allLocations.add(normalizeLocation(formatLocation(row, position, level)));
          }
        });
      });

      const emptySet = new Set<string>();
      allLocations.forEach(loc => {
        const locItems = itemsByLocation[loc] || [];
        if (locItems.length === 0) {
          emptySet.add(loc);
        }
      });

      nextLocations = nextLocations ? intersect(nextLocations, emptySet) : emptySet;
    }

    const nextArray = Array.from(nextLocations || []).sort();
    setHighlightedLocations(prev => {
      if (prev.length === nextArray.length && prev.every((value, index) => value === nextArray[index])) {
        return prev;
      }
      return nextArray;
    });
  }, [
    availableRows,
    debouncedSearchQuery,
    filteredItems,
    filters.selectedFilters.lot,
    filters.selectedFilters.productCode,
    filters.selectedFilters.locationStatus,
    itemsByLocation,
    levels,
    positionsPerRow
  ]);

  const handleMouseDown = useCallback((key: string) => (e: React.MouseEvent<HTMLDivElement>) => {
    const container = scrollContainersRef.current[key];
    if (!container) return;
    dragStateRef.current = {
      isDragging: true,
      startX: e.clientX,
      scrollLeft: container.scrollLeft,
      activeKey: key
    };
    // Prevent text selection while dragging
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const { isDragging, activeKey, startX, scrollLeft } = dragStateRef.current;
    if (!isDragging || !activeKey) return;
    const container = scrollContainersRef.current[activeKey];
    if (!container) return;
    const deltaX = e.clientX - startX;
    container.scrollLeft = scrollLeft - deltaX;
  }, []);

  const endDrag = useCallback(() => {
    dragStateRef.current = { isDragging: false, startX: 0, scrollLeft: 0, activeKey: null };
  }, []);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Advanced Search & Filters - Sticky Header (under main header h-16) */}
        <Card className="sticky top-16 z-20 bg-white shadow-md border-b-2 border-slate-200">
          <CardContent className="p-4 space-y-4">
            {/* Search Bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="ค้นหาสินค้าตามชื่อหรือรหัส..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
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

              {/* Location Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">สถานะ:</span>
                <Select value={filters.selectedFilters.locationStatus || 'all'} onValueChange={(value) => handleFilterChange('locationStatus', value)}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="ทั้งหมด" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    <SelectItem value="active">มีสินค้า</SelectItem>
                    <SelectItem value="empty">ว่าง</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters */}
              {(searchInput || filters.selectedFilters.lot || filters.selectedFilters.productCode || filters.selectedFilters.locationStatus) && (
                <Button variant="outline" size="sm" onClick={clearAllFilters}>
                  <X className="h-3 w-3 mr-1" />
                  ล้างทั้งหมด
                </Button>
              )}

              {/* Refresh QR Data */}
              <Button
                variant="outline"
                size="sm"
                onClick={refetch}
                disabled={loading}
                className="flex items-center gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                รีเฟรช QR
              </Button>
            </div>

            {/* Active Filters Display */}
            {(debouncedSearchQuery || filters.selectedFilters.lot || filters.selectedFilters.productCode || filters.selectedFilters.locationStatus) && (
              <div className="flex gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">ตัวกรองที่ใช้:</span>
                {debouncedSearchQuery && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    ค้นหา: {debouncedSearchQuery}
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
                {filters.selectedFilters.locationStatus && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    สถานะ: {filters.selectedFilters.locationStatus === 'active' ? 'มีสินค้า' : 'ว่าง'}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => clearFilter('locationStatus')} />
                  </Badge>
                )}
              </div>
            )}

            {/* Results Summary */}
            <div className="text-sm text-muted-foreground space-y-1">
              <div>แสดงผล: {filteredItems.length} จาก {items.length} รายการ</div>
              <div className="flex flex-wrap gap-4 text-xs">
                <span>📦 ตำแหน่งที่มีสินค้า: {Object.keys(itemsByLocation).length}</span>
                <span>📋 แถวที่แสดง: {visibleRowsCount}/{availableRows.length}</span>
                <span>🏗️ ตำแหน่งรวม: {availableRows.length * 4 * 20} ตำแหน่ง</span>
                <span>💾 สถานะ: {loading ? 'กำลังโหลด...' : 'โหลดเสร็จ'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shelf Grid with Progressive Loading */}
        <div className="space-y-4">
          {availableRows.slice(0, visibleRowsCount).map((row) => (
            <div key={row} className="space-y-2">
              <h2 className="text-xl font-bold text-primary flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center text-lg font-bold">
                  {row}
                </div>
                <span>แถว {row}</span>
              </h2>

              {levels.map((level) => (
                <div key={level} className="mb-3">
                  <div
                    className="overflow-x-auto scroll-smooth cursor-grab active:cursor-grabbing"
                    ref={(el) => { if (el) scrollContainersRef.current[`${row}-${level}`] = el; }}
                    onMouseDown={handleMouseDown(`${row}-${level}`)}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={endDrag}
                    onMouseUp={endDrag}
                  >
                    <div className="flex gap-1.5 pb-2 min-w-max">
                      {Array.from({ length: positionsPerRow }, (_, positionIndex) => {
                        const position = positionIndex + 1; // Position within row (1-20)
                        const location = formatLocation(row, position, level);
                        const normalizedLocation = normalizeLocation(location);
                        const locationItems = itemsByLocation[normalizedLocation] || [];
                        const isSelected = selectedShelf === normalizedLocation;
                        const isHighlighted = highlightedLocations.includes(normalizedLocation);
                        const isRecentlyUpdated = false; // Disabled to prevent flickering
                        const itemCount = locationItems.length;
                        const locationStatus = getLocationStatus(locationItems);

                        // Check if any items in this location are selected for order
                        const hasSelectedItems = isOrderMode && locationItems.some(item =>
                          selectedItems.some(selectedItem => selectedItem.id === item.id)
                        );
                        const allItemsSelected = isOrderMode && locationItems.length > 0 &&
                          locationItems.every(item =>
                            selectedItems.some(selectedItem => selectedItem.id === item.id)
                          );
                        
                        // Multiple items handling
                         // Null-safe calculation using consistent quantity helpers
                         const totalBoxes = locationItems.reduce((sum, item) => {
                           const value = getCartonQty(item);
                           return sum + (isNaN(value) ? 0 : value);
                         }, 0);

                         const totalLoose = locationItems.reduce((sum, item) => {
                           const value = getBoxQty(item);
                           return sum + (isNaN(value) ? 0 : value);
                         }, 0);

                         const totalPieces = locationItems.reduce((sum, item) => {
                           const value = Number((item as any).pieces_quantity_legacy ?? 0);
                           return sum + (isNaN(value) ? 0 : value);
                         }, 0);

                        return (
                          <Tooltip key={location}>
                            <TooltipTrigger asChild>
                              <Card
                                className={`
                                  w-32 h-28 transition-all duration-200 ease-out hover:shadow-md flex-shrink-0 relative group cursor-pointer
                                  ${isSelected ? 'ring-2 ring-primary shadow-lg scale-[1.02] z-10 border-primary/50' : ''}
                                  ${isHighlighted ? 'ring-2 ring-amber-400 bg-amber-50 shadow-md border-amber-300' : ''}
                                  ${isRecentlyUpdated ? 'ring-2 ring-green-400 bg-green-100 shadow-lg animate-pulse border-green-400' : ''}
                                  ${allItemsSelected ? 'ring-2 ring-purple-500 bg-purple-100 border-purple-400 shadow-lg' : hasSelectedItems ? 'ring-2 ring-orange-400 bg-orange-50 border-orange-300' : ''}
                                  ${!isSelected && !isHighlighted && !isRecentlyUpdated && !hasSelectedItems && !allItemsSelected && locationStatus === 'active' ? (itemCount > 1 ? 'bg-blue-50 border-blue-400 hover:bg-blue-100 shadow-sm' : 'bg-green-50 border-emerald-400 hover:bg-green-100 shadow-sm') : ''}
                                  ${!isSelected && !isHighlighted && !isRecentlyUpdated && !hasSelectedItems && !allItemsSelected && locationStatus === 'empty' ? 'bg-gray-50 border-gray-300 border-dashed hover:bg-gray-100 hover:border-solid hover:border-gray-400' : ''}
                                `}
                                
                              >
                                {/* Action Buttons */}
                                <div className="absolute top-1.5 right-1.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-out flex gap-1">
                                  {/* QR Code Button */}
                                  {onQRCodeClick && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 w-6 p-0 bg-white/95 hover:bg-white border-gray-200 hover:border-gray-300 transition-colors duration-150"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onQRCodeClick(location);
                                      }}
                                    >
                                      <QrCode className="h-3 w-3" />
                                    </Button>
                                  )}

                                  {/* Bulk Transfer Button - ปุ่มย้ายหลายรายการ */}
                                  {itemCount > 0 && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-6 w-6 p-0 bg-blue-50 hover:bg-blue-100 border-blue-300 hover:border-blue-400 transition-colors duration-150"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleBulkTransferClick(location);
                                          }}
                                        >
                                          <ArrowRightLeft className="h-3 w-3 text-blue-600" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>ย้ายหลายรายการ</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}

                                  {/* Add/Edit Button */}
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-6 w-6 p-0 bg-white/95 hover:bg-white border-gray-200 hover:border-gray-300 transition-colors duration-150"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleShelfClick(location, locationItems[0]);
                                    }}
                                  >
                                    {itemCount > 0 ? <Edit className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                                  </Button>
                                </div>

                                <CardContent className="p-2 h-full flex flex-col justify-between">
                                  {/* Location Label */}
                                  <div className="text-[10px] font-mono text-slate-600 font-bold text-center leading-none flex items-center justify-center gap-1">
                                    {displayLocation(location)}
                                    {isOrderMode && allItemsSelected && (
                                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                    )}
                                    {isOrderMode && hasSelectedItems && !allItemsSelected && (
                                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                    )}
                                  </div>

                                  {/* Main Content */}
                                  <div className="flex-1 flex flex-col items-center justify-center">
                                    {locationStatus === 'active' ? (
                                      <div className="text-center w-full">
                                        {/* Status Indicator */}
                                        <div className={`w-4 h-4 rounded-full mx-auto mb-1 ${
                                          itemCount > 1 ? 'bg-blue-500' : 'bg-emerald-500'
                                        }`}></div>

                                        {/* Item Count for Multiple Items */}
                                        {itemCount > 1 && (
                                          <div className="text-[10px] font-bold text-blue-700 mb-1">
                                            {itemCount} รายการ
                                          </div>
                                        )}

                                        {/* Product Name for Single Item */}
                                        {itemCount === 1 && (
                                          <div className="text-xs font-semibold text-emerald-800 leading-snug mb-1 px-1 break-words" title={locationItems[0]?.product_name}>
                                            {locationItems[0]?.product_name}
                                          </div>
                                        )}

                                        {/* Product Summary for Multiple Items */}
                                        {itemCount > 1 && (
                                          <div className="text-[10px] text-blue-800 leading-snug mb-1 px-1 break-words">
                                            {(() => {
                                              const uniqueProducts = new Set(locationItems.map(item => item.product_name));
                                              if (uniqueProducts.size === 1) {
                                                return Array.from(uniqueProducts)[0];
                                              } else {
                                                return `${uniqueProducts.size} ชนิดสินค้า`;
                                              }
                                            })()}
                                          </div>
                                        )}

                                        {/* Quantity Display */}
                                        <div className="text-[9px] font-bold text-slate-700 bg-white/70 px-1 py-0.5 rounded">
                                          {totalBoxes > 0 && totalLoose > 0 ? `${totalBoxes}+${totalLoose}` :
                                           totalBoxes > 0 ? `${totalBoxes}` :
                                           totalLoose > 0 ? `${totalLoose}` : '0'}
                                        </div>

                                        {/* LOT for single item */}
                                        {itemCount === 1 && locationItems[0]?.lot && (
                                          <div className="text-[10px] text-slate-500 mt-1 bg-white/50 rounded px-1 py-0.5 break-words" title={locationItems[0]?.lot}>
                                            {locationItems[0]?.lot}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-center justify-center h-full">
                                        <Package className="h-4 w-4 text-gray-400 mb-1" />
                                        <div className="text-[9px] text-gray-500 font-medium">ว่าง</div>
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-3 w-3" />
                                    <span className="font-semibold">ตำแหน่ง: {displayLocation(location)}</span>
                                  </div>
                                  {loading ? (
                                    <div className="flex items-center gap-1">
                                      <RefreshCw className="h-3 w-3 text-blue-500 animate-spin" />
                                      <span className="text-xs text-blue-500">กำลังโหลด QR</span>
                                    </div>
                                  ) : (() => {
                                    const qrCode = getQRByLocation(location);
                                    return qrCode;
                                  })() ? (() => {
                                    const qrCode = getQRByLocation(location);
                                    return (
                                      <div className="flex items-center gap-2">
                                        {qrCode?.qr_image_url ? (
                                          <div className="w-8 h-8 rounded border bg-white overflow-hidden">
                                            <img
                                              src={qrCode.qr_image_url}
                                              alt={`QR Code for ${location}`}
                                              className="w-full h-full object-contain"
                                            />
                                          </div>
                                        ) : (
                                          <QrCode className="h-3 w-3 text-green-600" />
                                        )}
                                        <span className="text-xs text-green-600">มี QR</span>
                                      </div>
                                    );
                                  })() : (
                                    <div className="flex items-center gap-1">
                                      <QrCode className="h-3 w-3 text-gray-400" />
                                      <span className="text-xs text-gray-500">ไม่มี QR</span>
                                    </div>
                                  )}
                                </div>
                                {locationStatus === 'active' ? (
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
                                      <div className="pt-1 border-t">
                                        <div className="text-xs font-medium mb-1">สินค้าในตำแหน่งนี้:</div>
                                        <div className="space-y-1 max-h-32 overflow-y-auto">
                                          {locationItems.map((item) => (
                                            <div key={item.id} className="text-xs bg-gray-50 p-1 rounded">
                                              <div className="font-medium text-gray-800 break-words">{item.product_name}</div>
                                              <div className="text-gray-600">
                                                รหัส: {item.sku} | ลัง: {getCartonQty(item)} กล่อง: {getBoxQty(item)}
                                              </div>
                                              {item.lot && (
                                                <div className="text-gray-500 text-xs">Lot: {item.lot}</div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
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

        {/* Load More Rows Button */}
        {visibleRowsCount < availableRows.length && (
          <div className="flex justify-center gap-2">
            <Button
              onClick={() => setVisibleRowsCount(prev => Math.min(prev + 2, availableRows.length))}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              โหลดแถวเพิ่มเติม ({availableRows.length - visibleRowsCount} แถวเหลือ)
            </Button>
            <Button
              onClick={() => setVisibleRowsCount(availableRows.length)}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Grid3X3 className="h-4 w-4" />
              แสดงทั้งหมด (แถว A-{availableRows[availableRows.length - 1]})
            </Button>
          </div>
        )}

        {/* Add New Row Button */}
        {visibleRowsCount >= availableRows.length && (
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
        )}

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
                {isOrderMode && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-purple-400 bg-purple-100"></div>
                      <span>เลือกครบทุกรายการ</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-orange-400 bg-orange-50"></div>
                      <span>เลือกบางรายการ</span>
                    </div>
                  </>
                )}
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
                {isOrderMode && (
                  <div className="text-blue-700"><strong>โหมดเลือกสินค้า:</strong> คลิกเพื่อเลือก</div>
                )}
              </div>
            </div>

            <div className="mt-3 text-xs text-muted-foreground space-y-1">
              <p>• ระบบคลัง: 26 แถว (A-Z) × 4 ชั้น × 20 ตำแหน่ง = {26 * 4 * 20} ตำแหน่งทั้งหมด</p>
              <p>• การแสดงผล: โหลดแบบค่อยเป็นค่อยไป {visibleRowsCount} แถวแรก (ประหยัดประสิทธิภาพ)</p>
              <p>• การเรียงชั้น: ชั้น 4 (บนสุด) → ชั้น 3 → ชั้น 2 → ชั้น 1 (ล่างสุด)</p>
              <p>• ตัวเลขในตำแหน่ง: จำนวนลัง+เศษ (เช่น 5+3 = 5 ลัง 3 เศษ)</p>
              <p>• <strong>Hover ที่ตำแหน่งเพื่อเห็นปุ่มเพิ่ม/แก้ไขสินค้า</strong></p>
            </div>
          </CardContent>
        </Card>

        {/* Floating QR Scanner Button */}
        <div className="fixed bottom-6 right-6 z-50">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setShowScanner(true)}
                className="w-14 h-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 hover:scale-110 transition-transform"
              >
                <Scan className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>สแกน QR Code</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* QR Scanner */}
        <QRScanner
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          onScanSuccess={handleScanSuccess}
        />

        {/* Bulk Transfer Modal - ย้ายหลายรายการพร้อมกัน */}
        <BulkTransferModal
          isOpen={showBulkTransfer}
          onClose={() => {
            setShowBulkTransfer(false);
            setBulkTransferLocation('');
          }}
          sourceLocation={bulkTransferLocation}
          onTransferComplete={handleBulkTransferComplete}
        />
      </div>
    </TooltipProvider>
  );
});