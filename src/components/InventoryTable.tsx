import { useEffect, useMemo, Fragment, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, MapPin, Hash, Calendar, Download, FileSpreadsheet, QrCode, Lock, Trash2, AlertTriangle } from 'lucide-react';
import { exportInventoryToCSV, exportLocationSummary } from '@/utils/exportUtils';
import { toast } from '@/components/ui/sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { InventoryItem } from '@/hooks/useInventory';
import { useLocationQR } from '@/hooks/useLocationQR';
import { displayLocation, normalizeLocation } from '@/utils/locationUtils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useInventory } from '@/hooks/useInventory';
import { useConversionRates } from '@/hooks/useConversionRates';
import type { ConversionRateData } from '@/types/conversionTypes';
import { logger } from '@/utils/logger';

interface InventoryTableProps {
  items: InventoryItem[];
}

export function InventoryTable({ items }: InventoryTableProps) {
  // Use QR code data
  const { qrCodes, getQRByLocation } = useLocationQR();
  const { deleteItem } = useInventory();
  const { getConversionRate } = useConversionRates();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [conversionRateCache, setConversionRateCache] = useState<Map<string, ConversionRateData>>(new Map());

  // Debug logging for items prop changes
  useEffect(() => {
    logger.debug('📋 InventoryTable - Items prop changed:', {
      itemCount: items.length,
      timestamp: new Date().toISOString(),
      sampleItems: items.slice(0, 3).map(item => ({
        id: item.id,
        product_name: item.product_name,
        location: item.location
      }))
    });
  }, [items]);


  const itemsByLocation = useMemo(() => {
    const map = new Map<string, InventoryItem[]>();
    items.forEach(item => {
      const key = normalizeLocation(item.location);
      const list = map.get(key) || [];
      list.push(item);
      map.set(key, list);
    });
    return map;
  }, [items]);
  const uniqueLocations = useMemo(() => Array.from(itemsByLocation.keys()).sort(), [itemsByLocation]);

  // Updated to support multi-level units
  const getStockBadge = (item: InventoryItem) => {
    // Try to calculate using multi-level data if available
    const extendedItem = item as any;
    let total = 0;

    if (extendedItem.unit_level1_quantity !== undefined) {
      // Use new multi-level system
      const multiLevelItem: any = {
        unit_level1_name: extendedItem.unit_level1_name,
        unit_level1_quantity: extendedItem.unit_level1_quantity || 0,
        unit_level1_rate: extendedItem.unit_level1_rate || 0,
        unit_level2_name: extendedItem.unit_level2_name,
        unit_level2_quantity: extendedItem.unit_level2_quantity || 0,
        unit_level2_rate: extendedItem.unit_level2_rate || 0,
        unit_level3_name: extendedItem.unit_level3_name,
        unit_level3_quantity: extendedItem.unit_level3_quantity || 0,
      };
      total = (extendedItem.unit_level1_quantity || 0) * (extendedItem.unit_level1_rate || 0) +
        (extendedItem.unit_level2_quantity || 0) * (extendedItem.unit_level2_rate || 0) +
        (extendedItem.unit_level3_quantity || 0);
    } else {
      // Fallback to legacy system - use ACTUAL database column names
      total = (item as any).carton_quantity_legacy + (item as any).box_quantity_legacy;
    }

    if (total === 0) return <Badge variant="destructive">หมด</Badge>;
    if (total < 5) return <Badge className="bg-warning text-warning-foreground">ต่ำ</Badge>;
    if (total < 20) return <Badge className="bg-chart-1 text-white">ปานกลาง</Badge>;
    return <Badge className="bg-success text-success-foreground">สูง</Badge>;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('th-TH');
  };

  const handleExportFullData = () => {
    exportInventoryToCSV(items);
  };

  const handleExportLocationSummary = () => {
    exportLocationSummary(items);
  };

  const handleExportLocationData = (location: string) => {
    // Filter items for specific location
    const locationItems = items.filter(item => item.location === location);

    if (locationItems.length === 0) {
      console.warn(`No items found for location: ${location}`);
      return;
    }
  };

  // Calculate total quantity for an item with dynamic conversion rates
  const calculateTotalQuantity = async (item: InventoryItem): Promise<number> => {
    const level1 = (item as any).unit_level1_quantity || 0;
    const level2 = (item as any).unit_level2_quantity || 0;
    const level3 = (item as any).unit_level3_quantity || 0;

    let level1Rate = (item as any).unit_level1_rate;
    let level2Rate = (item as any).unit_level2_rate;

    // Try to get conversion rates from cache first
    if (conversionRateCache.has(item.sku)) {
      const cachedRate = conversionRateCache.get(item.sku)!;
      level1Rate = cachedRate.unit_level1_rate;
      level2Rate = cachedRate.unit_level2_rate;
      logger.debug(`🧮 ${item.sku} - Using cached rates - Level1: ${level1}x${level1Rate}, Level2: ${level2}x${level2Rate}, Level3: ${level3}`);
    } else {
      // Fetch from database if not in cache
      try {
        const conversionRate = await getConversionRate(item.sku);
        if (conversionRate) {
          level1Rate = conversionRate.unit_level1_rate;
          level2Rate = conversionRate.unit_level2_rate;

          // Update cache
          setConversionRateCache(prev => new Map(prev.set(item.sku, conversionRate)));
          logger.debug(`🧮 ${item.sku} - Using DB rates (${level1Rate}/${level2Rate}) - Level1: ${level1}x${level1Rate}, Level2: ${level2}x${level2Rate}, Level3: ${level3}`);
        }
      } catch (error) {
        logger.warn(`⚠️ Could not fetch conversion rate for ${item.sku}, using defaults`);
      }
    }

    // Use fallback defaults if still no rates
    if (!level1Rate) level1Rate = 144; // Default for ลัง
    if (!level2Rate) level2Rate = 12;   // Default for กล่อง

    return (level1 * level1Rate) + (level2 * level2Rate) + level3;
  };

  // Synchronous version for UI that doesn't need async (with fallback defaults)
  const calculateTotalQuantitySync = (item: InventoryItem): number => {
    const level1 = (item as any).unit_level1_quantity || 0;
    const level2 = (item as any).unit_level2_quantity || 0;
    const level3 = (item as any).unit_level3_quantity || 0;

    // Try to get conversion rates from cache first
    if (conversionRateCache.has(item.sku)) {
      const cachedRate = conversionRateCache.get(item.sku)!;
      const total = (level1 * cachedRate.unit_level1_rate) + (level2 * cachedRate.unit_level2_rate) + level3;
      logger.debug(`🧮 ${item.sku} - Sync using cached - Level1: ${level1}x${cachedRate.unit_level1_rate}, Level2: ${level2}x${cachedRate.unit_level2_rate}, Level3: ${level3} = ${total}`);
      return total;
    }

    // Use item rates if available, otherwise fallback to defaults
    const level1Rate = (item as any).unit_level1_rate || 144;
    const level2Rate = (item as any).unit_level2_rate || 12;
    const total = (level1 * level1Rate) + (level2 * level2Rate) + level3;
    logger.debug(`🧮 ${item.sku} - Sync using fallback - Level1: ${level1}x${level1Rate}, Level2: ${level2}x${level2Rate}, Level3: ${level3} = ${total}`);
    return total;
  };

  // Handle deletion with confirmation
  const handleDeleteItem = async (item: InventoryItem) => {
    const totalQuantity = await calculateTotalQuantity(item);
    logger.debug('🗑️ Attempting to delete item:', item.id, item.sku, 'Total quantity:', totalQuantity);

    setIsDeleting(item.id);

    try {
      await deleteItem(item.id);
      toast.success(`ลบรายการสินค้า "${item.sku}" ที่ตำแหน่ง ${displayLocation(item.location)} เรียบร้อย`);
      logger.debug('✅ Successfully deleted item:', item.id);
    } catch (error) {
      logger.error('❌ Error deleting item:', error);
      toast.error(`ไม่สามารถลบรายการได้: ${error instanceof Error ? error.message : 'เกิดข้อผิดพลาด'}`);
    } finally {
      setIsDeleting(null);
    }
  };

  // Check if item can be safely deleted
  const canDeleteItem = (item: InventoryItem): boolean => {
    const totalQuantity = calculateTotalQuantitySync(item);
    const reserved = (item as any).reserved_quantity || 0;

    // Only allow deletion if total quantity is 0 and no reservations
    return totalQuantity === 0 && reserved === 0;
  };

  // Check for duplicates (same SKU in same location)
  const getDuplicateCount = (item: InventoryItem): number => {
    return items.filter(i =>
      i.sku === item.sku &&
      i.location === item.location &&
      i.id !== item.id
    ).length;
  };

  // Get items with zero stock
  const getZeroStockItems = (): InventoryItem[] => {
    return items.filter(item => {
      const totalQuantity = calculateTotalQuantitySync(item);
      const reserved = (item as any).reserved_quantity || 0;
      return totalQuantity === 0 && reserved === 0;
    });
  };

  // Get duplicate items
  const getDuplicateItems = (): InventoryItem[] => {
    const duplicates: InventoryItem[] = [];
    items.forEach(item => {
      if (getDuplicateCount(item) > 0) {
        duplicates.push(item);
      }
    });
    return duplicates;
  };

  // Bulk delete zero stock items
  const handleBulkDeleteZeroStock = async () => {
    const zeroStockItems = getZeroStockItems();
    if (zeroStockItems.length === 0) {
      toast.info('ไม่มีรายการที่มี stock = 0 และไม่มีการจอง');
      return;
    }

    logger.debug(`🗑️ Starting bulk delete of ${zeroStockItems.length} zero stock items`);

    let successCount = 0;
    let errorCount = 0;

    for (const item of zeroStockItems) {
      try {
        await deleteItem(item.id);
        successCount++;
        logger.debug(`✅ Successfully deleted: ${item.sku} at ${item.location}`);
      } catch (error) {
        errorCount++;
        logger.error(`❌ Failed to delete: ${item.sku} at ${item.location}`, error);
      }
    }

    toast.success(`ลบรายการสำเร็จ ${successCount} รายการ${errorCount > 0 ? ` ล้มเหลว ${errorCount} รายการ` : ''}`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>รายการสต็อก ({items.length} รายการ)</CardTitle>

          {/* Bulk Actions */}
          <div className="flex items-center gap-2">
            {/* Zero Stock Alert */}
            {getZeroStockItems().length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-xs">
                  {getZeroStockItems().length} รายการ stock=0
                </Badge>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="h-3 w-3 mr-1" />
                      ลบทั้งหมด
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>ลบรายการที่ stock = 0 ทั้งหมด</AlertDialogTitle>
                      <AlertDialogDescription>
                        <div className="space-y-3">
                          <p>คุณต้องการลบรายการที่มี stock = 0 และไม่มีการจองทั้งหมด {getZeroStockItems().length} รายการใช่หรือไม่?</p>
                          <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                            <p className="text-sm text-red-800">
                              <strong>⚠️ คำเตือน:</strong> การดำเนินการนี้จะลบข้อมูลถาวนและไม่สามารถยกเลิกได้
                            </p>
                          </div>
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {getZeroStockItems().slice(0, 5).map(item => (
                              <div key={item.id} className="text-xs bg-muted p-2 rounded">
                                {item.sku} - {item.product_name} ({displayLocation(item.location)})
                              </div>
                            ))}
                            {getZeroStockItems().length > 5 && (
                              <div className="text-xs text-muted-foreground text-center">
                                ...และอีก {getZeroStockItems().length - 5} รายการ
                              </div>
                            )}
                          </div>
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleBulkDeleteZeroStock}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        ยืนยันการลบทั้งหมด
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}

            {/* Duplicate Alert */}
            {getDuplicateItems().length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {getDuplicateItems().length} รายการซ้ำ
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportLocationSummary}
            className="flex items-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export สรุปตำแหน่ง
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportFullData}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export ข้อมูลทั้งหมด
          </Button>
        </div>
        {/* Conversion Legend */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="bg-green-100 p-2 rounded-full">
              <Package className="h-4 w-4 text-green-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-green-900 mb-2">📊 คำอธิบายการแสดงผลสต็อก</h4>
              <div className="text-sm text-green-700 space-y-1">
                <p>• <strong>จำนวนแยกหน่วย:</strong> แสดงจำนวนตามหน่วยจริงที่เก็บในคลัง (ลัง + กล่อง + ชิ้น)</p>
                <p>• <strong>รวม (ชิ้น):</strong> <span className="text-blue-600 font-bold">จำนวนรวมหลังแปลงทุกหน่วยเป็นชิ้น</span> เพื่อให้เห็นปริมาณที่แท้จริง</p>
                <p>• การคำนวณ: (ลัง × อัตราแปลง) + (กล่อง × อัตราแปลง) + ชิ้น</p>
              </div>
            </div>
          </div>
        </div>
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            ยังไม่มีข้อมูลสินค้าในระบบ
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">ชื่อสินค้า</TableHead>
                  <TableHead>รหัสสินค้า</TableHead>
                  <TableHead>ตำแหน่ง</TableHead>
                  <TableHead className="text-center">รายการในตำแหน่ง</TableHead>
                  <TableHead>LOT</TableHead>
                  <TableHead>MFD</TableHead>
                  <TableHead className="text-right">จำนวนแยกหน่วย</TableHead>
                  <TableHead className="text-right">รวม (ชิ้น)</TableHead>
                  <TableHead className="text-right">จองแล้ว</TableHead>
                  <TableHead className="text-right">พร้อมใช้</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-center">Export</TableHead>
                  <TableHead className="text-center">การจัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uniqueLocations.map((location) => {
                  const locationItems = itemsByLocation.get(location) || [];
                  return (
                    <Fragment key={`location-${location}`}>
                      <TableRow key={`${location}-header`} className="bg-muted/20">
                        <TableCell colSpan={13} className="font-medium text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3" />
                            {displayLocation(location)}
                            <Badge variant="outline" className="text-xs">
                              {locationItems.length} รายการ
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                      {locationItems.map((item) => {
                        const hasMultiple = locationItems.length > 1;
                        return (
                          <TableRow key={`${item.id}-${item.location}`} className="hover:bg-muted/50">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-primary" />
                                {item.product_name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Hash className="h-3 w-3 text-muted-foreground" />
                                <span className="font-mono text-sm">{item.sku}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                <span className="font-mono">{displayLocation(item.location)}</span>
                                <Badge variant="outline" className="text-[10px]">{locationItems.length}</Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {hasMultiple ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge variant="secondary" className="text-xs cursor-pointer">
                                        +{locationItems.length - 1}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="space-y-1">
                                        <div className="font-medium">รายการอื่นในตำแหน่งนี้:</div>
                                        {locationItems.filter(other => other.id !== item.id).map(other => (
                                          <div key={other.id} className="text-xs">
                                            • {other.product_name} ({other.sku})
                                          </div>
                                        ))}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <Badge variant="secondary" className="text-xs">1</Badge>
                              )}
                            </TableCell>
                            <TableCell>{item.lot || '-'}</TableCell>
                            <TableCell>{item.mfd ? formatDate(item.mfd) : '-'}</TableCell>
                            {/* จำนวนแยกหน่วย */}
                            <TableCell className="text-right font-mono">
                              {(() => {
                                const level1 = (item as any).unit_level1_quantity || 0;
                                const level2 = (item as any).unit_level2_quantity || 0;
                                const level3 = (item as any).unit_level3_quantity || 0;

                                if (level1 > 0 || level2 > 0 || level3 > 0) {
                                  const parts = [];
                                  if (level1 > 0) parts.push(`${level1} ${(item as any).unit_level1_name || 'ลัง'}`);
                                  if (level2 > 0) parts.push(`${level2} ${(item as any).unit_level2_name || 'กล่อง'}`);
                                  if (level3 > 0) parts.push(`${level3} ${(item as any).unit_level3_name || 'ชิ้น'}`);
                                  return parts.join(' + ');
                                }

                                return '0';
                              })()}
                            </TableCell>

                            {/* รวม (ชิ้น) */}
                            <TableCell className="text-right">
                              {(() => {
                                const level1 = (item as any).unit_level1_quantity || 0;
                                const level2 = (item as any).unit_level2_quantity || 0;
                                const level3 = (item as any).unit_level3_quantity || 0;
                                const level1Rate = (item as any).unit_level1_rate || 0;
                                const level2Rate = (item as any).unit_level2_rate || 0;

                                const total = (level1 * level1Rate) + (level2 * level2Rate) + level3;

                                return (
                                  <div className="flex flex-col">
                                    <span className="font-bold text-base text-blue-600">
                                      {total.toLocaleString('th-TH')}
                                    </span>
                                    {(level1Rate > 0 || level2Rate > 0) && (
                                      <span className="text-xs text-gray-500">
                                        หลังแปลงหน่วย
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </TableCell>

                            {/* จองแล้ว (Reserved) */}
                            <TableCell className="text-right">
                              {(() => {
                                const reserved = (item as any).reserved_quantity || 0;

                                if (reserved > 0) {
                                  return (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="flex flex-col items-end">
                                            <div className="flex items-center gap-1">
                                              <Lock className="h-3 w-3 text-orange-600" />
                                              <span className="font-medium text-orange-600">
                                                {reserved.toLocaleString('th-TH')}
                                              </span>
                                            </div>
                                            <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-300">
                                              กำลังจอง
                                            </Badge>
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>สต็อกที่ถูกจอง (ยังยกเลิกได้)</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  );
                                }

                                return (
                                  <span className="text-muted-foreground">-</span>
                                );
                              })()}
                            </TableCell>

                            {/* พร้อมใช้ (Available) */}
                            <TableCell className="text-right">
                              {(() => {
                                const level1 = (item as any).unit_level1_quantity || 0;
                                const level2 = (item as any).unit_level2_quantity || 0;
                                const level3 = (item as any).unit_level3_quantity || 0;
                                const level1Rate = (item as any).unit_level1_rate || 0;
                                const level2Rate = (item as any).unit_level2_rate || 0;

                                const total = (level1 * level1Rate) + (level2 * level2Rate) + level3;
                                const reserved = (item as any).reserved_quantity || 0;
                                const available = total - reserved;

                                return (
                                  <div className="flex flex-col items-end">
                                    <span className={`font-bold text-base ${available > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {available.toLocaleString('th-TH')}
                                    </span>
                                    {reserved > 0 && (
                                      <span className="text-[10px] text-gray-500">
                                        ({total} - {reserved})
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </TableCell>

                            <TableCell>{getStockBadge(item)}</TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleExportLocationData(item.location)}
                                className="flex items-center gap-2"
                              >
                                <Download className="h-3 w-3" />
                                Export
                              </Button>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                {/* Duplicate warning */}
                                {getDuplicateCount(item) > 0 && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge variant="destructive" className="text-xs px-1 py-0">
                                          <AlertTriangle className="h-3 w-3" />
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>พบสินค้าซ้ำ ({getDuplicateCount(item)} รายการ)</p>
                                        <p className="text-xs text-gray-500">SKU: {item.sku} ตำแหน่งเดียวกัน</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}

                                {/* Delete button */}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className={`${canDeleteItem(item)
                                          ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                                          : 'text-gray-400 cursor-not-allowed'
                                        }`}
                                      disabled={!canDeleteItem(item) || isDeleting === item.id}
                                    >
                                      {isDeleting === item.id ? (
                                        <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent" />
                                      ) : (
                                        <Trash2 className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>ยืนยันการลบรายการสินค้า</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        <div className="space-y-3">
                                          <p>คุณต้องการลบรายการสินค้านี้ใช่หรือไม่?</p>
                                          <div className="bg-muted p-3 rounded-lg space-y-2">
                                            <div className="font-medium">{item.product_name}</div>
                                            <div className="text-sm text-muted-foreground">
                                              SKU: {item.sku} | ตำแหน่ง: {displayLocation(item.location)}
                                            </div>
                                            <div className="text-sm">
                                              จำนวน: {calculateTotalQuantitySync(item)} ชิ้น
                                            </div>
                                          </div>
                                          {getDuplicateCount(item) > 0 && (
                                            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                                              <p className="text-sm text-yellow-800">
                                                <strong>⚠️ ข้อมูลซ้ำ:</strong> มีสินค้า SKU {item.sku} ในตำแหน่งนี้ {getDuplicateCount(item) + 1} รายการ
                                              </p>
                                            </div>
                                          )}
                                          <p className="text-sm text-red-600 font-medium">
                                            การดำเนินการนี้ไม่สามารถยกเลิกได้
                                          </p>
                                        </div>
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteItem(item)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        ยืนยันการลบ
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}