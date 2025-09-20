import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Send, Save, X, Package, AlertTriangle, FileText } from 'lucide-react';
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
  lot?: string;
  mfd?: string;
}

interface ExportItem {
  id: string;
  selected: boolean;
  exportQuantities: {
    level1: number;
    level2: number;
    level3: number;
  };
}

interface LocationExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationId: string;
  inventory: LocationInventory[];
  onSuccess: () => void;
}

export function LocationExportModal({
  isOpen,
  onClose,
  locationId,
  inventory,
  onSuccess
}: LocationExportModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [exportReason, setExportReason] = useState('sale');
  const [destination, setDestination] = useState('');
  const [notes, setNotes] = useState('');
  const [exportItems, setExportItems] = useState<Record<string, ExportItem>>({});

  useEffect(() => {
    if (isOpen) {
      // Initialize export items
      const items: Record<string, ExportItem> = {};
      inventory.forEach(item => {
        items[item.id] = {
          id: item.id,
          selected: false,
          exportQuantities: {
            level1: item.unit_level1_quantity,
            level2: item.unit_level2_quantity,
            level3: item.unit_level3_quantity
          }
        };
      });
      setExportItems(items);

      // Reset form
      setExportReason('sale');
      setDestination('');
      setNotes('');
    }
  }, [isOpen, inventory]);

  const calculateTotalPieces = (item: LocationInventory, quantities?: { level1: number; level2: number; level3: number }): number => {
    const qty = quantities || {
      level1: item.unit_level1_quantity,
      level2: item.unit_level2_quantity,
      level3: item.unit_level3_quantity
    };

    const level1Pieces = qty.level1 * (item.unit_level1_rate || 0);
    const level2Pieces = qty.level2 * (item.unit_level2_rate || 0);
    const level3Pieces = qty.level3 || 0;
    return level1Pieces + level2Pieces + level3Pieces;
  };

  const handleItemToggle = (itemId: string) => {
    setExportItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        selected: !prev[itemId].selected
      }
    }));
  };

  const handleQuantityChange = (itemId: string, level: 'level1' | 'level2' | 'level3', value: string) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;

    const numValue = Math.max(0, parseInt(value) || 0);
    const maxValue = level === 'level1' ? item.unit_level1_quantity :
                     level === 'level2' ? item.unit_level2_quantity :
                     item.unit_level3_quantity;

    const finalValue = Math.min(numValue, maxValue);

    setExportItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        exportQuantities: {
          ...prev[itemId].exportQuantities,
          [level]: finalValue
        }
      }
    }));
  };

  const handleSelectAll = () => {
    const allSelected = Object.values(exportItems).every(item => item.selected);
    setExportItems(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(id => {
        updated[id].selected = !allSelected;
      });
      return updated;
    });
  };

  const handleExport = async () => {
    const selectedItems = Object.values(exportItems).filter(item => item.selected);

    if (selectedItems.length === 0) {
      toast({
        title: '⚠️ ไม่ได้เลือกสินค้า',
        description: 'กรุณาเลือกสินค้าที่ต้องการส่งออก',
        variant: 'destructive'
      });
      return;
    }

    if (!destination.trim()) {
      toast({
        title: '⚠️ ไม่ได้ระบุปลายทาง',
        description: 'กรุณาระบุปลายทางการส่งออก',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);

      // Process each selected item
      for (const exportItem of selectedItems) {
        const originalItem = inventory.find(item => item.id === exportItem.id);
        if (!originalItem) continue;

        const exportQty = exportItem.exportQuantities;
        const remainingQty = {
          level1: originalItem.unit_level1_quantity - exportQty.level1,
          level2: originalItem.unit_level2_quantity - exportQty.level2,
          level3: originalItem.unit_level3_quantity - exportQty.level3
        };

        // If exporting full quantity, delete the item
        if (remainingQty.level1 === 0 && remainingQty.level2 === 0 && remainingQty.level3 === 0) {
          const { error: deleteError } = await supabase
            .from('inventory_items')
            .delete()
            .eq('id', originalItem.id);

          if (deleteError) throw deleteError;
        } else {
          // Update item with remaining quantities
          const { error: updateError } = await supabase
            .from('inventory_items')
            .update({
              unit_level1_quantity: remainingQty.level1,
              unit_level2_quantity: remainingQty.level2,
              unit_level3_quantity: remainingQty.level3,
              carton_quantity_legacy: remainingQty.level1,
              box_quantity_legacy: remainingQty.level2,
              pieces_quantity_legacy: remainingQty.level3,
              updated_at: new Date().toISOString()
            })
            .eq('id', originalItem.id);

          if (updateError) throw updateError;
        }

        // Log movement/export
        const { error: logError } = await supabase
          .from('inventory_movements')
          .insert([{
            item_id: originalItem.id,
            movement_type: 'export',
            from_location: locationId,
            to_location: destination,
            quantity_moved: calculateTotalPieces(originalItem, exportQty),
            notes: `${getReasonText(exportReason)}: ${notes || 'ไม่ได้ระบุรายละเอียด'}`,
            moved_by: 'system' // You might want to get this from auth context
          }]);

        if (logError) console.error('Error logging export:', logError);
      }

      toast({
        title: '✅ ส่งออกสินค้าสำเร็จ',
        description: `ส่งออก ${selectedItems.length} รายการจาก ${locationId} แล้ว`,
      });

      onSuccess();
      onClose();

    } catch (error) {
      console.error('Error exporting items:', error);
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: 'ไม่สามารถส่งออกสินค้าได้',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getReasonText = (reason: string): string => {
    switch (reason) {
      case 'sale': return 'ขายสินค้า';
      case 'damaged': return 'สินค้าเสียหาย';
      case 'expired': return 'สินค้าหมดอายุ';
      case 'return': return 'คืนสินค้า';
      case 'other': return 'อื่นๆ';
      default: return 'ส่งออกสินค้า';
    }
  };

  const selectedCount = Object.values(exportItems).filter(item => item.selected).length;
  const totalExportPieces = Object.values(exportItems)
    .filter(item => item.selected)
    .reduce((total, exportItem) => {
      const originalItem = inventory.find(item => item.id === exportItem.id);
      if (!originalItem) return total;
      return total + calculateTotalPieces(originalItem, exportItem.exportQuantities);
    }, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            ส่งออกสินค้าจาก Location {locationId}
          </DialogTitle>
          <DialogDescription>
            เลือกสินค้าที่ต้องการส่งออก ระบุเหตุผลและปลายทาง ระบบจะบันทึกประวัติการส่งออกโดยอัตโนมัติ
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Export Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                รายละเอียดการส่งออก
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="export-reason">เหตุผลการส่งออก</Label>
                  <Select value={exportReason} onValueChange={setExportReason}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale">ขายสินค้า</SelectItem>
                      <SelectItem value="damaged">สินค้าเสียหาย</SelectItem>
                      <SelectItem value="expired">สินค้าหมดอายุ</SelectItem>
                      <SelectItem value="return">คืนสินค้า</SelectItem>
                      <SelectItem value="other">อื่นๆ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="destination">ปลายทาง</Label>
                  <Input
                    id="destination"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="ระบุปลายทาง เช่น ลูกค้า, ทำลาย, คลังกลาง"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">หมายเหตุ (ไม่บังคับ)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ระบุรายละเอียดเพิ่มเติม..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Item Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  เลือกสินค้าที่ต้องการส่งออก
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    {Object.values(exportItems).every(item => item.selected) ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                  </Button>
                  <div className="text-gray-500">
                    เลือก {selectedCount} รายการ ({totalExportPieces.toLocaleString()} ชิ้น)
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {inventory.map((item) => {
                const exportItem = exportItems[item.id];
                if (!exportItem) return null;

                return (
                  <div key={item.id} className={`border rounded-lg p-4 ${exportItem.selected ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={exportItem.selected}
                        onCheckedChange={() => handleItemToggle(item.id)}
                        className="mt-1"
                      />

                      <div className="flex-1 space-y-3">
                        <div>
                          <div className="font-medium">{item.product_name}</div>
                          <div className="text-sm text-gray-500 font-mono">{item.sku}</div>
                          {item.lot && (
                            <div className="text-xs text-gray-400">LOT: {item.lot}</div>
                          )}
                          {item.mfd && (
                            <div className="text-xs text-gray-400">MFD: {item.mfd}</div>
                          )}
                        </div>

                        {exportItem.selected && (
                          <div className="grid grid-cols-3 gap-3 bg-white p-3 rounded border">
                            <div className="space-y-1">
                              <Label className="text-xs">
                                {item.unit_level1_name} (สูงสุด: {item.unit_level1_quantity})
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                max={item.unit_level1_quantity}
                                value={exportItem.exportQuantities.level1}
                                onChange={(e) => handleQuantityChange(item.id, 'level1', e.target.value)}
                                className="text-center text-xs h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">
                                {item.unit_level2_name} (สูงสุด: {item.unit_level2_quantity})
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                max={item.unit_level2_quantity}
                                value={exportItem.exportQuantities.level2}
                                onChange={(e) => handleQuantityChange(item.id, 'level2', e.target.value)}
                                className="text-center text-xs h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">
                                {item.unit_level3_name} (สูงสุด: {item.unit_level3_quantity})
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                max={item.unit_level3_quantity}
                                value={exportItem.exportQuantities.level3}
                                onChange={(e) => handleQuantityChange(item.id, 'level3', e.target.value)}
                                className="text-center text-xs h-8"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-gray-500">ส่งออก</div>
                        <div className="font-bold text-red-600">
                          {calculateTotalPieces(item, exportItem.exportQuantities).toLocaleString()} ชิ้น
                        </div>
                        <div className="text-xs text-gray-400">
                          เหลือ: {(calculateTotalPieces(item) - calculateTotalPieces(item, exportItem.exportQuantities)).toLocaleString()} ชิ้น
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {inventory.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>ไม่มีสินค้าใน Location นี้</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Warning */}
          {selectedCount > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-4 w-4" />
                  <div className="text-sm">
                    <strong>คำเตือน:</strong> การส่งออกสินค้าจะลดจำนวนสินค้าในคลัง การดำเนินการนี้ไม่สามารถยกเลิกได้ กรุณาตรวจสอบข้อมูลให้ถูกต้อง
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            <X className="h-4 w-4 mr-2" />
            ยกเลิก
          </Button>
          <Button
            onClick={handleExport}
            disabled={loading || selectedCount === 0 || !destination.trim()}
            className="bg-red-600 hover:bg-red-700"
          >
            <Send className="h-4 w-4 mr-2" />
            {loading ? 'กำลังส่งออก...' : `ส่งออกสินค้า (${selectedCount} รายการ)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}