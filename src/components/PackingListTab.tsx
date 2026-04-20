/**
 * Packing List Tab - รายการแพคสินค้าตาม TAXDATE
 * แสดงรายการที่ต้องแพคและจัดส่งในแต่ละวัน
 */

// API Configuration - ใช้ environment variable สำหรับ production
const SALES_API_BASE = import.meta.env.VITE_SALES_API_URL || '/api';

import { useState, useMemo, useEffect } from 'react';
import { createAndPickShipments, getShipments, assignOrdersToWorker, getWorkersList } from '@/services/shipmentService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PickingPlanModal } from '@/components/picking/PickingPlanModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Building2,
  Send,
  Truck,
  CheckSquare,
  Users,
  UserPlus
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
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);

  // Task Assignment State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('normal');
  const [isAssigning, setIsAssigning] = useState(false);
  const [workers, setWorkers] = useState<{ email: string; full_name: string }[]>([]);

  // Fetch workers list
  useEffect(() => {
    getWorkersList().then(setWorkers).catch(console.error);
  }, []);

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

  // Order selection helpers
  const toggleOrderSelection = (taxno: string, docno: string) => {
    const key = `${taxno}|${docno}`;
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const selectAllOrders = () => {
    const keys = filteredOrders.map(o => `${o.TAXNO}|${o.DOCNO}`);
    setSelectedOrders(new Set(keys));
  };

  const deselectAllOrders = () => {
    setSelectedOrders(new Set());
  };

  // Send selected orders to staging
  const handleSendToStaging = async () => {
    if (selectedOrders.size === 0) {
      toast({
        title: 'ไม่มีรายการที่เลือก',
        description: 'กรุณาเลือกรายการที่ต้องการส่งไปพักสินค้า',
        variant: 'destructive'
      });
      return;
    }

    setIsSending(true);
    try {
      const ordersToSend = filteredOrders.filter(o =>
        selectedOrders.has(`${o.TAXNO}|${o.DOCNO}`)
      ).map(o => ({
        taxno: o.TAXNO,
        docno: o.DOCNO,
        taxdate: o.TAXDATE,
        arcode: o.ARCODE,
        arname: o.ARNAME,
        total_amount: o.TOTALAMOUNT,
        item_count: o.ITEM_COUNT
      }));

      const result = await createAndPickShipments(ordersToSend, user?.email || 'system');

      toast({
        title: '✅ ส่งไปพักสินค้าสำเร็จ',
        description: `สำเร็จ ${result.success} รายการ${result.failed > 0 ? `, ไม่สำเร็จ ${result.failed} รายการ` : ''}`,
        className: 'bg-green-50 border-green-200'
      });

      setSelectedOrders(new Set());
      refetch();
    } catch (error: any) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message || 'ไม่สามารถส่งไปพักสินค้าได้',
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  };

  // Assign selected orders to worker
  const handleAssignToWorker = async () => {
    if (!selectedWorker) {
      toast({
        title: 'กรุณาเลือกพนักงาน',
        description: 'โปรดเลือกพนักงานที่ต้องการมอบหมายงาน',
        variant: 'destructive'
      });
      return;
    }

    setIsAssigning(true);
    try {
      // Get selected orders data
      const ordersToAssign = filteredOrders.filter(o =>
        selectedOrders.has(`${o.TAXNO}|${o.DOCNO}`)
      ).map(o => ({
        taxno: o.TAXNO,
        docno: o.DOCNO,
        taxdate: o.TAXDATE,
        arcode: o.ARCODE,
        arname: o.ARNAME,
        total_amount: o.TOTALAMOUNT,
        item_count: o.ITEM_COUNT
      }));

      const result = await assignOrdersToWorker(
        ordersToAssign,
        selectedWorker,
        selectedPriority,
        user?.email || 'system'
      );

      if (result.success) {
        const workerName = workers.find(w => w.email === selectedWorker)?.full_name || selectedWorker;
        toast({
          title: '✅ กระจายงานสำเร็จ',
          description: `มอบหมาย ${result.assigned} รายการให้ ${workerName}`,
          className: 'bg-green-50 border-green-200'
        });

        setSelectedOrders(new Set());
        setShowAssignModal(false);
        setSelectedWorker('');
        setSelectedPriority('normal');
      } else {
        toast({
          title: 'เกิดข้อผิดพลาด',
          description: result.message || 'ไม่สามารถกระจายงานได้',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message || 'ไม่สามารถกระจายงานได้',
        variant: 'destructive'
      });
    } finally {
      setIsAssigning(false);
    }
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
        <div className="flex items-center gap-2">
          {selectedOrders.size > 0 && (
            <Button
              onClick={handleSendToStaging}
              disabled={isSending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              ส่งไปพักสินค้า ({selectedOrders.size})
            </Button>
          )}
          {selectedOrders.size > 0 && (
            <Button
              onClick={() => setShowAssignModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              📤 กระจายงาน ({selectedOrders.size})
            </Button>
          )}
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
      </div>

      {/* Selection Toolbar */}
      {filteredOrders.length > 0 && (
        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAllOrders}
            >
              <CheckSquare className="h-4 w-4 mr-1" />
              เลือกทั้งหมด
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={deselectAllOrders}
              disabled={selectedOrders.size === 0}
            >
              ยกเลิกการเลือก
            </Button>
          </div>
          {selectedOrders.size > 0 && (
            <Badge className="bg-purple-100 text-purple-700">
              เลือก {selectedOrders.size} รายการ
            </Badge>
          )}
        </div>
      )}

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
                          <div key={order.DOCNO} className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              className="mt-6 h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                              checked={selectedOrders.has(`${order.TAXNO}|${order.DOCNO}`)}
                              onChange={() => toggleOrderSelection(order.TAXNO, order.DOCNO)}
                            />
                            <Card className="flex-1 border-l-4 border-l-blue-500">
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
                          </div>
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

      {/* Task Assignment Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-indigo-600" />
              📤 กระจายงาน
            </DialogTitle>
            <DialogDescription>
              เลือก {selectedOrders.size} รายการ - มอบหมายให้พนักงานหยิบสินค้า
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Worker Selection */}
            <div className="space-y-2">
              <Label>เลือกพนักงาน</Label>
              <Select value={selectedWorker} onValueChange={setSelectedWorker}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกพนักงานที่ต้องการมอบหมาย" />
                </SelectTrigger>
                <SelectContent>
                  {workers.map(w => (
                    <SelectItem key={w.email} value={w.email}>
                      {w.full_name || w.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority Selection */}
            <div className="space-y-2">
              <Label>ความเร่งด่วน</Label>
              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">🔴 ด่วนมาก (Urgent)</SelectItem>
                  <SelectItem value="high">🟠 ด่วน (High)</SelectItem>
                  <SelectItem value="normal">🟢 ปกติ (Normal)</SelectItem>
                  <SelectItem value="low">⚪ ไม่ด่วน (Low)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Selected Orders Summary */}
            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              <p className="font-medium">รายการที่เลือก:</p>
              <p className="text-gray-600">{selectedOrders.size} รายการ</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignModal(false)}>
              ยกเลิก
            </Button>
            <Button
              onClick={handleAssignToWorker}
              disabled={isAssigning || !selectedWorker}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isAssigning ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              มอบหมายงาน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
};
