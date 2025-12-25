import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Package,
  ShoppingCart,
  RefreshCw,
  AlertCircle,
  Users,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  useSalesOrders,
  useProductList,
  useCustomerList,
  useProductComparisonAPI,
  useCustomerComparisonAPI,
  useSalesSummary,
  ProductListItem,
  CustomerListItem
} from '@/hooks/useSalesData';
import { AIInsightsPanel, AIChatBox } from '@/components/ai-insights';

// ฟังก์ชัน format ตัวเลข
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('th-TH').format(value);
};

const formatPercent = (value: number) => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
};

// Growth Badge Component
interface GrowthBadgeProps {
  value: number;
}

const GrowthBadge = ({ value }: GrowthBadgeProps) => {
  const isPositive = value >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isPositive ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300';

  return (
    <Badge variant="outline" className={`${colorClass} flex items-center gap-1 px-2 py-0.5`}>
      <Icon className="h-3 w-3" />
      <span className="font-semibold text-xs">{formatPercent(value)}</span>
    </Badge>
  );
};

export function SalesAnalytics() {
  // Date Range State - ใช้ร่วมกันทั้งหน้า
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const [tempDateRange, setTempDateRange] = useState(dateRange);

  // Product & Customer Analysis State
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [productComparisonType, setProductComparisonType] = useState<'month' | 'year'>('month');
  const [customerComparisonType, setCustomerComparisonType] = useState<'month' | 'year'>('month');

  // Collapsible state
  const [isProductAnalysisOpen, setIsProductAnalysisOpen] = useState(false);
  const [isCustomerAnalysisOpen, setIsCustomerAnalysisOpen] = useState(false);

  // Fetch data
  const { data: salesData, isLoading: salesLoading } = useSalesOrders({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    limit: 5000
  });

  const { data: products, isLoading: productsLoading } = useProductList(
    dateRange.startDate,
    dateRange.endDate
  );

  const { data: customers, isLoading: customersLoading } = useCustomerList(
    dateRange.startDate,
    dateRange.endDate
  );

  const { data: salesSummary, isLoading: summaryLoading } = useSalesSummary(
    dateRange.startDate,
    dateRange.endDate
  );

  // Calculate date ranges for comparison
  const getComparisonDates = (type: 'month' | 'year') => {
    const currentEnd = new Date(dateRange.endDate);
    const currentStart = new Date(dateRange.startDate);
    const daysDiff = Math.ceil((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24));

    if (type === 'month') {
      const prevEnd = new Date(currentStart);
      prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - daysDiff);
      return {
        currentStart: currentStart.toISOString().split('T')[0],
        currentEnd: currentEnd.toISOString().split('T')[0],
        previousStart: prevStart.toISOString().split('T')[0],
        previousEnd: prevEnd.toISOString().split('T')[0]
      };
    } else {
      const prevStart = new Date(currentStart);
      prevStart.setFullYear(prevStart.getFullYear() - 1);
      const prevEnd = new Date(currentEnd);
      prevEnd.setFullYear(prevEnd.getFullYear() - 1);
      return {
        currentStart: currentStart.toISOString().split('T')[0],
        currentEnd: currentEnd.toISOString().split('T')[0],
        previousStart: prevStart.toISOString().split('T')[0],
        previousEnd: prevEnd.toISOString().split('T')[0]
      };
    }
  };

  // Product comparison data
  const productDates = useMemo(() => getComparisonDates(productComparisonType), [dateRange, productComparisonType]);
  const productComparison = useProductComparisonAPI(
    selectedProduct,
    productDates.currentStart,
    productDates.currentEnd,
    productDates.previousStart,
    productDates.previousEnd
  );

  // Customer comparison data
  const customerDates = useMemo(() => getComparisonDates(customerComparisonType), [dateRange, customerComparisonType]);
  const customerComparison = useCustomerComparisonAPI(
    selectedCustomer,
    customerDates.currentStart,
    customerDates.currentEnd,
    customerDates.previousStart,
    customerDates.previousEnd
  );

  // Calculate daily sales for chart
  const dailySalesData = useMemo(() => {
    if (!salesData) return [];

    const dailyMap = new Map<string, number>();
    salesData.forEach(sale => {
      if (!sale.docdate) return;
      const date = sale.docdate.split('T')[0];
      const amount = sale.totalamount || 0;
      dailyMap.set(date, (dailyMap.get(date) || 0) + amount);
    });

    return Array.from(dailyMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [salesData]);

  // Top products
  const topProducts = useMemo(() => {
    if (!products) return [];
    return products.slice(0, 5);
  }, [products]);

  // Top customers
  const topCustomers = useMemo(() => {
    if (!customers) return [];
    return customers.slice(0, 5);
  }, [customers]);

  // Handle date filter apply
  const handleApplyFilter = () => {
    setDateRange(tempDateRange);
    // Reset selections when date changes
    setSelectedProduct(null);
    setSelectedCustomer(null);
  };

  // Product comparison chart data
  const productChartData = useMemo(() => {
    if (!productComparison.data?.dailyComparison) return [];
    return productComparison.data.dailyComparison.map(day => ({
      date: formatDate(day.date),
      ปัจจุบัน: day.current,
      'ช่วงก่อนหน้า': day.previous
    }));
  }, [productComparison.data]);

  // Customer comparison chart data
  const customerChartData = useMemo(() => {
    if (!customerComparison.data?.dailyComparison) return [];
    return customerComparison.data.dailyComparison.map(day => ({
      date: formatDate(day.date),
      ปัจจุบัน: day.current,
      'ช่วงก่อนหน้า': day.previous
    }));
  }, [customerComparison.data]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">📊 วิเคราะห์การขาย - Dashboard</h2>
        <p className="text-gray-600 mt-1">ดูข้อมูลทั้งหมดในหน้าเดียว ไม่ต้องกดเปลี่ยน Tab</p>
      </div>

      {/* Date Range Filter - ใช้ร่วมกันทั้งหน้า */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Filter className="h-5 w-5" />
            เลือกช่วงเวลาสำหรับวิเคราะห์ทั้งหมด
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <Label htmlFor="startDate" className="text-blue-900">วันที่เริ่มต้น</Label>
              <Input
                id="startDate"
                type="date"
                value={tempDateRange.startDate}
                onChange={(e) => setTempDateRange({ ...tempDateRange, startDate: e.target.value })}
                className="border-blue-300"
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="text-blue-900">วันที่สิ้นสุด</Label>
              <Input
                id="endDate"
                type="date"
                value={tempDateRange.endDate}
                onChange={(e) => setTempDateRange({ ...tempDateRange, endDate: e.target.value })}
                className="border-blue-300"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleApplyFilter} className="w-full bg-blue-600 hover:bg-blue-700">
                <Filter className="h-4 w-4 mr-2" />
                ค้นหา
              </Button>
            </div>
          </div>
          {dateRange.startDate && dateRange.endDate && (
            <div className="mt-4 p-3 bg-white border border-blue-300 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>ช่วงเวลาที่เลือก:</strong> {formatDate(dateRange.startDate)} ถึง {formatDate(dateRange.endDate)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sales Summary - SA vs CN vs Net */}
      <Card className="border-2 border-green-300 bg-gradient-to-br from-green-50 via-white to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            <DollarSign className="h-6 w-6" />
            💰 สรุปยอดขาย (SA vs CN)
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">แยกยอดขาย, ยอดลดหนี้, และยอดสุทธิ</p>
        </CardHeader>
        <CardContent>
          {summaryLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          ) : salesSummary ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {/* Sales Amount (SA) */}
              <div className="p-4 border-2 border-green-300 rounded-lg bg-white">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">ยอดขาย (SA)</p>
                  <Badge className="bg-green-100 text-green-800 border-green-300">
                    {salesSummary.sales.docType}
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-green-700 mb-1">
                  {formatCurrency(salesSummary.sales.amount)}
                </p>
                <p className="text-xs text-gray-500">
                  จำนวน {formatNumber(salesSummary.sales.count)} เอกสาร
                </p>
              </div>

              {/* Credit Note (CN) */}
              <div className="p-4 border-2 border-red-300 rounded-lg bg-white">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">ยอดลดหนี้ (CN)</p>
                  <Badge className="bg-red-100 text-red-800 border-red-300">
                    {salesSummary.creditNote.docType}
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-red-700 mb-1">
                  -{formatCurrency(salesSummary.creditNote.amount)}
                </p>
                <p className="text-xs text-gray-500">
                  จำนวน {formatNumber(salesSummary.creditNote.count)} เอกสาร
                </p>
              </div>

              {/* Net Sales */}
              <div className="p-4 border-2 border-blue-400 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">ยอดสุทธิ (Net)</p>
                  <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                    SA - CN
                  </Badge>
                </div>
                <p className="text-3xl font-bold text-blue-900 mb-1">
                  {formatCurrency(salesSummary.net.amount)}
                </p>
                <p className="text-xs text-gray-500">
                  CN คิดเป็น {salesSummary.net.percentage.toFixed(2)}% ของยอดขาย
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>ไม่สามารถโหลดข้อมูลสรุปยอดขายได้</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards - ใช้ข้อมูลจาก Sales Summary แทน */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              ยอดขายรวม
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
            ) : (
              <p className="text-3xl font-bold text-green-700">
                {formatCurrency(salesSummary?.sales.amount || 0)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-blue-600" />
              จำนวนออเดอร์ทั้งหมด
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
            ) : (
              <p className="text-3xl font-bold text-blue-700">
                {formatNumber(salesSummary?.net.count || 0)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-600" />
              ยอดเฉลี่ยต่อออเดอร์
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
            ) : (
              <p className="text-3xl font-bold text-purple-700">
                {formatCurrency(salesSummary ? (salesSummary.net.amount / salesSummary.net.count) : 0)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 bg-gradient-to-br from-red-50 to-rose-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              % ลดหนี้
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
            ) : (
              <p className="text-3xl font-bold text-red-700">
                {salesSummary ? `${salesSummary.net.percentage.toFixed(2)}%` : '0.00%'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Insights Panel */}
      <AIInsightsPanel
        salesData={dailySalesData}
        currentProducts={products?.map(p => ({
          productCode: p.productCode,
          productName: p.productName,
          totalSales: p.totalSales,
          totalQuantity: p.totalQuantity,
          orderCount: 0
        })) || []}
        previousProducts={[]} // TODO: fetch previous period data
        currentCustomers={customers?.map(c => ({
          arcode: c.arcode,
          arname: c.arname,
          totalPurchases: c.totalPurchases,
          orderCount: c.orderCount
        })) || []}
        previousCustomers={[]} // TODO: fetch previous period data
        totalSales={salesSummary?.sales.amount || 0}
        orderCount={salesSummary?.net.count || 0}
        isLoading={salesLoading || productsLoading || customersLoading}
      />

      {/* AI Chat Assistant */}
      <AIChatBox
        context={{
          totalSales: salesSummary?.sales.amount || 0,
          orderCount: salesSummary?.net.count || 0,
          topProducts: products?.slice(0, 20).map(p => ({
            productCode: p.productCode,
            productName: p.productName,
            totalSales: p.totalSales,
            totalQuantity: p.totalQuantity
          })) || [],
          topCustomers: customers?.slice(0, 20).map(c => ({
            arcode: c.arcode,
            arname: c.arname,
            totalPurchases: c.totalPurchases,
            orderCount: c.orderCount
          })) || [],
          dailySales: dailySalesData,
          dateRange: {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate
          },
          trend: dailySalesData.length > 1 ? {
            direction: dailySalesData[dailySalesData.length - 1]?.amount > dailySalesData[0]?.amount ? 'up' : 'down',
            percentChange: dailySalesData[0]?.amount > 0
              ? ((dailySalesData[dailySalesData.length - 1]?.amount - dailySalesData[0]?.amount) / dailySalesData[0]?.amount) * 100
              : 0
          } : undefined
        }}
        isLoading={salesLoading || productsLoading || customersLoading}
      />

      {/* Sales Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            กราฟยอดขายรายวัน
          </CardTitle>
        </CardHeader>
        <CardContent>
          {salesLoading ? (
            <div className="h-[400px] flex items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : dailySalesData.length === 0 ? (
            <div className="h-[400px] flex items-center justify-center text-gray-500">
              <p>ไม่มีข้อมูลในช่วงเวลาที่เลือก</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={dailySalesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 12 }} stroke="#6b7280" />
                <YAxis tickFormatter={(value) => `฿${(value / 1000).toFixed(0)}K`} tick={{ fontSize: 12 }} stroke="#6b7280" />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(value), 'ยอดขาย']}
                  labelFormatter={formatDate}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="amount" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top Products & Top Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              🏆 Top 5 สินค้า
            </CardTitle>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            ) : topProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>ไม่มีข้อมูลสินค้า</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topProducts.map((product, idx) => (
                  <div key={`${product.productCode}-${idx}`} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Badge variant={idx === 0 ? 'default' : 'outline'} className={idx === 0 ? 'bg-yellow-500' : ''}>
                        #{idx + 1}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate" title={product.productName}>
                          {product.productName}
                        </p>
                        <p className="text-xs text-gray-500">{product.productCode}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="font-semibold text-green-700">{formatCurrency(product.totalSales)}</p>
                      <p className="text-xs text-gray-500">{formatNumber(product.totalQuantity)} ชิ้น</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              🏆 Top 5 ลูกค้า
            </CardTitle>
          </CardHeader>
          <CardContent>
            {customersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            ) : topCustomers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>ไม่มีข้อมูลลูกค้า</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topCustomers.map((customer, idx) => (
                  <div key={`${customer.arcode}-${idx}`} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Badge variant={idx === 0 ? 'default' : 'outline'} className={idx === 0 ? 'bg-yellow-500' : ''}>
                        #{idx + 1}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate" title={customer.arname}>
                          {customer.arname}
                        </p>
                        <p className="text-xs text-gray-500">{customer.arcode}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="font-semibold text-green-700">{formatCurrency(customer.totalPurchases)}</p>
                      <p className="text-xs text-gray-500">{formatNumber(customer.orderCount)} ออเดอร์</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Product Analysis - Collapsible */}
      <Collapsible open={isProductAnalysisOpen} onOpenChange={setIsProductAnalysisOpen}>
        <Card className="border-2 border-blue-200">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  🔍 วิเคราะห์เชิงลึกตามสินค้า
                </span>
                {isProductAnalysisOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Product Selector */}
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                <div>
                  <Label>เลือกสินค้า</Label>
                  <Select value={selectedProduct || ''} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="กรุณาเลือกสินค้า..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map((product, index) => (
                        <SelectItem key={`${product.productCode}-${index}`} value={product.productCode}>
                          {product.productCode} - {product.productName} ({formatCurrency(product.totalSales)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>ประเภทการเปรียบเทียบ</Label>
                  <Select value={productComparisonType} onValueChange={(v) => setProductComparisonType(v as 'month' | 'year')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">เปรียบเทียบรายเดือน</SelectItem>
                      <SelectItem value="year">เปรียบเทียบรายปี</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedProduct && productComparison.data && (
                <>
                  {/* Product Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-gray-600">ยอดขาย</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xl font-bold text-gray-900">
                          {formatCurrency(productComparison.data.current.totalSales || 0)}
                        </p>
                        <GrowthBadge value={productComparison.data.growth.salesGrowth} />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-gray-600">จำนวนชิ้น</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xl font-bold text-gray-900">
                          {formatNumber(productComparison.data.current.totalQuantity)}
                        </p>
                        <GrowthBadge value={productComparison.data.growth.quantityGrowth} />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-gray-600">จำนวนออเดอร์</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xl font-bold text-gray-900">
                          {formatNumber(productComparison.data.current.orderCount)}
                        </p>
                        <GrowthBadge value={productComparison.data.growth.orderGrowth} />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-gray-600">ราคาเฉลี่ย</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xl font-bold text-gray-900">
                          {formatCurrency(productComparison.data.current.avgOrderValue)}
                        </p>
                        <GrowthBadge value={productComparison.data.growth.avgValueGrowth} />
                      </CardContent>
                    </Card>
                  </div>

                  {/* Product Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>กราฟยอดขายสินค้า</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={productChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Legend />
                          <Line type="monotone" dataKey="ปัจจุบัน" stroke="#3b82f6" strokeWidth={2} />
                          <Line type="monotone" dataKey="ช่วงก่อนหน้า" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Customer Analysis - Collapsible */}
      <Collapsible open={isCustomerAnalysisOpen} onOpenChange={setIsCustomerAnalysisOpen}>
        <Card className="border-2 border-purple-200">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  🔍 วิเคราะห์เชิงลึกตามลูกค้า
                </span>
                {isCustomerAnalysisOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Customer Selector */}
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                <div>
                  <Label>เลือกลูกค้า</Label>
                  <Select value={selectedCustomer || ''} onValueChange={setSelectedCustomer}>
                    <SelectTrigger>
                      <SelectValue placeholder="กรุณาเลือกลูกค้า..." />
                    </SelectTrigger>
                    <SelectContent>
                      {customers?.map((customer, index) => (
                        <SelectItem key={`${customer.arcode}-${index}`} value={customer.arcode}>
                          {customer.arcode} - {customer.arname} ({formatCurrency(customer.totalPurchases)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>ประเภทการเปรียบเทียบ</Label>
                  <Select value={customerComparisonType} onValueChange={(v) => setCustomerComparisonType(v as 'month' | 'year')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">เปรียบเทียบรายเดือน</SelectItem>
                      <SelectItem value="year">เปรียบเทียบรายปี</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedCustomer && customerComparison.data && (
                <>
                  {/* Customer Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-gray-600">ยอดซื้อ</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xl font-bold text-gray-900">
                          {formatCurrency(customerComparison.data.current.totalPurchases || 0)}
                        </p>
                        <GrowthBadge value={customerComparison.data.growth.purchasesGrowth} />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-gray-600">จำนวนชิ้น</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xl font-bold text-gray-900">
                          {formatNumber(customerComparison.data.current.totalQuantity)}
                        </p>
                        <GrowthBadge value={customerComparison.data.growth.quantityGrowth} />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-gray-600">จำนวนออเดอร์</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xl font-bold text-gray-900">
                          {formatNumber(customerComparison.data.current.orderCount)}
                        </p>
                        <GrowthBadge value={customerComparison.data.growth.orderGrowth} />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-gray-600">ราคาเฉลี่ย/ออเดอร์</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xl font-bold text-gray-900">
                          {formatCurrency(customerComparison.data.current.avgOrderValue)}
                        </p>
                        <GrowthBadge value={customerComparison.data.growth.avgValueGrowth} />
                      </CardContent>
                    </Card>
                  </div>

                  {/* Customer Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>กราฟยอดซื้อลูกค้า</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={customerChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Legend />
                          <Line type="monotone" dataKey="ปัจจุบัน" stroke="#3b82f6" strokeWidth={2} />
                          <Line type="monotone" dataKey="ช่วงก่อนหน้า" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
