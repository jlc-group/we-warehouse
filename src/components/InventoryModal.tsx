import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Package, Tag, Hash } from 'lucide-react';
import { InventoryItem } from '@/hooks/useInventory';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<InventoryItem, 'id' | 'updatedAt'>) => void;
  location: string;
  existingItem?: InventoryItem;
}

export function InventoryModal({ 
  isOpen, 
  onClose, 
  onSave, 
  location, 
  existingItem 
}: InventoryModalProps) {
  const [formData, setFormData] = useState({
    productName: '',
    productCode: '',
    lot: '',
    mfd: '',
    quantityBoxes: 0,
    quantityLoose: 0,
  });

  useEffect(() => {
    if (existingItem) {
      setFormData({
        productName: existingItem.productName,
        productCode: existingItem.productCode,
        lot: existingItem.lot || '',
        mfd: existingItem.mfd || '',
        quantityBoxes: existingItem.quantityBoxes,
        quantityLoose: existingItem.quantityLoose,
      });
    } else {
      setFormData({
        productName: '',
        productCode: '',
        lot: '',
        mfd: '',
        quantityBoxes: 0,
        quantityLoose: 0,
      });
    }
  }, [existingItem, isOpen]);

  const handleSave = () => {
    if (!formData.productName || !formData.productCode) {
      return;
    }
    
    onSave({
      location,
      ...formData,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            บันทึกข้อมูลสินค้า - {location}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="productName" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              ชื่อสินค้า *
            </Label>
            <Input
              id="productName"
              value={formData.productName}
              onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
              placeholder="ระบุชื่อสินค้า"
              className="h-11"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="productCode" className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              รหัสสินค้า *
            </Label>
            <Input
              id="productCode"
              value={formData.productCode}
              onChange={(e) => setFormData(prev => ({ ...prev, productCode: e.target.value }))}
              placeholder="ระบุรหัสสินค้า (SKU)"
              className="h-11"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lot">LOT</Label>
              <Input
                id="lot"
                value={formData.lot}
                onChange={(e) => setFormData(prev => ({ ...prev, lot: e.target.value }))}
                placeholder="หมายเลข LOT"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mfd" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                MFD
              </Label>
              <Input
                id="mfd"
                type="date"
                value={formData.mfd}
                onChange={(e) => setFormData(prev => ({ ...prev, mfd: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantityBoxes">จำนวนลัง</Label>
              <Input
                id="quantityBoxes"
                type="number"
                min="0"
                value={formData.quantityBoxes}
                onChange={(e) => setFormData(prev => ({ ...prev, quantityBoxes: parseInt(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="quantityLoose">จำนวนเศษ</Label>
              <Input
                id="quantityLoose"
                type="number"
                min="0"
                value={formData.quantityLoose}
                onChange={(e) => setFormData(prev => ({ ...prev, quantityLoose: parseInt(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!formData.productName || !formData.productCode}
              className="bg-gradient-primary"
            >
              บันทึก
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}