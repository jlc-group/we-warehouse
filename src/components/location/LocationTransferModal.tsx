import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeftRight, Save, X, Package, MapPin, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateAllWarehouseLocations } from '@/utils/locationUtils';
import { LocationCombobox } from './LocationCombobox';

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
  toLocation: string; // ⭐ แต่ละรายการมีปลายทางของตัวเอง
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
          toLocation: '', // ⭐ แต่ละรายการมีปลายทางของตัวเอง
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

    // ⭐ ตรวจสอบว่าทุกรายการที่เลือกมีปลายทาง
    const itemsWithoutDestination = selectedItems.filter(item => !item.toLocation);
    if (itemsWithoutDestination.length > 0) {
      toast({
        title: '⚠️ ไม่ได้เลือกปลายทาง',
        description: `มี ${itemsWithoutDestination.length} รายการที่ยังไม่ได้เลือกตำแหน่งปลายทาง`,
        variant: 'destructive'
      });
      return;
    }

    // ⭐ ตรวจสอบว่าไม่มีรายการที่ย้ายไปตำแหน่งเดียวกัน
    const sameLocationItems = selectedItems.filter(item => item.toLocation === fromLocationId);
    if (sameLocationItems.length > 0) {
      toast({
        title: '⚠️ ตำแหน่งเดียวกัน',
        description: 'มีรายการที่เลือกปลายทางเป็นตำแหน่งเดียวกับต้นทาง',
        variant: 'destructive'
      });
      return;
    }

    // Validate that selected items have transfer quantities
    const hasValidQuantities = selectedItems.some(transferItem => {
      const qty = transferItem.transferQuantities;
      return qty.level1 > 0 || qty.level2 > 0 || qty.level3 > 0;
    });

    if (!hasValidQuantities) {
      toast({
        title: '⚠️ ไม่ได้ระบุจำนวน',
        description: 'กรุณาระบุจำนวนที่ต้องการย้ายในรายการที่เลือก',
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

        // If transferring full quantity, move the original item
        if (remainingQty.level1 === 0 && remainingQty.level2 === 0 && remainingQty.level3 === 0) {

          // ⭐ Update location of existing item (ใช้ปลายทางของรายการนั้น)
          const { error: updateError } = await supabase
            .from('inventory_items')
            .update({
              location: transferItem.toLocation,
              updated_at: new Date().toISOString()
            })
            .eq('id', originalItem.id);

          if (updateError) throw updateError;

        } else {
          // ⭐ Create new item at destination with transfer quantities
          const newItemData = {
            sku: originalItem.sku,
            product_name: originalItem.product_name,
            location: transferItem.toLocation,
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

        // Movement logging disabled - table not available in current schema
        console.log('Transfer completed:', {
          item: originalItem.id,
          from: fromLocationId,
          to: transferItem.toLocation, // ⭐ ใช้ปลายทางของรายการนั้น
          quantity: calculateTotalPieces(originalItem, transferQty)
        });
      }

      // ⭐ แสดงสรุปปลายทางทั้งหมด
      const destinations = [...new Set(selectedItems.map(i => i.toLocation))];
      const destinationText = destinations.length === 1
        ? destinations[0]
        : `${destinations.length} ตำแหน่ง (${destinations.slice(0, 2).join(', ')}${destinations.length > 2 ? '...' : ''})`;

      toast({
        title: '✅ ย้ายสินค้าสำเร็จ',
        description: `ย้าย ${selectedItems.length} รายการจาก ${fromLocationId} ไป ${destinationText}`,
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
      <DialogContent className="max-w-full h-full sm:max-w-4xl sm:max-h-[80vh] overflow-y-auto">
        <DialogHeader className="p-4 sm:p-6">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <ArrowLeftRight className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">ย้ายสินค้าจาก Location {fromLocationId}</span>
            <span className="sm:hidden">ย้ายสินค้า ({fromLocationId})</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            <span className="hidden sm:inline">เลือกสินค้าและปลายทางที่ต้องการย้าย ระบบจะบันทึกประวัติการย้ายโดยอัตโนมัติ</span>
            <span className="sm:hidden">เลือกสินค้าและปลายทาง</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 py-3 sm:py-4">
          {/* ⭐ ลบส่วน Destination Selection ออก - ให้เลือกปลายทางแต่ละรายการแทน */}

          {/* Item Selection */}
          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-sm sm:text-base flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                <div className="flex items-center gap-2">
                  <Package className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">เลือกสินค้าที่ต้องการย้าย</span>
                  <span className="sm:hidden">เลือกสินค้า</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm w-full sm:w-auto">
                  <Button variant="outline" size="sm" onClick={handleSelectAll} className="h-9 sm:h-8 text-xs sm:text-sm flex-1 sm:flex-none">
                    {Object.values(transferItems).every(item => item.selected) ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                  </Button>
                  <div className="text-gray-500 text-xs sm:text-sm">
                    <span className="hidden sm:inline">เลือก {selectedCount} รายการ ({totalSelectedPieces.toLocaleString()} ชิ้น)</span>
                    <span className="sm:hidden">{selectedCount} รายการ</span>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              {inventory.map((item) => {
                const transferItem = transferItems[item.id];
                if (!transferItem) return null;

                return (
                  <div key={item.id} className={`border rounded-lg p-3 sm:p-4 ${transferItem.selected ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                    <div className="flex items-start gap-2 sm:gap-4">
                      <Checkbox
                        checked={transferItem.selected}
                        onCheckedChange={() => handleItemToggle(item.id)}
                        className="mt-1 h-5 w-5 sm:h-4 sm:w-4"
                      />

                      <div className="flex-1 space-y-2 sm:space-y-3 min-w-0">
                        <div>
                          <div className="font-medium text-sm sm:text-base truncate">{item.product_name}</div>
                          <div className="text-xs sm:text-sm text-gray-500 font-mono truncate">{item.sku}</div>
                          {item.lot && (
                            <div className="text-[10px] sm:text-xs text-gray-400">LOT: {item.lot}</div>
                          )}
                        </div>

                        {transferItem.selected && (
                          <div className="bg-gray-50 p-4 rounded-lg border-2 border-blue-200">
                            {/* ⭐ เลือกปลายทางของรายการนี้ */}
                            <div className="mb-4 p-3 bg-white rounded-lg border-2 border-orange-300">
                              <Label className="text-sm font-medium text-orange-800 mb-2 flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                ปลายทางของรายการนี้
                                {transferItem.toLocation && (
                                  <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">✅ เลือกแล้ว</span>
                                )}
                              </Label>
                              <LocationCombobox
                                value={transferItem.toLocation}
                                onChange={(value) => {
                                  setTransferItems(prev => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id],
                                      toLocation: value
                                    }
                                  }));
                                }}
                                allLocations={allLocations}
                                excludeLocation={fromLocationId}
                                placeholder="เลือกตำแหน่งปลายทาง..."
                              />
                            </div>

                            <div className="text-sm font-medium text-blue-800 mb-3 flex items-center gap-2">
                              <ArrowLeftRight className="h-4 w-4" />
                              ระบุจำนวนที่ต้องการย้าย
                              {(transferItem.transferQuantities.level1 > 0 || transferItem.transferQuantities.level2 > 0 || transferItem.transferQuantities.level3 > 0) && (
                                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">✅ มีการกำหนดจำนวน</span>
                              )}
                            </div>

                            {/* สต็อกปัจจุบัน */}
                            <div className="mb-4 p-3 bg-white rounded-lg border">
                              <div className="text-xs text-gray-600 mb-2">📦 สต็อกปัจจุบันใน {fromLocationId}:</div>
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div className="bg-blue-50 p-2 rounded text-center">
                                  <div className="font-medium text-blue-800">{item.unit_level1_quantity}</div>
                                  <div className="text-blue-600">{item.unit_level1_name}</div>
                                </div>
                                <div className="bg-green-50 p-2 rounded text-center">
                                  <div className="font-medium text-green-800">{item.unit_level2_quantity}</div>
                                  <div className="text-green-600">{item.unit_level2_name}</div>
                                </div>
                                <div className="bg-purple-50 p-2 rounded text-center">
                                  <div className="font-medium text-purple-800">{item.unit_level3_quantity}</div>
                                  <div className="text-purple-600">{item.unit_level3_name}</div>
                                </div>
                              </div>
                            </div>

                            {/* ป้อนจำนวนที่ย้าย */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="space-y-2">
                                <Label className="text-[10px] sm:text-xs font-medium text-blue-700">
                                  🔵 ย้าย {item.unit_level1_name}
                                </Label>
                                <div className="relative">
                                  <Input
                                    type="number"
                                    min="0"
                                    max={item.unit_level1_quantity}
                                    value={transferItem.transferQuantities.level1}
                                    onChange={(e) => handleQuantityChange(item.id, 'level1', e.target.value)}
                                    className="text-center font-medium border-blue-300 focus:border-blue-500 h-11 sm:h-10 text-xs sm:text-sm"
                                    placeholder="0"
                                  />
                                  <div className="text-[10px] sm:text-xs text-gray-500 mt-1 text-center">
                                    สูงสุด: {item.unit_level1_quantity}
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[10px] sm:text-xs font-medium text-green-700">
                                  🟢 ย้าย {item.unit_level2_name}
                                </Label>
                                <div className="relative">
                                  <Input
                                    type="number"
                                    min="0"
                                    max={item.unit_level2_quantity}
                                    value={transferItem.transferQuantities.level2}
                                    onChange={(e) => handleQuantityChange(item.id, 'level2', e.target.value)}
                                    className="text-center font-medium border-green-300 focus:border-green-500 h-11 sm:h-10 text-xs sm:text-sm"
                                    placeholder="0"
                                  />
                                  <div className="text-[10px] sm:text-xs text-gray-500 mt-1 text-center">
                                    สูงสุด: {item.unit_level2_quantity}
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[10px] sm:text-xs font-medium text-purple-700">
                                  🟣 ย้าย {item.unit_level3_name}
                                </Label>
                                <div className="relative">
                                  <Input
                                    type="number"
                                    min="0"
                                    max={item.unit_level3_quantity}
                                    value={transferItem.transferQuantities.level3}
                                    onChange={(e) => handleQuantityChange(item.id, 'level3', e.target.value)}
                                    className="text-center font-medium border-purple-300 focus:border-purple-500 h-11 sm:h-10 text-xs sm:text-sm"
                                    placeholder="0"
                                  />
                                  <div className="text-[10px] sm:text-xs text-gray-500 mt-1 text-center">
                                    สูงสุด: {item.unit_level3_quantity}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Quick action buttons */}
                            <div className="mt-3 flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setTransferItems(prev => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id],
                                      transferQuantities: {
                                        level1: Math.floor(item.unit_level1_quantity * 0.5),
                                        level2: Math.floor(item.unit_level2_quantity * 0.5),
                                        level3: Math.floor(item.unit_level3_quantity * 0.5)
                                      }
                                    }
                                  }));
                                }}
                                className="text-xs flex-1"
                              >
                                50%
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setTransferItems(prev => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id],
                                      transferQuantities: {
                                        level1: item.unit_level1_quantity,
                                        level2: item.unit_level2_quantity,
                                        level3: item.unit_level3_quantity
                                      }
                                    }
                                  }));
                                }}
                                className="text-xs flex-1"
                              >
                                ทั้งหมด
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setTransferItems(prev => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id],
                                      transferQuantities: {
                                        level1: 0,
                                        level2: 0,
                                        level3: 0
                                      }
                                    }
                                  }));
                                }}
                                className="text-xs flex-1"
                              >
                                ล้าง
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="text-right min-w-[120px]">
                        <div className="bg-white border rounded-lg p-3 space-y-2">
                          <div className="text-xs text-gray-600 font-medium">📊 สรุป</div>

                          {/* สต็อกปัจจุบัน */}
                          <div className="text-sm">
                            <div className="text-gray-500">มีทั้งหมด</div>
                            <div className="font-bold text-gray-800">
                              {calculateTotalPieces(item).toLocaleString()} ชิ้น
                            </div>
                          </div>

                          {/* จำนวนที่ย้าย */}
                          <div className="text-sm border-t pt-2">
                            <div className="text-orange-600">จะย้าย</div>
                            <div className="font-bold text-orange-800">
                              {calculateTotalPieces(item, transferItem.transferQuantities).toLocaleString()} ชิ้น
                            </div>
                          </div>

                          {/* จำนวนคงเหลือ */}
                          <div className="text-sm border-t pt-2">
                            <div className="text-green-600">คงเหลือ</div>
                            <div className="font-bold text-green-800">
                              {(calculateTotalPieces(item) - calculateTotalPieces(item, transferItem.transferQuantities)).toLocaleString()} ชิ้น
                            </div>
                          </div>

                          {/* แสดงข้อมูลการย้ายแต่ละระดับ */}
                          {transferItem.selected && (
                            <div className="text-xs border-t pt-2 space-y-1">
                              <div className="text-gray-600">รายละเอียด:</div>
                              {transferItem.transferQuantities.level1 > 0 && (
                                <div className="text-blue-700">
                                  {item.unit_level1_name}: {transferItem.transferQuantities.level1}
                                </div>
                              )}
                              {transferItem.transferQuantities.level2 > 0 && (
                                <div className="text-green-700">
                                  {item.unit_level2_name}: {transferItem.transferQuantities.level2}
                                </div>
                              )}
                              {transferItem.transferQuantities.level3 > 0 && (
                                <div className="text-purple-700">
                                  {item.unit_level3_name}: {transferItem.transferQuantities.level3}
                                </div>
                              )}
                            </div>
                          )}
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
                  <p className="text-sm mt-2">กรุณาเพิ่มสินค้าก่อนจึงจะสามารถย้ายได้</p>
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

        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 sm:pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading} className="h-11 sm:h-10 text-xs sm:text-sm w-full sm:w-auto">
            <X className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            ยกเลิก
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={loading || selectedCount === 0}
            className="bg-orange-600 hover:bg-orange-700 h-11 sm:h-10 text-xs sm:text-sm w-full sm:w-auto"
          >
            <ArrowLeftRight className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            {loading ? 'กำลังย้าย...' : `ย้ายสินค้า (${selectedCount} รายการ)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}