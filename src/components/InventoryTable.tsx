import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, MapPin, Hash, Calendar } from 'lucide-react';
import { InventoryItem } from './ShelfGrid';

interface InventoryTableProps {
  items: InventoryItem[];
}

export function InventoryTable({ items }: InventoryTableProps) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          ตารางสรุปสินค้าในคลัง
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">ชื่อสินค้า</TableHead>
                <TableHead>รหัสสินค้า</TableHead>
                <TableHead>ตำแหน่ง</TableHead>
                <TableHead>LOT</TableHead>
                <TableHead>MFD</TableHead>
                <TableHead className="text-right">จำนวนลัง</TableHead>
                <TableHead className="text-right">จำนวนเศษ</TableHead>
                <TableHead>สถานะ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    ยังไม่มีข้อมูลสินค้าในระบบ
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" />
                        {item.productName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Hash className="h-3 w-3 text-muted-foreground" />
                        <span className="font-mono text-sm">{item.productCode}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="font-mono">{item.location}</span>
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
                      {item.quantityBoxes}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.quantityLoose}
                    </TableCell>
                    <TableCell>
                      {getStockBadge(item.quantityBoxes, item.quantityLoose)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}