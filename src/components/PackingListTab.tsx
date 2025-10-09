/**
 * Packing List Tab - รายการแพคสินค้าตาม TAXDATE
 * แสดงรายการที่ต้องแพคและจัดส่งในแต่ละวัน
 */

// API Configuration - ใช้ /api เสมอเพื่อให้ Vite proxy ทำงาน
const SALES_API_BASE = '/api';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PickingPlanModal } from '@/components/picking/PickingPlanModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Calendar,
  Package,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  FileText,
  User,
  DollarSign,
  MapPin,
  Warehouse,
  Building2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContextSimple';

interface PackingItem {
  LINEID: number;
  PRODUCTCODE: string;
  PRODUCTNAME: string;
  QUANTITY: number;
  UNIT: string;
  UNITPRICE: number;
  NETAMOUNT: number;
}

interface PackingOrder {
  TAXNO: string;
  TAXDATE: string;
  DOCNO: string;
  DOCDATE: string;
  ARCODE: string;
  ARNAME: string;
  TOTALAMOUNT: number;
  CLOSEFLAG: number;
  ITEM_COUNT: number;
  ITEMS: PackingItem[];
}

interface PackingListResponse {
  success: boolean;
  data: PackingOrder[];
  timestamp: string;
}

const fetchPackingList = async (taxDate?: string, search?: string): Promise<PackingListResponse> => {
  const params = new URLSearchParams();
  if (taxDate) params.append('tax_date', taxDate);
  if (search) params.append('search', search);

  const response = await fetch(`${SALES_API_BASE}/sales/packing-list?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch packing list');
  }
  return response.json();
};

export const PackingListTab = () => {
  const { toast } = useToast();
  const { user, hasPermission } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  // Check if user can view prices (Finance permission)
  // ซ่อนมูลค่าทั้งหมดตามคำขอ
  const canViewPrices = false; // user && hasPermission('finance.view');

  // State
  const [selectedDate, setSelectedDate] = useState(today);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [showPickingPlan, setShowPickingPlan] = useState(false);

  // Fetch packing list data
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['packingList', selectedDate, searchTerm],
    queryFn: () => fetchPackingList(selectedDate, searchTerm),
    staleTime: 30000, // 30 seconds
  });

  const packingOrders = useMemo(() => data?.data || [], [data]);

  // Filter by customer (client-side)
  const filteredOrders = useMemo(() => {
    if (!customerFilter) return packingOrders;
    return packingOrders.filter(order =>
      order.ARCODE.toLowerCase().includes(customerFilter.toLowerCase()) ||
      order.ARNAME.toLowerCase().includes(customerFilter.toLowerCase())
    );
  }, [packingOrders, customerFilter]);

  // Get unique customers for dropdown
  const uniqueCustomers = useMemo(() => {
    const customers = new Map<string, string>();
    packingOrders.forEach(order => {
      customers.set(order.ARCODE, order.ARNAME);
    });
    return Array.from(customers.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [packingOrders]);

  // Group orders by TAXNO (using filtered orders)
  const ordersByTaxNo = useMemo(() => {
    const grouped = new Map<string, PackingOrder[]>();
    filteredOrders.forEach(order => {
      const key = order.TAXNO || 'NO_TAXNO';
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(order);
    });
    return grouped;
  }, [filteredOrders]);

  // Product Summary - สรุปรวมสินค้าทั้งหมดที่ต้องแพค
  const productSummary = useMemo(() => {
    const summary = new Map<string, {
      productCode: string;
      productName: string;
      totalQuantity: number;
      unitCode: string;
      orders: number;
    }>();

    filteredOrders.forEach(order => {
      (order.ITEMS || []).forEach((item: any) => {
        const key = item.PRODUCTCODE;
        if (!summary.has(key)) {
          summary.set(key, {
            productCode: item.PRODUCTCODE,
            productName: item.PRODUCTNAME,
            totalQuantity: 0,
            unitCode: item.UNITCODE || '-',
            orders: 0
          });
        }
        const existing = summary.get(key)!;
        existing.totalQuantity += item.QUANTITY || 0;
        existing.orders += 1;
      });
    });

    return Array.from(summary.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [filteredOrders]);

  // Calculate summary (using filtered orders)
  const summary = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalAmount = filteredOrders.reduce((sum, order) => sum + (order.TOTALAMOUNT || 0), 0);
    const totalItems = filteredOrders.reduce((sum, order) => sum + (order.ITEM_COUNT || 0), 0);
    
    // คำนวณจำนวนชิ้นทั้งหมด (รวม QUANTITY)
    const totalQuantity = filteredOrders.reduce((sum, order) => {
      const orderQty = (order.ITEMS || []).reduce((itemSum, item) => itemSum + (item.QUANTITY || 0), 0);
      return sum + orderQty;
    }, 0);
    
    const uniqueCustomers = new Set(filteredOrders.map(o => o.ARCODE)).size;
    const uniqueTaxNos = ordersByTaxNo.size;

    return {
      totalOrders,
      totalAmount,
      totalItems,
      totalQuantity, // จำนวนชิ้นทั้งหมด
      uniqueCustomers,
      uniqueTaxNos
    };
  }, [filteredOrders, ordersByTaxNo]);

  // Quick date filters
  const setToday = () => setSelectedDate(today);
  const setTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow.toISOString().split('T')[0]);
  };

  const formatCurrency = (amount: number | undefined | null) => {
    if (!amount && amount !== 0) return '฿0.00';
    return `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">รายการแพคสินค้า (Packing List)</h2>
            <p className="text-sm text-gray-600 mt-1">
              รายการสินค้าที่ต้องเตรียมแพคและจัดส่งตามวันที่ออกใบกำกับภาษี (TAXDATE)
            </p>
          </div>
          {/* Mode Badge */}
          {canViewPrices ? (
            <Badge className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 text-sm">
              <Building2 className="h-4 w-4 mr-2" />
              💰 โหมดบัญชี
            </Badge>
          ) : (
            <Badge className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 text-sm">
              <Warehouse className="h-4 w-4 mr-2" />
              🏭 โหมดคลัง
            </Badge>
          )}
        </div>
        <Button
          onClick={() => refetch()}
          disabled={isFetching}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          รีเฟรช
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date Filter */}
            <div className="space-y-2">
              <Label>วันที่ออกใบกำกับภาษี (TAXDATE)</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="flex-1"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={setToday} variant="outline" size="sm">
                  วันนี้
                </Button>
                <Button onClick={setTomorrow} variant="outline" size="sm">
                  พรุ่งนี้
                </Button>
              </div>
            </div>

            {/* Search Filter */}
            <div className="space-y-2">
              <Label>ค้นหา</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="TAXNO, DOCNO, ลูกค้า..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Customer Filter */}
            <div className="space-y-2">
              <Label>เลือกลูกค้า</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <select
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">ทุกลูกค้า ({uniqueCustomers.length})</option>
                  {uniqueCustomers.map(([code, name]) => (
                    <option key={code} value={code}>
                      {code} - {(name || '').length > 30 ? (name || '').substring(0, 30) + '...' : (name || '')}
                    </option>
                  ))}
                </select>
              </div>
              {customerFilter && (
                <Button
                  onClick={() => setCustomerFilter('')}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  ล้างตัวกรอง
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className={`grid grid-cols-1 gap-4 ${canViewPrices ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">เอกสารใบกำกับภาษี</p>
                {isLoading ? (
                  <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{summary.uniqueTaxNos}</p>
                )}
              </div>
              <FileText className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">คำสั่งซื้อทั้งหมด</p>
                {isLoading ? (
                  <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{summary.totalOrders}</p>
                )}
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">จำนวนชิ้นทั้งหมด</p>
                {isLoading ? (
                  <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{summary.totalQuantity?.toLocaleString()}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">{summary.totalItems} รายการ</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ลูกค้า</p>
                {isLoading ? (
                  <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{summary.uniqueCustomers}</p>
                )}
              </div>
              <User className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        {/* Show "มูลค่ารวม" ONLY for Finance role */}
        {canViewPrices && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">มูลค่ารวม</p>
                  {isLoading ? (
                    <div className="h-8 w-20 bg-gray-200 animate-pulse rounded mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalAmount)}</p>
                  )}
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Product Summary */}
      {productSummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              สรุปสินค้าที่ต้องแพค ({productSummary.length} รายการ)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">ลำดับ</TableHead>
                    <TableHead className="w-[150px]">รหัสสินค้า</TableHead>
                    <TableHead>ชื่อสินค้า</TableHead>
                    <TableHead className="text-right">จำนวนรวม</TableHead>
                    <TableHead className="text-center">หน่วย</TableHead>
                    <TableHead className="text-center">จำนวน Order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productSummary.map((product, index) => (
                    <TableRow key={product.productCode}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-mono">{product.productCode}</TableCell>
                      <TableCell>{product.productName}</TableCell>
                      <TableCell className="text-right font-bold text-blue-600">
                        {(product.totalQuantity || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{product.unitCode}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge>{product.orders}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex items-center justify-center">
              <Button
                onClick={() => setShowPickingPlan(true)}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                disabled={productSummary.length === 0}
              >
                <MapPin className="h-5 w-5 mr-2" />
                📍 ดูแผนการหยิบสินค้า (Picking Plan)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Picking Plan Modal */}
      <PickingPlanModal
        isOpen={showPickingPlan}
        onClose={() => setShowPickingPlan(false)}
        productSummary={productSummary}
        selectedDate={selectedDate}
      />

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>รายการที่ต้องแพค ({summary.totalOrders} รายการ)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
              <p className="ml-2 text-gray-600">กำลังโหลดข้อมูล...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">เกิดข้อผิดพลาด: {(error as Error).message}</p>
              <Button onClick={() => refetch()} variant="outline" className="mt-4">
                ลองอีกครั้ง
              </Button>
            </div>
          ) : packingOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">ไม่มีรายการที่ต้องแพคในวันนี้</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {Array.from(ordersByTaxNo.entries()).map(([taxNo, orders]) => {
                const totalAmount = orders.reduce((sum, o) => sum + o.TOTALAMOUNT, 0);
                const totalItems = orders.reduce((sum, o) => sum + o.ITEM_COUNT, 0);
                const customer = orders[0];

                return (
                  <AccordionItem value={taxNo} key={taxNo}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-4">
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <FileText className="h-5 w-5 text-blue-500" />
                              <p className="font-semibold text-lg">{taxNo}</p>
                              <Badge variant="outline" className="ml-2">
                                {orders.length} คำสั่งซื้อ
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {customer.ARCODE} - {customer.ARNAME}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {/* Show price ONLY for Finance role */}
                          {canViewPrices && (
                            <p className="font-semibold text-green-600">
                              {formatCurrency(totalAmount)}
                            </p>
                          )}
                          <p className="text-xs text-gray-500">
                            {totalItems} รายการสินค้า
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-4">
                        {orders.map((order) => (
                          <Card key={order.DOCNO} className="border-l-4 border-l-blue-500">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold">เอกสาร: {order.DOCNO}</p>
                                  <p className="text-sm text-gray-600">
                                    วันที่: {formatDate(order.DOCDATE)} |
                                    ใบกำกับภาษี: {formatDate(order.TAXDATE)}
                                  </p>
                                </div>
                                <div className="text-right">
                                  {/* Show price ONLY for Finance role */}
                                  {canViewPrices && (
                                    <p className="font-semibold text-green-600">
                                      {formatCurrency(order.TOTALAMOUNT)}
                                    </p>
                                  )}
                                  <Badge variant={order.CLOSEFLAG === 1 ? 'default' : 'secondary'}>
                                    {order.CLOSEFLAG === 1 ? 'ปิดแล้ว' : 'เปิดอยู่'}
                                  </Badge>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-[100px]">รหัสสินค้า</TableHead>
                                    <TableHead>ชื่อสินค้า</TableHead>
                                    <TableHead className="text-right">จำนวน</TableHead>
                                    <TableHead>หน่วย</TableHead>
                                    {/* Show price columns ONLY for Finance role */}
                                    {canViewPrices && (
                                      <>
                                        <TableHead className="text-right">ราคา/หน่วย</TableHead>
                                        <TableHead className="text-right">มูลค่า</TableHead>
                                      </>
                                    )}
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {(order.ITEMS || []).map((item) => (
                                    <TableRow key={item.LINEID}>
                                      <TableCell className="font-mono">
                                        {item.PRODUCTCODE}
                                      </TableCell>
                                      <TableCell>{item.PRODUCTNAME}</TableCell>
                                      <TableCell className="text-right font-semibold">
                                        {(item.QUANTITY || 0).toLocaleString()}
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="outline">{item.UNIT || '-'}</Badge>
                                      </TableCell>
                                      {/* Show price columns ONLY for Finance role */}
                                      {canViewPrices && (
                                        <>
                                          <TableCell className="text-right">
                                            {formatCurrency(item.UNITPRICE)}
                                          </TableCell>
                                          <TableCell className="text-right font-semibold">
                                            {formatCurrency(item.NETAMOUNT)}
                                          </TableCell>
                                        </>
                                      )}
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
