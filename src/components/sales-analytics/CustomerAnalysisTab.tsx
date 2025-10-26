import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Users, ShoppingCart, TrendingUp, DollarSign, Package, Calendar, Filter, AlertCircle } from 'lucide-react';
import { useCustomerComparison } from '@/hooks/useSalesComparison';
import { useCustomerList, CustomerListItem } from '@/hooks/useSalesData';
import { ComparisonCard } from './shared/ComparisonCard';
import { formatCurrency, formatNumber, formatDate } from './shared/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CustomerAnalysisTabProps {
  orderDetailsMap?: Map<string, any[]>;
}

export function CustomerAnalysisTab({ orderDetailsMap }: CustomerAnalysisTabProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [comparisonType, setComparisonType] = useState<'month' | 'year'>('month');

  // Date Range State - default to current year
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Jan 1 of current year
    endDate: new Date().toISOString().split('T')[0] // Today
  });

  // Temporary date range for the filter form
  const [tempDateRange, setTempDateRange] = useState(dateRange);

  // Use real SQL Server data with date range
  const { data: customers, isLoading: customersLoading, error: customersError } = useCustomerList(
    dateRange.startDate,
    dateRange.endDate
  );

  const comparison = useCustomerComparison(selectedCustomer, comparisonType, orderDetailsMap);

  // Debug logging
  console.log('🔍 CustomerAnalysisTab Debug:', {
    selectedCustomer,
    customersCount: customers?.length || 0,
    dateRange,
    orderDetailsMapSize: orderDetailsMap?.size || 0,
    hasComparison: !!comparison,
    hasCustomerMetrics: !!comparison.customerMetrics
  });

  // Get available customers from API
  const availableCustomers = useMemo(() => {
    if (!customers) return [];
    return customers;
  }, [customers]);

  // Get selected customer info
  const selectedCustomerInfo = useMemo(() => {
    if (!selectedCustomer || !availableCustomers) return null;
    return availableCustomers.find(c => c.arcode === selectedCustomer);
  }, [selectedCustomer, availableCustomers]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!comparison.dailyComparison) return [];

    return comparison.dailyComparison.map(day => ({
      date: formatDate(day.date),
      ปัจจุบัน: day.current,
      'ช่วงก่อนหน้า': day.previous
    }));
  }, [comparison.dailyComparison]);

  // Handle date filter apply
  const handleApplyFilter = () => {
    setDateRange(tempDateRange);
    // Reset customer selection when date range changes
    setSelectedCustomer(null);
  };

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            เลือกช่วงเวลาสำหรับวิเคราะห์
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="startDate">วันที่เริ่มต้น</Label>
              <Input
                id="startDate"
                type="date"
                value={tempDateRange.startDate}
                onChange={(e) => setTempDateRange({ ...tempDateRange, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="endDate">วันที่สิ้นสุด</Label>
              <Input
                id="endDate"
                type="date"
                value={tempDateRange.endDate}
                onChange={(e) => setTempDateRange({ ...tempDateRange, endDate: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleApplyFilter} className="w-full">
                <Filter className="h-4 w-4 mr-2" />
                ค้นหา
              </Button>
            </div>
          </div>
          {dateRange.startDate && dateRange.endDate && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>ช่วงเวลาที่เลือก:</strong> {formatDate(dateRange.startDate)} ถึง {formatDate(dateRange.endDate)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            เลือกลูกค้าเพื่อวิเคราะห์
          </CardTitle>
        </CardHeader>
        <CardContent>
          {customersLoading ? (
            <div className="text-center py-4">
              <p className="text-gray-500">กำลังโหลดรายการลูกค้า...</p>
            </div>
          ) : customersError ? (
            <div className="text-center py-4 text-red-500">
              <p>เกิดข้อผิดพลาดในการโหลดข้อมูล: {customersError.message}</p>
            </div>
          ) : (
            <>
              <Select value={selectedCustomer || ''} onValueChange={setSelectedCustomer}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="กรุณาเลือกลูกค้า..." />
                </SelectTrigger>
                <SelectContent>
                  {availableCustomers.map((customer, index) => (
                    <SelectItem key={`${customer.arcode}-${index}`} value={customer.arcode}>
                      {customer.arcode} - {customer.arname} ({formatCurrency(customer.totalPurchases)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedCustomerInfo && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>รหัสลูกค้า:</strong> {selectedCustomerInfo.arcode}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>ชื่อลูกค้า:</strong> {selectedCustomerInfo.arname}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>ยอดซื้อรวม:</strong> {formatCurrency(selectedCustomerInfo.totalPurchases)}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>จำนวนออเดอร์:</strong> {formatNumber(selectedCustomerInfo.orderCount)} ครั้ง
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {selectedCustomer && (
        <>
          {/* Comparison Type Tabs */}
          <Tabs value={comparisonType} onValueChange={(v) => setComparisonType(v as 'month' | 'year')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="month">เปรียบเทียบรายเดือน</TabsTrigger>
              <TabsTrigger value="year">เปรียบเทียบรายปี</TabsTrigger>
            </TabsList>

            <TabsContent value="month" className="space-y-6">
              {comparison.isLoading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
                </div>
              ) : comparison.customerMetrics ? (
                <>
                  {/* Comparison Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <ComparisonCard
                      title="ยอดซื้อ"
                      icon={<DollarSign className="h-4 w-4" />}
                      currentValue={comparison.customerMetrics.current.totalPurchases}
                      previousValue={comparison.customerMetrics.previous.totalPurchases}
                      growth={comparison.customerMetrics.growth.purchasesGrowth}
                      formatValue={formatCurrency}
                    />
                    <ComparisonCard
                      title="จำนวนชิ้น"
                      icon={<Package className="h-4 w-4" />}
                      currentValue={comparison.customerMetrics.current.totalQuantity}
                      previousValue={comparison.customerMetrics.previous.totalQuantity}
                      growth={comparison.customerMetrics.growth.quantityGrowth}
                      formatValue={formatNumber}
                    />
                    <ComparisonCard
                      title="จำนวนออเดอร์"
                      icon={<ShoppingCart className="h-4 w-4" />}
                      currentValue={comparison.customerMetrics.current.orderCount}
                      previousValue={comparison.customerMetrics.previous.orderCount}
                      growth={comparison.customerMetrics.growth.orderGrowth}
                      formatValue={formatNumber}
                    />
                    <ComparisonCard
                      title="ราคาเฉลี่ย/ออเดอร์"
                      icon={<TrendingUp className="h-4 w-4" />}
                      currentValue={comparison.customerMetrics.current.avgOrderValue}
                      previousValue={comparison.customerMetrics.previous.avgOrderValue}
                      growth={comparison.customerMetrics.growth.avgValueGrowth}
                      formatValue={formatCurrency}
                    />
                  </div>

                  {/* Purchase Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>กราฟยอดซื้อรายวัน - {comparisonType === 'month' ? 'เปรียบเทียบรายเดือน' : 'เปรียบเทียบรายปี'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
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

                  {/* Top Products */}
                  {comparison.customerMetrics.current.topProducts.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          Top 5 สินค้าที่ลูกค้ารายนี้ซื้อ (ช่วงปัจจุบัน)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {comparison.customerMetrics.current.topProducts.map((product, idx) => (
                            <div key={product.productcode} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-sm font-bold text-blue-600">{idx + 1}</span>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{product.productname}</p>
                                  <p className="text-xs text-gray-500">{product.productcode}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-gray-900">{formatCurrency(product.totalAmount)}</p>
                                <p className="text-xs text-gray-500">{formatNumber(product.quantity)} ชิ้น</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Peak Purchase Info */}
                  {comparison.customerMetrics.current.peakPurchaseDate && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          ข้อมูลยอดซื้อสูงสุด
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 bg-purple-50 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">วันที่ซื้อสูงสุด</p>
                            <p className="text-lg font-bold text-purple-700">
                              {formatDate(comparison.customerMetrics.current.peakPurchaseDate)}
                            </p>
                          </div>
                          <div className="p-4 bg-purple-50 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">ยอดซื้อสูงสุด</p>
                            <p className="text-lg font-bold text-purple-700">
                              {formatCurrency(comparison.customerMetrics.current.peakPurchaseAmount)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">ไม่พบข้อมูลการซื้อสำหรับลูกค้ารายนี้</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="year" className="space-y-6">
              {comparison.isLoading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
                </div>
              ) : comparison.customerMetrics ? (
                <>
                  {/* Comparison Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <ComparisonCard
                      title="ยอดซื้อ"
                      icon={<DollarSign className="h-4 w-4" />}
                      currentValue={comparison.customerMetrics.current.totalPurchases}
                      previousValue={comparison.customerMetrics.previous.totalPurchases}
                      growth={comparison.customerMetrics.growth.purchasesGrowth}
                      formatValue={formatCurrency}
                    />
                    <ComparisonCard
                      title="จำนวนชิ้น"
                      icon={<Package className="h-4 w-4" />}
                      currentValue={comparison.customerMetrics.current.totalQuantity}
                      previousValue={comparison.customerMetrics.previous.totalQuantity}
                      growth={comparison.customerMetrics.growth.quantityGrowth}
                      formatValue={formatNumber}
                    />
                    <ComparisonCard
                      title="จำนวนออเดอร์"
                      icon={<ShoppingCart className="h-4 w-4" />}
                      currentValue={comparison.customerMetrics.current.orderCount}
                      previousValue={comparison.customerMetrics.previous.orderCount}
                      growth={comparison.customerMetrics.growth.orderGrowth}
                      formatValue={formatNumber}
                    />
                    <ComparisonCard
                      title="ราคาเฉลี่ย/ออเดอร์"
                      icon={<TrendingUp className="h-4 w-4" />}
                      currentValue={comparison.customerMetrics.current.avgOrderValue}
                      previousValue={comparison.customerMetrics.previous.avgOrderValue}
                      growth={comparison.customerMetrics.growth.avgValueGrowth}
                      formatValue={formatCurrency}
                    />
                  </div>

                  {/* Purchase Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>กราฟยอดซื้อรายวัน - {comparisonType === 'month' ? 'เปรียบเทียบรายเดือน' : 'เปรียบเทียบรายปี'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
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

                  {/* Top Products */}
                  {comparison.customerMetrics.current.topProducts.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          Top 5 สินค้าที่ลูกค้ารายนี้ซื้อ (ช่วงปัจจุบัน)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {comparison.customerMetrics.current.topProducts.map((product, idx) => (
                            <div key={product.productcode} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-sm font-bold text-blue-600">{idx + 1}</span>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{product.productname}</p>
                                  <p className="text-xs text-gray-500">{product.productcode}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-gray-900">{formatCurrency(product.totalAmount)}</p>
                                <p className="text-xs text-gray-500">{formatNumber(product.quantity)} ชิ้น</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Peak Purchase Info */}
                  {comparison.customerMetrics.current.peakPurchaseDate && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          ข้อมูลยอดซื้อสูงสุด
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 bg-purple-50 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">วันที่ซื้อสูงสุด</p>
                            <p className="text-lg font-bold text-purple-700">
                              {formatDate(comparison.customerMetrics.current.peakPurchaseDate)}
                            </p>
                          </div>
                          <div className="p-4 bg-purple-50 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">ยอดซื้อสูงสุด</p>
                            <p className="text-lg font-bold text-purple-700">
                              {formatCurrency(comparison.customerMetrics.current.peakPurchaseAmount)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">ไม่พบข้อมูลการซื้อสำหรับลูกค้ารายนี้</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
