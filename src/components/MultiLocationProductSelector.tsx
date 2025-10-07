import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Search, MapPin, Package, Plus, X, AlertTriangle } from 'lucide-react';
import { ManualFulfillmentService, type LocationStock } from '@/services/manualFulfillmentService';
import { useToast } from '@/hooks/use-toast';

interface SelectedLocation {
  inventory_item_id: string;
  location: string;
  quantity: number;
  available_stock: number;
}

interface MultiLocationProductSelectorProps {
  onProductSelected: (product: {
    product_name: string;
    product_code: string;
    total_quantity: number;
    locations: SelectedLocation[];
  }) => void;
}

export const MultiLocationProductSelector = ({
  onProductSelected
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [locations, setLocations] = useState<LocationStock[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<Map<string, number>>(new Map());

  // ค้นหาสินค้า
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: '⚠️ กรุณากรอกชื่อสินค้า',
        description: 'กรอกชื่อหรือรหัสสินค้าที่ต้องการค้นหา',
        variant: 'destructive'
      });
      return;
    }

    setSearching(true);
    try {
      const results = await ManualFulfillmentService.findProductLocations(searchTerm);

      if (results.length === 0) {
        toast({
          title: '❌ ไม่พบสินค้า',
          description: `ไม่พบสินค้า "${searchTerm}" ในคลัง`,
          variant: 'destructive'
        });
      } else {
        setLocations(results);
        toast({
          title: '✅ พบสินค้า',
          description: `พบสินค้าใน ${results.length} ตำแหน่ง`
        });
      }
    } catch (error) {
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: 'ไม่สามารถค้นหาสินค้าได้',
        variant: 'destructive'
      });
    } finally {
      setSearching(false);
    }
  };

  // เปลี่ยนจำนวนที่เลือก
  const handleQuantityChange = (inventoryItemId: string, quantity: number) => {
    const newSelected = new Map(selectedLocations);
    if (quantity > 0) {
      newSelected.set(inventoryItemId, quantity);
    } else {
      newSelected.delete(inventoryItemId);
    }
    setSelectedLocations(newSelected);
  };

  // ยืนยันการเลือก
  const handleConfirm = () => {
    if (selectedLocations.size === 0) {
      toast({
        title: '⚠️ กรุณาเลือกสินค้า',
        description: 'กรุณาเลือกสินค้าอย่างน้อย 1 ตำแหน่ง',
        variant: 'destructive'
      });
      return;
    }

    const selectedLocs: SelectedLocation[] = [];
    let totalQuantity = 0;

    locations.forEach(loc => {
      const qty = selectedLocations.get(loc.inventory_item_id);
      if (qty && qty > 0) {
        selectedLocs.push({
          inventory_item_id: loc.inventory_item_id,
          location: loc.location,
          quantity: qty,
          available_stock: loc.available_stock
        });
        totalQuantity += qty;
      }
    });

    const product = locations[0];
    onProductSelected({
      product_name: product.product_name,
      product_code: product.product_code,
      total_quantity: totalQuantity,
      locations: selectedLocs
    });

    // Reset
    setIsOpen(false);
    setSearchTerm('');
    setLocations([]);
    setSelectedLocations(new Map());
  };

  const totalSelected = Array.from(selectedLocations.values()).reduce((sum, qty) => sum + qty, 0);

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="w-full" variant="outline">
        <Plus className="h-4 w-4 mr-2" />
        เพิ่มสินค้า
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              เลือกสินค้าจากคลัง
            </DialogTitle>
            <DialogDescription>
              ค้นหาสินค้าและเลือกจากหลายตำแหน่งได้
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Search */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="search">ชื่อหรือรหัสสินค้า</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="ค้นหาสินค้า..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <Button onClick={handleSearch} disabled={searching}>
                  {searching ? 'กำลังค้นหา...' : 'ค้นหา'}
                </Button>
              </div>
            </div>

            {/* Results */}
            {locations.length > 0 && (
              <>
                <div className="border rounded-lg p-4 bg-blue-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{locations[0].product_name}</h3>
                      <p className="text-sm text-gray-600">รหัส: {locations[0].product_code}</p>
                    </div>
                    <Badge variant="secondary" className="text-lg">
                      {totalSelected} {locations[0].unit}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>เลือกตำแหน่งและจำนวน:</Label>
                  {locations.map((location) => {
                    const selectedQty = selectedLocations.get(location.inventory_item_id) || 0;
                    const isOverStock = selectedQty > location.available_stock;

                    return (
                      <Card key={location.inventory_item_id} className={isOverStock ? 'border-red-300 bg-red-50' : ''}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <MapPin className="h-4 w-4 text-blue-600" />
                                <span className="font-mono font-semibold">{location.location}</span>
                                <Badge variant="outline">
                                  มี {location.available_stock} {location.unit}
                                </Badge>
                              </div>
                              {isOverStock && (
                                <div className="flex items-center gap-1 text-red-600 text-sm">
                                  <AlertTriangle className="h-4 w-4" />
                                  <span>จำนวนเกินสต็อก!</span>
                                </div>
                              )}
                            </div>

                            <div className="w-32">
                              <Input
                                type="number"
                                placeholder="จำนวน"
                                value={selectedQty || ''}
                                onChange={(e) => handleQuantityChange(
                                  location.inventory_item_id,
                                  parseInt(e.target.value) || 0
                                )}
                                min={0}
                                max={location.available_stock}
                                className={isOverStock ? 'border-red-500' : ''}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={handleConfirm}
                    disabled={totalSelected === 0}
                    className="flex-1"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    ยืนยัน ({totalSelected} {locations[0]?.unit})
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsOpen(false);
                      setLocations([]);
                      setSelectedLocations(new Map());
                    }}
                  >
                    ยกเลิก
                  </Button>
                </div>
              </>
            )}

            {locations.length === 0 && searchTerm && !searching && (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>ยังไม่มีผลการค้นหา</p>
                <p className="text-sm">ลองค้นหาด้วยชื่อหรือรหัสสินค้า</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MultiLocationProductSelector;