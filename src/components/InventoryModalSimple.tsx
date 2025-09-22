import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Package, Hash, Calendar, MapPin, Calculator, Info, Check, ChevronsUpDown, Plus, AlertTriangle } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { normalizeLocation } from '@/utils/locationUtils';
import type { InventoryItem } from '@/hooks/useInventory';
import type { Database } from '@/integrations/supabase/types';
import { PRODUCT_NAME_MAPPING, PRODUCT_TYPES, getProductsByType, type ProductType } from '@/data/sampleInventory';
import { useProducts } from '@/contexts/ProductsContext';

type Product = Database['public']['Tables']['products']['Row'];

interface ConversionRate {
  sku: string;
  product_name: string;
  unit_level1_name?: string;
  unit_level1_rate: number;
  unit_level2_name?: string;
  unit_level2_rate: number;
  unit_level3_name: string;
}

interface InventoryModalSimpleProps {
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
    unit?: string;
    // Multi-level unit data
    unit_level1_quantity?: number;
    unit_level2_quantity?: number;
    unit_level3_quantity?: number;
    unit_level1_name?: string | null;
    unit_level2_name?: string | null;
    unit_level3_name?: string;
    unit_level1_rate?: number;
    unit_level2_rate?: number;
  }) => void;
  location: string;
  existingItem?: InventoryItem;
  otherItemsAtLocation?: InventoryItem[];
}


