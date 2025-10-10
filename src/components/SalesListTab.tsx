import { useState } from 'react';
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
  FileText,
  Search,
  Calendar,
  User,
  Package,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useSalesOrders, useSalesOrderDetail, SalesOrder } from '@/hooks/useSalesData';
import { useToast } from '@/hooks/use-toast';

export function SalesListTab() {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedDocno, setSelectedDocno] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20;

  // Fetch sales orders with filters
  const { data: allSales, isLoading, error } = useSalesOrders({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  // Fetch selected order detail
  const { data: orderDetail, isLoading: detailLoading } = useSalesOrderDetail(selectedDocno);

  // Filter by customer search (client-side)
  const filteredSales = allSales?.filter(sale => {
    if (!customerSearch) return true;
    const searchLower = customerSearch.toLowerCase();
    return (
      sale.arname?.toLowerCase().includes(searchLower) ||
      sale.arcode?.toLowerCase().includes(searchLower) ||
      sale.docno?.toLowerCase().includes(searchLower) ||
      sale.taxno?.toLowerCase().includes(searchLower)
    );
  }) || [];

  // Pagination
  const totalPages = Math.ceil(filteredSales.length / pageSize);
  const paginatedSales = filteredSales.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  // Format currency
  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '฿0.00';
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const handleRowClick = (sale: SalesOrder) => {
    setSelectedDocno(sale.docno);
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setCustomerSearch('');
    setCurrentPage(0);
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold">📋 รายการขายทั้งหมด</h2>
        <p className="text-sm text-muted-foreground mt-1">
          รายการใบขายจาก CSSALE Database
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="p-4 sm:p-6 pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            ค้นหาและกรอง
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Start Date */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                วันที่เริ่มต้น
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs sm:text-sm"
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                วันที่สิ้นสุด
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs sm:text-sm"
              />
            </div>

            {/* Customer Search */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                <User className="h-3 w-3" />
                ค้นหาลูกค้า/เอกสาร
              </label>
              <Input
                type="text"
                placeholder="ชื่อ, รหัส, เลขที่..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="text-xs sm:text-sm"
              />
            </div>

            {/* Clear Button */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium invisible">Action</label>
              <Button
                onClick={handleClearFilters}
                variant="outline"
                className="w-full text-xs sm:text-sm"
              >
                ล้างตัวกรอง
              </Button>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
            <p className="text-xs sm:text-sm text-muted-foreground">
              พบ <span className="font-semibold text-foreground">{filteredSales.length}</span> รายการ
              {(startDate || endDate || customerSearch) && (
                <span> (กรองจากทั้งหมด {allSales?.length || 0} รายการ)</span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardContent className="p-0">
          {error ? (
            <div className="p-8 sm:p-12 text-center">
              <AlertCircle className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-red-500 mb-4" />
              <p className="text-sm text-red-600">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
              <p className="text-xs text-muted-foreground mt-1">
                {error instanceof Error ? error.message : 'Unknown error'}
              </p>
            </div>
          ) : isLoading ? (
            <div className="p-4 sm:p-6 space-y-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 animate-pulse rounded" />
              ))}
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="p-8 sm:p-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 opacity-20" />
              <p className="text-sm sm:text-base">ไม่พบรายการขาย</p>
              {(startDate || endDate || customerSearch) && (
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
                        onClick={() => handleRowClick(sale)}
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
              {/* Order Header Info */}
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
