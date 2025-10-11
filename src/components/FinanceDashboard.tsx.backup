import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DollarSign,
  TrendingUp,
  FileText,
  Calendar,
  AlertCircle,
  RefreshCw,
  User
} from 'lucide-react';
import { useSalesOrders, useSalesStats } from '@/hooks/useSalesData';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export function FinanceDashboard() {
  const { toast } = useToast();
  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0];

  // ยอดขายวันนี้
  const { stats: todayStats, isLoading: todayLoading } = useSalesStats({
    startDate: today,
    endDate: today,
  });

  // ยอดขายเดือนนี้
  const { stats: monthStats, isLoading: monthLoading } = useSalesStats({
    startDate: firstDayOfMonth,
    endDate: today,
  });

  // รายการขายล่าสุด 10 รายการ
  const {
    data: recentSales,
    isLoading: recentLoading,
    error: recentError,
    refetch
  } = useSalesOrders({ limit: 10, offset: 0 });

  // Format เงิน
  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '฿0.00';
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Format วันที่
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const handleRefresh = () => {
    refetch();
    toast({
      title: 'รีเฟรชข้อมูล',
      description: 'กำลังโหลดข้อมูลล่าสุด...',
    });
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* ยอดขายวันนี้ */}
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
              ยอดขายวันนี้
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {todayLoading ? (
              <div className="h-8 bg-gray-200 animate-pulse rounded" />
            ) : (
              <div>
                <div className="text-xl sm:text-2xl font-bold text-green-600">
                  {formatCurrency(todayStats.totalSales)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {todayStats.totalOrders} รายการ
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ยอดขายเดือนนี้ */}
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
              ยอดขายเดือนนี้
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {monthLoading ? (
              <div className="h-8 bg-gray-200 animate-pulse rounded" />
            ) : (
              <div>
                <div className="text-xl sm:text-2xl font-bold text-blue-600">
                  {formatCurrency(monthStats.totalSales)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {monthStats.totalOrders} รายการ
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ค่าเฉลี่ยต่อออเดอร์ */}
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
              ค่าเฉลี่ยต่อออเดอร์
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {monthLoading ? (
              <div className="h-8 bg-gray-200 animate-pulse rounded" />
            ) : (
              <div>
                <div className="text-xl sm:text-2xl font-bold text-purple-600">
                  {formatCurrency(monthStats.averageOrderValue)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">เดือนนี้</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* จำนวนออเดอร์เดือนนี้ */}
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
              จำนวนออเดอร์
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {monthLoading ? (
              <div className="h-8 bg-gray-200 animate-pulse rounded" />
            ) : (
              <div>
                <div className="text-xl sm:text-2xl font-bold text-orange-600">
                  {monthStats.totalOrders}
                </div>
                <p className="text-xs text-muted-foreground mt-1">เดือนนี้</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* รายการขายล่าสุด */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            รายการขายล่าสุด 10 รายการ
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {recentError ? (
            <div className="p-4 sm:p-6 text-center">
              <AlertCircle className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-red-500 mb-2 sm:mb-4" />
              <p className="text-sm text-red-600">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
              <p className="text-xs text-muted-foreground mt-1">
                {recentError instanceof Error ? recentError.message : 'Unknown error'}
              </p>
            </div>
          ) : recentLoading ? (
            <div className="p-4 sm:p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 animate-pulse rounded" />
              ))}
            </div>
          ) : !recentSales || recentSales.length === 0 ? (
            <div className="p-8 sm:p-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 opacity-20" />
              <p className="text-sm sm:text-base">ไม่มีรายการขาย</p>
            </div>
          ) : (
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
                  {recentSales.map((sale) => (
                    <TableRow key={sale.docno} className="hover:bg-muted/50">
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
                          <User className="h-3 w-3 text-muted-foreground" />
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
          )}
        </CardContent>
      </Card>

      {/* Info Note */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs sm:text-sm text-blue-800">
              <p className="font-medium">หมายเหตุ:</p>
              <p className="mt-1">
                ข้อมูลมาจากตาราง <code className="bg-blue-100 px-1 rounded">CSSALE</code> และ{' '}
                <code className="bg-blue-100 px-1 rounded">CSSALESUB</code> ใน SQL Server Database
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
