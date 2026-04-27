import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Save, X, Package, Search } from 'lucide-react';
import { localDb } from '@/integrations/local/client';
import { useToast } from '@/hooks/use-toast';
import { LocationActivityService } from '@/services/locationActivityService';
import { useProducts } from '@/contexts/ProductsContext';

interface LocationAddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: string;
  onSuccess: () => void;
}

interface Product {
  id: string;
  sku_code: string;
  product_name: string;
  unit_level1_name?: string;
  unit_level2_name?: string;
  unit_level3_name?: string;
  unit_level1_rate?: number;
  unit_level2_rate?: number;
}

export function LocationAddItemModal({
  isOpen,
  onClose,
  location,
  onSuccess
}: LocationAddItemModalProps) {
  const { toast } = useToast();
  const { products } = useProducts();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantities, setQuantities] = useState({
    level1: 0,
    level2: 0,
    level3: 0
  });
  const [lot, setLot] = useState('');
  const [mfd, setMfd] = useState('');

  // Filter products based on search
  const filteredProducts = products?.filter(p =>
    p.sku_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.product_name?.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 10) || [];

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedProduct(null);
      setQuantities({ level1: 0, level2: 0, level3: 0 });
      setLot('');
      setMfd('');
    }
  }, [isOpen]);

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setSearchQuery(product.sku_code);
  };

  const handleSave = async () => {
    if (!selectedProduct) {
      toast({
        title: '⚠️ ไม่ได้เลือกสินค้า',
        description: 'กรุณาเลือกสินค้าที่ต้องการรับเข้า',
        variant: 'destructive'
      });
      return;
    }

    if (quantities.level1 === 0 && quantities.level2 === 0 && quantities.level3 === 0) {
      toast({
        title: '⚠️ ไม่ได้ระบุจำนวน',
        description: 'กรุณาระบุจำนวนสินค้าที่ต้องการรับเข้า',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);

      // Insert new inventory item
      const { error: insertError } = await localDb
        .from('inventory_items')
        .insert([{
          sku: selectedProduct.sku_code,
          product_name: selectedProduct.product_name,
          location: location,
          lot: lot || null,
          mfd: mfd || null,
          unit_level1_quantity: quantities.level1,
          unit_level2_quantity: quantities.level2,
          unit_level3_quantity: quantities.level3,
          unit_level1_name: selectedProduct.unit_level1_name || 'ลัง',
          unit_level2_name: selectedProduct.unit_level2_name || 'กล่อง',
          unit_level3_name: selectedProduct.unit_level3_name || 'ชิ้น',
          unit_level1_rate: selectedProduct.unit_level1_rate || 12,
          unit_level2_rate: selectedProduct.unit_level2_rate || 1,
          // unit (legacy) — ใช้ชื่อหน่วยใหญ่สุดที่ผู้ใช้ป้อน เพื่อไม่ให้ overview แสดงไม่ตรง
          unit:
            (quantities.level1 > 0 && (selectedProduct.unit_level1_name || 'ลัง')) ||
            (quantities.level2 > 0 && (selectedProduct.unit_level2_name || 'กล่อง')) ||
            (selectedProduct.unit_level3_name || 'ชิ้น'),
        }]);

      if (insertError) throw insertError;

      // Log activity
      await LocationActivityService.logMoveIn({
        location,
        productSku: selectedProduct.sku_code,
        productName: selectedProduct.product_name,
        quantity: quantities.level1 + quantities.level2 + quantities.level3,
        unit: selectedProduct.unit_level1_name || 'ลัง',
        userName: 'User',
        notes: lot ? `LOT: ${lot}` : undefined
      });

      // แจ้ง useInventory / overview ให้ refetch global cache (รองรับการกลับไปดูภาพรวม)
      window.dispatchEvent(new CustomEvent('inventory-changed', {
        detail: { action: 'add', location, sku: selectedProduct.sku_code }
      }));

      toast({
        title: '✅ รับสินค้าเข้าสำเร็จ',
        description: `เพิ่ม ${selectedProduct.product_name} ใน ${location}`,
      });

      onSuccess();
      onClose();

    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: 'ไม่สามารถรับสินค้าเข้าได้',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full h-full sm:max-w-lg sm:h-auto overflow-y-auto">
        <DialogHeader className="p-4 sm:p-6">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg text-green-700">
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            รับสินค้าเข้า - {location}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            เพิ่มสินค้าใหม่เข้า Location นี้
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Product Search */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">ค้นหาสินค้า</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="พิมพ์ SKU หรือชื่อสินค้า..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedProduct(null);
                }}
                className="pl-10 h-11"
              />
            </div>

            {/* Product Suggestions */}
            {searchQuery && !selectedProduct && filteredProducts.length > 0 && (
              <Card className="max-h-48 overflow-y-auto">
                <CardContent className="p-2">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="p-2 hover:bg-gray-100 rounded cursor-pointer"
                      onClick={() => handleProductSelect(product as Product)}
                    >
                      <div className="font-medium text-sm">{product.product_name}</div>
                      <div className="text-xs text-gray-500 font-mono">{product.sku_code}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Selected Product */}
          {selectedProduct && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">เลือกสินค้าแล้ว</span>
                </div>
                <div className="text-sm">{selectedProduct.product_name}</div>
                <div className="text-xs text-gray-500 font-mono">{selectedProduct.sku_code}</div>
              </CardContent>
            </Card>
          )}

          {/* Quantities */}
          {selectedProduct && (
            <div className="space-y-4">
              <Label className="text-sm font-medium">จำนวนที่รับเข้า</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-blue-700">
                    🔵 {selectedProduct.unit_level1_name || 'ลัง'}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={quantities.level1}
                    onChange={(e) => setQuantities(prev => ({ ...prev, level1: parseInt(e.target.value) || 0 }))}
                    className="text-center h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-green-700">
                    🟢 {selectedProduct.unit_level2_name || 'กล่อง'}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={quantities.level2}
                    onChange={(e) => setQuantities(prev => ({ ...prev, level2: parseInt(e.target.value) || 0 }))}
                    className="text-center h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-purple-700">
                    🟣 {selectedProduct.unit_level3_name || 'ชิ้น'}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={quantities.level3}
                    onChange={(e) => setQuantities(prev => ({ ...prev, level3: parseInt(e.target.value) || 0 }))}
                    className="text-center h-11"
                  />
                </div>
              </div>

              {/* LOT & MFD */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">LOT (ถ้ามี)</Label>
                  <Input
                    placeholder="เช่น LOT001"
                    value={lot}
                    onChange={(e) => setLot(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">MFD (ถ้ามี)</Label>
                  <Input
                    type="date"
                    value={mfd}
                    onChange={(e) => setMfd(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading} className="h-11 w-full sm:w-auto">
            <X className="h-4 w-4 mr-2" />
            ยกเลิก
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || !selectedProduct}
            className="bg-green-600 hover:bg-green-700 h-11 w-full sm:w-auto"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'กำลังบันทึก...' : 'รับสินค้าเข้า'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}