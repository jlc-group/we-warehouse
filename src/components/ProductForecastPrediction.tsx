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
import {
  ChevronDown,
  ChevronUp,
  Search,
  Calendar,
  TrendingUp,
  Package,
  X,
  Download,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useProductForecastPrediction } from '@/hooks/useProductForecastPrediction';
import { exportForecastToExcel } from '@/utils/excelExport';

// Format ตัวเลข
const formatNumber = (value: number) => {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);
};

// คำนวณเดือนถัดไป (default target month)
const getNextMonth = () => {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toISOString().slice(0, 7); // "2024-11"
};

// แปลงเดือนเป็นชื่อภาษาไทย
const formatMonthName = (monthStr: string) => {
  const [year, month] = monthStr.split('-').map(Number);
  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  return `${monthNames[month - 1]} ${year + 543}`;
};

export function ProductForecastPrediction() {
  const [targetMonth, setTargetMonth] = useState(getNextMonth());
  const [lookbackMonths, setLookbackMonths] = useState(3);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Fetch data
  const { data: result, isLoading, error, refetch } = useProductForecastPrediction({
    targetMonth,
    lookbackMonths,
    search: searchQuery
  });

  const forecastData = result?.data || [];
  const metadata = result?.metadata;

  // Summary statistics
  const stats = useMemo(() => {
    if (!forecastData || forecastData.length === 0) {
      return {
        totalBaseCodes: 0,
        totalForecastQty: 0,
        avgPerDay: 0
      };
    }

    const totalForecastQty = forecastData.reduce((sum, item) => sum + item.forecastQty, 0);

    return {
      totalBaseCodes: forecastData.length,
      totalForecastQty,
      avgPerDay: totalForecastQty / 30 // สมมติ 30 วัน
    };
  }, [forecastData]);

  // Top 10 for chart
  const chartData = useMemo(() => {
    if (!forecastData || forecastData.length === 0) return [];

    return forecastData.slice(0, 10).map(item => ({
      baseCode: item.baseCode,
      ยอดพยากรณ์: item.forecastQty,
      คาเฉลีย: item.averageQty
    }));
  }, [forecastData]);

  // Toggle functions
  const toggleExpand = (baseCode: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(baseCode)) {
        newSet.delete(baseCode);
      } else {
        newSet.add(baseCode);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedItems(new Set(forecastData.map(item => item.baseCode)));
  };

  const collapseAll = () => {
    setExpandedItems(new Set());
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleExport = () => {
    if (!forecastData || forecastData.length === 0) return;
    exportForecastToExcel(forecastData, targetMonth);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-red-600 font-semibold">เกิดข้อผิดพลาด</p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : 'ไม่สามารถโหลดข้อมูลได้'}
              </p>
              <Button onClick={handleRefresh} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                ลองอีกครั้ง
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            Product Forecast - คาดการณ์ยอดขาย
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            คำนวณจากค่าเฉลี่ย {lookbackMonths} เดือนย้อนหลัง
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" size="lg">
            <RefreshCw className="h-4 w-4 mr-2" />
            รีเฟรช
          </Button>
          <Button
            onClick={handleExport}
            variant="default"
            size="lg"
            disabled={!forecastData || forecastData.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Filter Section */}
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50/50 to-cyan-50/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            ตั้งค่าการคาดการณ์
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Target Month */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">เดือนที่ต้องการคาดการณ์</Label>
              <Input
                type="month"
                value={targetMonth}
                onChange={(e) => setTargetMonth(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {formatMonthName(targetMonth)}
              </p>
            </div>

            {/* Lookback Months */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">คำนวณจากข้อมูลย้อนหลัง</Label>
              <div className="flex gap-2">
                <Button
                  variant={lookbackMonths === 3 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLookbackMonths(3)}
                  className="flex-1"
                >
                  3 เดือน
                </Button>
                <Button
                  variant={lookbackMonths === 6 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLookbackMonths(6)}
                  className="flex-1"
                >
                  6 เดือน
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">ค้นหาสินค้า</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="รหัสสินค้า หรือ ชื่อสินค้า..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Metadata */}
          {metadata && (
            <div className="text-xs text-muted-foreground bg-white/50 p-3 rounded-md">
              <p>
                📊 ข้อมูลที่ใช้คำนวณ: {metadata.startDate} ถึง {metadata.endDate} |
                พบ {metadata.totalBaseCodes} รายการ
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              จำนวนสินค้า (Base Codes)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">
              {formatNumber(stats.totalBaseCodes)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">รายการ</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              ยอดรวมพยากรณ์
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">
              {formatNumber(stats.totalForecastQty)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">ชิ้น</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              ค่าเฉลี่ยต่อวัน
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-700">
              {formatNumber(stats.avgPerDay)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">ชิ้น/วัน (30 วัน)</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart - Top 10 */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top 10 สินค้า - ยอดพยากรณ์สูงสุด</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="baseCode" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip formatter={(value) => formatNumber(Number(value))} />
                <Legend />
                <Bar dataKey="ยอดพยากรณ์" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">รายละเอียดทั้งหมด ({forecastData.length} รายการ)</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={expandAll}>
                <ChevronDown className="h-4 w-4 mr-1" />
                ขยายทั้งหมด
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                <ChevronUp className="h-4 w-4 mr-1" />
                ย่อทั้งหมด
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {forecastData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>ไม่พบข้อมูล</p>
            </div>
          ) : (
            <div className="space-y-2">
              {forecastData.map((item) => (
                <Collapsible
                  key={item.baseCode}
                  open={expandedItems.has(item.baseCode)}
                  onOpenChange={() => toggleExpand(item.baseCode)}
                >
                  <Card className="border-l-4 border-l-blue-400">
                    <CollapsibleTrigger className="w-full">
                      <div className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          {expandedItems.has(item.baseCode) ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                          <div className="text-left">
                            <div className="font-bold text-lg">{item.baseCode}</div>
                            <div className="text-sm text-muted-foreground">{item.baseName}</div>
                          </div>
                        </div>
                        <Badge variant="default" className="bg-green-600 text-lg px-4 py-2">
                          {formatNumber(item.forecastQty)} ชิ้น
                        </Badge>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="px-4 pb-4 space-y-4 border-t pt-4">
                        {/* Historical Data */}
                        <div>
                          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            📊 ข้อมูลย้อนหลัง {lookbackMonths} เดือน:
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {item.historicalData.map((hist) => (
                              <div
                                key={hist.month}
                                className="bg-blue-50 p-3 rounded-md border border-blue-200"
                              >
                                <div className="text-xs text-muted-foreground">{hist.monthName}</div>
                                <div className="text-lg font-bold text-blue-700">
                                  {formatNumber(hist.qty)} ชิ้น
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Average & Forecast */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div className="bg-purple-50 p-3 rounded-md border border-purple-200">
                            <div className="text-xs text-muted-foreground">📈 ค่าเฉลี่ย</div>
                            <div className="text-lg font-bold text-purple-700">
                              {formatNumber(item.averageQty)} ชิ้น/เดือน
                            </div>
                          </div>
                          <div className="bg-green-50 p-3 rounded-md border border-green-200">
                            <div className="text-xs text-muted-foreground">
                              🎯 พยากรณ์ {formatMonthName(targetMonth)}
                            </div>
                            <div className="text-lg font-bold text-green-700">
                              ~{formatNumber(item.forecastQty)} ชิ้น
                            </div>
                          </div>
                        </div>

                        {/* Product Details */}
                        {item.details.length > 1 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2">
                              รายละเอียดตาม Product Code:
                            </h4>
                            <div className="space-y-2">
                              {item.details.map((detail) => (
                                <div
                                  key={detail.originalCode}
                                  className="bg-gray-50 p-3 rounded-md border"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div>
                                      <div className="font-mono text-sm font-bold">
                                        {detail.originalCode}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {detail.originalName}
                                      </div>
                                    </div>
                                    {detail.multiplier > 1 && (
                                      <Badge variant="secondary">X{detail.multiplier}</Badge>
                                    )}
                                  </div>
                                  <div className="flex gap-2 flex-wrap">
                                    {detail.monthlyData.map((month) => (
                                      <div
                                        key={month.month}
                                        className="text-xs bg-white px-2 py-1 rounded border"
                                      >
                                        <span className="text-muted-foreground">{month.monthName}: </span>
                                        {detail.multiplier > 1 ? (
                                          <span className="font-semibold">
                                            {formatNumber(month.qty)} × {detail.multiplier} ={' '}
                                            {formatNumber(month.actualQty)} ชิ้น
                                          </span>
                                        ) : (
                                          <span className="font-semibold">
                                            {formatNumber(month.qty)} ชิ้น
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
