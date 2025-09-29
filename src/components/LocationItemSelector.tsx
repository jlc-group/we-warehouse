import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {
  Hash,
  Archive,
  Calendar,
  Edit3,
  Trash2,
  Plus,
  AlertTriangle,
  Package,
  Send,
  ArrowLeftRight,
  MapPin,
  Info,
  Edit
} from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { InventoryItem } from '@/hooks/useInventory';
import { displayLocation } from '@/utils/locationUtils';

interface LocationItemSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  location: string;
  items: InventoryItem[];
  onSelectEdit: (item: InventoryItem) => void;
  onDeleteItem: (id: string) => void;
  onClearLocation: (location: string) => void;
  onAddNewItem: () => void;
  onExport?: () => void;
  onTransfer?: () => void;
  canDelete?: boolean;
}

export function LocationItemSelector({
  isOpen,
  onClose,
  location,
  items,
  onSelectEdit,
  onDeleteItem,
  onClearLocation,
  onAddNewItem,
  onExport,
  onTransfer,
  canDelete = true
}: LocationItemSelectorProps) {
  // console.log('🔍 LocationItemSelector rendered with:', { isOpen, location, itemsCount: items.length });
  
  const { toast } = useToast();
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  // Helpers for quantity fields across schemas
  const getCartonQty = (item: any) => Number(item.unit_level1_quantity ?? item.carton_quantity_legacy ?? 0) || 0;
  const getBoxQty = (item: any) => Number(item.unit_level2_quantity ?? item.box_quantity_legacy ?? 0) || 0;
  const getPiecesQty = (item: any) => Number(item.unit_level3_quantity ?? item.pieces_quantity_legacy ?? 0) || 0;

  // Calculate total pieces with conversion rates
  const calculateTotalPieces = (item: any) => {
    const cartonQty = getCartonQty(item);
    const boxQty = getBoxQty(item);
    const piecesQty = getPiecesQty(item);
    
    // Get conversion rates (default to 1 if not available)
    const cartonRate = Number(item.unit_level1_conversion_rate ?? 1) || 1;
    const boxRate = Number(item.unit_level2_conversion_rate ?? 1) || 1;
    
    // Convert everything to base pieces
    const totalFromCartons = cartonQty * cartonRate;
    const totalFromBoxes = boxQty * boxRate;
    const totalPieces = totalFromCartons + totalFromBoxes + piecesQty;
    
    return {
      totalPieces,
      hasConversion: cartonRate !== 1 || boxRate !== 1,
      breakdown: {
        fromCartons: totalFromCartons,
        fromBoxes: totalFromBoxes,
        fromPieces: piecesQty
      }
    };
  };

  const handleDeleteConfirm = async (itemId: string) => {
    setDeletingItemId(itemId);

    try {
      console.log('🗑️ LocationItemSelector: Starting delete for item:', itemId);

      await onDeleteItem(itemId);

      console.log('✅ LocationItemSelector: Delete successful');

      setDeletingItemId(null);
      toast({
        title: '✅ ลบสำเร็จ',
        description: 'ลบรายการสินค้าออกจากระบบแล้ว',
      });

      // ถ้าไม่มีรายการเหลือ ปิด modal
      if (items.length <= 1) {
        onClose();
      }
    } catch (error) {
      console.error('❌ LocationItemSelector: Delete failed:', error);

      setDeletingItemId(null);

      const errorMessage = error instanceof Error ? error.message : 'ไม่สามารถลบรายการได้';

      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleClearLocationConfirm = async () => {
    try {
      await onClearLocation(location);
      toast({
        title: '🗑️ ลบทั้งหมดสำเร็จ',
        description: `ลบสินค้าทั้งหมดใน ${displayLocation(location)} ออกจากระบบแล้ว`,
      });
      onClose();
    } catch (error) {
      console.error('Error clearing location:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถลบสินค้าได้',
        variant: 'destructive',
      });
    }
  };

  // Calculate total quantity with conversion rates
  const totalQuantity = items.reduce((sum, item) => {
    const calculation = calculateTotalPieces(item);
    return sum + calculation.totalPieces;
  }, 0);

  const totalWithoutConversion = items.reduce((sum, item) => {
    return sum + getCartonQty(item) + getBoxQty(item) + getPiecesQty(item);
  }, 0);

  const hasAnyConversion = items.some(item => calculateTotalPieces(item).hasConversion);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            จัดการสินค้าในตำแหน่ง {displayLocation(location)}
          </DialogTitle>
          <DialogDescription>
            พบ {items.length} รายการสินค้าในตำแหน่งนี้ สามารถดู แก้ไข ลบ หรือเพิ่มรายการใหม่ได้
          </DialogDescription>
        </DialogHeader>

        {/* Summary Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                สรุปข้อมูล
              </span>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="outline">
                  {totalQuantity.toLocaleString()} ชิ้นรวม
                </Badge>
                {hasAnyConversion && totalQuantity !== totalWithoutConversion && (
                  <Badge variant="secondary" className="text-xs">
                    (คำนวณจากอัตราแปลง)
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-bold text-lg text-blue-600">{items.length}</div>
                <div className="text-muted-foreground">รายการ</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg text-green-600">
                  {new Set(items.map(item => item.sku)).size}
                </div>
                <div className="text-muted-foreground">SKU ต่างกัน</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg text-purple-600">
                  {new Set(items.map(item => (item as any).lot || 'N/A')).size}
                </div>
                <div className="text-muted-foreground">LOT ต่างกัน</div>
              </div>
            </div>
            
            {/* Calculation Details */}
            {hasAnyConversion && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm text-blue-800">
                  <div className="font-semibold mb-2">📊 รายละเอียดการคำนวณ:</div>
                  <div className="space-y-1 text-xs">
                    <div>• จำนวนรวมแบบง่าย: {totalWithoutConversion.toLocaleString()} หน่วย</div>
                    <div>• จำนวนรวมจากอัตราแปลง: {totalQuantity.toLocaleString()} ชิ้น</div>
                    <div className="text-blue-600 font-medium">
                      💡 ระบบคำนวณด้วยอัตราแปลงที่ตั้งค่าไว้ (เช่น 1 ลัง = X ชิ้น)
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">รายการสินค้าในตำแหน่งนี้</h3>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Add Item Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={onAddNewItem}
                className="flex items-center gap-2 text-green-600 border-green-200 hover:bg-green-50"
              >
                <Plus className="h-4 w-4" />
                เพิ่มสินค้า
              </Button>

              {/* Export Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
              >
                <Send className="h-4 w-4" />
                ส่งออก
              </Button>

              {/* Transfer Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={onTransfer}
                className="flex items-center gap-2 text-orange-600 border-orange-200 hover:bg-orange-50"
              >
                <ArrowLeftRight className="h-4 w-4" />
                ย้าย
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[400px] w-full border rounded-lg">
            <div className="p-4 space-y-3">
              {items.map((item, index) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        {/* Product Info */}
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 truncate">
                              {(item as any).product_name || item.sku}
                            </h4>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                              <div className="flex items-center gap-1">
                                <Hash className="h-3 w-3" />
                                <span className="font-mono">{item.sku}</span>
                              </div>
                              {(item as any).lot && (
                                <div className="flex items-center gap-1">
                                  <Archive className="h-3 w-3" />
                                  <span>LOT: {(item as any).lot}</span>
                                </div>
                              )}
                              {(item as any).mfd && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>MFD: {new Date((item as any).mfd).toLocaleDateString('th-TH')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quantity Info */}
                        <div className="bg-gray-50 rounded p-3 ml-11 space-y-2">
                          {/* Individual Quantities */}
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div className="text-center">
                              <div className="font-bold text-blue-600">{getCartonQty(item)}</div>
                              <div className="text-xs text-gray-500">ลัง</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-green-600">{getBoxQty(item)}</div>
                              <div className="text-xs text-gray-500">กล่อง</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-purple-600">{getPiecesQty(item)}</div>
                              <div className="text-xs text-gray-500">ชิ้น</div>
                            </div>
                          </div>
                          
                          {/* Total Summary */}
                          <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 py-2 px-3 rounded-md">
                            <Package className="h-3 w-3 text-orange-600" />
                            <div className="text-center">
                              <div className="text-xs font-bold text-orange-800">
                                รวมทั้งหมด: {calculateTotalPieces(item).totalPieces.toLocaleString()} ชิ้น
                              </div>
                              {calculateTotalPieces(item).hasConversion && (
                                <div className="text-xs text-orange-600 mt-0.5">
                                  (คำนวณจากอัตราแปลง)
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSelectEdit(item)}
                          className="flex items-center gap-2"
                        >
                          <Edit className="h-3 w-3" />
                          แก้ไข
                        </Button>

                        {canDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                                ลบ
                              </Button>
                            </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>ยืนยันการลบรายการ</AlertDialogTitle>
                              <AlertDialogDescription>
                                คุณต้องการลบ "{(item as any).product_name || item.sku}" ออกจาก {displayLocation(location)} หรือไม่?
                                ข้อมูลจะถูกลบออกจากระบบอย่างถาวร
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteConfirm(item.id)}
                                className="bg-red-600 hover:bg-red-700"
                                disabled={deletingItemId === item.id}
                              >
                                {deletingItemId === item.id ? 'กำลังลบ...' : 'ลบ'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-600">
            💡 เลือกรายการเพื่อแก้ไข เพิ่มรายการใหม่ หรือลบรายการที่ไม่ต้องการ
          </div>
          <Button variant="outline" onClick={onClose}>
            ปิด
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}