import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Package, MapPin, Plus, Minus } from 'lucide-react';

interface BulkAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (locations: string[], itemData: {
    product_name: string;
    sku: string;
    lot?: string;
    mfd?: string;
    box_quantity: number;
    loose_quantity: number;
  }) => Promise<void>;
  availableLocations: string[];
}

export function BulkAddModal({ isOpen, onClose, onSave, availableLocations }: BulkAddModalProps) {
  const [productName, setProductName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [lot, setLot] = useState('');
  const [mfd, setMfd] = useState('');
  const [quantityBoxes, setQuantityBoxes] = useState(0);
  const [quantityLoose, setQuantityLoose] = useState(0);
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());
  const [customLocation, setCustomLocation] = useState('');

  const resetForm = () => {
    setProductName('');
    setProductCode('');
    setLot('');
    setMfd('');
    setQuantityBoxes(0);
    setQuantityLoose(0);
    setSelectedLocations(new Set());
    setCustomLocation('');
  };

  const handleLocationToggle = (location: string) => {
    const newSelected = new Set(selectedLocations);
    if (newSelected.has(location)) {
      newSelected.delete(location);
    } else {
      newSelected.add(location);
    }
    setSelectedLocations(newSelected);
  };

  const handleAddCustomLocation = () => {
    if (customLocation.trim()) {
      const newSelected = new Set(selectedLocations);
      newSelected.add(customLocation.trim());
      setSelectedLocations(newSelected);
      setCustomLocation('');
    }
  };

  const handleSave = () => {
    if (!productName.trim() || !productCode.trim() || selectedLocations.size === 0) {
      return;
    }

    onSave(Array.from(selectedLocations), {
      product_name: productName.trim(),
      sku: productCode.trim(),
      lot: lot.trim() || undefined,
      mfd: mfd || undefined,
      box_quantity: quantityBoxes,
      loose_quantity: quantityLoose,
    });

    resetForm();
    onClose();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            เพิ่มสินค้าหลายตำแหน่ง
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Product Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">ข้อมูลสินค้า</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="productName">ชื่อสินค้า *</Label>
                <Input
                  id="productName"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="กรอกชื่อสินค้า"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="productCode">รหัสสินค้า *</Label>
                <Input
                  id="productCode"
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                  placeholder="กรอกรหัสสินค้า"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lot">Lot</Label>
                <Input
                  id="lot"
                  value={lot}
                  onChange={(e) => setLot(e.target.value)}
                  placeholder="กรอก Lot (ถ้ามี)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mfd">MFD</Label>
                <Input
                  id="mfd"
                  type="date"
                  value={mfd}
                  onChange={(e) => setMfd(e.target.value)}
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

          {/* Location Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">เลือกตำแหน่ง</h3>
              <Badge variant="secondary">
                เลือกแล้ว {selectedLocations.size} ตำแหน่ง
              </Badge>
            </div>

            {/* Custom Location Input */}
            <div className="flex gap-2">
              <Input
                placeholder="เพิ่มตำแหน่งใหม่ (เช่น A/1/1)"
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCustomLocation()}
              />
              <Button
                type="button"
                onClick={handleAddCustomLocation}
                disabled={!customLocation.trim()}
                size="sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Selected Locations */}
            {selectedLocations.size > 0 && (
              <div className="space-y-2">
                <Label>ตำแหน่งที่เลือก:</Label>
                <div className="flex flex-wrap gap-2">
                  {Array.from(selectedLocations).map(location => (
                    <Badge
                      key={location}
                      variant="default"
                      className="cursor-pointer hover:bg-destructive"
                      onClick={() => handleLocationToggle(location)}
                    >
                      <MapPin className="h-3 w-3 mr-1" />
                      {location}
                      <Minus className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Available Locations */}
            <div className="space-y-2">
              <Label>ตำแหน่งที่มีอยู่:</Label>
              <div className="max-h-48 overflow-y-auto border rounded-lg p-3">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {(availableLocations || []).map(location => (
                    <div key={location} className="flex items-center space-x-2">
                      <Checkbox
                        id={location}
                        checked={selectedLocations.has(location)}
                        onCheckedChange={() => handleLocationToggle(location)}
                      />
                      <Label
                        htmlFor={location}
                        className="text-sm font-mono cursor-pointer"
                      >
                        {location}
                      </Label>
                    </div>
                  ))}
                  {(!availableLocations || availableLocations.length === 0) && (
                    <div className="col-span-full text-center text-muted-foreground text-sm py-4">
                      ไม่มีตำแหน่งที่บันทึกไว้
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            ยกเลิก
          </Button>
          <Button 
            onClick={handleSave} 
            className="flex-1"
            disabled={!productName.trim() || !productCode.trim() || selectedLocations.size === 0}
          >
            บันทึก ({selectedLocations.size} ตำแหน่ง)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
