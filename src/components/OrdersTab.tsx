import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ShoppingCart,
  Plus,
  Search,
  Package,
  User,
  Calendar,
  Truck,
  Eye,
  Edit3,
  X,
  Filter,
  Download,
  AlertCircle,
  MapPin,
  Grid3X3,
  List,
  CheckSquare
} from 'lucide-react';
import { useOrders, useOrderStats, getOrderStatusLabel, getOrderStatusColor, orderStatusOptions } from '@/hooks/useOrder';
import { useCustomers } from '@/hooks/useCustomer';
import { useWarehouses } from '@/hooks/useWarehouse';
import { useInventory } from '@/hooks/useInventory';
import { CustomerSelector } from '@/components/CustomerSelector';
import { CompactWarehouseSelector } from '@/components/WarehouseSelector';
import { OutboundOrderModal } from '@/components/OutboundOrderModal';
import { CustomerModal } from '@/components/CustomerModal';
import { OrderDetailModal } from '@/components/OrderDetailModal';
import { EditOrderModal } from '@/components/EditOrderModal';
import { ShelfGrid } from '@/components/ShelfGrid';
import type { InventoryItem } from '@/hooks/useInventory';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';
import { toast } from 'sonner';
import { normalizeLocation, locationsEqual } from '@/utils/locationUtils';

interface OrdersTabProps {
  selectedWarehouseId?: string;
  preSelectedItems?: InventoryItem[];
}

type OrderMode = 'standard' | 'location-picking';

