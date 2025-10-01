import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarIcon, FileText, ShoppingCart, User, Calendar, MapPin, CreditCard, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CustomerSelector, type Customer } from '@/components/CustomerSelector';
import { ProductOrderGrid, type OrderItem } from '@/components/ProductOrderGrid';
import { OrderCalculator, type OrderTotals } from '@/components/OrderCalculator';
import { useCreateSalesOrder, type CreateSalesOrderData } from '@/hooks/useSalesOrders';
import { toast } from 'sonner';

interface SalesOrderModalProps {
  trigger?: ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onOrderCreated?: (order: any) => void;
  initialCustomer?: Customer | null;
  className?: string;
}

interface OrderFormData {
  customer: Customer | null;
  orderItems: OrderItem[];
  orderTotals: OrderTotals;
  notes: string;
  deliveryAddress: string;
  deliveryInstructions: string;
  requiredDate: string;
  priority: 'normal' | 'high' | 'urgent';
}

const initialFormData: OrderFormData = {
  customer: null,
  orderItems: [],
  orderTotals: {
    subtotal: 0,
    discountAmount: 0,
    discountPercent: 0,
    taxAmount: 0,
    taxPercent: 7,
    total: 0,
    totalItems: 0,
  },
  notes: '',
  deliveryAddress: '',
  deliveryInstructions: '',
  requiredDate: '',
  priority: 'normal',
};

