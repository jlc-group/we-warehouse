import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AIChatBox } from '@/components/ai-insights';
import {
  useSalesSummary,
  useProductList,
  useCustomerList,
  useDailySalesChart,
  ProductListItem,
  CustomerListItem,
} from '@/hooks/useSalesData';
import { Brain, Calendar, Filter } from 'lucide-react';

export function AIAnalyticsLab() {
  const today = new Date().toISOString().split('T')[0];
  const startOfYear = new Date(new Date().getFullYear(), 0, 1)
    .toISOString()
    .split('T')[0];

  const [dateRange, setDateRange] = useState({
    startDate: startOfYear,
    endDate: today,
  });
  const [tempDateRange, setTempDateRange] = useState(dateRange);

  const { data: salesSummary, isLoading: summaryLoading } = useSalesSummary(
    dateRange.startDate,
    dateRange.endDate
  );

  const { data: products, isLoading: productsLoading } = useProductList(
    dateRange.startDate,
    dateRange.endDate
  );

  const { data: customers, isLoading: customersLoading } = useCustomerList(
    dateRange.startDate,
    dateRange.endDate
  );

  const { data: dailyChart, isLoading: chartLoading } = useDailySalesChart(
    dateRange.startDate,
    dateRange.endDate
  );

  const dailySales = useMemo(
    () =>
      (dailyChart || []).map((d) => ({
        date: d.date,
        amount: d.totalAmount,
      })),
    [dailyChart]
  );

  const salesContext = useMemo(() => {
    const totalSales = salesSummary?.sales.amount || 0;
    const orderCount = salesSummary?.net.count || 0;

    let trend:
      | {
          direction: 'up' | 'down' | 'stable';
          percentChange: number;
        }
      | undefined;

    if (dailySales.length > 1) {
      const first = dailySales[0].amount;
      const last = dailySales[dailySales.length - 1].amount;
      let direction: 'up' | 'down' | 'stable' = 'stable';
      if (last > first) direction = 'up';
      else if (last < first) direction = 'down';

      const percentChange = first > 0 ? ((last - first) / first) * 100 : 0;
      trend = { direction, percentChange };
    }

    const mappedProducts = (products as ProductListItem[] | undefined)?.slice(0, 20).map((p) => ({
      productCode: p.productCode,
      productName: p.productName,
      totalSales: p.totalSales,
      totalQuantity: p.totalQuantity,
    })) || [];

    const mappedCustomers = (customers as CustomerListItem[] | undefined)?.slice(0, 20).map((c) => ({
      arcode: c.arcode,
      arname: c.arname,
      totalPurchases: c.totalPurchases,
      orderCount: c.orderCount,
    })) || [];

    return {
      totalSales,
      orderCount,
      topProducts: mappedProducts,
      topCustomers: mappedCustomers,
      dailySales,
      dateRange: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
      trend,
    };
  }, [salesSummary, products, customers, dailySales, dateRange]);

  const handleApplyFilter = () => {
    setDateRange(tempDateRange);
  };

  const isLoading = summaryLoading || productsLoading || customersLoading || chartLoading;

  return (
    <div className="space-y-6">
      <Card className="border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-bold text-indigo-900">AI Analytics Lab</div>
                <p className="text-xs text-gray-600">
                  ทดลองถาม AI เกี่ยวกับสต็อก การหยิบจับ ยอดขายสินค้า และ movement ของลูกค้า
                </p>
              </div>
            </div>
            <Badge variant="outline" className="border-indigo-300 bg-indigo-50 text-xs text-indigo-700">
              Beta
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="startDate" className="text-xs font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" /> วันที่เริ่มต้น
              </Label>
              <Input
                id="startDate"
                type="date"
                value={tempDateRange.startDate}
                onChange={(e) => setTempDateRange({ ...tempDateRange, startDate: e.target.value })}
                className="mt-1 h-9 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="text-xs font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" /> วันที่สิ้นสุด
              </Label>
              <Input
                id="endDate"
                type="date"
                value={tempDateRange.endDate}
                onChange={(e) => setTempDateRange({ ...tempDateRange, endDate: e.target.value })}
                className="mt-1 h-9 text-sm"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleApplyFilter} className="w-full bg-indigo-600 hover:bg-indigo-700 h-9 text-sm">
                <Filter className="h-4 w-4 mr-2" />
                ใช้ช่วงเวลานี้กับ AI
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-gray-500">
            คุณสามารถพิมพ์วันที่ในคำถามได้เองด้วย เช่น "movement สินค้า FG-1234 ระหว่าง 2025-01-01 ถึง 2025-03-31" หรือ
            "ลูกค้า A0001 90 วันที่ผ่านมาเป็นอย่างไร" เพื่อให้ AI ใช้ช่วงเวลาที่ระบุ
          </p>
        </CardContent>
      </Card>

      <AIChatBox context={salesContext} isLoading={isLoading} />
    </div>
  );
}

export default AIAnalyticsLab;
