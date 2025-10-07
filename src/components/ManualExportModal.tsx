import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Package, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { calculateTotalBaseQuantity, formatUnitsDisplay } from '@/utils/unitCalculations';

interface ManualExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: string;
  items: any[];
  onExportSuccess?: () => void; // Callback to refresh data
}

export function ManualExportModal({ isOpen, onClose, location, items, onExportSuccess }: ManualExportModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [validationError, setValidationError] = useState<string>('');
  const [formData, setFormData] = useState({
    customerId: '',
    quantityLevel1: '', // ลัง
    quantityLevel2: '', // กล่อง
    quantityLevel3: '', // ชิ้น
    notes: '',
    selectedItemId: '',
    poReference: '',
    unitPrice: '' // ราคาต่อหน่วย (ต่อชิ้น)
  });

  // Helper function: คำนวณสต็อกรวมจากทุกหน่วย (ลัง/กล่อง/ชิ้น)
  const getActualStock = (item: any): number => {
    // คำนวณจากระบบหน่วยหลายระดับ
    const totalFromMultiLevel = calculateTotalBaseQuantity({
      unit_level1_quantity: item.unit_level1_quantity || 0,
      unit_level1_rate: item.unit_level1_rate || 0,
      unit_level2_quantity: item.unit_level2_quantity || 0,
      unit_level2_rate: item.unit_level2_rate || 0,
      unit_level3_quantity: item.unit_level3_quantity || 0
    });

    // ถ้าระบบใหม่มีค่า ให้ใช้ค่านั้น
    if (totalFromMultiLevel > 0) {
      return totalFromMultiLevel;
    }

    // Fallback สำหรับข้อมูลเก่าที่ยังไม่มี conversion rates
    const legacyStock = item.pieces_quantity_legacy ||
                        item.box_quantity_legacy ||
                        item.carton_quantity_legacy ||
                        0;
    return Number(legacyStock);
  };

  // Helper function: แสดงสต็อกแบบละเอียด (2 ลัง + 3 กล่อง + 5 ชิ้น)
  const getStockDisplay = (item: any): string => {
    const display = formatUnitsDisplay({
      unit_level1_name: item.unit_level1_name,
      unit_level1_quantity: item.unit_level1_quantity || 0,
      unit_level1_rate: 0, // ไม่ต้องใช้ใน formatUnitsDisplay
      unit_level2_name: item.unit_level2_name,
      unit_level2_quantity: item.unit_level2_quantity || 0,
      unit_level2_rate: 0, // ไม่ต้องใช้ใน formatUnitsDisplay
      unit_level3_name: item.unit_level3_name || 'ชิ้น',
      unit_level3_quantity: item.unit_level3_quantity || 0
    });

    return display === '0' ? 'ไม่มีสต็อก' : display;
  };

  // Debug: Log items when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('═══════════════════════════════════════════════════');
      console.log('📦 Modal opened for location:', location);
      console.log('📦 Items received:', items);
      console.log('📦 Number of items:', items.length);
      console.log('───────────────────────────────────────────────────');
      items.forEach((item, index) => {
        const actualStock = getActualStock(item);
        const stockDisplay = getStockDisplay(item);

        console.log(`  ${index + 1}. Product: ${item.product_name}`);
        console.log(`      Location: ${item.location}`);
        console.log(`      SKU: ${item.sku || 'N/A'}`);
        console.log(`      Multi-level stock:`);
        console.log(`        - L1 (${item.unit_level1_name || 'ลัง'}): ${item.unit_level1_quantity || 0} × ${item.unit_level1_rate || 0} = ${(item.unit_level1_quantity || 0) * (item.unit_level1_rate || 0)} ชิ้น`);
        console.log(`        - L2 (${item.unit_level2_name || 'กล่อง'}): ${item.unit_level2_quantity || 0} × ${item.unit_level2_rate || 0} = ${(item.unit_level2_quantity || 0) * (item.unit_level2_rate || 0)} ชิ้น`);
        console.log(`        - L3 (${item.unit_level3_name || 'ชิ้น'}): ${item.unit_level3_quantity || 0} ชิ้น`);
        console.log(`      Legacy fields:`);
        console.log(`        - carton_quantity_legacy: ${item.carton_quantity_legacy ?? 'null'}`);
        console.log(`        - box_quantity_legacy: ${item.box_quantity_legacy ?? 'null'}`);
        console.log(`        - pieces_quantity_legacy: ${item.pieces_quantity_legacy ?? 'null'}`);
        console.log(`      📊 Stock display: ${stockDisplay}`);
        console.log(`      ✅ Total stock: ${actualStock} ชิ้น`);
        console.log('');
      });
      console.log('═══════════════════════════════════════════════════');
    }
  }, [isOpen, location, items]);

  // Fetch customers from database
  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
    }
  }, [isOpen]);

  // Handle item selection
  useEffect(() => {
    if (formData.selectedItemId) {
      const item = items.find(i => i.id === formData.selectedItemId);
      setSelectedItem(item || null);

      // Validate stock when item is selected
      if (item && (formData.quantityLevel1 || formData.quantityLevel2 || formData.quantityLevel3)) {
        validateQuantities(item);
      }
    } else {
      setSelectedItem(null);
      setValidationError('');
    }
  }, [formData.selectedItemId, formData.quantityLevel1, formData.quantityLevel2, formData.quantityLevel3, items]);

  // Validation function สำหรับตรวจสอบจำนวนแต่ละหน่วย
  const validateQuantities = (item: any) => {
    const reqLevel1 = parseInt(formData.quantityLevel1) || 0;
    const reqLevel2 = parseInt(formData.quantityLevel2) || 0;
    const reqLevel3 = parseInt(formData.quantityLevel3) || 0;

    const availLevel1 = item.unit_level1_quantity || 0;
    const availLevel2 = item.unit_level2_quantity || 0;
    const availLevel3 = item.unit_level3_quantity || 0;

    // ตรวจสอบว่ามีการใส่จำนวนอย่างน้อย 1 หน่วย
    if (reqLevel1 === 0 && reqLevel2 === 0 && reqLevel3 === 0) {
      setValidationError('กรุณาระบุจำนวนที่ต้องการส่งออกอย่างน้อย 1 หน่วย');
      return false;
    }

    // ตรวจสอบแต่ละหน่วย
    if (reqLevel1 > availLevel1) {
      setValidationError(`❌ ${item.unit_level1_name || 'ลัง'}: ต้องการ ${reqLevel1} แต่มีเพียง ${availLevel1}`);
      return false;
    }
    if (reqLevel2 > availLevel2) {
      setValidationError(`❌ ${item.unit_level2_name || 'กล่อง'}: ต้องการ ${reqLevel2} แต่มีเพียง ${availLevel2}`);
      return false;
    }
    if (reqLevel3 > availLevel3) {
      setValidationError(`❌ ${item.unit_level3_name || 'ชิ้น'}: ต้องการ ${reqLevel3} แต่มีเพียง ${availLevel3}`);
      return false;
    }

    setValidationError('');
    return true;
  };

  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, customer_name, customer_code, phone, email')
        .eq('is_active', true)
        .order('customer_name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: '⚠️ ไม่สามารถโหลดข้อมูลลูกค้า',
        description: 'กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive'
      });
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const reqLevel1 = parseInt(formData.quantityLevel1) || 0;
    const reqLevel2 = parseInt(formData.quantityLevel2) || 0;
    const reqLevel3 = parseInt(formData.quantityLevel3) || 0;

    if (!formData.customerId || !formData.selectedItemId || (reqLevel1 === 0 && reqLevel2 === 0 && reqLevel3 === 0)) {
      toast({
        title: '⚠️ กรุณากรอกข้อมูลให้ครบ',
        description: 'ต้องเลือกลูกค้า, เลือกสินค้า และระบุจำนวนอย่างน้อย 1 หน่วย',
        variant: 'destructive'
      });
      return;
    }

    const selectedCustomer = customers.find(c => c.id === formData.customerId);
    if (!selectedCustomer) {
      toast({
        title: '❌ ไม่พบข้อมูลลูกค้า',
        description: 'กรุณาเลือกลูกค้าที่ต้องการส่งออก',
        variant: 'destructive'
      });
      return;
    }

    const selectedItem = items.find(item => item.id === formData.selectedItemId);
    if (!selectedItem) {
      toast({
        title: '❌ ไม่พบสินค้า',
        description: 'กรุณาเลือกสินค้าที่ต้องการส่งออก',
        variant: 'destructive'
      });
      return;
    }

    // Validate จำนวนแต่ละหน่วย
    if (!validateQuantities(selectedItem)) {
      toast({
        title: '❌ จำนวนไม่ถูกต้อง',
        description: validationError,
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      // 1. ลดสต็อกในคลัง - ลดตามหน่วยที่ระบุ
      const newLevel1 = (selectedItem.unit_level1_quantity || 0) - reqLevel1;
      const newLevel2 = (selectedItem.unit_level2_quantity || 0) - reqLevel2;
      const newLevel3 = (selectedItem.unit_level3_quantity || 0) - reqLevel3;

      const updateData: any = {
        unit_level1_quantity: newLevel1,
        unit_level2_quantity: newLevel2,
        unit_level3_quantity: newLevel3
      };

      // คำนวณชิ้นรวมที่ส่งออก
      const exportedTotal = (reqLevel1 * (selectedItem.unit_level1_rate || 0)) +
                           (reqLevel2 * (selectedItem.unit_level2_rate || 0)) +
                           reqLevel3;

      console.log('📝 Updating inventory:', {
        before: {
          level1: selectedItem.unit_level1_quantity,
          level2: selectedItem.unit_level2_quantity,
          level3: selectedItem.unit_level3_quantity
        },
        exported: {
          level1: reqLevel1,
          level2: reqLevel2,
          level3: reqLevel3,
          total: exportedTotal
        },
        after: {
          level1: newLevel1,
          level2: newLevel2,
          level3: newLevel3
        }
      });

      // 1b. อัปเดตสต็อกก่อนเสมอ
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update(updateData)
        .eq('id', formData.selectedItemId);

      if (updateError) throw updateError;

      // 2. บันทึกประวัติการส่งออกทันที (ก่อนลบ - สำคัญมาก!)
      const exportDescription = [];
      if (reqLevel1 > 0) exportDescription.push(`${reqLevel1} ${selectedItem.unit_level1_name || 'ลัง'}`);
      if (reqLevel2 > 0) exportDescription.push(`${reqLevel2} ${selectedItem.unit_level2_name || 'กล่อง'}`);
      if (reqLevel3 > 0) exportDescription.push(`${reqLevel3} ${selectedItem.unit_level3_name || 'ชิ้น'}`);

      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert({
          inventory_item_id: formData.selectedItemId,
          movement_type: 'out',
          quantity_boxes_before: selectedItem.unit_level1_quantity || 0,
          quantity_loose_before: selectedItem.unit_level2_quantity || 0,
          quantity_boxes_after: newLevel1,
          quantity_loose_after: newLevel2,
          quantity_boxes_change: -(reqLevel1),
          quantity_loose_change: -(reqLevel2),
          location_before: location,
          location_after: `ลูกค้า: ${selectedCustomer.customer_name}`,
          notes: `ส่งออก ${exportDescription.join(' + ')} (รวม: ${exportedTotal} ชิ้น) ไปยังลูกค้า ${selectedCustomer.customer_name} (${selectedCustomer.customer_code})${formData.poReference ? ` - PO: ${formData.poReference}` : ''}${formData.notes ? ` - ${formData.notes}` : ''}`
        });

      if (movementError) {
        console.error('❌ Error inserting into inventory_movements:', movementError);
        throw movementError;
      }

      // 3. บันทึกข้อมูลการส่งออกในตาราง customer_exports
      const unitPrice = parseFloat(formData.unitPrice) || null;
      const totalValue = unitPrice ? unitPrice * exportedTotal : null;

      console.log('💾 [Export] Saving to customer_exports:', {
        customer: selectedCustomer.customer_name,
        product: selectedItem.product_name,
        quantity: exportedTotal,
        unit_price: unitPrice,
        total_value: totalValue
      });

      const { data: exportRecord, error: customerExportError } = await supabase
        .from('customer_exports')
        .insert({
          customer_id: formData.customerId,
          customer_name: selectedCustomer.customer_name,
          customer_code: selectedCustomer.customer_code,
          product_name: selectedItem.product_name,
          product_code: selectedItem.sku || null,
          inventory_item_id: formData.selectedItemId,
          quantity_exported: exportedTotal,
          unit: exportDescription.join(' + '),
          quantity_level1: reqLevel1,
          quantity_level2: reqLevel2,
          quantity_level3: reqLevel3,
          unit_level1_name: selectedItem.unit_level1_name || 'ลัง',
          unit_level2_name: selectedItem.unit_level2_name || 'กล่อง',
          unit_level3_name: selectedItem.unit_level3_name || 'ชิ้น',
          unit_level1_rate: selectedItem.unit_level1_rate || 144,
          unit_level2_rate: selectedItem.unit_level2_rate || 12,
          from_location: location,
          notes: formData.notes || null,
          po_reference: formData.poReference || null,
          unit_price: unitPrice,
          total_value: totalValue,
          user_id: '00000000-0000-0000-0000-000000000000'
        })
        .select();

      if (customerExportError) {
        console.error('❌ [Export] Failed to save to customer_exports:', customerExportError);
        console.error('Error details:', JSON.stringify(customerExportError, null, 2));
        throw customerExportError; // Throw error แทนที่จะ ignore
      }

      console.log('✅ [Export] Successfully saved to customer_exports:', exportRecord);

      // 4. บันทึก event log
      await supabase
        .from('system_events')
        .insert({
          event_type: 'inventory',
          event_category: 'stock_movement',
          event_action: 'export',
          event_title: 'ส่งออกสินค้า',
          event_description: `ส่งออกสินค้า ${selectedItem.product_name} จำนวน ${exportedTotal} ชิ้น ไปยัง ${selectedCustomer.customer_name}`,
          metadata: {
            item_id: formData.selectedItemId,
            product_name: selectedItem.product_name,
            quantity: exportedTotal,
            location: location,
            customer_id: formData.customerId,
            customer_name: selectedCustomer.customer_name,
            customer_code: selectedCustomer.customer_code,
            po_reference: formData.poReference,
            notes: formData.notes
          },
          user_id: '00000000-0000-0000-0000-000000000000'
        });

      // 5. ลบ inventory_item ถ้าสต็อกเป็น 0 (หลังจากบันทึกประวัติแล้ว)
      const isStockZero = newLevel1 === 0 && newLevel2 === 0 && newLevel3 === 0;

      if (isStockZero) {
        console.log('🗑️ Stock is zero, deleting inventory item from location:', location);

        // 5a. บันทึก event ว่า location ว่างแล้ว
        await supabase
          .from('system_events')
          .insert({
            event_type: 'location',
            event_category: 'location_management',
            event_action: 'location_cleared',
            event_title: `ตำแหน่ง ${location} ว่างแล้ว`,
            event_description: `สินค้า ${selectedItem.product_name} ถูกส่งออกหมดจาก ${location} - ตำแหน่งนี้พร้อมรับสินค้าใหม่`,
            metadata: {
              location: location,
              product_name: selectedItem.product_name,
              last_customer: selectedCustomer.customer_name,
              last_export_quantity: exportedTotal,
              cleared_at: new Date().toISOString()
            },
            location_context: location,
            status: 'success',
            user_id: '00000000-0000-0000-0000-000000000000'
          });

        // 5b. ลบ inventory_item
        const { error: deleteError } = await supabase
          .from('inventory_items')
          .delete()
          .eq('id', formData.selectedItemId);

        if (deleteError) {
          console.error('❌ Error deleting inventory item:', deleteError);
          // Don't throw - ประวัติบันทึกแล้ว ไม่เป็นไร
          console.warn('⚠️ Failed to delete but history was saved');
        } else {
          console.log('✅ Successfully deleted inventory item (stock = 0)');
        }
      }

      // Reset form first
      setFormData({
        customerId: '',
        quantityLevel1: '',
        quantityLevel2: '',
        quantityLevel3: '',
        notes: '',
        selectedItemId: '',
        poReference: '',
        unitPrice: ''
      });

      // Show success toast with location status
      const locationStatus = isStockZero
        ? ` (${location} ว่างแล้ว - พร้อมรับสินค้าใหม่)`
        : ` (${location} เหลือสต็อก)`;

      toast({
        title: '✅ ส่งออกสำเร็จ',
        description: `ส่ง ${selectedItem.product_name} จำนวน ${exportDescription.join(' + ')} (${exportedTotal.toLocaleString()} ชิ้น) ไปยัง ${selectedCustomer.customer_name} แล้ว${locationStatus}`,
        duration: 5000, // Show for 5 seconds
      });

      // Call refresh callback if provided
      if (onExportSuccess) {
        onExportSuccess();
      }

      // Close modal after a short delay to allow toast to render
      setTimeout(() => {
        onClose();
      }, 300);

    } catch (error) {
      console.error('═══════════════════════════════════════════════════');
      console.error('❌ ERROR EXPORTING ITEMS:');
      console.error('Error object:', error);
      console.error('Error type:', typeof error);
      console.error('Error keys:', error ? Object.keys(error) : 'null');

      if (error && typeof error === 'object') {
        console.error('Error details:', JSON.stringify(error, null, 2));
        console.error('Error event_title:', (error as any).message);
        console.error('Error code:', (error as any).code);
        console.error('Error hint:', (error as any).hint);
        console.error('Error details field:', (error as any).details);
      }

      console.error('Form data at time of error:', {
        customerId: formData.customerId,
        selectedItemId: formData.selectedItemId,
        quantityLevel1: formData.quantityLevel1,
        quantityLevel2: formData.quantityLevel2,
        quantityLevel3: formData.quantityLevel3
      });
      console.error('═══════════════════════════════════════════════════');

      // Extract more detailed error message
      let errorMessage = 'ไม่สามารถส่งออกสินค้าได้';

      if (error && typeof error === 'object') {
        const err = error as any;
        if (err.message) {
          errorMessage = err.message;
        }
        if (err.details) {
          errorMessage += ` (${err.details})`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: errorMessage,
        variant: 'destructive',
        duration: 7000, // Show error longer
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md !bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-red-600" />
            ส่งออกสินค้าไปยังลูกค้า
          </DialogTitle>
          <DialogDescription>
            Location: <span className="font-semibold">{location}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Select Item */}
          <div className="space-y-2">
            <Label htmlFor="item">เลือกสินค้า *</Label>
            {items.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  ⚠️ ไม่มีสินค้าใน Location: {location}
                </AlertDescription>
              </Alert>
            ) : (
              <select
                id="item"
                value={formData.selectedItemId}
                onChange={(e) => setFormData({ ...formData, selectedItemId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-sm"
                required
              >
                <option value="">-- เลือกสินค้า --</option>
                {items.map((item) => {
                  const stock = getActualStock(item);
                  const stockDisplay = getStockDisplay(item);
                  const hasStock = stock > 0;
                  return (
                    <option
                      key={item.id}
                      value={item.id}
                      disabled={!hasStock}
                    >
                      {item.product_name} @ {item.location} | SKU: {item.sku || 'N/A'} | {stockDisplay} (รวม: {stock} ชิ้น) {!hasStock ? '❌' : '✅'}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {/* Selected Item Info */}
          {selectedItem && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-blue-900">
                  📦 {selectedItem.product_name}
                </span>
                {getActualStock(selectedItem) === 0 && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                    ⚠️ สต็อกหมด
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-blue-700">
                  <span>📍 Location:</span>
                  <span className="font-semibold">{selectedItem.location}</span>
                  <span className="text-blue-500">|</span>
                  <span>🏷️ SKU:</span>
                  <span className="font-semibold">{selectedItem.sku || 'N/A'}</span>
                </div>
                <div className="pt-1 border-t border-blue-200">
                  <div className="text-xs font-semibold text-blue-800 mb-1">📊 สต็อกคงเหลือ:</div>
                  <div className="pl-3 space-y-0.5 text-xs text-blue-700">
                    {(selectedItem.unit_level1_quantity || 0) > 0 && (
                      <div>• {selectedItem.unit_level1_quantity} {selectedItem.unit_level1_name || 'ลัง'}
                        {selectedItem.unit_level1_rate > 0 && (
                          <span className="text-blue-500"> (1 {selectedItem.unit_level1_name} = {selectedItem.unit_level1_rate} ชิ้น)</span>
                        )}
                      </div>
                    )}
                    {(selectedItem.unit_level2_quantity || 0) > 0 && (
                      <div>• {selectedItem.unit_level2_quantity} {selectedItem.unit_level2_name || 'กล่อง'}
                        {selectedItem.unit_level2_rate > 0 && (
                          <span className="text-blue-500"> (1 {selectedItem.unit_level2_name} = {selectedItem.unit_level2_rate} ชิ้น)</span>
                        )}
                      </div>
                    )}
                    {(selectedItem.unit_level3_quantity || 0) > 0 && (
                      <div>• {selectedItem.unit_level3_quantity} {selectedItem.unit_level3_name || 'ชิ้น'}</div>
                    )}
                    <div className="pt-1 font-semibold text-blue-900">
                      ✅ รวมทั้งหมด: {getActualStock(selectedItem).toLocaleString('th-TH')} ชิ้น
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Select Customer */}
          <div className="space-y-2">
            <Label htmlFor="customer">เลือกลูกค้า *</Label>
            {loadingCustomers ? (
              <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                กำลังโหลดข้อมูลลูกค้า...
              </div>
            ) : customers.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  ไม่พบข้อมูลลูกค้าในระบบ กรุณาเพิ่มลูกค้าก่อนส่งออกสินค้า
                </AlertDescription>
              </Alert>
            ) : (
              <select
                id="customer"
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              >
                <option value="">-- เลือกลูกค้า --</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.customer_name} ({customer.customer_code})
                    {customer.phone ? ` - ${customer.phone}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* PO Reference */}
          <div className="space-y-2">
            <Label htmlFor="poReference">เลขที่ใบสั่งซื้อของลูกค้า (PO)</Label>
            <Input
              id="poReference"
              placeholder="เช่น PO-2024-001"
              value={formData.poReference}
              onChange={(e) => setFormData({ ...formData, poReference: e.target.value })}
            />
          </div>

          {/* Unit Price */}
          <div className="space-y-2">
            <Label htmlFor="unitPrice">ราคาต่อหน่วย (บาท/ชิ้น)</Label>
            <Input
              id="unitPrice"
              type="number"
              step="0.01"
              min="0"
              placeholder="เช่น 25.50"
              value={formData.unitPrice}
              onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
            />
            {formData.unitPrice && selectedItem && (
              <p className="text-xs text-muted-foreground">
                มูลค่ารวม: {(parseFloat(formData.unitPrice) * (
                  (parseInt(formData.quantityLevel1) || 0) * (selectedItem.unit_level1_rate || 0) +
                  (parseInt(formData.quantityLevel2) || 0) * (selectedItem.unit_level2_rate || 0) +
                  (parseInt(formData.quantityLevel3) || 0)
                )).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
              </p>
            )}
          </div>

          {/* Quantity - แยกเป็น 3 หน่วย */}
          <div className="space-y-3">
            <Label className="font-semibold text-gray-900">จำนวนที่ต้องการส่งออก *</Label>

            {selectedItem && (
              <div className="text-xs space-y-1 mb-2 p-2 bg-blue-50 rounded border border-blue-200">
                <p className="font-semibold text-blue-900">📊 สต็อกคงเหลือ:</p>
                <p className="text-blue-700">{getStockDisplay(selectedItem)}</p>
                <p className="text-blue-600 font-semibold">รวม: {getActualStock(selectedItem).toLocaleString('th-TH')} ชิ้น</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              {/* Level 1 - ลัง */}
              {selectedItem && (selectedItem.unit_level1_quantity > 0 || selectedItem.unit_level1_name) && (
                <div className="space-y-1">
                  <Label htmlFor="quantityLevel1" className="text-xs text-gray-600">
                    {selectedItem.unit_level1_name || 'ลัง'}
                    <span className="text-blue-500 ml-1">(สต็อก: {selectedItem.unit_level1_quantity || 0})</span>
                  </Label>
                  <Input
                    id="quantityLevel1"
                    type="number"
                    min="0"
                    max={selectedItem.unit_level1_quantity || 0}
                    placeholder="0"
                    value={formData.quantityLevel1}
                    onChange={(e) => setFormData({ ...formData, quantityLevel1: e.target.value })}
                    disabled={!selectedItem}
                    className="text-center"
                  />
                </div>
              )}

              {/* Level 2 - กล่อง */}
              {selectedItem && (selectedItem.unit_level2_quantity > 0 || selectedItem.unit_level2_name) && (
                <div className="space-y-1">
                  <Label htmlFor="quantityLevel2" className="text-xs text-gray-600">
                    {selectedItem.unit_level2_name || 'กล่อง'}
                    <span className="text-blue-500 ml-1">(สต็อก: {selectedItem.unit_level2_quantity || 0})</span>
                  </Label>
                  <Input
                    id="quantityLevel2"
                    type="number"
                    min="0"
                    max={selectedItem.unit_level2_quantity || 0}
                    placeholder="0"
                    value={formData.quantityLevel2}
                    onChange={(e) => setFormData({ ...formData, quantityLevel2: e.target.value })}
                    disabled={!selectedItem}
                    className="text-center"
                  />
                </div>
              )}

              {/* Level 3 - ชิ้น */}
              {selectedItem && (
                <div className="space-y-1">
                  <Label htmlFor="quantityLevel3" className="text-xs text-gray-600">
                    {selectedItem.unit_level3_name || 'ชิ้น'}
                    <span className="text-blue-500 ml-1">(สต็อก: {selectedItem.unit_level3_quantity || 0})</span>
                  </Label>
                  <Input
                    id="quantityLevel3"
                    type="number"
                    min="0"
                    max={selectedItem.unit_level3_quantity || 0}
                    placeholder="0"
                    value={formData.quantityLevel3}
                    onChange={(e) => setFormData({ ...formData, quantityLevel3: e.target.value })}
                    disabled={!selectedItem}
                    className="text-center"
                  />
                </div>
              )}
            </div>

            {validationError && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {validationError}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">หมายเหตุ</Label>
            <Textarea
              id="notes"
              placeholder="เช่น ใบสั่งซื้อเลขที่ PO-001"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400"
              disabled={
                loading ||
                !formData.customerId ||
                !formData.selectedItemId ||
                (!formData.quantityLevel1 && !formData.quantityLevel2 && !formData.quantityLevel3) ||
                !!validationError ||
                items.length === 0 ||
                (selectedItem && getActualStock(selectedItem) === 0)
              }
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังส่งออก...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  ส่งออกสินค้า
                </>
              )}
            </Button>
          </div>
        </form>

        {items.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>ไม่มีสินค้าใน Location นี้</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