export const SalesOrderModal: React.FC<SalesOrderModalProps> = ({
  trigger,
  isOpen,
  onOpenChange,
  onOrderCreated,
  initialCustomer = null,
  className,
}) => {
  const [open, setOpen] = useState(isOpen || false);
  const [formData, setFormData] = useState<OrderFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<'customer' | 'products' | 'summary'>('customer');

  const createOrderMutation = useCreateSalesOrder();

  // Sync with external open state
  useEffect(() => {
    if (isOpen !== undefined) {
      setOpen(isOpen);
    }
  }, [isOpen]);

  // Set initial customer
  useEffect(() => {
    if (initialCustomer) {
      setFormData(prev => ({ ...prev, customer: initialCustomer }));
      setCurrentStep('products');
    }
  }, [initialCustomer]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);

    if (!newOpen) {
      // Reset form when closing
      setFormData(initialFormData);
      setCurrentStep('customer');
    }
  };

  const handleCustomerSelect = (customer: Customer | null) => {
    setFormData(prev => ({
      ...prev,
      customer,
      // Auto-fill delivery address from customer address
      deliveryAddress: customer?.address || prev.deliveryAddress,
    }));

    if (customer) {
      setCurrentStep('products');
    }
  };

  const handleOrderItemsChange = (orderItems: OrderItem[]) => {
    setFormData(prev => ({ ...prev, orderItems }));
  };

  const handleOrderTotalsChange = (orderTotals: OrderTotals) => {
    setFormData(prev => ({ ...prev, orderTotals }));
  };

  const handleCreateOrder = async () => {
    if (!formData.customer) {
      toast.error('กรุณาเลือกลูกค้า');
      setCurrentStep('customer');
      return;
    }

    if (formData.orderItems.length === 0) {
      toast.error('กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ');
      setCurrentStep('products');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderData: CreateSalesOrderData = {
        customer_id: formData.customer.id,
        subtotal: formData.orderTotals.subtotal,
        discount_amount: formData.orderTotals.discountAmount,
        tax_amount: formData.orderTotals.taxAmount,
        total_amount: formData.orderTotals.total,
        notes: formData.notes.trim() || undefined,
        delivery_address: formData.deliveryAddress.trim() || undefined,
        delivery_instructions: formData.deliveryInstructions.trim() || undefined,
        required_date: formData.requiredDate || undefined,
        order_items: formData.orderItems.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          product_sku: item.product_sku,
          quantity_cartons: item.quantity_cartons,
          quantity_boxes: item.quantity_boxes,
          quantity_pieces: item.quantity_pieces,
          total_pieces: item.total_pieces,
          unit_price: item.unit_price,
          line_total: item.line_total,
        })),
      };

      console.log('🛒 Creating sales order:', orderData);

      // สร้างใบสั่งซื้อผ่าน mutation
      const newOrder = await createOrderMutation.mutateAsync(orderData);

      console.log('✅ Order created successfully:', newOrder);

      // เรียก callback
      onOrderCreated?.(newOrder);

      // ปิด modal และ reset form
      handleOpenChange(false);

    } catch (error) {
      console.error('❌ Error creating order:', error);
      toast.error('เกิดข้อผิดพลาดในการสร้างใบสั่งซื้อ', {
        description: error instanceof Error ? error.message : 'กรุณาลองใหม่อีกครั้ง',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceedToSummary = formData.customer && formData.orderItems.length > 0;

  const getStepIcon = (step: typeof currentStep) => {
    switch (step) {
      case 'customer':
        return <User className="h-4 w-4" />;
      case 'products':
        return <ShoppingCart className="h-4 w-4" />;
      case 'summary':
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStepTitle = (step: typeof currentStep) => {
    switch (step) {
      case 'customer':
        return 'เลือกลูกค้า';
      case 'products':
        return 'เลือกสินค้า';
      case 'summary':
        return 'สรุปใบสั่งซื้อ';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            สร้างใบสั่งซื้อใหม่
          </DialogTitle>
          <DialogDescription>
            กรอกข้อมูลใบสั่งซื้อและเลือกสินค้าที่ต้องการ
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center space-x-4 py-4 border-b">
          {(['customer', 'products', 'summary'] as const).map((step, index) => (
            <div
              key={step}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                currentStep === step
                  ? "bg-primary text-primary-foreground"
                  : index < (['customer', 'products', 'summary'] as const).indexOf(currentStep)
                  ? "bg-green-100 text-green-700"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {getStepIcon(step)}
              <span>{getStepTitle(step)}</span>
              {step === 'customer' && formData.customer && (
                <Badge variant="secondary" className="ml-1">✓</Badge>
              )}
              {step === 'products' && formData.orderItems.length > 0 && (
                <Badge variant="secondary" className="ml-1">{formData.orderItems.length}</Badge>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-6">
          {/* Step 1: Customer Selection */}
          {currentStep === 'customer' && (
            <div className="space-y-4">
              <CustomerSelector
                selectedCustomer={formData.customer}
                onCustomerSelect={handleCustomerSelect}
                placeholder="ค้นหาและเลือกลูกค้า..."
              />

              {formData.customer && (
                <div className="flex justify-end">
                  <Button onClick={() => setCurrentStep('products')}>
                    ถัดไป: เลือกสินค้า
                    <ShoppingCart className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Product Selection */}
          {currentStep === 'products' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ProductOrderGrid
                  orderItems={formData.orderItems}
                  onOrderItemsChange={handleOrderItemsChange}
                />
              </div>
              <div className="space-y-4">
                <OrderCalculator
                  orderItems={formData.orderItems}
                  onTotalChange={handleOrderTotalsChange}
                />

                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep('customer')}
                    className="w-full"
                  >
                    <User className="mr-2 h-4 w-4" />
                    กลับไปเลือกลูกค้า
                  </Button>

                  {canProceedToSummary && (
                    <Button onClick={() => setCurrentStep('summary')} className="w-full">
                      สรุปใบสั่งซื้อ
                      <FileText className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Order Summary */}
          {currentStep === 'summary' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                {/* Customer Info */}
                {formData.customer && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">ข้อมูลลูกค้า</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <span className="font-medium">{formData.customer.name}</span>
                        {formData.customer.company_name && (
                          <span className="text-muted-foreground ml-2">({formData.customer.company_name})</span>
                        )}
                      </div>
                      {formData.customer.phone && (
                        <div className="text-sm text-muted-foreground">
                          โทร: {formData.customer.phone}
                        </div>
                      )}
                      {formData.customer.email && (
                        <div className="text-sm text-muted-foreground">
                          อีเมล: {formData.customer.email}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Additional Info */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">ข้อมูลเพิ่มเติม</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Required Date */}
                    <div className="space-y-2">
                      <Label htmlFor="required-date" className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        วันที่ต้องการสินค้า
                      </Label>
                      <input
                        id="required-date"
                        type="date"
                        value={formData.requiredDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, requiredDate: e.target.value }))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>

                    {/* Priority */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        ความสำคัญ
                      </Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value: 'normal' | 'high' | 'urgent') =>
                          setFormData(prev => ({ ...prev, priority: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">ปกติ</SelectItem>
                          <SelectItem value="high">สำคัญ</SelectItem>
                          <SelectItem value="urgent">เร่งด่วน</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Delivery Address */}
                    <div className="space-y-2">
                      <Label htmlFor="delivery-address" className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        ที่อยู่จัดส่ง
                      </Label>
                      <Textarea
                        id="delivery-address"
                        value={formData.deliveryAddress}
                        onChange={(e) => setFormData(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                        placeholder="ที่อยู่สำหรับจัดส่งสินค้า (ถ้าไม่ระบุจะใช้ที่อยู่ลูกค้า)"
                        rows={3}
                      />
                    </div>

                    {/* Delivery Instructions */}
                    <div className="space-y-2">
                      <Label htmlFor="delivery-instructions">คำแนะนำการจัดส่ง</Label>
                      <Textarea
                        id="delivery-instructions"
                        value={formData.deliveryInstructions}
                        onChange={(e) => setFormData(prev => ({ ...prev, deliveryInstructions: e.target.value }))}
                        placeholder="คำแนะนำพิเศษสำหรับการจัดส่ง"
                        rows={2}
                      />
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label htmlFor="notes">หมายเหตุ</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="หมายเหตุเพิ่มเติม"
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                {/* Order Summary */}
                <OrderCalculator
                  orderItems={formData.orderItems}
                  onTotalChange={handleOrderTotalsChange}
                />

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep('products')}
                    className="w-full"
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    กลับไปแก้ไขสินค้า
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            ยกเลิก
          </Button>

          {currentStep === 'summary' && (
            <Button onClick={handleCreateOrder} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  กำลังสร้าง...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  สร้างใบสั่งซื้อ
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SalesOrderModal;