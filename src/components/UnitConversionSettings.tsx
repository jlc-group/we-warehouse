import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Edit,
  Trash2,
  Settings,
  ArrowRight
} from 'lucide-react';
import { useConversionRates, ConversionRateInput } from '@/hooks/useConversionRates';
import { useProducts } from '@/contexts/ProductsContext';
import { toast } from 'sonner';

export default function UnitConversionSettings() {
  const { products } = useProducts();
  const {
    conversionRates,
    loading,
    error,
    fetchConversionRates,
    createConversionRate,
    updateConversionRate,
    deleteConversionRate
  } = useConversionRates();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedConversionRate, setSelectedConversionRate] = useState<any>(null);
  const [formData, setFormData] = useState<ConversionRateInput>({
    sku: '',
    product_name: '',
    unit_level1_name: 'ลัง',
    unit_level1_rate: 1,
    unit_level2_name: 'กล่อง',
    unit_level2_rate: 1,
    unit_level3_name: 'ชิ้น'
  });

  // Filter products without conversion rates for the add dialog
  const availableProducts = useMemo(() => {
    const existingSKUs = conversionRates.map(rate => rate.sku);
    return products.filter(product => !existingSKUs.includes(product.sku_code));
  }, [products, conversionRates]);

  // Filter conversion rates by search term
  const filteredConversionRates = useMemo(() => {
    if (!searchTerm) return conversionRates;
    return conversionRates.filter(rate =>
      rate.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rate.product_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [conversionRates, searchTerm]);

  const handleAdd = async () => {
    try {
      if (!formData.sku || !formData.product_name) {
        toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
        return;
      }

      await createConversionRate(formData);
      await fetchConversionRates();
      setIsAddDialogOpen(false);
      setFormData({
        sku: '',
        product_name: '',
        unit_level1_name: 'ลัง',
        unit_level1_rate: 1,
        unit_level2_name: 'กล่อง',
        unit_level2_rate: 1,
        unit_level3_name: 'ชิ้น'
      });
      toast.success('เพิ่มการตั้งค่าการแปลงหน่วยเรียบร้อย');
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการเพิ่มข้อมูล');
    }
  };

  const handleEdit = (conversionRate: any) => {
    setSelectedConversionRate(conversionRate);
    setFormData({
      sku: conversionRate.sku,
      product_name: conversionRate.product_name,
      unit_level1_name: conversionRate.unit_level1_name || 'ลัง',
      unit_level1_rate: conversionRate.unit_level1_rate || 1,
      unit_level2_name: conversionRate.unit_level2_name || 'กล่อง',
      unit_level2_rate: conversionRate.unit_level2_rate || 1,
      unit_level3_name: conversionRate.unit_level3_name || 'ชิ้น'
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    try {
      if (!selectedConversionRate) return;

      await updateConversionRate(selectedConversionRate.sku, formData);
      await fetchConversionRates();
      setIsEditDialogOpen(false);
      setSelectedConversionRate(null);
      toast.success('อัปเดตการตั้งค่าการแปลงหน่วยเรียบร้อย');
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการอัปเดตข้อมูล');
    }
  };

  const handleDelete = async (sku: string) => {
    try {
      await deleteConversionRate(sku);
      await fetchConversionRates();
      toast.success('ลบการตั้งค่าการแปลงหน่วยเรียบร้อย');
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  };

  const handleProductSelect = (productId: string) => {
    const product = availableProducts.find(p => p.id === productId);
    if (product) {
      setFormData(prev => ({
        ...prev,
        sku: product.sku_code,
        product_name: product.product_name
      }));
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            การตั้งค่าการแปลงหน่วย
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <div className="text-muted-foreground">กำลังโหลดข้อมูลการแปลงหน่วย...</div>
              <div className="text-xs text-muted-foreground mt-1">กรุณาตรวจสอบ Console สำหรับข้อมูลเพิ่มเติม</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            การตั้งค่าการแปลงหน่วย
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <div className="text-red-500 font-medium">เกิดข้อผิดพลาด</div>
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border">
              {error}
            </div>
            <div className="space-y-2">
              <Button
                onClick={() => {
                  console.log('🔄 Manually retrying fetchConversionRates...');
                  fetchConversionRates();
                }}
                variant="outline"
                size="sm"
              >
                ลองใหม่
              </Button>
              <div className="text-xs text-muted-foreground">
                หากปัญหายังคงอยู่ กรุณาตรวจสอบ Console (F12) สำหรับข้อมูลเพิ่มเติม
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          การตั้งค่าการแปลงหน่วย
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline">
              {filteredConversionRates.length} รายการ
            </Badge>
            {conversionRates.length === 0 && (
              <Badge variant="destructive" className="text-xs">
                ไม่มีข้อมูล
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Add Button */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="ค้นหารหัสสินค้าหรือชื่อสินค้า..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                เพิ่มการตั้งค่า
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>เพิ่มการตั้งค่าการแปลงหน่วย</DialogTitle>
                <DialogDescription>
                  กำหนดอัตราการแปลงหน่วยสำหรับสินค้า
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>เลือกสินค้า</Label>
                  <Select
                    value={availableProducts.find(p => p.sku_code === formData.sku)?.id || ''}
                    onValueChange={handleProductSelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกสินค้า" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          <span>{product.product_name} ({product.sku_code})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.sku && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>หน่วยระดับ 1</Label>
                        <Input
                          value={formData.unit_level1_name || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, unit_level1_name: e.target.value }))}
                          placeholder="เช่น ลัง"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>อัตราแปลง (ต่อหน่วยฐาน)</Label>
                        <Input
                          type="number"
                          min="1"
                          value={formData.unit_level1_rate || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, unit_level1_rate: parseInt(e.target.value) || 1 }))}
                          placeholder="1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>หน่วยระดับ 2</Label>
                        <Input
                          value={formData.unit_level2_name || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, unit_level2_name: e.target.value }))}
                          placeholder="เช่น กล่อง"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>อัตราแปลง (ต่อหน่วยฐาน)</Label>
                        <Input
                          type="number"
                          min="1"
                          value={formData.unit_level2_rate || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, unit_level2_rate: parseInt(e.target.value) || 1 }))}
                          placeholder="1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>หน่วยฐาน (ระดับ 3)</Label>
                      <Input
                        value={formData.unit_level3_name || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, unit_level3_name: e.target.value }))}
                        placeholder="เช่น ชิ้น"
                      />
                    </div>

                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">ตัวอย่างการแปลงหน่วย</h4>
                      <div className="text-sm space-y-1">
                        <div className="flex items-center gap-2">
                          <span>1 {formData.unit_level1_name}</span>
