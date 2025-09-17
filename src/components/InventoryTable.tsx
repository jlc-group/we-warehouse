import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, MapPin, Hash, Calendar, Download, FileSpreadsheet, QrCode } from 'lucide-react';
import { exportInventoryToCSV, exportLocationSummary } from '@/utils/exportUtils';
import type { InventoryItem } from '@/hooks/useInventory';
import { useLocationQR } from '@/hooks/useLocationQR';

interface InventoryTableProps {
  items: InventoryItem[];
}

export function InventoryTable({ items }: InventoryTableProps) {
  // Use QR code data
  const { qrCodes, getQRByLocation } = useLocationQR();

  // Debug QR codes
  console.log('🔍 InventoryTable - QR Codes loaded:', qrCodes.length);

  const getStockBadge = (boxes: number, loose: number) => {
    const total = boxes + loose;
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
                      <TableHead className="text-right">จำนวนลัง</TableHead>
                      <TableHead className="text-right">จำนวนเศษ</TableHead>
                      <TableHead>สถานะ</TableHead>
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
                              <Badge variant="default" className="bg-green-100 text-green-800">
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
                        <TableCell className="text-right font-mono">
                          {item.box_quantity}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {item.loose_quantity}
                        </TableCell>
                        <TableCell>
                          {getStockBadge(item.box_quantity, item.loose_quantity)}
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