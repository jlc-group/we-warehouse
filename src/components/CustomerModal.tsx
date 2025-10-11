import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CustomerModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  customer?: any;
  onSave?: (customer: any) => void;
}

export default function CustomerModal({ isOpen, onClose, customer, onSave }: CustomerModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ข้อมูลลูกค้า</DialogTitle>
        </DialogHeader>
        <div className="text-center py-8 text-muted-foreground">
          ฟีเจอร์นี้กำลังอยู่ในระหว่างการพัฒนา
        </div>
      </DialogContent>
    </Dialog>
  );
}