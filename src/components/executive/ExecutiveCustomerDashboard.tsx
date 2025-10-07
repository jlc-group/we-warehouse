import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, subDays, startOfDay, endOfDay } from 'date-fns';
import { th } from 'date-fns/locale';
import { Calendar, Download, Filter, RefreshCw } from 'lucide-react';

// Import components
import { HeroMetrics } from './HeroMetrics';
import { SmartInsights, type SmartInsight } from './SmartInsights';
import { CustomerSegmentation, type CustomerSegment } from './CustomerSegmentation';
import { HeatmapCalendar } from './charts/HeatmapCalendar';

interface ExportData {
  id: string;
  product_name: string;
  product_code: string;
  customer_name: string;
  quantity_exported: number;
  from_location: string;
  created_at: string;
  unit_price?: number;
  total_value?: number;
}

type DateFilter = 'today' | '7days' | '30days' | '90days' | 'all';
type ViewMode = 'overview' | 'segments' | 'insights' | 'calendar' | 'comparison';

export const ExecutiveCustomerDashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [exportData, setExportData] = useState<ExportData[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>('30days');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('overview');

  useEffect(() => {
    loadExportData();
  }, [dateFilter, selectedCustomer]);

  const loadExportData = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('customer_exports')
        .select('id, product_name, product_code, customer_name, quantity_exported, from_location, created_at, unit_price, total_value')
        .order('created_at', { ascending: false });

      // Date filter
      if (dateFilter !== 'all') {
        const days = dateFilter === 'today' ? 0 : dateFilter === '7days' ? 7 : dateFilter === '30days' ? 30 : 90;
        const startDate = startOfDay(subDays(new Date(), days));
        query = query.gte('created_at', startDate.toISOString());
      }

      // Customer filter
      if (selectedCustomer !== 'all') {
        query = query.eq('customer_name', selectedCustomer);
      }

      const { data, error } = await query;

      if (error) throw error;
      setExportData(data || []);
    } catch (error) {
      console.error('Error loading export data:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดข้อมูลได้',
        variant: 'destructive',
      });
      setExportData([]);
    } finally {
      setLoading(false);
    }
  };

  // Get unique customers with counts
  const customerOptions = useMemo(() => {
    const customerMap = new Map<string, number>();
    exportData.forEach(item => {
      const count = customerMap.get(item.customer_name) || 0;
      customerMap.set(item.customer_name, count + 1);
    });
    return Array.from(customerMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [exportData]);

  // Calculate hero metrics
  const heroMetrics = useMemo(() => {
    const totalItems = exportData.reduce((sum, item) => sum + item.quantity_exported, 0);
    const totalOrders = exportData.length;
    const uniqueCustomers = new Set(exportData.map(item => item.customer_name)).size;

    // Calculate revenue from actual data (use total_value if available, otherwise fallback to mock)
    const totalRevenue = exportData.reduce((sum, item) => {
      // Priority 1: Use total_value if available
      if (item.total_value != null) return sum + item.total_value;
      // Priority 2: Calculate from unit_price if available
      if (item.unit_price != null) return sum + (item.quantity_exported * item.unit_price);
      // Fallback: Use average price estimate
      return sum + (item.quantity_exported * 150);
    }, 0);

    // Calculate changes compared to previous period
    const periodDays = dateFilter === 'today' ? 1 : dateFilter === '7days' ? 7 : dateFilter === '30days' ? 30 : 90;
    const previousPeriodStart = subDays(new Date(), periodDays * 2);
    const previousPeriodEnd = subDays(new Date(), periodDays);

    const previousItems = exportData.filter(item => {
      const itemDate = parseISO(item.created_at);
      return itemDate >= previousPeriodStart && itemDate < previousPeriodEnd;
    });

    const previousRevenue = previousItems.reduce((sum, item) => {
      if (item.total_value != null) return sum + item.total_value;
      if (item.unit_price != null) return sum + (item.quantity_exported * item.unit_price);
      return sum + (item.quantity_exported * 150);
    }, 0);
    const previousOrders = previousItems.length;

    const revenueChange = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    const ordersChange = previousOrders > 0 ? ((totalOrders - previousOrders) / previousOrders) * 100 : 0;

    // Top customer and product
    const customerSales = new Map<string, number>();
    const productSales = new Map<string, number>();

    exportData.forEach(item => {
      const custTotal = customerSales.get(item.customer_name) || 0;
      customerSales.set(item.customer_name, custTotal + item.quantity_exported);

      const prodTotal = productSales.get(item.product_name) || 0;
      productSales.set(item.product_name, prodTotal + item.quantity_exported);
    });

    const topCustomer = Array.from(customerSales.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

    const topProduct = Array.from(productSales.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

    return {
      totalRevenue,
      totalOrders,
      totalCustomers: uniqueCustomers,
      totalItems,
      revenueChange: Math.round(revenueChange),
      ordersChange: Math.round(ordersChange),
      topCustomer,
      topProduct,
    };
  }, [exportData, dateFilter]);

  // Calculate customer segments
  const customerSegments = useMemo((): CustomerSegment[] => {
    const customerData = new Map<string, {
      totalValue: number;
      orderCount: number;
      lastOrderDate: Date;
      firstOrderDate: Date;
    }>();

    const now = new Date();

    exportData.forEach(item => {
      const customer = item.customer_name;
      const existing = customerData.get(customer);
      const orderDate = parseISO(item.created_at);

      // Calculate value using actual price data
      const value = item.total_value != null
        ? item.total_value
        : item.unit_price != null
          ? item.quantity_exported * item.unit_price
          : item.quantity_exported * 150;

      if (existing) {
        existing.totalValue += value;
        existing.orderCount += 1;
        if (orderDate > existing.lastOrderDate) existing.lastOrderDate = orderDate;
        if (orderDate < existing.firstOrderDate) existing.firstOrderDate = orderDate;
      } else {
        customerData.set(customer, {
          totalValue: value,
          orderCount: 1,
          lastOrderDate: orderDate,
          firstOrderDate: orderDate,
        });
      }
    });

    const segments = {
      vip: [] as string[],
      regular: [] as string[],
      new: [] as string[],
      atRisk: [] as string[],
      churned: [] as string[],
    };

    customerData.forEach((data, customer) => {
      const daysSinceLastOrder = Math.floor((now.getTime() - data.lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysSinceFirstOrder = Math.floor((now.getTime() - data.firstOrderDate.getTime()) / (1000 * 60 * 60 * 24));
      const monthlyValue = data.totalValue / Math.max(1, daysSinceFirstOrder / 30);

      if (daysSinceLastOrder > 90) {
        segments.churned.push(customer);
      } else if (daysSinceLastOrder > 30) {
        segments.atRisk.push(customer);
      } else if (daysSinceFirstOrder <= 30) {
        segments.new.push(customer);
      } else if (monthlyValue > 100000) {
        segments.vip.push(customer);
      } else {
        segments.regular.push(customer);
      }
    });

    const totalCustomers = customerData.size;

    const calculateSegmentMetrics = (customerList: string[]): Omit<CustomerSegment, 'segment'> => {
      const totalValue = customerList.reduce((sum, customer) => {
        return sum + (customerData.get(customer)?.totalValue || 0);
      }, 0);

      const avgValue = customerList.length > 0 ? totalValue / customerList.length : 0;

      const avgLastOrderDays = customerList.length > 0
        ? customerList.reduce((sum, customer) => {
            const data = customerData.get(customer);
            if (!data) return sum;
            return sum + Math.floor((now.getTime() - data.lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
          }, 0) / customerList.length
        : 0;

      return {
        count: customerList.length,
        percentage: totalCustomers > 0 ? (customerList.length / totalCustomers) * 100 : 0,
        value: totalValue,
        avgOrderValue: avgValue,
        lastOrderDays: Math.round(avgLastOrderDays),
      };
    };

    return [
      { segment: 'vip' as const, ...calculateSegmentMetrics(segments.vip) },
      { segment: 'regular' as const, ...calculateSegmentMetrics(segments.regular) },
      { segment: 'new' as const, ...calculateSegmentMetrics(segments.new) },
      { segment: 'atRisk' as const, ...calculateSegmentMetrics(segments.atRisk) },
      { segment: 'churned' as const, ...calculateSegmentMetrics(segments.churned) },
    ];
  }, [exportData]);

  // Generate smart insights
  const smartInsights = useMemo((): SmartInsight[] => {
    const insights: SmartInsight[] = [];

    // Revenue trend insight
    if (Math.abs(heroMetrics.revenueChange) > 20) {
      insights.push({
        type: 'trend',
        severity: heroMetrics.revenueChange > 0 ? 'success' : 'warning',
        title: heroMetrics.revenueChange > 0 ? 'ยอดขายเติบโตแรง' : 'ยอดขายชะลอตัว',
        description: `ยอดขาย${heroMetrics.revenueChange > 0 ? 'เพิ่มขึ้น' : 'ลดลง'} ${Math.abs(heroMetrics.revenueChange)}% เมื่อเทียบกับช่วงก่อนหน้า`,
        action: 'view_revenue_details',
        actionLabel: 'ดูรายละเอียด',
      });
    }

    // At-risk customers insight
    const atRiskCount = customerSegments.find(s => s.segment === 'atRisk')?.count || 0;
    if (atRiskCount > 0) {
      insights.push({
        type: 'anomaly',
        severity: atRiskCount > 5 ? 'critical' : 'warning',
        title: 'ลูกค้าเสี่ยงหายต้องติดตาม',
        description: `มีลูกค้า ${atRiskCount} รายที่ไม่ได้สั่งซื้อมากกว่า 30 วัน ควรติดต่อเพื่อรักษาฐานลูกค้า`,
        action: 'view_at_risk_customers',
        actionLabel: 'ดูรายชื่อลูกค้า',
      });
    }

    // New customers insight
    const newCount = customerSegments.find(s => s.segment === 'new')?.count || 0;
    if (newCount > 0) {
      insights.push({
        type: 'achievement',
        severity: 'success',
        title: 'มีลูกค้าใหม่เข้ามา',
        description: `ได้รับลูกค้าใหม่ ${newCount} ราย ในเดือนนี้ ควรดูแลเป็นพิเศษเพื่อรักษาความสัมพันธ์`,
        action: 'view_new_customers',
        actionLabel: 'ดูลูกค้าใหม่',
      });
    }

    // VIP customer insight
    const vipCount = customerSegments.find(s => s.segment === 'vip')?.count || 0;
    const vipValue = customerSegments.find(s => s.segment === 'vip')?.value || 0;
    const totalValue = heroMetrics.totalRevenue;
    const vipPercentage = totalValue > 0 ? (vipValue / totalValue) * 100 : 0;

    if (vipPercentage > 50) {
      insights.push({
        type: 'recommendation',
        severity: 'info',
        title: 'ลูกค้า VIP สร้างรายได้หลัก',
        description: `ลูกค้า VIP ${vipCount} ราย สร้างรายได้ ${vipPercentage.toFixed(0)}% ของยอดขายทั้งหมด ควรมีโปรแกรมพิเศษดูแล`,
        action: 'view_vip_program',
        actionLabel: 'ดูแผน VIP',
      });
    }

    // Top product insight
    const productSales = new Map<string, number>();
    exportData.forEach(item => {
      const current = productSales.get(item.product_name) || 0;
      productSales.set(item.product_name, current + item.quantity_exported);
    });

    const topProducts = Array.from(productSales.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (topProducts.length > 0) {
      const topProductName = topProducts[0][0];
      const topProductQty = topProducts[0][1];
      const totalQty = heroMetrics.totalItems;
      const topProductPercentage = (topProductQty / totalQty) * 100;

      insights.push({
        type: 'trend',
        severity: 'info',
        title: `สินค้าขายดี: ${topProductName}`,
        description: `ขายได้ ${topProductQty.toLocaleString()} ชิ้น (${topProductPercentage.toFixed(0)}% ของยอดขายทั้งหมด)`,
        action: 'view_product_details',
        actionLabel: 'ดูสินค้า',
      });
    }

    return insights;
  }, [exportData, heroMetrics, customerSegments]);

  const handleSegmentClick = (segment: string) => {
    toast({
      title: 'กำลังกรองข้อมูล',
      description: `แสดงข้อมูลลูกค้ากลุ่ม: ${segment}`,
    });
    // TODO: Implement segment filtering
  };

  const dateFilterButtons: { value: DateFilter; label: string }[] = [
    { value: 'today', label: 'วันนี้' },
    { value: '7days', label: '7 วัน' },
    { value: '30days', label: '30 วัน' },
    { value: '90days', label: '90 วัน' },
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">🎯 Executive Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            วิเคราะห์เชิงลึกและภาพรวมธุรกิจ
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {dateFilterButtons.map((btn) => (
            <Button
              key={btn.value}
              variant={dateFilter === btn.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateFilter(btn.value)}
            >
              <Calendar className="h-4 w-4 mr-1" />
              {btn.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Customer Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">กรองตามลูกค้า:</span>
            </div>
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="เลือกลูกค้า" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด ({customerOptions.length} ราย)</SelectItem>
                {customerOptions.map((customer) => (
                  <SelectItem key={customer.name} value={customer.name}>
                    {customer.name} ({customer.count} ครั้ง)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={loadExportData}
              className="ml-auto"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              รีเฟรช
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Hero Metrics */}
      <HeroMetrics {...heroMetrics} />

      {/* Main Content Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">ภาพรวม</TabsTrigger>
          <TabsTrigger value="segments">กลุ่มลูกค้า</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="calendar">📅 ปฏิทิน</TabsTrigger>
          <TabsTrigger value="comparison">เปรียบเทียบ</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <CustomerSegmentation
              segments={customerSegments}
              onSegmentClick={handleSegmentClick}
            />
            <SmartInsights insights={smartInsights} />
          </div>
        </TabsContent>

        <TabsContent value="segments" className="space-y-4">
          <CustomerSegmentation
            segments={customerSegments}
            onSegmentClick={handleSegmentClick}
          />
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <SmartInsights insights={smartInsights} />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <HeatmapCalendar
            data={exportData}
            monthsToShow={3}
            onDayClick={(date) => {
              toast({
                title: 'เลือกวันที่',
                description: format(date, 'd MMMM yyyy', { locale: th }),
              });
            }}
          />
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>🔄 เปรียบเทียบช่วงเวลา</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                ฟีเจอร์กำลังพัฒนา - จะแสดงการเปรียบเทียบข้อมูลแบบ side-by-side
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
