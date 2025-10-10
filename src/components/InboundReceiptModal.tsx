/**
 * Inbound Receipt Modal - ฟอร์มรับเข้าสินค้า
 * รองรับการรับเข้าจาก PO และรับเข้าด้วยตนเอง
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Package,
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Factory,
  TruckIcon
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContextSimple';
import InboundReceiptService, {
  type ReceiptType,
  type CreateInboundReceiptItemInput
} from '@/services/inboundReceiptService';
import { supabase } from '@/integrations/supabase/client';

interface InboundReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  poNumber?: string; // ถ้ามี PO number จะ pre-fill form
  onSuccess?: () => void;
}

interface ProductOption {
  id: string;
  product_name: string;
  product_code: string;
  sku: string;
  unit_level1_name: string;
  unit_level2_name: string;
  unit_level3_name: string;
  unit_level1_rate: number;
  unit_level2_rate: number;
}

interface ReceiptItem extends CreateInboundReceiptItemInput {
  tempId: string; // สำหรับ key ใน React
}

export function InboundReceiptModal({
  isOpen,
  onClose,
  poNumber,
  onSuccess
}: InboundReceiptModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  // Form state
  const [receiptType, setReceiptType] = useState<ReceiptType>('manual');
  const [supplierName, setSupplierName] = useState('');
  const [supplierCode, setSupplierCode] = useState('');
  const [poNumberInput, setPoNumberInput] = useState(poNumber || '');
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Warehouse
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');

  // Products
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Items
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load warehouses and products on mount
  useEffect(() => {
    if (isOpen) {
      fetchWarehouses();
      fetchProducts();

      // Set default receipt type based on whether PO is provided
      if (poNumber) {
        setReceiptType('po_fg');
        setPoNumberInput(poNumber);
      }
    }
  }, [isOpen, poNumber]);

  const fetchWarehouses = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, warehouse_name')
        .eq('is_active', true)
        .order('warehouse_name');

      if (error) throw error;
      setWarehouses(data || []);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, product_name, product_code, sku_code, unit_level1_name, unit_level2_name, unit_level3_name, unit_level1_rate, unit_level2_rate')
        .eq('is_active', true)
        .order('product_name');

      if (error) throw error;

      setProducts((data || []).map(p => ({
        id: p.id,
        product_name: p.product_name,
        product_code: p.product_code || '',
        sku: p.sku_code || '',
        unit_level1_name: p.unit_level1_name || 'ลัง',
        unit_level2_name: p.unit_level2_name || 'กล่อง',
        unit_level3_name: p.unit_level3_name || 'ชิ้น',
        unit_level1_rate: p.unit_level1_rate || 144,
        unit_level2_rate: p.unit_level2_rate || 12
      })));
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleAddItem = () => {
    if (!selectedProduct) {
      toast({
        title: 'กรุณาเลือกสินค้า',
        variant: 'destructive'
      });
      return;
    }

    const newItem: ReceiptItem = {
      tempId: Date.now().toString(),
      product_id: selectedProduct.id,
      product_code: selectedProduct.product_code,
      product_name: selectedProduct.product_name,
      sku: selectedProduct.sku,
      received_quantity_level1: 0,
      received_quantity_level2: 0,
      received_quantity_level3: 0,
      unit_level1_name: selectedProduct.unit_level1_name,
      unit_level2_name: selectedProduct.unit_level2_name,
      unit_level3_name: selectedProduct.unit_level3_name,
      unit_level1_rate: selectedProduct.unit_level1_rate,
      unit_level2_rate: selectedProduct.unit_level2_rate,
      location: ''
    };

    setItems([...items, newItem]);
    setSelectedProduct(null);
  };

  const handleRemoveItem = (tempId: string) => {
    setItems(items.filter(item => item.tempId !== tempId));
  };

  const handleUpdateItem = (tempId: string, field: keyof ReceiptItem, value: any) => {
    setItems(items.map(item =>
      item.tempId === tempId ? { ...item, [field]: value } : item
    ));
  };

  const validateForm = (): boolean => {
    if (!supplierName.trim()) {
      setError('กรุณาระบุชื่อผู้ส่ง/ซัพพลายเออร์');
      return false;
    }

    if (receiptType.startsWith('po_') && !poNumberInput.trim()) {
      setError('กรุณาระบุเลขที่ PO');
      return false;
    }

    if (items.length === 0) {
      setError('กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ');
      return false;
    }

    // Check if all items have quantities
    const invalidItems = items.filter(item =>
      item.received_quantity_level1 === 0 &&
      item.received_quantity_level2 === 0 &&
      item.received_quantity_level3 === 0
    );

    if (invalidItems.length > 0) {
      setError('กรุณาระบุจำนวนสินค้าที่รับเข้าทุกรายการ');
      return false;
    }

    // Check if all items have location
    const noLocationItems = items.filter(item => !item.location || item.location.trim() === '');
    if (noLocationItems.length > 0) {
      setError('กรุณาระบุตำแหน่งเก็บสินค้าทุกรายการ');
      return false;
    }

    setError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const warehouse = warehouses.find(w => w.id === selectedWarehouseId);

      const result = await InboundReceiptService.createReceipt(
        {
          receipt_type: receiptType,
          supplier_code: supplierCode,
          supplier_name: supplierName,
          po_number: poNumberInput || undefined,
          delivery_note_number: deliveryNoteNumber || undefined,
          warehouse_id: selectedWarehouseId || undefined,
          warehouse_name: warehouse?.warehouse_name || undefined,
          notes: notes || undefined,
          items: items.map(({ tempId, ...item }) => item)
        },
        user?.id
      );

      if (result.success) {
        toast({
          title: '✅ บันทึกการรับเข้าสินค้าสำเร็จ',
          description: `เลขที่เอกสาร: ${result.receipt?.receipt_number}`
        });

        if (onSuccess) onSuccess();
        handleClose();
      } else {
        throw new Error(result.error || 'Failed to create receipt');
      }
    } catch (error: any) {
      console.error('Error creating receipt:', error);
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setReceiptType('manual');
    setSupplierName('');
    setSupplierCode('');
    setPoNumberInput('');
    setDeliveryNoteNumber('');
    setNotes('');
    setSelectedWarehouseId('');
    setItems([]);
    setSelectedProduct(null);
    setError('');

    onClose();
  };

  const getTotalPieces = (item: ReceiptItem): number => {
    return (
      (item.received_quantity_level1 || 0) * (item.unit_level1_rate || 144) +
      (item.received_quantity_level2 || 0) * (item.unit_level2_rate || 12) +
      (item.received_quantity_level3 || 0)
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            รับเข้าสินค้า (Goods Receipt)
          </DialogTitle>
          <DialogDescription>
            บันทึกการรับเข้าสินค้าจากโรงงาน/ซัพพลายเออร์
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Receipt Type Selection */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ประเภทการรับเข้า *</Label>
                  <Select value={receiptType} onValueChange={(value) => setReceiptType(value as ReceiptType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="po_fg">
                        <div className="flex items-center gap-2">
                          <Factory className="h-4 w-4" />
                          รับจากโรงงาน (FG) - มี PO
                        </div>
                      </SelectItem>
                      <SelectItem value="po_pk">
                        <div className="flex items-center gap-2">
                          <TruckIcon className="h-4 w-4" />
                          รับจากซัพพลายเออร์ (PK) - มี PO
                        </div>
                      </SelectItem>
                      <SelectItem value="manual">รับเข้าด้วยตนเอง (ไม่มี PO)</SelectItem>
                      <SelectItem value="return">สินค้าคืน</SelectItem>
                      <SelectItem value="adjustment">ปรับสต็อก</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>คลังที่รับเข้า</Label>
                  <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกคลัง..." />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map(wh => (
                        <SelectItem key={wh.id} value={wh.id}>
                          {wh.warehouse_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label>ชื่อผู้ส่ง/ซัพพลายเออร์ *</Label>
                  <Input
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="บริษัท ABC จำกัด"
                  />
                </div>

                <div className="space-y-2">
                  <Label>รหัสผู้ส่ง</Label>
                  <Input
                    value={supplierCode}
                    onChange={(e) => setSupplierCode(e.target.value)}
                    placeholder="SUP001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {receiptType.startsWith('po_') && (
                  <div className="space-y-2">
                    <Label>เลขที่ PO *</Label>
                    <Input
                      value={poNumberInput}
                      onChange={(e) => setPoNumberInput(e.target.value)}
                      placeholder="PO-2024-001"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>เลขที่ใบส่งของ</Label>
                  <Input
                    value={deliveryNoteNumber}
                    onChange={(e) => setDeliveryNoteNumber(e.target.value)}
                    placeholder="DN-2024-001"
                  />
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <Label>หมายเหตุ</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="บันทึกเพิ่มเติม..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Add Product */}
          <Card>
            <CardContent className="pt-6">
              <Label>เพิ่มสินค้า</Label>
              <div className="flex gap-2 mt-2">
                <Select
                  value={selectedProduct?.id || ''}
                  onValueChange={(value) => {
                    const product = products.find(p => p.id === value);
                    setSelectedProduct(product || null);
                  }}
                  disabled={loadingProducts}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={loadingProducts ? 'กำลังโหลด...' : 'เลือกสินค้า...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(product => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.product_code} - {product.product_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddItem} disabled={!selectedProduct}>
                  <Plus className="h-4 w-4 mr-2" />
                  เพิ่ม
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Items Table */}
          {items.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <Label className="mb-4 block">รายการสินค้า ({items.length} รายการ)</Label>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>สินค้า</TableHead>
                        <TableHead className="text-center">จำนวน (ลัง)</TableHead>
                        <TableHead className="text-center">จำนวน (กล่อง)</TableHead>
                        <TableHead className="text-center">จำนวน (ชิ้น)</TableHead>
                        <TableHead className="text-right">รวม (ชิ้น)</TableHead>
                        <TableHead>ตำแหน่ง</TableHead>
                        <TableHead className="text-center">Lot</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map(item => (
                        <TableRow key={item.tempId}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.product_name}</div>
                              <div className="text-xs text-gray-500">{item.product_code}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={item.received_quantity_level1 || ''}
                              onChange={(e) => handleUpdateItem(item.tempId, 'received_quantity_level1', parseInt(e.target.value) || 0)}
                              className="w-20 text-center"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={item.received_quantity_level2 || ''}
                              onChange={(e) => handleUpdateItem(item.tempId, 'received_quantity_level2', parseInt(e.target.value) || 0)}
                              className="w-20 text-center"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={item.received_quantity_level3 || ''}
                              onChange={(e) => handleUpdateItem(item.tempId, 'received_quantity_level3', parseInt(e.target.value) || 0)}
                              className="w-20 text-center"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline">{getTotalPieces(item).toLocaleString()}</Badge>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.location || ''}
                              onChange={(e) => handleUpdateItem(item.tempId, 'location', e.target.value)}
                              placeholder="A01-R01-L01"
                              className="w-32"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.lot_number || ''}
                              onChange={(e) => handleUpdateItem(item.tempId, 'lot_number', e.target.value)}
                              placeholder="LOT001"
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(item.tempId)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            ยกเลิก
          </Button>
          <Button onClick={handleSubmit} disabled={loading || items.length === 0}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                บันทึกการรับเข้า
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
