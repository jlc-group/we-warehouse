import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  Package,
  MapPin,
  ArrowRight,
  CheckCircle,
  InfoIcon,
  Truck
} from 'lucide-react';
import type { InventoryItem } from '@/hooks/useInventory';

interface LocationConflictDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  targetLocation: string;
  itemsToMove: InventoryItem[];
  existingItemsAtTarget: InventoryItem[];
  isLoading?: boolean;
}

export function LocationConflictDialog({
  isOpen,
  onClose,
  onConfirm,
  targetLocation,
  itemsToMove,
  existingItemsAtTarget,
  isLoading = false
}: LocationConflictDialogProps) {

  const getTotalQuantity = (item: InventoryItem) => {
    const level1 = Number(item.unit_level1_quantity) || 0;
    const level2 = Number(item.unit_level2_quantity) || 0;
    const level3 = Number(item.unit_level3_quantity) || 0;
    return level1 + level2 + level3;
  };

  const ItemCard = ({ item, isMoving = false }: { item: InventoryItem; isMoving?: boolean }) => (
    <Card className={`${isMoving ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Package className={`h-4 w-4 ${isMoving ? 'text-blue-600' : 'text-gray-600'}`} />
              <span className="font-medium text-sm">{item.sku}</span>
              {isMoving && <Badge variant="outline" className="text-xs">กำลังย้าย</Badge>}
            </div>
            <p className="text-sm text-gray-600 mb-1">{item.product_name}</p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>จำนวน: {getTotalQuantity(item)} หน่วย</span>
              {item.lot && <span>Lot: {item.lot}</span>}
              {item.mfd && <span>MFD: {item.mfd}</span>}
            </div>
          </div>
          {!isMoving && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <MapPin className="h-3 w-3" />
              <span>{item.location}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            ยืนยันการย้ายสินค้า
          </DialogTitle>
          <DialogDescription>
            ตำแหน่ง <span className="font-mono font-bold text-blue-600">{targetLocation}</span> มีสินค้าอยู่แล้ว
            กรุณาตรวจสอบข้อมูลก่อนยืนยันการย้าย
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* การเตือน */}
          <Alert className="border-amber-200 bg-amber-50">
            <InfoIcon className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>หมายเหตุ:</strong> การย้ายสินค้าจะทำให้มีสินค้าหลายรายการในตำแหน่งเดียวกัน
              สินค้าแต่ละรายการจะถูกบันทึกแยกกันในระบบ
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* สินค้าที่จะย้าย */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">
                  สินค้าที่จะย้ายเข้ามา ({itemsToMove.length} รายการ)
                </h3>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {itemsToMove.map((item) => (
                  <ItemCard key={item.id} item={item} isMoving={true} />
                ))}
              </div>
            </div>

            {/* สินค้าที่อยู่แล้ว */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">
                  สินค้าที่อยู่แล้ว ({existingItemsAtTarget.length} รายการ)
                </h3>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {existingItemsAtTarget.map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          </div>

          {/* สรุป */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                สรุปผลลัพธ์หลังการย้าย
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-green-600" />
                  <span className="font-mono font-bold text-lg text-green-900">{targetLocation}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <div className="text-right">
                  <div className="text-sm text-green-700">จำนวนสินค้าทั้งหมด</div>
                  <div className="font-bold text-lg text-green-900">
                    {itemsToMove.length + existingItemsAtTarget.length} รายการ
                  </div>
                </div>
              </div>
              <Separator className="my-3 bg-green-200" />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-blue-700 font-medium">สินค้าใหม่</div>
                  <div className="text-xl font-bold text-blue-900">{itemsToMove.length}</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-700 font-medium">สินค้าเดิม</div>
                  <div className="text-xl font-bold text-gray-900">{existingItemsAtTarget.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            ยกเลิก
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                กำลังย้าย...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                ยืนยันการย้าย
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}