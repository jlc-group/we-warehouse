import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { EventLoggingService } from '@/services/eventLoggingService';
import { toast } from '@/components/ui/sonner';
import { Loader2, AlertCircle, Lock, Save } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PRODUCT_TYPES, ProductType } from '@/data/sampleInventory';

interface Product {
  id: string;
  sku_code: string;
  product_name: string;
  product_type: string;
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
    product_type: 'FG' as ProductType,
    notes: ''
  });
  const [conversionRates, setConversionRates] = useState({
    unit_level1_rate: 144,
    unit_level2_rate: 12
  });

  const fetchConversionRates = useCallback(async () => {
    const { data, error } = await supabase
      .from('product_conversion_rates')
      .select('unit_level1_rate, unit_level2_rate')
      .eq('product_id', product.id as any)
      .maybeSingle();

    if (data && !error) {
      setConversionRates({
        unit_level1_rate: (data as any).unit_level1_rate || 144,
        unit_level2_rate: (data as any).unit_level2_rate || 12
      });
    }
  }, [product.id]);

  // Load product data and conversion rates
  useEffect(() => {
    if (open && product) {
      setFormData({
        product_name: product.product_name || '',
        product_type: (product.product_type as ProductType) || 'FG',
        notes: ''
      });

      // Fetch conversion rates
      fetchConversionRates();
    }
  }, [open, product, fetchConversionRates]);

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
      if (formData.product_type !== product.product_type) {
        productUpdates.product_type = formData.product_type;
        changes.product_type = { old: product.product_type, new: formData.product_type };
        hasProductChanges = true;
      }

      if (hasProductChanges) {
        productUpdates.updated_at = new Date().toISOString();

        const { error: productError } = await supabase
          .from('products')
          .update(productUpdates)
          .eq('id', product.id as any);

        if (productError) throw productError;
      }

      // Check if conversion rates exist
      const { data: existingRates, error: ratesError } = await supabase
        .from('product_conversion_rates')
        .select('*')
        .eq('product_id', product.id as any)
        .maybeSingle();

      let hasConversionChanges = false;

      if (existingRates && !ratesError) {
        // Update conversion rates if changed
        const rateUpdates: any = {};
        const rates = existingRates as any;

        if (conversionRates.unit_level1_rate !== rates.unit_level1_rate) {
          rateUpdates.unit_level1_rate = conversionRates.unit_level1_rate;
          changes.unit_level1_rate = { old: rates.unit_level1_rate, new: conversionRates.unit_level1_rate };
          hasConversionChanges = true;
        }
        if (conversionRates.unit_level2_rate !== rates.unit_level2_rate) {
          rateUpdates.unit_level2_rate = conversionRates.unit_level2_rate;
          changes.unit_level2_rate = { old: rates.unit_level2_rate, new: conversionRates.unit_level2_rate };
          hasConversionChanges = true;
        }

        if (hasConversionChanges) {
          rateUpdates.updated_at = new Date().toISOString();

          const { error: rateError } = await supabase
            .from('product_conversion_rates')
            .update(rateUpdates)
            .eq('product_id', product.id as any);

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

        toast.success(`✅ บันทึกการแก้ไขสินค้าสำเร็จ\n${product.sku_code} - ${formData.product_name}`);

        onSuccess();
      } else {
        toast('ℹ️ ไม่มีการเปลี่ยนแปลง');
        onOpenChange(false);
      }

    } catch (error) {
      console.error('Error updating product:', error);
      const errorMsg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
      toast.error(`❌ ไม่สามารถบันทึกการแก้ไขได้\n${errorMsg}`);
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
              <strong>SKU Code</strong> ไม่สามารถแก้ไขได้
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
              <Label htmlFor="product_type">
                ประเภทสินค้า <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.product_type}
                onValueChange={(value) => setFormData({ ...formData, product_type: value as ProductType })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกประเภทสินค้า" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full bg-${type.color}-500`}></span>
                        {type.label} ({type.value})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          {/* Conversion Rates */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">อัตราการแปลงหน่วย</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="unit_level1_rate">
                  อัตราแปลงระดับ 1 (1 ลัง = ? ชิ้น)
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
                  อัตราแปลงระดับ 2 (1 กล่อง = ? ชิ้น)
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
