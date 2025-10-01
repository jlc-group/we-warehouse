import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X, Package, AlertCircle, CheckCircle, User, FileText, Calendar, Building } from 'lucide-react';
import { MultiLocationProductSelector } from '@/components/MultiLocationProductSelector';
import { ManualFulfillmentService, type Customer, type ManualFulfillmentItemInput } from '@/services/manualFulfillmentService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContextSimple';

interface ManualFulfillmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ManualFulfillmentModal: React.FC<ManualFulfillmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { toast } = useToast();
  const { user } = useAuth();

  // Form state
  const [poNumber, setPoNumber] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [warehouseName, setWarehouseName] = useState('คลังหลัก');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ManualFulfillmentItemInput[]>([]);

  // UI state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [validatingPO, setValidatingPO] = useState(false);
  const [poValidation, setPOValidation] = useState<{ isValid: boolean; message?: string } | null>(null);

  // Load customers
  useEffect(() => {
    const loadCustomers = async () => {
      const results = await ManualFulfillmentService.fetchCustomers(customerSearch);
      setCustomers(results);
    };

    if (isOpen) {
      loadCustomers();
    }
  }, [isOpen, customerSearch]);

  // Validate PO Number
  const handlePONumberChange = async (value: string) => {
    setPoNumber(value);
    setPOValidation(null);

    if (value.trim().length >= 3) {
      setValidatingPO(true);
      const validation = await ManualFulfillmentService.validatePONumber(value);
      setPOValidation(validation);
      setValidatingPO(false);
    }
  };

  // เพิ่มสินค้า
  const handleAddProduct = (product: {
    product_name: string;
    product_code: string;
    total_quantity: number;
    locations: any[];
  }) => {
    const newItem: ManualFulfillmentItemInput = {
      product_name: product.product_name,
      product_code: product.product_code,
      requested_quantity: product.total_quantity,
      unit_price: 0, // ต้องกรอกเอง
      locations: product.locations
    };

    setItems([...items, newItem]);

    toast({
      title: '✅ เพิ่มสินค้าแล้ว',
      description: `${product.product_name} x ${product.total_quantity}`
    });
  };

  // ลบสินค้า
  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // อัปเดตราคา
  const handleUpdatePrice = (index: number, price: number) => {
    const newItems = [...items];
    newItems[index].unit_price = price;
    setItems(newItems);
  };

  // คำนวณยอดรวม
  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.requested_quantity * item.unit_price), 0);
  };

  // ตรวจสอบความพร้อม
  const canSubmit = () => {
    return (
      poNumber.trim() !== '' &&
      poValidation?.isValid &&
      selectedCustomer !== null &&
      deliveryDate !== '' &&
      items.length > 0 &&
      items.every(item => item.unit_price > 0)
    );
  };

  // บันทึก
  const handleSubmit = async () => {
    if (!canSubmit() || !user) return;

    setLoading(true);
    try {
      const result = await ManualFulfillmentService.createManualFulfillment({
        po_number: poNumber,
        customer_code: selectedCustomer!.customer_code,
        customer_id: selectedCustomer!.id,
        warehouse_name: warehouseName,
        delivery_date: deliveryDate,
        items,
        notes,
        created_by: user.id
      });

      if (result.success) {
        toast({
          title: '✅ สร้างงานสำเร็จ',
          description: `สร้างงานจัดสินค้า ${poNumber} แล้ว`
        });

        // Reset form
        setPoNumber('');
        setSelectedCustomer(null);
        setDeliveryDate('');
        setNotes('');
        setItems([]);
        setPOValidation(null);

        onClose();
        onSuccess?.();
      } else {
        toast({
          title: '❌ เกิดข้อผิดพลาด',
          description: result.error || 'ไม่สามารถสร้างงานได้',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: 'ไม่สามารถสร้างงานได้',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            สร้างใบจัดสินค้าใหม่
          </DialogTitle>
          <DialogDescription>
            สร้างงานจัดสินค้าแบบ Manual (ไม่มี PO จากระบบ)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* ข้อมูลหลัก */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ข้อมูลใบสั่งซื้อ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* PO Number */}
                <div>
                  <Label htmlFor="po_number">
                    <FileText className="inline h-4 w-4 mr-1" />
                    PO/Tax Invoice Number *
                  </Label>
                  <Input
                    id="po_number"
                    placeholder="PO-2024-XXX"
                    value={poNumber}
                    onChange={(e) => handlePONumberChange(e.target.value)}
                    className={
                      poValidation && !poValidation.isValid
                        ? 'border-red-500'
                        : poValidation?.isValid
                        ? 'border-green-500'
                        : ''
                    }
                  />
                  {validatingPO && (
                    <p className="text-sm text-gray-500 mt-1">กำลังตรวจสอบ...</p>
                  )}
                  {poValidation && !poValidation.isValid && (
                    <div className="flex items-center gap-1 text-red-600 text-sm mt-1">
                      <AlertCircle className="h-4 w-4" />
                      <span>{poValidation.message}</span>
                    </div>
                  )}
                  {poValidation?.isValid && (
                    <div className="flex items-center gap-1 text-green-600 text-sm mt-1">
                      <CheckCircle className="h-4 w-4" />
                      <span>PO Number พร้อมใช้งาน</span>
                    </div>
                  )}
                </div>

                {/* กำหนดส่ง */}
                <div>
                  <Label htmlFor="delivery_date">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    กำหนดส่ง *
                  </Label>
                  <Input
                    id="delivery_date"
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* ลูกค้า */}
                <div>
                  <Label htmlFor="customer">
                    <User className="inline h-4 w-4 mr-1" />
                    ลูกค้า *
                  </Label>
                  <Select
                    value={selectedCustomer?.id}
                    onValueChange={(value) => {
                      const customer = customers.find(c => c.id === value);
                      setSelectedCustomer(customer || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกลูกค้า..." />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.customer_code} - {customer.customer_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* คลัง */}
                <div>
                  <Label htmlFor="warehouse">
                    <Building className="inline h-4 w-4 mr-1" />
                    คลังปลายทาง
                  </Label>
                  <Input
                    id="warehouse"
                    value={warehouseName}
                    onChange={(e) => setWarehouseName(e.target.value)}
                    placeholder="คลังหลัก"
                  />
                </div>
              </div>

              {/* หมายเหตุ */}
              <div>
                <Label htmlFor="notes">หมายเหตุ</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="หมายเหตุเพิ่มเติม..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* รายการสินค้า */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <span>รายการสินค้า ({items.length} รายการ)</span>
                <MultiLocationProductSelector onProductSelected={handleAddProduct} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>ยังไม่มีรายการสินค้า</p>
                  <p className="text-sm">กดปุ่ม "เพิ่มสินค้า" เพื่อเลือกสินค้า</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <Card key={index} className="border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{item.product_name}</h4>
                              <Badge variant="outline" className="font-mono">
                                {item.product_code}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <Label className="text-xs text-gray-500">จำนวน</Label>
                                <p className="font-semibold">{item.requested_quantity}</p>
                              </div>
                              <div>
                                <Label htmlFor={`price-${index}`} className="text-xs text-gray-500">
                                  ราคา/หน่วย
                                </Label>
                                <Input
                                  id={`price-${index}`}
                                  type="number"
                                  value={item.unit_price || ''}
                                  onChange={(e) => handleUpdatePrice(index, parseFloat(e.target.value) || 0)}
                                  placeholder="0.00"
                                  min={0}
                                  step={0.01}
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500">มูลค่ารวม</Label>
                                <p className="font-semibold text-blue-600">
                                  {ManualFulfillmentService.formatCurrency(item.requested_quantity * item.unit_price)}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                              ตำแหน่ง: {item.locations.map(loc => `${loc.location} (${loc.quantity})`).join(', ')}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* สรุปยอด */}
          {items.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">มูลค่ารวมทั้งหมด:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {ManualFulfillmentService.formatCurrency(calculateTotal())}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ปุ่มดำเนินการ */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit() || loading}
              className="flex-1"
            >
              {loading ? 'กำลังบันทึก...' : 'บันทึกและสร้างงาน'}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              ยกเลิก
            </Button>
          </div>

          {/* คำเตือน */}
          {!canSubmit() && items.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-yellow-800">
                <p className="font-medium">กรุณากรอกข้อมูลให้ครบถ้วน:</p>
                <ul className="list-disc list-inside mt-1">
                  {!poNumber && <li>PO/Tax Invoice Number</li>}
                  {poValidation && !poValidation.isValid && <li>PO Number ซ้ำหรือไม่ถูกต้อง</li>}
                  {!selectedCustomer && <li>เลือกลูกค้า</li>}
                  {!deliveryDate && <li>กำหนดส่ง</li>}
                  {items.some(item => !item.unit_price || item.unit_price <= 0) && <li>ระบุราคาสินค้าทุกรายการ</li>}
                </ul>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManualFulfillmentModal;