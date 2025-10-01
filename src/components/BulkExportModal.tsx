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
import { toast } from 'sonner';

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

interface SelectedItem {
  inventoryItem: InventoryItem;
  exportQuantity: number; // รวมเป็นชิ้น
  level1: number;
  level2: number;
  level3: number;
}

interface CustomerAllocation {
  customerId: string;
  customerName: string;
  customerCode: string;
  quantity: number; // รวมเป็นชิ้น
}

interface BulkExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryItems?: InventoryItem[]; // รับข้อมูลจาก parent component
}

export function BulkExportModal({ open, onOpenChange, inventoryItems: inventoryItemsProp }: BulkExportModalProps) {
  const [step, setStep] = useState<'select_items' | 'allocate_customers' | 'summary'>('select_items');

  // Step 1: เลือกสินค้าจากหลาย Location
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [productTypeFilter, setProductTypeFilter] = useState<'all' | 'FG' | 'PK'>('all');

  // Product type mapping from products table
  const [productTypeMap, setProductTypeMap] = useState<Record<string, string>>({});

  // Step 2: แบ่งจำนวนให้ลูกค้า
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allocations, setAllocations] = useState<CustomerAllocation[]>([]);

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
      exportQuantity: 0,
      level1: 0,
      level2: 0,
      level3: 0
    }]);
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(si => si.inventoryItem.id !== itemId));
  };

  const handleUpdateQuantity = (itemId: string, level: 'level1' | 'level2' | 'level3', value: number) => {
    setSelectedItems(prev => prev.map(si => {
      if (si.inventoryItem.id !== itemId) return si;

      const updated = { ...si, [level]: Math.max(0, value) };

      // คำนวณรวมเป็นชิ้น
      const totalPieces =
        updated.level1 * si.inventoryItem.unit_level1_rate +
        updated.level2 * si.inventoryItem.unit_level2_rate +
        updated.level3;

      return { ...updated, exportQuantity: totalPieces };
    }));
  };

  const getTotalExportPieces = (): number => {
    return selectedItems.reduce((sum, si) => sum + si.exportQuantity, 0);
  };

  const handleAddCustomer = (customer: Customer) => {
    const exists = allocations.find(a => a.customerId === customer.id);
    if (exists) {
      toast.warning(`${customer.customer_name} ถูกเลือกแล้ว`);
      return;
    }

    setAllocations(prev => [...prev, {
      customerId: customer.id,
      customerName: customer.customer_name,
      customerCode: customer.customer_code,
      quantity: 0
    }]);
  };

  const handleRemoveCustomer = (customerId: string) => {
    setAllocations(prev => prev.filter(a => a.customerId !== customerId));
  };

  const handleUpdateAllocation = (customerId: string, quantity: number) => {
    setAllocations(prev => prev.map(a =>
      a.customerId === customerId ? { ...a, quantity: Math.max(0, quantity) } : a
    ));
  };

  const getTotalAllocated = (): number => {
    return allocations.reduce((sum, a) => sum + a.quantity, 0);
  };

  const canProceedToAllocate = (): boolean => {
    return selectedItems.length > 0 && getTotalExportPieces() > 0;
  };

  const canProceedToSummary = (): boolean => {
    const totalExport = getTotalExportPieces();
    const totalAlloc = getTotalAllocated();
    return allocations.length > 0 && totalAlloc > 0 && totalAlloc <= totalExport;
  };

  const handleSubmit = async () => {
    if (!canProceedToSummary()) {
      toast.error('กรุณาตรวจสอบข้อมูลให้ครบถ้วน');
      return;
    }

    setIsSubmitting(true);

    try {
      // สำหรับแต่ละลูกค้า
      for (const allocation of allocations) {
        if (allocation.quantity === 0) continue;

        let remainingToExport = allocation.quantity;

        // หักจากแต่ละ Location ตามลำดับ
        for (const selectedItem of selectedItems) {
          if (remainingToExport <= 0) break;
          if (selectedItem.exportQuantity === 0) continue;

          const exportFromThisItem = Math.min(remainingToExport, selectedItem.exportQuantity);

          const item = selectedItem.inventoryItem;
          const location = item.location;

          // คำนวณสต็อกใหม่
          let newLevel1 = item.unit_level1_quantity - selectedItem.level1;
          let newLevel2 = item.unit_level2_quantity - selectedItem.level2;
          let newLevel3 = item.unit_level3_quantity - selectedItem.level3;

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
            quantity_boxes_change: -selectedItem.level1,
            quantity_loose_change: -selectedItem.level2,
            location_before: location,
            location_after: `ลูกค้า: ${allocation.customerName}`,
            notes: `ส่งออกแบบหลายรายการ - ${exportFromThisItem} ชิ้น`
          });

          // บันทึก customer_exports
          await supabase.from('customer_exports').insert({
            customer_id: allocation.customerId,
            customer_name: allocation.customerName,
            customer_code: allocation.customerCode,
            product_name: item.product_name,
            product_code: item.sku,
            inventory_item_id: item.id,
            quantity_exported: exportFromThisItem,
            quantity_level1: selectedItem.level1,
            quantity_level2: selectedItem.level2,
            quantity_level3: selectedItem.level3,
            unit_level1_name: item.unit_level1_name,
            unit_level2_name: item.unit_level2_name,
            unit_level3_name: item.unit_level3_name,
            unit_level1_rate: item.unit_level1_rate,
            unit_level2_rate: item.unit_level2_rate,
            from_location: location,
            notes: 'ส่งออกแบบหลายรายการพร้อมกัน',
            user_id: '00000000-0000-0000-0000-000000000000'
          });

          // บันทึก system_events
          await supabase.from('system_events').insert({
            event_type: 'inventory',
            event_category: 'stock_movement',
            event_action: 'bulk_export',
            event_title: 'ส่งออกหลายรายการ',
            event_description: `ส่งออก ${item.product_name} จาก ${location} จำนวน ${exportFromThisItem} ชิ้น ไปยัง ${allocation.customerName}`,
            metadata: {
              item_id: item.id,
              product_name: item.product_name,
              quantity: exportFromThisItem,
              location: location,
              customer_id: allocation.customerId,
              customer_name: allocation.customerName
            },
            user_id: '00000000-0000-0000-0000-000000000000'
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

          remainingToExport -= exportFromThisItem;
        }
      }

      toast.success(`ส่งออกสินค้าสำเร็จ ${allocations.length} ลูกค้า!`);

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
    setAllocations([]);
    setSearchTerm('');
    onOpenChange(false);
  };

  const filteredInventory = inventoryItems.filter(item => {
    // Filter by search term
    const matchesSearch =
      item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase());

    // Filter by product type
    if (productTypeFilter === 'all') return matchesSearch;

    // ใช้ product_type จาก products table ผ่าน SKU lookup
    const productType = item.sku ? productTypeMap[item.sku] : undefined;
    return matchesSearch && productType === productTypeFilter;
  });

  const filteredCustomers = customers.filter(c =>
    c.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.customer_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            ส่งออกหลายรายการพร้อมกัน
          </DialogTitle>
          <DialogDescription>
            เลือกสินค้าจากหลาย Location และแบ่งส่งให้หลายลูกค้าในครั้งเดียว
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <Button
            variant={step === 'select_items' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStep('select_items')}
          >
            1. เลือกสินค้า
          </Button>
          <Separator className="w-8" />
          <Button
            variant={step === 'allocate_customers' ? 'default' : 'outline'}
            size="sm"
            onClick={() => canProceedToAllocate() && setStep('allocate_customers')}
            disabled={!canProceedToAllocate()}
          >
            2. แบ่งให้ลูกค้า
          </Button>
          <Separator className="w-8" />
          <Button
            variant={step === 'summary' ? 'default' : 'outline'}
            size="sm"
            onClick={() => canProceedToSummary() && setStep('summary')}
            disabled={!canProceedToSummary()}
          >
            3. สรุปและยืนยัน
          </Button>
        </div>

        {/* Step 1: เลือกสินค้า */}
        {step === 'select_items' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* รายการสินค้าทั้งหมด */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>รายการสินค้าในคลัง</span>
                    <Badge variant="secondary">{filteredInventory.length} รายการ</Badge>
                  </CardTitle>
                  <Input
                    placeholder="ค้นหาสินค้า, SKU, Location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
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
                          <span className="font-semibold text-muted-foreground">สต็อกคงเหลือ: </span>
                          <span className="font-medium">
                            {si.inventoryItem.unit_level1_quantity > 0 && `${si.inventoryItem.unit_level1_quantity} ${si.inventoryItem.unit_level1_name} `}
                            {si.inventoryItem.unit_level2_quantity > 0 && `${si.inventoryItem.unit_level2_quantity} ${si.inventoryItem.unit_level2_name} `}
                            {si.inventoryItem.unit_level3_quantity > 0 && `${si.inventoryItem.unit_level3_quantity} ${si.inventoryItem.unit_level3_name}`}
                          </span>
                        </div>

                        {/* กรอกจำนวนที่จะส่งออก */}
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-primary">📦 เลือกจำนวนที่ต้องการส่งออก:</Label>
                          <div className="grid grid-cols-3 gap-2">
                            {/* ลัง */}
                            <div className="border-2 border-orange-200 rounded-lg p-2 bg-orange-50/50">
                              <Label className="text-xs font-semibold text-orange-700 flex items-center justify-between">
                                <span>🏭 {si.inventoryItem.unit_level1_name}</span>
                                <Badge variant="outline" className="text-[10px] bg-white">{si.inventoryItem.unit_level1_quantity}</Badge>
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                max={si.inventoryItem.unit_level1_quantity}
                                value={si.level1}
                                onChange={(e) => handleUpdateQuantity(si.inventoryItem.id, 'level1', parseInt(e.target.value) || 0)}
                                className="h-9 mt-1 text-center font-semibold border-orange-300 focus:border-orange-500"
                                placeholder="0"
                              />
                              <p className="text-[10px] text-muted-foreground text-center mt-1">
                                = {si.level1 * si.inventoryItem.unit_level1_rate} ชิ้น
                              </p>
                            </div>

                            {/* กล่อง */}
                            <div className="border-2 border-blue-200 rounded-lg p-2 bg-blue-50/50">
                              <Label className="text-xs font-semibold text-blue-700 flex items-center justify-between">
                                <span>📦 {si.inventoryItem.unit_level2_name}</span>
                                <Badge variant="outline" className="text-[10px] bg-white">{si.inventoryItem.unit_level2_quantity}</Badge>
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                max={si.inventoryItem.unit_level2_quantity}
                                value={si.level2}
                                onChange={(e) => handleUpdateQuantity(si.inventoryItem.id, 'level2', parseInt(e.target.value) || 0)}
                                className="h-9 mt-1 text-center font-semibold border-blue-300 focus:border-blue-500"
                                placeholder="0"
                              />
                              <p className="text-[10px] text-muted-foreground text-center mt-1">
                                = {si.level2 * si.inventoryItem.unit_level2_rate} ชิ้น
                              </p>
                            </div>

                            {/* ชิ้น (เศษ) */}
                            <div className="border-2 border-green-200 rounded-lg p-2 bg-green-50/50">
                              <Label className="text-xs font-semibold text-green-700 flex items-center justify-between">
                                <span>🔢 {si.inventoryItem.unit_level3_name}</span>
                                <Badge variant="outline" className="text-[10px] bg-white">{si.inventoryItem.unit_level3_quantity}</Badge>
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                max={si.inventoryItem.unit_level3_quantity}
                                value={si.level3}
                                onChange={(e) => handleUpdateQuantity(si.inventoryItem.id, 'level3', parseInt(e.target.value) || 0)}
                                className="h-9 mt-1 text-center font-semibold border-green-300 focus:border-green-500"
                                placeholder="0"
                              />
                              <p className="text-[10px] text-muted-foreground text-center mt-1">
                                (เศษ)
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* สรุปรวม */}
                        <div className="border-t pt-2">
                          <div className="flex items-center justify-between bg-primary/5 rounded p-2">
                            <span className="text-xs font-semibold text-primary">✨ รวมที่จะส่งออก:</span>
                            <div className="text-right">
                              <p className="text-sm font-bold text-primary">{si.exportQuantity.toLocaleString()} {si.inventoryItem.unit_level3_name}</p>
                              {(si.level1 > 0 || si.level2 > 0 || si.level3 > 0) && (
                                <p className="text-[10px] text-muted-foreground">
                                  ({si.level1 > 0 && `${si.level1} ${si.inventoryItem.unit_level1_name}`}
                                  {si.level1 > 0 && si.level2 > 0 && ' + '}
                                  {si.level2 > 0 && `${si.level2} ${si.inventoryItem.unit_level2_name}`}
                                  {(si.level1 > 0 || si.level2 > 0) && si.level3 > 0 && ' + '}
                                  {si.level3 > 0 && `${si.level3} ${si.inventoryItem.unit_level3_name}`})
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}


                  {selectedItems.length > 0 && (
                    <div className="border-t pt-2 mt-2">
                      <p className="text-sm font-semibold">
                        รวมทั้งหมด: {getTotalExportPieces().toLocaleString()} ชิ้น
                      </p>
                    </div>
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
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>จำนวนสินค้าที่จะส่งออก</span>
                  <Badge variant="secondary" className="text-base">
                    {getTotalExportPieces().toLocaleString()} ชิ้น
                  </Badge>
                </CardTitle>
              </CardHeader>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              {/* รายชื่อลูกค้า */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">เลือกลูกค้า</CardTitle>
                  <Input
                    placeholder="ค้นหาลูกค้า..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </CardHeader>
                <CardContent className="max-h-96 overflow-y-auto">
                  <div className="space-y-2">
                    {filteredCustomers.map(customer => (
                      <div
                        key={customer.id}
                        className="flex items-center justify-between p-2 border rounded hover:bg-accent cursor-pointer"
                        onClick={() => handleAddCustomer(customer)}
                      >
                        <div>
                          <p className="font-medium text-sm">{customer.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{customer.customer_code}</p>
                        </div>
                        <Plus className="h-4 w-4" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* ลูกค้าที่เลือกและจำนวน */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    แบ่งจำนวนให้ลูกค้า ({allocations.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-96 overflow-y-auto space-y-2">
                  {allocations.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      ยังไม่ได้เลือกลูกค้า
                    </p>
                  ) : (
                    allocations.map(alloc => (
                      <div key={alloc.customerId} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{alloc.customerName}</p>
                            <p className="text-xs text-muted-foreground">{alloc.customerCode}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveCustomer(alloc.customerId)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>

                        <div>
                          <Label className="text-xs">จำนวน (ชิ้น)</Label>
                          <Input
                            type="number"
                            min="0"
                            max={getTotalExportPieces()}
                            value={alloc.quantity}
                            onChange={(e) => handleUpdateAllocation(alloc.customerId, parseInt(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </div>
                      </div>
                    ))
                  )}

                  {allocations.length > 0 && (
                    <div className="border-t pt-2 mt-2 space-y-1">
                      <p className="text-sm">
                        แบ่งแล้ว: <span className="font-semibold">{getTotalAllocated().toLocaleString()}</span> ชิ้น
                      </p>
                      <p className="text-sm">
                        เหลือ: <span className="font-semibold">{(getTotalExportPieces() - getTotalAllocated()).toLocaleString()}</span> ชิ้น
                      </p>
                      {getTotalAllocated() > getTotalExportPieces() && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          แบ่งเกินจำนวนที่มี!
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('select_items')}>
                ย้อนกลับ
              </Button>
              <Button
                onClick={() => setStep('summary')}
                disabled={!canProceedToSummary()}
              >
                ต่อไป: สรุปรายการ
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: สรุปและยืนยัน */}
        {step === 'summary' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">สรุปรายการส่งออก</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* สรุปสินค้า */}
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    สินค้าที่จะส่งออก ({selectedItems.length} รายการ)
                  </h4>
                  <div className="space-y-1">
                    {selectedItems.map(si => (
                      <div key={si.inventoryItem.id} className="text-sm flex items-center justify-between p-2 bg-muted rounded">
                        <div>
                          <span className="font-medium">{si.inventoryItem.product_name}</span>
                          <span className="text-muted-foreground ml-2">@ {si.inventoryItem.location}</span>
                        </div>
                        <Badge variant="outline">
                          {si.level1 > 0 && `${si.level1} ${si.inventoryItem.unit_level1_name}`}
                          {si.level1 > 0 && si.level2 > 0 && ' + '}
                          {si.level2 > 0 && `${si.level2} ${si.inventoryItem.unit_level2_name}`}
                          {(si.level1 > 0 || si.level2 > 0) && si.level3 > 0 && ' + '}
                          {si.level3 > 0 && `${si.level3} ${si.inventoryItem.unit_level3_name}`}
                          {' '}({si.exportQuantity.toLocaleString()} ชิ้น)
                        </Badge>
                      </div>
                    ))}
                    <div className="text-sm font-semibold pt-2 border-t">
                      รวม: {getTotalExportPieces().toLocaleString()} ชิ้น
                    </div>
                  </div>
                </div>

                {/* สรุปลูกค้า */}
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    แบ่งส่งให้ลูกค้า ({allocations.length} ราย)
                  </h4>
                  <div className="space-y-1">
                    {allocations.map(alloc => (
                      <div key={alloc.customerId} className="text-sm flex items-center justify-between p-2 bg-muted rounded">
                        <div>
                          <span className="font-medium">{alloc.customerName}</span>
                          <span className="text-muted-foreground ml-2">({alloc.customerCode})</span>
                        </div>
                        <Badge>{alloc.quantity.toLocaleString()} ชิ้น</Badge>
                      </div>
                    ))}
                    <div className="text-sm font-semibold pt-2 border-t">
                      รวม: {getTotalAllocated().toLocaleString()} ชิ้น
                    </div>
                  </div>
                </div>

                {/* คำเตือน */}
                {getTotalAllocated() < getTotalExportPieces() && (
                  <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-yellow-800">สินค้าเหลือ {(getTotalExportPieces() - getTotalAllocated()).toLocaleString()} ชิ้น</p>
                      <p className="text-yellow-700">จำนวนที่แบ่งให้ลูกค้าน้อยกว่าจำนวนที่เลือก สินค้าที่เหลือจะยังคงอยู่ในคลัง</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('allocate_customers')}>
                ย้อนกลับ
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
