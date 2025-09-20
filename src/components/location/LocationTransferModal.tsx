import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeftRight, Save, X, Package, MapPin, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateAllWarehouseLocations } from '@/utils/locationUtils';

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

interface TransferItem {
  id: string;
  selected: boolean;
  transferQuantities: {
    level1: number;
    level2: number;
    level3: number;
  };
}

interface LocationTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  fromLocationId: string;
  inventory: LocationInventory[];
  onSuccess: () => void;
}

export function LocationTransferModal({
  isOpen,
  onClose,
  fromLocationId,
  inventory,
  onSuccess
}: LocationTransferModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [toLocation, setToLocation] = useState('');
  const [transferMode, setTransferMode] = useState<'partial' | 'full'>('partial');
  const [transferItems, setTransferItems] = useState<Record<string, TransferItem>>({});
  const [allLocations, setAllLocations] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Initialize transfer items
      const items: Record<string, TransferItem> = {};
      inventory.forEach(item => {
        items[item.id] = {
          id: item.id,
          selected: false,
          transferQuantities: {
            level1: item.unit_level1_quantity,
            level2: item.unit_level2_quantity,
            level3: item.unit_level3_quantity
          }
        };
      });
      setTransferItems(items);

      // Generate all possible locations
      setAllLocations(generateAllWarehouseLocations());
      setToLocation('');
      setTransferMode('partial');
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
    setTransferItems(prev => ({
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

    setTransferItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        transferQuantities: {
          ...prev[itemId].transferQuantities,
          [level]: finalValue
        }
      }
    }));
  };

  const handleSelectAll = () => {
    const allSelected = Object.values(transferItems).every(item => item.selected);
    setTransferItems(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(id => {
        updated[id].selected = !allSelected;
      });
      return updated;
    });
  };

  const handleTransfer = async () => {
    const selectedItems = Object.values(transferItems).filter(item => item.selected);

    if (selectedItems.length === 0) {
      toast({
        title: '⚠️ ไม่ได้เลือกสินค้า',
        description: 'กรุณาเลือกสินค้าที่ต้องการย้าย',
        variant: 'destructive'
      });
      return;
    }

    if (!toLocation) {
      toast({
        title: '⚠️ ไม่ได้เลือกปลายทาง',
        description: 'กรุณาเลือกตำแหน่งปลายทาง',
        variant: 'destructive'
      });
      return;
    }

    if (toLocation === fromLocationId) {
      toast({
        title: '⚠️ ตำแหน่งเดียวกัน',
        description: 'ไม่สามารถย้ายไปตำแหน่งเดียวกันได้',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);

      // Process each selected item
      for (const transferItem of selectedItems) {
        const originalItem = inventory.find(item => item.id === transferItem.id);
        if (!originalItem) continue;

        const transferQty = transferItem.transferQuantities;
        const remainingQty = {
          level1: originalItem.unit_level1_quantity - transferQty.level1,
          level2: originalItem.unit_level2_quantity - transferQty.level2,
          level3: originalItem.unit_level3_quantity - transferQty.level3
        };

        // If transferring full quantity, delete the original item
        if (transferMode === 'full' ||
            (remainingQty.level1 === 0 && remainingQty.level2 === 0 && remainingQty.level3 === 0)) {

          // Update location of existing item
          const { error: updateError } = await supabase
            .from('inventory_items')
            .update({
              location: toLocation,
              updated_at: new Date().toISOString()
            })
            .eq('id', originalItem.id);

          if (updateError) throw updateError;

        } else {
          // Create new item at destination with transfer quantities
          const newItemData = {
            sku: originalItem.sku,
            product_name: originalItem.product_name,
            location: toLocation,
            lot: originalItem.lot,
            mfd: originalItem.mfd,
            unit_level1_quantity: transferQty.level1,
            unit_level2_quantity: transferQty.level2,
            unit_level3_quantity: transferQty.level3,
            unit_level1_name: originalItem.unit_level1_name,
            unit_level2_name: originalItem.unit_level2_name,
            unit_level3_name: originalItem.unit_level3_name,
            unit_level1_rate: originalItem.unit_level1_rate,
            unit_level2_rate: originalItem.unit_level2_rate,
            // Legacy fields for compatibility
            carton_quantity_legacy: transferQty.level1,
            box_quantity_legacy: transferQty.level2,
            pieces_quantity_legacy: transferQty.level3,
            unit: 'กล่อง'
          };

          const { error: insertError } = await supabase
            .from('inventory_items')
            .insert([newItemData]);

          if (insertError) throw insertError;

          // Update original item with remaining quantities
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

        // Log movement
        const { error: logError } = await supabase
          .from('inventory_movements')
          .insert([{
            item_id: originalItem.id,
            movement_type: 'transfer',
            from_location: fromLocationId,
            to_location: toLocation,
            quantity_moved: calculateTotalPieces(originalItem, transferQty),
            notes: `ย้ายสินค้า ${originalItem.product_name} จาก ${fromLocationId} ไป ${toLocation}`,
            moved_by: 'system' // You might want to get this from auth context
          }]);

        if (logError) console.error('Error logging movement:', logError);
      }

      toast({
        title: '✅ ย้ายสินค้าสำเร็จ',
        description: `ย้าย ${selectedItems.length} รายการจาก ${fromLocationId} ไป ${toLocation} แล้ว`,
      });

      onSuccess();
      onClose();

    } catch (error) {
      console.error('Error transferring items:', error);
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: 'ไม่สามารถย้ายสินค้าได้',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedCount = Object.values(transferItems).filter(item => item.selected).length;
  const totalSelectedPieces = Object.values(transferItems)
    .filter(item => item.selected)
    .reduce((total, transferItem) => {
      const originalItem = inventory.find(item => item.id === transferItem.id);
      if (!originalItem) return total;
      return total + calculateTotalPieces(originalItem, transferItem.transferQuantities);
    }, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            ย้ายสินค้าจาก Location {fromLocationId}
          </DialogTitle>
          <DialogDescription>
            เลือกสินค้าและปลายทางที่ต้องการย้าย ระบบจะบันทึกประวัติการย้ายโดยอัตโนมัติ
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Destination Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                เลือกปลายทาง
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="to-location">ตำแหน่งปลายทาง</Label>
                <Select value={toLocation} onValueChange={setToLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกตำแหน่งปลายทาง..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allLocations
                      .filter(location => location !== fromLocationId)
                      .map((location) => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="partial"
                    name="transfer-mode"
                    checked={transferMode === 'partial'}
                    onChange={() => setTransferMode('partial')}
                  />
                  <Label htmlFor="partial">ย้ายบางส่วน</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="full"
                    name="transfer-mode"
                    checked={transferMode === 'full'}
                    onChange={() => setTransferMode('full')}
                  />
                  <Label htmlFor="full">ย้ายทั้งหมด</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Item Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  เลือกสินค้าที่ต้องการย้าย
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    {Object.values(transferItems).every(item => item.selected) ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                  </Button>
                  <div className="text-gray-500">
                    เลือก {selectedCount} รายการ ({totalSelectedPieces.toLocaleString()} ชิ้น)
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {inventory.map((item) => {
                const transferItem = transferItems[item.id];
                if (!transferItem) return null;

                return (
                  <div key={item.id} className={`border rounded-lg p-4 ${transferItem.selected ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={transferItem.selected}
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
                        </div>

                        {transferItem.selected && transferMode === 'partial' && (
                          <div className="grid grid-cols-3 gap-3 bg-white p-3 rounded border">
                            <div className="space-y-1">
                              <Label className="text-xs">
                                {item.unit_level1_name} (สูงสุด: {item.unit_level1_quantity})
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                max={item.unit_level1_quantity}
                                value={transferItem.transferQuantities.level1}
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
                                value={transferItem.transferQuantities.level2}
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
                                value={transferItem.transferQuantities.level3}
                                onChange={(e) => handleQuantityChange(item.id, 'level3', e.target.value)}
                                className="text-center text-xs h-8"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-gray-500">
                          {transferMode === 'full' ? 'ย้ายทั้งหมด' : 'ย้าย'}
                        </div>
                        <div className="font-bold text-blue-600">
                          {transferMode === 'full'
                            ? calculateTotalPieces(item).toLocaleString()
                            : calculateTotalPieces(item, transferItem.transferQuantities).toLocaleString()
                          } ชิ้น
                        </div>
                        <div className="text-xs text-gray-400">
                          เหลือ: {transferMode === 'full'
                            ? '0'
                            : (calculateTotalPieces(item) - calculateTotalPieces(item, transferItem.transferQuantities)).toLocaleString()
                          } ชิ้น
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
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-orange-800">
                  <AlertTriangle className="h-4 w-4" />
                  <div className="text-sm">
                    <strong>คำเตือน:</strong> การย้ายสินค้าจะไม่สามารถยกเลิกได้ กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนดำเนินการ
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
            onClick={handleTransfer}
            disabled={loading || selectedCount === 0 || !toLocation}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            {loading ? 'กำลังย้าย...' : `ย้ายสินค้า (${selectedCount} รายการ)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}