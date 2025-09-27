import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import {
  ShoppingCart,
  Package,
  ClipboardCheck,
  Truck,
  Layers,
  Search,
  Filter,
  RefreshCcw,
  Download,
  Users,
  LucideIcon
} from 'lucide-react';
import {
  useOrders,
  getOrderStatusLabel,
  getOrderStatusColor,
  orderStatusOptions,
} from '@/hooks/useOrder';
import { CustomerSelector } from '@/components/CustomerSelector';
import { OutboundOrderModal } from '@/components/OutboundOrderModal';
import { EditOrderModal } from '@/components/EditOrderModal';
import { OrderDetailModal } from '@/components/OrderDetailModal';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';
import { toast } from 'sonner';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);

type SummaryCardProps = {
  title: string;
  value: number | string;
  description?: string;
  icon: LucideIcon;
  accentColor: string;
};

const statusColorClasses: Record<string, string> = {
  gray: 'bg-slate-100 text-slate-700 border-slate-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  yellow: 'bg-amber-50 text-amber-700 border-amber-200',
  purple: 'bg-violet-50 text-violet-700 border-violet-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  red: 'bg-rose-50 text-rose-700 border-rose-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
};

function SummaryCard({ title, value, description, icon: Icon, accentColor }: SummaryCardProps) {
  return (
    <Card className="border border-slate-200 bg-white shadow-sm">
      <CardContent className="p-5 flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-semibold text-slate-900">{value}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <div className={`rounded-full p-3 ${accentColor} text-white`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function PurchaseOrdersPage() {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMode, setActiveMode] = useState<'orders' | 'plan'>('orders');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data: orders = [], isLoading, error } = useOrders();

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesCustomer = selectedCustomerId ? order.customer_id === selectedCustomerId : true;
      const matchesStatus = statusFilter === 'all' ? true : order.status === statusFilter;
      const needle = searchTerm.trim().toLowerCase();
      const matchesSearch = needle
        ? order.order_number?.toLowerCase().includes(needle) ||
          order.customers?.customer_name?.toLowerCase().includes(needle) ||
          order.customers?.customer_code?.toLowerCase().includes(needle)
        : true;

      return matchesCustomer && matchesStatus && matchesSearch;
    });
  }, [orders, selectedCustomerId, statusFilter, searchTerm]);

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const confirmed = orders.filter((order) => order.status === 'CONFIRMED').length;
    const preparing = orders.filter((order) => ['PROCESSING', 'PACKED'].includes(order.status || '')).length;
    const delivered = orders.filter((order) => order.status === 'DELIVERED').length;

    return {
      totalOrders,
      confirmed,
      preparing,
      delivered,
    };
  }, [orders]);

  const renderStatusBadge = (status?: string | null) => {
    const safeStatus = status || 'DRAFT';
    const colorKey = getOrderStatusColor(safeStatus);
    const colorClass = statusColorClasses[colorKey] || statusColorClasses.gray;

    return (
      <Badge variant="outline" className={`border ${colorClass}`}>
        {getOrderStatusLabel(safeStatus)}
      </Badge>
    );
  };

  const handleViewOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsViewModalOpen(true);
  };

  const handleEditOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsEditModalOpen(true);
  };

  const resetFilters = () => {
    setSelectedCustomerId(undefined);
    setStatusFilter('all');
    setSearchTerm('');
  };

  const exportOrders = () => {
    toast.info('ฟีเจอร์ส่งออกจะพร้อมใช้งานเร็ว ๆ นี้');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">จัดการใบสั่งขาย &amp; การส่งออก</h1>
            <p className="text-sm text-muted-foreground">
              จัดการใบสั่งขายของลูกค้า และเลือกสินค้าในคลังสำหรับตำแหน่งต่าง ๆ เพื่อการส่งออก
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => toast.info('ฟีเจอร์เพิ่มลูกค้ายังไม่พร้อมใช้งาน')}>
              เพิ่มลูกค้า
            </Button>
            <Button onClick={() => setIsCreateModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              + สร้างใบสั่งขาย
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="ใบสั่งขายทั้งหมด"
            value={stats.totalOrders}
            description={`ทั้งหมด ${filteredOrders.length} รายการที่ตรงกับตัวกรอง`}
            icon={ShoppingCart}
            accentColor="bg-blue-500"
          />
          <SummaryCard
            title="ยืนยันแล้ว"
            value={stats.confirmed}
            description="อัปเดตล่าสุดจาก Supabase"
            icon={ClipboardCheck}
            accentColor="bg-emerald-500"
          />
          <SummaryCard
            title="กำลังเตรียม"
            value={stats.preparing}
            description="กำลังดำเนินการจัดเตรียมสินค้า"
            icon={Package}
            accentColor="bg-amber-500"
          />
          <SummaryCard
            title="ส่งมอบแล้ว"
            value={stats.delivered}
            description="ส่งมอบให้ลูกค้าเรียบร้อย"
            icon={Truck}
            accentColor="bg-purple-500"
          />
        </div>

        {/* Work mode section */}
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              <Tabs value={activeMode} onValueChange={(value) => setActiveMode(value as 'orders' | 'plan')} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1">
                  <TabsTrigger
                    value="orders"
                    className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      <span>เลือกรายการคำสั่งขาย</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    value="plan"
                    className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      <span>เลือกจากแผนจัดส่ง</span>
                    </div>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <p className="text-sm text-muted-foreground">
                เลือกรูปแบบการทำงานที่ต้องการเพื่อเริ่มต้นจัดการใบสั่งขาย และติดตามสถานะในระบบแบบเรียลไทม์
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              รายการใบสั่งขาย ({filteredOrders.length} รายการ)
            </h2>
            <Button onClick={() => setIsCreateModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              + สร้างใบสั่งขายใหม่
            </Button>
          </div>

          {/* Filters */}
          <Card className="border border-slate-200 bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="h-4 w-4" />
                ตัวกรอง
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                <div className="xl:col-span-5">
                  <Label className="text-sm font-medium text-slate-700">ลูกค้า</Label>
                  <div className="mt-2">
                    <CustomerSelector
                      selectedCustomerId={selectedCustomerId}
                      onCustomerChange={setSelectedCustomerId}
                      showAddButton
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="xl:col-span-3">
                  <Label className="text-sm font-medium text-slate-700">สถานะ</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="เลือกสถานะ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทุกสถานะ</SelectItem>
                      {orderStatusOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="xl:col-span-4">
                  <Label className="text-sm font-medium text-slate-700">ค้นหาใบสั่งขาย</Label>
                  <div className="mt-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        placeholder="ค้นหาเลขที่ใบสั่งขาย, ชื่อลูกค้า..."
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  ปรับแต่งผลลัพธ์ด้วยตัวกรองด้านบน หรือกดล้างตัวกรองเพื่อเริ่มต้นใหม่
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetFilters}>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    ล้างตัวกรอง
                  </Button>
                  <Button variant="outline" onClick={exportOrders}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Orders List */}
          <Card className="border border-slate-200 bg-white">
            <CardContent className="p-0">
              {error ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <Users className="h-12 w-12 text-red-400" />
                  <p className="text-base font-semibold text-red-600">ไม่สามารถโหลดข้อมูลใบสั่งขายได้</p>
                  <p className="text-sm text-muted-foreground">{error.message}</p>
                  <Button variant="outline" onClick={resetFilters}>
                    ลองใหม่
                  </Button>
                </div>
              ) : isLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                  <p>กำลังโหลดรายการใบสั่งขาย...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
                  <ShoppingCart className="h-14 w-14" />
                  <p className="text-lg font-semibold text-slate-800">ไม่พบใบสั่งขาย</p>
                  <p className="text-sm">เริ่มต้นสร้างใบสั่งขายใหม่หรือปรับตัวกรองเพื่อค้นหารายการ</p>
                  <Button onClick={() => setIsCreateModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                    + สร้างใบสั่งขาย
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[520px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-slate-100/80 backdrop-blur">
                      <TableRow>
                        <TableHead className="w-[160px]">เลขที่ใบสั่งขาย</TableHead>
                        <TableHead>ลูกค้า</TableHead>
                        <TableHead>สถานะ</TableHead>
                        <TableHead>วันที่สั่งขาย</TableHead>
                        <TableHead className="text-right">จำนวนเงิน</TableHead>
                        <TableHead className="text-center">การดำเนินการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => (
                        <TableRow key={order.id} className="hover:bg-slate-50">
                          <TableCell className="font-mono text-sm font-semibold text-slate-700">
                            {order.order_number || 'ไม่ระบุ'}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-900">
                                {order.customers?.customer_name || '(ไม่พบข้อมูลลูกค้า)'}
                              </span>
                              {order.customers?.customer_code && (
                                <span className="text-xs text-muted-foreground">
                                  {order.customers.customer_code}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {renderStatusBadge(order.status)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-slate-700">
                              {order.order_date
                                ? new Date(order.order_date).toLocaleDateString('th-TH')
                                : order.created_at
                                ? new Date(order.created_at).toLocaleDateString('th-TH')
                                : 'ไม่ระบุ'}
                              {order.created_at && (
                                <p className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: th })}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-slate-900">
                            {formatCurrency(order.final_amount || order.total_amount || 0)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleViewOrder(order.id)}>
                                ดูรายละเอียด
                              </Button>
                              <Button size="sm" variant="secondary" onClick={() => handleEditOrder(order.id)}>
                                แก้ไข
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <OutboundOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        preSelectedCustomerId={selectedCustomerId}
      />
      <EditOrderModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} orderId={selectedOrderId} />
      <OrderDetailModal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} orderId={selectedOrderId} />
    </div>
  );
}
