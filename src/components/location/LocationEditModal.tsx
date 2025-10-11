import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit3, Save, X, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LocationInventory {
  id: string;
  sku: string;
  product_name: string;
  unit_level1_quantity: number;
  unit_level2_quantity: number;
  unit_level3_quantity: number;
  unit_level1_name: string;
  unit_level2_name: string;
  unit_level3_name: string;
  unit_level1_rate: number;
  unit_level2_rate: number;
}

interface LocationEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationId: string;
  inventory: LocationInventory[];
  onSuccess: () => void;
}

export function LocationEditModal({ isOpen, onClose, locationId, inventory, onSuccess }: LocationEditModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [editingItems, setEditingItems] = useState<Record<string, LocationInventory>>({});

  useEffect(() => {
    if (isOpen && inventory.length > 0) {
      // Initialize editing state with current inventory
      const itemsMap: Record<string, LocationInventory> = {};
      inventory.forEach(item => {
        itemsMap[item.id] = { ...item };
      });
      setEditingItems(itemsMap);
    }
  }, [isOpen, inventory]);

  const handleQuantityChange = (itemId: string, field: keyof LocationInventory, value: string) => {
    const numValue = Math.max(0, parseInt(value) || 0);
    setEditingItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: numValue
      }
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      // Update each modified item
      const updates = Object.values(editingItems).map(async (item) => {
        const { data, error } = await supabase
          .from('inventory_items')
          .update({
            unit_level1_quantity: item.unit_level1_quantity,
            unit_level2_quantity: item.unit_level2_quantity,
            unit_level3_quantity: item.unit_level3_quantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);

        if (error) throw error;
        return data;
      });

      await Promise.all(updates);

      toast({
        title: '✅ อัปเดตสำเร็จ',
        description: `อัปเดตข้อมูลสินค้าใน Location ${locationId} แล้ว`,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating inventory:', error);
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: 'ไม่สามารถอัปเดตข้อมูลได้',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalPieces = (item: LocationInventory): number => {
    const level1Pieces = item.unit_level1_quantity * (item.unit_level1_rate || 0);
    const level2Pieces = item.unit_level2_quantity * (item.unit_level2_rate || 0);
    const level3Pieces = item.unit_level3_quantity || 0;
    return level1Pieces + level2Pieces + level3Pieces;
  };

  const hasChanges = () => {
    return Object.values(editingItems).some(editedItem => {
      const originalItem = inventory.find(item => item.id === editedItem.id);
      if (!originalItem) return false;

      return (
        originalItem.unit_level1_quantity !== editedItem.unit_level1_quantity ||
        originalItem.unit_level2_quantity !== editedItem.unit_level2_quantity ||
        originalItem.unit_level3_quantity !== editedItem.unit_level3_quantity
      );
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            แก้ไขสินค้าใน Location {locationId}
          </DialogTitle>
          <DialogDescription>
            แก้ไขจำนวนสินค้าในแต่ละรายการ ระบบจะคำนวณจำนวนชิ้นรวมโดยอัตโนมัติ
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {Object.values(editingItems).map((item) => (
            <Card key={item.id} className="border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <div>
                    <div className="font-medium">{item.product_name}</div>
                    <div className="text-sm text-gray-500 font-mono">{item.sku}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">รวมทั้งหมด</div>
                    <div className="text-lg font-bold text-blue-600">
                      {calculateTotalPieces(item).toLocaleString()} ชิ้น
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Level 1 - ลัง */}
                  <div className="space-y-2">
                    <Label htmlFor={`level1-${item.id}`} className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      {item.unit_level1_name || 'ลัง'}
                      {item.unit_level1_rate > 0 && (
                        <span className="text-xs text-gray-500">
                          ({item.unit_level1_rate} ชิ้น/หน่วย)
                        </span>
                      )}
                    </Label>
                    <Input
                      id={`level1-${item.id}`}
                      type="number"
                      min="0"
                      value={item.unit_level1_quantity}
                      onChange={(e) => handleQuantityChange(item.id, 'unit_level1_quantity', e.target.value)}
                      className="text-center"
                    />
                    {item.unit_level1_rate > 0 && (
                      <div className="text-xs text-center text-gray-500">
                        = {(item.unit_level1_quantity * item.unit_level1_rate).toLocaleString()} ชิ้น
                      </div>
                    )}
                  </div>

                  {/* Level 2 - กล่อง */}
                  <div className="space-y-2">
                    <Label htmlFor={`level2-${item.id}`} className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      {item.unit_level2_name || 'กล่อง'}
                      {item.unit_level2_rate > 0 && (
                        <span className="text-xs text-gray-500">
                          ({item.unit_level2_rate} ชิ้น/หน่วย)
                        </span>
                      )}
                    </Label>
                    <Input
                      id={`level2-${item.id}`}
                      type="number"
                      min="0"
                      value={item.unit_level2_quantity}
                      onChange={(e) => handleQuantityChange(item.id, 'unit_level2_quantity', e.target.value)}
                      className="text-center"
                    />
                    {item.unit_level2_rate > 0 && (
                      <div className="text-xs text-center text-gray-500">
                        = {(item.unit_level2_quantity * item.unit_level2_rate).toLocaleString()} ชิ้น
                      </div>
                    )}
                  </div>

                  {/* Level 3 - ชิ้น */}
                  <div className="space-y-2">
                    <Label htmlFor={`level3-${item.id}`} className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      {item.unit_level3_name || 'ชิ้น'}
                    </Label>
                    <Input
                      id={`level3-${item.id}`}
                      type="number"
                      min="0"
                      value={item.unit_level3_quantity}
                      onChange={(e) => handleQuantityChange(item.id, 'unit_level3_quantity', e.target.value)}
                      className="text-center"
                    />
                    <div className="text-xs text-center text-gray-500">
                      = {item.unit_level3_quantity.toLocaleString()} ชิ้น
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {Object.keys(editingItems).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>ไม่มีสินค้าใน Location นี้</p>
              <p className="text-sm mt-2">กรุณาเพิ่มสินค้าก่อนจึงจะสามารถแก้ไขได้</p>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            <X className="h-4 w-4 mr-2" />
            ยกเลิก
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || !hasChanges()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}