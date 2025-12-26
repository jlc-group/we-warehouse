import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  unit_level3_quantity: number;
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
  preSelectedItems?: InventoryItem[]; // รายการที่เลือกไว้ก่อนหน้า (จาก Warehouse Operations)
}

export function BulkExportModal({ open, onOpenChange, inventoryItems: inventoryItemsProp, preSelectedItems }: BulkExportModalProps) {
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
  const [activeAddCustomerItemId, setActiveAddCustomerItemId] = useState<string | null>(null);

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

  // Handle pre-selected items
  useEffect(() => {
    if (open && preSelectedItems && preSelectedItems.length > 0) {
      // Clear existing selection first to avoid duplicates if re-opening with new set
      const newSelections = preSelectedItems.map(item => ({
        inventoryItem: item,
        allocations: [],
        totalAllocated: {
          level1: 0,
          level2: 0,
          level3: 0,
          pieces: 0
        }
      }));
      setSelectedItems(newSelections);
    }
  }, [open, preSelectedItems]);

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
      data?.forEach((product: any) => {
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
    setActiveAddCustomerItemId(null);
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
                      className={`flex-1 transition-all ${productTypeFilter === 'all'
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
                      className={`flex-1 transition-all ${productTypeFilter === 'FG'
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
                      className={`flex-1 transition-all ${productTypeFilter === 'PK'
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
                ถัดไป (แบ่งให้ลูกค้า)
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: แบ่งให้ลูกค้า */}
        {step === 'allocate_customers' && (
          <div className="space-y-4">
            {/* Global Search Removed to avoid confusion. User should add customer per item. */}
            <div className="flex justify-end mb-2">
              <p className="text-xs text-muted-foreground mr-auto bg-yellow-50 p-2 rounded border border-yellow-200">
                💡 กดปุ่ม "เพิ่มลูกค้า" ในแต่ละรายการด้านล่าง เพื่อระบุผู้รับสินค้า
              </p>
            </div>

            <div className="space-y-4">
              {selectedItems.map((si, index) => (
                <Card key={si.inventoryItem.id} className="border border-l-4 border-l-primary shadow-sm">
                  <CardHeader className="py-3 bg-muted/20">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">{index + 1}. {si.inventoryItem.product_name}</CardTitle>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline">{si.inventoryItem.sku}</Badge>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {si.inventoryItem.location}
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <span className="text-muted-foreground">คงเหลือสำหรับแบ่ง:</span>
                        <div className="font-bold text-lg">
                          {(calculateTotalPieces(si.inventoryItem) - si.totalAllocated.pieces).toLocaleString()} ชิ้น
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {/* Customer List for this item */}
                    <div className="space-y-3 mb-4">
                      {si.allocations.map(alloc => (
                        <div key={alloc.customerId} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-slate-50 p-2 rounded border">
                          <div className="flex-1 min-w-[200px]">
                            <div className="font-medium text-sm">{alloc.customerName}</div>
                            <div className="text-xs text-muted-foreground">{alloc.customerCode}</div>
                          </div>

                          {/* Inputs */}
                          <div className="flex items-center gap-2">
                            {si.inventoryItem.unit_level1_rate > 1 && (
                              <div className="flex flex-col w-20">
                                <span className="text-[10px] text-muted-foreground text-center">{alloc.unitLevel1Name}</span>
                                <Input
                                  type="number"
                                  min="0"
                                  className="h-8 text-center"
                                  value={alloc.level1 || ''}
                                  onChange={(e) => handleUpdateAllocation(si.inventoryItem.id, alloc.customerId, 'level1', parseInt(e.target.value) || 0)}
                                />
                              </div>
                            )}

                            {si.inventoryItem.unit_level2_rate > 1 && (
                              <div className="flex flex-col w-20">
                                <span className="text-[10px] text-muted-foreground text-center">{alloc.unitLevel2Name}</span>
                                <Input
                                  type="number"
                                  min="0"
                                  className="h-8 text-center"
                                  value={alloc.level2 || ''}
                                  onChange={(e) => handleUpdateAllocation(si.inventoryItem.id, alloc.customerId, 'level2', parseInt(e.target.value) || 0)}
                                />
                              </div>
                            )}

                            <div className="flex flex-col w-20">
                              <span className="text-[10px] text-muted-foreground text-center">{alloc.unitLevel3Name}</span>
                              <Input
                                type="number"
                                min="0"
                                className="h-8 text-center"
                                value={alloc.level3 || ''}
                                onChange={(e) => handleUpdateAllocation(si.inventoryItem.id, alloc.customerId, 'level3', parseInt(e.target.value) || 0)}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 min-w-[100px] justify-end">
                            <div className="text-right">
                              <div className="text-sm font-bold">{alloc.totalPieces.toLocaleString()}</div>
                              <div className="text-[10px] text-muted-foreground">ชิ้น</div>
                            </div>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleRemoveCustomerFromItem(si.inventoryItem.id, alloc.customerId)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add Customer Button */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => {
                          setCustomerSearchTerm('');
                          setActiveAddCustomerItemId(si.inventoryItem.id);
                        }}
                      >
                        <Plus className="h-3 w-3" /> เพิ่มลูกค้า
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        className="gap-1"
                        onClick={() => {
                          const customerName = prompt("พิมพ์ชื่อลูกค้า เพื่อส่งสินค้าทั้งหมดให้คนเดียว:");
                          if (customerName) {
                            const found = customers.find(c => c.customer_name.includes(customerName));
                            if (found) {
                              handleAssignAllToCustomer(si.inventoryItem.id, found);
                            } else {
                              toast.error("ไม่พบลูกค้า");
                            }
                          }
                        }}
                      >
                        ⚡ ส่งทั้งหมดให้ลูกค้า 1 คน
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-between items-center bg-slate-100 p-4 rounded-lg">
              <div>
                <p className="text-sm font-medium">ยอดรวมส่งออกทั้งหมด</p>
                <p className="text-2xl font-bold text-primary">{getTotalExportPieces().toLocaleString()} <span className="text-sm font-normal text-muted-foreground">ชิ้น</span></p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setStep('select_items')}>
                  ย้อนกลับ
                </Button>
                <Button onClick={() => setStep('summary')} disabled={!canProceedToSummary()}>
                  ถัดไป (สรุปรายการ)
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: สรุป */}
        {step === 'summary' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>เลขที่ PO (ถ้ามี)</Label>
                <Input
                  placeholder="ระบุ PO Number..."
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>เลขที่ Invoice (ถ้ามี)</Label>
                <Input
                  placeholder="ระบุ Invoice Number..."
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>สรุปรายการส่งออก</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>สินค้า</TableHead>
                      <TableHead>ลูกค้า</TableHead>
                      <TableHead className="text-right">จำนวน</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedItems.flatMap(si =>
                      si.allocations.map(alloc => (
                        <TableRow key={`${si.inventoryItem.id}-${alloc.customerId}`}>
                          <TableCell>
                            <div className="font-medium">{si.inventoryItem.product_name}</div>
                            <div className="text-xs text-muted-foreground">{si.inventoryItem.sku} | {si.inventoryItem.location}</div>
                          </TableCell>
                          <TableCell>{alloc.customerName}</TableCell>
                          <TableCell className="text-right font-mono">
                            {alloc.totalPieces.toLocaleString()}
                            <span className="text-xs text-muted-foreground ml-1">ชิ้น</span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    <TableRow>
                      <TableCell colSpan={2} className="text-right font-bold">รวมทั้งสิ้น</TableCell>
                      <TableCell className="text-right font-bold text-lg text-primary">
                        {getTotalExportPieces().toLocaleString()}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('allocate_customers')} disabled={isSubmitting}>
                ย้อนกลับ
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
                {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันการส่งออก'}
              </Button>
            </div>
          </div>
        )}

      </DialogContent>

      {/* Nested Dialog for Customer Selection */}
      <Dialog open={!!activeAddCustomerItemId} onOpenChange={(open) => !open && setActiveAddCustomerItemId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>เลือกลูกค้า</DialogTitle>
            <DialogDescription>
              ค้นหาและเลือกลูกค้าเพื่อเพิ่มในรายการ
            </DialogDescription>
          </DialogHeader>

          <Input
            placeholder="พิมพ์ชื่อลูกค้าหรือรหัส..."
            value={customerSearchTerm}
            onChange={(e) => setCustomerSearchTerm(e.target.value)}
            autoFocus
          />

          <div className="max-h-[300px] overflow-y-auto space-y-1 mt-2">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">ไม่พบลูกค้า</div>
            ) : (
              filteredCustomers.map(c => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-2 hover:bg-slate-100 rounded cursor-pointer border border-transparent hover:border-slate-200"
                  onClick={() => {
                    if (activeAddCustomerItemId) {
                      handleAddCustomerToItem(activeAddCustomerItemId, c);
                      setActiveAddCustomerItemId(null);
                      setCustomerSearchTerm('');
                    }
                  }}
                >
                  <div>
                    <div className="font-medium text-sm">{c.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{c.customer_code}</div>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
