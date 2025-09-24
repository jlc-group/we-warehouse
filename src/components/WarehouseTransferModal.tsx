import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Truck, ArrowRight, Package, Building2, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { CompactWarehouseSelector } from '@/components/WarehouseSelector';
import { useWarehouses } from '@/hooks/useWarehouse';
import type { InventoryItem } from '@/hooks/useInventory';
import { formatUnitsDisplay } from '@/utils/unitCalculations';
import { toast } from 'sonner';

interface WarehouseTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransfer: (targetWarehouseId: string, notes?: string) => Promise<boolean>;
  selectedItems: InventoryItem[];
}

export function WarehouseTransferModal({
  isOpen,
  onClose,
  onTransfer,
  selectedItems
}: WarehouseTransferModalProps) {
  const [targetWarehouseId, setTargetWarehouseId] = useState<string | undefined>();
  const [notes, setNotes] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const { data: warehouses } = useWarehouses();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setTargetWarehouseId(undefined);
      setNotes('');
      setIsTransferring(false);
    }
  }, [isOpen]);

  // Get unique source warehouses
  const sourceWarehouses = Array.from(
    new Set(selectedItems.map(item => item.warehouse_id).filter(Boolean))
  );

  const sourceWarehouseNames = sourceWarehouses
    .map(warehouseId => warehouses?.find(w => w.id === warehouseId)?.name || 'ไม่ระบุ')
    .join(', ');

  const targetWarehouse = warehouses?.find(w => w.id === targetWarehouseId);

  // Check if target warehouse is same as source
  const isSameWarehouse = sourceWarehouses.includes(targetWarehouseId || '');

  const handleTransfer = async () => {
    if (!targetWarehouseId) {
      toast.error('กรุณาเลือก Warehouse ปลายทาง');
      return;
    }

    if (isSameWarehouse) {
      toast.error('Warehouse ปลายทางต้องแตกต่างจาก Warehouse ต้นทาง');
      return;
    }

    if (selectedItems.length === 0) {
      toast.error('ไม่มีสินค้าที่จะย้าย');
      return;
    }

    try {
      setIsTransferring(true);

      const success = await onTransfer(
        targetWarehouseId,
        notes.trim() || `ย้ายสินค้า ${selectedItems.length} รายการ จาก ${sourceWarehouseNames} ไป ${targetWarehouse?.name}`
      );

      if (success) {
        toast.success(`ย้ายสินค้า ${selectedItems.length} รายการสำเร็จ`);
        onClose();
      }
    } catch (error) {
      console.error('Transfer error:', error);
      toast.error('เกิดข้อผิดพลาดในการย้ายสินค้า');
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-600" />
            ย้ายสินค้าระหว่าง Warehouse
          </DialogTitle>
          <DialogDescription>
            ย้ายสินค้า {selectedItems.length} รายการไปยัง Warehouse อื่น
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Transfer Summary */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">สรุปการย้าย</Label>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <span className="text-sm">{sourceWarehouseNames}</span>
              </div>

              <ArrowRight className="h-4 w-4 text-muted-foreground" />

              <div className="flex items-center gap-2">
                {targetWarehouse ? (
                  <>
                    <Building2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">{targetWarehouse.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {targetWarehouse.code}
                    </Badge>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">เลือก Warehouse ปลายทาง</span>
                )}
              </div>
            </div>

            {isSameWarehouse && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  Warehouse ปลายทางต้องแตกต่างจาก Warehouse ต้นทาง
                </span>
              </div>
            )}
          </div>

          {/* Target Warehouse Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Warehouse ปลายทาง *
            </Label>
            <CompactWarehouseSelector
              selectedWarehouseId={targetWarehouseId}
              onWarehouseChange={setTargetWarehouseId}
              showAllOption={false}
            />
          </div>

          {/* Items to Transfer */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              สินค้าที่จะย้าย ({selectedItems.length} รายการ)
            </Label>

            <div className="max-h-32 overflow-y-auto space-y-2 p-3 bg-muted/30 rounded-lg border">
              {selectedItems.map((item, index) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{item.product_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.sku} • {item.location}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {formatUnitsDisplay(
                      item.unit_level1_quantity || 0,
                      item.unit_level2_quantity || 0,
                      item.unit_level3_quantity || 0,
                      item.unit_level1_name || 'ลัง',
                      item.unit_level2_name || 'กล่อง',
                      item.unit_level3_name || 'ชิ้น'
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">หมายเหตุ (ไม่บังคับ)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เพิ่มหมายเหตุสำหรับการย้ายครั้งนี้..."
              className="min-h-[80px]"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isTransferring}
            className="flex-1"
          >
            ยกเลิก
          </Button>

          <Button
            onClick={handleTransfer}
            disabled={!targetWarehouseId || isSameWarehouse || isTransferring || selectedItems.length === 0}
            className="flex-1"
          >
            {isTransferring ? (
              <>
                <Truck className="h-4 w-4 mr-2 animate-pulse" />
                กำลังย้าย...
              </>
            ) : (
              <>
                <Truck className="h-4 w-4 mr-2" />
                ย้ายสินค้า
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default WarehouseTransferModal;