import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Search, Package, Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { OutboundOrderModal } from '@/components/OutboundOrderModal';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  total_amount: number;
  created_at: string;
  items_count: number;
}

// Mock data for demonstration - moved outside component to avoid re-creation
const mockOrders: Order[] = [
  {
    id: '1',
    order_number: 'ORD-2024-001',
    customer_name: 'บริษัท ABC จำกัด',
    status: 'pending',
    total_amount: 15000,
    created_at: new Date().toISOString(),
    items_count: 5
  },
  {
    id: '2',
    order_number: 'ORD-2024-002',
    customer_name: 'ร้าน XYZ',
    status: 'processing',
    total_amount: 8500,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    items_count: 3
  },
  {
    id: '3',
    order_number: 'ORD-2024-003',
    customer_name: 'บริษัท DEF จำกัด',
    status: 'completed',
    total_amount: 25000,
    created_at: new Date(Date.now() - 172800000).toISOString(),
    items_count: 8
  }
];

export function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showOutboundModal, setShowOutboundModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setOrders(mockOrders);
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = searchTerm === '' ||
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = activeTab === 'all' || order.status === activeTab;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, activeTab]);

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      processing: 'default',
      completed: 'default',
      cancelled: 'destructive'
    } as const;

    const labels = {
      pending: 'รอดำเนินการ',
      processing: 'กำลังจัดเตรียม',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิก'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              จัดการใบสั่งซื้อ
            </div>
            <Button onClick={() => setShowOutboundModal(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              สร้างใบสั่งใหม่
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาเลขที่ใบสั่งหรือชื่อลูกค้า..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Status Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
              <TabsTrigger value="pending">รอดำเนินการ</TabsTrigger>
              <TabsTrigger value="processing">กำลังจัดเตรียม</TabsTrigger>
              <TabsTrigger value="completed">เสร็จสิ้น</TabsTrigger>
              <TabsTrigger value="cancelled">ยกเลิก</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {filteredOrders.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'ไม่พบใบสั่งซื้อที่ตรงกับเงื่อนไข' : 'ยังไม่มีใบสั่งซื้อ'}
                    </div>
                  ) : (
                    filteredOrders.map((order, index) => (
                      <div key={order.id}>
                        <Card className="border border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                  <h3 className="font-semibold text-lg">{order.order_number}</h3>
                                  {getStatusBadge(order.status)}
                                </div>
                                <p className="text-muted-foreground">{order.customer_name}</p>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span>รายการ: {order.items_count} รายการ</span>
                                  <span>มูลค่า: {formatCurrency(order.total_amount)}</span>
                                  <span>วันที่: {formatDate(order.created_at)}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm">
                                  <Eye className="h-4 w-4 mr-1" />
                                  ดู
                                </Button>
                                <Button variant="outline" size="sm">
                                  <Edit className="h-4 w-4 mr-1" />
                                  แก้ไข
                                </Button>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  ลบ
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        {index < filteredOrders.length - 1 && <Separator className="my-2" />}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Outbound Order Modal */}
      <OutboundOrderModal
        isOpen={showOutboundModal}
        onClose={() => setShowOutboundModal(false)}
      />
    </div>
  );
}