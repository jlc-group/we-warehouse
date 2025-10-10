import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  Calendar,
  AlertCircle,
  RefreshCw,
  User,
  Package,
  BarChart3,
  Search,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  useSalesOrders,
  useSalesStats,
  useDailySalesChart,
  useTopCustomers,
  useSalesOrderDetail
} from '@/hooks/useSalesData';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function FinanceDashboard() {
  const { toast } = useToast();

  // Date filters
  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedDocno, setSelectedDocno] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20;

  // Fetch data based on filters
  const { stats, isLoading: statsLoading } = useSalesStats({
    startDate,
    endDate,
  });

  const { data: chartData, isLoading: chartLoading } = useDailySalesChart(startDate, endDate);

  const { data: topCustomers, isLoading: topLoading } = useTopCustomers(startDate, endDate, 5);

  const {
    data: allSales,
    isLoading: salesLoading,
    error: salesError,
    refetch
  } = useSalesOrders({ startDate, endDate });

  const { data: orderDetail, isLoading: detailLoading } = useSalesOrderDetail(selectedDocno);

  // Filter by customer search
  const filteredSales = useMemo(() => {
    if (!allSales) return [];
    if (!customerSearch) return allSales;

    const searchLower = customerSearch.toLowerCase();
    return allSales.filter(sale =>
      sale.arname?.toLowerCase().includes(searchLower) ||
      sale.arcode?.toLowerCase().includes(searchLower) ||
      sale.docno?.toLowerCase().includes(searchLower) ||
      sale.taxno?.toLowerCase().includes(searchLower)
    );
  }, [allSales, customerSearch]);

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
        end.setDate(0); // Last day of previous month
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
    setCustomerSearch('');
    setCurrentPage(0);
  };

  const handleRefresh = () => {
    refetch();
    toast({
      title: 'รีเฟรชข้อมูล',
      description: 'กำลังโหลดข้อมูลล่าสุด...',
    });
  };

  const handleRowClick = (docno: string) => {
    setSelectedDocno(docno);
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">💰 Dashboard การเงิน</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ภาพรวมยอดขายจาก CSSALE Database
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          className="h-10 sm:h-9 w-full sm:w-auto"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          รีเฟรช
        </Button>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardHeader className="p-4 sm:p-6 pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            ตัวกรองและค้นหา
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
          {/* Date Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                วันที่เริ่มต้น
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(0);
                }}
                className="text-xs sm:text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                วันที่สิ้นสุด
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(0);
                }}
                className="text-xs sm:text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                <User className="h-3 w-3" />
                ค้นหาลูกค้า/เอกสาร
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="ชื่อ, รหัส, เลขที่..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setCurrentPage(0);
                  }}
                  className="text-xs sm:text-sm pr-8"
                />
                {customerSearch && (
                  <button
                    onClick={() => setCustomerSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setQuickFilter('today')}
              className="text-xs"
            >
              วันนี้
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setQuickFilter('week')}
              className="text-xs"
            >
              สัปดาห์นี้
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setQuickFilter('month')}
              className="text-xs"
            >
              เดือนนี้
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setQuickFilter('lastMonth')}
              className="text-xs"
            >
              เดือนที่แล้ว
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setQuickFilter('90days')}
              className="text-xs"
            >
              90 วัน
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleClearFilters}
              className="text-xs ml-auto"
            >
              ล้างตัวกรอง
            </Button>
          </div>

          {/* Results Count */}
          <div className="pt-2 border-t">
            <p className="text-xs sm:text-sm text-muted-foreground">
              พบ <span className="font-semibold text-foreground">{filteredSales.length}</span> รายการ
              {customerSearch && (
                <span> (กรองจาก {allSales?.length || 0} รายการ)</span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center justify-between">
              <span>ยอดขายรวม</span>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {statsLoading ? (
              <div className="h-8 bg-gray-200 animate-pulse rounded" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalSales)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center justify-between">
              <span>จำนวนออเดอร์</span>
              <FileText className="h-4 w-4 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {statsLoading ? (
              <div className="h-8 bg-gray-200 animate-pulse rounded" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold text-blue-600">
                {stats.totalOrders.toLocaleString()} ออเดอร์
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center justify-between">
              <span>ค่าเฉลี่ยต่อออเดอร์</span>
              <BarChart3 className="h-4 w-4 text-purple-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {statsLoading ? (
              <div className="h-8 bg-gray-200 animate-pulse rounded" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold text-purple-600">
                {formatCurrency(stats.averageOrderValue)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center justify-between">
              <span>ช่วงที่เลือก</span>
              <Calendar className="h-4 w-4 text-orange-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-xs sm:text-sm font-medium text-orange-600">
              {formatDate(startDate)}
              <br />
              ถึง {formatDate(endDate)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart + Top Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Sales Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              แนวโน้มยอดขายรายวัน
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {chartLoading ? (
              <div className="h-64 bg-gray-200 animate-pulse rounded" />
            ) : chartData && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDateShort}
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis
                    tickFormatter={(value) => `฿${(value / 1000).toFixed(0)}K`}
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'ยอดขาย']}
                    labelFormatter={(label) => formatDate(label)}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="totalAmount"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                    name="ยอดขาย (฿)"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">ไม่มีข้อมูลในช่วงที่เลือก</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Top 5 ลูกค้า
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {topLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 animate-pulse rounded" />
                ))}
              </div>
            ) : topCustomers && topCustomers.length > 0 ? (
              <div className="space-y-3">
                {topCustomers.map((customer, index) => {
                  const maxAmount = topCustomers[0].totalAmount;
                  const percentage = (customer.totalAmount / maxAmount) * 100;

                  return (
                    <div key={customer.arcode} className="space-y-1">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Badge variant="secondary" className="text-xs">
                            #{index + 1}
                          </Badge>
                          <span className="font-medium truncate">{customer.arname}</span>
                        </div>
                        <span className="font-semibold text-green-600 ml-2 flex-shrink-0">
                          {formatCurrency(customer.totalAmount)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="flex-shrink-0">{customer.orderCount} ออเดอร์</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <User className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">ไม่มีข้อมูลลูกค้า</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            รายการขายทั้งหมด
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {salesError ? (
            <div className="p-8 sm:p-12 text-center">
              <AlertCircle className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-red-500 mb-4" />
              <p className="text-sm text-red-600">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
              <p className="text-xs text-muted-foreground mt-1">
                {salesError instanceof Error ? salesError.message : 'Unknown error'}
              </p>
            </div>
          ) : salesLoading ? (
            <div className="p-4 sm:p-6 space-y-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 animate-pulse rounded" />
              ))}
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="p-8 sm:p-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 opacity-20" />
              <p className="text-sm sm:text-base">ไม่พบรายการขาย</p>
              {customerSearch && (
                <p className="text-xs mt-2">ลองปรับเงื่อนไขการค้นหา</p>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">เลขที่เอกสาร</TableHead>
                      <TableHead className="text-xs sm:text-sm">วันที่</TableHead>
                      <TableHead className="text-xs sm:text-sm">ลูกค้า</TableHead>
                      <TableHead className="text-right text-xs sm:text-sm">ยอดเงิน</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSales.map((sale) => (
                      <TableRow
                        key={sale.docno}
                        onClick={() => handleRowClick(sale.docno)}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <TableCell className="font-medium text-xs sm:text-sm">
                          <div className="flex flex-col">
                            <span>{sale.docno}</span>
                            {sale.taxno && (
                              <span className="text-[10px] sm:text-xs text-muted-foreground">
                                {sale.taxno}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          {formatDate(sale.docdate)}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <div className="flex flex-col min-w-0">
                              <span className="truncate">{sale.arname || '-'}</span>
                              {sale.arcode && (
                                <span className="text-[10px] sm:text-xs text-muted-foreground">
                                  {sale.arcode}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-xs sm:text-sm">
                          {formatCurrency(sale.totalamount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-t">
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    หน้า {currentPage + 1} จาก {totalPages} ({filteredSales.length} รายการ)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                      className="h-8 sm:h-9"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1">ก่อนหน้า</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={currentPage >= totalPages - 1}
                      className="h-8 sm:h-9"
                    >
                      <span className="hidden sm:inline mr-1">ถัดไป</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedDocno} onOpenChange={(open) => !open && setSelectedDocno(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <FileText className="h-5 w-5" />
              รายละเอียดใบขาย
            </DialogTitle>
            <DialogDescription>
              เลขที่เอกสาร: {selectedDocno}
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="space-y-3 py-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 animate-pulse rounded" />
              ))}
            </div>
          ) : orderDetail ? (
            <div className="space-y-4 sm:space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">วันที่</p>
                  <p className="text-sm font-medium">{formatDate(orderDetail.docdate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">เลขที่ใบกำกับภาษี</p>
                  <p className="text-sm font-medium">{orderDetail.taxno || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ลูกค้า</p>
                  <p className="text-sm font-medium">{orderDetail.arname || '-'}</p>
                  {orderDetail.arcode && (
                    <p className="text-xs text-muted-foreground">{orderDetail.arcode}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ยอดเงินรวม</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(orderDetail.totalamount)}
                  </p>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  รายการสินค้า ({orderDetail.items?.length || 0} รายการ)
                </h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">#</TableHead>
                        <TableHead className="text-xs">รหัสสินค้า</TableHead>
                        <TableHead className="text-xs">ชื่อสินค้า</TableHead>
                        <TableHead className="text-right text-xs">จำนวน</TableHead>
                        <TableHead className="text-right text-xs">ราคา/หน่วย</TableHead>
                        <TableHead className="text-right text-xs">รวม</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderDetail.items && orderDetail.items.length > 0 ? (
                        orderDetail.items.map((item, index) => (
                          <TableRow key={item.lineid}>
                            <TableCell className="text-xs">{index + 1}</TableCell>
                            <TableCell className="text-xs font-mono">
                              {item.productcode || '-'}
                            </TableCell>
                            <TableCell className="text-xs">{item.productname || '-'}</TableCell>
                            <TableCell className="text-right text-xs">
                              {item.quantity} {item.unitname}
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              {formatCurrency(item.unitprice)}
                            </TableCell>
                            <TableCell className="text-right text-xs font-semibold">
                              {formatCurrency(item.netamount)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">
                            ไม่มีรายการสินค้า
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-2" />
              <p className="text-sm">ไม่พบข้อมูลใบขาย</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
