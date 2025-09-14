import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, Hash, Calendar, MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { InventoryItem } from '@/hooks/useInventory';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: {
    product_name: string;
    product_code: string;
    location: string;
    lot?: string;
    mfd?: string;
    quantity_boxes: number;
    quantity_loose: number;
  }) => void;
  location: string;
  existingItem?: InventoryItem;
}

export function InventoryModal({ isOpen, onClose, onSave, location, existingItem }: InventoryModalProps) {
  // Form state
  const [productName, setProductName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [lot, setLot] = useState('');
  const [mfd, setMfd] = useState('');
  const [quantityBoxes, setQuantityBoxes] = useState(0);
  const [quantityLoose, setQuantityLoose] = useState(0);

  // Reset form when modal opens/closes or when existingItem changes
  useEffect(() => {
    if (isOpen) {
      if (existingItem) {
        // Editing existing item
        setProductName(existingItem.product_name);
        setProductCode(existingItem.product_code);
        setLot(existingItem.lot || '');
        setMfd(existingItem.mfd || '');
        setQuantityBoxes(existingItem.quantity_boxes);
        setQuantityLoose(existingItem.quantity_loose);
      } else {
        // Adding new item
        setProductName('');
        setProductCode('');
        setLot('');
        setMfd('');
        setQuantityBoxes(0);
        setQuantityLoose(0);
      }
    }
  }, [isOpen, existingItem]);

  const handleSave = () => {
    if (!productName.trim() || !productCode.trim()) {
      return;
    }

    onSave({
      product_name: productName.trim(),
      product_code: productCode.trim(),
      location,
      lot: lot.trim() || undefined,
      mfd: mfd || undefined,
      quantity_boxes: quantityBoxes,
      quantity_loose: quantityLoose,
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {existingItem ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Location Display */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="font-mono font-medium">ตำแหน่ง: {location}</span>
          </div>

          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="productName" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              ชื่อสินค้า *
            </Label>
            <Input
              id="productName"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="กรอกชื่อสินค้า"
            />
          </div>

          {/* Product Code */}
          <div className="space-y-2">
            <Label htmlFor="productCode" className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              รหัสสินค้า *
            </Label>
            <Input
              id="productCode"
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              placeholder="กรอกรหัสสินค้า"
            />
          </div>

          {/* LOT */}
          <div className="space-y-2">
            <Label htmlFor="lot">LOT</Label>
            <Input
              id="lot"
              value={lot}
              onChange={(e) => setLot(e.target.value)}
              placeholder="กรอก LOT (ถ้ามี)"
            />
          </div>

          {/* MFD */}
          <div className="space-y-2">
            <Label htmlFor="mfd" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              วันที่ผลิต (MFD)
            </Label>
            <Input
              id="mfd"
              type="date"
              value={mfd}
              onChange={(e) => setMfd(e.target.value)}
            />
          </div>

          {/* Quantities */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantityBoxes">จำนวนลัง</Label>
              <Input
                id="quantityBoxes"
                type="number"
                min="0"
                value={quantityBoxes}
                onChange={(e) => setQuantityBoxes(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantityLoose">จำนวนเศษ</Label>
              <Input
                id="quantityLoose"
                type="number"
                min="0"
                value={quantityLoose}
                onChange={(e) => setQuantityLoose(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            ยกเลิก
          </Button>
          <Button 
            onClick={handleSave} 
            className="flex-1"
            disabled={!productName.trim() || !productCode.trim()}
          >
            บันทึก
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}