import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  Plus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

interface InventoryItem {
  id: string;
  product_name: string;
  sku: string;
  location: string;
  product_type?: string;
  unit_level1_quantity: number;
  unit_level2_quantity: number;
  unit_level3_quantity: number;
  unit_level1_name: string;
  unit_level2_name: string;
  unit_level3_name: string;
  unit_level1_rate: number;
  unit_level2_rate: number;
}

interface Customer {
  id: string;
  customer_name: string;
  customer_code: string;
}

interface CustomerAllocation {
  customerId: string;
  customerName: string;
  customerCode: string;
  // จำนวนแต่ละหน่วย
  level1: number;  // ลัง
  level2: number;  // กล่อง
  level3: number;  // ชิ้น
  // อัตราแปลง (snapshot)
  unitLevel1Name: string;
  unitLevel2Name: string;
  unitLevel3Name: string;
  unitLevel1Rate: number;
  unitLevel2Rate: number;
  // คำนวณอัตโนมัติ
  totalPieces: number;
}

interface SelectedItem {
  inventoryItem: InventoryItem;
  allocations: CustomerAllocation[];  // หลายลูกค้าต่อสินค้าได้!
  totalAllocated: {
    level1: number;
    level2: number;
    level3: number;
    pieces: number;
  };
}

interface BulkExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryItems?: InventoryItem[]; // รับข้อมูลจาก parent component
}