export function OrdersTab({ selectedWarehouseId, preSelectedItems = [] }: OrdersTabProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isOrderDetailModalOpen, setIsOrderDetailModalOpen] = useState(false);
  const [isEditOrderModalOpen, setIsEditOrderModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderMode, setOrderMode] = useState<OrderMode>('standard');
  const [selectedItemsForOrder, setSelectedItemsForOrder] = useState<InventoryItem[]>([]);
  const [activeTab, setActiveTab] = useState('orders');

  // Data fetching
  const { data: orders, isLoading: ordersLoading } = useOrders(selectedCustomerId, selectedWarehouseId);
  const { data: orderStats } = useOrderStats(selectedCustomerId, selectedWarehouseId);
  const { data: customers } = useCustomers();
  const { data: warehouses } = useWarehouses();
  const { items: inventoryItems, loading: inventoryLoading } = useInventory(selectedWarehouseId);

  // Filter orders
  const filteredOrders = orders?.filter(order => {
    if (selectedStatus && order.status !== selectedStatus) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        order.order_number.toLowerCase().includes(search) ||
        order.customers?.customer_name.toLowerCase().includes(search) ||
        order.customers?.customer_code.toLowerCase().includes(search) ||
        (order.customer_po_number && order.customer_po_number.toLowerCase().includes(search))
      );
    }
    return true;
  }) || [];

  // Stats cards data
  const statsCards = [
    {
      title: 'ใบสั่งซื้อทั้งหมด',
      value: orderStats?.totalOrders || 0,
      subtitle: `฿${(orderStats?.totalAmount || 0).toLocaleString()}`,
      icon: ShoppingCart,
      color: 'blue'
    },
    {
      title: 'ยืนยันแล้ว',
      value: orderStats?.confirmed || 0,
      subtitle: 'รอจัดเตรียม',
      icon: Package,
      color: 'green'
    },
    {
      title: 'กำลังจัดเตรียม',
      value: orderStats?.processing || 0,
      subtitle: 'กำลังดำเนินการ',
      icon: Truck,
      color: 'yellow'
    },
    {
      title: 'ส่งมอบแล้ว',
      value: orderStats?.delivered || 0,
      subtitle: 'เสร็จสิ้น',
      icon: Package,
      color: 'purple'
    }
  ];

  // Filter inventory items for current warehouse
  const warehouseInventoryItems = useMemo(() => {
    if (!inventoryItems) return [];
    if (!selectedWarehouseId) return inventoryItems;

    // Include items that match the selected warehouse OR have no warehouse assigned
    const filtered = inventoryItems.filter(item =>
      item.warehouse_id === selectedWarehouseId ||
      !item.warehouse_id ||
      item.warehouse_id === null
    );

    console.log('🏭 Warehouse filtering:', {
      selectedWarehouseId,
      totalItems: inventoryItems.length,
      filteredItems: filtered.length,
      itemsWithWarehouse: inventoryItems.filter(i => i.warehouse_id === selectedWarehouseId).length,
      itemsWithoutWarehouse: inventoryItems.filter(i => !i.warehouse_id || i.warehouse_id === null).length
    });

    return filtered;
  }, [inventoryItems, selectedWarehouseId]);

  // Handle location selection for order creation
  const handleLocationSelection = (location: string, item?: InventoryItem) => {
    console.log('🔍 handleLocationSelection called:', {
      orderMode,
      location,
      warehouseItemsCount: warehouseInventoryItems.length,
      isLocationPicking: orderMode === 'location-picking',
      totalInventoryItems: inventoryItems?.length || 0,
      selectedWarehouseId,
      sampleItems: warehouseInventoryItems.slice(0, 3).map(i => ({
        id: i.id,
        location: i.location,
        product_name: i.product_name,
        warehouse_id: i.warehouse_id
      }))
    });

    if (orderMode === 'location-picking') {
      console.log('🔍 Location selection:', {
        inputLocation: location,
        normalizedInput: normalizeLocation(location),
        warehouseItems: warehouseInventoryItems.length
      });

      // Get all items in this location using proper location comparison
      const locationItems = warehouseInventoryItems.filter(i => {
        const match = locationsEqual(i.location, location);
        if (match) {
          console.log('✅ Found item:', {
            itemLocation: i.location,
            normalizedItem: normalizeLocation(i.location),
            productName: i.product_name
          });
        }
        return match;
      });

      if (locationItems.length > 0) {
        // If location has items, toggle selection for all items in location
        const allSelected = locationItems.every(locationItem =>
          selectedItemsForOrder.some(selectedItem => selectedItem.id === locationItem.id)
        );

        if (allSelected) {
          // Remove all items from this location
          setSelectedItemsForOrder(prev =>
            prev.filter(selectedItem =>
              !locationItems.some(locationItem => locationItem.id === selectedItem.id)
            )
          );
          toast.success(`ยกเลิกการเลือกสินค้าจากตำแหน่ง ${location}`, {
            description: `ยกเลิกแล้ว ${locationItems.length} รายการ`,
            duration: 2000,
          });
        } else {
          // Add all unselected items from this location
          const newItems = locationItems.filter(locationItem =>
            !selectedItemsForOrder.some(selectedItem => selectedItem.id === locationItem.id)
          );
          setSelectedItemsForOrder(prev => [...prev, ...newItems]);
          toast.success(`เลือกสินค้าจากตำแหน่ง ${location}`, {
            description: `เลือกแล้ว ${newItems.length} รายการ`,
            duration: 2000,
          });
        }
      } else {
        // Location is empty - show info message
        toast.info(`ตำแหน่ง ${location} ไม่มีสินค้า`, {
          description: 'ไม่สามารถเลือกสินค้าจากตำแหน่งว่างได้',
          duration: 2000,
        });
      }
    } else {
      // Standard behavior - open item modal
      // This could open an item details modal or add/edit modal
    }
  };

  const handleCreateOrderFromSelection = () => {
    if (selectedItemsForOrder.length > 0) {
      setIsOrderModalOpen(true);
    }
  };

  const clearSelection = () => {
    setSelectedItemsForOrder([]);
  };

  const toggleOrderMode = (mode: OrderMode) => {
    console.log('🔄 toggleOrderMode:', { from: orderMode, to: mode, warehouseItemsCount: warehouseInventoryItems.length });
    setOrderMode(mode);
    if (mode !== 'location-picking') {
      clearSelection();
    }
  };

  const handleViewOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsOrderDetailModalOpen(true);
  };

  const handleEditOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsEditOrderModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">จัดการใบสั่งซื้อจากลูกค้า</h2>
          <p className="text-muted-foreground">
            จัดการคำสั่งขายจากลูกค้า เลือกสินค้าจากคลัง และตัดสต็อก
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsCustomerModalOpen(true)}
            className="flex items-center gap-2"
          >
            <User className="h-4 w-4" />
            เพิ่มลูกค้า
          </Button>

          <Button
            onClick={() => {
              if (orderMode === 'location-picking' && selectedItemsForOrder.length > 0) {
                handleCreateOrderFromSelection();
              } else {
                setIsOrderModalOpen(true);
              }
            }}
            className="flex items-center gap-2"
            disabled={selectedItemsForOrder.length === 0}
          >
            <Plus className="h-4 w-4" />
            {selectedItemsForOrder.length > 0
              ? `สร้างใบสั่งซื้อ (${selectedItemsForOrder.length} รายการ)`
              : 'สร้างใบสั่งซื้อ'
            }
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">
                    {stat.subtitle}
                  </p>
                </div>
                <stat.icon className={`h-8 w-8 text-${stat.color}-600`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Order Mode Selection */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Package className="h-4 w-4" />
                โหมดการทำงาน
              </h3>
              {orderMode === 'location-picking' && selectedItemsForOrder.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  ล้างการเลือก ({selectedItemsForOrder.length})
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant={orderMode === 'standard' ? 'default' : 'outline'}
                onClick={() => toggleOrderMode('standard')}
                className="flex items-center gap-2 h-auto p-4 flex-col"
              >
                <List className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-medium">เลือกจากรายการ</div>
                  <div className="text-xs opacity-70">ค้นหาและเลือกสินค้าจากรายการ</div>
                </div>
              </Button>

              <Button
                variant={orderMode === 'location-picking' ? 'default' : 'outline'}
                onClick={() => toggleOrderMode('location-picking')}
                className="flex items-center gap-2 h-auto p-4 flex-col"
              >
                <MapPin className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-medium">เลือกจากแผนผังคลัง</div>
                  <div className="text-xs opacity-70">เลือกสินค้าจากตำแหน่งในแผนผังคลัง</div>
                </div>
              </Button>
            </div>

            {orderMode === 'location-picking' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-800">
                  <MapPin className="h-4 w-4" />
                  <span className="font-medium">โหมดเลือกจากแผนผังคลัง</span>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  ไปที่แท็บ "แผนผังคลัง" แล้วคลิกที่ตำแหน่งที่มีสินค้าเพื่อเลือกสินค้าสำหรับคำสั่งขาย
                  รายการที่เลือกแล้ว: <span className="font-medium">{selectedItemsForOrder.length}</span> รายการ
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 bg-white border border-gray-200">
          <TabsTrigger value="orders">รายการใบสั่งซื้อ</TabsTrigger>
          <TabsTrigger value="warehouse">สร้างคำสั่งขายใหม่</TabsTrigger>
        </TabsList>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                ตัวกรอง
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>ลูกค้า</Label>
                  <CustomerSelector
                    selectedCustomerId={selectedCustomerId}
                    onCustomerChange={setSelectedCustomerId}
                    showAllOption={true}
                    showAddButton={false}
                  />
                </div>

                <div className="space-y-2">
                  <Label>สถานะ</Label>
                  <Select value={selectedStatus || 'all'} onValueChange={(value) => setSelectedStatus(value === 'all' ? undefined : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกสถานะ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทุกสถานะ</SelectItem>
                      {orderStatusOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full bg-${status.color}-500`} />
                            {status.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>ค้นหา</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="เลขที่ใบสั่งซื้อ, ชื่อลูกค้า..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>การดำเนินการ</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedCustomerId(undefined);
                        setSelectedStatus(undefined);
                        setSearchTerm('');
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      ล้าง
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Export
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Orders List */}
          <Card>
            <CardHeader>
              <CardTitle>
                ใบสั่งซื้อ ({filteredOrders.length} รายการ)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">กำลังโหลด...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/50" />
                  <p className="mt-2 text-muted-foreground">ไม่พบใบสั่งซื้อ</p>
                  <p className="text-sm text-muted-foreground">
                    {orders?.length === 0 ? 'เริ่มต้นสร้างใบสั่งซื้อแรกของคุณ' : 'ลองปรับเงื่อนไขการค้นหา'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map((order) => (
                    <div key={order.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="font-medium text-lg">{order.order_number}</div>
                            <Badge
                              variant="outline"
                              className={`bg-${getOrderStatusColor(order.status || 'DRAFT')}-50 text-${getOrderStatusColor(order.status || 'DRAFT')}-700 border-${getOrderStatusColor(order.status || 'DRAFT')}-200`}
                            >
                              {getOrderStatusLabel(order.status || 'DRAFT')}
                            </Badge>
                            {order.priority === 'HIGH' && (
                              <Badge variant="destructive" className="text-xs">
                                เร่งด่วน
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>
                                {order.customers?.customer_name} ({order.customers?.customer_code})
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {formatDistanceToNow(new Date(order.created_at), {
                                  addSuffix: true,
                                  locale: th
                                })}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              <span>฿{(order.final_amount || 0).toLocaleString()}</span>
                            </div>
                          </div>

                          {order.due_date && (
                            <div className="mt-2 text-sm">
                              <span className="text-muted-foreground">กำหนดส่ง: </span>
                              <span className={new Date(order.due_date) < new Date() ? 'text-red-600 font-medium' : 'text-gray-900'}>
                                {new Date(order.due_date).toLocaleDateString('th-TH')}
                              </span>
                              {new Date(order.due_date) < new Date() && (
                                <AlertCircle className="inline h-4 w-4 ml-1 text-red-600" />
                              )}
                            </div>
                          )}

                          {order.customer_po_number && (
                            <div className="mt-1 text-sm text-muted-foreground">
                              PO: {order.customer_po_number}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewOrder(order.id)}
                            title="ดูรายละเอียด"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            title="แก้ไข"
                            onClick={() => handleEditOrder(order.id)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        {/* Create New Order Tab */}
        <TabsContent value="warehouse" className="space-y-4">
          {inventoryLoading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-muted-foreground">กำลังโหลดข้อมูลสินค้า...</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Step Instructions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    สร้างคำสั่งขายใหม่
                    {selectedWarehouseId && warehouses && (
                      <Badge variant="outline">
                        {warehouses.find(w => w.id === selectedWarehouseId)?.name || 'คลังหลัก'}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p><strong>ขั้นตอนที่ 1:</strong> เลือกวิธีการเลือกสินค้า (เลือกจากรายการ หรือ เลือกจากแผนผังคลัง)</p>
                    <p><strong>ขั้นตอนที่ 2:</strong> เลือกสินค้าที่ต้องการสำหรับใบสั่งซื้อ</p>
                    <p><strong>ขั้นตอนที่ 3:</strong> กดปุ่ม "สร้างใบสั่งซื้อ" เมื่อเลือกสินค้าเสร็จแล้ว</p>
                    <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                      <p className="text-blue-700">
                        <strong>สินค้าทั้งหมดในคลัง:</strong> {warehouseInventoryItems.length} รายการ
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Selected Items Summary (when in location-picking mode) */}
              {orderMode === 'location-picking' && selectedItemsForOrder.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckSquare className="h-5 w-5" />
                      รายการที่เลือก ({selectedItemsForOrder.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2 max-h-48 overflow-y-auto">
                      {selectedItemsForOrder.map((item, index) => (
                        <div key={item.id} className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">{item.product_name}</div>
                            <div className="text-sm text-muted-foreground">
                              ตำแหน่ง: {item.location} | รหัส: {item.sku}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedItemsForOrder(prev => prev.filter((_, i) => i !== index));
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button
                        onClick={handleCreateOrderFromSelection}
                        className="flex items-center gap-2"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        สร้างใบสั่งซื้อจากรายการที่เลือก
                      </Button>
                      <Button
                        variant="outline"
                        onClick={clearSelection}
                      >
                        ล้างการเลือก
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Selected Items Summary (for both modes) */}
              {selectedItemsForOrder.length > 0 && (
                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckSquare className="h-5 w-5 text-green-600" />
                      รายการที่เลือก ({selectedItemsForOrder.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid gap-2 max-h-32 overflow-y-auto">
                        {selectedItemsForOrder.map((item, index) => (
                          <div key={item.id} className="flex items-center justify-between bg-white p-2 rounded border">
                            <div className="flex-1">
                              <div className="font-medium text-sm">{item.product_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {item.sku} | {item.location}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedItemsForOrder(prev => prev.filter((_, i) => i !== index));
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            if (selectedItemsForOrder.length > 0) {
                              setIsOrderModalOpen(true);
                            }
                          }}
                          className="flex items-center gap-2"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          สร้างใบสั่งซื้อ ({selectedItemsForOrder.length} รายการ)
                        </Button>
                        <Button
                          variant="outline"
                          onClick={clearSelection}
                        >
                          ล้างการเลือก
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Selection Method Content */}
              {orderMode === 'standard' ? (
                /* Product List Selection */
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <List className="h-5 w-5" />
                      เลือกสินค้าจากรายการ
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Search and Filter */}
                      <div className="flex gap-4">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                          <Input
                            placeholder="ค้นหาสินค้าตามชื่อหรือรหัส..."
                            className="pl-10"
                          />
                        </div>
                        <Button variant="outline">
                          <Filter className="h-4 w-4 mr-2" />
                          ฟิลเตอร์
                        </Button>
                      </div>

                      {/* Product List */}
                      <div className="border rounded-lg max-h-96 overflow-y-auto">
                        {warehouseInventoryItems.length > 0 ? (
                          <div className="divide-y">
                            {warehouseInventoryItems.slice(0, 10).map((item) => (
                              <div key={item.id} className="p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="font-medium">{item.product_name}</div>
                                    <div className="text-sm text-muted-foreground">
                                      รหัส: {item.sku} | ตำแหน่ง: {item.location}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      คลัง: {item.unit_level1_quantity || 0} ลัง, {item.unit_level2_quantity || 0} เศษ
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      const existingIndex = selectedItemsForOrder.findIndex(selectedItem => selectedItem.id === item.id);
                                      if (existingIndex >= 0) {
                                        setSelectedItemsForOrder(prev => prev.filter((_, index) => index !== existingIndex));
                                      } else {
                                        setSelectedItemsForOrder(prev => [...prev, item]);
                                      }
                                    }}
                                    variant={selectedItemsForOrder.some(selectedItem => selectedItem.id === item.id) ? "default" : "outline"}
                                  >
                                    {selectedItemsForOrder.some(selectedItem => selectedItem.id === item.id) ? "ยกเลิก" : "เลือก"}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-8 text-center text-muted-foreground">
                            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>ไม่พบสินค้าในคลังนี้</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                /* Warehouse Map Selection */
                <div className="space-y-4">
                  {/* Order Mode Indicator for Warehouse Map */}
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 bg-blue-500 rounded-full animate-pulse"></div>
                        <div>
                          <div className="font-medium text-blue-800">โหมดเลือกสินค้าจากแผนผังคลัง</div>
                          <div className="text-sm text-blue-700">
                            คลิกที่ตำแหน่งที่มีสินค้าเพื่อเลือกสินค้าทั้งหมดในตำแหน่งนั้นสำหรับใบสั่งซื้อ
                            {selectedItemsForOrder.length > 0 && (
                              <span className="ml-2 font-semibold">
                                (เลือกแล้ว {selectedItemsForOrder.length} รายการ)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <ShelfGrid
                    items={warehouseInventoryItems}
                    onShelfClick={handleLocationSelection}
                    onQRCodeClick={(location) => {
                      // Handle QR code functionality if needed
                      console.log('QR clicked for location:', location);
                    }}
                    selectedItems={selectedItemsForOrder}
                    isOrderMode={orderMode === 'location-picking'}
                  />
                </div>
              )}
            </div>
          )}
        </TabsContent>

      </Tabs>

      {/* Floating Action Button */}
      {selectedItemsForOrder.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => setIsOrderModalOpen(true)}
            size="lg"
            className="h-16 w-16 rounded-full shadow-2xl hover:shadow-xl transition-all duration-200 bg-green-600 hover:bg-green-700 text-white flex flex-col items-center justify-center p-0"
          >
            <ShoppingCart className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">{selectedItemsForOrder.length}</span>
          </Button>
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold">
            {selectedItemsForOrder.length}
          </div>
        </div>
      )}

      {/* Modals */}
      <OutboundOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => {
          setIsOrderModalOpen(false);
          if (orderMode === 'location-picking') {
            clearSelection();
          }
        }}
        preSelectedItems={(() => {
          const items = selectedItemsForOrder.length > 0 ? selectedItemsForOrder : preSelectedItems;
          console.log('🛒 Sending to OutboundOrderModal:', {
            selectedItemsForOrderCount: selectedItemsForOrder.length,
            preSelectedItemsCount: preSelectedItems.length,
            finalItemsCount: items.length,
            orderMode,
            items: items.slice(0, 3).map(i => ({ id: i.id, product_name: i.product_name }))
          });
          return items;
        })()}
        preSelectedCustomerId={selectedCustomerId}
        preSelectedWarehouseId={selectedWarehouseId}
      />

      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        mode="create"
      />

      <OrderDetailModal
        isOpen={isOrderDetailModalOpen}
        onClose={() => {
          setIsOrderDetailModalOpen(false);
          setSelectedOrderId(null);
        }}
        orderId={selectedOrderId}
      />

      <EditOrderModal
        isOpen={isEditOrderModalOpen}
        onClose={() => {
          setIsEditOrderModalOpen(false);
          setSelectedOrderId(null);
        }}
        orderId={selectedOrderId}
      />
    </div>
  );
}

export default OrdersTab;