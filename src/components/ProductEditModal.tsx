import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { EventLoggingService } from '@/services/eventLoggingService';
import { toast } from '@/components/ui/sonner';
import { Loader2, AlertCircle, Lock, Save } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Product {
  id: string;
  sku_code: string;
  product_name: string;
  product_type: string;
  unit_level1_name?: string;
  unit_level2_name?: string;
  unit_level3_name?: string;
  created_at: string;
  updated_at: string;
}

interface ProductEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  onSuccess: () => void;
}

export function ProductEditModal({ open, onOpenChange, product, onSuccess }: ProductEditModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    product_name: '',
    unit_level1_name: '',
    unit_level2_name: '',
    unit_level3_name: '',
    notes: ''
  });
  const [conversionRates, setConversionRates] = useState({
    unit_level1_rate: 144,
    unit_level2_rate: 12
  });

  // Load product data and conversion rates
  useEffect(() => {
    if (open && product) {
      setFormData({
        product_name: product.product_name || '',
        unit_level1_name: product.unit_level1_name || '',
        unit_level2_name: product.unit_level2_name || '',
        unit_level3_name: product.unit_level3_name || '',
        notes: ''
      });

      // Fetch conversion rates
      fetchConversionRates();
    }
  }, [open, product]);

  const fetchConversionRates = async () => {
    const { data, error } = await supabase
      .from('product_conversion_rates')
      .select('unit_level1_rate, unit_level2_rate')
      .eq('product_id', product.id)
      .single();

    if (data && !error) {
      setConversionRates({
        unit_level1_rate: data.unit_level1_rate || 144,
        unit_level2_rate: data.unit_level2_rate || 12
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      // Track changes
      const changes: Record<string, { old: any; new: any }> = {};

      // Update products table
      const productUpdates: any = {};
      let hasProductChanges = false;

      if (formData.product_name !== product.product_name) {
        productUpdates.product_name = formData.product_name;
        changes.product_name = { old: product.product_name, new: formData.product_name };
        hasProductChanges = true;
      }
      if (formData.unit_level1_name !== product.unit_level1_name) {
        productUpdates.unit_level1_name = formData.unit_level1_name;
        changes.unit_level1_name = { old: product.unit_level1_name, new: formData.unit_level1_name };
        hasProductChanges = true;
      }
      if (formData.unit_level2_name !== product.unit_level2_name) {
        productUpdates.unit_level2_name = formData.unit_level2_name;
        changes.unit_level2_name = { old: product.unit_level2_name, new: formData.unit_level2_name };
        hasProductChanges = true;
      }
      if (formData.unit_level3_name !== product.unit_level3_name) {
        productUpdates.unit_level3_name = formData.unit_level3_name;
        changes.unit_level3_name = { old: product.unit_level3_name, new: formData.unit_level3_name };
        hasProductChanges = true;
      }

      if (hasProductChanges) {
        productUpdates.updated_at = new Date().toISOString();

        const { error: productError } = await supabase
          .from('products')
          .update(productUpdates)
          .eq('id', product.id);

        if (productError) throw productError;
      }

      // Check if conversion rates exist
      const { data: existingRates } = await supabase
        .from('product_conversion_rates')
        .select('*')
        .eq('product_id', product.id)
        .single();

      let hasConversionChanges = false;

      if (existingRates) {
        // Update conversion rates if changed
        const rateUpdates: any = {};

        if (conversionRates.unit_level1_rate !== existingRates.unit_level1_rate) {
          rateUpdates.unit_level1_rate = conversionRates.unit_level1_rate;
          changes.unit_level1_rate = { old: existingRates.unit_level1_rate, new: conversionRates.unit_level1_rate };
          hasConversionChanges = true;
        }
        if (conversionRates.unit_level2_rate !== existingRates.unit_level2_rate) {
          rateUpdates.unit_level2_rate = conversionRates.unit_level2_rate;
          changes.unit_level2_rate = { old: existingRates.unit_level2_rate, new: conversionRates.unit_level2_rate };
          hasConversionChanges = true;
        }

        if (hasConversionChanges) {
          rateUpdates.updated_at = new Date().toISOString();

          const { error: rateError } = await supabase
            .from('product_conversion_rates')
            .update(rateUpdates)
            .eq('product_id', product.id);

          if (rateError) throw rateError;
        }
      }

      // Log to system_events if there were any changes
      if (Object.keys(changes).length > 0) {
        await EventLoggingService.logProductUpdated({
          sku: product.sku_code,
          product_name: formData.product_name,
          changes: changes,
          notes: formData.notes
        });

        toast.success('✅ บันทึกการแก้ไขสินค้าสำเร็จ', {
          description: `แก้ไข ${product.sku_code} - ${formData.product_name}`
        });

        onSuccess();
      } else {
        toast.info('ℹ️ ไม่มีการเปลี่ยนแปลง');
        onOpenChange(false);
      }

    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('❌ ไม่สามารถบันทึกการแก้ไขได้', {
        description: error instanceof Error ? error.message : 'เกิดข้อผิดพลาด'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            แก้ไขข้อมูลสินค้า
          </DialogTitle>
          <DialogDescription>
            แก้ไขข้อมูลสินค้า SKU: <span className="font-mono font-semibold">{product.sku_code}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Locked Fields */}
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              <strong>SKU</strong> และ <strong>ประเภทสินค้า</strong> ไม่สามารถแก้ไขได้
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground flex items-center gap-2">
                <Lock className="h-3 w-3" />
                SKU Code
              </Label>
              <Input value={product.sku_code} disabled className="font-mono" />
            </div>
            <div>
              <Label className="text-muted-foreground flex items-center gap-2">
                <Lock className="h-3 w-3" />
                ประเภทสินค้า
              </Label>
              <Input value={product.product_type} disabled />
            </div>
          </div>

          <Separator />

          {/* Editable Fields */}
          <div>
            <Label htmlFor="product_name">
              ชื่อสินค้า <span className="text-red-500">*</span>
            </Label>
            <Input
              id="product_name"
              value={formData.product_name}
              onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
              placeholder="ชื่อสินค้า"
            />
          </div>

          {/* Unit Names */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">ชื่อหน่วยสินค้า</Label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="unit_level1_name">หน่วยระดับ 1</Label>
                <Input
                  id="unit_level1_name"
                  value={formData.unit_level1_name}
                  onChange={(e) => setFormData({ ...formData, unit_level1_name: e.target.value })}
                  placeholder="เช่น ลัง"
                />
              </div>
              <div>
                <Label htmlFor="unit_level2_name">หน่วยระดับ 2</Label>
                <Input
                  id="unit_level2_name"
                  value={formData.unit_level2_name}
                  onChange={(e) => setFormData({ ...formData, unit_level2_name: e.target.value })}
                  placeholder="เช่น กล่อง"
                />
              </div>
              <div>
                <Label htmlFor="unit_level3_name">หน่วยระดับ 3</Label>
                <Input
                  id="unit_level3_name"
                  value={formData.unit_level3_name}
                  onChange={(e) => setFormData({ ...formData, unit_level3_name: e.target.value })}
                  placeholder="เช่น ชิ้น"
                />
              </div>
            </div>
          </div>

          {/* Conversion Rates */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">อัตราการแปลงหน่วย</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="unit_level1_rate">
                  อัตราแปลงระดับ 1 (1 {formData.unit_level1_name || 'หน่วย 1'} = ? {formData.unit_level3_name || 'หน่วย 3'})
                </Label>
                <Input
                  id="unit_level1_rate"
                  type="number"
                  min="1"
                  value={conversionRates.unit_level1_rate}
                  onChange={(e) => setConversionRates({ ...conversionRates, unit_level1_rate: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label htmlFor="unit_level2_rate">
                  อัตราแปลงระดับ 2 (1 {formData.unit_level2_name || 'หน่วย 2'} = ? {formData.unit_level3_name || 'หน่วย 3'})
                </Label>
                <Input
                  id="unit_level2_rate"
                  type="number"
                  min="1"
                  value={conversionRates.unit_level2_rate}
                  onChange={(e) => setConversionRates({ ...conversionRates, unit_level2_rate: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">หมายเหตุการแก้ไข (ไม่บังคับ)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="บันทึกเหตุผลหรือรายละเอียดการแก้ไข..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            ยกเลิก
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !formData.product_name.trim()}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                บันทึกการแก้ไข
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
