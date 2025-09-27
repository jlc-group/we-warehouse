import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  ShoppingCart,
  Package,
  Plus,
  Trash2,
  Save,
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
import { ProductSelectionGrid } from '@/components/ProductSelectionGrid';
import { FloatingMiniCart, InlineMiniCart } from '@/components/FloatingMiniCart';
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
  source_location?: string; // Add location tracking
}

interface ProductSelection {
  item: InventoryItem;
  quantities: {
    level1: number;
    level2: number;
    level3: number;
  };
  unitPrice?: number;
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
  const [selectedProducts, setSelectedProducts] = useState<ProductSelection[]>([]);
  const [showMiniCart, setShowMiniCart] = useState(true);

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

  const watchedCustomerId = watch('customer_id');
  const watchedWarehouseId = watch('warehouse_id');

  // Initialize pre-selected items
  useEffect(() => {
    if (preSelectedItems && preSelectedItems.length > 0 && orderItems.length === 0) {
      console.log('🛒 Initializing pre-selected items:', {
        preSelectedItems: preSelectedItems.length,
        items: preSelectedItems.slice(0, 3).map(i => ({ id: i.id, product_name: i.product_name }))
      });

      const initialOrderItems: OrderItemData[] = preSelectedItems.map(item => {
        // Check available quantities across levels and suggest appropriate quantities
        const level1Available = item.unit_level1_quantity || 0;
        const level2Available = item.unit_level2_quantity || 0;
        const level3Available = item.unit_level3_quantity || 0;

        console.log('📦 Item quantities:', {
          product_name: item.product_name,
          level1Available,
          level2Available,
          level3Available
        });

        // Default ordered quantities (can be modified by user)
        const ordered_quantity_level1 = Math.min(1, level1Available);
        const ordered_quantity_level2 = level1Available === 0 ? Math.min(1, level2Available) : 0;
        const ordered_quantity_level3 = (level1Available === 0 && level2Available === 0) ? Math.min(1, level3Available) : 0;

        return {
          inventoryItem: item,
          ordered_quantity_level1,
          ordered_quantity_level2,
          ordered_quantity_level3,
          unit_price: 0, // Will be set by user
          notes: '',
          source_location: item.location
        };
      });

      setOrderItems(initialOrderItems);
    }
  }, [preSelectedItems, orderItems.length]);

  // Set pre-selected values
  useEffect(() => {
    if (preSelectedCustomerId) {
      setValue('customer_id', preSelectedCustomerId);
    }
    if (preSelectedWarehouseId) {
      setValue('warehouse_id', preSelectedWarehouseId);
    }
  }, [preSelectedCustomerId, preSelectedWarehouseId, setValue]);

  // Filter available inventory items (exclude items already in order)
  const availableInventoryItems = inventoryItems?.filter(item => {
    const notAlreadyInOrder = !orderItems.some(orderItem => orderItem.inventoryItem.id === item.id);

    // Filter by selected warehouse if available
    const matchesWarehouse = !watchedWarehouseId ||
      item.warehouse_id === watchedWarehouseId ||
      !item.warehouse_id;

    return notAlreadyInOrder && matchesWarehouse;
  }) || [];

