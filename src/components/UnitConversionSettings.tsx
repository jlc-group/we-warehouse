import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Settings,
  Save,
  RefreshCw,
  Calculator,
  Package,
  Edit3,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { InventoryItem } from '@/hooks/useInventory';

interface UnitConversionData {
  sku: string;
  product_name: string;
  unit_level1_name: string | null;
  unit_level2_name: string | null;
  unit_level3_name: string | null;
  unit_level1_rate: number | null;
  unit_level2_rate: number | null;
  sample_quantity_1: number;
  sample_quantity_2: number;
  sample_quantity_3: number;
}

interface UnitConversionSettingsProps {
  onClose?: () => void;
}

export function UnitConversionSettings({ onClose }: UnitConversionSettingsProps) {
  const [conversionData, setConversionData] = useState<UnitConversionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<UnitConversionData | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { toast } = useToast();

  // Load conversion data from all unique SKUs
  useEffect(() => {
    loadConversionData();
  }, []);

  const loadConversionData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          sku,
          product_name,
          unit_level1_name,
          unit_level2_name,
          unit_level3_name,
          unit_level1_rate,
          unit_level2_rate,
          unit_level1_quantity,
          unit_level2_quantity,
          unit_level3_quantity
        `)
        .order('sku');

      if (error) throw error;

      // Group by SKU and get unique SKUs with their conversion settings
      const skuMap = new Map<string, UnitConversionData>();

      data?.forEach(item => {
        if (!skuMap.has(item.sku)) {
          skuMap.set(item.sku, {
            sku: item.sku,
            product_name: item.product_name,
            unit_level1_name: item.unit_level1_name,
            unit_level2_name: item.unit_level2_name,
            unit_level3_name: item.unit_level3_name,
            unit_level1_rate: item.unit_level1_rate,
            unit_level2_rate: item.unit_level2_rate,
            sample_quantity_1: item.unit_level1_quantity || 0,
            sample_quantity_2: item.unit_level2_quantity || 0,
            sample_quantity_3: item.unit_level3_quantity || 0,
          });
        }
      });

      setConversionData(Array.from(skuMap.values()));
    } catch (error) {
      console.error('Error loading conversion data:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดข้อมูลการแปลงหน่วยได้',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (item: UnitConversionData) => {
    setEditingItem({ ...item });
    setShowEditDialog(true);
  };

  const handleSaveConversion = async () => {
    if (!editingItem) return;

    try {
      setSaving(true);

      // Update all inventory items with this SKU
      const { error } = await supabase
        .from('inventory_items')
        .update({
          unit_level1_name: editingItem.unit_level1_name,
          unit_level2_name: editingItem.unit_level2_name,
          unit_level3_name: editingItem.unit_level3_name,
          unit_level1_rate: editingItem.unit_level1_rate,
          unit_level2_rate: editingItem.unit_level2_rate,
        })
        .eq('sku', editingItem.sku);

      if (error) throw error;

      // Update local state
      setConversionData(prev => prev.map(item =>
        item.sku === editingItem.sku ? editingItem : item
      ));

      setShowEditDialog(false);
      setEditingItem(null);

      toast({
        title: 'บันทึกสำเร็จ',
        description: `อัปเดตการตั้งค่าแปลงหน่วยสำหรับ ${editingItem.sku} แล้ว`,
      });
    } catch (error) {
      console.error('Error saving conversion:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถบันทึกการตั้งค่าได้',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Calculate conversion preview
  const calculateConversion = (item: UnitConversionData, baseValue: number, fromLevel: number, toLevel: number): string => {
    if (fromLevel === toLevel) return baseValue.toString();

    let result = baseValue;

    if (fromLevel === 1 && toLevel === 2) {
      result = baseValue * (item.unit_level1_rate || 1);
    } else if (fromLevel === 1 && toLevel === 3) {
      result = baseValue * (item.unit_level1_rate || 1) * (item.unit_level2_rate || 1);
    } else if (fromLevel === 2 && toLevel === 3) {
      result = baseValue * (item.unit_level2_rate || 1);
    } else if (fromLevel === 2 && toLevel === 1) {
      result = baseValue / (item.unit_level1_rate || 1);
    } else if (fromLevel === 3 && toLevel === 1) {
      result = baseValue / ((item.unit_level1_rate || 1) * (item.unit_level2_rate || 1));
    } else if (fromLevel === 3 && toLevel === 2) {
      result = baseValue / (item.unit_level2_rate || 1);
    }

    return result.toFixed(2);
  };

  const hasValidConversion = (item: UnitConversionData): boolean => {
    return !!(item.unit_level1_name && item.unit_level2_name &&
              item.unit_level1_rate && item.unit_level1_rate > 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold">ตั้งค่าอัตราแปลงหน่วยสินค้า</h1>
          </div>
          <Badge variant="outline" className="px-3 py-1">
            <Package className="h-4 w-4 mr-1" />
            {conversionData.length} SKU
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadConversionData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            รีเฟรช
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              ปิด
            </Button>
          )}
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          ตั้งค่าอัตราแปลงหน่วยสำหรับแต่ละ SKU เพื่อให้ระบบคำนวณการแปลงหน่วยได้อย่างถูกต้อง
          <br />
          <strong>หน่วยระดับ 1 → หน่วยระดับ 2:</strong> ใส่จำนวนที่ 1 หน่วยระดับ 1 เท่ากับกี่หน่วยระดับ 2
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            รายการตั้งค่าแปลงหน่วย
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>ชื่อสินค้า</TableHead>
                  <TableHead>หน่วยระดับ 1</TableHead>
                  <TableHead>หน่วยระดับ 2</TableHead>
                  <TableHead>หน่วยระดับ 3</TableHead>
                  <TableHead>อัตราแปลง 1→2</TableHead>
                  <TableHead>อัตราแปลง 2→3</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>การดำเนินการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conversionData.map((item) => (
                  <TableRow key={item.sku}>
                    <TableCell className="font-mono font-medium">{item.sku}</TableCell>
                    <TableCell className="max-w-xs truncate" title={item.product_name}>
                      {item.product_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.unit_level1_name || 'ไม่ได้ตั้งค่า'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.unit_level2_name || 'ไม่ได้ตั้งค่า'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.unit_level3_name || 'ไม่ได้ตั้งค่า'}</Badge>
                    </TableCell>
                    <TableCell>
                      {item.unit_level1_rate ? (
                        <span className="font-medium">1 : {item.unit_level1_rate}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.unit_level2_rate ? (
                        <span className="font-medium">1 : {item.unit_level2_rate}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {hasValidConversion(item) ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          พร้อมใช้งาน
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          ยังไม่ได้ตั้งค่า
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClick(item)}
                        className="flex items-center gap-1"
                      >
                        <Edit3 className="h-3 w-3" />
                        แก้ไข
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>แก้ไขการตั้งค่าแปลงหน่วย</DialogTitle>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-6 py-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">ข้อมูลสินค้า</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">SKU:</span>
                    <span className="font-mono font-medium ml-2">{editingItem.sku}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">ชื่อสินค้า:</span>
                    <span className="ml-2">{editingItem.product_name}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-800">ชื่อหน่วย</h3>

                  <div className="space-y-2">
                    <Label htmlFor="unit1">หน่วยระดับ 1 (หน่วยใหญ่สุด)</Label>
                    <Input
                      id="unit1"
                      placeholder="เช่น กล่อง, แพ็ค"
                      value={editingItem.unit_level1_name || ''}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, unit_level1_name: e.target.value } : null)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unit2">หน่วยระดับ 2 (หน่วยกลาง)</Label>
                    <Input
                      id="unit2"
                      placeholder="เช่น ชิ้น, หลอด"
                      value={editingItem.unit_level2_name || ''}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, unit_level2_name: e.target.value } : null)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unit3">หน่วยระดับ 3 (หน่วยเล็กสุด)</Label>
                    <Input
                      id="unit3"
                      placeholder="เช่น กรัม, มิลลิลิตร"
                      value={editingItem.unit_level3_name || ''}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, unit_level3_name: e.target.value } : null)}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-800">อัตราแปลง</h3>

                  <div className="space-y-2">
                    <Label htmlFor="rate1">
                      1 {editingItem.unit_level1_name || 'หน่วยระดับ 1'} = ? {editingItem.unit_level2_name || 'หน่วยระดับ 2'}
                    </Label>
                    <Input
                      id="rate1"
                      type="number"
                      step="0.01"
                      placeholder="เช่น 12 (1 กล่อง = 12 ชิ้น)"
                      value={editingItem.unit_level1_rate || ''}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, unit_level1_rate: parseFloat(e.target.value) || null } : null)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rate2">
                      1 {editingItem.unit_level2_name || 'หน่วยระดับ 2'} = ? {editingItem.unit_level3_name || 'หน่วยระดับ 3'}
                    </Label>
                    <Input
                      id="rate2"
                      type="number"
                      step="0.01"
                      placeholder="เช่น 50 (1 ชิ้น = 50 กรัม)"
                      value={editingItem.unit_level2_rate || ''}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, unit_level2_rate: parseFloat(e.target.value) || null } : null)}
                    />
                  </div>
                </div>
              </div>

              {/* Conversion Preview */}
              {editingItem.unit_level1_name && editingItem.unit_level2_name && editingItem.unit_level1_rate && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    ตัวอย่างการแปลงหน่วย
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-medium text-blue-700">1 {editingItem.unit_level1_name}</div>
                      <div className="text-blue-600">= {editingItem.unit_level1_rate} {editingItem.unit_level2_name}</div>
                      {editingItem.unit_level2_rate && (
                        <div className="text-blue-600">= {(editingItem.unit_level1_rate * editingItem.unit_level2_rate).toFixed(2)} {editingItem.unit_level3_name}</div>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-blue-700">5 {editingItem.unit_level1_name}</div>
                      <div className="text-blue-600">= {editingItem.unit_level1_rate * 5} {editingItem.unit_level2_name}</div>
                      {editingItem.unit_level2_rate && (
                        <div className="text-blue-600">= {(editingItem.unit_level1_rate * editingItem.unit_level2_rate * 5).toFixed(2)} {editingItem.unit_level3_name}</div>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-blue-700">10 {editingItem.unit_level1_name}</div>
                      <div className="text-blue-600">= {editingItem.unit_level1_rate * 10} {editingItem.unit_level2_name}</div>
                      {editingItem.unit_level2_rate && (
                        <div className="text-blue-600">= {(editingItem.unit_level1_rate * editingItem.unit_level2_rate * 10).toFixed(2)} {editingItem.unit_level3_name}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditDialog(false);
                    setEditingItem(null);
                  }}
                >
                  ยกเลิก
                </Button>
                <Button
                  onClick={handleSaveConversion}
                  disabled={saving || !editingItem.unit_level1_name || !editingItem.unit_level2_name || !editingItem.unit_level1_rate}
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-1" />
                      บันทึก
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}