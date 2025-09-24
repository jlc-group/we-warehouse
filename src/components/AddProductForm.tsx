import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useProducts } from '@/hooks/useProducts';
import { Package, Hash, Save, RotateCcw, Settings } from 'lucide-react';
import { ProductSummaryTable } from '@/components/ProductSummaryTable';
import { UnitConversionSettings } from '@/components/UnitConversionSettings';

type ProductType = 'FG' | 'PK';

interface ProductFormData {
  product_name: string;
  sku_code: string;
  product_type: ProductType;
  unit_of_measure: string;
}

export function AddProductForm() {
  const { addProduct, checkSKUExists } = useProducts();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<ProductFormData>({
    defaultValues: {
      product_name: '',
      sku_code: '',
      product_type: 'FG',
      unit_of_measure: 'ชิ้น'
    }
  });

  const onSubmit = async (data: ProductFormData) => {
    try {
      setIsSubmitting(true);

      // Check if SKU already exists
      const skuExists = await checkSKUExists(data.sku_code);
      if (skuExists) {
        toast({
          title: '❌ รหัสสินค้าซ้ำ',
          description: `รหัสสินค้า "${data.sku_code}" มีอยู่ในระบบแล้ว`,
          variant: 'destructive',
        });
        return;
      }

      // Prepare data for database
      const productData = {
        product_name: data.product_name,
        sku_code: data.sku_code,
        product_type: data.product_type,
        unit_of_measure: data.unit_of_measure,
        is_active: true
      };

      const result = await addProduct(productData);

      if (result) {
        // Reset form
        reset();
      }
    } catch (error) {
      console.error('Error adding product:', error);
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: 'ไม่สามารถเพิ่มข้อมูลสินค้าได้ กรุณาลองใหม่',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    reset();
    toast({
      title: '🔄 ล้างข้อมูลแล้ว',
      description: 'กรอกข้อมูลสินค้าใหม่ได้เลย',
    });
  };

  return (
    <div className="space-y-6">
      {/* Product Management Tabs */}
      <Tabs defaultValue="add-product" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-white border border-gray-200">
          <TabsTrigger value="add-product" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            เพิ่มสินค้า
          </TabsTrigger>
          <TabsTrigger value="product-summary" className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            รหัสสินค้า
          </TabsTrigger>
          <TabsTrigger value="unit-conversion" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            การแปลงหน่วย
          </TabsTrigger>
        </TabsList>

        <TabsContent value="add-product" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Package className="h-5 w-5 text-primary" />
                เพิ่มสินค้าใหม่
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                กรอกข้อมูลพื้นฐานของสินค้าเพื่อเพิ่มเข้าระบบ
              </p>
            </CardHeader>

        <CardContent>
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

            {/* Product Type and Unit */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>ประเภทสินค้า *</Label>
                <Controller
                  name="product_type"
                  control={control}
                  rules={{ required: 'กรุณาเลือกประเภทสินค้า' }}
                  render={({ field }) => (
                    <Select value={field.value || ''} onValueChange={field.onChange}>
                      <SelectTrigger className={errors.product_type ? 'border-red-500' : ''}>
                        <SelectValue placeholder="เลือกประเภทสินค้า" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FG">
                          🏷️ FG - สินค้าสำเร็จรูป
                        </SelectItem>
                        <SelectItem value="PK">
                          📦 PK - วัสดุบรรจุภัณฑ์
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.product_type && (
                  <p className="text-sm text-red-500">{errors.product_type.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit_of_measure">หน่วยนับ *</Label>
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
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกสินค้า'}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isSubmitting}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                ล้างข้อมูล
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="product-summary" className="space-y-4">
          <ProductSummaryTable />
        </TabsContent>

        <TabsContent value="unit-conversion" className="space-y-4">
          <UnitConversionSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}