export function InventoryModalSimple({ isOpen, onClose, onSave, location, existingItem, otherItemsAtLocation }: InventoryModalSimpleProps) {
  // Form state
  const [productName, setProductName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [lot, setLot] = useState('');
  const [mfd, setMfd] = useState('');
  const { products } = useProducts();
  const [isProductCodeOpen, setIsProductCodeOpen] = useState(false);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [productCodeInputValue, setProductCodeInputValue] = useState('');

  // Conversion rates
  const [conversionRate, setConversionRate] = useState<ConversionRate | null>(null);
  const [loadingConversion, setLoadingConversion] = useState(false);

  // Simple unit quantities
  const [level1Quantity, setLevel1Quantity] = useState(0);
  const [level2Quantity, setLevel2Quantity] = useState(0);
  const [level3Quantity, setLevel3Quantity] = useState(0);

  // Product type selection state
  const [selectedProductType, setSelectedProductType] = useState<ProductType | ''>('');

  const loadConversionRate = useCallback(async (sku: string, currentProductName = '') => {
    if (!sku.trim()) {
      setConversionRate(null);
      return;
    }

    try {
      setLoadingConversion(true);
      // For now, use a mock data structure since product_conversion_rates table doesn't exist
      const mockData: ConversionRate = {
        sku: sku.toUpperCase(),
        product_name: currentProductName || '',
        unit_level1_name: 'ลัง',
        unit_level1_rate: 100,
        unit_level2_name: 'กล่อง',
        unit_level2_rate: 10,
        unit_level3_name: 'ชิ้น',
      };

      // For L-series products, use specific rates
      if (sku.startsWith('L')) {
        mockData.unit_level1_rate = 504; // 1 ลัง = 504 ชิ้น
        mockData.unit_level2_rate = 6;   // 1 กล่อง = 6 ชิ้น
      }

      setConversionRate(mockData);
    } catch (error) {
      console.error('Error loading conversion rate:', error);
    } finally {
      setLoadingConversion(false);
    }
  }, []); // Removed productName dependency to prevent unnecessary recreations


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

        // Load quantities
        const extendedItem = existingItem as any;
        setLevel1Quantity(extendedItem.unit_level1_quantity || 0);
        setLevel2Quantity(extendedItem.unit_level2_quantity || 0);
        setLevel3Quantity(extendedItem.unit_level3_quantity || 0);

        loadConversionRate(existingItem.sku, existingItem.product_name);
      } else {
        // Adding new item
        setProductName('');
        setProductCode('');
        setProductCodeInputValue('');
        setLot('');
        setMfd('');
        setLevel1Quantity(0);
        setLevel2Quantity(0);
        setLevel3Quantity(0);
        setConversionRate(null);
        setSelectedProductType('');
      }
    }
  }, [isOpen, existingItem]); // eslint-disable-line react-hooks/exhaustive-deps
  // Note: loadConversionRate intentionally excluded to prevent unnecessary re-renders and duplicate calls


  // Get all available product codes filtered by product type
  const allProductCodes = useMemo(() => {
    if (!selectedProductType) {
      // If no product type selected, show all products
      const mappingCodes = Object.keys(PRODUCT_NAME_MAPPING);
      const dbCodes = products.map(p => p.sku_code);
      const allCodes = [...new Set([...mappingCodes, ...dbCodes])];
      return allCodes.sort();
    }

    // Filter products by selected type
    const typedProducts = getProductsByType(selectedProductType);
    const typedCodes = typedProducts.map(p => p.code);

    // Filter database products to only include those matching the selected type
    const dbCodes = products
      .filter(p => p.product_type === selectedProductType)
      .map(p => p.sku_code);

    const allCodes = [...new Set([...typedCodes, ...dbCodes])];
    return allCodes.sort();
  }, [products, selectedProductType]);

  // Filter product codes based on search
  const filteredProductCodes = useMemo(() => {
    if (!productCodeInputValue) return allProductCodes;
    return allProductCodes.filter(code =>
      code.toLowerCase().includes(productCodeInputValue.toLowerCase()) ||
      PRODUCT_NAME_MAPPING[code]?.toLowerCase().includes(productCodeInputValue.toLowerCase())
    );
  }, [allProductCodes, productCodeInputValue]);

  // Auto-fill product name when product code changes
  const handleProductCodeChange = (value: string) => {
    setProductCode(value);
    setProductCodeInputValue(value); // Ensure input value stays in sync

    // Load conversion rate
    if (value) {
      loadConversionRate(value, productName);
    } else {
      setConversionRate(null);
    }

    // Auto-fill product name from mapping
    const mappedName = PRODUCT_NAME_MAPPING[value];
    if (mappedName && !productName) {
      setProductName(mappedName);
    }

    // Check if it's a new product
    setIsNewProduct(checkIfNewProduct(value));
  };

  // Check if product code is new (not in mapping or DB)
  const checkIfNewProduct = (code: string) => {
    if (!code.trim()) return false;
    const existsInMapping = !!PRODUCT_NAME_MAPPING[code.toUpperCase()];
    const existsInDatabase = products.some(
      product => product.sku_code.toLowerCase() === code.toLowerCase()
    );
    return !existsInMapping && !existsInDatabase;
  };

  // Handle free typing in product code input
  const handleProductCodeInputChange = (value: string) => {
    setProductCodeInputValue(value);
    handleProductCodeChange(value);
    setIsNewProduct(checkIfNewProduct(value));
  };

  // Handle selecting a code from the suggestion list
  const handleProductCodeSelect = (value: string) => {
    console.log('🔍 handleProductCodeSelect called with:', value);
    setProductCodeInputValue(value);
    setProductCode(value);
    handleProductCodeChange(value);
    setIsNewProduct(checkIfNewProduct(value));
    setIsProductCodeOpen(false);
    console.log('✅ handleProductCodeSelect completed, input value should be:', value);
  };

  // Keyboard handler for product code input
  const handleProductCodeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsProductCodeOpen(false);
      if (filteredProductCodes.length === 1) {
        handleProductCodeSelect(filteredProductCodes[0]);
      }
    } else if (e.key === 'Escape') {
      setIsProductCodeOpen(false);
    } else if (e.key === 'ArrowDown' && !isProductCodeOpen) {
      setIsProductCodeOpen(true);
    }
  };

  // Calculate total base quantity
  const totalBaseQuantity = useMemo(() => {
    if (!conversionRate) return level3Quantity;

    const level1Total = level1Quantity * (conversionRate.unit_level1_rate || 0);
    const level2Total = level2Quantity * (conversionRate.unit_level2_rate || 0);
    const level3Total = level3Quantity;

    return level1Total + level2Total + level3Total;
  }, [level1Quantity, level2Quantity, level3Quantity, conversionRate]);

  // Format calculation display
  const calculationDisplay = useMemo(() => {
    if (!conversionRate) return `${level3Quantity} ${conversionRate?.unit_level3_name || 'ชิ้น'}`;

    const parts: string[] = [];

    if (level1Quantity > 0 && conversionRate.unit_level1_name) {
      parts.push(`${level1Quantity}×${conversionRate.unit_level1_rate}`);
    }
    if (level2Quantity > 0 && conversionRate.unit_level2_name) {
      parts.push(`${level2Quantity}×${conversionRate.unit_level2_rate}`);
    }
    if (level3Quantity > 0) {
      parts.push(`${level3Quantity}×1`);
    }

    const calculation = parts.length > 0 ? `(${parts.join(' + ')})` : '';
    return `${calculation} = ${totalBaseQuantity.toLocaleString('th-TH')} ${conversionRate.unit_level3_name}`;
  }, [level1Quantity, level2Quantity, level3Quantity, conversionRate, totalBaseQuantity]);

  const handleSave = () => {
    if (!productName.trim() || !productCode.trim()) {
      return;
    }

    const dataToSave = {
      product_name: productName.trim(),
      product_code: productCode.trim(), // Keep for interface compatibility
      sku: productCode.trim(), // Add for database compatibility
      location: location,
      lot: lot.trim() || null,
      mfd: mfd || null,
      // Legacy fields for backward compatibility - map to interface names
      quantity_boxes: level1Quantity, // Interface expects this name
      quantity_loose: level2Quantity, // Interface expects this name
      carton_quantity_legacy: level1Quantity, // Database field
      box_quantity_legacy: level2Quantity, // Database field
      pieces_quantity_legacy: level3Quantity, // Database field
      quantity_pieces: level3Quantity,
      unit: conversionRate?.unit_level3_name || 'ชิ้น',
      // Multi-level unit data - ข้อมูลหน่วยใหม่
      unit_level1_quantity: level1Quantity,
      unit_level2_quantity: level2Quantity,
      unit_level3_quantity: level3Quantity,
      unit_level1_name: conversionRate?.unit_level1_name || null,
      unit_level2_name: conversionRate?.unit_level2_name || null,
      unit_level3_name: conversionRate?.unit_level3_name || 'ชิ้น',
      // Add conversion rates for calculation
      unit_level1_rate: conversionRate?.unit_level1_rate || 0,
      unit_level2_rate: conversionRate?.unit_level2_rate || 0,
    };


    onSave(dataToSave);

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
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

          {/* Warning for Multiple Items at Location */}
          {otherItemsAtLocation && otherItemsAtLocation.length > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <div className="text-sm font-medium text-yellow-800">
                    ⚠️ มีสินค้าอื่นในตำแหน่งนี้แล้ว
                  </div>
                  <div className="text-sm text-yellow-700">
                    พบ {otherItemsAtLocation.length} รายการสินค้าในตำแหน่ง {location}:
                  </div>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {otherItemsAtLocation.map((item, index) => (
                      <div key={item.id} className="text-xs text-yellow-700 bg-yellow-100 p-2 rounded">
                        {index + 1}. {item.product_name} (SKU: {item.sku})
                        {item.lot && ` - LOT: ${item.lot}`}
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-yellow-600 mt-2">
                    💡 การเพิ่มสินค้าใหม่จะไม่มีผลต่อสินค้าที่มีอยู่แล้ว
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Product Type Selector */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              ประเภทสินค้า *
            </Label>
            <Select
              value={selectedProductType}
              onValueChange={(value: ProductType) => {
                setSelectedProductType(value);
                // Reset product code when changing type
                setProductCode('');
                setProductCodeInputValue('');
                setProductName('');
                setIsNewProduct(false);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="เลือกประเภทสินค้า" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PRODUCT_TYPES.FG}>
                  🏷️ FG - สินค้าสำเร็จรูป (Finished Goods)
                </SelectItem>
                <SelectItem value={PRODUCT_TYPES.PK}>
                  📦 PK - วัสดุบรรจุภัณฑ์ (Packaging)
                </SelectItem>
              </SelectContent>
            </Select>
            {selectedProductType && (
              <p className="text-xs text-muted-foreground">
                {selectedProductType === PRODUCT_TYPES.FG
                  ? '💡 สินค้าสำเร็จรูปพร้อมขาย'
                  : '💡 วัสดุบรรจุภัณฑ์และอุปกรณ์'
                }
              </p>
            )}
          </div>

          {/* Product Code */}
          <div className="space-y-2">
            <Label htmlFor="productCode" className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              รหัสสินค้า *
            </Label>
            <div className="relative">
              <Input
                id="productCode"
                type="text"
                value={productCodeInputValue}
                onChange={(e) => {
                  console.log('📝 Input onChange:', e.target.value);
                  handleProductCodeInputChange(e.target.value);
                  setIsProductCodeOpen(true);
                }}
                onFocus={() => {
                  console.log('🎯 Input focused, current value:', productCodeInputValue);
                  setIsProductCodeOpen(true);
                }}
                onKeyDown={handleProductCodeKeyDown}
                onBlur={(e) => {
                  setTimeout(() => {
                    if (e.currentTarget && document.activeElement && !e.currentTarget.contains(document.activeElement)) {
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
                          {filteredProductCodes.map((code) => (
                            <CommandItem
                              key={code}
                              value={code}
                              onSelect={() => {
                                handleProductCodeSelect(code);
                              }}
                              className="cursor-pointer"
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  productCodeInputValue === code ? 'opacity-100' : 'opacity-0'
                                }`}
                              />
                              <div className="flex flex-col">
                                <span className="font-mono font-medium">{code}</span>
                                {PRODUCT_NAME_MAPPING[code] && (
                                  <span className="text-xs text-muted-foreground">
                                    {PRODUCT_NAME_MAPPING[code]}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </div>
              )}
            </div>
            {isNewProduct && (
              <p className="text-xs text-orange-600">
                💡 สินค้าใหม่ที่ยังไม่มีในระบบ กรุณากรอกชื่อสินค้า
              </p>
            )}
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

          {/* Unit Quantities */}
          {conversionRate ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calculator className="h-4 w-4" />
                  จำนวนสินค้า
                </CardTitle>
                {loadingConversion && (
                  <div className="text-sm text-muted-foreground">
                    กำลังโหลดการตั้งค่าอัตราแปลง...
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Level 1 Unit */}
                  {conversionRate.unit_level1_name && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        {conversionRate.unit_level1_name}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={level1Quantity}
                        onChange={(e) => setLevel1Quantity(parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="text-center"
                      />
                      <div className="text-xs text-muted-foreground text-center">
                        1 {conversionRate.unit_level1_name} = {conversionRate.unit_level1_rate.toLocaleString('th-TH')} {conversionRate.unit_level3_name}
                      </div>
                    </div>
                  )}

                  {/* Level 2 Unit */}
                  {conversionRate.unit_level2_name && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        {conversionRate.unit_level2_name}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={level2Quantity}
                        onChange={(e) => setLevel2Quantity(parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="text-center"
                      />
                      <div className="text-xs text-muted-foreground text-center">
                        1 {conversionRate.unit_level2_name} = {conversionRate.unit_level2_rate.toLocaleString('th-TH')} {conversionRate.unit_level3_name}
                      </div>
                    </div>
                  )}

                  {/* Level 3 Unit (Base) */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      {conversionRate.unit_level3_name} (หลวม)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={level3Quantity}
                      onChange={(e) => setLevel3Quantity(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="text-center"
                    />
                    <div className="text-xs text-muted-foreground text-center">
                      หน่วยพื้นฐาน
                    </div>
                  </div>
                </div>

                {/* Calculation Display */}
                <div className="pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      <span className="font-medium">การคำนวณ:</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">{calculationDisplay}</div>
                      <div className="text-lg font-bold text-primary">
                        รวม: {totalBaseQuantity.toLocaleString('th-TH')} {conversionRate.unit_level3_name}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Manual input for all 3 levels when no conversion rate */
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-4 w-4" />
                  จำนวนสินค้า
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4" />
                  ไม่พบการตั้งค่าอัตราแปลง - กรอกจำนวนแยกตามหน่วย
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* ลัง */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">ลัง</Label>
                    <Input
                      type="number"
                      min="0"
                      value={level1Quantity}
                      onChange={(e) => setLevel1Quantity(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="text-center"
                    />
                  </div>

                  {/* กล่อง */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">กล่อง</Label>
                    <Input
                      type="number"
                      min="0"
                      value={level2Quantity}
                      onChange={(e) => setLevel2Quantity(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="text-center"
                    />
                  </div>

                  {/* ชิ้น */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">ชิ้น</Label>
                    <Input
                      type="number"
                      min="0"
                      value={level3Quantity}
                      onChange={(e) => setLevel3Quantity(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="text-center"
                    />
                  </div>
                </div>

                <div className="mt-4 text-xs text-muted-foreground text-center">
                  สามารถไปตั้งค่าอัตราแปลงหน่วยได้ที่แท็บ "ตั้งค่า" เพื่อการคำนวณอัตโนมัติ
                </div>
              </CardContent>
            </Card>
          )}
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