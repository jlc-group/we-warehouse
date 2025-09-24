import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Package,
  User,
  Calendar,
  DollarSign,
  Edit3,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useOrder, useUpdateOrderStatus, getOrderStatusLabel, getOrderStatusColor, orderStatusOptions } from '@/hooks/useOrder';
import { toast } from 'sonner';

// Helper function for currency formatting
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB'
  }).format(amount);
};

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
}

export function EditOrderModal({ isOpen, onClose, orderId }: EditOrderModalProps) {
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  const { data: order, isLoading } = useOrder(orderId || undefined);
  const updateOrderStatus = useUpdateOrderStatus();

  const handleStatusUpdate = async () => {
    if (!orderId || !newStatus) return;

    try {
      await updateOrderStatus.mutateAsync({
        orderId,
        status: newStatus,
        notes: statusNotes
      });

      setIsEditingStatus(false);
      setStatusNotes('');
      toast.success('อัพเดทสถานะสำเร็จ');
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการอัพเดทสถานะ');
    }
  };

  if (!isOpen || !orderId) return null;

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>กำลังโหลดข้อมูลใบสั่งซื้อ</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!order) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>ไม่พบข้อมูลใบสั่งซื้อ</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">ไม่พบข้อมูลใบสั่งซื้อ</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-blue-600" />
            แก้ไขใบสั่งซื้อ {order.order_number}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(95vh-120px)] space-y-6">
          {/* ข้อมูลพื้นฐาน */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* ข้อมูลใบสั่งซื้อ */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5" />
                  ข้อมูลใบสั่งซื้อ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">วันที่สั่งซื้อ</Label>
                  <div className="text-sm">{new Date(order.order_date).toLocaleDateString('th-TH')}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">ประเภทคำสั่งซื้อ</Label>
                  <div className="text-sm">{order.order_type}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">ความสำคัญ</Label>
                  <Badge variant="outline">{order.priority}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* ข้อมูลลูกค้า */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  ข้อมูลลูกค้า
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">ชื่อลูกค้า</Label>
                  <div className="text-sm">{order.customers?.customer_name}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">รหัสลูกค้า</Label>
                  <div className="text-sm">{order.customers?.customer_code}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">ประเภทลูกค้า</Label>
                  <Badge variant="outline">{order.customers?.customer_type}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* ข้อมูลการเงิน */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="h-5 w-5" />
                  ข้อมูลการเงิน
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">จำนวนเงินรวม</Label>
                  <div className="text-sm font-semibold">{formatCurrency(order.total_amount || 0)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">ส่วนลด</Label>
                  <div className="text-sm">{formatCurrency(order.discount_amount || 0)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">จำนวนเงินสุทธิ</Label>
                  <div className="text-sm font-semibold text-green-600">{formatCurrency(order.final_amount || 0)}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* จัดการสถานะ */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                จัดการสถานะ
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingStatus(!isEditingStatus)}
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  แก้ไขสถานะ
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">สถานะปัจจุบัน</Label>
                  <div className="mt-1">
                    <Badge 
                      variant="outline" 
                      className={`${getOrderStatusColor(order.status || 'DRAFT')} text-white`}
                    >
                      {getOrderStatusLabel(order.status || 'DRAFT')}
                    </Badge>
                  </div>
                </div>

                {isEditingStatus && (
                  <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                    <div>
                      <Label htmlFor="newStatus">สถานะใหม่</Label>
                      <Select value={newStatus} onValueChange={setNewStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกสถานะใหม่" />
                        </SelectTrigger>
                        <SelectContent>
                          {orderStatusOptions.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="statusNotes">หมายเหตุ (ไม่บังคับ)</Label>
                      <Textarea
                        id="statusNotes"
                        value={statusNotes}
                        onChange={(e) => setStatusNotes(e.target.value)}
                        placeholder="เพิ่มหมายเหตุสำหรับการเปลี่ยนสถานะ..."
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleStatusUpdate}
                        disabled={!newStatus || updateOrderStatus.isPending}
                        size="sm"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {updateOrderStatus.isPending ? 'กำลังบันทึก...' : 'บันทึกสถานะ'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditingStatus(false);
                          setNewStatus('');
                          setStatusNotes('');
                        }}
                        size="sm"
                      >
                        <X className="h-4 w-4 mr-2" />
                        ยกเลิก
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* รายการสินค้า */}
          <Card>
            <CardHeader>
              <CardTitle>รายการสินค้า</CardTitle>
            </CardHeader>
            <CardContent>
              {order.order_items && order.order_items.length > 0 ? (
                <div className="space-y-4">
                  {order.order_items.map((item: any, index: number) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium">{item.product_name}</div>
                          <div className="text-sm text-muted-foreground">
                            รหัส: {item.sku} | ตำแหน่ง: {item.location}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            จำนวนที่สั่ง: {item.ordered_quantity_level1 || 0} {item.unit_level1_name || 'ลัง'}, {item.ordered_quantity_level2 || 0} {item.unit_level2_name || 'กล่อง'}, {item.ordered_quantity_level3 || 0} {item.unit_level3_name || 'ชิ้น'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(item.line_total || 0)}</div>
                          <div className="text-sm text-muted-foreground">
                            @{formatCurrency(item.unit_price || 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>ไม่มีรายการสินค้า</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            ปิด
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
