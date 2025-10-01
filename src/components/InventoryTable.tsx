import { useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, MapPin, Hash, Calendar, Download, FileSpreadsheet, QrCode } from 'lucide-react';
import { exportInventoryToCSV, exportLocationSummary } from '@/utils/exportUtils';
import type { InventoryItem } from '@/hooks/useInventory';
import { useLocationQR } from '@/hooks/useLocationQR';
import { displayLocation, normalizeLocation } from '@/utils/locationUtils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface InventoryTableProps {
  items: InventoryItem[];
}

export function InventoryTable({ items }: InventoryTableProps) {
  // Use QR code data
  const { qrCodes, getQRByLocation } = useLocationQR();

  // Debug logging for items prop changes
  useEffect(() => {
    console.log('📋 InventoryTable - Items prop changed:', {
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
        unit_level1_conversion_rate: extendedItem.unit_level1_rate || 0,
        unit_level2_name: extendedItem.unit_level2_name,
        unit_level2_quantity: extendedItem.unit_level2_quantity || 0,
        unit_level2_conversion_rate: extendedItem.unit_level2_rate || 0,
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

    // Export with custom filename
    exportInventoryToCSV(locationItems, `location-${location.replace(/\//g, '-')}-export`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            ตารางสรุปสินค้าในคลัง
            <Badge variant="outline" className="ml-2">
              {items.length} รายการ / {uniqueLocations.length} ตำแหน่ง
            </Badge>
          </CardTitle>

          <div className="flex items-center gap-2">
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
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
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
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-center">Export</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uniqueLocations.map((location) => {
                  const locationItems = itemsByLocation.get(location) || [];
                  return (
                    <React.Fragment key={`location-${location}`}>
                      <TableRow key={`${location}-header`} className="bg-muted/20">
                        <TableCell colSpan={10} className="font-medium text-muted-foreground">
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
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
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