import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
// Command components removed - using custom dropdown instead
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Hash, Calendar, MapPin, Search, Calculator, Check, ChevronsUpDown, Plus } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { PRODUCT_NAME_MAPPING, PRODUCT_TYPES, getProductsByType, type ProductType } from '@/data/sampleInventory';
import { useProducts } from '@/contexts/ProductsContext';
import { productHelpers } from '@/utils/productHelpers';
import { CompactWarehouseSelector } from '@/components/WarehouseSelector';
import { useDefaultWarehouse } from '@/hooks/useWarehouse';

type Product = Database['public']['Tables']['products']['Row'];

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: {
    product_name: string;
    product_code: string;
    product_type?: string;
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
    warehouse_id?: string | null;
    user_id?: string | null;
  }) => void;
  location: string;
  existingItem?: InventoryItem;
}


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

  const { products } = useProducts();
  const [productSearch, setProductSearch] = useState('');
  const [isProductCodeOpen, setIsProductCodeOpen] = useState(false);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [productCodeInputValue, setProductCodeInputValue] = useState('');

  // Product type selection state
  const [conversionRates, setConversionRates] = useState<any[]>([]);
  const [selectedProductType, setSelectedProductType] = useState<ProductType | ''>('');

  // Warehouse selection state
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | undefined>();
  const { data: defaultWarehouse } = useDefaultWarehouse();

  // Load conversion rates from products table
  const loadConversionRates = async () => {
    try {
      console.log('InventoryModal: Loading conversion rates...');
      // Use products table instead of product_conversion_rates
      const { data, error } = await supabase
        .from('products')
        .select('id, sku_code, product_name, unit_of_measure');

      if (error) throw error;
      setConversionRates(data || []);
      console.log('InventoryModal: Loaded', data?.length || 0, 'conversion rates');
    } catch (error) {
      console.error('Error loading conversion rates:', error);
    }
  };

  // Get conversion rate for current product code
  const getCurrentConversionRate = useMemo(() => {
    return conversionRates.find(rate => rate.sku === productCode);
  }, [conversionRates, productCode]);

  // Load conversion rates when modal opens
  useEffect(() => {
    if (isOpen) {
      loadConversionRates();
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

        // Load quantities only - unit names/rates will be loaded from conversion rates
        const extendedItem = existingItem as any;
        setMultiLevelData({
          unit_level1_name: null, // Will be set from conversion rates
          unit_level1_quantity: extendedItem.unit_level1_quantity || 0,
          unit_level1_conversion_rate: 0, // Will be set from conversion rates
          unit_level2_name: null, // Will be set from conversion rates
          unit_level2_quantity: extendedItem.unit_level2_quantity || 0,
          unit_level2_conversion_rate: 0, // Will be set from conversion rates
          unit_level3_name: 'ชิ้น', // Will be set from conversion rates
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
        setSelectedProductType('');
      }
      setProductSearch('');

      // Set default warehouse for new items
      if (!existingItem && defaultWarehouse) {
        setSelectedWarehouseId(defaultWarehouse.id);
      } else if (existingItem) {
        setSelectedWarehouseId(existingItem.warehouse_id || defaultWarehouse?.id);
      }
    }
  }, [isOpen, existingItem, defaultWarehouse]);

  // Update unit names and rates when conversion rates are loaded or product code changes
  useEffect(() => {
    if (getCurrentConversionRate && productCode) {
      setMultiLevelData(prev => ({
        ...prev,
        unit_level1_name: getCurrentConversionRate.unit_level1_name || 'ลัง',
        unit_level1_conversion_rate: getCurrentConversionRate.unit_level1_rate || 1,
        unit_level2_name: getCurrentConversionRate.unit_level2_name || 'กล่อง',
        unit_level2_conversion_rate: getCurrentConversionRate.unit_level2_rate || 1,
        unit_level3_name: getCurrentConversionRate.unit_level3_name || 'ชิ้น',
      }));
    }
  }, [getCurrentConversionRate, productCode]);


  // Get all available product codes filtered by product type
  const allProductCodes = useMemo(() => {
    return productHelpers.getAllProductCodes(products, selectedProductType);
  }, [products, selectedProductType]);

  // Filter product codes based on search
  const filteredProductCodes = useMemo(() => {
    return productHelpers.getFilteredProductCodes(products, productCodeInputValue, selectedProductType);
  }, [products, productCodeInputValue, selectedProductType]);

  // Check if product code exists - wrapped in useCallback to prevent recreation
  const checkIfNewProduct = useCallback((code: string) => {
    return productHelpers.isNewProduct(products, code);
  }, [products]);

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

    // ค้นหาจาก products database using helper
    const displayName = productHelpers.getProductDisplayName(products, value);
    if (displayName) {
      setProductName(displayName);
    } else if (value === '') {
      // ถ้าลบรหัสสินค้าออกหมด ให้ลบชื่อสินค้าด้วย
      setProductName('');
    }
  };

  // Handle selection from combobox
  const handleProductCodeSelect = useCallback((value: string) => {
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
  }, [products, checkIfNewProduct]);

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

    // Require product type for new products
    if (isNewProduct && !selectedProductType) {
      console.error('Product type is required for new products');
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
      product_type: selectedProductType || 'FG', // Default to FG if no type selected
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
      warehouse_id: selectedWarehouseId,
      user_id: '00000000-0000-0000-0000-000000000000' // Default user ID for system
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

          {/* Warehouse Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Warehouse *
            </Label>
            <CompactWarehouseSelector
              selectedWarehouseId={selectedWarehouseId}
              onWarehouseChange={setSelectedWarehouseId}
              showAllOption={false}
            />
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
                  // Increase delay to allow for mouse events
                  setTimeout(() => {
                    const activeElement = document.activeElement;
                    const currentTarget = e.currentTarget;
                    const isClickingOnDropdown = activeElement &&
                      (activeElement.closest('[role="option"]') ||
                       activeElement.closest('.command-item'));

                    if (!currentTarget.contains(activeElement) && !isClickingOnDropdown) {
                      setIsProductCodeOpen(false);
                    }
                  }, 200); // Balanced delay for onMouseDown
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
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-md max-h-60 overflow-auto">
                  {/* New Product Creation Option */}
                  {productCodeInputValue && filteredProductCodes.length === 0 && (
                    <div className="p-3 border-b">
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <Plus className="h-4 w-4" />
                        สร้างรหัสสินค้าใหม่:
                        <code className="font-mono font-bold bg-green-50 px-1 rounded">{productCodeInputValue}</code>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        กด Enter เพื่อใช้รหัสนี้
                      </div>
                    </div>
                  )}

                  {/* Product List */}
                  {filteredProductCodes.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b bg-muted/50">
                        รหัสสินค้าที่มีอยู่ ({filteredProductCodes.length} รายการ)
                      </div>
                      {filteredProductCodes.map((code) => {
                        const productInfo = productHelpers.getProductDisplayInfo(products, code);

                        return (
                          <div
                            key={code}
                            className="px-3 py-2 cursor-pointer hover:bg-muted/50 flex items-center gap-2 border-b border-muted/30 last:border-b-0"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleProductCodeSelect(code);
                            }}
                          >
                            <Check
                              className={`h-4 w-4 ${
                                productCodeInputValue === code ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="font-mono font-medium">{code}</span>
                              {productInfo.name && (
                                <div className="flex flex-col text-xs text-muted-foreground">
                                  <span className="truncate">{productInfo.name}</span>
                                  {productInfo.brand && productInfo.category && (
                                    <span className="text-xs opacity-60">
                                      {productInfo.brand} • {productInfo.category}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
            disabled={!productName.trim() || !productCode.trim() || (isNewProduct && !selectedProductType)}
          >
            บันทึก
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}