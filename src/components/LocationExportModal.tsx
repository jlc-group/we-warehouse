import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, Package, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { InventoryItem } from '@/hooks/useInventory';
import { displayLocation } from '@/utils/locationUtils';

interface LocationExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: string;
  items: InventoryItem[];
  onExport: (itemId: string, cartonQty: number, boxQty: number, looseQty: number, destination: string, notes?: string) => Promise<void>;
}

export function LocationExportModal({
  isOpen,
  onClose,
  location,
  items,
  onExport
}: LocationExportModalProps) {
  const { toast } = useToast();
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [cartonQty, setCartonQty] = useState<number>(0);
  const [boxQty, setBoxQty] = useState<number>(0);
  const [looseQty, setLooseQty] = useState<number>(0);
  const [destination, setDestination] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper functions for quantity fields
  const getCartonQty = (item: any) => Number(item.unit_level1_quantity ?? item.carton_quantity_legacy ?? 0) || 0;
  const getBoxQty = (item: any) => Number(item.unit_level2_quantity ?? item.box_quantity_legacy ?? 0) || 0;
  const getPiecesQty = (item: any) => Number(item.unit_level3_quantity ?? item.pieces_quantity_legacy ?? 0) || 0;

  const selectedItem = items.find(item => item.id === selectedItemId);

  const handleSubmit = async () => {
    if (!selectedItem) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'กรุณาเลือกสินค้าที่ต้องการส่งออก',
        variant: 'destructive',
      });
      return;
    }

    if (!destination.trim()) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'กรุณาระบุปลายทาง',
        variant: 'destructive',
      });
      return;
    }

    if (cartonQty <= 0 && boxQty <= 0 && looseQty <= 0) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'กรุณาระบุจำนวนที่ต้องการส่งออก',
        variant: 'destructive',
      });
      return;
    }

    // Check if quantities don't exceed available stock
    const availableCarton = getCartonQty(selectedItem);
    const availableBox = getBoxQty(selectedItem);
    const availableLoose = getPiecesQty(selectedItem);

    if (cartonQty > availableCarton || boxQty > availableBox || looseQty > availableLoose) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'จำนวนที่ต้องการส่งออกเกินจำนวนที่มีในคลัง',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onExport(selectedItemId, cartonQty, boxQty, looseQty, destination, notes);
      
      // Reset form
      setSelectedItemId('');
      setCartonQty(0);
      setBoxQty(0);
      setLooseQty(0);
      setDestination('');
      setNotes('');
      
      onClose();
    } catch (error: any) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message || 'ไม่สามารถส่งออกสินค้าได้',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            ส่งออกสินค้า
          </DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            ตำแหน่ง: {displayLocation(location)}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Item Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">เลือกสินค้าที่ต้องการส่งออก</Label>
            <div className="grid gap-2 max-h-48 overflow-y-auto">
              {items.map((item) => (
                <Card 
                  key={item.id} 
                  className={`cursor-pointer transition-colors ${
                    selectedItemId === item.id 
                      ? 'ring-2 ring-blue-500 bg-blue-50' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedItemId(item.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{(item as any).product_name || item.sku}</div>
                        <div className="text-sm text-muted-foreground">SKU: {item.sku}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">
                          <Badge variant="outline" className="mr-1">
                            ลัง: {getCartonQty(item)}
                          </Badge>
                          <Badge variant="outline" className="mr-1">
                            กล่อง: {getBoxQty(item)}
                          </Badge>
                          <Badge variant="outline">
                            ชิ้น: {getPiecesQty(item)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Quantity Input */}
          {selectedItem && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">จำนวนที่ต้องการส่งออก</Label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="carton">ลัง</Label>
                  <Input
                    id="carton"
                    type="number"
                    min="0"
                    max={getCartonQty(selectedItem)}
                    value={cartonQty}
                    onChange={(e) => setCartonQty(Number(e.target.value))}
                    placeholder="0"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    มีอยู่: {getCartonQty(selectedItem)} ลัง
                  </div>
                </div>
                <div>
                  <Label htmlFor="box">กล่อง</Label>
                  <Input
                    id="box"
                    type="number"
                    min="0"
                    max={getBoxQty(selectedItem)}
                    value={boxQty}
                    onChange={(e) => setBoxQty(Number(e.target.value))}
                    placeholder="0"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    มีอยู่: {getBoxQty(selectedItem)} กล่อง
                  </div>
                </div>
                <div>
                  <Label htmlFor="loose">ชิ้น</Label>
                  <Input
                    id="loose"
                    type="number"
                    min="0"
                    max={getPiecesQty(selectedItem)}
                    value={looseQty}
                    onChange={(e) => setLooseQty(Number(e.target.value))}
                    placeholder="0"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    มีอยู่: {getPiecesQty(selectedItem)} ชิ้น
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Destination */}
          <div className="space-y-2">
            <Label htmlFor="destination">ปลายทาง *</Label>
            <Input
              id="destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="ระบุปลายทาง เช่น ลูกค้า ABC, สาขา XYZ"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">หมายเหตุ</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              ยกเลิก
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !selectedItem || !destination.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? 'กำลังส่งออก...' : 'ส่งออก'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
