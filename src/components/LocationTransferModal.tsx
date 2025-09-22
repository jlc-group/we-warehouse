import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { MapPin, ArrowRight, Package, AlertCircle, CheckCircle, Truck, ShipIcon, ChevronsUpDown, Check } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import type { InventoryItem } from '@/hooks/useInventory';
import { useWarehouseLocations } from '@/hooks/useWarehouseLocations';
import { formatLocation, normalizeLocation, displayLocation } from '@/utils/locationUtils';
import { LocationConflictDialog } from './LocationConflictDialog';

interface LocationTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransfer: (itemIds: string[], targetLocation: string, notes?: string) => Promise<boolean>;
  onShipOut?: (itemIds: string[], notes?: string) => Promise<boolean>;
  items: InventoryItem[];
  initialSourceLocation?: string;
  onRefreshData?: () => void; // เพิ่ม callback สำหรับ refresh ข้อมูล
  getItemsAtLocation?: (location: string) => InventoryItem[]; // เพิ่มฟังก์ชันตรวจสอบสินค้าใน location
}

export function LocationTransferModal({
  isOpen,
  onClose,
  onTransfer,
  onShipOut,
  items,
  initialSourceLocation,
  onRefreshData,
  getItemsAtLocation
}: LocationTransferModalProps) {
  const [activeTab, setActiveTab] = useState('transfer');
  const [sourceLocation, setSourceLocation] = useState(initialSourceLocation || '');
  const [targetLocation, setTargetLocation] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [transferNotes, setTransferNotes] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferStatus, setTransferStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [sourceLocationOpen, setSourceLocationOpen] = useState(false);
  const [targetLocationOpen, setTargetLocationOpen] = useState(false);
  const [shipOutLocationOpen, setShipOutLocationOpen] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictData, setConflictData] = useState<{
    targetLocation: string;
    itemsToMove: InventoryItem[];
    existingItems: InventoryItem[];
  } | null>(null);

  // Get warehouse locations data for empty locations
  const { locationsWithInventory: warehouseLocations, loading: warehouseLoading } = useWarehouseLocations('', 100);

  // Generate all possible locations (ShelfGrid pattern + warehouse locations + inventory locations)
  const getAllPossibleLocations = useMemo(() => {
    const allLocationSet = new Set<string>();

    // 1. เพิ่มตำแหน่งจาก inventory items (ตำแหน่งที่มีสินค้า) - normalize ให้เป็น format เดียวกัน
    items.forEach(item => {
      const normalized = normalizeLocation(item.location);
      if (normalized) allLocationSet.add(normalized);
    });

    // 2. เพิ่มตำแหน่งจาก warehouse_locations table (ตำแหน่งที่สร้างไว้) - normalize ให้เป็น format เดียวกัน
    if (warehouseLocations) {
      warehouseLocations.forEach(loc => {
        const normalized = normalizeLocation(loc.location_code);
        if (normalized) allLocationSet.add(normalized);
      });
    }

    // 3. เพิ่มตำแหน่งตาม ShelfGrid pattern (A1/4 ถึง Z20/1)
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
    const levels = [4, 3, 2, 1];
    const positions = Array.from({ length: 20 }, (_, i) => i + 1);

    rows.forEach(row => {
      levels.forEach(level => {
        positions.forEach(position => {
          const location = formatLocation(row, position, level);
          allLocationSet.add(location);
        });
      });
    });

    const locations = Array.from(allLocationSet).sort();

    // Debug logging (disabled to prevent console spam)
    // console.log('📍 LocationTransferModal - All possible locations:', {
    //   totalItems: items.length,
    //   inventoryLocations: items.length > 0 ? [...new Set(items.map(item => item.location))].length : 0,
    //   warehouseLocations: warehouseLocations?.length || 0,
    //   generatedLocations: rows.length * levels.length * positions.length,
    //   totalUniqueLocations: locations.length,
    //   examples: locations.slice(0, 10),
    //   timestamp: new Date().toISOString()
    // });

    return locations;
  }, [items, warehouseLocations]);

  const allLocations = getAllPossibleLocations;

  // Get comprehensive location information
  const getLocationInfo = (locationCode: string) => {
    const normalizedTarget = normalizeLocation(locationCode);
    const inventoryItems = items.filter(item => normalizeLocation(item.location) === normalizedTarget);
    const warehouseLocation = warehouseLocations?.find(loc => normalizeLocation(loc.location_code) === normalizedTarget);

    return {
      locationCode,
      inventoryCount: inventoryItems.length,
      isEmpty: inventoryItems.length === 0,
      description: warehouseLocation?.description || `ตำแหน่งคลัง ${locationCode}`,
      capacity: warehouseLocation?.capacity_boxes || 0,
      utilization: warehouseLocation?.utilization_percentage || 0,
      isWareHouseLocation: !!warehouseLocation,
      isGeneratedLocation: !warehouseLocation && inventoryItems.length === 0
    };
  };

  // Get items for source location
  const sourceItems = useMemo(() => {
    if (!sourceLocation) return [];
    const normalizedSource = normalizeLocation(sourceLocation);
    return items.filter(item => normalizeLocation(item.location) === normalizedSource);
  }, [items, sourceLocation]);

  // Get items for target location
  const targetItems = useMemo(() => {
    if (!targetLocation) return [];
    const normalizedTarget = normalizeLocation(targetLocation);
    return items.filter(item => normalizeLocation(item.location) === normalizedTarget);
  }, [items, targetLocation]);

  // Check if target location is available (empty)
  const isTargetLocationAvailable = targetItems.length === 0;

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setActiveTab('transfer');
      setSourceLocation(initialSourceLocation || '');
      setTargetLocation('');
      setSelectedItems(new Set());
      setTransferNotes('');
      setTransferStatus('idle');
    }
  }, [isOpen, initialSourceLocation]);

  // Auto-refresh when items change (real-time updates)
  useEffect(() => {
    // ถ้า modal เปิดอยู่ และมีการเปลี่ยนแปลงข้อมูล ให้ clear selections ที่ไม่ valid
    if (isOpen && selectedItems.size > 0) {
      const validItemIds = items.map(item => item.id);
      const newSelectedItems = new Set(
        Array.from(selectedItems).filter(id => validItemIds.includes(id))
      );

      if (newSelectedItems.size !== selectedItems.size) {
        setSelectedItems(newSelectedItems);
      }
    }
  }, [items, isOpen, selectedItems]);

  // Toggle item selection
  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  // Select all items
  const selectAllItems = () => {
    if (selectedItems.size === sourceItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(sourceItems.map(item => item.id)));
    }
  };

  // Handle transfer
  const handleTransfer = async () => {
    if (selectedItems.size === 0 || !targetLocation || !sourceLocation) {
      return;
    }

    if (sourceLocation === targetLocation) {
      setTransferStatus('error');
      return;
    }


    // ตรวจสอบว่า target location มีสินค้าอยู่แล้วหรือไม่
    const existingItemsAtTarget = getItemsAtLocation ? getItemsAtLocation(targetLocation) : [];
    const itemsToMove = items.filter(item => selectedItems.has(item.id));

    // ถ้ามีสินค้าอยู่แล้ว แสดง confirmation dialog
    if (existingItemsAtTarget.length > 0) {
      setConflictData({
        targetLocation,
        itemsToMove,
        existingItems: existingItemsAtTarget
      });
      setShowConflictDialog(true);
      return;
    }

    // ถ้าไม่มีสินค้าอยู่ ดำเนินการย้ายทันที
    await performTransfer();
  };

  const performTransfer = async () => {
    try {
      setIsTransferring(true);
      setTransferStatus('idle');

      const success = await onTransfer(
        Array.from(selectedItems),
        targetLocation,
        transferNotes || undefined
      );

      if (success) {
        setTransferStatus('success');
        setSelectedItems(new Set());

        // Refresh ข้อมูลทันทีหลัง transfer สำเร็จ
        if (onRefreshData) {
          onRefreshData();
        }

        setTimeout(() => {
          onClose();
          setTransferStatus('idle');
        }, 2000);
      } else {
        setTransferStatus('error');
      }
    } catch (error) {
      console.error('Transfer error:', error);
      setTransferStatus('error');
    } finally {
      setIsTransferring(false);
      setShowConflictDialog(false);
      setConflictData(null);
    }
  };

  const handleConfirmTransfer = () => {
    performTransfer();
  };

  const handleCancelTransfer = () => {
    setShowConflictDialog(false);
    setConflictData(null);
  };

  // Handle ship out
  const handleShipOut = async () => {
    if (selectedItems.size === 0 || !sourceLocation || !onShipOut) {
      return;
    }

    try {
      setIsTransferring(true);
      setTransferStatus('idle');

      const success = await onShipOut(
        Array.from(selectedItems),
        transferNotes || undefined
      );

      if (success) {
        setTransferStatus('success');
        setSelectedItems(new Set());

        // Refresh ข้อมูลทันทีหลัง ship out สำเร็จ
        if (onRefreshData) {
          onRefreshData();
        }

        setTimeout(() => {
          onClose();
          setTransferStatus('idle');
        }, 2000);
      } else {
        setTransferStatus('error');
      }
    } catch (error) {
      console.error('Ship out error:', error);
      setTransferStatus('error');
    } finally {
      setIsTransferring(false);
    }
  };

  // Calculate totals for selected items
  const selectedTotals = useMemo(() => {
    const selected = sourceItems.filter(item => selectedItems.has(item.id));
    return selected.reduce((acc, item) => ({
      level1: acc.level1 + (item.unit_level1_quantity || (item as any).carton_quantity_legacy || 0),
      level2: acc.level2 + (item.unit_level2_quantity || (item as any).box_quantity_legacy || 0),
      level3: acc.level3 + (item.unit_level3_quantity || (item as any).pieces_quantity_legacy || 0),
      items: acc.items + 1
    }), { level1: 0, level2: 0, level3: 0, items: 0 });
  }, [sourceItems, selectedItems]);

  const canTransfer = selectedItems.size > 0 && targetLocation && sourceLocation && sourceLocation !== targetLocation;
  const canShipOut = selectedItems.size > 0 && sourceLocation && onShipOut;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            จัดการสินค้าในคลัง
          </DialogTitle>
          <DialogDescription>
            ย้ายสินค้าระหว่างตำแหน่งคลังหรือส่งออกสินค้าจากระบบ
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Alert */}
          {transferStatus === 'success' && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                ✅ ดำเนินการสำเร็จ! กำลังปิดหน้าต่าง...
              </AlertDescription>
            </Alert>
          )}

          {transferStatus === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                ❌ เกิดข้อผิดพลาดในการดำเนินการ กรุณาลองใหม่อีกครั้ง
                {activeTab === 'transfer' && sourceLocation === targetLocation && ' (ตำแหน่งต้นทางและปลายทางต้องแตกต่างกัน)'}
              </AlertDescription>
            </Alert>
          )}

          {/* Tab Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="transfer" className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                ย้ายตำแหน่ง
              </TabsTrigger>
              <TabsTrigger value="shipout" className="flex items-center gap-2" disabled={!onShipOut}>
                <ShipIcon className="h-4 w-4" />
                ส่งออก
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transfer" className="space-y-4">
              {/* Location Selection */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  {/* Source Location */}
                  <div className="space-y-2">
                    <Label htmlFor="sourceLocation" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      จากตำแหน่ง
                    </Label>
                    <Popover open={sourceLocationOpen} onOpenChange={setSourceLocationOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={sourceLocationOpen}
                          className="w-full justify-between"
                        >
                          {sourceLocation ? displayLocation(sourceLocation) : "เลือกตำแหน่งต้นทาง"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0 bg-white">
                        <Command className="bg-white">
                          <CommandInput placeholder="ค้นหาตำแหน่ง..." />
                          <CommandEmpty>ไม่พบตำแหน่งที่ค้นหา</CommandEmpty>
                          <CommandList>
                            <CommandGroup>
                              {allLocations.map(location => {
                                const locationInfo = getLocationInfo(location);
                                return (
                                  <CommandItem
                                    key={location}
                                    value={location}
                                    onSelect={(currentValue) => {
                                      setSourceLocation(currentValue === sourceLocation ? "" : currentValue);
                                      setSourceLocationOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${
                                        sourceLocation === location ? "opacity-100" : "opacity-0"
                                      }`}
                                    />
                                    <div className="flex items-center justify-between w-full">
                                      <span>{displayLocation(location)}</span>
                                      <div className="flex items-center gap-1">
                                        {locationInfo.isGeneratedLocation && (
                                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                                            Grid
                                          </Badge>
                                        )}
                                        {locationInfo.isWareHouseLocation && (
                                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                            WH
                                          </Badge>
                                        )}
                                        <Badge
                                          variant={locationInfo.isEmpty ? "outline" : "secondary"}
                                          className="ml-1 text-xs"
                                        >
                                          {locationInfo.isEmpty ? 'ว่าง' : `${locationInfo.inventoryCount} รายการ`}
                                        </Badge>
                                      </div>
                                    </div>
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Arrow */}
                  <div className="flex justify-center">
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  </div>

                  {/* Target Location */}
                  <div className="space-y-2">
                    <Label htmlFor="targetLocation" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      ไปยังตำแหน่ง
                    </Label>
                    <Popover open={targetLocationOpen} onOpenChange={setTargetLocationOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={targetLocationOpen}
                          className="w-full justify-between"
                        >
                          {targetLocation ? displayLocation(targetLocation) : "เลือกตำแหน่งปลายทาง"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0 bg-white">
                        <Command className="bg-white">
                          <CommandInput placeholder="ค้นหาตำแหน่งปลายทาง..." />
                          <CommandEmpty>ไม่พบตำแหน่งที่ค้นหา</CommandEmpty>
                          <CommandList>
                            <CommandGroup>
                              {allLocations
                                .filter(location => location !== sourceLocation)
                                .map(location => {
                                  const locationInfo = getLocationInfo(location);
                                  return (
                                    <CommandItem
                                      key={location}
                                      value={location}
                                      onSelect={(currentValue) => {
                                        setTargetLocation(currentValue === targetLocation ? "" : currentValue);
                                        setTargetLocationOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          targetLocation === location ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                      <div className="flex items-center justify-between w-full">
                                        <span>{displayLocation(location)}</span>
                                        <div className="flex items-center gap-1">
                                          {locationInfo.isGeneratedLocation && (
                                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                                              Grid
                                            </Badge>
                                          )}
                                          {locationInfo.isWareHouseLocation && (
                                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                              WH
                                            </Badge>
                                          )}
                                          <Badge
                                            variant={locationInfo.isEmpty ? "outline" : "secondary"}
                                            className="ml-1 text-xs"
                                          >
                                            {locationInfo.isEmpty ? 'ว่าง - พร้อมรับ' : `มีสินค้า ${locationInfo.inventoryCount} รายการ`}
                                          </Badge>
                                        </div>
                                      </div>
                                    </CommandItem>
                                  );
                                })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Location Status Display */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Source Location Status */}
                  {sourceLocation && (
                    <Card className="border-blue-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-blue-600" />
                          ตำแหน่งต้นทาง: {displayLocation(sourceLocation)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm">
                          <div className="flex items-center justify-between">
                            <span>สถานะ:</span>
                            <Badge variant={sourceItems.length > 0 ? "default" : "secondary"}>
                              {sourceItems.length > 0 ? `มีสินค้า ${sourceItems.length} รายการ` : 'ว่าง'}
                            </Badge>
                          </div>
                          {sourceItems.length > 0 && (
                            <div className="mt-2 text-xs text-gray-600">
                              พร้อมย้าย
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Target Location Status */}
                  {targetLocation && (
                    <Card className={`${isTargetLocationAvailable ? 'border-green-200' : 'border-blue-200'}`}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <MapPin className={`h-4 w-4 ${isTargetLocationAvailable ? 'text-green-600' : 'text-blue-600'}`} />
                          ตำแหน่งปลายทาง: {displayLocation(targetLocation)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm">
                          <div className="flex items-center justify-between">
                            <span>สถานะ:</span>
                            <Badge variant={isTargetLocationAvailable ? "outline" : "secondary"}>
                              {isTargetLocationAvailable ? 'ว่าง - พร้อมรับสินค้า' : `มีสินค้า ${targetItems.length} รายการ`}
                            </Badge>
                          </div>
                          {!isTargetLocationAvailable && (
                            <div className="mt-2 text-xs text-blue-600">
                              ℹ️ จะย้ายเข้าไปร่วมกับสินค้าที่มีอยู่แล้ว
                            </div>
                          )}
                          {isTargetLocationAvailable && (
                            <div className="mt-2 text-xs text-green-600">
                              ✅ สามารถย้ายได้
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="shipout" className="space-y-4">
              {/* Ship Out Section */}
              <Card className="border-orange-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-700">
                    <ShipIcon className="h-4 w-4" />
                    ส่งออกสินค้าจากคลัง
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm text-orange-600">
                      การส่งออกจะลบสินค้าออกจากระบบคลังทั้งหมด (ไม่ใช่การย้ายตำแหน่ง)
                    </div>

                    {/* Source Location for Ship Out */}
                    <div className="space-y-2">
                      <Label htmlFor="shipOutSource" className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        จากตำแหน่ง
                      </Label>
                      <Popover open={shipOutLocationOpen} onOpenChange={setShipOutLocationOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={shipOutLocationOpen}
                            className="w-full justify-between"
                          >
                            {sourceLocation ? displayLocation(sourceLocation) : "เลือกตำแหน่งที่จะส่งออกสินค้า"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0 bg-white">
                          <Command className="bg-white">
                            <CommandInput placeholder="ค้นหาตำแหน่งส่งออก..." />
                            <CommandEmpty>ไม่พบตำแหน่งที่ค้นหา</CommandEmpty>
                            <CommandList>
                              <CommandGroup>
                                {allLocations.map(location => {
                                  const locationInfo = getLocationInfo(location);
                                  return (
                                    <CommandItem
                                      key={location}
                                      value={location}
                                      disabled={locationInfo.isEmpty}
                                      onSelect={(currentValue) => {
                                        if (!locationInfo.isEmpty) {
                                          setSourceLocation(currentValue === sourceLocation ? "" : currentValue);
                                          setShipOutLocationOpen(false);
                                        }
                                      }}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          sourceLocation === location ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                      <div className="flex items-center justify-between w-full">
                                        <span>{displayLocation(location)}</span>
                                        <Badge variant={locationInfo.isEmpty ? "outline" : "secondary"} className="ml-2 text-xs">
                                          {locationInfo.isEmpty ? 'ว่าง' : `${locationInfo.inventoryCount} รายการ`}
                                        </Badge>
                                      </div>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {sourceLocation && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          ⚠️ <strong>คำเตือน:</strong> สินค้าที่ส่งออกจะถูกลบออกจากระบบคลังอย่างถาวร
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Items Selection */}
          {sourceLocation && sourceItems.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    สินค้าในตำแหน่ง {displayLocation(sourceLocation)}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {sourceItems.length} รายการ
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllItems}
                    >
                      {selectedItems.size === sourceItems.length ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกทั้งหมด'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {sourceItems.map(item => (
                    <div
                      key={item.id}
                      className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedItems.has(item.id)
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => toggleItemSelection(item.id)}
                    >
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onChange={() => toggleItemSelection(item.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.product_name}</div>
                        <div className="text-sm text-muted-foreground">
                          <span className="font-mono">{item.sku}</span>
                          {item.sku && item.product_name && <span className="mx-1">-</span>}
                          <span className="text-gray-600">{item.product_name}</span>
                        </div>
                        {item.lot && (
                          <Badge variant="outline" className="text-xs">
                            LOT: {item.lot}
                          </Badge>
                        )}
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-sm">
                          {/* Show multi-level units */}
                          {item.unit_level1_name && item.unit_level1_quantity > 0 && (
                            <div>
                              <span className="font-medium">{item.unit_level1_quantity}</span>
                              <span className="text-gray-500 ml-1">{item.unit_level1_name}</span>
                            </div>
                          )}
                          {item.unit_level2_name && item.unit_level2_quantity > 0 && (
                            <div>
                              <span className="font-medium">{item.unit_level2_quantity}</span>
                              <span className="text-gray-500 ml-1">{item.unit_level2_name}</span>
                            </div>
                          )}
                          {item.unit_level3_name && item.unit_level3_quantity > 0 && (
                            <div>
                              <span className="font-medium">{item.unit_level3_quantity}</span>
                              <span className="text-gray-500 ml-1">{item.unit_level3_name}</span>
                            </div>
                          )}

                          {/* Fallback to legacy fields if multi-level is not available */}
                          {(!item.unit_level1_quantity && !item.unit_level2_quantity && !item.unit_level3_quantity) && (
                            <>
                              {(item as any).carton_quantity_legacy > 0 && (
                                <div>
                                  <span className="font-medium">{(item as any).carton_quantity_legacy}</span>
                                  <span className="text-gray-500 ml-1">ลัง</span>
                                </div>
                              )}
                              {(item as any).box_quantity_legacy > 0 && (
                                <div>
                                  <span className="font-medium">{(item as any).box_quantity_legacy}</span>
                                  <span className="text-gray-500 ml-1">กล่อง</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Selection Summary */}
          {selectedItems.size > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">สรุปสินค้าที่เลือก</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{selectedTotals.items}</div>
                    <div className="text-sm text-gray-600">รายการ</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{selectedTotals.level1}</div>
                    <div className="text-sm text-gray-600">ลัง</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{selectedTotals.level2}</div>
                    <div className="text-sm text-gray-600">กล่อง</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{selectedTotals.level3}</div>
                    <div className="text-sm text-gray-600">ชิ้น</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transfer Notes */}
          <div className="space-y-2">
            <Label htmlFor="transferNotes">
              หมายเหตุ{activeTab === 'transfer' ? 'การย้าย' : 'การส่งออก'} (ถ้ามี)
            </Label>
            <Input
              id="transferNotes"
              value={transferNotes}
              onChange={(e) => setTransferNotes(e.target.value)}
              placeholder={activeTab === 'transfer'
                ? "เช่น ย้ายเพื่อจัดเรียงใหม่, ปรับปรุงโซน เป็นต้น"
                : "เช่น ส่งให้ลูกค้า, โอนไปสาขาอื่น เป็นต้น"
              }
            />
          </div>

          {/* Target Location Items (if not empty) */}
          {activeTab === 'transfer' && targetLocation && !isTargetLocationAvailable && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-red-700">
                  <Package className="h-4 w-4" />
                  สินค้าในตำแหน่งปลายทาง {displayLocation(targetLocation)} (ต้องย้ายออกก่อน)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {targetItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-2 border rounded bg-red-50">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{item.product_name}</div>
                        <div className="text-xs text-gray-500 font-mono">{item.sku}</div>
                      </div>
                      <div className="text-right text-xs">
                        {item.unit_level1_quantity > 0 && (
                          <div>{item.unit_level1_quantity} {item.unit_level1_name || 'ลัง'}</div>
                        )}
                        {item.unit_level2_quantity > 0 && (
                          <div>{item.unit_level2_quantity} {item.unit_level2_name || 'กล่อง'}</div>
                        )}
                        {item.unit_level3_quantity > 0 && (
                          <div>{item.unit_level3_quantity} {item.unit_level3_name || 'ชิ้น'}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <div className="text-sm text-yellow-800">
                    💡 <strong>คำแนะนำ:</strong> ย้ายสินค้าเหล่านี้ออกจากตำแหน่ง {displayLocation(targetLocation)} ก่อน หรือเลือกตำแหน่งว่างอื่น
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {sourceLocation && sourceItems.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">ไม่มีสินค้าในตำแหน่งนี้</h3>
                <p className="text-gray-500">
                  กรุณาเลือกตำแหน่งที่มีสินค้าอื่น
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            ยกเลิก
          </Button>

          {activeTab === 'transfer' && (
            <Button
              onClick={handleTransfer}
              className="flex-1"
              disabled={!canTransfer || isTransferring}
            >
              {isTransferring ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  กำลังย้าย...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  ย้ายสินค้า ({selectedItems.size} รายการ)
                </div>
              )}
            </Button>
          )}

          {activeTab === 'shipout' && onShipOut && (
            <Button
              onClick={handleShipOut}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
              disabled={!canShipOut || isTransferring}
            >
              {isTransferring ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  กำลังส่งออก...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <ShipIcon className="h-4 w-4" />
                  ส่งออกสินค้า ({selectedItems.size} รายการ)
                </div>
              )}
            </Button>
          )}
        </div>
      </DialogContent>

      {/* Location Conflict Dialog */}
      {conflictData && (
        <LocationConflictDialog
          isOpen={showConflictDialog}
          onClose={handleCancelTransfer}
          onConfirm={handleConfirmTransfer}
          targetLocation={conflictData.targetLocation}
          itemsToMove={conflictData.itemsToMove}
          existingItemsAtTarget={conflictData.existingItems}
          isLoading={isTransferring}
        />
      )}
    </Dialog>
  );
}