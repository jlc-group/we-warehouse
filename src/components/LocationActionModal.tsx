import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Edit3, 
  Plus, 
  ArrowLeftRight, 
  Send,
  Settings
} from 'lucide-react';
import { displayLocation } from '@/utils/locationUtils';

interface LocationActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: string;
  onEdit: () => void;
  onAddItem: () => void;
  onTransfer: () => void;
  onExport: () => void;
}

export function LocationActionModal({
  isOpen,
  onClose,
  location,
  onEdit,
  onAddItem,
  onTransfer,
  onExport
}: LocationActionModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center justify-center">
            <Settings className="h-5 w-5" />
            จัดการ Location
          </DialogTitle>
          <p className="text-center text-sm text-muted-foreground">
            เลือกการดำเนินการ
          </p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-6">
          {/* Edit Button */}
          <Button
            onClick={onEdit}
            className="h-20 flex flex-col items-center justify-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-200"
            variant="outline"
          >
            <Edit3 className="h-6 w-6" />
            <span className="font-medium">แก้ไข</span>
            <span className="text-xs text-blue-600">Edit</span>
          </Button>

          {/* Add Item Button */}
          <Button
            onClick={onAddItem}
            className="h-20 flex flex-col items-center justify-center gap-2 bg-green-100 hover:bg-green-200 text-green-700 border border-green-200"
            variant="outline"
          >
            <Plus className="h-6 w-6" />
            <span className="font-medium">เพิ่มสินค้า</span>
            <span className="text-xs text-green-600">Add Item</span>
          </Button>

          {/* Transfer Button */}
          <Button
            onClick={onTransfer}
            className="h-20 flex flex-col items-center justify-center gap-2 bg-orange-100 hover:bg-orange-200 text-orange-700 border border-orange-200"
            variant="outline"
          >
            <ArrowLeftRight className="h-6 w-6" />
            <span className="font-medium">ย้ายคลัง</span>
            <span className="text-xs text-orange-600">Transfer</span>
          </Button>

          {/* Export Button */}
          <Button
            onClick={onExport}
            className="h-20 flex flex-col items-center justify-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 border border-red-200"
            variant="outline"
          >
            <Send className="h-6 w-6" />
            <span className="font-medium">ส่งออก</span>
            <span className="text-xs text-red-600">Export</span>
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground border-t pt-4">
          💡 แตะปุ่มเพื่อเลือกการดำเนินการ
        </div>
      </DialogContent>
    </Dialog>
  );
}
