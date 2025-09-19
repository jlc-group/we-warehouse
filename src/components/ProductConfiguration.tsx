import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Plus, Edit, Save, X, Package, Calculator } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ConversionRate {
  id: string;
  sku: string;
  product_name: string;
  unit_level1_name?: string;
  unit_level1_rate: number;
  unit_level2_name?: string;
  unit_level2_rate: number;
  unit_level3_name: string;
  calculation_example?: string;
}

interface ProductConfigurationProps {}

function ProductConfiguration(_props: ProductConfigurationProps) {
  const [rates, setRates] = useState<ConversionRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    sku: '',
    product_name: '',
    unit_level1_name: '',
    unit_level1_rate: 0,
    unit_level2_name: '',
    unit_level2_rate: 0,
    unit_level3_name: 'ชิ้น'
  });
  const { toast } = useToast();

  useEffect(() => {
    loadConversionRates();
  }, []);

  const loadConversionRates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('product_conversion_rates')
        .select('*')
        .order('sku');

      if (error) {
        console.error('Error loading conversion rates:', error);

        // Check if table doesn't exist
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          toast({
            title: 'ตารางยังไม่พร้อม',
            description: 'กรุณาสร้างตาราง product_conversion_rates ใน Supabase ก่อน',
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'เกิดข้อผิดพลาด',
            description: 'ไม่สามารถโหลดข้อมูลอัตราแปลงได้',
            variant: 'destructive'
          });
        }
        setRates([]);
      } else {
        setRates(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
      setRates([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateExample = (data: typeof formData) => {
    const { unit_level1_name, unit_level1_rate, unit_level2_name, unit_level2_rate, unit_level3_name } = data;

    if (unit_level1_name && unit_level2_name) {
      const total = (10 * unit_level1_rate) + (2 * unit_level2_rate) + 5;
      return `ตัวอย่าง: 10 ${unit_level1_name} + 2 ${unit_level2_name} + 5 ${unit_level3_name} = ${total.toLocaleString('th-TH')} ${unit_level3_name}`;
    } else if (unit_level1_name) {
      const total = (10 * unit_level1_rate) + 5;
      return `ตัวอย่าง: 10 ${unit_level1_name} + 5 ${unit_level3_name} = ${total.toLocaleString('th-TH')} ${unit_level3_name}`;
    } else if (unit_level2_name) {
      const total = (2 * unit_level2_rate) + 5;
      return `ตัวอย่าง: 2 ${unit_level2_name} + 5 ${unit_level3_name} = ${total.toLocaleString('th-TH')} ${unit_level3_name}`;
    }
    return `ตัวอย่าง: 5 ${unit_level3_name} = 5 ${unit_level3_name}`;
  };

  const handleSave = async (isNew: boolean = false) => {
    try {
      if (!formData.sku.trim() || !formData.product_name.trim()) {
        toast({
          title: 'ข้อมูลไม่ครบถ้วน',
          description: 'กรุณากรอก SKU และชื่อสินค้า',
          variant: 'destructive'
        });
        return;
      }

      const dataToSave = {
        sku: formData.sku.trim(),
        product_name: formData.product_name.trim(),
        unit_level1_name: formData.unit_level1_name?.trim() || null,
        unit_level1_rate: formData.unit_level1_rate || 0,
        unit_level2_name: formData.unit_level2_name?.trim() || null,
        unit_level2_rate: formData.unit_level2_rate || 0,
        unit_level3_name: formData.unit_level3_name?.trim() || 'ชิ้น',
        user_id: '00000000-0000-0000-0000-000000000000'
      };

      if (isNew) {
        const { error } = await supabase
          .from('product_conversion_rates')
          .insert([dataToSave]);

        if (error) throw error;

        toast({
          title: 'เพิ่มข้อมูลสำเร็จ',
          description: 'เพิ่มอัตราแปลงหน่วยใหม่แล้ว',
        });
        setIsAddDialogOpen(false);
      } else if (editingId) {
        const { error } = await supabase
          .from('product_conversion_rates')
          .update(dataToSave)
          .eq('id', editingId);

        if (error) throw error;

        toast({
          title: 'อัปเดตสำเร็จ',
          description: 'อัปเดตอัตราแปลงหน่วยแล้ว',
        });
        setEditingId(null);
      }

      // Reset form
      setFormData({
        sku: '',
        product_name: '',
        unit_level1_name: '',
        unit_level1_rate: 0,
        unit_level2_name: '',
        unit_level2_rate: 0,
        unit_level3_name: 'ชิ้น'
      });

      loadConversionRates();
    } catch (error: any) {
      console.error('Error saving:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message || 'ไม่สามารถบันทึกข้อมูลได้',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (rate: ConversionRate) => {
    setFormData({
      sku: rate.sku,
      product_name: rate.product_name,
      unit_level1_name: rate.unit_level1_name || '',
      unit_level1_rate: rate.unit_level1_rate,
      unit_level2_name: rate.unit_level2_name || '',
      unit_level2_rate: rate.unit_level2_rate,
      unit_level3_name: rate.unit_level3_name
    });
    setEditingId(rate.id);
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      sku: '',
      product_name: '',
      unit_level1_name: '',
      unit_level1_rate: 0,
      unit_level2_name: '',
      unit_level2_rate: 0,
      unit_level3_name: 'ชิ้น'
    });
  };

  const getUnitBadge = (level1?: string, level2?: string, level3?: string) => {
    const units = [level1, level2, level3].filter(Boolean);
    return (
      <div className="flex gap-1 flex-wrap">
        {units.map((unit, index) => (
          <Badge key={index} variant="secondary" className="text-xs">
            {unit}
          </Badge>
        ))}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          ตั้งค่าอัตราแปลงหน่วยสินค้า
        </CardTitle>
        <CardDescription>
          กำหนดอัตราแปลงหน่วยสำหรับแต่ละสินค้า เพื่อให้ระบบคำนวณจำนวนรวมได้อัตโนมัติ
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Add New Button */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {loading ? 'กำลังโหลด...' : `มีข้อมูล ${rates.length} รายการ`}
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                เพิ่มสินค้าใหม่
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>เพิ่มอัตราแปลงหน่วยสินค้าใหม่</DialogTitle>
                <DialogDescription>
                  กำหนดอัตราแปลงหน่วยสำหรับสินค้าใหม่
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label>รหัสสินค้า (SKU) *</Label>
                  <Input
                    value={formData.sku}
                    onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                    placeholder="เช่น L3-8G"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ชื่อสินค้า *</Label>
                  <Input
                    value={formData.product_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, product_name: e.target.value }))}
                    placeholder="ชื่อสินค้า"
                  />
                </div>

                {/* Level 1 Unit */}
                <div className="space-y-2">
                  <Label>หน่วยชั้นที่ 1 (ใหญ่สุด)</Label>
                  <Select
                    value={formData.unit_level1_name || "none"}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      unit_level1_name: value === "none" ? "" : value,
                      unit_level1_rate: value === "none" ? 0 : prev.unit_level1_rate
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกหน่วย (หรือไม่ใช้)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">ไม่ใช้</SelectItem>
                      <SelectItem value="ลัง">ลัง</SelectItem>
                      <SelectItem value="หีบ">หีบ</SelectItem>
                      <SelectItem value="โหล">โหล</SelectItem>
                      <SelectItem value="ตัน">ตัน</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>อัตราแปลง (1 หน่วย = ? ชิ้น)</Label>
                  <Input
                    type="number"
                    value={formData.unit_level1_rate}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit_level1_rate: parseInt(e.target.value) || 0 }))}
                    placeholder="เช่น 504"
                    disabled={!formData.unit_level1_name}
                  />
                </div>

                {/* Level 2 Unit */}
                <div className="space-y-2">
                  <Label>หน่วยชั้นที่ 2 (กลาง)</Label>
                  <Select
                    value={formData.unit_level2_name || "none"}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      unit_level2_name: value === "none" ? "" : value,
                      unit_level2_rate: value === "none" ? 0 : prev.unit_level2_rate
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกหน่วย (หรือไม่ใช้)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">ไม่ใช้</SelectItem>
                      <SelectItem value="กล่อง">กล่อง</SelectItem>
                      <SelectItem value="แพ็ค">แพ็ค</SelectItem>
                      <SelectItem value="มัด">มัด</SelectItem>
                      <SelectItem value="ซอง">ซอง</SelectItem>
                      <SelectItem value="ถุง">ถุง</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>อัตราแปลง (1 หน่วย = ? ชิ้น)</Label>
                  <Input
                    type="number"
                    value={formData.unit_level2_rate}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit_level2_rate: parseInt(e.target.value) || 0 }))}
                    placeholder="เช่น 6"
                    disabled={!formData.unit_level2_name}
                  />
                </div>

                {/* Level 3 Unit */}
                <div className="space-y-2">
                  <Label>หน่วยพื้นฐาน *</Label>
                  <Select
                    value={formData.unit_level3_name}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, unit_level3_name: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ชิ้น">ชิ้น</SelectItem>
                      <SelectItem value="หลวม">หลวม</SelectItem>
                      <SelectItem value="อัน">อัน</SelectItem>
                      <SelectItem value="แผง">แผง</SelectItem>
                      <SelectItem value="ขวด">ขวด</SelectItem>
                      <SelectItem value="เม็ด">เม็ด</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ตัวอย่างการคำนวณ</Label>
                  <div className="p-2 bg-muted rounded text-sm">
                    {calculateExample(formData)}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  ยกเลิก
                </Button>
                <Button onClick={() => handleSave(true)}>
                  <Save className="h-4 w-4 mr-2" />
                  บันทึก
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Conversion Rates Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>ชื่อสินค้า</TableHead>
                <TableHead>หน่วย</TableHead>
                <TableHead>อัตราแปลง</TableHead>
                <TableHead>ตัวอย่างการคำนวณ</TableHead>
                <TableHead className="w-[100px]">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    กำลังโหลดข้อมูล...
                  </TableCell>
                </TableRow>
              ) : rates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Package className="h-12 w-12 opacity-50" />
                      <p>ยังไม่มีการตั้งค่าอัตราแปลงหน่วย</p>
                      <p className="text-sm">คลิก "เพิ่มสินค้าใหม่" เพื่อเริ่มต้น</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rates.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell className="font-mono font-medium">{rate.sku}</TableCell>
                    <TableCell>{rate.product_name}</TableCell>
                    <TableCell>
                      {getUnitBadge(rate.unit_level1_name, rate.unit_level2_name, rate.unit_level3_name)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {rate.unit_level1_name && (
                        <div>1 {rate.unit_level1_name} = {rate.unit_level1_rate.toLocaleString('th-TH')} {rate.unit_level3_name}</div>
                      )}
                      {rate.unit_level2_name && (
                        <div>1 {rate.unit_level2_name} = {rate.unit_level2_rate.toLocaleString('th-TH')} {rate.unit_level3_name}</div>
                      )}
                      {!rate.unit_level1_name && !rate.unit_level2_name && (
                        <div className="text-muted-foreground">หน่วยเดียว: {rate.unit_level3_name}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calculator className="h-3 w-3" />
                        {rate.calculation_example || calculateExample({
                          unit_level1_name: rate.unit_level1_name || '',
                          unit_level1_rate: rate.unit_level1_rate,
                          unit_level2_name: rate.unit_level2_name || '',
                          unit_level2_rate: rate.unit_level2_rate,
                          unit_level3_name: rate.unit_level3_name,
                          sku: '',
                          product_name: ''
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {editingId === rate.id ? (
                          <>
                            <Button size="sm" variant="outline" onClick={handleCancel}>
                              <X className="h-3 w-3" />
                            </Button>
                            <Button size="sm" onClick={() => handleSave(false)}>
                              <Save className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => handleEdit(rate)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary Card */}
        {rates.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">สรุปการตั้งค่า</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="font-medium">สินค้าทั้งหมด</div>
                  <div className="text-2xl font-bold text-primary">{rates.length}</div>
                  <div className="text-muted-foreground">รายการ</div>
                </div>
                <div>
                  <div className="font-medium">มีหน่วยหลายชั้น</div>
                  <div className="text-2xl font-bold text-green-600">
                    {rates.filter(r => r.unit_level1_name || r.unit_level2_name).length}
                  </div>
                  <div className="text-muted-foreground">รายการ</div>
                </div>
                <div>
                  <div className="font-medium">หน่วยเดียว</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {rates.filter(r => !r.unit_level1_name && !r.unit_level2_name).length}
                  </div>
                  <div className="text-muted-foreground">รายการ</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}

export default ProductConfiguration;