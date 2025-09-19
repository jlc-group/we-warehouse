import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Hash, Calendar, MapPin, Search, Calculator, Check, ChevronsUpDown, Plus } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { InventoryItem } from '@/hooks/useInventory';
import type { Database } from '@/integrations/supabase/types';
import {
  calculateTotalBaseQuantity,
  formatUnitsDisplay,
  formatTotalQuantity,
  validateUnitData,
  getEmptyMultiLevelItem,
  type MultiLevelInventoryItem
} from '@/utils/unitCalculations';

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
    // Legacy fields (for backward compatibility)
    quantity_boxes: number;
    quantity_loose: number;
    unit?: string;
    // New multi-level unit fields
    unit_level1_name?: string | null;
    unit_level1_quantity?: number;
    unit_level1_conversion_rate?: number;
    unit_level2_name?: string | null;
    unit_level2_quantity?: number;
    unit_level2_conversion_rate?: number;
    unit_level3_name?: string | null;
    unit_level3_quantity?: number;
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
  'L7-30G': 'จุฬาเฮิร์บ เรดออเร้นจ์ กลูต้า เซรั่ม 30 ก ขวด',
  'M2-4G': 'จุฬาเฮิร์บ มาสก์ ลำไยทองคำ 24 ก.',
  'A2-40G': 'จุฬาเฮิร์บ วอเตอร์เมลอน สครับ',
  'K3-6G': 'จุฬาเฮิร์บ กลูต้า ไฮยา เซรั่ม',
  'C2-35G': 'จุฬาเฮิร์บ มอรินก้า คอมพลีต รีแพร์ เซรั่ม 35ก.',
  'C2-8G': 'จุฬาเฮิร์บ มอรินก้า คอมพลีต รีแพร์ เซรั่ม 8 ก. ซอง',
  'C2-40G': 'จุฬาเฮิร์บ มอรินก้า คอมพลีต รีแพร์ เซรั่ม 40ก.',
  'D3-70G': 'จุฬาเฮิร์บ เจเด้นท์ 3 อิน 1 เฮอร์เบิล ไวท์ทูธเพสท์ออริจินัลเฟรช (ใหม่)',
  'D2-70G': 'จุฬาเฮิร์บ เจเด้นท์ทรีเอ็กซ์เอ็กซ์ตร้า แคร์ทูธเพสท์',
  'JDH1-70G': 'จุฬาเฮิร์บ เจเด้นท์ 3 อิน 1 เฮอร์เบิล ไวท์ทูธเพสท์ออริจินัลเฟรช'
};

// Unit options with emojis
const UNIT_OPTIONS = [
  { value: 'กล่อง', label: '📦 กล่อง', emoji: '📦' },
  { value: 'ลัง', label: '🧳 ลัง', emoji: '🧳' },
  { value: 'ชิ้น', label: '🔲 ชิ้น', emoji: '🔲' },
  { value: 'แผง', label: '📋 แผง', emoji: '📋' },
  { value: 'ขวด', label: '🍼 ขวด', emoji: '🍼' },
  { value: 'ซอง', label: '📦 ซอง', emoji: '📦' },
  { value: 'หลวม', label: '📝 หลวม', emoji: '📝' },
];

