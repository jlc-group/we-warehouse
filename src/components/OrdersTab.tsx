import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Plus,
  Eye,
  Edit,
  ShoppingCart,
  Loader2,
  RefreshCw,
  Calendar,
  User,
  Package,
  AlertCircle,
  UserPlus,
  Download,
  RotateCcw
} from 'lucide-react';
import { useOrders, useUpdateOrderStatus, getOrderStatusLabel, getOrderStatusColor, orderStatusOptions, orderTypeOptions, priorityOptions } from '@/hooks/useOrder';
import { useCustomers } from '@/hooks/useCustomer';
import { OrderDetailModal } from '@/components/OrderDetailModal';
import { OutboundOrderModal } from '@/components/OutboundOrderModal';
import { EditOrderModal } from '@/components/EditOrderModal';
import { OrderStatusCards } from '@/components/OrderStatusCards';
import { WorkingModeSelector } from '@/components/WorkingModeSelector';
import { EmptyOrderStateWithCount } from '@/components/EmptyOrderState';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
  }).format(amount);
};

const getStatusBadge = (status: string) => {
  const statusColor = getOrderStatusColor(status);
  const statusLabel = getOrderStatusLabel(status);

  const colorClasses = {
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
  };

  return (
    <Badge
      variant="outline"
      className={colorClasses[statusColor as keyof typeof colorClasses] || colorClasses.gray}
    >
      {statusLabel}
    </Badge>
  );
};

const getPriorityBadge = (priority: string) => {
  const priorityOption = priorityOptions.find(p => p.value === priority);
  if (!priorityOption) return null;

  const colorClasses = {
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    red: 'bg-red-50 text-red-600 border-red-200',
  };

  return (
    <Badge
      variant="outline"
      size="sm"
      className={colorClasses[priorityOption.color as keyof typeof colorClasses] || colorClasses.gray}
    >
      {priorityOption.label}
    </Badge>
  );
};

