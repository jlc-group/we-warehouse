import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Users,
  TrendingUp,
  Package,
  DollarSign,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronRight,
  Search,
  Download
} from 'lucide-react';
import { CustomerExportService, type CustomerExportStats } from '@/services/customerExportService';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export const CustomerExportHistory = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [customerStats, setCustomerStats] = useState<CustomerExportStats[]>([]);
  const [filteredStats, setFilteredStats] = useState<CustomerExportStats[]>([]);
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  useEffect(() => {
    loadCustomerStats();
  }, [startDate, endDate]);

  useEffect(() => {
    // กรองข้อมูลตามคำค้นหา
    if (searchTerm.trim() === '') {
      setFilteredStats(customerStats);
    } else {
      const filtered = customerStats.filter(
        (stat) =>
          stat.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          stat.customer_code.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredStats(filtered);
    }
  }, [searchTerm, customerStats]);

  const loadCustomerStats = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading customer export stats...');
      const startTime = performance.now();

      const stats = await CustomerExportService.getCustomerExportStats(
        startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
        endDate ? format(endDate, 'yyyy-MM-dd') : undefined
      );

      const endTime = performance.now();
      console.log(`✅ Loaded ${stats.length} customers in ${(endTime - startTime).toFixed(2)}ms`);

      setCustomerStats(stats);
      setFilteredStats(stats);
    } catch (error) {
      console.error('❌ Error loading customer stats:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error instanceof Error ? error.message : 'ไม่สามารถโหลดข้อมูลประวัติการส่งออกได้',
        variant: 'destructive',
      });
      // ถ้า error ให้แสดงข้อมูลว่าง
      setCustomerStats([]);
      setFilteredStats([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleCustomerExpand = (customerId: string) => {
    setExpandedCustomer(expandedCustomer === customerId ? null : customerId);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'รอดำเนินการ', variant: 'outline' },
      confirmed: { label: 'ยืนยันแล้ว', variant: 'secondary' },
      shipped: { label: 'จัดส่งแล้ว', variant: 'default' },
      delivered: { label: 'ส่งถึงแล้ว', variant: 'default' },
      cancelled: { label: 'ยกเลิก', variant: 'destructive' },
    };

    const statusInfo = statusMap[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    }).format(amount);
  };

  // สรุปภาพรวมทั้งหมด
  const totalOrders = filteredStats.reduce((sum, stat) => sum + stat.total_orders, 0);
  const totalRevenue = filteredStats.reduce((sum, stat) => sum + stat.total_amount, 0);
  const totalItems = filteredStats.reduce((sum, stat) => sum + stat.total_items, 0);

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
      {/* สรุปภาพรวม */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ลูกค้าทั้งหมด</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredStats.length}</div>
            <p className="text-xs text-muted-foreground">รายการลูกค้า</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">คำสั่งซื้อทั้งหมด</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">ออเดอร์</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">รายได้รวม</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">บาท</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">สินค้าทั้งหมด</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">รายการ</p>
          </CardContent>
        </Card>
      </div>

      {/* ตัวกรอง */}
      <Card>
        <CardHeader>
          <CardTitle>กรองข้อมูล</CardTitle>
          <CardDescription>ค้นหาและกรองประวัติการส่งออกของลูกค้า</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* ช่องค้นหา */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาชื่อลูกค้าหรือรหัส..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* วันที่เริ่มต้น */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'justify-start text-left font-normal',
                    !startDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'PPP', { locale: th }) : 'วันที่เริ่มต้น'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* วันที่สิ้นสุด */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'justify-start text-left font-normal',
                    !endDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'PPP', { locale: th }) : 'วันที่สิ้นสุด'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {(startDate || endDate || searchTerm) && (
            <div className="mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStartDate(undefined);
                  setEndDate(undefined);
                  setSearchTerm('');
                }}
              >
                ล้างตัวกรอง
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ตารางข้อมูลลูกค้า */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>ประวัติการส่งออกตามลูกค้า</CardTitle>
              <CardDescription>คลิกเพื่อดูรายละเอียดคำสั่งซื้อของแต่ละลูกค้า</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              ส่งออก Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>รหัสลูกค้า</TableHead>
                <TableHead>ชื่อลูกค้า</TableHead>
                <TableHead className="text-right">จำนวนคำสั่งซื้อ</TableHead>
                <TableHead className="text-right">มูลค่ารวม</TableHead>
                <TableHead className="text-right">จำนวนสินค้า</TableHead>
                <TableHead>คำสั่งซื้อล่าสุด</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    ไม่พบข้อมูล
                  </TableCell>
                </TableRow>
              ) : (
                filteredStats.map((stat) => (
                  <>
                    <TableRow
                      key={stat.customer_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleCustomerExpand(stat.customer_id)}
                    >
                      <TableCell>
                        {expandedCustomer === stat.customer_id ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{stat.customer_code}</TableCell>
                      <TableCell>{stat.customer_name}</TableCell>
                      <TableCell className="text-right">{stat.total_orders}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(stat.total_amount)}
                      </TableCell>
                      <TableCell className="text-right">{stat.total_items}</TableCell>
                      <TableCell>
                        {stat.last_order_date
                          ? format(new Date(stat.last_order_date), 'dd MMM yyyy', { locale: th })
                          : '-'}
                      </TableCell>
                    </TableRow>

                    {/* รายละเอียดคำสั่งซื้อ (แสดงเมื่อขยาย) */}
                    {expandedCustomer === stat.customer_id && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-muted/20 p-0">
                          <div className="p-4">
                            <h4 className="font-semibold mb-3">รายละเอียดคำสั่งซื้อ</h4>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>เลขที่คำสั่งซื้อ</TableHead>
                                  <TableHead>วันที่</TableHead>
                                  <TableHead>สถานะ</TableHead>
                                  <TableHead className="text-right">จำนวนสินค้า</TableHead>
                                  <TableHead className="text-right">มูลค่า</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {stat.orders.map((order) => (
                                  <TableRow key={order.id}>
                                    <TableCell className="font-mono text-sm">
                                      {order.order_number}
                                    </TableCell>
                                    <TableCell>
                                      {format(new Date(order.order_date), 'dd MMM yyyy', {
                                        locale: th,
                                      })}
                                    </TableCell>
                                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                                    <TableCell className="text-right">{order.items_count}</TableCell>
                                    <TableCell className="text-right font-medium">
                                      {formatCurrency(order.total_amount)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
