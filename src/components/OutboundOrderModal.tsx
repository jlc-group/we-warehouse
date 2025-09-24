import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  ShoppingCart,
  User,
  Package,
  Plus,
  Trash2,
  Save,
  Calendar,
  DollarSign,
  AlertTriangle,
  Search
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateOrder, orderTypeOptions, priorityOptions } from '@/hooks/useOrder';
import { CustomerSearchSelector } from '@/components/CustomerSelector';
import { CompactWarehouseSelector } from '@/components/WarehouseSelector';
import { useInventory } from '@/hooks/useInventory';
import type { InventoryItem } from '@/hooks/useInventory';
import { formatUnitsDisplay } from '@/utils/unitCalculations';
import { toast } from 'sonner';

// Schema สำหรับ validation
const orderSchema = z.object({
  customer_id: z.string().min(1, 'กรุณาเลือกลูกค้า'),
  warehouse_id: z.string().optional(),
  order_type: z.string(),
  priority: z.string(),
  due_date: z.string().optional(),
  customer_po_number: z.string().optional(),
  payment_terms: z.number().min(0, 'เงื่อนไขการชำระเงินต้องไม่ติดลบ').optional(),
  notes: z.string().optional(),
  shipping_address_line1: z.string().optional(),
  shipping_address_line2: z.string().optional(),
  shipping_district: z.string().optional(),
  shipping_province: z.string().optional(),
  shipping_postal_code: z.string().optional(),
  shipping_contact_person: z.string().optional(),
  shipping_phone: z.string().optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

interface OrderItemData {
  inventoryItem: InventoryItem;
  ordered_quantity_level1: number;
  ordered_quantity_level2: number;
  ordered_quantity_level3: number;
  unit_price: number;
  notes?: string;
}

interface OutboundOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedItems?: InventoryItem[];
  preSelectedCustomerId?: string;
  preSelectedWarehouseId?: string;
}

export function OutboundOrderModal({
  isOpen,
  onClose,
  preSelectedItems = [],
  preSelectedCustomerId,
  preSelectedWarehouseId
}: OutboundOrderModalProps) {
  const [orderItems, setOrderItems] = useState<OrderItemData[]>([]);
  const [showInventorySearch, setShowInventorySearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const createOrder = useCreateOrder();
  const { items: inventoryItems } = useInventory(preSelectedWarehouseId);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customer_id: preSelectedCustomerId || '',
      warehouse_id: preSelectedWarehouseId || '',
      order_type: 'SALE',
      priority: 'NORMAL',
      payment_terms: 30,
    }
  });

  // Populate preSelectedItems เมื่อเปิด modal
  useEffect(() => {
    if (isOpen && preSelectedItems.length > 0) {
      const initialOrderItems = preSelectedItems.map(item => ({
        inventoryItem: item,
        ordered_quantity_level1: 1, // เริ่มต้นที่ 1 ลัง
        ordered_quantity_level2: 0,
        ordered_quantity_level3: 0,
        unit_price: 100, // ราคาเริ่มต้น 100 บาท
        notes: ''
      }));
      setOrderItems(initialOrderItems);
      console.log('🛒 Populated order items:', initialOrderItems.length, 'items');
    } else if (isOpen && preSelectedItems.length === 0) {
      setOrderItems([]);
      console.log('🛒 Cleared order items');
    }
  }, [isOpen, preSelectedItems]);

  const selectedCustomerId = watch('customer_id');
  const selectedWarehouseId = watch('warehouse_id');

  // Reset form และ order items เมื่อเปิด/ปิด modal
  useEffect(() => {
    if (isOpen) {
      // ตั้งค่าเริ่มต้น
      reset({
        customer_id: preSelectedCustomerId || '',
        warehouse_id: preSelectedWarehouseId || '',
        order_type: 'SALE',
        priority: 'NORMAL',
        payment_terms: 30,
        due_date: '',
        customer_po_number: '',
        notes: '',
        shipping_address_line1: '',
        shipping_address_line2: '',
        shipping_district: '',
        shipping_province: '',
        shipping_postal_code: '',
        shipping_contact_person: '',
        shipping_phone: '',
      });

      // เพิ่มสินค้าที่เลือกมาล่วงหน้า
      if (preSelectedItems.length > 0) {
        const items: OrderItemData[] = preSelectedItems.map(item => ({
          inventoryItem: item,
          ordered_quantity_level1: 1, // เริ่มต้นที่ 1 ลัง
          ordered_quantity_level2: 0,
          ordered_quantity_level3: 0,
          unit_price: 100, // ราคาเริ่มต้น 100 บาท
          notes: '',
        }));
        setOrderItems(items);
      } else {
        setOrderItems([]);
      }

      setShowInventorySearch(false);
      setSearchTerm('');
    }
  }, [isOpen, reset, preSelectedItems, preSelectedCustomerId, preSelectedWarehouseId]);

  // Filter inventory สำหรับการค้นหา
  const filteredInventory = inventoryItems?.filter(item => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      item.product_name.toLowerCase().includes(search) ||
      item.sku.toLowerCase().includes(search) ||
      item.location.toLowerCase().includes(search)
    );
  }) || [];

  const addInventoryItem = (item: InventoryItem) => {
    // ตรวจสอบว่ามีสินค้านี้ในรายการแล้วหรือไม่
    const existingIndex = orderItems.findIndex(orderItem =>
      orderItem.inventoryItem.id === item.id
    );

    if (existingIndex >= 0) {
      toast.warning(`สินค้า "${item.product_name}" มีในรายการแล้ว`);
      return;
    }

    const newItem: OrderItemData = {
      inventoryItem: item,
      ordered_quantity_level1: 1, // เริ่มต้นที่ 1 ลัง
      ordered_quantity_level2: 0,
      ordered_quantity_level3: 0,
      unit_price: 100, // ราคาเริ่มต้น 100 บาท
      notes: '',
    };

    setOrderItems([...orderItems, newItem]);
    setShowInventorySearch(false);
    setSearchTerm('');
    toast.success(`เพิ่มสินค้า "${item.product_name}" ในรายการ`);
  };

  const removeOrderItem = (index: number) => {
    const updatedItems = orderItems.filter((_, i) => i !== index);
    setOrderItems(updatedItems);
  };

  const updateOrderItem = (index: number, updates: Partial<OrderItemData>) => {
    const updatedItems = orderItems.map((item, i) =>
      i === index ? { ...item, ...updates } : item
    );
    setOrderItems(updatedItems);
  };

  // คำนวณยอดรวม
  const calculateTotal = () => {
    return orderItems.reduce((total, item) => {
      const quantity = (item.ordered_quantity_level1 || 0) +
                     (item.ordered_quantity_level2 || 0) +
                     (item.ordered_quantity_level3 || 0);
      return total + (quantity * item.unit_price);
    }, 0);
  };

  const onSubmit = async (data: OrderFormData) => {
    // ตรวจสอบว่ามีสินค้าในรายการหรือไม่
    if (orderItems.length === 0) {
      toast.error('กรุณาเพิ่มสินค้าในใบสั่งซื้อ');
      return;
    }

    // ตรวจสอบว่าทุกรายการมีจำนวนมากกว่า 0
    const invalidItems = orderItems.filter(item => {
      const totalQty = (item.ordered_quantity_level1 || 0) +
                      (item.ordered_quantity_level2 || 0) +
                      (item.ordered_quantity_level3 || 0);
      return totalQty <= 0;
    });

    if (invalidItems.length > 0) {
      toast.error('กรุณาใส่จำนวนสินค้าให้ถูกต้อง (มากกว่า 0)');
      return;
    }

    try {
      const totalAmount = calculateTotal();

      // สร้าง order data
      const orderData = {
        customer_id: data.customer_id,
        warehouse_id: data.warehouse_id || null,
        order_type: data.order_type,
        priority: data.priority,
        status: 'DRAFT',
        order_date: new Date().toISOString().split('T')[0], // เพิ่ม order_date ที่จำเป็น
        due_date: data.due_date || null,
        customer_po_number: data.customer_po_number || null,
        payment_terms: data.payment_terms || 30,
        notes: data.notes || null,
        total_amount: totalAmount,
        final_amount: totalAmount,
        currency: 'THB', // เพิ่ม currency default
        shipping_address_line1: data.shipping_address_line1 || null,
        shipping_address_line2: data.shipping_address_line2 || null,
        shipping_district: data.shipping_district || null,
        shipping_province: data.shipping_province || null,
        shipping_postal_code: data.shipping_postal_code || null,
        shipping_contact_person: data.shipping_contact_person || null,
        shipping_phone: data.shipping_phone || null,
      };

      // สร้าง order items data
      const orderItemsData = orderItems.map((item, index) => ({
        line_number: index + 1,
        product_id: null,
        sku: item.inventoryItem.sku,
        product_name: item.inventoryItem.product_name,
        inventory_item_id: item.inventoryItem.id,
        location: item.inventoryItem.location,
        ordered_quantity_level1: item.ordered_quantity_level1 || 0,
        ordered_quantity_level2: item.ordered_quantity_level2 || 0,
        ordered_quantity_level3: item.ordered_quantity_level3 || 0,
        unit_level1_name: item.inventoryItem.unit_level1_name || 'ลัง',
        unit_level2_name: item.inventoryItem.unit_level2_name || 'กล่อง',
        unit_level3_name: item.inventoryItem.unit_level3_name || 'ชิ้น',
        level1_to_level2_conversion: item.inventoryItem.unit_level1_rate || 1,
        level2_to_level3_conversion: item.inventoryItem.unit_level2_rate || 1,
        unit_price: item.unit_price,
        line_total: ((item.ordered_quantity_level1 || 0) +
                    (item.ordered_quantity_level2 || 0) +
                    (item.ordered_quantity_level3 || 0)) * item.unit_price,
        status: 'PENDING',
        notes: item.notes || null,
      }));

      await createOrder.mutateAsync({
        orderData,
        orderItems: orderItemsData as any // Type assertion เพื่อหลีกเลี่ยง type conflict
      });

      // Reset form และ clear items
      reset();
      setOrderItems([]);
      onClose();
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

  const isLoading = createOrder.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl bg-white max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
            สร้างใบสั่งซื้อใหม่
          </DialogTitle>
          <DialogDescription>
            สร้างใบสั่งซื้อสำหรับลูกค้า จัดการรายการสินค้าและข้อมูลการจัดส่ง
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* ข้อมูลพื้นฐาน */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-4 w-4" />
                ข้อมูลพื้นฐาน
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ลูกค้า *</Label>
                  <CustomerSearchSelector
                    selectedCustomerId={selectedCustomerId}
                    onCustomerChange={(customerId) => setValue('customer_id', customerId || '')}
                    placeholder="ค้นหาและเลือกลูกค้า..."
                  />
                  {errors.customer_id && (
                    <p className="text-sm text-red-600">{errors.customer_id.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Warehouse</Label>
                  <CompactWarehouseSelector
                    selectedWarehouseId={selectedWarehouseId}
                    onWarehouseChange={(warehouseId) => setValue('warehouse_id', warehouseId || '')}
                    showAllOption={false}
                  />
                </div>

                <div className="space-y-2">
                  <Label>ประเภทใบสั่งซื้อ</Label>
                  <Select
                    value={watch('order_type')}
                    onValueChange={(value) => setValue('order_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {orderTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>ความสำคัญ</Label>
                  <Select
                    value={watch('priority')}
                    onValueChange={(value) => setValue('priority', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_date">วันที่ต้องการ</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="due_date"
                      type="date"
                      {...register('due_date')}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_terms">เงื่อนไขการชำระเงิน (วัน)</Label>
                  <Input
                    id="payment_terms"
                    type="number"
                    min="0"
                    {...register('payment_terms', { valueAsNumber: true })}
                    placeholder="30"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="customer_po_number">เลขที่ PO ของลูกค้า</Label>
                  <Input
                    id="customer_po_number"
                    {...register('customer_po_number')}
                    placeholder="PO-2024-001"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* รายการสินค้า */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-4 w-4" />
                  รายการสินค้า ({orderItems.length} รายการ)
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInventorySearch(!showInventorySearch)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  เพิ่มสินค้า
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* ช่องค้นหาสินค้า */}
              {showInventorySearch && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="ค้นหาสินค้า (ชื่อ, SKU, หรือตำแหน่ง)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {filteredInventory.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">
                          {searchTerm ? 'ไม่พบสินค้าที่ค้นหา' : 'ไม่มีสินค้าในคลัง'}
                        </p>
                      ) : (
                        filteredInventory.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-muted/50"
                            onClick={() => addInventoryItem(item)}
                          >
                            <div className="flex-1">
                              <div className="font-medium">{item.product_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {item.sku} • {item.location}
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatUnitsDisplay(
                                item.unit_level1_quantity || 0,
                                item.unit_level2_quantity || 0,
                                item.unit_level3_quantity || 0,
                                item.unit_level1_name || 'ลัง',
                                item.unit_level2_name || 'กล่อง',
                                item.unit_level3_name || 'ชิ้น'
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* รายการสินค้าที่เลือก */}
              {orderItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>ยังไม่มีสินค้าในรายการ</p>
                  <p className="text-sm">คลิก "เพิ่มสินค้า" เพื่อเลือกสินค้า</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orderItems.map((item, index) => (
                    <div key={`${item.inventoryItem.id}-${index}`} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="font-medium">{item.inventoryItem.product_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.inventoryItem.sku} • {item.inventoryItem.location}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            สต็อกคงเหลือ: {formatUnitsDisplay(
                              item.inventoryItem.unit_level1_quantity || 0,
                              item.inventoryItem.unit_level2_quantity || 0,
                              item.inventoryItem.unit_level3_quantity || 0,
                              item.inventoryItem.unit_level1_name || 'ลัง',
                              item.inventoryItem.unit_level2_name || 'กล่อง',
                              item.inventoryItem.unit_level3_name || 'ชิ้น'
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOrderItem(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        {/* จำนวน Level 1 */}
                        <div className="space-y-1">
                          <Label className="text-xs">
                            {item.inventoryItem.unit_level1_name || 'ลัง'}
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            value={item.ordered_quantity_level1}
                            onChange={(e) => updateOrderItem(index, {
                              ordered_quantity_level1: parseInt(e.target.value) || 0
                            })}
                            placeholder="0"
                          />
                        </div>

                        {/* จำนวน Level 2 */}
                        <div className="space-y-1">
                          <Label className="text-xs">
                            {item.inventoryItem.unit_level2_name || 'กล่อง'}
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            value={item.ordered_quantity_level2}
                            onChange={(e) => updateOrderItem(index, {
                              ordered_quantity_level2: parseInt(e.target.value) || 0
                            })}
                            placeholder="0"
                          />
                        </div>

                        {/* จำนวน Level 3 */}
                        <div className="space-y-1">
                          <Label className="text-xs">
                            {item.inventoryItem.unit_level3_name || 'ชิ้น'}
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            value={item.ordered_quantity_level3}
                            onChange={(e) => updateOrderItem(index, {
                              ordered_quantity_level3: parseInt(e.target.value) || 0
                            })}
                            placeholder="1"
                          />
                        </div>

                        {/* ราคาต่อหน่วย */}
                        <div className="space-y-1">
                          <Label className="text-xs">ราคาต่อหน่วย (บาท)</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => updateOrderItem(index, {
                                unit_price: parseFloat(e.target.value) || 0
                              })}
                              placeholder="0.00"
                              className="pl-8"
                            />
                          </div>
                        </div>

                        {/* ยอดรวม */}
                        <div className="space-y-1">
                          <Label className="text-xs">ยอดรวม</Label>
                          <div className="h-10 flex items-center px-3 bg-muted/30 rounded text-sm font-medium">
                            ฿{(((item.ordered_quantity_level1 || 0) +
                                (item.ordered_quantity_level2 || 0) +
                                (item.ordered_quantity_level3 || 0)) * item.unit_price).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* หมายเหตุ */}
                      <div className="mt-3">
                        <Label className="text-xs">หมายเหตุ</Label>
                        <Input
                          value={item.notes || ''}
                          onChange={(e) => updateOrderItem(index, { notes: e.target.value })}
                          placeholder="หมายเหตุสำหรับสินค้านี้..."
                        />
                      </div>
                    </div>
                  ))}

                  {/* ยอดรวมทั้งหมด */}
                  <Separator />
                  <div className="flex justify-end">
                    <div className="text-right">
                      <div className="text-lg font-semibold">
                        ยอดรวมทั้งหมด: ฿{calculateTotal().toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {orderItems.length} รายการ
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ที่อยู่จัดส่ง */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ที่อยู่จัดส่ง (ไม่บังคับ)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shipping_contact_person">ชื่อผู้รับ</Label>
                  <Input
                    id="shipping_contact_person"
                    {...register('shipping_contact_person')}
                    placeholder="คุณสมชาย ใจดี"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shipping_phone">เบอร์โทรผู้รับ</Label>
                  <Input
                    id="shipping_phone"
                    {...register('shipping_phone')}
                    placeholder="08-111-2222"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="shipping_address_line1">ที่อยู่ บรรทัดที่ 1</Label>
                  <Input
                    id="shipping_address_line1"
                    {...register('shipping_address_line1')}
                    placeholder="123 ถนนสุขุมวิท"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="shipping_address_line2">ที่อยู่ บรรทัดที่ 2</Label>
                  <Input
                    id="shipping_address_line2"
                    {...register('shipping_address_line2')}
                    placeholder="แขวงคลองตัน เขตคลองเตย"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shipping_district">อำเภอ/เขต</Label>
                  <Input
                    id="shipping_district"
                    {...register('shipping_district')}
                    placeholder="คลองเตย"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shipping_province">จังหวัด</Label>
                  <Input
                    id="shipping_province"
                    {...register('shipping_province')}
                    placeholder="กรุงเทพมหานคร"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shipping_postal_code">รหัสไปรษณีย์</Label>
                  <Input
                    id="shipping_postal_code"
                    {...register('shipping_postal_code')}
                    placeholder="10110"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* หมายเหตุ */}
          <div className="space-y-2">
            <Label htmlFor="notes">หมายเหตุ</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="หมายเหตุเพิ่มเติมสำหรับใบสั่งซื้อนี้..."
              className="min-h-[80px]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              ยกเลิก
            </Button>

            <Button
              type="submit"
              disabled={isLoading || orderItems.length === 0}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Save className="h-4 w-4 mr-2 animate-pulse" />
                  กำลังสร้าง...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  สร้างใบสั่งซื้อ
                </>
              )}
            </Button>
          </div>

          {/* Warning */}
          {orderItems.length === 0 && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
              <AlertTriangle className="h-4 w-4" />
              กรุณาเพิ่มสินค้าในรายการก่อนสร้างใบสั่งซื้อ
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default OutboundOrderModal;