export function InventoryModal({ isOpen, onClose, onSave, location, existingItem }: InventoryModalProps) {
  // Form state
  const [productName, setProductName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [lot, setLot] = useState('');
  const [mfd, setMfd] = useState('');

  // Multi-level unit state
  const [multiLevelData, setMultiLevelData] = useState<MultiLevelInventoryItem>(getEmptyMultiLevelItem());

  // Legacy fields for backward compatibility
  const [quantityBoxes, setQuantityBoxes] = useState(0);
  const [quantityLoose, setQuantityLoose] = useState(0);
  const [unit, setUnit] = useState('กล่อง');

  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [isProductCodeOpen, setIsProductCodeOpen] = useState(false);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [productCodeInputValue, setProductCodeInputValue] = useState('');

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
        setProductCodeInputValue(existingItem.sku);
        setLot(existingItem.lot || '');
        setMfd(existingItem.mfd || '');
        setQuantityBoxes(existingItem.unit_level1_quantity || (existingItem as any).carton_quantity_legacy || 0);
        setQuantityLoose(existingItem.unit_level2_quantity || (existingItem as any).box_quantity_legacy || 0);
        setUnit((existingItem as any).unit || 'กล่อง');

        // Load multi-level data if available
        const extendedItem = existingItem as any;
        setMultiLevelData({
          unit_level1_name: extendedItem.unit_level1_name || null,
          unit_level1_quantity: extendedItem.unit_level1_quantity || 0,
          unit_level1_conversion_rate: extendedItem.unit_level1_conversion_rate || 0,
          unit_level2_name: extendedItem.unit_level2_name || null,
          unit_level2_quantity: extendedItem.unit_level2_quantity || 0,
          unit_level2_conversion_rate: extendedItem.unit_level2_conversion_rate || 0,
          unit_level3_name: extendedItem.unit_level3_name || 'ชิ้น',
          unit_level3_quantity: extendedItem.unit_level3_quantity || 0,
        });
      } else {
        // Adding new item
        setProductName('');
        setProductCode('');
        setProductCodeInputValue('');
        setLot('');
        setMfd('');
        setQuantityBoxes(0);
        setQuantityLoose(0);
        setUnit('กล่อง');
        setMultiLevelData(getEmptyMultiLevelItem());
      }
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
    if (!productCodeInputValue) return allProductCodes;
    return allProductCodes.filter(code =>
      code.toLowerCase().includes(productCodeInputValue.toLowerCase()) ||
      PRODUCT_NAME_MAPPING[code]?.toLowerCase().includes(productCodeInputValue.toLowerCase())
    );
  }, [allProductCodes, productCodeInputValue]);

  // Check if product code exists
  const checkIfNewProduct = (code: string) => {
    if (!code.trim()) return false;

    const existsInMapping = !!PRODUCT_NAME_MAPPING[code.toUpperCase()];
    const existsInDatabase = products.some(
      product => product.sku_code.toLowerCase() === code.toLowerCase()
    );

    return !existsInMapping && !existsInDatabase;
  };

  // Handle input value change for product code search
  const handleProductCodeInputChange = (value: string) => {
    setProductCodeInputValue(value);

    // Auto-update product code and name while typing
    setProductCode(value);
    setIsNewProduct(checkIfNewProduct(value));

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

  // Handle selection from combobox
  const handleProductCodeSelect = (value: string) => {
    setIsProductCodeOpen(false);
    setProductCodeInputValue(value);
    setProductCode(value);
    setIsNewProduct(checkIfNewProduct(value));

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
    }
  };

  // Handle keyboard events for product code input
  const handleProductCodeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsProductCodeOpen(false);
      // If there's exactly one filtered result, select it
      if (filteredProductCodes.length === 1) {
        handleProductCodeSelect(filteredProductCodes[0]);
      }
    } else if (e.key === 'Escape') {
      setIsProductCodeOpen(false);
    } else if (e.key === 'ArrowDown' && !isProductCodeOpen) {
      setIsProductCodeOpen(true);
    }
  };

  // Update multi-level data helper
  const updateMultiLevelData = (updates: Partial<MultiLevelInventoryItem>) => {
    setMultiLevelData(prev => ({ ...prev, ...updates }));
  };

  // Calculate total base quantity for display
  const totalBaseQuantity = useMemo(() => {
    return calculateTotalBaseQuantity(multiLevelData);
  }, [multiLevelData]);

  const handleSave = () => {
    if (!productName.trim() || !productCode.trim()) {
      return;
    }

    // Validate unit data
    const validation = validateUnitData(multiLevelData);
    if (!validation.isValid) {
      // Show validation errors (you can implement toast notifications here)
      console.error('Validation errors:', validation.errors);
      return;
    }

    onSave({
      product_name: productName.trim(),
      product_code: productCode.trim(),
      location,
      lot: lot.trim() || undefined,
      mfd: mfd || undefined,
      // Legacy fields (for backward compatibility)
      quantity_boxes: quantityBoxes,
      quantity_loose: quantityLoose,
      unit: unit,
      // Multi-level unit data
      unit_level1_name: multiLevelData.unit_level1_name,
      unit_level1_quantity: multiLevelData.unit_level1_quantity,
      unit_level1_conversion_rate: multiLevelData.unit_level1_conversion_rate,
      unit_level2_name: multiLevelData.unit_level2_name,
      unit_level2_quantity: multiLevelData.unit_level2_quantity,
      unit_level2_conversion_rate: multiLevelData.unit_level2_conversion_rate,
      unit_level3_name: multiLevelData.unit_level3_name,
      unit_level3_quantity: multiLevelData.unit_level3_quantity,
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white">
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
              {isNewProduct && (
                <Badge variant="secondary" className="ml-auto">
                  <Plus className="h-3 w-3 mr-1" />
                  สินค้าใหม่
                </Badge>
              )}
            </Label>
            <Input
              id="productName"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder={isNewProduct ? "กรอกชื่อสินค้าใหม่" : "กรอกชื่อสินค้า"}
              className={isNewProduct ? "border-orange-300 focus:border-orange-500" : ""}
            />
            {isNewProduct && (
              <p className="text-xs text-orange-600">
                💡 สินค้าใหม่ที่ยังไม่มีในระบบ กรุณากรอกชื่อสินค้า
              </p>
            )}
          </div>

          {/* Product Code */}
          <div className="space-y-2">
            <Label htmlFor="productCode" className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              รหัสสินค้า *
              {isNewProduct && (
                <Badge variant="secondary" className="ml-auto">
                  <Plus className="h-3 w-3 mr-1" />
                  สินค้าใหม่
                </Badge>
              )}
            </Label>
            <div className="relative">
              <Input
                id="productCode"
                type="text"
                value={productCodeInputValue}
                onChange={(e) => {
                  handleProductCodeInputChange(e.target.value);
                  setIsProductCodeOpen(true);
                }}
                onFocus={() => setIsProductCodeOpen(true)}
                onKeyDown={handleProductCodeKeyDown}
                onBlur={(e) => {
                  // Delay closing to allow for clicks on dropdown items
                  setTimeout(() => {
                    if (!e.currentTarget.contains(document.activeElement)) {
                      setIsProductCodeOpen(false);
                    }
                  }, 150);
                }}
                placeholder="กรอกรหัสสินค้า (เช่น L8A-40G)"
                className="font-mono pr-10"
                autoComplete="off"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setIsProductCodeOpen(!isProductCodeOpen)}
              >
                <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
              </Button>
              {(isProductCodeOpen && (filteredProductCodes.length > 0 || productCodeInputValue)) && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-md">
                  <Command shouldFilter={false}>
                    <CommandList className="max-h-60 overflow-auto">
                      {productCodeInputValue && filteredProductCodes.length === 0 && (
                        <CommandEmpty>
                          <div className="p-3">
                            <div className="flex items-center gap-2 text-sm text-green-700">
                              <Plus className="h-4 w-4" />
                              สร้างรหัสสินค้าใหม่:
                              <code className="font-mono font-bold bg-green-50 px-1 rounded">{productCodeInputValue}</code>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              กด Enter เพื่อใช้รหัสนี้
                            </div>
                          </div>
                        </CommandEmpty>
                      )}
                      {filteredProductCodes.length > 0 && (
                        <CommandGroup heading="รหัสสินค้าที่มีอยู่">
                          {filteredProductCodes.map((code) => {
                            const productName = PRODUCT_NAME_MAPPING[code.toUpperCase()] ||
                              products.find(p => p.sku_code.toLowerCase() === code.toLowerCase())?.product_name;

                            return (
                              <CommandItem
                                key={code}
                                value={code}
                                onSelect={() => {
                                  handleProductCodeSelect(code);
                                  setIsProductCodeOpen(false);
                                }}
                                className="cursor-pointer"
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    productCodeInputValue === code ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                <div className="flex flex-col">
                                  <span className="font-mono font-medium">{code}</span>
                                  {productName && (
                                    <span className="text-xs text-muted-foreground truncate">
                                      {productName}
                                    </span>
                                  )}
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </div>
              )}
            </div>
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

          {/* Unit Selection */}
          <div className="space-y-2">
            <Label htmlFor="unit" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              หน่วยนับ *
            </Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกหน่วยนับ" />
              </SelectTrigger>
              <SelectContent>
                {UNIT_OPTIONS.map((unitOption) => (
                  <SelectItem key={unitOption.value} value={unitOption.value}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{unitOption.emoji}</span>
                      <span>{unitOption.value}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Multi-Level Unit System */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calculator className="h-4 w-4" />
                ระบบหน่วยหลายชั้น
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Level 1 Unit (Largest - e.g., ลัง) */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">หน่วยชั้นที่ 1 (ใหญ่สุด - เช่น ลัง, หีบ)</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">ชื่อหน่วย</Label>
                    <Select
                      value={multiLevelData.unit_level1_name || ''}
                      onValueChange={(value) => updateMultiLevelData({ unit_level1_name: value || null })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="เลือกหน่วย" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">ไม่ใช้</SelectItem>
                        {['ลัง', 'หีบ', 'โหล', 'ตัน', 'กระสอบ'].map(unitName => (
                          <SelectItem key={unitName} value={unitName}>{unitName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">จำนวน</Label>
                    <Input
                      type="number"
                      min="0"
                      className="h-8"
                      value={multiLevelData.unit_level1_quantity}
                      onChange={(e) => updateMultiLevelData({ unit_level1_quantity: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">= กี่ชิ้น</Label>
                    <Input
                      type="number"
                      min="0"
                      className="h-8"
                      placeholder="เช่น 504"
                      value={multiLevelData.unit_level1_conversion_rate || ''}
                      onChange={(e) => updateMultiLevelData({ unit_level1_conversion_rate: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              {/* Level 2 Unit (Middle - e.g., กล่อง) */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">หน่วยชั้นที่ 2 (กลาง - เช่น กล่อง, แพ็ค)</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">ชื่อหน่วย</Label>
                    <Select
                      value={multiLevelData.unit_level2_name || ''}
                      onValueChange={(value) => updateMultiLevelData({ unit_level2_name: value || null })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="เลือกหน่วย" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">ไม่ใช้</SelectItem>
                        {['กล่อง', 'แพ็ค', 'มัด', 'ซอง', 'ถุง'].map(unitName => (
                          <SelectItem key={unitName} value={unitName}>{unitName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">จำนวน</Label>
                    <Input
                      type="number"
                      min="0"
                      className="h-8"
                      value={multiLevelData.unit_level2_quantity}
                      onChange={(e) => updateMultiLevelData({ unit_level2_quantity: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">= กี่ชิ้น</Label>
                    <Input
                      type="number"
                      min="0"
                      className="h-8"
                      placeholder="เช่น 6"
                      value={multiLevelData.unit_level2_conversion_rate || ''}
                      onChange={(e) => updateMultiLevelData({ unit_level2_conversion_rate: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              {/* Level 3 Unit (Base - e.g., ชิ้น) */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">หน่วยพื้นฐาน (เช่น ชิ้น, หลวม)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">ชื่อหน่วยพื้นฐาน</Label>
                    <Select
                      value={multiLevelData.unit_level3_name || 'ชิ้น'}
                      onValueChange={(value) => updateMultiLevelData({ unit_level3_name: value })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['ชิ้น', 'หลวม', 'อัน', 'แผง', 'ขวด', 'กิโลกรัม'].map(unitName => (
                          <SelectItem key={unitName} value={unitName}>{unitName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">จำนวนหลวม</Label>
                    <Input
                      type="number"
                      min="0"
                      className="h-8"
                      value={multiLevelData.unit_level3_quantity}
                      onChange={(e) => updateMultiLevelData({ unit_level3_quantity: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              {/* Calculation Display */}
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center">
                  <div>
                    <Label className="text-sm font-medium">สรุป:</Label>
                    <p className="text-sm text-muted-foreground">{formatUnitsDisplay(multiLevelData) || 'ไม่มีข้อมูล'}</p>
                  </div>
                  <div className="text-right">
                    <Label className="text-sm font-medium">รวมทั้งหมด:</Label>
                    <p className="text-lg font-bold text-primary">{formatTotalQuantity(multiLevelData)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Legacy Quantities (Hidden by default, can be toggled) */}
          <details className="space-y-2">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              ระบบเดิม (กล่อง/เศษ) - สำหรับข้อมูลเก่า
            </summary>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="quantityBoxes" className="flex items-center gap-2">
                  {UNIT_OPTIONS.find(u => u.value === unit)?.emoji || '📦'}
                  จำนวน{unit} (กล่อง)
                </Label>
                <Input
                  id="quantityBoxes"
                  type="number"
                  min="0"
                  value={quantityBoxes}
                  onChange={(e) => setQuantityBoxes(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantityLoose" className="flex items-center gap-2">
                  {UNIT_OPTIONS.find(u => u.value === unit)?.emoji || '📝'}
                  จำนวน{unit} (เศษ)
                </Label>
                <Input
                  id="quantityLoose"
                  type="number"
                  min="0"
                  value={quantityLoose}
                  onChange={(e) => setQuantityLoose(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </details>
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