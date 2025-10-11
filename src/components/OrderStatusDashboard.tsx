import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  Filter,
  Eye,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  TrendingUp,
  Calendar,
  Package,
  DollarSign,
  BarChart3,
  FileText,
  History,
  Settings,
  User,
  Shield
} from 'lucide-react';
import {
  useClearableOrders,
  useOrderStatusHistory,
  useBillClearingPermissions,
  useGrantBillClearingPermission,
  getOrderStatusColor,
  getOrderStatusLabel,
  getPermissionTypeLabel,
  hasPermission,
  type ClearableOrder
} from '@/hooks/useBillClearing';
import { useCustomers } from '@/hooks/useCustomer';
import { useWarehouses } from '@/hooks/useWarehouse';
import { BillClearingModal } from '@/components/BillClearingModal';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContextSimple';

interface OrderStatusDashboardProps {
  userRole?: 'bill_clearer' | 'bill_checker' | 'bill_approver' | 'bill_manager';
}

type FilterOptions = {
  status: string;
  customerId: string;
  warehouseId: string;
  isCleared: string;
  search: string;
};

export function OrderStatusDashboard({ userRole }: OrderStatusDashboardProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('clearable');
  const [selectedOrder, setSelectedOrder] = useState<ClearableOrder | null>(null);
  const [isClearingModalOpen, setIsClearingModalOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    customerId: 'all',
    warehouseId: 'all',
    isCleared: 'all',
    search: '',
  });

  // Hooks
  const { data: permissions = [] } = useBillClearingPermissions(user?.id);
  const { data: customers = [] } = useCustomers();
  const { data: warehouses = [] } = useWarehouses();
  const { data: statusHistory = [] } = useOrderStatusHistory(undefined, 50);
  const grantPermission = useGrantBillClearingPermission();

  // Build filters for API query
  const apiFilters = useMemo(() => {
    const result: any = {};
    if (filters.status !== 'all') result.status = filters.status;
    if (filters.customerId !== 'all') result.customerId = filters.customerId;
    if (filters.warehouseId !== 'all') result.warehouseId = filters.warehouseId;
    if (filters.isCleared === 'true') result.isCleared = true;
    if (filters.isCleared === 'false') result.isCleared = false;
    return result;
  }, [filters]);

  const { data: clearableOrders = [] } = useClearableOrders(apiFilters);

  // Filter orders by search term
  const filteredOrders = useMemo(() => {
    if (!filters.search) return clearableOrders;
    const searchTerm = filters.search.toLowerCase();
    return clearableOrders.filter(
      (order) =>
        order.order_number.toLowerCase().includes(searchTerm) ||
        order.customer_name?.toLowerCase().includes(searchTerm) ||
        order.customer_code?.toLowerCase().includes(searchTerm)
    );
  }, [clearableOrders, filters.search]);

  // User permissions
  const canClear = hasPermission(permissions, 'bill_clearer');
  const canCheck = hasPermission(permissions, 'bill_checker') || canClear;
  const canApprove = hasPermission(permissions, 'bill_approver');
  const canManage = hasPermission(permissions, 'bill_manager');

  // Statistics
  const stats = useMemo(() => {
    const total = filteredOrders.length;
    const cleared = filteredOrders.filter(o => o.is_cleared).length;
    const pending = filteredOrders.filter(o => !o.is_cleared && o.status !== 'cancelled').length;
    const overdue = filteredOrders.filter(o => !o.is_cleared && (o.days_since_created || 0) > 30).length;
    const totalAmount = filteredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const clearedAmount = filteredOrders
      .filter(o => o.is_cleared)
      .reduce((sum, o) => sum + (o.cleared_amount || 0), 0);

    return {
      total,
      cleared,
      pending,
      overdue,
      totalAmount,
      clearedAmount,
      pendingAmount: totalAmount - clearedAmount,
    };
  }, [filteredOrders]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    }).format(amount);
  };

  const handleViewOrder = (order: ClearableOrder) => {
    setSelectedOrder(order);
    setIsClearingModalOpen(true);
  };

  const handleClearOrder = (order: ClearableOrder) => {
    if (!canClear) return;
    setSelectedOrder(order);
    setIsClearingModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">จัดการสถานะบิลขาย</h2>
          <p className="text-muted-foreground">
            ระบบเคลียร์บิลและตรวจสอบสถานะแบบแยกสิทธิ์การทำงาน
          </p>
        </div>
        <div className="flex items-center gap-2">
          {permissions.map((permission) => (
            <Badge key={permission.id} className="bg-blue-100 text-blue-800">
              <Shield className="h-3 w-3 mr-1" />
              {getPermissionTypeLabel(permission.permission_type)}
            </Badge>
          ))}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">บิลทั้งหมด</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.totalAmount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">เคลียร์แล้ว</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.cleared}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.clearedAmount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">รอเคลียร์</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.pendingAmount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">เกินกำหนด</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">
              &gt;30 วัน
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            ตัวกรอง
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <Label htmlFor="search">ค้นหา</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="เลขที่บิล, ลูกค้า..."
                  className="pl-8"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">สถานะ</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="completed">เสร็จสิ้น</SelectItem>
                  <SelectItem value="delivered">ส่งถึงแล้ว</SelectItem>
                  <SelectItem value="cleared">เคลียร์แล้ว</SelectItem>
                  <SelectItem value="cancelled">ยกเลิก</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="customer">ลูกค้า</Label>
              <Select value={filters.customerId} onValueChange={(value) => setFilters(prev => ({ ...prev, customerId: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.customer_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="warehouse">คลัง</Label>
              <Select value={filters.warehouseId} onValueChange={(value) => setFilters(prev => ({ ...prev, warehouseId: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  {warehouses.map(warehouse => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="cleared">การเคลียร์</Label>
              <Select value={filters.isCleared} onValueChange={(value) => setFilters(prev => ({ ...prev, isCleared: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="false">ยังไม่เคลียร์</SelectItem>
                  <SelectItem value="true">เคลียร์แล้ว</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col justify-end">
              <Button
                variant="outline"
                onClick={() => setFilters({
                  status: 'all',
                  customerId: 'all',
                  warehouseId: 'all',
                  isCleared: 'all',
                  search: '',
                })}
              >
                ล้างตัวกรอง
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="clearable" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            บิลที่ต้องเคลียร์
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            ประวัติการเปลี่ยนสถานะ
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            จัดการสิทธิ์
          </TabsTrigger>
        </TabsList>

        {/* Clearable Orders Tab */}
        <TabsContent value="clearable" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>รายการบิลขาย ({filteredOrders.length})</span>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {canClear && <Badge className="bg-green-100 text-green-800">สามารถเคลียร์บิลได้</Badge>}
                  {canCheck && <Badge className="bg-blue-100 text-blue-800">สามารถตรวจสอบได้</Badge>}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>เลขที่บิล</TableHead>
                      <TableHead>ลูกค้า</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>จำนวนเงิน</TableHead>
                      <TableHead>วันที่สร้าง</TableHead>
                      <TableHead>การเคลียร์</TableHead>
                      <TableHead>การดำเนินการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">{order.order_number}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.customer_name}</p>
                            <p className="text-sm text-muted-foreground">{order.customer_code}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getOrderStatusColor(order.status)}>
                            {getOrderStatusLabel(order.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(order.total_amount || 0)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p>{new Date(order.created_at).toLocaleDateString('th-TH')}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: th })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {order.is_cleared ? (
                            <div>
                              <Badge className="bg-green-100 text-green-800 mb-1">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                เคลียร์แล้ว
                              </Badge>
                              {order.cleared_at && (
                                <p className="text-xs text-muted-foreground">
                                  {new Date(order.cleared_at).toLocaleDateString('th-TH')}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <Badge className="bg-yellow-100 text-yellow-800">
                                <Clock className="h-3 w-3 mr-1" />
                                รอเคลียร์
                              </Badge>
                              {order.days_since_created && order.days_since_created > 30 && (
                                <Badge className="bg-red-100 text-red-800">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  เกิน {Math.floor(order.days_since_created)} วัน
                                </Badge>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewOrder(order)}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              ดู
                            </Button>
                            {canClear && !order.is_cleared && (
                              <Button
                                size="sm"
                                onClick={() => handleClearOrder(order)}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <CreditCard className="h-3 w-3 mr-1" />
                                เคลียร์
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Status History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-4 w-4" />
                ประวัติการเปลี่ยนสถานะ (50 รายการล่าสุด)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>เลขที่บิล</TableHead>
                      <TableHead>ลูกค้า</TableHead>
                      <TableHead>การเปลี่ยนแปลง</TableHead>
                      <TableHead>ผู้ดำเนินการ</TableHead>
                      <TableHead>วันเวลา</TableHead>
                      <TableHead>หมายเหตุ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statusHistory.map((history) => (
                      <TableRow key={history.id}>
                        <TableCell className="font-mono text-sm">{history.order_number}</TableCell>
                        <TableCell>{history.customer_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {history.from_status && (
                              <Badge className={getOrderStatusColor(history.from_status)}>
                                {getOrderStatusLabel(history.from_status)}
                              </Badge>
                            )}
                            <span>→</span>
                            <Badge className={getOrderStatusColor(history.to_status)}>
                              {getOrderStatusLabel(history.to_status)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {history.changed_by_name || 'ระบบ'}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p>{new Date(history.changed_at).toLocaleString('th-TH')}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(history.changed_at), { addSuffix: true, locale: th })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{history.reason || '-'}</p>
                          {history.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{history.notes}</p>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                จัดการสิทธิ์การเคลียร์บิล
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!canManage ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">ไม่มีสิทธิ์จัดการ</h3>
                  <p className="text-muted-foreground">
                    คุณไม่มีสิทธิ์ในการจัดการสิทธิ์การเคลียร์บิล
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    ส่วนนี้สามารถพัฒนาต่อเพื่อจัดการสิทธิ์ผู้ใช้
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Bill Clearer</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground">สิทธิ์เคลียร์บิลขาย</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Bill Checker</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground">สิทธิ์ตรวจสอบสถานะบิล</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Bill Approver</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground">สิทธิ์อนุมัติบิลก่อนเคลียร์</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Bill Manager</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground">สิทธิ์จัดการระบบบิลทั้งหมด</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bill Clearing Modal */}
      <BillClearingModal
        open={isClearingModalOpen}
        onClose={() => {
          setIsClearingModalOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        canClear={canClear}
      />
    </div>
  );
}