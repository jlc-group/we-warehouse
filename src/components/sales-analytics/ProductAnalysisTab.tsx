import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, ShoppingCart, TrendingUp, DollarSign, Users, Calendar, RefreshCw, AlertCircle, Filter } from 'lucide-react';
import { useProductComparison } from '@/hooks/useSalesComparison';
import { useProductList } from '@/hooks/useSalesData';
import { ComparisonCard } from './shared/ComparisonCard';
import { formatCurrency, formatNumber, formatDate } from './shared/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface ProductAnalysisTabProps {
  orderDetailsMap?: Map<string, any[]>;
}

export function ProductAnalysisTab({ orderDetailsMap }: ProductAnalysisTabProps) {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [comparisonType, setComparisonType] = useState<'month' | 'year'>('month');

  // Date Range Filter State
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // ต้นปี
    endDate: new Date().toISOString().split('T')[0] // วันนี้
  });
  const [tempDateRange, setTempDateRange] = useState(dateRange);

  // ดึงรายการสินค้าจาก SQL Server โดยกรองตามช่วงเวลา + limit 100 อันดับแรก
  const { data: products, isLoading: productsLoading } = useProductList(
    dateRange.startDate,
    dateRange.endDate
  );

  const comparison = useProductComparison(selectedProduct, comparisonType);

  // Debug logging
  console.log('🔍 ProductAnalysisTab Debug:', {
    selectedProduct,
    dateRange,
    productsCount: products?.length || 0,
    hasComparison: !!comparison,
    hasProductMetrics: !!comparison.productMetrics,
    productMetrics: comparison.productMetrics
  });

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!comparison.productMetrics?.dailyComparison) return [];

    return comparison.productMetrics.dailyComparison.map(day => ({
      date: formatDate(day.date),
      ปัจจุบัน: day.current,
      'ช่วงก่อนหน้า': day.previous
    }));
  }, [comparison.productMetrics]);

  const handleApplyFilter = () => {
    setDateRange(tempDateRange);
    setSelectedProduct(null); // Reset selection เมื่อเปลี่ยนช่วงเวลา
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
                onChange={(e) => setTempDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                max={tempDateRange.endDate}
              />
            </div>
            <div>
              <Label htmlFor="endDate">วันที่สิ้นสุด</Label>
              <Input
                id="endDate"
                type="date"
                value={tempDateRange.endDate}
                onChange={(e) => setTempDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                min={tempDateRange.startDate}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleApplyFilter} className="w-full">
                <Filter className="h-4 w-4 mr-2" />
                ค้นหา
              </Button>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>ช่วงเวลาที่เลือก:</strong> {formatDate(dateRange.startDate)} ถึง {formatDate(dateRange.endDate)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Product Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            เลือกสินค้าเพื่อวิเคราะห์
          </CardTitle>
        </CardHeader>
        <CardContent>
          {productsLoading ? (
            <div className="text-center py-4">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">กำลังโหลดรายการสินค้า...</p>
            </div>
          ) : !products || products.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-yellow-600" />
              <p className="text-yellow-900 font-semibold">ไม่พบข้อมูลสินค้าในช่วงเวลาที่เลือก</p>
              <p className="text-sm text-yellow-800 mt-2">กรุณาเลือกช่วงเวลาอื่น</p>
            </div>
          ) : (
            <Select value={selectedProduct || ''} onValueChange={setSelectedProduct}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="กรุณาเลือกสินค้า..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {products.map((product, index) => (
                  <SelectItem key={`${product.productCode}-${index}`} value={product.productCode}>
                    {product.productCode} - {product.productName} ({formatCurrency(product.totalSales)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {selectedProduct && products && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              {(() => {
                const selectedProductInfo = products.find(p => p.productCode === selectedProduct);
                return selectedProductInfo ? (
                  <>
                    <p className="text-sm text-gray-600">
                      <strong>รหัสสินค้า:</strong> {selectedProductInfo.productCode}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>ชื่อสินค้า:</strong> {selectedProductInfo.productName}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>ยอดขายรวม ({formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}):</strong> {formatCurrency(selectedProductInfo.totalSales)}
                    </p>
                  </>
                ) : null;
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedProduct && (
        <>
          {/* Comparison Type Tabs */}
          <Tabs value={comparisonType} onValueChange={(v) => setComparisonType(v as 'month' | 'year')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="month">เปรียบเทียบรายเดือน</TabsTrigger>
              <TabsTrigger value="year">เปรียบเทียบรายปี</TabsTrigger>
            </TabsList>

            <TabsContent value="month" className="space-y-6">
              {comparison.isLoading ? (
                <div className="text-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">กำลังโหลดข้อมูล...</p>
                  <p className="text-sm text-gray-400 mt-2">กำลังวิเคราะห์ข้อมูลการขาย...</p>
                </div>
              ) : comparison.error ? (
                <Card className="border-red-300 bg-red-50">
                  <CardContent className="py-12">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-600" />
                    <p className="text-center text-red-900 font-semibold">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
                    <p className="text-sm text-center text-red-800 mt-2">
                      {comparison.error instanceof Error ? comparison.error.message : 'Unknown error'}
                    </p>
                  </CardContent>
                </Card>
              ) : comparison.productMetrics ? (
                <>
                  {/* Comparison Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <ComparisonCard
                      title="ยอดขาย"
                      icon={<DollarSign className="h-4 w-4" />}
                      currentValue={comparison.productMetrics.current.totalSales}
                      previousValue={comparison.productMetrics.previous.totalSales}
                      growth={comparison.productMetrics.growth.salesGrowth}
                      formatValue={formatCurrency}
                    />
                    <ComparisonCard
                      title="จำนวนชิ้น"
                      icon={<Package className="h-4 w-4" />}
                      currentValue={comparison.productMetrics.current.totalQuantity}
                      previousValue={comparison.productMetrics.previous.totalQuantity}
                      growth={comparison.productMetrics.growth.quantityGrowth}
                      formatValue={formatNumber}
                    />
                    <ComparisonCard
                      title="จำนวนออเดอร์"
                      icon={<ShoppingCart className="h-4 w-4" />}
                      currentValue={comparison.productMetrics.current.orderCount}
                      previousValue={comparison.productMetrics.previous.orderCount}
                      growth={comparison.productMetrics.growth.orderGrowth}
                      formatValue={formatNumber}
                    />
                    <ComparisonCard
                      title="ราคาเฉลี่ย/ออเดอร์"
                      icon={<TrendingUp className="h-4 w-4" />}
                      currentValue={comparison.productMetrics.current.avgOrderValue}
                      previousValue={comparison.productMetrics.previous.avgOrderValue}
                      growth={comparison.productMetrics.growth.avgValueGrowth}
                      formatValue={formatCurrency}
                    />
                  </div>

                  {/* Sales Chart */}
                  {chartData.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>กราฟยอดขายรายวัน - {comparisonType === 'month' ? 'เปรียบเทียบรายเดือน' : 'เปรียบเทียบรายปี'}</CardTitle>
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
                  )}

                  {/* Top Customers */}
                  {comparison.productMetrics.current.topCustomers && comparison.productMetrics.current.topCustomers.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Top 5 ลูกค้าที่ซื้อสินค้านี้ (ช่วงปัจจุบัน)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {comparison.productMetrics.current.topCustomers.map((customer, idx) => (
                            <div key={`${customer.arcode}-${idx}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-sm font-bold text-blue-600">{idx + 1}</span>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{customer.arname}</p>
                                  <p className="text-xs text-gray-500">{customer.arcode}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-gray-900">{formatCurrency(customer.totalAmount)}</p>
                                <p className="text-xs text-gray-500">{formatNumber(customer.quantity)} ชิ้น</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Peak Sales Info */}
                  {comparison.productMetrics.current.peakDate && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          ข้อมูลยอดขายสูงสุด
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 bg-green-50 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">วันที่ขายสูงสุด</p>
                            <p className="text-lg font-bold text-green-700">
                              {formatDate(comparison.productMetrics.current.peakDate)}
                            </p>
                          </div>
                          <div className="p-4 bg-green-50 rounded-lg">
                            <p className="text-sm text-gray-600 mb-1">ยอดขายสูงสุด</p>
                            <p className="text-lg font-bold text-green-700">
                              {formatCurrency(comparison.productMetrics.current.peakAmount)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">ไม่พบข้อมูลการขายสำหรับสินค้านี้</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="year" className="space-y-6">
              {/* Year tab - same as month */}
              {comparison.isLoading ? (
                <div className="text-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">กำลังโหลดข้อมูล...</p>
                </div>
              ) : comparison.productMetrics ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <ComparisonCard
                      title="ยอดขาย"
                      icon={<DollarSign className="h-4 w-4" />}
                      currentValue={comparison.productMetrics.current.totalSales}
                      previousValue={comparison.productMetrics.previous.totalSales}
                      growth={comparison.productMetrics.growth.salesGrowth}
                      formatValue={formatCurrency}
                    />
                    <ComparisonCard
                      title="จำนวนชิ้น"
                      icon={<Package className="h-4 w-4" />}
                      currentValue={comparison.productMetrics.current.totalQuantity}
                      previousValue={comparison.productMetrics.previous.totalQuantity}
                      growth={comparison.productMetrics.growth.quantityGrowth}
                      formatValue={formatNumber}
                    />
                    <ComparisonCard
                      title="จำนวนออเดอร์"
                      icon={<ShoppingCart className="h-4 w-4" />}
                      currentValue={comparison.productMetrics.current.orderCount}
                      previousValue={comparison.productMetrics.previous.orderCount}
                      growth={comparison.productMetrics.growth.orderGrowth}
                      formatValue={formatNumber}
                    />
                    <ComparisonCard
                      title="ราคาเฉลี่ย/ออเดอร์"
                      icon={<TrendingUp className="h-4 w-4" />}
                      currentValue={comparison.productMetrics.current.avgOrderValue}
                      previousValue={comparison.productMetrics.previous.avgOrderValue}
                      growth={comparison.productMetrics.growth.avgValueGrowth}
                      formatValue={formatCurrency}
                    />
                  </div>

                  {chartData.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>กราฟยอดขายรายวัน - เปรียบเทียบรายปี</CardTitle>
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
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">ไม่พบข้อมูลการขายสำหรับสินค้านี้</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
