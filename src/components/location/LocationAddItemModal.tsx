import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Save, X, Package, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { convertUrlToDbFormat } from '@/utils/locationUtils';

interface Product {
  id: string;
  sku_code: string;
  product_name: string;
  product_type: string;
  unit_of_measure: string;
}

interface ConversionRate {
  sku: string;
  unit_level1_name: string;
  unit_level2_name: string;
  unit_level3_name: string;
  unit_level1_rate: number;
  unit_level2_rate: number;
}

interface LocationAddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationId: string;
  onSuccess: () => void;
}

interface NewItemData {
  product_id: string;
  sku: string;
  product_name: string;
  unit_level1_quantity: number;
  unit_level2_quantity: number;
  unit_level3_quantity: number;
  lot: string;
  mfd: string;
}

export function LocationAddItemModal({ isOpen, onClose, locationId, onSuccess }: LocationAddItemModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [conversionRates, setConversionRates] = useState<Record<string, ConversionRate>>({});
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductType, setSelectedProductType] = useState('');
  const [newItem, setNewItem] = useState<NewItemData>({
    product_id: '',
    sku: '',
    product_name: '',
    unit_level1_quantity: 0,
    unit_level2_quantity: 0,
    unit_level3_quantity: 0,
    lot: '',
    mfd: ''
  });

  // Load products and conversion rates
  useEffect(() => {
    if (isOpen) {
      loadProducts();
      loadConversionRates();
    }
  }, [isOpen]);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, sku_code, product_name, product_type, unit_of_measure')
        .eq('is_active', true)
        .order('product_name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดข้อมูลสินค้าได้',
        variant: 'destructive'
      });
    }
  };

  const loadConversionRates = async () => {
    try {
      console.log('LocationAddItemModal: Loading conversion rates...');
      const { data, error } = await supabase
        .from('product_conversion_rates')
        .select('*');

      if (error) throw error;

      const ratesMap: Record<string, ConversionRate> = {};
      data?.forEach(rate => {
        ratesMap[rate.sku] = rate;
      });
      setConversionRates(ratesMap);
      console.log('LocationAddItemModal: Loaded', Object.keys(ratesMap).length, 'conversion rates');
    } catch (error) {
      console.error('Error loading conversion rates:', error);
    }
  };

  const filteredProducts = products.filter(product => {
    const searchTerm = productSearch.toLowerCase();
    return product.product_name.toLowerCase().includes(searchTerm) ||
           product.sku_code.toLowerCase().includes(searchTerm);
  });

  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setNewItem(prev => ({
        ...prev,
        product_id: product.id,
        sku: product.sku_code,
        product_name: product.product_name
      }));
    }
  };

  const handleQuantityChange = (field: keyof NewItemData, value: string) => {
    const numValue = Math.max(0, parseInt(value) || 0);
    setNewItem(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const calculateTotalPieces = (): number => {
    const rate = conversionRates[newItem.sku];
    if (!rate) return newItem.unit_level1_quantity + newItem.unit_level2_quantity + newItem.unit_level3_quantity;

    const level1Pieces = newItem.unit_level1_quantity * (rate.unit_level1_rate || 0);
    const level2Pieces = newItem.unit_level2_quantity * (rate.unit_level2_rate || 0);
    const level3Pieces = newItem.unit_level3_quantity || 0;
    return level1Pieces + level2Pieces + level3Pieces;
  };

  const handleSave = async () => {
    if (!newItem.product_id || !newItem.sku) {
      toast({
        title: '⚠️ ข้อมูลไม่ครบ',
        description: 'กรุณาเลือกสินค้าก่อน',
        variant: 'destructive'
      });
      return;
    }

    const totalQuantity = newItem.unit_level1_quantity + newItem.unit_level2_quantity + newItem.unit_level3_quantity;
    if (totalQuantity === 0) {
      toast({
        title: '⚠️ ข้อมูลไม่ครบ',
        description: 'กรุณาระบุจำนวนสินค้าอย่างน้อย 1 หน่วย',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);

      // Convert URL format to database format for storage
      const dbLocationId = convertUrlToDbFormat(locationId);

      const rate = conversionRates[newItem.sku];

      // Warn user if no conversion rates are set
      if (!rate && (newItem.unit_level1_quantity > 0 || newItem.unit_level2_quantity > 0)) {
        console.warn('No conversion rates found for SKU:', newItem.sku);
        toast({
          title: '⚠️ ไม่พบอัตราแปลงหน่วย',
          description: `SKU ${newItem.sku} ไม่มีการตั้งค่าอัตราแปลงหน่วย อาจจะมีปัญหาในการคำนวณ`,
          variant: 'destructive'
        });
      }

      const inventoryData = {
        sku: newItem.sku,
        product_name: newItem.product_name,
        location: dbLocationId,
        lot: newItem.lot || null,
        mfd: newItem.mfd || null,
        unit_level1_quantity: newItem.unit_level1_quantity,
        unit_level2_quantity: newItem.unit_level2_quantity,
        unit_level3_quantity: newItem.unit_level3_quantity,
        unit_level1_name: rate?.unit_level1_name || 'ลัง',
        unit_level2_name: rate?.unit_level2_name || 'กล่อง',
        unit_level3_name: rate?.unit_level3_name || 'ชิ้น',
        unit_level1_rate: rate?.unit_level1_rate || 1, // Use 1 instead of 0 as fallback
        unit_level2_rate: rate?.unit_level2_rate || 1, // Use 1 instead of 0 as fallback
        // Legacy fields for compatibility
        carton_quantity_legacy: newItem.unit_level1_quantity,
        box_quantity_legacy: newItem.unit_level2_quantity,
        pieces_quantity_legacy: newItem.unit_level3_quantity,
        unit: 'กล่อง'
      };

      console.log('Adding inventory with conversion rates:', {
        sku: newItem.sku,
        hasConversionRate: !!rate,
        rates: rate,
        finalRates: {
          level1_rate: inventoryData.unit_level1_rate,
          level2_rate: inventoryData.unit_level2_rate
        }
      });

      const { data, error } = await supabase
        .from('inventory_items')
        .insert([inventoryData])
        .select();

      if (error) throw error;

      toast({
        title: '✅ เพิ่มสินค้าสำเร็จ',
        description: `เพิ่ม ${newItem.product_name} ใน Location ${locationId} แล้ว`,
      });

      // Reset form
      setNewItem({
        product_id: '',
        sku: '',
        product_name: '',
        unit_level1_quantity: 0,
        unit_level2_quantity: 0,
        unit_level3_quantity: 0,
        lot: '',
        mfd: ''
      });
      setProductSearch('');
      setSelectedProductType('');

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: 'ไม่สามารถเพิ่มสินค้าได้',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedRate = conversionRates[newItem.sku];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            เพิ่มสินค้าใน Location {locationId}
          </DialogTitle>
          <DialogDescription>
            เลือกสินค้าและระบุจำนวนที่ต้องการเพิ่มเข้าสู่ตำแหน่งนี้
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Product Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4" />
                เลือกสินค้า
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="space-y-2">
                <Label htmlFor="product-search">ค้นหาสินค้า</Label>
                <Input
                  id="product-search"
                  placeholder="ค้นหาด้วยชื่อสินค้าหรือ SKU..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-select">เลือกสินค้า</Label>
                <Select value={newItem.product_id} onValueChange={handleProductSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกสินค้า..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{product.product_name}</span>
                          <span className="text-sm text-gray-500">{product.sku_code}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {newItem.sku && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="font-medium text-blue-800">{newItem.product_name}</div>
                  <div className="text-sm text-blue-600">SKU: {newItem.sku}</div>
                  {selectedRate ? (
                    <div className="text-xs text-green-600 mt-1">
                      ✅ มีการตั้งค่าอัตราแปลงหน่วย: {selectedRate.unit_level1_name} ({selectedRate.unit_level1_rate} ชิ้น), {selectedRate.unit_level2_name} ({selectedRate.unit_level2_rate} ชิ้น)
                    </div>
                  ) : newItem.sku && (
                    <div className="text-xs text-amber-600 mt-1">
                      ⚠️ ไม่มีการตั้งค่าอัตราแปลงหน่วย - จะใช้ค่า default (1:1)
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quantity Input */}
          {newItem.sku && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    ระบุจำนวน
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">รวมทั้งหมด</div>
                    <div className="text-lg font-bold text-blue-600">
                      {calculateTotalPieces().toLocaleString()} ชิ้น
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Level 1 */}
                  <div className="space-y-2">
                    <Label htmlFor="level1" className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      {selectedRate?.unit_level1_name || 'ลัง'}
                      {selectedRate?.unit_level1_rate && (
                        <span className="text-xs text-gray-500">
                          ({selectedRate.unit_level1_rate} ชิ้น/หน่วย)
                        </span>
                      )}
                    </Label>
                    <Input
                      id="level1"
                      type="number"
                      min="0"
                      value={newItem.unit_level1_quantity}
                      onChange={(e) => handleQuantityChange('unit_level1_quantity', e.target.value)}
                      className="text-center"
                    />
                  </div>

                  {/* Level 2 */}
                  <div className="space-y-2">
                    <Label htmlFor="level2" className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      {selectedRate?.unit_level2_name || 'กล่อง'}
                      {selectedRate?.unit_level2_rate && (
                        <span className="text-xs text-gray-500">
                          ({selectedRate.unit_level2_rate} ชิ้น/หน่วย)
                        </span>
                      )}
                    </Label>
                    <Input
                      id="level2"
                      type="number"
                      min="0"
                      value={newItem.unit_level2_quantity}
                      onChange={(e) => handleQuantityChange('unit_level2_quantity', e.target.value)}
                      className="text-center"
                    />
                  </div>

                  {/* Level 3 */}
                  <div className="space-y-2">
                    <Label htmlFor="level3" className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      {selectedRate?.unit_level3_name || 'ชิ้น'}
                    </Label>
                    <Input
                      id="level3"
                      type="number"
                      min="0"
                      value={newItem.unit_level3_quantity}
                      onChange={(e) => handleQuantityChange('unit_level3_quantity', e.target.value)}
                      className="text-center"
                    />
                  </div>
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="lot">LOT (ไม่บังคับ)</Label>
                    <Input
                      id="lot"
                      value={newItem.lot}
                      onChange={(e) => setNewItem(prev => ({ ...prev, lot: e.target.value }))}
                      placeholder="ระบุ LOT..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mfd">MFD (ไม่บังคับ)</Label>
                    <Input
                      id="mfd"
                      type="date"
                      value={newItem.mfd}
                      onChange={(e) => setNewItem(prev => ({ ...prev, mfd: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            <X className="h-4 w-4 mr-2" />
            ยกเลิก
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || !newItem.sku || calculateTotalPieces() === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'กำลังเพิ่ม...' : 'เพิ่มสินค้า'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}