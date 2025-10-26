const SALES_API_BASE = import.meta.env.VITE_SALES_API_URL || '/api';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  Calendar,
  RefreshCw,
  User,
  Package,
  BarChart3,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Box
} from 'lucide-react';
import {
  useSalesOrders,
  useSalesOrderDetail
} from '@/hooks/useSalesData';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select';
import { ProductForecast } from './ProductForecast';
import { ProductForecastPrediction } from './ProductForecastPrediction';

// Fetch สินค้าทั้งหมดและ order details พร้อมกัน
const fetchProductsAndDetails = async (orders: any[]): Promise<{
  products: { code: string; name: string }[];
  orderDetails: Map<string, any[]>;
}> => {
  const products = new Map<string, string>();
  const orderDetails = new Map<string, any[]>();

  // จำกัดจำนวน concurrent requests เพื่อไม่ให้ล้น server
  const batchSize = 10;
  for (let i = 0; i < orders.length; i += batchSize) {
    const batch = orders.slice(i, i + batchSize);
    const promises = batch.map(async (order) => {
      try {
        const res = await fetch(`${SALES_API_BASE}/sales/${order.docno}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.data?.items) {
          // เก็บ items ไว้ใน cache
          orderDetails.set(order.docno, data.data.items);

          // สร้างรายการสินค้า
          data.data.items.forEach((item: any) => {
            const code = item.productcode || item.PRODUCTCODE;
            const name = item.productname || item.PRODUCTNAME;
            if (code) {
              products.set(code, name || code);
            }
          });
        }
      } catch (error) {
        console.error(`Failed to fetch details for ${order.docno}:`, error);
      }
    });
    await Promise.all(promises);
  }

  return {
    products: Array.from(products.entries()).map(([code, name]) => ({ code, name })),
    orderDetails
  };
};

export function FinanceDashboard() {
  const { toast } = useToast();

  // Date filters
  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedDocno, setSelectedDocno] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [orderDetailsCache, setOrderDetailsCache] = useState<Map<string, any[]>>(new Map());
  const pageSize = 20;

  // Fetch data based on filters
  const {
    data: allSales,
    isLoading: salesLoading,
    error: salesError,
    refetch
  } = useSalesOrders({
    startDate,
    endDate,
    limit: 5000 // ดึงข้อมูลสูงสุด 5000 รายการตามที่ Backend กำหนด
  });

  const { data: orderDetail, isLoading: detailLoading } = useSalesOrderDetail(selectedDocno);

  // Fetch products และ order details พร้อมกัน (รอให้ allSales โหลดเสร็จก่อน)
  const { data: productData, isLoading: productsLoading } = useQuery({
    queryKey: ['products-finance', startDate, endDate],
    queryFn: async () => {
      const result = await fetchProductsAndDetails(allSales || []);
      setOrderDetailsCache(result.orderDetails);
      return result;
    },
    enabled: !!allSales && allSales.length > 0,
    staleTime: 300000 // 5 minutes
  });

  const productsData = productData?.products || [];

  // Customer options from actual data
  const customerOptions: MultiSelectOption[] = useMemo(() => {
    if (!allSales) return [];

    const customers = new Map<string, string>();
    allSales.forEach(sale => {
      if (sale.arcode && sale.arname) {
        customers.set(sale.arcode, sale.arname);
      }
    });

    return Array.from(customers.entries())
      .map(([code, name]) => ({
        value: code,
        label: name,
        description: code
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [allSales]);

  // Product options
  const productOptions: MultiSelectOption[] = useMemo(() => {
    return productsData.map((p: any) => ({
      value: p.code,
      label: p.name || p.code,
      description: p.code
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [productsData]);

  // Filter by selections
  const filteredSales = useMemo(() => {
    console.log('🔍 Filtering sales...', {
      allSalesCount: allSales?.length || 0,
      selectedCustomersCount: selectedCustomers.length,
      selectedProductsCount: selectedProducts.length,
      cacheSize: orderDetailsCache.size,
    });

    if (!allSales) {
      console.log('⚠️ allSales is null/undefined');
      return [];
    }

    let filtered = allSales;

    // Filter by customer
    if (selectedCustomers.length > 0) {
      filtered = filtered.filter(sale =>
        sale.arcode && selectedCustomers.includes(sale.arcode)
      );
      console.log(`📊 After customer filter: ${filtered.length} orders`);
    }

    // Filter by product (ใช้ orderDetailsCache)
    if (selectedProducts.length > 0 && orderDetailsCache.size > 0) {
      const beforeProductFilter = filtered.length;
      filtered = filtered.filter(sale => {
        const items = orderDetailsCache.get(sale.docno);
        if (!items) return false;

        // ตรวจสอบว่า order มีสินค้าที่เลือกไว้หรือไม่
        return items.some(item => {
          const code = item.productcode || item.PRODUCTCODE;
          return selectedProducts.includes(code);
        });
      });
      console.log(`📦 After product filter: ${filtered.length} orders (from ${beforeProductFilter})`);
    } else if (selectedProducts.length > 0) {
      console.warn('⚠️ Product filter selected but cache is empty!');
    }

    console.log(`✅ Final filtered sales: ${filtered.length} orders`);
    return filtered;
  }, [allSales, selectedCustomers, selectedProducts, orderDetailsCache]);

  // Product analysis from filtered sales
  const productStats = useMemo(() => {
    const stats = new Map<string, { name: string, qty: number, amount: number, orders: Set<string> }>();

    filteredSales.forEach(order => {
      const items = orderDetailsCache.get(order.docno);
      if (!items) return;

      items.forEach(item => {
        const code = item.productcode || item.PRODUCTCODE;
        const name = item.productname || item.PRODUCTNAME || code;
        const qty = Number(item.quantity) || 0;
        const amount = Number(item.netamount) || 0;

        if (!stats.has(code)) {
          stats.set(code, { name, qty: 0, amount: 0, orders: new Set() });
        }

        const stat = stats.get(code)!;
        stat.qty += qty;
        stat.amount += amount;
        stat.orders.add(order.docno);
      });
    });

    return Array.from(stats.entries())
      .map(([code, stat]) => ({
        code,
        name: stat.name,
        qty: stat.qty,
        amount: stat.amount,
        orders: stat.orders.size
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [filteredSales, orderDetailsCache]);

  // Top Customers จาก filteredSales
  const topCustomers = useMemo(() => {
    const customerMap = new Map<string, { arcode: string; arname: string; totalAmount: number; orderCount: number }>();

    filteredSales.forEach(order => {
      const arcode = order.arcode || 'UNKNOWN';
      const arname = order.arname || 'ไม่ระบุชื่อ';
      const amount = order.totalamount || 0;

      if (customerMap.has(arcode)) {
        const existing = customerMap.get(arcode)!;
        existing.totalAmount += amount;
        existing.orderCount += 1;
      } else {
        customerMap.set(arcode, {
          arcode,
          arname,
          totalAmount: amount,
          orderCount: 1,
        });
      }
    });

    return Array.from(customerMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10);
  }, [filteredSales]);

  // Daily Sales Chart จาก filteredSales
  const chartData = useMemo(() => {
    const groupedByDate = new Map<string, { totalAmount: number; orderCount: number }>();

    filteredSales.forEach(order => {
      if (!order.docdate) return;

      const date = order.docdate.split('T')[0];
      const amount = order.totalamount || 0;

      if (groupedByDate.has(date)) {
        const existing = groupedByDate.get(date)!;
        existing.totalAmount += amount;
        existing.orderCount += 1;
      } else {
        groupedByDate.set(date, {
          totalAmount: amount,
          orderCount: 1,
        });
      }
    });

    return Array.from(groupedByDate.entries())
      .map(([date, data]) => ({
        date,
        totalAmount: data.totalAmount,
        orderCount: data.orderCount,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredSales]);

  // Calculate stats from filtered sales (ไม่ใช้ useSalesStats เพราะไม่ได้กรองตามฟิลเตอร์)
  const filteredStats = useMemo(() => {
    console.log('🔄 Calculating filteredStats...', {
      filteredSalesCount: filteredSales.length,
      cacheSize: orderDetailsCache.size,
      selectedCustomers: selectedCustomers.length,
      selectedProducts: selectedProducts.length,
    });

    if (filteredSales.length === 0) {
      console.log('⚠️ No filtered sales, returning zero stats');
      return {
        totalSales: 0,
        avgSale: 0,
        uniqueCustomers: 0,
        uniqueProducts: 0,
        orderCount: 0
      };
    }

    const totalSales = filteredSales.reduce((sum, sale) => sum + (Number(sale.totalamount) || 0), 0);
    const avgSale = totalSales / filteredSales.length;
    const uniqueCustomers = new Set(filteredSales.map(s => s.arcode)).size;

    // นับสินค้าที่ไม่ซ้ำจาก orderDetailsCache
    const productsSet = new Set<string>();
    filteredSales.forEach(sale => {
      const items = orderDetailsCache.get(sale.docno);
      if (items) {
        items.forEach(item => {
          const code = item.productcode || item.PRODUCTCODE;
          if (code) productsSet.add(code);
        });
      }
    });

    const stats = {
      totalSales,
      avgSale,
      uniqueCustomers,
      uniqueProducts: productsSet.size,
      orderCount: filteredSales.length
    };

    console.log('✅ filteredStats calculated:', stats);
    return stats;
  }, [filteredSales, orderDetailsCache, selectedCustomers, selectedProducts]);

  // Pagination
  const totalPages = Math.ceil(filteredSales.length / pageSize);
  const paginatedSales = filteredSales.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  // Format functions
  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '฿0.00';
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('th-TH', {
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('th-TH').format(num);
  };

  // Quick date filters
  const setQuickFilter = (type: 'today' | 'week' | 'month' | 'lastMonth' | '90days') => {
    const end = new Date();
    const start = new Date();

    switch (type) {
      case 'today':
        start.setDate(end.getDate());
        break;
      case 'week':
        start.setDate(end.getDate() - 7);
        break;
      case 'month':
        start.setDate(1);
        break;
      case 'lastMonth':
        start.setMonth(end.getMonth() - 1);
        start.setDate(1);
        end.setDate(0);
        break;
      case '90days':
        start.setDate(end.getDate() - 90);
        break;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setCurrentPage(0);
  };

  const handleClearFilters = () => {
    setStartDate(firstDayOfMonth);
    setEndDate(today);
    setSelectedCustomers([]);
    setSelectedProducts([]);
    setCurrentPage(0);
  };

  const handleRefresh = () => {
    refetch();
    toast({
      title: 'รีเฟรชข้อมูล',
      description: 'กำลังโหลดข้อมูลล่าสุด...',
    });
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-green-600" />
            Dashboard การเงิน
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            ภาพรวมยอดขายและการเงิน จาก CSSALE Database
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="lg">
          <RefreshCw className="h-4 w-4 mr-2" />
          รีเฟรช
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Sales Analytics
          </TabsTrigger>
          <TabsTrigger value="history">
            <FileText className="h-4 w-4 mr-2" />
            Sales History
          </TabsTrigger>
          <TabsTrigger value="prediction">
            <TrendingUp className="h-4 w-4 mr-2" />
            Forecast Prediction
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6 mt-6">

      {/* Filter Section - ปรับปรุงใหม่ */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50/50 to-cyan-50/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-600" />
            ตัวกรองและค้นหา
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter Summary and Clear Button */}
          {(selectedCustomers.length > 0 || selectedProducts.length > 0) && (
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-blue-900">
                  ฟิลเตอร์ที่เลือก:
                </span>
                {selectedCustomers.length > 0 && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                    <User className="h-3 w-3 mr-1" />
                    {selectedCustomers.length} ลูกค้า
                  </Badge>
                )}
                {selectedProducts.length > 0 && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                    <Package className="h-3 w-3 mr-1" />
                    {selectedProducts.length} สินค้า
                  </Badge>
                )}
              </div>
              <Button onClick={handleClearFilters} variant="destructive" size="sm">
                <X className="h-4 w-4 mr-1" />
                ล้างทั้งหมด
              </Button>
            </div>
          )}

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setQuickFilter('today')} variant="outline" size="sm">
              วันนี้
            </Button>
            <Button onClick={() => setQuickFilter('week')} variant="outline" size="sm">
              7 วันที่แล้ว
            </Button>
            <Button onClick={() => setQuickFilter('month')} variant="outline" size="sm">
              เดือนนี้
            </Button>
            <Button onClick={() => setQuickFilter('lastMonth')} variant="outline" size="sm">
              เดือนที่แล้ว
            </Button>
            <Button onClick={() => setQuickFilter('90days')} variant="outline" size="sm">
              90 วัน
            </Button>
          </div>

          {/* Detailed Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                วันที่เริ่มต้น
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(0);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                วันที่สิ้นสุด
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(0);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1">
                <User className="h-4 w-4" />
                ลูกค้า {selectedCustomers.length > 0 && `(${selectedCustomers.length})`}
              </Label>
              <MultiSelect
                options={customerOptions}
                selected={selectedCustomers}
                onChange={setSelectedCustomers}
                placeholder="เลือกลูกค้า..."
                searchPlaceholder="ค้นหาลูกค้า..."
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1">
                <Package className="h-4 w-4" />
                สินค้า {selectedProducts.length > 0 && `(${selectedProducts.length})`}
                {productsLoading && <RefreshCw className="h-3 w-3 animate-spin ml-1" />}
              </Label>
              <MultiSelect
                options={productOptions}
                selected={selectedProducts}
                onChange={setSelectedProducts}
                placeholder={productsLoading ? "กำลังโหลดสินค้า..." : "เลือกสินค้า..."}
                searchPlaceholder="ค้นหาสินค้า..."
                disabled={productsLoading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards - คำนวณจาก filteredSales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              ยอดขายรวม
            </CardTitle>
          </CardHeader>
          <CardContent>
            {salesLoading ? (
              <div className="space-y-2">
                <div className="h-9 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold text-green-700">
                  {formatCurrency(filteredStats.totalSales)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatNumber(filteredStats.orderCount)} ออเดอร์
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              ยอดขายเฉลี่ย
            </CardTitle>
          </CardHeader>
          <CardContent>
            {salesLoading ? (
              <div className="space-y-2">
                <div className="h-9 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold text-blue-700">
                  {formatCurrency(filteredStats.avgSale)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  ต่อออเดอร์
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              จำนวนลูกค้า
            </CardTitle>
          </CardHeader>
          <CardContent>
            {salesLoading ? (
              <div className="space-y-2">
                <div className="h-9 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold text-purple-700">
                  {formatNumber(filteredStats.uniqueCustomers)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  ลูกค้าที่ซื้อ
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-50 to-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Box className="h-4 w-4" />
              จำนวนสินค้า
            </CardTitle>
          </CardHeader>
          <CardContent>
            {productsLoading || salesLoading ? (
              <div className="space-y-2">
                <div className="h-9 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold text-orange-700">
                  {formatNumber(filteredStats.uniqueProducts)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  สินค้าที่ขาย
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Sales Chart - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            ยอดขายรายวัน
            {(selectedCustomers.length > 0 || selectedProducts.length > 0) && (
              <Badge variant="secondary" className="ml-2">กรองแล้ว</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {salesLoading ? (
            <div className="h-[400px] flex items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
              <BarChart3 className="h-16 w-16 mb-4 opacity-50" />
              <p>ไม่มีข้อมูลในช่วงเวลาที่เลือก</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tickFormatter={formatDateShort} tick={{ fontSize: 12 }} stroke="#6b7280" />
                <YAxis tickFormatter={(value) => `฿${(value / 1000).toFixed(0)}K`} tick={{ fontSize: 12 }} stroke="#6b7280" />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(value), 'ยอดขาย']}
                  labelFormatter={formatDate}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line
                  type="monotone"
                  dataKey="totalAmount"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  name="ยอดขาย (฿)"
                  dot={{ fill: '#3b82f6', r: 5, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top Customers & Top Products Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Customers - 1/3 width */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-purple-600" />
              Top 5 ลูกค้า
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCustomers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">ไม่มีข้อมูล</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topCustomers.slice(0, 5).map((customer, idx) => (
                  <div key={customer.arcode} className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <Badge className="shrink-0 mt-0.5" variant={idx === 0 ? 'default' : 'outline'}>
                      {idx + 1}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate leading-tight" title={customer.arname}>
                        {customer.arname}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <p className="text-xs font-semibold text-green-700">
                          {formatCurrency(customer.totalAmount)}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {customer.orderCount} orders
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products - 2/3 width */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4 text-blue-600" />
              Top 10 สินค้า
              {(selectedCustomers.length > 0 || selectedProducts.length > 0) && (
                <Badge variant="secondary" className="ml-2">กรองแล้ว</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {productStats.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">ไม่มีข้อมูลสินค้า</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {productStats.map((product, idx) => (
                  <div
                    key={product.code}
                    className="flex items-start gap-2 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <Badge className="shrink-0 mt-0.5" variant={idx < 3 ? 'default' : 'outline'}>
                      {idx + 1}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate leading-tight" title={product.name}>
                        {product.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{product.code}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-sm font-bold text-green-700">
                          {formatCurrency(product.amount)}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatNumber(product.qty)} ชิ้น · {product.orders} orders
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sales Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              รายการใบขาย ({formatNumber(filteredSales.length)} ใบ)
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                variant="outline"
                size="sm"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                หน้า {currentPage + 1} / {totalPages || 1}
              </span>
              <Button
                onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage >= totalPages - 1}
                variant="outline"
                size="sm"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่</TableHead>
                  <TableHead>เลขที่เอกสาร</TableHead>
                  <TableHead>ลูกค้า</TableHead>
                  <TableHead className="text-right">มูลค่า</TableHead>
                  <TableHead className="text-center">สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      กำลังโหลด...
                    </TableCell>
                  </TableRow>
                ) : paginatedSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      ไม่พบข้อมูล
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedSales.map((sale) => (
                    <TableRow
                      key={sale.docno}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedDocno(sale.docno)}
                    >
                      <TableCell>{formatDate(sale.docdate)}</TableCell>
                      <TableCell className="font-medium">{sale.docno}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sale.arname}</p>
                          <p className="text-xs text-muted-foreground">{sale.arcode}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-700">
                        {formatCurrency(sale.totalamount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="default">สำเร็จ</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedDocno} onOpenChange={() => setSelectedDocno(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              รายละเอียดใบขาย: {selectedDocno}
            </DialogTitle>
            <DialogDescription>
              ข้อมูลใบขายและรายการสินค้า
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="py-8 text-center">กำลังโหลด...</div>
          ) : orderDetail ? (
            <div className="space-y-4">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">วันที่</p>
                  <p className="font-medium">{formatDate(orderDetail.docdate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ลูกค้า</p>
                  <p className="font-medium">{orderDetail.arname}</p>
                  <p className="text-xs text-muted-foreground">{orderDetail.arcode}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tax Invoice</p>
                  <p className="font-medium">{orderDetail.taxno || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">มูลค่ารวม</p>
                  <p className="font-bold text-lg text-green-700">
                    {formatCurrency(orderDetail.totalamount)}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              {orderDetail.items && orderDetail.items.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Box className="h-4 w-4" />
                    รายการสินค้า ({orderDetail.items.length} รายการ)
                  </h4>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>รหัสสินค้า</TableHead>
                          <TableHead>ชื่อสินค้า</TableHead>
                          <TableHead className="text-right">จำนวน</TableHead>
                          <TableHead>หน่วย</TableHead>
                          <TableHead className="text-right">ราคา/หน่วย</TableHead>
                          <TableHead className="text-right">รวม</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderDetail.items.map((item: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-sm">
                              {item.productcode}
                            </TableCell>
                            <TableCell>{item.productname}</TableCell>
                            <TableCell className="text-right">
                              {formatNumber(item.quantity)}
                            </TableCell>
                            <TableCell>{item.unitname || '-'}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.unitprice)}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {formatCurrency(item.netamount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              ไม่พบข้อมูล
            </div>
          )}
        </DialogContent>
      </Dialog>
      </TabsContent>

      <TabsContent value="history" className="mt-6">
        <ProductForecast />
      </TabsContent>

      <TabsContent value="prediction" className="mt-6">
        <ProductForecastPrediction />
      </TabsContent>
      </Tabs>
    </div>
  );
}
