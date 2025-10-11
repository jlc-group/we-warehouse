import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
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
  Users,
  Calendar,
  DollarSign,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { ExportHistoryService, type ExportHistoryItem, type DateFilter } from '@/services/exportHistoryService';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, startOfDay, subDays } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658', '#ff7c7c'];

export const ExportAnalyticsDashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [exportItems, setExportItems] = useState<ExportHistoryItem[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>('30days');

  useEffect(() => {
    loadExportHistory();
  }, [dateFilter]);

  const loadExportHistory = async () => {
    try {
      setLoading(true);
      const items = await ExportHistoryService.getExportHistory(dateFilter);
      setExportItems(items);
    } catch (error) {
      console.error('Error loading export history:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดข้อมูลได้',
        variant: 'destructive',
      });
      setExportItems([]);
    } finally {
      setLoading(false);
    }
  };

  // คำนวณสถิติ
  const stats = useMemo(() => {
    const summary = ExportHistoryService.getExportSummary(exportItems);

    // คำนวณเปอร์เซ็นต์การเปลี่ยนแปลงเทียบกับช่วงก่อนหน้า
    const currentPeriodDays = dateFilter === 'today' ? 1 : dateFilter === '7days' ? 7 : 30;
    const previousPeriodStart = subDays(new Date(), currentPeriodDays * 2);
    const previousPeriodEnd = subDays(new Date(), currentPeriodDays);

    const previousItems = exportItems.filter(item => {
      const itemDate = parseISO(item.export_date);
      return itemDate >= previousPeriodStart && itemDate < previousPeriodEnd;
    });

    const previousTotal = previousItems.reduce((sum, item) => sum + item.quantity, 0);
    const currentTotal = summary.totalQuantity;
    const percentChange = previousTotal > 0
      ? ((currentTotal - previousTotal) / previousTotal) * 100
      : 0;

    return {
      ...summary,
      percentChange: Math.round(percentChange),
      isIncreasing: percentChange > 0,
    };
  }, [exportItems, dateFilter]);

  // ข้อมูลกราฟแนวโน้มรายวัน
  const dailyTrendData = useMemo(() => {
    const dailyMap = new Map<string, number>();

    exportItems.forEach(item => {
      const date = format(parseISO(item.export_date), 'dd MMM', { locale: th });
      const current = dailyMap.get(date) || 0;
      dailyMap.set(date, current + item.quantity);
    });

    return Array.from(dailyMap.entries())
      .map(([date, quantity]) => ({ date, quantity }))
      .slice(-14); // แสดง 14 วันล่าสุด
  }, [exportItems]);

  // ข้อมูลกราฟ Top 10 สินค้า
  const topProductsData = useMemo(() => {
    const productMap = new Map<string, { name: string; quantity: number }>();

    exportItems.forEach(item => {
      const key = item.product_code;
      const current = productMap.get(key);
      if (current) {
        current.quantity += item.quantity;
      } else {
        productMap.set(key, {
          name: item.product_name.substring(0, 20), // จำกัดความยาว
          quantity: item.quantity,
        });
      }
    });

    return Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }, [exportItems]);

  // ข้อมูลกราฟสัดส่วนลูกค้า
  const customerDistributionData = useMemo(() => {
    const customerMap = new Map<string, number>();

    exportItems.forEach(item => {
      const current = customerMap.get(item.customer_name) || 0;
      customerMap.set(item.customer_name, current + item.quantity);
    });

    return Array.from(customerMap.entries())
      .map(([name, value]) => ({ name: name.substring(0, 15), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 ลูกค้า
  }, [exportItems]);

  // ข้อมูลกราฟพื้นที่สะสม
  const cumulativeData = useMemo(() => {
    const dailyMap = new Map<string, number>();

    exportItems.forEach(item => {
      const date = format(parseISO(item.export_date), 'dd MMM', { locale: th });
      const current = dailyMap.get(date) || 0;
      dailyMap.set(date, current + item.quantity);
    });

    const sortedData = Array.from(dailyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14);

    let cumulative = 0;
    return sortedData.map(([date, quantity]) => {
      cumulative += quantity;
      return { date, cumulative };
    });
  }, [exportItems]);

  const dateFilterButtons: { value: DateFilter; label: string }[] = [
    { value: 'today', label: 'วันนี้' },
    { value: '7days', label: '7 วัน' },
    { value: '30days', label: '30 วัน' },
    { value: 'all', label: 'ทั้งหมด' },
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
          <h2 className="text-3xl font-bold tracking-tight">📊 Dashboard การส่งออกสินค้า</h2>
          <p className="text-muted-foreground mt-1">
            วิเคราะห์และติดตามประสิทธิภาพการส่งออก
          </p>
        </div>
        <div className="flex gap-2">
          {dateFilterButtons.map((btn) => (
            <Button
              key={btn.value}
              variant={dateFilter === btn.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateFilter(btn.value)}
            >
              {btn.label}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ส่งออกทั้งหมด</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalQuantity.toLocaleString()}</div>
            <div className="flex items-center text-xs">
              {stats.isIncreasing ? (
                <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
              )}
              <span className={cn(stats.isIncreasing ? 'text-green-500' : 'text-red-500')}>
                {Math.abs(stats.percentChange)}%
              </span>
              <span className="text-muted-foreground ml-1">จากช่วงก่อน</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">รายการทั้งหมด</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">รายการส่งออก</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">สินค้าที่แตกต่าง</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueProducts}</div>
            <p className="text-xs text-muted-foreground">ประเภทสินค้า</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ลูกค้าทั้งหมด</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueCustomers}</div>
            <p className="text-xs text-muted-foreground">รายการลูกค้า</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* กราฟแนวโน้มรายวัน */}
        <Card>
          <CardHeader>
            <CardTitle>📈 แนวโน้มการส่งออกรายวัน</CardTitle>
            <CardDescription>ปริมาณการส่งออก 14 วันล่าสุด</CardDescription>
          </CardHeader>
          <CardContent>
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
                  name="จำนวน (ชิ้น)"
                  stroke="#8884d8"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* กราฟพื้นที่สะสม */}
        <Card>
          <CardHeader>
            <CardTitle>📊 ปริมาณส่งออกสะสม</CardTitle>
            <CardDescription>ยอดสะสมการส่งออก</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  name="ยอดสะสม (ชิ้น)"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* กราฟ Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>🏆 สินค้าขายดี Top 10</CardTitle>
            <CardDescription>สินค้าที่ส่งออกมากที่สุด</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={topProductsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Legend />
                <Bar dataKey="quantity" name="จำนวน (ชิ้น)" fill="#8884d8">
                  {topProductsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* กราฟ Pie Chart ลูกค้า */}
        <Card>
          <CardHeader>
            <CardTitle>🥧 สัดส่วนการส่งออกตามลูกค้า</CardTitle>
            <CardDescription>Top 8 ลูกค้า</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={customerDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {customerDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
