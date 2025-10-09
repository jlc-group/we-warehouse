/**
 * External Sales Tab - แสดงข้อมูลจาก CSSALE และ CSSALESUB (SQL Server External DB)
 */

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Database,
  Search,
  Eye,
  Calendar,
  DollarSign,
  User,
  FileText,
  RefreshCw,
  Download,
  Filter,
  X,
  Package
} from 'lucide-react';
import { useExternalSalesOrders, useExternalSalesSummary } from '@/hooks/useExternalSalesOrders';
import { ExternalSalesDetailsModal } from '@/components/ExternalSalesDetailsModal';
import type { CSSale } from '@/services/salesOrderService';

export const ExternalSalesTab = () => {
  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [closedFilter, setClosedFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);

  // Modal state
  const [selectedDocno, setSelectedDocno] = useState<string | undefined>();
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Fetch data with filters
  const { data, isLoading, error, refetch, isFetching } = useExternalSalesOrders({
    page: currentPage,
    limit: pageSize,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    arcode: customerFilter || undefined,
    department: departmentFilter !== 'all' ? departmentFilter : undefined,
    closeflag: closedFilter !== 'all' ? closedFilter : undefined,
    search: searchTerm || undefined,
    sort_by: 'DOCDATE',
    order: 'DESC',
  });

  const sales = data?.data || [];
  const pagination = data?.pagination;

  // Fetch summary data (ข้อมูลจริงทั้งหมด - ไม่จำกัดด้วย pagination)
  const summaryParams = useMemo(() => {
    // Only fetch summary if we have at least one filter active
    if (!dateFrom && !dateTo && !customerFilter && !searchTerm && departmentFilter === 'all' && closedFilter === 'all') {
      return undefined;
    }
    return {
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      arcode: customerFilter || undefined,
      department: departmentFilter !== 'all' ? departmentFilter : undefined,
      salecode: undefined,
      closeflag: closedFilter !== 'all' ? closedFilter : undefined,
      search: searchTerm || undefined,
    };
  }, [dateFrom, dateTo, customerFilter, departmentFilter, closedFilter, searchTerm]);

  const { data: summaryData, isLoading: summaryLoading } = useExternalSalesSummary(summaryParams);

  // Quick date filters
  const setToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setDateFrom(today);
    setDateTo(today);
  };

  const setThisWeek = () => {
    const today = new Date();
    const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
    const lastDay = new Date(today.setDate(today.getDate() - today.getDay() + 6));
    setDateFrom(firstDay.toISOString().split('T')[0]);
    setDateTo(lastDay.toISOString().split('T')[0]);
  };

  const setThisMonth = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    setDateFrom(firstDay.toISOString().split('T')[0]);
    setDateTo(lastDay.toISOString().split('T')[0]);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setCustomerFilter('');
    setDepartmentFilter('all');
    setClosedFilter('all');
    setCurrentPage(1);
  };

  const handleViewDetails = (docno: string) => {
    setSelectedDocno(docno);
    setDetailModalOpen(true);
  };

  const handleCloseModal = () => {
    setDetailModalOpen(false);
    setSelectedDocno(undefined);
  };

  const handleExport = () => {
    // TODO: Implement Excel export
    console.log('Export to Excel:', sales);
  };

  // Use summary from API (ข้อมูลจริงทั้งหมด) หรือ fallback ไปคำนวณจาก sales ที่แสดงในหน้านี้
  const summary = useMemo(() => {
    if (summaryData?.data) {
      // ใช้ข้อมูล Summary จาก API (ข้อมูลจริงทั้งหมดตาม filter)
      return {
        totalAmount: summaryData.data.totalSales,
        totalOrders: summaryData.data.totalOrders,
        totalCustomers: summaryData.data.totalCustomers,
        totalItems: summaryData.data.totalItems,
        fromAPI: true, // Flag เพื่อบอกว่าข้อมูลมาจาก API
      };
    }

    // Fallback: คำนวณจากข้อมูลที่แสดงในหน้านี้ (pagination.total ถ้ามี)
    const totalAmount = sales.reduce((sum, sale) => sum + (sale.TOTALAMOUNT || 0), 0);
    const totalOrders = pagination?.total || sales.length;
    const totalCustomers = new Set(sales.map(s => s.ARCODE)).size;
    const totalItems = sales.reduce((sum, sale) => sum + ((sale as any).ITEM_COUNT || 0), 0);

    return {
      totalAmount,
      totalOrders,
      totalCustomers,
      totalItems,
      fromAPI: false,
    };
  }, [summaryData, sales, pagination]);

  const formatCurrency = (value: number | null) => {
    if (!value) return '฿0';
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: Date | null | string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Database className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            ไม่สามารถเชื่อมต่อกับฐานข้อมูลภายนอก
          </h3>
          <p className="text-gray-600 mb-4">
            {error.message || 'กรุณาตรวจสอบการเชื่อมต่อกับ SQL Server Backend'}
          </p>
          <Button onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            ลองใหม่
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="space-y-2">
        {summary.fromAPI && (
          <p className="text-xs text-green-600 font-medium">
            ✓ ข้อมูลจริงทั้งหมด (ทุกหน้า) ตามเงื่อนไขที่เลือก
          </p>
        )}
        {!summary.fromAPI && pagination && pagination.total > sales.length && (
          <p className="text-xs text-amber-600 font-medium">
            ⚠️ แสดงเฉพาะข้อมูลในหน้านี้ ({sales.length} จาก {pagination.total} รายการ) - เลือกช่วงเวลาเพื่อดูสรุปทั้งหมด
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">เอกสารทั้งหมด</p>
                  {summaryLoading ? (
                    <div className="h-8 w-20 bg-gray-200 animate-pulse rounded mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-gray-900">{summary.totalOrders.toLocaleString()}</p>
                  )}
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">มูลค่ารวม</p>
                  {summaryLoading ? (
                    <div className="h-8 w-32 bg-gray-200 animate-pulse rounded mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalAmount)}</p>
                  )}
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">ลูกค้า</p>
                  {summaryLoading ? (
                    <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-gray-900">{summary.totalCustomers.toLocaleString()}</p>
                  )}
                </div>
                <User className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">รายการสินค้า</p>
                  {summaryLoading ? (
                    <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-gray-900">{summary.totalItems.toLocaleString()}</p>
                  )}
                </div>
                <Package className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            ตัวกรอง
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <Label htmlFor="search">ค้นหา</Label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  id="search"
                  placeholder="เลขที่เอกสาร, ลูกค้า..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Date From */}
            <div>
              <Label htmlFor="dateFrom">วันที่เริ่มต้น</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            {/* Date To */}
            <div>
              <Label htmlFor="dateTo">วันที่สิ้นสุด</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="status">สถานะ</Label>
              <Select value={closedFilter} onValueChange={setClosedFilter}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="N">เปิดอยู่</SelectItem>
                  <SelectItem value="Y">ปิดแล้ว</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={setToday}>
              <Calendar className="h-4 w-4 mr-1" />
              วันนี้
            </Button>
            <Button variant="outline" size="sm" onClick={setThisWeek}>
              <Calendar className="h-4 w-4 mr-1" />
              สัปดาห์นี้
            </Button>
            <Button variant="outline" size="sm" onClick={setThisMonth}>
              <Calendar className="h-4 w-4 mr-1" />
              เดือนนี้
            </Button>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              ล้างตัวกรอง
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
              รีเฟรช
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" />
              Export Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              รายการเอกสารขาย (External Database)
            </div>
            {pagination && (
              <div className="text-sm font-normal text-gray-600">
                แสดง {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, pagination.total)} จาก {pagination.total} รายการ
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              กำลังโหลดข้อมูล...
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              ไม่พบข้อมูลเอกสารขาย
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เลขที่เอกสาร</TableHead>
                    <TableHead>วันที่</TableHead>
                    <TableHead>ลูกค้า</TableHead>
                    <TableHead>ชื่อลูกค้า</TableHead>
                    <TableHead className="text-center">จำนวนรายการ</TableHead>
                    <TableHead className="text-right">ยอดรวม</TableHead>
                    <TableHead className="text-right">ส่วนลด</TableHead>
                    <TableHead className="text-right">ภาษี</TableHead>
                    <TableHead className="text-right">สุทธิ</TableHead>
                    <TableHead className="text-center">สถานะ</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.DOCNO}>
                      <TableCell className="font-medium">{sale.DOCNO}</TableCell>
                      <TableCell>{formatDate(sale.DOCDATE)}</TableCell>
                      <TableCell>{sale.ARCODE}</TableCell>
                      <TableCell className="max-w-xs truncate">{sale.ARNAME || '-'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono">
                          {(sale as any).ITEM_COUNT || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(sale.SUMAMOUNT1)}</TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatCurrency((sale.DISCAMOUNT || 0) + (sale.DISCAMOUNT2 || 0))}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(sale.TAXAMOUNT)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(sale.TOTALAMOUNT)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={sale.CLOSEFLAG === 'Y' ? 'secondary' : 'default'}>
                          {sale.CLOSEFLAG === 'Y' ? 'ปิดแล้ว' : 'เปิดอยู่'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(sale.DOCNO)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    หน้า {currentPage} จาก {pagination.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1 || isLoading}
                    >
                      ก่อนหน้า
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                      disabled={currentPage === pagination.totalPages || isLoading}
                    >
                      ถัดไป
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      {selectedDocno && (
        <ExternalSalesDetailsModal
          docno={selectedDocno}
          open={detailModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};
