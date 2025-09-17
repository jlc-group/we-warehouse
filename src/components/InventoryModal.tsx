import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Hash, Calendar, MapPin, Search } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { InventoryItem } from '@/hooks/useInventory';
import type { Database } from '@/integrations/supabase/types';

type Product = Database['public']['Tables']['products']['Row'];

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

// Product name mapping สำหรับรหัสสินค้าที่พบบ่อย
const PRODUCT_NAME_MAPPING: Record<string, string> = {
  'A1-40G': 'จุฬาเฮิร์บ บีบี บอดี้โลชั่น 40ก.รุ่นซอง',
  'L13-10G': 'จุฬาเฮิร์บ บลูโรส ไวท์เทนนิ่ง อันเดอร์อาร์มครีม10ก',
  'L8A-6G': 'จุฬาเฮิร์บ วอเตอร์เมลอน อีอี คูชั่น 01 6 ก.รุ่นซอง',
  'L8B-6G': 'จุฬาเฮิร์บ วอเตอร์เมลอน อีอี คูชั่น 02 6 ก.รุ่นซอง',
  'L8A-30G': 'จุฬาเฮิร์บ วอเตอร์เมลอน อีอี คูชั่น 01 30 ก.รุ่นหลอด',
  'L3-40G': 'จุฬาเฮิร์บ ดีดี วอเตอร์เมลอน ซันสกรีน 40ก',
  'L7-6G': 'จุฬาเฮิร์บ เรดออเร้นจ์ กลูต้า เซรั่ม 6ก',
  'L4-40G': 'จุฬาเฮิร์บ ลองแกน เมลาสม่า เซรั่ม 40 ก.รุ่นหลอด',
  'L10-7G': 'จุฬาเฮิร์บ วอเตอร์เมลอน 3D ออร่า ซันการ์ด 7ก',
  'L3-8G': 'จุฬาเฮิร์บ ดีดี วอเตอร์เมลอน ซันสกรีน 8ก',
  'L11-40G': 'จุฬาเฮิร์บ เรด ออเรนจ์ ออร่า ไบรท์ บอดี้ โลชั่น 40ก',
  'L14-40G': 'จุฬาเฮิร์บ วอเตอร์เมลอน ออร่า คลีนซิ่ง วิป โฟม 40ก',
  'L4-8G': 'จุฬาเฮิร์บ ลองแกน เมลาสม่า เซรั่ม 8 ก.รุ่นซอง',
  'T6A-10G': 'จุฬาเฮิร์บ วอเตอร์เมลอน ฟีลเตอร์ ฟิต พาวเดอร์ 10ก',
  'T6A-5G': 'จุฬาเฮิร์บ วอเตอร์เมลอน ฟีลเตอร์ ฟิต พาวเดอร์ 5ก',
  'L5-15G': 'จุฬาเฮิร์บ วอเตอร์เมลอน ไฮโดร ไวท์ เอสเซนส์ 15 ก.',
  'S3-70G': 'จุฬาเฮิร์บ ลองแกน เมลาสม่า  โซฟ 70 กรัม',
  'C4-40G': 'จุฬาเฮิร์บ แบล็ก จิงเจอร์ เคลีย เซรั่ม 40 กรัม',
  'L6-8G': 'จุฬาเฮิร์บ แครอท เอจจิ้ง เพอร์เฟค เซรั่ม 8 ก.',
  'J8-40G': 'จุฬาเฮิร์บ แมงโก้ เซรั่ม',
  'T1-2G': 'จุฬาเฮิร์บ วอเตอร์เมลอน เมจิก ลิป ทินท์ 01 โกเด้นท์ควีน 2ก',
  'T2-2G': 'จุฬาเฮิร์บ วอเตอร์เมลอน เมจิก ลิป ทินท์ 02 ชูก้าร์ เบบี้ 2ก',
  'T3-2G': 'จุฬาเฮิร์บ วอเตอร์เมลอน เมจิก ลิป ทินท์ 03 ซัน ออเรนท์ 2ก',
  'T5A-2G': 'จุฬาเฮิร์บ วอเตอร์เมลอน แทททู ลิป 01 ออล สวีท 2ก',
  'T5B-2G': 'จุฬาเฮิร์บ วอเตอร์เมลอน แทททู ลิป02เบอร์กันดี 2ก',
  'T5A-2.5G': 'จุฬาเฮิร์บ วอเตอร์เมลอน แทททู ลิป 01 ออล สวีท 2.5ก',
  'T5B-2.5G': 'จุฬาเฮิร์บ วอเตอร์เมลอน แทททู ลิป02เบอร์กันดี 2.5ก',
  'T5C-2G': 'จุฬาเฮิร์บวอเตอร์เมลอนแทททูลิป03ลิตเติ้ลดาร์ลิ่ง2ก',
  'T5C-2.5G': 'จุฬาเฮิร์บ วอเตอร์เมลอน แทททู ลิป 01 ลิตเติ้ล ดาร์ลิ่ง 2.5ก',
  'C3-7G': 'จุฬาเฮิร์บ เมลอน มิลก์ ยูวี เอสเซนส์ 7 ก.',
  'L6-40G': 'จุฬาเฮิร์บ แครอท เอจจิ้ง เพอร์เฟค เซรั่ม 40 ก.',
  'J3-8G': 'จุฬาเฮิร์บ เมลอน มิลก์ ยูวี เอสเซนส์ 7 ก.',
  'L10-30G': 'จุฬาเฮิร์บ วอเตอร์เมลอน 3D ออร่า ซันการ์ด 30ก',
  'C3-30G': 'จุฬาเฮิร์บ เมลอน มิลก์ ยูวี เอสเซนส์ 30 ก',
  'C1-6G': 'จุฬาเฮิร์บ คาเลนดูล่า แอนติ-แอคเน่ สปอต เจล 6 ก',
  'L9-8G': 'จุฬาเฮิร์บ อโวคาโด มอยส์เจอร์ ครีม 8 ก. รุ่นซอง',
  'C4-8G': 'จุฬาเฮิร์บ แบล็คจิงเจอร์ เคลีย เซรั่ม 8 ก',
  'L8B-30G': 'จุฬาเฮิร์บ วอเตอร์เมลอน อีอี คูชั่น 02 30 ก.หลอด',
  'S1-70G': 'จุฬาเฮิร์บ แมริโกลด์ แอคเน่ โซฟ 70กรัม',
  'C4-35G': 'จุฬาเฮิร์บ แบล็ก จิงเจอร์ เคลีย เซรั่ม 35ก หลอด',
  'S2-70G': 'จุฬาเฮิร์บ วอเตอร์เมลอน ออร่า โซฟ 70กรัม',
  'T5A-2.5G': 'จุฬาเฮิร์บ วอเตอร์เมลอน แทททู ลิป 01 ออล สวีท 2.5ก',
  'L7-30G': 'จุฬาเฮิร์บ เรดออเร้นจ์ กลูต้า เซรั่ม 30 ก ขวด',
  'M2-4G': 'จุฬาเฮิร์บ มาสก์ ลำไยทองคำ 24 ก.',
  'T5B-2.5G': 'จุฬาเฮิร์บ วอเตอร์เมลอน แทททู ลิป02เบอร์กันดี 2.5ก',
  'A2-40G': 'จุฬาเฮิร์บ วอเตอร์เมลอน สครับ',
  'K3-6G': 'จุฬาเฮิร์บ กลูต้า ไฮยา เซรั่ม',
  'C2-35G': 'จุฬาเฮิร์บ มอรินก้า คอมพลีต รีแพร์ เซรั่ม 35ก.',
  'C2-8G': 'จุฬาเฮิร์บ มอรินก้า คอมพลีต รีแพร์ เซรั่ม 8 ก. ซอง',
  'T5C-2G': 'จุฬาเฮิร์บวอเตอร์เมลอนแทททูลิป03ลิตเติ้ลดาร์ลิ่ง2ก',
  'C2-40G': 'จุฬาเฮิร์บ มอรินก้า คอมพลีต รีแพร์ เซรั่ม 40ก.',
  'D3-70G': 'จุฬาเฮิร์บ เจเด้นท์ 3 อิน 1 เฮอร์เบิล ไวท์ทูธเพสท์ออริจินัลเฟรช (ใหม่)',
  'D2-70G': 'จุฬาเฮิร์บ เจเด้นท์ทรีเอ็กซ์เอ็กซ์ตร้า แคร์ทูธเพสท์',
  'JDH1-70G': 'จุฬาเฮิร์บ เจเด้นท์ 3 อิน 1 เฮอร์เบิล ไวท์ทูธเพสท์ออริจินัลเฟรช'
};

