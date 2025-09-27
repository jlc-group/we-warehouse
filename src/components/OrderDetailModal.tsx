import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Package,
  User,
  MapPin,
  Calendar,
  Truck,
  DollarSign,
  Phone,
  FileText,
  Edit3,
  Save,
  X,
  History
} from 'lucide-react';
import { useState } from 'react';
import { useSingleOrder, useUpdateOrderStatus, getOrderStatusLabel, getOrderStatusColor, orderStatusOptions } from '@/hooks/useOrder';
import { toast } from 'sonner';

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
}

// Helper function for currency formatting
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB'
  }).format(amount);
}

export function OrderDetailModal({ isOpen, onClose, orderId }: OrderDetailModalProps) {
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  const { data: order, isLoading } = useSingleOrder(orderId || undefined);
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
      toast.success('อัปเดตสถานะสำเร็จ');
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    }
  };

  if (!isOpen || !orderId) return null;

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
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
          <DialogTitle className="flex items-center gap-3">
            <Package className="h-6 w-6 text-blue-600" />
            <span>รายละเอียดใบสั่งซื้อ {order.order_number}</span>
            <Badge
              variant="outline"
              className={`bg-${getOrderStatusColor(order.status || 'DRAFT')}-50 text-${getOrderStatusColor(order.status || 'DRAFT')}-700 border-${getOrderStatusColor(order.status || 'DRAFT')}-200`}
            >
              {getOrderStatusLabel(order.status || 'DRAFT')}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(95vh-120px)]">
          <div className="space-y-6 p-1">
            {/* Order Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    ข้อมูลทั่วไป
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">วันที่สั่งซื้อ</Label>
                    <p className="text-sm">{new Date(order.order_date || order.created_at).toLocaleDateString('th-TH')}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">ประเภทออเดอร์</Label>
                    <p className="text-sm">{order.order_type || 'ขาย'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">ความสำคัญ</Label>
                    <Badge variant="outline" className="text-xs">
                      {order.priority || 'ปกติ'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    ข้อมูลลูกค้า
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">ชื่อลูกค้า</Label>
                    <p className="text-sm font-medium">{order.customers?.customer_name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">รหัสลูกค้า</Label>
                    <p className="text-sm">{order.customers?.customer_code}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">ประเภทลูกค้า</Label>
                    <p className="text-sm">{order.customers?.customer_type}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    ข้อมูลการเงิน
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">จำนวนเงินรวม</Label>
                    <p className="text-sm font-medium">{formatCurrency(order.total_amount || 0)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">ส่วนลด</Label>
                    <p className="text-sm">{formatCurrency(order.discount_amount || 0)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">จำนวนเงินสุทธิ</Label>
                    <p className="text-sm font-bold text-green-600">{formatCurrency(order.final_amount || 0)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Status Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    จัดการสถานะ
                  </div>
                  {!isEditingStatus && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditingStatus(true);
                        setNewStatus(order.status || 'DRAFT');
                      }}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      แก้ไขสถานะ
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditingStatus ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>สถานะใหม่</Label>
                        <Select value={newStatus} onValueChange={setNewStatus}>
                          <SelectTrigger>
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
                      <div>
                        <Label>หมายเหตุ (ไม่บังคับ)</Label>
                        <Textarea
                          placeholder="ระบุเหตุผลหรือหมายเหตุการเปลี่ยนสถานะ..."
                          value={statusNotes}
                          onChange={(e) => setStatusNotes(e.target.value)}
                          rows={3}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleStatusUpdate}
                        disabled={updateOrderStatus.isPending}
                        size="sm"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        บันทึก
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsEditingStatus(false);
                          setStatusNotes('');
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        ยกเลิก
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">สถานะปัจจุบัน:</span>
                      <Badge
                        variant="outline"
                        className={`bg-${getOrderStatusColor(order.status || 'DRAFT')}-50 text-${getOrderStatusColor(order.status || 'DRAFT')}-700 border-${getOrderStatusColor(order.status || 'DRAFT')}-200`}
                      >
                        {getOrderStatusLabel(order.status || 'DRAFT')}
                      </Badge>
                    </div>

                    {/* Status Timeline */}
                    <div className="mt-4 space-y-2">
                      <Label className="text-sm font-medium">ประวัติสถานะ</Label>
                      <div className="space-y-2">
                        {order.created_at && (
                          <div className="flex items-center gap-3 text-sm">
                            <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                            <span className="text-muted-foreground">สร้างออเดอร์</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(order.created_at).toLocaleString('th-TH')}
                            </span>
                          </div>
                        )}
                        {order.confirmed_at && (
                          <div className="flex items-center gap-3 text-sm">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span className="text-muted-foreground">ยืนยันแล้ว</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(order.confirmed_at).toLocaleString('th-TH')}
                            </span>
                          </div>
                        )}
                        {order.shipped_at && (
                          <div className="flex items-center gap-3 text-sm">
                            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                            <span className="text-muted-foreground">จัดส่งแล้ว</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(order.shipped_at).toLocaleString('th-TH')}
                            </span>
                          </div>
                        )}
                        {order.delivered_at && (
                          <div className="flex items-center gap-3 text-sm">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-muted-foreground">ส่งมอบแล้ว</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(order.delivered_at).toLocaleString('th-TH')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  รายการสินค้า
                </CardTitle>
              </CardHeader>
              <CardContent>
                {order.order_items && order.order_items.length > 0 ? (
                  <div className="space-y-3">
                    {order.order_items.map((item: any, index: number) => (
                      <div key={item.id || index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">#{item.line_number || index + 1}</Badge>
                              <span className="font-medium">{item.inventory_items?.product_name || item.product_name}</span>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div>รหัสสินค้า: {item.inventory_items?.sku || item.sku}</div>
                              {item.inventory_items?.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  ตำแหน่ง: {item.inventory_items.location}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm space-y-1">
                              {item.ordered_quantity_level1 > 0 && (
                                <div>ลัง: {item.ordered_quantity_level1}</div>
                              )}
                              {item.ordered_quantity_level2 > 0 && (
                                <div>กล่อง: {item.ordered_quantity_level2}</div>
                              )}
                              {item.ordered_quantity_level3 > 0 && (
                                <div>ชิ้น: {item.ordered_quantity_level3}</div>
                              )}
                            </div>
                            {item.confirmed_quantity && (
                              <div className="text-sm text-green-600 mt-2">
                                ยืนยันแล้ว: {item.confirmed_quantity}
                              </div>
                            )}
                            {item.picked_quantity && (
                              <div className="text-sm text-blue-600">
                                เก็บแล้ว: {item.picked_quantity}
                              </div>
                            )}
                            {item.unit_price && (
                              <div className="text-sm text-muted-foreground mt-2">
                                ราคาต่อชิ้น: {formatCurrency(item.unit_price)}
                              </div>
                            )}
                          </div>
                        </div>
                        {item.notes && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            หมายเหตุ: {item.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>ไม่มีรายการสินค้าในใบสั่งซื้อนี้</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Shipping Information */}
            {(order.shipping_address_line1 || order.shipping_contact_person) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    ข้อมูลการจัดส่ง
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">ที่อยู่จัดส่ง</Label>
                      <div className="text-sm space-y-1 mt-1">
                        {order.shipping_address_line1 && <div>{order.shipping_address_line1}</div>}
                        {order.shipping_address_line2 && <div>{order.shipping_address_line2}</div>}
                        {order.shipping_district && <div>{order.shipping_district}</div>}
                        {order.shipping_province && <div>{order.shipping_province}</div>}
                        {order.shipping_postal_code && <div>{order.shipping_postal_code}</div>}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">ข้อมูลติดต่อ</Label>
                      <div className="text-sm space-y-1 mt-1">
                        {order.shipping_contact_person && (
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            {order.shipping_contact_person}
                          </div>
                        )}
                        {order.shipping_phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3" />
                            {order.shipping_phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {(order.notes || order.internal_notes) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    หมายเหตุ
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {order.notes && (
                    <div>
                      <Label className="text-sm font-medium">หมายเหตุลูกค้า</Label>
                      <p className="text-sm mt-1 p-3 bg-gray-50 rounded-md">{order.notes}</p>
                    </div>
                  )}
                  {order.internal_notes && (
                    <div>
                      <Label className="text-sm font-medium">หมายเหตุภายใน</Label>
                      <p className="text-sm mt-1 p-3 bg-yellow-50 rounded-md">{order.internal_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default OrderDetailModal;