  // Handle product selection changes
  const handleProductSelect = (item: InventoryItem, quantities: {
    level1: number;
    level2: number;
    level3: number;
  }) => {
    setSelectedProducts(prev => {
      const existingIndex = prev.findIndex(p => p.item.id === item.id);

      if (existingIndex >= 0) {
        // Update existing selection
        return prev.map((p, index) =>
          index === existingIndex
            ? { ...p, quantities }
            : p
        );
      } else {
        // Add new selection
        return [...prev, { item, quantities, unitPrice: 0 }];
      }
    });
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleProductRemove = (itemId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.item.id !== itemId));
  };

  const handlePriceUpdate = (itemId: string, price: number) => {
    setSelectedProducts(prev =>
      prev.map(p =>
        p.item.id === itemId
          ? { ...p, unitPrice: price }
          : p
      )
    );
  };

  const convertToOrderItems = () => {
    const newOrderItems: OrderItemData[] = selectedProducts.map(selection => ({
      inventoryItem: selection.item,
      ordered_quantity_level1: selection.quantities.level1,
      ordered_quantity_level2: selection.quantities.level2,
      ordered_quantity_level3: selection.quantities.level3,
      unit_price: selection.unitPrice || 0,
      notes: '',
      source_location: selection.item.location
    }));

    setOrderItems(prev => [...prev, ...newOrderItems]);
    setSelectedProducts([]); // Clear selections
  };

  const clearAllSelections = () => {
    setSelectedProducts([]);
  };

  const updateOrderItem = (index: number, field: keyof OrderItemData, value: any) => {
    setOrderItems(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const validateStock = (item: OrderItemData): { isValid: boolean; message?: string } => {
    const { inventoryItem, ordered_quantity_level1, ordered_quantity_level2, ordered_quantity_level3 } = item;

    const availableLevel1 = inventoryItem.unit_level1_quantity || 0;
    const availableLevel2 = inventoryItem.unit_level2_quantity || 0;
    const availableLevel3 = inventoryItem.unit_level3_quantity || 0;

    if (ordered_quantity_level1 > availableLevel1) {
      return {
        isValid: false,
        message: `ลัง: สั่ง ${ordered_quantity_level1} แต่มีเพียง ${availableLevel1}`
      };
    }

    if (ordered_quantity_level2 > availableLevel2) {
      return {
        isValid: false,
        message: `กล่อง: สั่ง ${ordered_quantity_level2} แต่มีเพียง ${availableLevel2}`
      };
    }

    if (ordered_quantity_level3 > availableLevel3) {
      return {
        isValid: false,
        message: `ชิ้น: สั่ง ${ordered_quantity_level3} แต่มีเพียง ${availableLevel3}`
      };
    }

    return { isValid: true };
  };

  const calculateOrderTotal = () => {
    return orderItems.reduce((total, item) => {
      const {
        ordered_quantity_level1,
        ordered_quantity_level2,
        ordered_quantity_level3,
        unit_price
      } = item;

      // Calculate total ordered pieces for pricing
      const level1Rate = item.inventoryItem.unit_level1_rate || 1;
      const level2Rate = item.inventoryItem.unit_level2_rate || 1;

      const totalPieces =
        (ordered_quantity_level1 * level1Rate * level2Rate) +
        (ordered_quantity_level2 * level2Rate) +
        ordered_quantity_level3;

      return total + (totalPieces * unit_price);
    }, 0);
  };

  const onSubmit = async (data: OrderFormData) => {
    // Validate all order items
    const stockValidations = orderItems.map(validateStock);
    const invalidItems = stockValidations.filter(v => !v.isValid);

    if (invalidItems.length > 0) {
      toast.error('จำนวนที่สั่งเกินสต็อก', {
        description: invalidItems[0].message
      });
      return;
    }

    if (orderItems.length === 0) {
      toast.error('กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ');
      return;
    }

    try {
      // Prepare order data
      const orderData = {
        ...data,
        final_amount: calculateOrderTotal(),
        order_items: orderItems.map(item => ({
          inventory_item_id: item.inventoryItem.id,
          ordered_quantity_level1: item.ordered_quantity_level1,
          ordered_quantity_level2: item.ordered_quantity_level2,
          ordered_quantity_level3: item.ordered_quantity_level3,
          unit_price: item.unit_price,
          notes: item.notes || '',
          source_location: item.source_location || item.inventoryItem.location,
        }))
      };

      console.log('📤 Creating sales order:', orderData);

      await createOrder.mutateAsync({
        orderData: {
          customer_id: orderData.customer_id,
          warehouse_id: orderData.warehouse_id,
          order_type: orderData.order_type,
          priority: orderData.priority,
          final_amount: orderData.final_amount
        },
        orderItems: orderData.order_items.map(item => ({
          ...item,
          order_id: '' // Will be set by the mutation
        }))
      });

      toast.success('สร้างใบสั่งขายสำเร็จ', {
        description: `สร้างใบสั่งขายพร้อม ${orderItems.length} รายการ`
      });

      // Reset form and close modal
      reset();
      setOrderItems([]);
      onClose();

    } catch (error) {
      console.error('❌ Sales order creation failed:', error);
      toast.error('ไม่สามารถสร้างใบสั่งขายได้', {
        description: 'กรุณาลองใหม่อีกครั้ง'
      });
    }
  };

  const handleClose = () => {
    reset();
    setOrderItems([]);
    setSelectedProducts([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            สร้างใบสั่งขายใหม่
          </DialogTitle>
          <DialogDescription>
            กรอกข้อมูลใบสั่งขายและเลือกสินค้าที่ต้องการ
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Customer & Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer_id">ลูกค้า *</Label>
              <CustomerSearchSelector
                selectedCustomerId={watchedCustomerId}
                onCustomerChange={(id) => setValue('customer_id', id || '')}
              />
              {errors.customer_id && (
                <p className="text-sm text-red-600">{errors.customer_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="warehouse_id">คลังสินค้า</Label>
              <CompactWarehouseSelector
                selectedWarehouseId={watchedWarehouseId}
                onWarehouseChange={(id) => setValue('warehouse_id', id)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="order_type">ประเภทออเดอร์</Label>
              <Select
                value={watch('order_type')}
                onValueChange={(value) => setValue('order_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกประเภท" />
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
              <Label htmlFor="priority">ความสำคัญ</Label>
              <Select
                value={watch('priority')}
                onValueChange={(value) => setValue('priority', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกความสำคัญ" />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full bg-${option.color}-500`} />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">วันที่กำหนดส่ง</Label>
              <Input
                type="date"
                {...register('due_date')}
              />
              {errors.due_date && (
                <p className="text-sm text-red-600">{errors.due_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_po_number">เลขที่ PO ลูกค้า</Label>
              <Input
                {...register('customer_po_number')}
                placeholder="เลขที่ Purchase Order ของลูกค้า"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_terms">เงื่อนไขการชำระเงิน (วัน)</Label>
              <Input
                type="number"
                min="0"
                {...register('payment_terms', { valueAsNumber: true })}
                placeholder="30"
              />
              {errors.payment_terms && (
                <p className="text-sm text-red-600">{errors.payment_terms.message}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Shipping Address */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">ที่อยู่จัดส่ง</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shipping_address_line1">ที่อยู่ 1</Label>
                <Input {...register('shipping_address_line1')} placeholder="บ้านเลขที่ ซอย ถนน" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shipping_address_line2">ที่อยู่ 2</Label>
                <Input {...register('shipping_address_line2')} placeholder="แขวง/ตำบล" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shipping_district">เขต/อำเภอ</Label>
                <Input {...register('shipping_district')} placeholder="เขต/อำเภอ" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shipping_province">จังหวัด</Label>
                <Input {...register('shipping_province')} placeholder="จังหวัด" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shipping_postal_code">รหัสไปรษณีย์</Label>
                <Input {...register('shipping_postal_code')} placeholder="12345" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shipping_contact_person">ผู้รับสินค้า</Label>
                <Input {...register('shipping_contact_person')} placeholder="ชื่อผู้รับสินค้า" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shipping_phone">เบอร์โทรผู้รับ</Label>
                <Input {...register('shipping_phone')} placeholder="08x-xxx-xxxx" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Product Selection Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">เลือกสินค้า</h3>
              {selectedProducts.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearAllSelections}
                  >
                    ล้างการเลือก
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={convertToOrderItems}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    เพิ่มเข้าใบสั่ง ({selectedProducts.length})
                  </Button>
                </div>
              )}
            </div>

            {/* Product Selection Grid */}
            <ProductSelectionGrid
              inventoryItems={availableInventoryItems}
              selectedItems={selectedProducts}
              onItemSelect={handleProductSelect}
              onItemRemove={handleProductRemove}
              warehouseId={watchedWarehouseId}
              isLoading={!inventoryItems}
            />

            {/* Inline Mini Cart for Mobile */}
            <div className="block lg:hidden">
              <InlineMiniCart
                items={selectedProducts}
                onItemRemove={handleProductRemove}
              />
            </div>

            {/* Order Items List */}
            <div className="space-y-4">
              {orderItems.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-muted-foreground">ยังไม่มีสินค้าในใบสั่งขาย</p>
                    <p className="text-sm text-muted-foreground">กดปุ่ม "เพิ่มสินค้า" เพื่อเลือกสินค้า</p>
                  </CardContent>
                </Card>
              ) : (
                orderItems.map((item, index) => {
                  const stockValidation = validateStock(item);
                  return (
                    <Card key={item.inventoryItem.id} className={!stockValidation.isValid ? 'border-red-200 bg-red-50' : ''}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{item.inventoryItem.product_name}</CardTitle>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOrderItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          รหัส: {item.inventoryItem.sku} | ตำแหน่ง: {item.inventoryItem.location}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* Available Stock */}
                          <div className="space-y-2">
                            <Label>สต็อกคงเหลือ</Label>
                            <div className="text-sm space-y-1">
                              <div>ลัง: {item.inventoryItem.unit_level1_quantity || 0}</div>
                              <div>กล่อง: {item.inventoryItem.unit_level2_quantity || 0}</div>
                              <div>ชิ้น: {item.inventoryItem.unit_level3_quantity || 0}</div>
                            </div>
                          </div>

                          {/* Ordered Quantities */}
                          <div className="space-y-3">
                            <Label>จำนวนที่สั่ง</Label>

                            <div className="space-y-2">
                              <Label className="text-xs">ลัง</Label>
                              <Input
                                type="number"
                                min="0"
                                value={item.ordered_quantity_level1}
                                onChange={(e) => updateOrderItem(index, 'ordered_quantity_level1', Number(e.target.value))}
                                placeholder="0"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs">กล่อง</Label>
                              <Input
                                type="number"
                                min="0"
                                value={item.ordered_quantity_level2}
                                onChange={(e) => updateOrderItem(index, 'ordered_quantity_level2', Number(e.target.value))}
                                placeholder="0"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs">ชิ้น</Label>
                              <Input
                                type="number"
                                min="0"
                                value={item.ordered_quantity_level3}
                                onChange={(e) => updateOrderItem(index, 'ordered_quantity_level3', Number(e.target.value))}
                                placeholder="0"
                              />
                            </div>
                          </div>

                          {/* Unit Price */}
                          <div className="space-y-2">
                            <Label>ราคาต่อชิ้น (฿)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unit_price}
                              onChange={(e) => updateOrderItem(index, 'unit_price', Number(e.target.value))}
                              placeholder="0.00"
                            />
                          </div>

                          {/* Item Notes */}
                          <div className="space-y-2">
                            <Label>หมายเหตุรายการ</Label>
                            <Textarea
                              rows={2}
                              value={item.notes || ''}
                              onChange={(e) => updateOrderItem(index, 'notes', e.target.value)}
                              placeholder="หมายเหตุสำหรับรายการนี้..."
                            />
                          </div>
                        </div>

                        {/* Stock Validation Warning */}
                        {!stockValidation.isValid && (
                          <div className="mt-3 flex items-center gap-2 text-red-600 bg-red-100 p-2 rounded">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-sm">{stockValidation.message}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          <Separator />

          {/* Order Summary */}
          <div className="bg-muted/30 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">สรุปใบสั่งขาย</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>จำนวนรายการ:</span>
                <span>{orderItems.length} รายการ</span>
              </div>
              <div className="flex justify-between text-lg font-semibold">
                <span>มูลค่ารวม:</span>
                <span>฿{calculateOrderTotal().toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">หมายเหตุใบสั่งขาย</Label>
            <Textarea
              {...register('notes')}
              rows={3}
              placeholder="หมายเหตุเพิ่มเติมสำหรับใบสั่งขาย..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createOrder.isPending}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              disabled={createOrder.isPending || orderItems.length === 0}
              className="flex items-center gap-2"
            >
              {createOrder.isPending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                  กำลังสร้าง...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  สร้างใบสั่งขาย
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Floating Mini Cart */}
      <div className="hidden lg:block">
        <FloatingMiniCart
          items={selectedProducts}
          onItemRemove={handleProductRemove}
          onPriceUpdate={handlePriceUpdate}
          onClearAll={clearAllSelections}
          onCheckout={convertToOrderItems}
          isVisible={selectedProducts.length > 0}
        />
      </div>
    </Dialog>
  );
}