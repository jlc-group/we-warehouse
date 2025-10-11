import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Package,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  ArrowUp,
  ArrowDown,
  Filter,
  User,
  Download,
  CalendarIcon,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, subDays } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658', '#ff7c7c'];

interface CustomerExport {
  id: string;
  product_name: string;
  product_code: string;
  product_type?: string;
  customer_name: string;
  quantity_exported: number;
  from_location: string;
  created_at: string;
  unit_price?: number;
  total_value?: number;
}

type DateFilter = 'today' | '7days' | '30days' | 'custom';

export const CustomerExportDashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [exports, setExports] = useState<CustomerExport[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('30days');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();

  useEffect(() => {
    loadExportData();
  }, [dateFilter, customStartDate, customEndDate]);

  const loadExportData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading export data for dashboard...');

      // Calculate date range
      const now = new Date();
      let startDate: Date;
      let endDate: Date = now;

      if (dateFilter === 'custom') {
        if (!customStartDate) {
          setLoading(false);
          return;
        }
        startDate = customStartDate;
        endDate = customEndDate || now;
      } else {
        switch (dateFilter) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case '7days':
            startDate = subDays(now, 7);
            break;
          case '30days':
            startDate = subDays(now, 30);
            break;
          default:
            startDate = subDays(now, 30);
        }
      }

      let query = supabase
        .from('customer_exports')
        .select('id, product_name, product_code, product_type, customer_name, quantity_exported, from_location, created_at, unit_price, total_value')
        .gte('created_at', format(startDate, 'yyyy-MM-dd'));

      if (dateFilter === 'custom' && customEndDate) {
        query = query.lte('created_at', format(endDate, 'yyyy-MM-dd') + 'T23:59:59');
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      setExports(data || []);
      console.log(`✅ Loaded ${data?.length || 0} export records`);
    } catch (error) {
      console.error('❌ Error loading export data:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดข้อมูลได้',
        variant: 'destructive',
      });
      setExports([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter by selected customer
  const filteredExports = useMemo(() => {
    if (selectedCustomer === 'all') return exports;
    return exports.filter(exp => exp.customer_name === selectedCustomer);
  }, [exports, selectedCustomer]);

  // Get unique customers
  const uniqueCustomersList = useMemo(() => {
    const customers = new Set(exports.map(exp => exp.customer_name));
    return Array.from(customers).sort();
  }, [exports]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalExports = filteredExports.length;
    const totalQuantity = filteredExports.reduce((sum, exp) => sum + exp.quantity_exported, 0);
    const uniqueProducts = new Set(filteredExports.map(exp => exp.product_code)).size;

    // Calculate previous period for comparison
    const currentPeriodDays = dateFilter === 'today' ? 1 : dateFilter === '7days' ? 7 : 30;
    const previousPeriodStart = subDays(new Date(), currentPeriodDays * 2);
    const previousPeriodEnd = subDays(new Date(), currentPeriodDays);

    const previousExports = exports.filter(exp => {
      const expDate = parseISO(exp.created_at);
      const matchesCustomer = selectedCustomer === 'all' || exp.customer_name === selectedCustomer;
      return matchesCustomer && expDate >= previousPeriodStart && expDate < previousPeriodEnd;
    });

    const previousTotal = previousExports.reduce((sum, exp) => sum + exp.quantity_exported, 0);
    const percentChange = previousTotal > 0
      ? ((totalQuantity - previousTotal) / previousTotal) * 100
      : totalQuantity > 0 ? 100 : 0;

    return {
      totalExports,
      totalQuantity,
      uniqueProducts,
      percentChange: Math.round(percentChange),
      isIncreasing: percentChange > 0,
    };
  }, [filteredExports, exports, selectedCustomer, dateFilter]);

  // Daily trend data
  const dailyTrendData = useMemo(() => {
    const dailyMap = new Map<string, number>();

    filteredExports.forEach(exp => {
      const date = format(parseISO(exp.created_at), 'dd MMM', { locale: th });
      const current = dailyMap.get(date) || 0;
      dailyMap.set(date, current + exp.quantity_exported);
    });

    return Array.from(dailyMap.entries())
      .map(([date, quantity]) => ({ date, quantity }))
      .reverse();
  }, [filteredExports]);

  // Top products data
  const topProductsData = useMemo(() => {
    const productMap = new Map<string, { name: string; quantity: number; code: string }>();

    filteredExports.forEach(exp => {
      const current = productMap.get(exp.product_code) || { name: exp.product_name, quantity: 0, code: exp.product_code };
      productMap.set(exp.product_code, {
        ...current,
        quantity: current.quantity + exp.quantity_exported,
      });
    });

    return Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)
      .map(item => ({
        name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
        quantity: item.quantity,
      }));
  }, [filteredExports]);

  // Product type distribution
  const productTypeData = useMemo(() => {
    const typeMap = new Map<string, number>();

    filteredExports.forEach(exp => {
      const type = exp.product_type || 'อื่นๆ';
      const current = typeMap.get(type) || 0;
      typeMap.set(type, current + exp.quantity_exported);
    });

    return Array.from(typeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExports]);

  // Recent exports
  const recentExports = useMemo(() => {
    return filteredExports.slice(0, 10);
  }, [filteredExports]);

  const getProductTypeBadge = (productType?: string) => {
    if (!productType) return null;

    const types: Record<string, { label: string; className: string }> = {
      FG: { label: 'FG', className: 'bg-green-100 text-green-800 border-green-300' },
      PK: { label: 'PK', className: 'bg-blue-100 text-blue-800 border-blue-300' },
      RM: { label: 'RM', className: 'bg-orange-100 text-orange-800 border-orange-300' },
    };

    const type = types[productType] || { label: productType, className: 'bg-gray-100 text-gray-700 border-gray-300' };

    return (
      <Badge variant="outline" className={cn('text-xs', type.className)}>
        {type.label}
      </Badge>
    );
  };

  const exportToCSV = () => {
    try {
      // สร้าง CSV header
      const headers = [
        'วันที่',
        'เวลา',
        'ลูกค้า',
        'รหัสสินค้า',
        'ชื่อสินค้า',
        'ประเภท',
        'จำนวน (ชิ้น)',
        'ราคา/หน่วย',
        'มูลค่ารวม',
        'ตำแหน่ง'
      ];

      // สร้าง CSV rows
      const rows = filteredExports.map(exp => [
        format(parseISO(exp.created_at), 'dd/MM/yyyy', { locale: th }),
        format(parseISO(exp.created_at), 'HH:mm', { locale: th }),
        exp.customer_name,
        exp.product_code,
        exp.product_name,
        exp.product_type || '-',
        exp.quantity_exported,
        exp.unit_price ? exp.unit_price.toFixed(2) : '-',
        exp.total_value ? exp.total_value.toFixed(2) : '-',
        exp.from_location
      ]);

      // สร้าง CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Download
      const blob = new Blob(['\ufeff' + csvContent], {
        type: 'text/csv;charset=utf-8;'
      });

      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      const dateRange = dateFilter === 'custom' && customStartDate
        ? `${format(customStartDate, 'yyyyMMdd')}-${format(customEndDate || new Date(), 'yyyyMMdd')}`
        : dateFilter;

      link.setAttribute('href', url);
      link.setAttribute('download', `export_dashboard_${dateRange}_${new Date().getTime()}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      toast({
        title: '✅ Export สำเร็จ',
        description: `ดาวน์โหลดข้อมูล ${filteredExports.length} รายการแล้ว`,
      });
    } catch (error) {
      console.error('Error exporting:', error);
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: 'ไม่สามารถ export ข้อมูลได้',
        variant: 'destructive',
      });
    }
  };

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
      {/* Header with Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Dashboard การส่งออกตามลูกค้า
              </CardTitle>
              <CardDescription>
                วิเคราะห์และติดตามการส่งออกของลูกค้าแต่ละราย
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={loadExportData}>
                รีเฟรช
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* Customer Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(selectedCustomer === 'all' && 'text-muted-foreground')}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  {selectedCustomer === 'all' ? 'ลูกค้าทั้งหมด' : selectedCustomer}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="start">
                <div className="max-h-80 overflow-auto">
                  <Button
                    variant={selectedCustomer === 'all' ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setSelectedCustomer('all')}
                  >
                    ลูกค้าทั้งหมด ({exports.length})
                  </Button>
                  {uniqueCustomersList.map((customer) => {
                    const count = exports.filter(e => e.customer_name === customer).length;
                    return (
                      <Button
                        key={customer}
                        variant={selectedCustomer === customer ? 'default' : 'ghost'}
                        className="w-full justify-start"
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        <User className="mr-2 h-4 w-4" />
                        {customer} ({count})
                      </Button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>

            {/* Date Filter */}
            <div className="flex gap-2">
              <Button
                variant={dateFilter === 'today' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateFilter('today')}
              >
                วันนี้
              </Button>
              <Button
                variant={dateFilter === '7days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateFilter('7days')}
              >
                7 วัน
              </Button>
              <Button
                variant={dateFilter === '30days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateFilter('30days')}
              >
                30 วัน
              </Button>
              <Button
                variant={dateFilter === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateFilter('custom')}
              >
                กำหนดเอง
              </Button>
            </div>

            {/* Custom Date Range Picker */}
            {dateFilter === 'custom' && (
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-[140px] justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customStartDate ? format(customStartDate, 'dd MMM yyyy', { locale: th }) : 'เริ่มต้น'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={customStartDate}
                      onSelect={setCustomStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <span className="text-sm text-muted-foreground">ถึง</span>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-[140px] justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customEndDate ? format(customEndDate, 'dd MMM yyyy', { locale: th }) : 'สิ้นสุด'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={customEndDate}
                      onSelect={setCustomEndDate}
                      initialFocus
                      disabled={(date) => customStartDate ? date < customStartDate : false}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">จำนวนครั้ง</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalExports}</div>
            <p className="text-xs text-muted-foreground">รายการส่งออก</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">จำนวนรวม</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalQuantity.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">ชิ้น</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">สินค้าที่แตกต่าง</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueProducts}</div>
            <p className="text-xs text-muted-foreground">รายการสินค้า</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">เทรนด์</CardTitle>
            {stats.isIncreasing ? (
              <ArrowUp className="h-4 w-4 text-green-600" />
            ) : (
              <ArrowDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              stats.isIncreasing ? "text-green-600" : "text-red-600"
            )}>
              {stats.isIncreasing ? '+' : ''}{stats.percentChange}%
            </div>
            <p className="text-xs text-muted-foreground">เทียบกับช่วงก่อน</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Daily Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>แนวโน้มการส่งออกรายวัน</CardTitle>
            <CardDescription>ปริมาณการส่งออกในแต่ละวัน</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="quantity"
                    stroke="#0088FE"
                    strokeWidth={2}
                    name="จำนวน (ชิ้น)"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                ไม่มีข้อมูล
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products Chart */}
        <Card>
          <CardHeader>
            <CardTitle>สินค้าที่ส่งออกมากสุด</CardTitle>
            <CardDescription>Top 10 สินค้า</CardDescription>
          </CardHeader>
          <CardContent>
            {topProductsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topProductsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip />
                  <Bar dataKey="quantity" fill="#00C49F" name="จำนวน (ชิ้น)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                ไม่มีข้อมูล
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Customers Chart */}
        <Card>
          <CardHeader>
            <CardTitle>ลูกค้าที่ส่งออกมากที่สุด</CardTitle>
            <CardDescription>Top 10 ลูกค้าตามจำนวนชิ้น</CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              // Calculate top customers by quantity
              const customerMap = new Map<string, number>();
              filteredExports.forEach(exp => {
                const current = customerMap.get(exp.customer_name) || 0;
                customerMap.set(exp.customer_name, current + exp.quantity_exported);
              });

              const topCustomers = Array.from(customerMap.entries())
                .map(([name, quantity]) => ({ name, quantity }))
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 10);

              return topCustomers.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topCustomers} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip />
                    <Bar dataKey="quantity" fill="#8884D8" name="จำนวน (ชิ้น)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  ไม่มีข้อมูล
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Product Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>สัดส่วนประเภทสินค้า</CardTitle>
            <CardDescription>แบ่งตามประเภท FG/PK/RM</CardDescription>
          </CardHeader>
          <CardContent>
            {productTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={productTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {productTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                ไม่มีข้อมูล
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Exports Table */}
        <Card>
          <CardHeader>
            <CardTitle>รายการล่าสุด</CardTitle>
            <CardDescription>10 รายการส่งออกล่าสุด</CardDescription>
          </CardHeader>
          <CardContent>
            {recentExports.length > 0 ? (
              <div className="max-h-[300px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>วันที่</TableHead>
                      <TableHead>สินค้า</TableHead>
                      <TableHead className="text-right">จำนวน</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentExports.map((exp) => (
                      <TableRow key={exp.id}>
                        <TableCell className="text-xs">
                          {format(parseISO(exp.created_at), 'dd MMM HH:mm', { locale: th })}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm font-medium">{exp.product_name}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{exp.product_code}</Badge>
                              {getProductTypeBadge(exp.product_type)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {exp.quantity_exported.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                ไม่มีข้อมูล
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
