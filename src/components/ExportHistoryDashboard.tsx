import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Package, Users, TrendingUp, Calendar, MapPin, FileText } from 'lucide-react';
import { ExportHistoryService, type ExportHistoryItem, type DateFilter } from '@/services/exportHistoryService';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export const ExportHistoryDashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [exportItems, setExportItems] = useState<ExportHistoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ExportHistoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  useEffect(() => {
    loadExportHistory();
  }, [dateFilter]);

  useEffect(() => {
    // กรองข้อมูลตามคำค้นหา
    if (searchTerm.trim() === '') {
      setFilteredItems(exportItems);
    } else {
      const searchLower = searchTerm.toLowerCase();
      const filtered = exportItems.filter(
        (item) =>
          item.product_name.toLowerCase().includes(searchLower) ||
          item.product_code.toLowerCase().includes(searchLower) ||
          item.customer_name.toLowerCase().includes(searchLower) ||
          item.order_number.toLowerCase().includes(searchLower)
      );
      setFilteredItems(filtered);
    }
  }, [searchTerm, exportItems]);

  const loadExportHistory = async () => {
    try {
      setLoading(true);
      const items = await ExportHistoryService.getExportHistory(dateFilter);
      setExportItems(items);
      setFilteredItems(items);
    } catch (error) {
      console.error('Error loading export history:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดประวัติการส่งออกได้',
        variant: 'destructive',
      });
      setExportItems([]);
      setFilteredItems([]);
    } finally {
      setLoading(false);
    }
  };

  const summary = ExportHistoryService.getExportSummary(filteredItems);

  const dateFilterButtons: { value: DateFilter; label: string }[] = [
    { value: 'all', label: 'ทั้งหมด' },
    { value: 'today', label: 'วันนี้' },
    { value: '7days', label: '7 วัน' },
    { value: '30days', label: '30 วัน' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6" />
            ประวัติการส่งออกสินค้า
          </h2>
          <p className="text-muted-foreground mt-1">
            รายการสินค้าที่ส่งออกทั้งหมดพร้อมรายละเอียด ({filteredItems.length} รายการ)
          </p>
        </div>
      </div>

      {/* สรุปภาพรวม */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">รายการทั้งหมด</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalItems}</div>
            <p className="text-xs text-muted-foreground">รายการส่งออก</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">จำนวนสินค้า</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalQuantity}</div>
            <p className="text-xs text-muted-foreground">ชิ้น</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">สินค้าที่แตกต่าง</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.uniqueProducts}</div>
            <p className="text-xs text-muted-foreground">รายการสินค้า</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ลูกค้า</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.uniqueCustomers}</div>
            <p className="text-xs text-muted-foreground">รายการลูกค้า</p>
          </CardContent>
        </Card>
      </div>

      {/* ตัวกรองและค้นหา */}
      <Card>
        <CardHeader>
          <CardTitle>กรองข้อมูล</CardTitle>
          <CardDescription>ค้นหาและกรองรายการส่งออก</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* ช่องค้นหา */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาสินค้า, ลูกค้า, เลขที่คำสั่งซื้อ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* ปุ่มกรองวันที่ */}
            <div className="flex gap-2">
              {dateFilterButtons.map((btn) => (
                <Button
                  key={btn.value}
                  variant={dateFilter === btn.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDateFilter(btn.value)}
                  className={cn(
                    dateFilter === btn.value && 'bg-primary text-primary-foreground'
                  )}
                >
                  {btn.label}
                </Button>
              ))}
            </div>

            {searchTerm && (
              <div className="text-sm text-muted-foreground">
                พบ {filteredItems.length} รายการจากการค้นหา "{searchTerm}"
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ตารางข้อมูล */}
      <Card>
        <CardHeader>
          <CardTitle>รายการส่งออก</CardTitle>
          <CardDescription>รายละเอียดการส่งออกสินค้าทั้งหมด</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      วันที่/เวลา
                    </div>
                  </TableHead>
                  <TableHead>สินค้า</TableHead>
                  <TableHead className="text-right">จำนวน</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      ชา
                    </div>
                  </TableHead>
                  <TableHead>ลูกค้า</TableHead>
                  <TableHead>หมายเหตุ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      ไม่พบข้อมูล
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">
                            {format(new Date(item.export_date), 'dd ค.ค. yyyy', { locale: th })}
                          </div>
                          <div className="text-muted-foreground">{item.export_time}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.product_name}</div>
                          <div className="text-sm text-muted-foreground">{item.product_code}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">
                          {item.quantity} {item.unit}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.location}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.customer_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.customer_code}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="text-sm text-muted-foreground truncate">
                          {item.notes || '-'}
                          <div className="text-xs mt-1">
                            ส่งออกโดยแบบฟอร์มการจัดการวันที่/ฉบับที่ | PO: {item.order_number}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