export function BulkExportModal({ open, onOpenChange, inventoryItems: inventoryItemsProp }: BulkExportModalProps) {
  const [step, setStep] = useState<'select_items' | 'allocate_customers' | 'summary'>('select_items');

  // เพิ่ม state สำหรับ PO Number และ Invoice Number
  const [poNumber, setPoNumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');

  // Step 1: เลือกสินค้าจากหลาย Location (ไม่ใส่จำนวน)
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [productTypeFilter, setProductTypeFilter] = useState<'all' | 'FG' | 'PK'>('all');

  // Product type mapping from products table
  const [productTypeMap, setProductTypeMap] = useState<Record<string, string>>({});

  // Step 2: แบ่งจำนวนให้ลูกค้า (ใส่จำนวนเป็นหน่วย)
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');

  // Step 3: สรุปและยืนยัน
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ใช้ข้อมูลจาก prop (จาก useDepartmentInventory) แทนการ fetch เอง
  const inventoryItems = useMemo(() => {
    if (!inventoryItemsProp) return [];

    // กรองเฉพาะสินค้าที่มีสต็อก > 0
    return inventoryItemsProp.filter(item => {
      const totalPieces =
        (item.unit_level1_quantity || 0) * (item.unit_level1_rate || 144) +
        (item.unit_level2_quantity || 0) * (item.unit_level2_rate || 12) +
        (item.unit_level3_quantity || 0);
      return totalPieces > 0;
    });
  }, [inventoryItemsProp]);

  useEffect(() => {
    if (open) {
      fetchCustomers();
      fetchProductTypes();
      console.log('✅ BulkExportModal: ใช้ข้อมูลจาก parent:', inventoryItems.length, 'รายการ');
    }
  }, [open, inventoryItems.length]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, customer_name, customer_code')
        .eq('is_active', true)
        .order('customer_name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('ไม่สามารถโหลดข้อมูลลูกค้าได้');
    }
  };

  const fetchProductTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('sku_code, product_type');

      if (error) throw error;

      // สร้าง map: SKU -> product_type
      const typeMap: Record<string, string> = {};
      data?.forEach(product => {
        if (product.sku_code && product.product_type) {
          typeMap[product.sku_code] = product.product_type;
        }
      });

      setProductTypeMap(typeMap);
      console.log('✅ Loaded product types for', Object.keys(typeMap).length, 'SKUs');
    } catch (error) {
      console.error('Error fetching product types:', error);
    }
  };

  const calculateTotalPieces = (item: InventoryItem): number => {
    const fromLevel1 = (item.unit_level1_quantity || 0) * (item.unit_level1_rate || 0);
    const fromLevel2 = (item.unit_level2_quantity || 0) * (item.unit_level2_rate || 0);
    const fromLevel3 = item.unit_level3_quantity || 0;
    return fromLevel1 + fromLevel2 + fromLevel3;
  };

  const handleAddItem = (item: InventoryItem) => {
    const exists = selectedItems.find(si => si.inventoryItem.id === item.id);
    if (exists) {
      toast.warning(`${item.product_name} (${item.location}) ถูกเลือกแล้ว`);
      return;
    }

    setSelectedItems(prev => [...prev, {
      inventoryItem: item,
      allocations: [],  // เริ่มต้นไม่มีลูกค้า
      totalAllocated: {
        level1: 0,
        level2: 0,
        level3: 0,
        pieces: 0
      }
    }]);
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(si => si.inventoryItem.id !== itemId));
  };

  // เพิ่มลูกค้าให้กับสินค้า
  const handleAddCustomerToItem = (itemId: string, customer: Customer) => {
    setSelectedItems(prev => prev.map(si => {
      if (si.inventoryItem.id !== itemId) return si;

      // ตรวจสอบว่ามีลูกค้านี้อยู่แล้วหรือไม่
      const exists = si.allocations.find(a => a.customerId === customer.id);
      if (exists) {
        toast.warning(`${customer.customer_name} ถูกเพิ่มแล้ว`);
        return si;
      }

      // เพิ่มลูกค้าใหม่
      const newAllocation: CustomerAllocation = {
        customerId: customer.id,
        customerName: customer.customer_name,
        customerCode: customer.customer_code,
        level1: 0,
        level2: 0,
        level3: 0,
        unitLevel1Name: si.inventoryItem.unit_level1_name || 'ลัง',
        unitLevel2Name: si.inventoryItem.unit_level2_name || 'กล่อง',
        unitLevel3Name: si.inventoryItem.unit_level3_name || 'ชิ้น',
        unitLevel1Rate: si.inventoryItem.unit_level1_rate || 0,
        unitLevel2Rate: si.inventoryItem.unit_level2_rate || 0,
        totalPieces: 0
      };

      return {
        ...si,
        allocations: [...si.allocations, newAllocation]
      };
    }));
  };

  // ลบลูกค้าออกจากสินค้า
  const handleRemoveCustomerFromItem = (itemId: string, customerId: string) => {
    setSelectedItems(prev => prev.map(si => {
      if (si.inventoryItem.id !== itemId) return si;

      const newAllocations = si.allocations.filter(a => a.customerId !== customerId);
      const totalAllocated = calculateTotalAllocated(newAllocations, si.inventoryItem);

      return {
        ...si,
        allocations: newAllocations,
        totalAllocated
      };
    }));
  };

  // อัปเดตจำนวนของลูกค้าในสินค้า
  const handleUpdateAllocation = (
    itemId: string,
    customerId: string,
    level: 'level1' | 'level2' | 'level3',
    value: number
  ) => {
    setSelectedItems(prev => prev.map(si => {
      if (si.inventoryItem.id !== itemId) return si;

      const newAllocations = si.allocations.map(alloc => {
        if (alloc.customerId !== customerId) return alloc;

        const updated = { ...alloc, [level]: Math.max(0, value) };

        // คำนวณ totalPieces
        updated.totalPieces =
          updated.level1 * updated.unitLevel1Rate +
          updated.level2 * updated.unitLevel2Rate +
          updated.level3;

        return updated;
      });

      const totalAllocated = calculateTotalAllocated(newAllocations, si.inventoryItem);

      return {
        ...si,
        allocations: newAllocations,
        totalAllocated
      };
    }));
  };

  // ส่งทั้งหมดให้ลูกค้า 1 คน (Quick Mode)
  const handleAssignAllToCustomer = (itemId: string, customer: Customer) => {
    setSelectedItems(prev => prev.map(si => {
      if (si.inventoryItem.id !== itemId) return si;

      const allocation: CustomerAllocation = {
        customerId: customer.id,
        customerName: customer.customer_name,
        customerCode: customer.customer_code,
        level1: si.inventoryItem.unit_level1_quantity || 0,
        level2: si.inventoryItem.unit_level2_quantity || 0,
        level3: si.inventoryItem.unit_level3_quantity || 0,
        unitLevel1Name: si.inventoryItem.unit_level1_name || 'ลัง',
        unitLevel2Name: si.inventoryItem.unit_level2_name || 'กล่อง',
        unitLevel3Name: si.inventoryItem.unit_level3_name || 'ชิ้น',
        unitLevel1Rate: si.inventoryItem.unit_level1_rate || 0,
        unitLevel2Rate: si.inventoryItem.unit_level2_rate || 0,
        totalPieces: calculateTotalPieces(si.inventoryItem)
      };

      const totalAllocated = {
        level1: allocation.level1,
        level2: allocation.level2,
        level3: allocation.level3,
        pieces: allocation.totalPieces
      };

      return {
        ...si,
        allocations: [allocation],  // แทนที่ allocations ทั้งหมด
        totalAllocated
      };
    }));

    toast.success(`กำหนดส่งทั้งหมดให้ ${customer.customer_name}`);
  };

  // Helper: คำนวณ totalAllocated
  const calculateTotalAllocated = (allocations: CustomerAllocation[], item: InventoryItem) => {
    const total = allocations.reduce(
      (acc, alloc) => ({
        level1: acc.level1 + alloc.level1,
        level2: acc.level2 + alloc.level2,
        level3: acc.level3 + alloc.level3,
        pieces: acc.pieces + alloc.totalPieces
      }),
      { level1: 0, level2: 0, level3: 0, pieces: 0 }
    );

    return total;
  };

  const getTotalExportPieces = (): number => {
    return selectedItems.reduce((sum, si) => sum + si.totalAllocated.pieces, 0);
  };

  const canProceedToAllocate = (): boolean => {
    return selectedItems.length > 0;
  };

  const canProceedToSummary = (): boolean => {
    // ต้องมีอย่างน้อย 1 สินค้าที่มีการแบ่งให้ลูกค้าแล้ว
    const hasAllocations = selectedItems.some(si => si.allocations.length > 0);

    // ตรวจสอบว่าไม่มีสินค้าไหนถูกแบ่งเกิน
    const noOverAllocation = selectedItems.every(si => {
      const item = si.inventoryItem;
      const totalPieces = calculateTotalPieces(item);
      return si.totalAllocated.pieces <= totalPieces;
    });

    return hasAllocations && noOverAllocation;
  };

  const handleSubmit = async () => {
    if (!canProceedToSummary()) {
      toast.error('กรุณาตรวจสอบข้อมูลให้ครบถ้วน');
      return;
    }

    setIsSubmitting(true);

    try {
      let totalCustomers = 0;
      let totalExports = 0;

      // สำหรับแต่ละสินค้า
      for (const selectedItem of selectedItems) {
        if (selectedItem.allocations.length === 0) continue;

        const item = selectedItem.inventoryItem;
        const location = item.location;

        // สำหรับแต่ละลูกค้าในสินค้านี้
        for (const allocation of selectedItem.allocations) {
          if (allocation.totalPieces === 0) continue;

          // สร้าง notes รวม PO และ Invoice
          const notes = [
            'ส่งออกแบบหลายรายการพร้อมกัน',
            poNumber ? `PO: ${poNumber}` : null,
            invoiceNumber ? `Invoice: ${invoiceNumber}` : null
          ].filter(Boolean).join(' | ');

          // บันทึก customer_exports
          await supabase.from('customer_exports').insert({
            customer_id: allocation.customerId,
            customer_name: allocation.customerName,
            customer_code: allocation.customerCode,
            product_name: item.product_name,
            product_code: item.sku,
            inventory_item_id: item.id,
            quantity_exported: allocation.totalPieces,
            quantity_level1: allocation.level1,
            quantity_level2: allocation.level2,
            quantity_level3: allocation.level3,
            unit_level1_name: allocation.unitLevel1Name,
            unit_level2_name: allocation.unitLevel2Name,
            unit_level3_name: allocation.unitLevel3Name,
            unit_level1_rate: allocation.unitLevel1Rate,
            unit_level2_rate: allocation.unitLevel2Rate,
            from_location: location,
            notes: notes,
            user_id: '00000000-0000-0000-0000-000000000000'
          });

          // บันทึก system_events พร้อม PO และ Invoice ใน metadata
          await supabase.from('system_events').insert({
            event_type: 'inventory',
            event_category: 'stock_movement',
            event_action: 'bulk_export',
            event_title: 'ส่งออกหลายรายการ',
            event_description: `ส่งออก ${item.product_name} จาก ${location} จำนวน ${allocation.totalPieces} ชิ้น ไปยัง ${allocation.customerName}${poNumber ? ` (PO: ${poNumber})` : ''}${invoiceNumber ? ` (Invoice: ${invoiceNumber})` : ''}`,
            metadata: {
              item_id: item.id,
              product_name: item.product_name,
              quantity: allocation.totalPieces,
              location: location,
              customer_id: allocation.customerId,
              customer_name: allocation.customerName,
              level1: allocation.level1,
              level2: allocation.level2,
              level3: allocation.level3,
              po_number: poNumber || null,
              invoice_number: invoiceNumber || null
            },
            user_id: '00000000-0000-0000-0000-000000000000'
          });

          totalExports++;
        }

        // คำนวณสต็อกใหม่ (หักรวมจากทุกลูกค้า)
        const newLevel1 = item.unit_level1_quantity - selectedItem.totalAllocated.level1;
        const newLevel2 = item.unit_level2_quantity - selectedItem.totalAllocated.level2;
        const newLevel3 = item.unit_level3_quantity - selectedItem.totalAllocated.level3;

        // อัปเดตสต็อก
        const { error: updateError } = await supabase
          .from('inventory_items')
          .update({
            unit_level1_quantity: newLevel1,
            unit_level2_quantity: newLevel2,
            unit_level3_quantity: newLevel3
          })
          .eq('id', item.id);

        if (updateError) throw updateError;

        // บันทึกประวัติ inventory_movements
        await supabase.from('inventory_movements').insert({
          inventory_item_id: item.id,
          movement_type: 'out',
          quantity_boxes_before: item.unit_level1_quantity,
          quantity_loose_before: item.unit_level2_quantity,
          quantity_boxes_after: newLevel1,
          quantity_loose_after: newLevel2,
          quantity_boxes_change: -selectedItem.totalAllocated.level1,
          quantity_loose_change: -selectedItem.totalAllocated.level2,
          location_before: location,
          location_after: `ส่งออกให้ ${selectedItem.allocations.length} ลูกค้า`,
          notes: `ส่งออกแบบหลายรายการ - รวม ${selectedItem.totalAllocated.pieces} ชิ้น`
        });

        // ลบ item ถ้าสต็อกเป็น 0
        if (newLevel1 === 0 && newLevel2 === 0 && newLevel3 === 0) {
          await supabase.from('inventory_items').delete().eq('id', item.id);

          await supabase.from('system_events').insert({
            event_type: 'location',
            event_category: 'location_management',
            event_action: 'location_cleared',
            event_title: `ตำแหน่ง ${location} ว่างแล้ว`,
            event_description: `สินค้า ${item.product_name} ถูกส่งออกหมดจาก ${location}`,
            metadata: { location, product_name: item.product_name },
            location_context: location,
            status: 'success',
            user_id: '00000000-0000-0000-0000-000000000000'
          });
        }
      }

      // นับจำนวนลูกค้าทั้งหมด (ไม่ซ้ำ)
      const uniqueCustomers = new Set(
        selectedItems.flatMap(si => si.allocations.map(a => a.customerId))
      );
      totalCustomers = uniqueCustomers.size;

      toast.success(`ส่งออกสำเร็จ ${totalExports} รายการ ให้ ${totalCustomers} ลูกค้า!`);

      // รีเซ็ตและปิด Modal
      handleClose();

      // รีเฟรชหน้า
      window.location.reload();

    } catch (error) {
      console.error('Error bulk export:', error);
      toast.error('เกิดข้อผิดพลาดในการส่งออก');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('select_items');
    setSelectedItems([]);
    setProductSearchTerm('');
    setCustomerSearchTerm('');
    setPoNumber('');
    setInvoiceNumber('');
    onOpenChange(false);
  };

  const filteredInventory = inventoryItems.filter(item => {
    // Filter by search term
    const matchesSearch =
      item.product_name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(productSearchTerm.toLowerCase())) ||
      item.location.toLowerCase().includes(productSearchTerm.toLowerCase());

    // Filter by product type
    if (productTypeFilter === 'all') return matchesSearch;

    // ใช้ product_type จาก products table ผ่าน SKU lookup
    const productType = item.sku ? productTypeMap[item.sku] : undefined;
    return matchesSearch && productType === productTypeFilter;
  });

  const filteredCustomers = customers.filter(c =>
    c.customer_name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    c.customer_code.toLowerCase().includes(customerSearchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-full h-full sm:max-w-6xl sm:max-h-[90vh] overflow-y-auto">
        <DialogHeader className="p-4 sm:p-6">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Package className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">ส่งออกหลายรายการพร้อมกัน</span>
            <span className="sm:hidden">ส่งออกหลายรายการ</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            <span className="hidden sm:inline">เลือกสินค้าจากหลาย Location และแบ่งส่งให้หลายลูกค้าในครั้งเดียว</span>
            <span className="sm:hidden">เลือกสินค้าและแบ่งให้ลูกค้า</span>
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-1 sm:gap-2 mb-3 sm:mb-4 overflow-x-auto">
          <Button
            variant={step === 'select_items' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStep('select_items')}
            className="h-9 sm:h-8 text-[10px] sm:text-xs flex-shrink-0"
          >
            <span className="hidden sm:inline">1. เลือกสินค้า</span>
            <span className="sm:hidden">1. เลือก</span>
          </Button>
          <Separator className="w-4 sm:w-8" />
          <Button
            variant={step === 'allocate_customers' ? 'default' : 'outline'}
            size="sm"
            onClick={() => canProceedToAllocate() && setStep('allocate_customers')}
            disabled={!canProceedToAllocate()}
            className="h-9 sm:h-8 text-[10px] sm:text-xs flex-shrink-0"
          >
            <span className="hidden sm:inline">2. แบ่งให้ลูกค้า</span>
            <span className="sm:hidden">2. แบ่ง</span>
          </Button>
          <Separator className="w-4 sm:w-8" />
          <Button
            variant={step === 'summary' ? 'default' : 'outline'}
            size="sm"
            onClick={() => canProceedToSummary() && setStep('summary')}
            disabled={!canProceedToSummary()}
            className="h-9 sm:h-8 text-[10px] sm:text-xs flex-shrink-0"
          >
            <span className="hidden sm:inline">3. สรุปและยืนยัน</span>
            <span className="sm:hidden">3. ยืนยัน</span>
          </Button>
        </div>

        {/* Step 1: เลือกสินค้า */}
        {step === 'select_items' && (
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              {/* รายการสินค้าทั้งหมด */}
              <Card>
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-xs sm:text-sm flex items-center justify-between">
                    <span>รายการสินค้าในคลัง</span>
                    <Badge variant="secondary" className="text-[10px] sm:text-xs">{filteredInventory.length} รายการ</Badge>
                  </CardTitle>
                  <Input
                    placeholder="ค้นหาสินค้า, SKU, Location..."
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    className="h-11 sm:h-10 text-xs sm:text-sm"
                  />
                  {/* Filter ประเภทสินค้า */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setProductTypeFilter('all')}
                      className={`flex-1 transition-all ${
                        productTypeFilter === 'all'
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'hover:bg-accent'
                      }`}
                    >
                      ✨ ทั้งหมด
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setProductTypeFilter('FG')}
                      className={`flex-1 transition-all ${
                        productTypeFilter === 'FG'
                          ? 'bg-green-600 text-white border-green-600 shadow-md hover:bg-green-700'
                          : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                      }`}
                    >
                      🏭 FG
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setProductTypeFilter('PK')}
                      className={`flex-1 transition-all ${
                        productTypeFilter === 'PK'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md hover:bg-blue-700'
                          : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                      }`}
                    >
                      📦 PK
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>สินค้า</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>สต็อก</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInventory.map(item => {
                        const productType = item.sku ? productTypeMap[item.sku] : undefined;
                        return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium text-sm">{item.product_name}</p>
                              <div className="flex items-center gap-1">
                                <Badge variant="outline" className="text-xs">{item.sku}</Badge>
                                {productType === 'FG' && (
                                  <Badge className="text-xs bg-green-100 text-green-700 border-green-200">🏭 FG</Badge>
                                )}
                                {productType === 'PK' && (
                                  <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200">📦 PK</Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span className="text-sm">{item.location}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs space-y-0.5">
                              {(item.unit_level1_quantity || 0) > 0 && (
                                <p className="text-orange-600 font-medium">
                                  🏭 {item.unit_level1_quantity} {item.unit_level1_name}
                                </p>
                              )}
                              {(item.unit_level2_quantity || 0) > 0 && (
                                <p className="text-blue-600 font-medium">
                                  📦 {item.unit_level2_quantity} {item.unit_level2_name}
                                </p>
                              )}
                              {(item.unit_level3_quantity || 0) > 0 && (
                                <p className="text-green-600 font-medium">
                                  🔢 {item.unit_level3_quantity} {item.unit_level3_name}
                                </p>
                              )}
                              <p className="text-muted-foreground font-semibold pt-0.5 border-t">
                                รวม: {calculateTotalPieces(item).toLocaleString()} {item.unit_level3_name}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleAddItem(item)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* สินค้าที่เลือก */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    สินค้าที่เลือก ({selectedItems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-96 overflow-y-auto space-y-2">
                  {selectedItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      ยังไม่ได้เลือกสินค้า
                    </p>
                  ) : (
                    selectedItems.map(si => {
                      const productType = si.inventoryItem.sku ? productTypeMap[si.inventoryItem.sku] : undefined;
                      return (
                      <div key={si.inventoryItem.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{si.inventoryItem.product_name}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className="text-xs">{si.inventoryItem.sku}</Badge>
                              {productType === 'FG' && (
                                <Badge className="text-xs bg-green-100 text-green-700 border-green-200">🏭 FG</Badge>
                              )}
                              {productType === 'PK' && (
                                <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200">📦 PK</Badge>
                              )}
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {si.inventoryItem.location}
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveItem(si.inventoryItem.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>

                        {/* แสดงสต็อกคงเหลือ */}
                        <div className="bg-muted/50 rounded p-2 text-xs">
                          <span className="font-semibold text-muted-foreground">สต็อกพร้อมส่ง: </span>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {si.inventoryItem.unit_level1_quantity > 0 && (
                              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[10px]">
                                {si.inventoryItem.unit_level1_quantity} {si.inventoryItem.unit_level1_name}
                              </Badge>
                            )}
                            {si.inventoryItem.unit_level2_quantity > 0 && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                                {si.inventoryItem.unit_level2_quantity} {si.inventoryItem.unit_level2_name}
                              </Badge>
                            )}
                            {si.inventoryItem.unit_level3_quantity > 0 && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">
                                {si.inventoryItem.unit_level3_quantity} {si.inventoryItem.unit_level3_name}
                              </Badge>
                            )}
                            <Badge variant="default" className="text-[10px]">
                              รวม: {calculateTotalPieces(si.inventoryItem)} ชิ้น
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                ยกเลิก
              </Button>
              <Button
                onClick={() => setStep('allocate_customers')}
                disabled={!canProceedToAllocate()}
              >
                ต่อไป: แบ่งให้ลูกค้า
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: แบ่งจำนวนให้ลูกค้า */}
        {step === 'allocate_customers' && (
          <div className="space-y-4">
            {/* แสดงสินค้าแต่ละรายการ */}
            <div className="space-y-3">
              {selectedItems.map((selectedItem, idx) => {
                const item = selectedItem.inventoryItem;
                const productType = item.sku ? productTypeMap[item.sku] : undefined;
                const stockRemaining = {
                  level1: (item.unit_level1_quantity || 0) - selectedItem.totalAllocated.level1,
                  level2: (item.unit_level2_quantity || 0) - selectedItem.totalAllocated.level2,
                  level3: (item.unit_level3_quantity || 0) - selectedItem.totalAllocated.level3,
                  pieces: calculateTotalPieces(item) - selectedItem.totalAllocated.pieces
                };

                return (
                  <Card key={item.id} className="border-2">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-primary">#{idx + 1}</span>
                            <h3 className="font-semibold">{item.product_name}</h3>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">{item.sku}</Badge>
                            {productType === 'FG' && (
                              <Badge className="text-xs bg-green-100 text-green-700">🏭 FG</Badge>
                            )}
                            {productType === 'PK' && (
                              <Badge className="text-xs bg-blue-100 text-blue-700">📦 PK</Badge>
                            )}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {item.location}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">สต็อกทั้งหมด</p>
                          <div className="flex gap-1 flex-wrap justify-end">
                            {(item.unit_level1_quantity || 0) > 0 && (
                              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                {item.unit_level1_quantity} {item.unit_level1_name}
                              </Badge>
                            )}
                            {(item.unit_level2_quantity || 0) > 0 && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {item.unit_level2_quantity} {item.unit_level2_name}
                              </Badge>
                            )}
                            {(item.unit_level3_quantity || 0) > 0 && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                {item.unit_level3_quantity} {item.unit_level3_name}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs font-semibold mt-1">
                            = {calculateTotalPieces(item).toLocaleString()} {item.unit_level3_name}
                          </p>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      {/* Quick Mode: ส่งทั้งหมดให้ลูกค้า 1 คน */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <Label className="text-xs font-semibold text-blue-900 mb-2 block">
                          ⚡ ส่งทั้งหมดให้ลูกค้า (Quick Mode)
                        </Label>
                        <div className="flex gap-2">
                          <select
                            className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm"
                            value=""
                            onChange={(e) => {
                              const customer = customers.find(c => c.id === e.target.value);
                              if (customer) {
                                handleAssignAllToCustomer(item.id, customer);
                                e.target.value = '';
                              }
                            }}
                          >
                            <option value="">เลือกลูกค้า...</option>
                            {customers.map(c => (
                              <option key={c.id} value={c.id}>{c.customer_name} ({c.customer_code})</option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={customers.length === 0}
                          >
                            ส่งหมด →
                          </Button>
                        </div>
                      </div>

                      {/* ลูกค้าที่เลือกไว้แล้ว */}
                      {selectedItem.allocations.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">ลูกค้าที่เลือก ({selectedItem.allocations.length})</Label>

                          {selectedItem.allocations.map((allocation) => (
                            <div key={allocation.customerId} className="border rounded-lg p-3 space-y-2 bg-white">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-sm">{allocation.customerName}</p>
                                  <p className="text-xs text-muted-foreground">{allocation.customerCode}</p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRemoveCustomerFromItem(item.id, allocation.customerId)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>

                              {/* Unit Inputs */}
                              <div className="grid grid-cols-3 gap-2">
                                {/* ลัง */}
                                <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-2">
                                  <Label className="text-xs font-semibold text-orange-700 flex items-center justify-between">
                                    <span>🏭 {item.unit_level1_name}</span>
                                    <Badge variant="outline" className="text-[10px] bg-white">
                                      {item.unit_level1_quantity}
                                    </Badge>
                                  </Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max={item.unit_level1_quantity}
                                    value={allocation.level1}
                                    onChange={(e) => handleUpdateAllocation(item.id, allocation.customerId, 'level1', parseInt(e.target.value) || 0)}
                                    className="h-9 mt-1 text-center font-semibold border-orange-300 focus:border-orange-500"
                                    placeholder="0"
                                  />
                                  <p className="text-[10px] text-muted-foreground text-center mt-1">
                                    × {item.unit_level1_rate} = {allocation.level1 * (item.unit_level1_rate || 0)} ชิ้น
                                  </p>
                                </div>

                                {/* กล่อง */}
                                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-2">
                                  <Label className="text-xs font-semibold text-blue-700 flex items-center justify-between">
                                    <span>📦 {item.unit_level2_name}</span>
                                    <Badge variant="outline" className="text-[10px] bg-white">
                                      {item.unit_level2_quantity}
                                    </Badge>
                                  </Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max={item.unit_level2_quantity}
                                    value={allocation.level2}
                                    onChange={(e) => handleUpdateAllocation(item.id, allocation.customerId, 'level2', parseInt(e.target.value) || 0)}
                                    className="h-9 mt-1 text-center font-semibold border-blue-300 focus:border-blue-500"
                                    placeholder="0"
                                  />
                                  <p className="text-[10px] text-muted-foreground text-center mt-1">
                                    × {item.unit_level2_rate} = {allocation.level2 * (item.unit_level2_rate || 0)} ชิ้น
                                  </p>
                                </div>

                                {/* ชิ้น */}
                                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-2">
                                  <Label className="text-xs font-semibold text-green-700 flex items-center justify-between">
                                    <span>🔢 {item.unit_level3_name}</span>
                                    <Badge variant="outline" className="text-[10px] bg-white">
                                      {item.unit_level3_quantity}
                                    </Badge>
                                  </Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max={item.unit_level3_quantity}
                                    value={allocation.level3}
                                    onChange={(e) => handleUpdateAllocation(item.id, allocation.customerId, 'level3', parseInt(e.target.value) || 0)}
                                    className="h-9 mt-1 text-center font-semibold border-green-300 focus:border-green-500"
                                    placeholder="0"
                                  />
                                  <p className="text-[10px] text-muted-foreground text-center mt-1">
                                    (เศษ)
                                  </p>
                                </div>
                              </div>

                              {/* รวม */}
                              <div className="bg-primary/10 rounded-lg p-2 text-center">
                                <span className="text-xs font-semibold text-primary">
                                  รวม: {allocation.totalPieces.toLocaleString()} {item.unit_level3_name}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* เพิ่มลูกค้าเพิ่มเติม */}
                      <div className="border-t pt-2">
                        <Label className="text-xs text-muted-foreground mb-2 block">เพิ่มลูกค้าเพิ่มเติม</Label>
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm"
                          value=""
                          onChange={(e) => {
                            const customer = customers.find(c => c.id === e.target.value);
                            if (customer) {
                              handleAddCustomerToItem(item.id, customer);
                              e.target.value = '';
                            }
                          }}
                        >
                          <option value="">+ เลือกลูกค้า...</option>
                          {customers
                            .filter(c => !selectedItem.allocations.find(a => a.customerId === c.id))
                            .map(c => (
                              <option key={c.id} value={c.id}>{c.customer_name} ({c.customer_code})</option>
                            ))}
                        </select>
                      </div>

                      {/* Stock Remaining */}
                      <div className="bg-muted rounded-lg p-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">คงเหลือ:</span>
                          <div className="flex gap-1">
                            {stockRemaining.level1 > 0 && (
                              <Badge variant="outline" className="text-[10px] bg-orange-50">
                                {stockRemaining.level1} {item.unit_level1_name}
                              </Badge>
                            )}
                            {stockRemaining.level2 > 0 && (
                              <Badge variant="outline" className="text-[10px] bg-blue-50">
                                {stockRemaining.level2} {item.unit_level2_name}
                              </Badge>
                            )}
                            {stockRemaining.level3 > 0 && (
                              <Badge variant="outline" className="text-[10px] bg-green-50">
                                {stockRemaining.level3} {item.unit_level3_name}
                              </Badge>
                            )}
                            <Badge variant={stockRemaining.pieces >= 0 ? "default" : "destructive"} className="text-[10px]">
                              {stockRemaining.pieces} ชิ้น
                            </Badge>
                          </div>
                        </div>
                        {stockRemaining.pieces < 0 && (
                          <p className="text-[10px] text-destructive mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            แบ่งเกินจำนวนที่มี!
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Summary */}
            <Card className="bg-primary/5">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">รวมทั้งหมด:</span>
                  <Badge variant="default" className="text-base px-3 py-1">
                    {getTotalExportPieces().toLocaleString()} ชิ้น
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('select_items')}>
                ← ย้อนกลับ
              </Button>
              <Button
                onClick={() => setStep('summary')}
                disabled={!canProceedToSummary()}
              >
                ต่อไป: สรุปรายการ →
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: สรุปและยืนยัน */}
        {step === 'summary' && (
          <div className="space-y-4">
            {/* ฟอร์มกรอก PO และ Invoice */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  📋 ข้อมูล PO และ Invoice (ไม่บังคับ)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="po_number" className="text-sm font-medium">
                      PO Number
                    </Label>
                    <Input
                      id="po_number"
                      placeholder="เช่น PO-2025-001"
                      value={poNumber}
                      onChange={(e) => setPoNumber(e.target.value)}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoice_number" className="text-sm font-medium">
                      Invoice Number
                    </Label>
                    <Input
                      id="invoice_number"
                      placeholder="เช่น INV-2025-001"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="bg-white"
                    />
                  </div>
                </div>
                {(poNumber || invoiceNumber) && (
                  <div className="mt-3 text-xs text-blue-700 bg-blue-100 rounded p-2">
                    ℹ️ ข้อมูลนี้จะบันทึกในประวัติการส่งออกทุกรายการ
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">สรุปรายการส่งออก</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* สรุปแบบละเอียด: แต่ละสินค้ากับลูกค้า */}
                {selectedItems.map((selectedItem, idx) => {
                  const item = selectedItem.inventoryItem;
                  const productType = item.sku ? productTypeMap[item.sku] : undefined;

                  return (
                    <div key={item.id} className="border rounded-lg p-3 space-y-2">
                      {/* Product Header */}
                      <div className="flex items-start justify-between border-b pb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-primary">#{idx + 1}</span>
                            <h4 className="font-semibold text-sm">{item.product_name}</h4>
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">{item.sku}</Badge>
                            {productType === 'FG' && (
                              <Badge className="text-xs bg-green-100 text-green-700">🏭 FG</Badge>
                            )}
                            {productType === 'PK' && (
                              <Badge className="text-xs bg-blue-100 text-blue-700">📦 PK</Badge>
                            )}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {item.location}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">รวมส่งออก</p>
                          <Badge variant="default">
                            {selectedItem.totalAllocated.pieces.toLocaleString()} ชิ้น
                          </Badge>
                        </div>
                      </div>

                      {/* Customer Allocations */}
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground">
                          ส่งให้ลูกค้า ({selectedItem.allocations.length} ราย):
                        </p>
                        {selectedItem.allocations.map(allocation => (
                          <div key={allocation.customerId} className="bg-muted/50 rounded p-2">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium">{allocation.customerName}</p>
                                <p className="text-xs text-muted-foreground">{allocation.customerCode}</p>
                              </div>
                              <div className="text-right">
                                <div className="text-xs space-x-1">
                                  {allocation.level1 > 0 && (
                                    <Badge variant="outline" className="bg-orange-50 text-orange-700 text-[10px]">
                                      {allocation.level1} {allocation.unitLevel1Name}
                                    </Badge>
                                  )}
                                  {allocation.level2 > 0 && (
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 text-[10px]">
                                      {allocation.level2} {allocation.unitLevel2Name}
                                    </Badge>
                                  )}
                                  {allocation.level3 > 0 && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 text-[10px]">
                                      {allocation.level3} {allocation.unitLevel3Name}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs font-semibold text-primary mt-1">
                                  = {allocation.totalPieces.toLocaleString()} ชิ้น
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* สรุปรวมทั้งหมด */}
                <div className="border-t pt-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-primary/5 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">จำนวนสินค้า</p>
                      <p className="text-lg font-bold text-primary">
                        {selectedItems.length} รายการ
                      </p>
                    </div>
                    <div className="bg-primary/5 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">จำนวนลูกค้า</p>
                      <p className="text-lg font-bold text-primary">
                        {new Set(selectedItems.flatMap(si => si.allocations.map(a => a.customerId))).size} ราย
                      </p>
                    </div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-green-900">รวมส่งออกทั้งหมด:</span>
                      <span className="text-xl font-bold text-green-700">
                        {getTotalExportPieces().toLocaleString()} ชิ้น
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('allocate_customers')}>
                ← ย้อนกลับ
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !canProceedToSummary()}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    กำลังดำเนินการ...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    ยืนยันส่งออก
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
