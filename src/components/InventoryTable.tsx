import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, MapPin, Hash, Calendar, Download, FileSpreadsheet, QrCode } from 'lucide-react';
import { exportInventoryToCSV, exportLocationSummary } from '@/utils/exportUtils';
import type { InventoryItem } from '@/hooks/useInventory';
import { useLocationQR } from '@/hooks/useLocationQR';
import {
  calculateTotalBaseQuantity,
  formatUnitsDisplay,
  formatTotalQuantity,
  type MultiLevelInventoryItem
} from '@/utils/unitCalculations';

interface InventoryTableProps {
  items: InventoryItem[];
}

export function InventoryTable({ items }: InventoryTableProps) {
  // Use QR code data
  const { qrCodes, getQRByLocation } = useLocationQR();


  // Updated to support multi-level units
  const getStockBadge = (item: InventoryItem) => {
    // Try to calculate using multi-level data if available
    const extendedItem = item as any;
    let total = 0;

    if (extendedItem.unit_level1_quantity !== undefined) {
      // Use new multi-level system
      const multiLevelItem: MultiLevelInventoryItem = {
        unit_level1_name: extendedItem.unit_level1_name,
        unit_level1_quantity: extendedItem.unit_level1_quantity || 0,
        unit_level1_conversion_rate: extendedItem.unit_level1_rate || 0,
        unit_level2_name: extendedItem.unit_level2_name,
        unit_level2_quantity: extendedItem.unit_level2_quantity || 0,
        unit_level2_conversion_rate: extendedItem.unit_level2_rate || 0,
        unit_level3_name: extendedItem.unit_level3_name,
        unit_level3_quantity: extendedItem.unit_level3_quantity || 0,
      };
      total = calculateTotalBaseQuantity(multiLevelItem);
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

  // Group items by shelf level (extract from location A/1/1 format)
  const itemsByLevel = items.reduce((acc, item) => {
    const level = item.location.split('/')[1] || '1';
    if (!acc[level]) acc[level] = [];
    acc[level].push(item);
    return acc;
  }, {} as Record<string, InventoryItem[]>);

  // Sort levels numerically
  const sortedLevels = Object.keys(itemsByLevel).sort((a, b) => parseInt(a) - parseInt(b));

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
              {items.length} รายการ
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
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            ยังไม่มีข้อมูลสินค้าในระบบ
          </div>
        ) : (
          sortedLevels.map((level) => (
            <div key={level} className="space-y-2">
              <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  {level}
                </div>
                ชั้นที่ {level}
              </h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">ชื่อสินค้า</TableHead>
                      <TableHead>รหัสสินค้า</TableHead>
                      <TableHead>ตำแหน่ง</TableHead>
                      <TableHead>QR</TableHead>
                      <TableHead>LOT</TableHead>
                      <TableHead>MFD</TableHead>
                      <TableHead className="w-[200px]">หน่วยสินค้า</TableHead>
                      <TableHead className="text-right">รวมทั้งหมด</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead className="text-center">Export</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemsByLevel[level].map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/50">
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
                            <span className="font-mono">{item.location}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center">
                            {getQRByLocation(item.location) ? (
                              <Badge
                                variant="default"
                                className="bg-green-100 text-green-800 cursor-pointer hover:bg-green-200"
                                onClick={() => {
                                  const params = new URLSearchParams();
                                  params.set('tab', 'overview');
                                  params.set('location', item.location);
                                  params.set('action', 'add');
                                  window.location.href = `${window.location.origin}?${params.toString()}`;
                                }}
                              >
                                <QrCode className="h-3 w-3 mr-1" />
                                มี
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-gray-500">
                                <QrCode className="h-3 w-3 mr-1" />
                                ไม่มี
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.lot || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {item.mfd && <Calendar className="h-3 w-3 text-muted-foreground" />}
                            {formatDate(item.mfd)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const extendedItem = item as any;
                            if (extendedItem.unit_level1_quantity !== undefined) {
                              // Use multi-level display
                              const multiLevelItem: MultiLevelInventoryItem = {
                                unit_level1_name: extendedItem.unit_level1_name,
                                unit_level1_quantity: extendedItem.unit_level1_quantity || 0,
                                unit_level1_conversion_rate: extendedItem.unit_level1_rate || 0,
                                unit_level2_name: extendedItem.unit_level2_name,
                                unit_level2_quantity: extendedItem.unit_level2_quantity || 0,
                                unit_level2_conversion_rate: extendedItem.unit_level2_rate || 0,
                                unit_level3_name: extendedItem.unit_level3_name,
                                unit_level3_quantity: extendedItem.unit_level3_quantity || 0,
                              };
                              // Simple direct display แบบเดียวกับ ShelfGrid
                              const level1Qty = extendedItem.unit_level1_quantity || 0;
                              const level2Qty = extendedItem.unit_level2_quantity || 0;
                              const level3Qty = extendedItem.unit_level3_quantity || 0;
                              const level1Rate = extendedItem.unit_level1_rate || 0;
                              const level2Rate = extendedItem.unit_level2_rate || 0;

                              const hasMultiLevelData = level1Qty > 0 || level2Qty > 0 || level3Qty > 0;

                              let displayText = '';
                              let calculationText = '';

                              if (hasMultiLevelData) {
                                const parts = [];
                                const calcParts = [];

                                if (level1Qty > 0) {
                                  parts.push(`${level1Qty} ${extendedItem.unit_level1_name || 'ลัง'}`);
                                  if (level1Rate > 0) calcParts.push(`${level1Qty}×${level1Rate}`);
                                }
                                if (level2Qty > 0) {
                                  parts.push(`${level2Qty} ${extendedItem.unit_level2_name || 'กล่อง'}`);
                                  if (level2Rate > 0) calcParts.push(`${level2Qty}×${level2Rate}`);
                                }
                                if (level3Qty > 0) {
                                  parts.push(`${level3Qty} ${extendedItem.unit_level3_name || 'ชิ้น'}`);
                                  if (level2Rate > 0 || level1Rate > 0) calcParts.push(`${level3Qty}×1`);
                                }

                                displayText = parts.join(' + ');
                                // แสดง calculation text เมื่อมี conversion rates
                                if (calcParts.length > 0 && (level1Rate > 0 || level2Rate > 0)) {
                                  calculationText = `คำนวณ: (${calcParts.join(' + ')})`;
                                }
                              } else {
                                displayText = 'ไม่มีข้อมูล';
                              }

                              return (
                                <div className="text-sm">
                                  <div className="font-medium">{displayText}</div>
                                  {calculationText && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {calculationText}
                                    </div>
                                  )}
                                </div>
                              );
                            } else {
                              // Fallback to legacy display
                              return (
                                <div className="text-sm">
                                  <div>{(item as any).carton_quantity_legacy} ลัง + {(item as any).box_quantity_legacy} เศษ</div>
                                </div>
                              );
                            }
                          })()
                        }
                        </TableCell>
                        <TableCell className="text-right">
                          {(() => {
                            const extendedItem = item as any;
                            if (extendedItem.unit_level1_quantity !== undefined) {
                              const multiLevelItem: MultiLevelInventoryItem = {
                                unit_level1_name: extendedItem.unit_level1_name,
                                unit_level1_quantity: extendedItem.unit_level1_quantity || 0,
                                unit_level1_conversion_rate: extendedItem.unit_level1_rate || 0,
                                unit_level2_name: extendedItem.unit_level2_name,
                                unit_level2_quantity: extendedItem.unit_level2_quantity || 0,
                                unit_level2_conversion_rate: extendedItem.unit_level2_rate || 0,
                                unit_level3_name: extendedItem.unit_level3_name,
                                unit_level3_quantity: extendedItem.unit_level3_quantity || 0,
                              };
                              // คำนวณจำนวนรวมแบบ smart
                              const level1Qty = extendedItem.unit_level1_quantity || 0;
                              const level2Qty = extendedItem.unit_level2_quantity || 0;
                              const level3Qty = extendedItem.unit_level3_quantity || 0;
                              const level1Rate = extendedItem.unit_level1_rate || 0;
                              const level2Rate = extendedItem.unit_level2_rate || 0;

                              let totalCalculated = 0;
                              let showCalculated = false;

                              // ถ้ามี conversion rates ให้คำนวณ
                              if (level1Rate > 0 || level2Rate > 0) {
                                totalCalculated = (level1Qty * level1Rate) + (level2Qty * level2Rate) + level3Qty;
                                showCalculated = true;
                              }

                              return (
                                <div className="font-mono font-bold text-primary">
                                  {showCalculated ? (
                                    `${totalCalculated.toLocaleString('th-TH')} ${extendedItem.unit_level3_name || 'ชิ้น'}`
                                  ) : (
                                    // แสดงผลแบบ smart display แยกหน่วย
                                    (() => {
                                      const parts = [];
                                      if (level1Qty > 0) parts.push(`${level1Qty} ${extendedItem.unit_level1_name || 'ลัง'}`);
                                      if (level2Qty > 0) parts.push(`${level2Qty} ${extendedItem.unit_level2_name || 'กล่อง'}`);
                                      if (level3Qty > 0) parts.push(`${level3Qty} ${extendedItem.unit_level3_name || 'ชิ้น'}`);
                                      return parts.length > 0 ? parts.join(' + ') : '0';
                                    })()
                                  )}
                                </div>
                              );
                            } else {
                              return (
                                <div className="font-mono">
                                  {(item as any).carton_quantity_legacy + (item as any).box_quantity_legacy} รวม
                                </div>
                              );
                            }
                          })()
                        }
                        </TableCell>
                        <TableCell>
                          {getStockBadge(item)}
                        </TableCell>
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
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}