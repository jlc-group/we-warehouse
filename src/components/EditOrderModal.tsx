import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Package,
  Plus,
  Minus,
  Trash2,
  Search,
  Loader2,
  AlertCircle,
  ShoppingCart,
  User,
  Calendar,
  FileText,
  Save
} from 'lucide-react';
import { useSingleOrder, useUpdateOrderStatus, orderStatusOptions, orderTypeOptions, priorityOptions } from '@/hooks/useOrder';
import { useCustomers } from '@/hooks/useCustomer';
import { useInventory } from '@/hooks/useInventory';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
  }).format(amount);
};

export const EditOrderModal = ({ isOpen, onClose, orderId }: EditOrderModalProps) => {
  const [editedOrder, setEditedOrder] = useState<any>(null);
  const [editedItems, setEditedItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInventory, setSelectedInventory] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: order, isLoading: orderLoading } = useSingleOrder(orderId || undefined);
  const { data: customers = [] } = useCustomers();
  const { data: inventory = [] } = useInventory();
  const updateOrderStatus = useUpdateOrderStatus();

  const filteredInventory = inventory.filter(item =>
    item.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (order) {
      setEditedOrder({
        customer_id: order.customer_id,
        order_type: order.order_type || 'SALE',
        priority: order.priority || 'NORMAL',
        status: order.status || 'DRAFT',
        expected_delivery_date: order.expected_delivery_date || '',
        shipping_address: order.shipping_address_line1 || '',
        internal_notes: order.internal_notes || '',
        customer_notes: '', // This field doesn't exist in the current schema
      });
      setEditedItems([]); // For now, order items will be empty until we fix the relationship
    }
  }, [order]);

  const handleAddItem = (inventoryItem: any) => {
    const existingIndex = editedItems.findIndex(item =>
      item.inventory_item_id === inventoryItem.id
    );

    if (existingIndex >= 0) {
      const updatedItems = [...editedItems];
      updatedItems[existingIndex].ordered_quantity_level1 += 1;
      setEditedItems(updatedItems);
    } else {
      const newItem = {
        id: Date.now().toString(),
        inventory_item_id: inventoryItem.id,
        ordered_quantity_level1: 1,
        ordered_quantity_level2: 0,
        ordered_quantity_level3: 0,
        unit_price: 0,
        notes: '',
        inventory_items: inventoryItem
      };
      setEditedItems([...editedItems, newItem]);
    }
  };

  const handleUpdateItemQuantity = (itemIndex: number, field: string, value: number) => {
    const updatedItems = [...editedItems];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      [field]: Math.max(0, value)
    };
    setEditedItems(updatedItems);
  };

  const handleRemoveItem = (itemIndex: number) => {
    setEditedItems(editedItems.filter((_, index) => index !== itemIndex));
  };

  const calculateItemTotal = (item: any) => {
    const quantity = (item.ordered_quantity_level1 || 0) +
                   (item.ordered_quantity_level2 || 0) +
                   (item.ordered_quantity_level3 || 0);
    return quantity * (item.unit_price || 0);
  };

  const calculateOrderTotal = () => {
    return editedItems.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const handleSave = async () => {
    if (!editedOrder || !orderId) return;

    setSaving(true);
    try {
      // Update order status and basic information
      await updateOrderStatus.mutateAsync({
        orderId,
        status: editedOrder.status,
        notes: editedOrder.internal_notes
      });

      toast.success('บันทึกข้อมูลใบสั่งซื้อสำเร็จ');
      onClose();
    } catch (error) {
      console.error('Error saving order:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !orderId) return null;

  if (orderLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>กำลังโหลดข้อมูล...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!order || !editedOrder) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-center h-64 text-red-600">
            <AlertCircle className="h-8 w-8 mr-2" />
            <span>ไม่พบข้อมูลใบสั่งซื้อ</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const selectedCustomer = customers.find(c => c.id === editedOrder.customer_id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            แก้ไขใบสั่งซื้อ: {order.order_number}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] overflow-auto">
          <div className="space-y-6">
            {/* Order Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  ข้อมูลใบสั่งซื้อ
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">ลูกค้า</Label>
                  <Select
                    value={editedOrder.customer_id}
                    onValueChange={(value) => setEditedOrder({...editedOrder, customer_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกลูกค้า" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.customer_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="order_type">ประเภทใบสั่งซื้อ</Label>
                  <Select
                    value={editedOrder.order_type}
                    onValueChange={(value) => setEditedOrder({...editedOrder, order_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {orderTypeOptions.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">ความสำคัญ</Label>
                  <Select
                    value={editedOrder.priority}
                    onValueChange={(value) => setEditedOrder({...editedOrder, priority: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map((priority) => (
                        <SelectItem key={priority.value} value={priority.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full bg-${priority.color}-500`}></div>
                            {priority.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">สถานะ</Label>
                  <Select
                    value={editedOrder.status}
                    onValueChange={(value) => setEditedOrder({...editedOrder, status: value})}
                  >
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

                <div className="space-y-2">
                  <Label htmlFor="expected_delivery_date">วันที่คาดว่าจะส่ง</Label>
                  <Input
                    type="date"
                    value={editedOrder.expected_delivery_date}
                    onChange={(e) => setEditedOrder({...editedOrder, expected_delivery_date: e.target.value})}
                  />
                </div>

                <div className="space-y-2 lg:col-span-1">
                  <Label htmlFor="shipping_address">ที่อยู่จัดส่ง</Label>
                  <Textarea
                    value={editedOrder.shipping_address}
                    onChange={(e) => setEditedOrder({...editedOrder, shipping_address: e.target.value})}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  รายการสินค้า
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Add Items Section */}
                <div className="mb-4">
                  <div className="flex gap-2 mb-2">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="ค้นหาสินค้าเพื่อเพิ่ม..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {searchTerm && filteredInventory.length > 0 && (
                    <div className="border rounded-md max-h-32 overflow-y-auto">
                      {filteredInventory.map((item) => (
                        <div
                          key={item.id}
                          className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 flex justify-between items-center"
                          onClick={() => handleAddItem(item)}
                        >
                          <div>
                            <span className="font-medium">{item.product_name}</span>
                            <span className="text-gray-500 ml-2">({item.sku})</span>
                          </div>
                          <Plus className="h-4 w-4 text-green-600" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Current Items */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>สินค้า</TableHead>
                      <TableHead>ลัง</TableHead>
                      <TableHead>กล่อง</TableHead>
                      <TableHead>ชิ้น</TableHead>
                      <TableHead>ราคาต่อหน่วย</TableHead>
                      <TableHead>รวม</TableHead>
                      <TableHead>จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editedItems.map((item, index) => (
                      <TableRow key={item.id || index}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.inventory_items?.product_name || 'ไม่ระบุ'}</div>
                            <div className="text-sm text-gray-500">{item.inventory_items?.sku}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateItemQuantity(index, 'ordered_quantity_level1', (item.ordered_quantity_level1 || 0) - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              value={item.ordered_quantity_level1 || 0}
                              onChange={(e) => handleUpdateItemQuantity(index, 'ordered_quantity_level1', parseInt(e.target.value) || 0)}
                              className="w-16 text-center"
                              min="0"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateItemQuantity(index, 'ordered_quantity_level1', (item.ordered_quantity_level1 || 0) + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateItemQuantity(index, 'ordered_quantity_level2', (item.ordered_quantity_level2 || 0) - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              value={item.ordered_quantity_level2 || 0}
                              onChange={(e) => handleUpdateItemQuantity(index, 'ordered_quantity_level2', parseInt(e.target.value) || 0)}
                              className="w-16 text-center"
                              min="0"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateItemQuantity(index, 'ordered_quantity_level2', (item.ordered_quantity_level2 || 0) + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateItemQuantity(index, 'ordered_quantity_level3', (item.ordered_quantity_level3 || 0) - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              value={item.ordered_quantity_level3 || 0}
                              onChange={(e) => handleUpdateItemQuantity(index, 'ordered_quantity_level3', parseInt(e.target.value) || 0)}
                              className="w-16 text-center"
                              min="0"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateItemQuantity(index, 'ordered_quantity_level3', (item.ordered_quantity_level3 || 0) + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.unit_price || 0}
                            onChange={(e) => {
                              const updatedItems = [...editedItems];
                              updatedItems[index].unit_price = parseFloat(e.target.value) || 0;
                              setEditedItems(updatedItems);
                            }}
                            className="w-24"
                            min="0"
                            step="0.01"
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(calculateItemTotal(item))}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {editedItems.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>ยังไม่มีสินค้าในใบสั่งซื้อ</p>
                  </div>
                )}

                {editedItems.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-end">
                      <div className="text-lg font-semibold">
                        รวมทั้งสิ้น: {formatCurrency(calculateOrderTotal())}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>หมายเหตุ</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="internal_notes">หมายเหตุภายใน</Label>
                  <Textarea
                    value={editedOrder.internal_notes}
                    onChange={(e) => setEditedOrder({...editedOrder, internal_notes: e.target.value})}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_notes">หมายเหตุลูกค้า</Label>
                  <Textarea
                    value={editedOrder.customer_notes}
                    onChange={(e) => setEditedOrder({...editedOrder, customer_notes: e.target.value})}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            ยกเลิก
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                บันทึก
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};