→
                          <span>{formData.unit_level1_rate} {formData.unit_level3_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>1 {formData.unit_level2_name}</span>
→
                          <span>{formData.unit_level2_rate} {formData.unit_level3_name}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  ยกเลิก
                </Button>
                <Button onClick={handleAdd} disabled={!formData.sku}>
                  เพิ่มการตั้งค่า
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Conversion Rates Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>สินค้า</TableHead>
                <TableHead>หน่วยระดับ 1</TableHead>
                <TableHead>หน่วยระดับ 2</TableHead>
                <TableHead>หน่วยฐาน</TableHead>
                <TableHead className="text-center">การจัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredConversionRates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="space-y-2">
                      <div className="text-muted-foreground">
                        {conversionRates.length === 0
                          ? 'ยังไม่มีการตั้งค่าการแปลงหน่วย'
                          : 'ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา'
                        }
                      </div>
                      {conversionRates.length === 0 && (
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>🔍 Debug: กำลังตรวจสอบการเชื่อมต่อฐานข้อมูล...</div>
                          <div>📋 ตรวจสอบ Console (F12) สำหรับข้อมูลเพิ่มเติม</div>
                          <Button
                            onClick={() => {
                              console.log('🔄 Debug: Manual refresh triggered');
                              console.log('🔍 Current state:', {
                                loading,
                                error,
                                conversionRatesCount: conversionRates.length,
                                productsCount: products.length
                              });
                              fetchConversionRates();
                            }}
                            variant="outline"
                            size="sm"
                            className="mt-2"
                          >
                            ลองโหลดใหม่
                          </Button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredConversionRates.map((rate) => (
                  <TableRow key={rate.sku}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{rate.product_name}</div>
                        <div className="text-sm text-muted-foreground font-mono">
                          SKU: {rate.sku}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{rate.unit_level1_name}</div>
                        <div className="text-sm text-muted-foreground">
                          = {rate.unit_level1_rate} {rate.unit_level3_name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{rate.unit_level2_name}</div>
                        <div className="text-sm text-muted-foreground">
                          = {rate.unit_level2_rate} {rate.unit_level3_name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{rate.unit_level3_name}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(rate)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
                              <AlertDialogDescription>
                                คุณต้องการลบการตั้งค่าการแปลงหน่วยสำหรับสินค้า "{rate.product_name}" หรือไม่? การดำเนินการนี้ไม่สามารถยกเลิกได้
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(rate.sku)}>
                                ลบ
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filteredConversionRates.length > 0 && (
          <div className="text-sm text-muted-foreground">
            แสดง {filteredConversionRates.length} จากทั้งหมด {conversionRates.length} รายการ
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>แก้ไขการตั้งค่าการแปลงหน่วย</DialogTitle>
              <DialogDescription>
                แก้ไขอัตราการแปลงหน่วยสำหรับสินค้า "{selectedConversionRate?.product_name}"
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>หน่วยระดับ 1</Label>
                  <Input
                    value={formData.unit_level1_name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit_level1_name: e.target.value }))}
                    placeholder="เช่น ลัง"
                  />
                </div>
                <div className="space-y-2">
                  <Label>อัตราแปลง (ต่อหน่วยฐาน)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.unit_level1_rate || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit_level1_rate: parseInt(e.target.value) || 1 }))}
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>หน่วยระดับ 2</Label>
                  <Input
                    value={formData.unit_level2_name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit_level2_name: e.target.value }))}
                    placeholder="เช่น กล่อง"
                  />
                </div>
                <div className="space-y-2">
                  <Label>อัตราแปลง (ต่อหน่วยฐาน)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.unit_level2_rate || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit_level2_rate: parseInt(e.target.value) || 1 }))}
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>หน่วยฐาน (ระดับ 3)</Label>
                <Input
                  value={formData.unit_level3_name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit_level3_name: e.target.value }))}
                  placeholder="เช่น ชิ้น"
                />
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">ตัวอย่างการแปลงหน่วย</h4>
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <span>1 {formData.unit_level1_name}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span>{formData.unit_level1_rate} {formData.unit_level3_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>1 {formData.unit_level2_name}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span>{formData.unit_level2_rate} {formData.unit_level3_name}</span>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button onClick={handleUpdate}>
                บันทึกการแก้ไข
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}