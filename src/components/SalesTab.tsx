import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  FileText,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  ShoppingCart,
  Users,
  Calculator,
  TrendingUp,
  Package,
  RefreshCw
} from 'lucide-react';
import { SalesOrderModal } from '@/components/SalesOrderModal';
import { ProductSearchDebugPanel } from '@/components/ProductSearchDebugPanel';
import { SalesSystemEmergencyDashboard } from '@/components/SalesSystemEmergencyDashboard';
import { useSalesOrders, useSalesOrderStats, formatOrderStatus, formatPaymentStatus, getOrderStatusColor, getPaymentStatusColor } from '@/hooks/useSalesOrders';
import { useActiveCustomers } from '@/hooks/useCustomers';
import { useEmergencyFallback } from '@/components/EmergencyFallback';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/sonner';
import { emergencyReset, clearReactQueryCache } from '@/utils/debugUtils';
import { runCustomerDebugTest, clearCustomerMockDataFlags } from '@/utils/customerDebugUtils';

export const SalesTab = () => {
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const queryClient = useQueryClient();

  // Fetch data
  const { data: orders = [], isLoading: ordersLoading, error: ordersError } = useSalesOrders({
    search: searchTerm,
    limit: 50,
  });
  const { data: customers = [], isLoading: customersLoading, error: customersError } = useActiveCustomers();
  const { data: stats } = useSalesOrderStats();

  // Check for database connectivity issues
  const { shouldShowFallback, isDatabaseError } = useEmergencyFallback(
    customersError || ordersError
  );

  const handleCreateOrder = () => {
    setIsCreateOrderModalOpen(true);
  };

  const handleOrderCreated = (order: any) => {
    toast.success('สร้างใบสั่งซื้อเรียบร้อยแล้ว', {
      description: `เลขที่: ${order.order_number || 'กำลังสร้าง...'}`
    });
  };

  const handleViewOrder = (order: any) => {
    // TODO: Navigate to order detail page or open view modal
    toast.info('ดูรายละเอียดใบสั่งซื้อ', {
      description: `เลขที่: ${order.order_number}`
    });
  };

  const handleEditOrder = (order: any) => {
    setSelectedOrder(order);
    setIsCreateOrderModalOpen(true);
  };

  const handleForceRefresh = async () => {
    setIsRefreshing(true);

    try {
      // ขั้นตอนที่ 1: ตรวจสอบข้อมูลลูกค้าจริงก่อน
      console.log('🔄 Force refreshing Sales system data...');
      console.log('🔍 Step 1: Checking real customer data...');

      const customerDebugResult = await runCustomerDebugTest();

      if (customerDebugResult.success && customerDebugResult.customerCount > 0) {
        console.log(`🎉 Found ${customerDebugResult.customerCount} real customers in database!`);

        toast.success('พบข้อมูลลูกค้าจริงในฐานข้อมูล!', {
          description: `พบลูกค้า ${customerDebugResult.customerCount} รายการ - กำลังล้างแคชเพื่อใช้ข้อมูลจริง`,
          duration: 5000
        });
      } else {
        console.warn('⚠️ No real customer data found or connection issues');

        toast.warning('ไม่พบข้อมูลลูกค้าจริง', {
          description: 'กำลังตรวจสอบปัญหาการเชื่อมต่อฐานข้อมูล',
          duration: 5000
        });
      }

      // ขั้นตอนที่ 2: ล้าง localStorage flags ที่บังคับใช้ mock data
      console.log('🧹 Step 2: Clearing mock data flags...');
      clearCustomerMockDataFlags();

      // ขั้นตอนที่ 3: ล้าง cache และ localStorage อื่นๆ
      console.log('🗑️ Step 3: Emergency reset...');
      const debugInfo = await emergencyReset();

      // ขั้นตอนที่ 4: ล้าง React Query cache
      console.log('♻️ Step 4: Clearing React Query cache...');
      const keysToInvalidate = clearReactQueryCache();

      // Invalidate all sales-related queries
      keysToInvalidate.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });

      // Also invalidate specific queries that might be cached
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['available-products-for-sales'] });

      // Clear success flags to allow new success messages
      localStorage.removeItem('customers_loaded_success_shown');

      toast.success('รีเฟรชข้อมูลเรียบร้อย', {
        description: 'ล้างแคชและโหลดข้อมูลใหม่แล้ว กำลัง reload หน้า...',
        duration: 3000
      });

      // Force refresh the page to ensure clean state
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Error during force refresh:', error);
      toast.error('เกิดข้อผิดพลาดในการรีเฟรช', {
        description: 'กรุณาลองใหม่อีกครั้ง'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // ฟังก์ชันสำหรับ debug ข้อมูลลูกค้าแยกต่างหาก
  const handleDebugCustomers = async () => {
    console.log('🔍 Running customer debug test...');

    const result = await runCustomerDebugTest();

    if (result.success && result.customerCount > 0) {
      toast.success('พบข้อมูลลูกค้าจริง!', {
        description: `มีลูกค้า ${result.customerCount} รายการในฐานข้อมูล`,
        duration: 5000
      });
    } else {
      toast.error('ไม่พบข้อมูลลูกค้าจริง', {
        description: result.errors.length > 0 ? result.errors[0] : 'ตรวจสอบ console สำหรับรายละเอียด',
        duration: 5000
      });
    }
  };

  // If there are database connectivity issues, show the emergency dashboard
  if (shouldShowFallback && isDatabaseError) {
    return <SalesSystemEmergencyDashboard />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            ระบบขาย (Sales)
          </h2>
          <p className="text-muted-foreground mt-1">
            จัดการใบสั่งซื้อ ลูกค้า และการขาย
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleDebugCustomers}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Debug ลูกค้า
          </Button>
          <Button
            onClick={handleForceRefresh}
            disabled={isRefreshing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'กำลังรีเฟรช...' : 'Force Refresh'}
          </Button>
          <Button onClick={handleCreateOrder} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            สร้างใบสั่งซื้อใหม่
          </Button>
        </div>
      </div>

      {/* Debug Panel */}
      <ProductSearchDebugPanel className="mb-4" />

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">ใบสั่งซื้อทั้งหมด</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">ร่าง</p>
                  <p className="text-2xl font-bold">{stats.draft}</p>
                </div>
                <Edit className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">ยืนยันแล้ว</p>
                  <p className="text-2xl font-bold">{stats.confirmed}</p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">จัดส่งเสร็จ</p>
                  <p className="text-2xl font-bold">{stats.delivered}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">ยอดขายเดือนนี้</p>
                  <p className="text-2xl font-bold">
                    ฿{stats.monthlyRevenue.toLocaleString()}
                  </p>
                </div>
                <Calculator className="h-8 w-8 text-emerald-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            ใบสั่งซื้อ
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            ลูกค้า
          </TabsTrigger>
        </TabsList>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="ค้นหาใบสั่งซื้อ ลูกค้า หรือเลขที่..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  กรองข้อมูล
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Orders Table */}
          <Card>
            <CardHeader>
              <CardTitle>รายการใบสั่งซื้อ</CardTitle>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="text-center py-8">กำลังโหลดข้อมูล...</div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>ยังไม่มีใบสั่งซื้อ</p>
                  <p className="text-sm">เริ่มต้นโดยการสร้างใบสั่งซื้อใหม่</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>เลขที่</TableHead>
                        <TableHead>ลูกค้า</TableHead>
                        <TableHead>วันที่</TableHead>
                        <TableHead>ยอดรวม</TableHead>
                        <TableHead>สถานะ</TableHead>
                        <TableHead>การชำระ</TableHead>
                        <TableHead className="text-right">จัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            {order.order_number}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{order.customer_name}</div>
                              {order.customer_phone && (
                                <div className="text-sm text-muted-foreground">
                                  {order.customer_phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(order.order_date).toLocaleDateString('th-TH')}
                          </TableCell>
                          <TableCell>
                            ฿{order.total_amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={getOrderStatusColor(order.status)}
                            >
                              {formatOrderStatus(order.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={getPaymentStatusColor(order.payment_status)}
                            >
                              {formatPaymentStatus(order.payment_status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewOrder(order)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditOrder(order)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>รายการลูกค้า</CardTitle>
            </CardHeader>
            <CardContent>
              {customersLoading ? (
                <div className="text-center py-8">กำลังโหลดข้อมูล...</div>
              ) : customers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>ยังไม่มีข้อมูลลูกค้า</p>
                  <p className="text-sm">ลูกค้าจะถูกสร้างอัตโนมัติเมื่อสร้างใบสั่งซื้อ</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customers.map((customer) => (
                    <Card key={customer.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-4">
                        <div className="space-y-2">
                          <h4 className="font-medium">{customer.name}</h4>
                          {customer.company_name && customer.company_name !== customer.name && (
                            <p className="text-sm text-muted-foreground">{customer.company_name}</p>
                          )}
                          {customer.phone && (
                            <p className="text-sm text-muted-foreground">{customer.phone}</p>
                          )}
                          {customer.email && (
                            <p className="text-sm text-muted-foreground">{customer.email}</p>
                          )}
                          <div className="flex items-center justify-between pt-2">
                            <Badge variant="outline">
                              วงเงิน: ฿{(customer.credit_limit || 0).toLocaleString()}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              {customers.length > 0 && (
                <div className="text-center mt-4 text-sm text-muted-foreground">
                  แสดงลูกค้าทั้งหมด {customers.length} รายการ
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sales Order Modal */}
      <SalesOrderModal
        isOpen={isCreateOrderModalOpen}
        onOpenChange={setIsCreateOrderModalOpen}
        onOrderCreated={handleOrderCreated}
        initialCustomer={null}
      />
    </div>
  );
};

export default SalesTab;