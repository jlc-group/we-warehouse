import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useProducts } from '@/hooks/useProducts';
import { Package, Hash, Weight, Ruler, Thermometer, Save, X, Archive, DollarSign } from 'lucide-react';
import { PRODUCT_TYPES, type ProductType } from '@/data/sampleInventory';
import type { Database } from '@/integrations/supabase/types';

type Product = Database['public']['Tables']['products']['Row'];

interface ProductFormData {
  product_name: string;
  sku_code: string;
  product_type: ProductType;
  category?: string;
  subcategory?: string;
  brand?: string;
  description?: string;
  unit_of_measure: string;
  weight?: number;
  dimensions?: string;
  storage_conditions?: string;
  manufacturing_country?: string;
  reorder_level?: number;
  max_stock_level?: number;
  unit_cost?: number;
}

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSuccess?: () => void;
}

export function EditProductModal({ isOpen, onClose, product, onSuccess }: EditProductModalProps) {
  const { updateProduct, checkSKUExists } = useProducts();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<ProductFormData>({
    defaultValues: {
      product_name: '',
      sku_code: '',
      product_type: 'FG',
      category: '',
      subcategory: '',
      brand: '',
      description: '',
      unit_of_measure: 'ชิ้น',
      weight: 0,
      dimensions: '',
      storage_conditions: 'อุณหภูมิห้อง',
      manufacturing_country: 'ไทย',
      reorder_level: 0,
      max_stock_level: 0,
      unit_cost: 0
    }
  });

  const watchedValues = watch();

  // Load product data when modal opens
  useEffect(() => {
    if (isOpen && product) {
      console.log('EditProductModal: Loading product data:', product);
      setValue('product_name', product.product_name);
      setValue('sku_code', product.sku_code);
      setValue('product_type', product.product_type);
      setValue('category', product.category || '');
      setValue('subcategory', product.subcategory || '');
      setValue('brand', product.brand || '');
      setValue('description', product.description || '');
      setValue('unit_of_measure', product.unit_of_measure || 'ชิ้น');
      setValue('weight', product.weight || 0);
      setValue('dimensions', product.dimensions || '');
      setValue('storage_conditions', product.storage_conditions || 'อุณหภูมิห้อง');
      setValue('manufacturing_country', product.manufacturing_country || 'ไทย');
      setValue('reorder_level', product.reorder_level || 0);
      setValue('max_stock_level', product.max_stock_level || 0);
      setValue('unit_cost', product.unit_cost || 0);
    }
  }, [isOpen, product, setValue]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const onSubmit = async (data: ProductFormData) => {
    if (!product) return;

    try {
      setIsSubmitting(true);

      // Check if SKU already exists (excluding current product)
      if (data.sku_code !== product.sku_code) {
        const skuExists = await checkSKUExists(data.sku_code, product.id);
        if (skuExists) {
          toast({
            title: '❌ รหัสสินค้าซ้ำ',
            description: `รหัสสินค้า "${data.sku_code}" มีอยู่ในระบบแล้ว`,
            variant: 'destructive',
          });
          return;
        }
      }

      // Prepare update data
      const updateData = {
        product_name: data.product_name,
        sku_code: data.sku_code,
        product_type: data.product_type,
        category: data.category || null,
        subcategory: data.subcategory || null,
        brand: data.brand || null,
        description: data.description || null,
        unit_of_measure: data.unit_of_measure,
        weight: data.weight || null,
        dimensions: data.dimensions || null,
        storage_conditions: data.storage_conditions || null,
        manufacturing_country: data.manufacturing_country || null,
        reorder_level: data.reorder_level || null,
        max_stock_level: data.max_stock_level || null,
        unit_cost: data.unit_cost || null,
      };

      const result = await updateProduct(product.id, updateData);

      if (result) {
        onClose();
        onSuccess?.();
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: 'ไม่สามารถอัพเดตข้อมูลสินค้าได้ กรุณาลองใหม่',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package className="h-5 w-5 text-primary" />
            แก้ไขข้อมูลสินค้า
            {product && (
              <span className="text-sm font-normal text-muted-foreground">
                ({product.sku_code})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Product Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="product_name" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                ชื่อสินค้า *
              </Label>
              <Input
                id="product_name"
                {...register('product_name', { required: 'กรุณากรอกชื่อสินค้า' })}
                placeholder="เช่น ซองบรรจุเซรั่ม"
                className={errors.product_name ? 'border-red-500' : ''}
              />
              {errors.product_name && (
                <p className="text-sm text-red-500">{errors.product_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku_code" className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                รหัสสินค้า (SKU) *
              </Label>
              <Input
                id="sku_code"
                {...register('sku_code', { required: 'กรุณากรอกรหัสสินค้า' })}
                placeholder="เช่น SCH-L4-8G_M01"
                className={`font-mono ${errors.sku_code ? 'border-red-500' : ''}`}
              />
              {errors.sku_code && (
                <p className="text-sm text-red-500">{errors.sku_code.message}</p>
              )}
            </div>
          </div>

          {/* Product Type and Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>ประเภทสินค้า *</Label>
              <Select
                value={watchedValues.product_type}
                onValueChange={(value: ProductType) => setValue('product_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกประเภทสินค้า" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PRODUCT_TYPES.FG}>
                    🏷️ FG - สินค้าสำเร็จรูป
                  </SelectItem>
                  <SelectItem value={PRODUCT_TYPES.PK}>
                    📦 PK - วัสดุบรรจุภัณฑ์
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">หมวดหมู่</Label>
              <Input
                id="category"
                {...register('category')}
                placeholder="เช่น บรรจุภัณฑ์"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">แบรนด์</Label>
              <Input
                id="brand"
                {...register('brand')}
                placeholder="เช่น ABC Company"
              />
            </div>
          </div>

          {/* Unit and Physical Properties */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="unit_of_measure">หน่วยนับหลัก *</Label>
              <Input
                id="unit_of_measure"
                {...register('unit_of_measure', { required: 'กรุณาระบุหน่วยนับ' })}
                placeholder="เช่น ชิ้น, กิโลกรัม, ลิตร"
                className={errors.unit_of_measure ? 'border-red-500' : ''}
              />
              {errors.unit_of_measure && (
                <p className="text-sm text-red-500">{errors.unit_of_measure.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight" className="flex items-center gap-2">
                <Weight className="h-4 w-4" />
                น้ำหนัก (กรัม)
              </Label>
              <Input
                id="weight"
                type="number"
                min="0"
                step="0.01"
                {...register('weight', { valueAsNumber: true })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dimensions" className="flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                ขนาด (กว้าง x ยาว x สูง)
              </Label>
              <Input
                id="dimensions"
                {...register('dimensions')}
                placeholder="เช่น 10x15x2 cm"
              />
            </div>
          </div>

          {/* Storage and Origin */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="storage_conditions" className="flex items-center gap-2">
                <Thermometer className="h-4 w-4" />
                เงื่อนไขการเก็บ
              </Label>
              <Select
                value={watchedValues.storage_conditions || 'อุณหภูมิห้อง'}
                onValueChange={(value) => setValue('storage_conditions', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกเงื่อนไขการเก็บ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="อุณหภูมิห้อง">🌡️ อุณหภูมิห้อง</SelectItem>
                  <SelectItem value="เย็น">❄️ เย็น (2-8°C)</SelectItem>
                  <SelectItem value="แช่แข็ง">🧊 แช่แข็ง (-18°C)</SelectItem>
                  <SelectItem value="แห้ง">🏜️ แห้ง</SelectItem>
                  <SelectItem value="หลีกเลี่ยงแสง">🕶️ หลีกเลี่ยงแสง</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manufacturing_country">ประเทศผู้ผลิต</Label>
              <Input
                id="manufacturing_country"
                {...register('manufacturing_country')}
                placeholder="เช่น ไทย, จีน, ญี่ปุ่น"
              />
            </div>
          </div>

          {/* Inventory Management */}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Archive className="h-5 w-5" />
                การจัดการสต็อก
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reorder_level">จุดสั่งซื้อใหม่</Label>
                  <Input
                    id="reorder_level"
                    type="number"
                    min="0"
                    {...register('reorder_level', { valueAsNumber: true })}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">จำนวนที่ต้องสั่งซื้อเพิ่ม</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_stock_level">สต็อกสูงสุด</Label>
                  <Input
                    id="max_stock_level"
                    type="number"
                    min="0"
                    {...register('max_stock_level', { valueAsNumber: true })}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">จำนวนสูงสุดที่เก็บได้</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit_cost" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    ต้นทุนต่อหน่วย (บาท)
                  </Label>
                  <Input
                    id="unit_cost"
                    type="number"
                    min="0"
                    step="0.01"
                    {...register('unit_cost', { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">รายละเอียดเพิ่มเติม</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับสินค้า"
              rows={3}
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-6">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'กำลังอัพเดต...' : 'อัพเดตข้อมูลสินค้า'}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-2" />
              ยกเลิก
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}