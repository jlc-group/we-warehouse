import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface EditProductModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  product?: any;
  onSave?: (product: any) => void;
}

export const EditProductModal = ({ isOpen, onClose, product, onSave }: EditProductModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>แก้ไขข้อมูลสินค้า</DialogTitle>
        </DialogHeader>
        <div className="text-center py-8 text-muted-foreground">
          ฟีเจอร์นี้กำลังอยู่ในระหว่างการพัฒนา
        </div>
      </DialogContent>
    </Dialog>
  );
};