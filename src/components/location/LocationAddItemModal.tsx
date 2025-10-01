import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface LocationAddItemModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  location?: string;
  onSave?: (data: any) => void;
}

export const LocationAddItemModal = ({ isOpen, onClose, location, onSave }: LocationAddItemModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>เพิ่มสินค้าในตำแหน่ง</DialogTitle>
        </DialogHeader>
        <div className="text-center py-8 text-muted-foreground">
          ฟีเจอร์นี้กำลังอยู่ในระหว่างการพัฒนา
        </div>
      </DialogContent>
    </Dialog>
  );
};