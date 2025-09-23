import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  Package,
  RefreshCw,
  CheckCircle,
  Info
} from 'lucide-react';

interface InventorySyncConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sku: string;
  productName: string;
  affectedItemsCount: number;
  onConfirm: () => Promise<void>;
  isProcessing: boolean;
}

export function InventorySyncConfirmDialog({
  open,
  onOpenChange,
  sku,
  productName,
  affectedItemsCount,
  onConfirm,
  isProcessing
}: InventorySyncConfirmDialogProps) {
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = async () => {
    setConfirmed(true);
    try {
      await onConfirm();
    } finally {
      setConfirmed(false);
    }
  };

  const handleCancel = () => {
    if (isProcessing) return; // Prevent closing during processing
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            ยืนยันการซิงค์ข้อมูล
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              การเปลี่ยนแปลงการตั้งค่าแปลงหน่วยจะส่งผลต่อรายการสินค้าที่มีอยู่ในคลัง
            </AlertDescription>
          </Alert>

          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">SKU:</span>
              <span className="font-mono font-bold text-gray-900">{sku}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">ชื่อสินค้า:</span>
              <span className="text-sm text-gray-900 text-right max-w-xs truncate">{productName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">รายการที่จะได้รับผลกระทบ:</span>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                {affectedItemsCount} รายการ
              </Badge>
            </div>
          </div>

          {affectedItemsCount > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>คำเตือน:</strong> การดำเนินการนี้จะอัปเดตข้อมูลการแปลงหน่วยในรายการสินค้าทั้งหมด {affectedItemsCount} รายการ
                ที่มี SKU "{sku}" ในระบบคลัง
              </AlertDescription>
            </Alert>
          )}

          {affectedItemsCount === 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                ไม่พบรายการสินค้าในคลังที่มี SKU นี้ การบันทึกจะเป็นการสร้างการตั้งค่าสำหรับสินค้าใหม่ในอนาคต
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isProcessing}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={confirmed || isProcessing}
              className={affectedItemsCount > 0 ? 'bg-orange-600 hover:bg-orange-700' : ''}
            >
              {(confirmed || isProcessing) ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  กำลังดำเนินการ...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  {affectedItemsCount > 0 ? `ยืนยันการอัปเดต ${affectedItemsCount} รายการ` : 'ยืนยันการบันทึก'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}