export function InventoryModal({ isOpen, onClose, onSave, location, existingItem }: InventoryModalProps) {
  // Form state
  const [productName, setProductName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [lot, setLot] = useState('');
  const [mfd, setMfd] = useState('');
  const [quantityBoxes, setQuantityBoxes] = useState(0);
  const [quantityLoose, setQuantityLoose] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');

  // Load products from database
  useEffect(() => {
    if (isOpen) {
      loadProducts();
    }
  }, [isOpen]);

  // Reset form when modal opens/closes or when existingItem changes
  useEffect(() => {
    if (isOpen) {
      if (existingItem) {
        // Editing existing item
        setProductName(existingItem.product_name);
        setProductCode(existingItem.sku);
        setLot(existingItem.lot || '');
        setMfd(existingItem.mfd || '');
        setQuantityBoxes(existingItem.box_quantity);
        setQuantityLoose(existingItem.loose_quantity);
      } else {
        // Adding new item
        setProductName('');
        setProductCode('');
        setLot('');
        setMfd('');
        setQuantityBoxes(0);
        setQuantityLoose(0);
      }
      // Reset search when modal opens
      setProductSearch('');
    }
  }, [isOpen, existingItem]);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('sku_code');

      if (error) {
        console.error('Error loading products:', error);
      } else {
        setProducts(data || []);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  // Get all available product codes
  const allProductCodes = useMemo(() => {
    const mappingCodes = Object.keys(PRODUCT_NAME_MAPPING);
    const dbCodes = products.map(p => p.sku_code);
    const allCodes = [...new Set([...mappingCodes, ...dbCodes])];
    return allCodes.sort();
  }, [products]);

  // Filter product codes based on search
  const filteredProductCodes = useMemo(() => {
    if (!productSearch) return allProductCodes;
    return allProductCodes.filter(code =>
      code.toLowerCase().includes(productSearch.toLowerCase()) ||
      PRODUCT_NAME_MAPPING[code]?.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [allProductCodes, productSearch]);

  // Auto-fill product name when product code changes
  const handleProductCodeChange = (value: string) => {
    setProductCode(value);

    // ค้นหาชื่อสินค้าจาก mapping ก่อน
    const mappedName = PRODUCT_NAME_MAPPING[value.toUpperCase()];
    if (mappedName) {
      setProductName(mappedName);
      return;
    }

    // ค้นหาจาก products database
    const foundProduct = products.find(
      product => product.sku_code.toLowerCase() === value.toLowerCase()
    );

    if (foundProduct) {
      setProductName(foundProduct.product_name);
    } else if (value === '') {
      // ถ้าลบรหัสสินค้าออกหมด ให้ลบชื่อสินค้าด้วย
      setProductName('');
    }
  };

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
          <DialogDescription>
            {existingItem ? 'แก้ไขข้อมูลสินค้าในคลัง' : 'เพิ่มสินค้าใหม่เข้าสู่ระบบคลังสินค้า'}
          </DialogDescription>
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
            <Select value={productCode} onValueChange={handleProductCodeChange}>
              <SelectTrigger>
                <SelectValue placeholder="ค้นหาและเลือกรหัสสินค้า" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <div className="sticky top-0 bg-background border-b p-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="ค้นหารหัสสินค้า (เช่น L8A, วอเตอร์เมลอน)"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (filteredProductCodes.length > 0) {
                            handleProductCodeChange(filteredProductCodes[0]);
                          }
                        }
                      }}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredProductCodes.length > 0 ? (
                    filteredProductCodes.map((code) => (
                      <SelectItem key={code} value={code}>
                        <span className="font-mono font-medium">{code}</span>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="py-2 px-3 text-sm text-muted-foreground">
                      ไม่พบรหัสสินค้าที่ค้นหา
                    </div>
                  )}
                </div>
              </SelectContent>
            </Select>
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