export const OrdersTab = () => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('orders');
  const [workingMode, setWorkingMode] = useState<'select_items' | 'select_delivered'>('select_items');

  const { data: orders = [], isLoading, error, refetch } = useOrders();
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const updateOrderStatus = useUpdateOrderStatus();

  console.log('📊 Orders data:', orders);
  console.log('⏳ Loading:', isLoading);
  console.log('❌ Error:', error);

  // Filter and search logic
  // Calculate order statistics
  const orderStats = {
    total: orders.length,
    confirmed: orders.filter(o => o.status === 'CONFIRMED').length,
    preparing: orders.filter(o => ['PROCESSING', 'PACKED'].includes(o.status || '')).length,
    delivered: orders.filter(o => o.status === 'DELIVERED').length,
  };

  const filteredOrders = orders.filter(order => {
    const orderNumber = order.order_number?.toLowerCase() || '';
    const customerName = order.customers?.customer_name?.toLowerCase() || '';
    const customerCode = order.customers?.customer_code?.toLowerCase() || '';
    const customerId = order.customer_id?.toLowerCase() || '';

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      orderNumber.includes(searchLower) ||
      customerName.includes(searchLower) ||
      customerCode.includes(searchLower) ||
      customerId.includes(searchLower);

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || order.priority === priorityFilter;
    const matchesCustomer = customerFilter === 'all' || order.customer_id === customerFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesCustomer;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setCustomerFilter('all');
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateOrderStatus.mutateAsync({
        orderId,
        status: newStatus
      });

      const order = orders.find(o => o.id === orderId);
      toast.success(`อัปเดตสถานะใบสั่งซื้อ ${order?.order_number} สำเร็จ`);
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    }
  };

  const handleViewOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsViewModalOpen(true);
  };

  const handleEditOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsEditModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setSelectedOrderId(null);
    setIsViewModalOpen(false);
  };

  const handleCloseEditModal = () => {
    setSelectedOrderId(null);
    setIsEditModalOpen(false);
  };

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold text-red-600 mb-2">เกิดข้อผิดพลาดในการโหลดข้อมูล</h3>
            <p className="text-gray-600 mb-4">{error.message}</p>
            <Button onClick={() => refetch()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              ลองใหม่
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg p-6 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-800">จัดการใบสั่งซื้อ & การส่งออก</h1>
          <p className="text-sm text-gray-500">จัดการใบสั่งซื้อของลูกค้า และเลือกสินค้าจากคลังสินค้าต่างๆ เพื่อการส่งออก</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-2 text-blue-600 font-medium px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            <span>เพิ่มลูกค้า</span>
          </Button>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow"
          >
            <Plus className="w-5 h-5" />
            <span>สร้างใบสั่งซื้อ</span>
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <OrderStatusCards stats={orderStats} isLoading={isLoading} />

      {/* Working Mode Selector */}
      <WorkingModeSelector
        onModeChange={setWorkingMode}
        defaultMode={workingMode}
      />

      {/* Tabs and Main Content */}
      <div className="mt-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-gray-200 mb-6">
            <TabsList className="h-auto p-0 bg-transparent">
              <TabsTrigger
                value="orders"
                className="inline-block p-4 text-sm font-semibold data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=inactive]:text-gray-500 hover:text-gray-700"
              >
                รายการใบสั่งซื้อ
              </TabsTrigger>
              <TabsTrigger
                value="create"
                className="inline-block p-4 text-sm font-semibold data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=inactive]:text-gray-500 hover:text-gray-700"
              >
                สร้างใบสั่งซื้อใหม่
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="orders" className="space-y-4 mt-0">
            {/* Filters */}
            <div className="space-y-4">
              <div className="flex items-center space-x-4 text-gray-600 text-sm font-medium">
                <h3 className="font-semibold">ตัวกรอง</h3>
                <div className="flex items-center space-x-2">
                  <span>ลูกค้า</span>
                  <Select value={customerFilter} onValueChange={setCustomerFilter}>
                    <SelectTrigger className="p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <SelectValue placeholder="ลูกค้าทั้งหมด" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ลูกค้าทั้งหมด</SelectItem>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.customer_name} ({customer.customer_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <span>สถานะ</span>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <SelectValue placeholder="ทุกสถานะ" />
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
                <div className="relative flex-grow">
                  <Input
                    type="text"
                    placeholder="เลขที่ใบสั่งซื้อ, ชื่อลูกค้า..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                <div className="flex items-center space-x-2 whitespace-nowrap">
                  <span>การดำเนินการ</span>
                  <Button
                    onClick={clearFilters}
                    variant="outline"
                    className="px-4 py-2 border rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    ล้าง
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-white text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors border"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </div>

          {/* Orders Table */}
            {/* Order List or Empty State */}
            {!isLoading && filteredOrders.length === 0 ? (
              <EmptyOrderStateWithCount
                count={orders.length}
                onCreateOrder={() => setIsCreateModalOpen(true)}
                title={orders.length === 0 ? "ไม่พบใบสั่งซื้อ" : "ไม่พบใบสั่งซื้อที่ตรงกับการค้นหา"}
                description={orders.length === 0 ? "เริ่มต้นสร้างใบสั่งซื้อของคุณ" : "ลองเปลี่ยนคำค้นหาหรือตัวกรอง"}
                showCreateButton={orders.length === 0}
              />
            ) : (
              <div className="mt-6">
                {/* Order Table */}
                <ScrollArea className="h-[600px]">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span className="ml-2">กำลังโหลดข้อมูล...</span>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>เลขที่ใบสั่งซื้อ</TableHead>
                          <TableHead>ลูกค้า</TableHead>
                          <TableHead>สถานะ</TableHead>
                          <TableHead>ความสำคัญ</TableHead>
                          <TableHead>วันที่สั่งซื้อ</TableHead>
                          <TableHead className="text-right">จำนวนเงิน</TableHead>
                          <TableHead className="text-center">การจัดการ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.map((order) => (
                          <TableRow key={order.id} className="hover:bg-gray-50">
                            <TableCell className="font-mono font-medium">
                              {order.order_number || 'ไม่ระบุ'}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {order.customers?.customer_name || `Customer ID: ${order.customer_id?.substring(0, 8)}...`}
                                </span>
                                {order.customers?.customer_code && (
                                  <span className="text-sm text-gray-500">
                                    {order.customers.customer_code}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(order.status || 'DRAFT')}
                            </TableCell>
                            <TableCell>
                              {getPriorityBadge(order.priority || 'NORMAL')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                {order.order_date
                                  ? new Date(order.order_date).toLocaleDateString('th-TH')
                                  : order.created_at
                                    ? new Date(order.created_at).toLocaleDateString('th-TH')
                                    : 'ไม่ระบุ'
                                }
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(order.final_amount || order.total_amount || 0)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewOrder(order.id)}
                                  title="ดูรายละเอียด"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditOrder(order.id)}
                                  title="แก้ไขใบสั่งซื้อ"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Select
                                  value={order.status || 'DRAFT'}
                                  onValueChange={(value) => handleUpdateOrderStatus(order.id, value)}
                                  disabled={updateOrderStatus.isPending}
                                >
                                  <SelectTrigger className="w-[100px] h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {orderStatusOptions.map((status) => (
                                      <SelectItem key={status.value} value={status.value}>
                                        <div className="flex items-center gap-2">
                                          <div className={`w-2 h-2 rounded-full bg-${status.color}-500`}></div>
                                          {status.label}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </div>
            )}

            {/* Order Count Summary */}
            {filteredOrders.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-800">
                  ใบสั่งซื้อ ({filteredOrders.length.toLocaleString()} รายการ)
                </h3>
              </div>
            )}
          </TabsContent>

          <TabsContent value="create" className="mt-0">
            <div className="text-center py-12">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">สร้างใบสั่งซื้อใหม่</h3>
                <p className="text-sm text-gray-500 mb-6">เลือกลูกค้าและสินค้าเพื่อสร้างใบสั่งซื้อ</p>
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  เริ่มสร้างใบสั่งซื้อ
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <OutboundOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <OrderDetailModal
        isOpen={isViewModalOpen}
        onClose={handleCloseViewModal}
        orderId={selectedOrderId}
      />

      <EditOrderModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        orderId={selectedOrderId}
      />
    </div>
  );
};