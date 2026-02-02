import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Package, Hash, Calendar, MapPin, Calculator, Info, Check, ChevronsUpDown, Plus, AlertTriangle } from 'lucide-react';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { InventoryItem } from '@/hooks/useInventory';
import type { Database } from '@/integrations/supabase/types';
import { PRODUCT_NAME_MAPPING, PRODUCT_TYPES, type ProductType } from '@/data/sampleInventory';
import { useProducts } from '@/contexts/ProductsContext';
import { useProductsSummary } from '@/hooks/useProductsSummary';
import { productHelpers } from '@/utils/productHelpers';

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
    warehouse_id?: string | null;
    user_id?: string | null;
  }) => void;
  location: string;
  existingItem?: InventoryItem;
  otherItemsAtLocation?: InventoryItem[];
  availableLocations?: string[]; // รายการตำแหน่งที่มีในระบบ
}


export function InventoryModalSimple({ isOpen, onClose, onSave, location, existingItem, otherItemsAtLocation, availableLocations = [] }: InventoryModalSimpleProps) {
  // Form state
  const [productName, setProductName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [lot, setLot] = useState('');
  const [mfd, setMfd] = useState('');
  const [editableLocation, setEditableLocation] = useState(location || ''); // สำหรับกรอก location เอง
  const { products } = useProducts();
  const { data: productsSummaryResult } = useProductsSummary();

  // ใช้ products จาก ProductsSummary ก่อน ถ้าไม่มีให้ fallback ไปใช้ useProducts
  const availableProducts = useMemo(() => {
    if (productsSummaryResult?.data) {
      // แปลง ProductSummary เป็น Product format สำหรับ productHelpers
      return productsSummaryResult.data.map(p => ({
        id: p.product_id,
        sku_code: p.sku,
        product_name: p.product_name,
        product_type: p.product_type,
        is_active: p.is_active,
        category: p.category,
        subcategory: p.subcategory,
        brand: p.brand,
        unit_of_measure: p.unit_of_measure,
        unit_cost: p.unit_cost,
        description: p.description,
        // เพิ่มฟิลด์ที่จำเป็นอื่นๆ ด้วยค่า default
        created_at: '',
        updated_at: '',
        dimensions: '',
        manufacturing_country: '',
        max_stock_level: 0,
        reorder_level: 0,
        weight: 0,
        storage_conditions: ''
      }));
    }
    return products;
  }, [productsSummaryResult, products]);
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

  const loadConversionRate = useCallback(async (sku: string, currentProductName?: string) => {
    if (!sku) return;

    setLoadingConversion(true);
    try {
      console.log('InventoryModalSimple: Loading conversion rate for SKU:', sku);

      // First, try to get conversion rate from product_conversion_rates table
      const { data: conversionData, error: conversionError } = await (supabase as any)
        .from('product_conversion_rates')
        .select('*')
        .eq('sku', sku)
        .maybeSingle();

      if (conversionError) {
        console.error('Error loading conversion rate:', conversionError);
      }

      if (conversionData) {
        console.log('InventoryModalSimple: Found conversion rate for', sku, ':', conversionData);
        setConversionRate({
          sku: conversionData.sku,
          product_name: conversionData.product_name || currentProductName || '',
          unit_level1_name: conversionData.unit_level1_name || 'ลัง',
          unit_level1_rate: conversionData.unit_level1_rate || 1,
          unit_level2_name: conversionData.unit_level2_name || 'กล่อง',
          unit_level2_rate: conversionData.unit_level2_rate || 1,
          unit_level3_name: conversionData.unit_level3_name || 'ชิ้น',
        });
      } else {
        // Fallback: Try to get product data from products table
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('sku_code', sku)
          .maybeSingle();

        if (productError) {
          console.error('Error loading product data:', productError);
        }

        if (productData) {
          console.log('InventoryModalSimple: Found product data for', sku, ', using default conversion rates');
          setConversionRate({
            sku: productData.sku_code || '',
            product_name: productData.product_name || currentProductName || '',
            unit_level1_name: 'ลัง',
            unit_level1_rate: 1,
            unit_level2_name: 'กล่อง',
            unit_level2_rate: 1,
            unit_level3_name: 'ชิ้น',
          });
        } else {
          console.log('InventoryModalSimple: No data found for', sku, ', using defaults');
          // Use default values if no data found
          setConversionRate({
            sku: sku.toUpperCase(),
            product_name: currentProductName || '',
            unit_level1_name: 'ลัง',
            unit_level1_rate: 1,
            unit_level2_name: 'กล่อง',
            unit_level2_rate: 1,
            unit_level3_name: 'ชิ้น',
          });
        }
      }
    } catch (error) {
      console.error('Error loading conversion rate:', error);
    } finally {
      setLoadingConversion(false);
    }
  }, []); // Removed productName dependency to prevent unnecessary recreations


  // Reset form when modal opens/closes or when existingItem changes
  useEffect(() => {
    if (isOpen) {
      // Sync editable location with prop
      setEditableLocation(location || '');

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
  }, [isOpen, existingItem, location]); // eslint-disable-line react-hooks/exhaustive-deps
  // Note: loadConversionRate intentionally excluded to prevent unnecessary re-renders and duplicate calls


  // Get available product types from database
  const availableProductTypes = useMemo(() => {
    return productHelpers.getAvailableProductTypes(availableProducts);
  }, [availableProducts]);

  // Get all available product codes filtered by product type
  const allProductCodes = useMemo(() => {
    return productHelpers.getAllProductCodes(availableProducts, selectedProductType);
  }, [availableProducts, selectedProductType]);

  // Filter product codes based on search - ใช้ availableProducts แทน products
  const filteredProductCodes = useMemo(() => {
    const filtered = productHelpers.getFilteredProductCodes(availableProducts, productCodeInputValue, selectedProductType);

    // Silent mode - debug logging disabled
    // console.log('🔍 InventoryModalSimple: Filtering products for location', {
    //   location,
    //   totalAvailableProducts: availableProducts.length,
    //   searchTerm: productCodeInputValue,
    //   selectedProductType,
    //   filteredCount: filtered.length,
    //   sampleFiltered: filtered.slice(0, 5),
    //   dataSource: productsSummaryResult?.data ? 'ProductsSummary' : 'ProductsContext'
    // });

    return filtered;
  }, [availableProducts, productCodeInputValue, selectedProductType, location, productsSummaryResult]);

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

    // Auto-fill product name from database first, then mapping
    const displayName = productHelpers.getProductDisplayName(availableProducts, value);
    if (displayName && !productName) {
      setProductName(displayName);
    }

    // Check if it's a new product
    setIsNewProduct(productHelpers.isNewProduct(availableProducts, value));
  };

  // Check if product code is new (not in mapping or DB) - Legacy function, now uses helper
  const checkIfNewProduct = (code: string) => {
    return productHelpers.isNewProduct(availableProducts, code);
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
  const handleProductCodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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

  // Get the actual location to use (from prop or editable field)
  const actualLocation = location || editableLocation;

  const handleSave = () => {
    if (!productName.trim() || !productCode.trim()) {
      return;
    }

    // Validate location
    if (!actualLocation.trim()) {
      return;
    }

    const dataToSave = {
      product_name: productName.trim(),
      product_code: productCode.trim(), // Keep for interface compatibility
      sku: productCode.trim(), // Add for database compatibility
      location: actualLocation.trim(),
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
      // Add warehouse and user information
      warehouse_id: 'c6f43c5a-3949-46fd-9165-a3cd6e0b7509', // Default to main warehouse
      user_id: '00000000-0000-0000-0000-000000000000', // Default user ID for system
    };


    onSave(dataToSave);

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full h-full sm:max-w-2xl sm:max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader className="p-4 sm:p-6">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Package className="h-4 w-4 sm:h-5 sm:w-5" />
            {existingItem ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {existingItem ? 'แก้ไขข้อมูลสินค้าในคลัง' : 'เพิ่มสินค้าใหม่เข้าสู่ระบบคลังสินค้า'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 py-2 sm:py-4 px-4 sm:px-6">
          {/* Location Display/Input */}
          {location ? (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="font-mono font-medium">ตำแหน่ง: {location}</span>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                ตำแหน่งจัดเก็บ *
              </Label>
              <div className="relative">
                <Input
                  id="location"
                  value={editableLocation}
                  onChange={(e) => setEditableLocation(e.target.value)}
                  placeholder="กรอกตำแหน่ง เช่น A1/1"
                  className="font-mono h-11 sm:h-10"
                  autoComplete="off"
                />
                {/* Location Suggestions Dropdown */}
                {editableLocation && availableLocations.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {availableLocations
                      .filter(loc =>
                        loc.toLowerCase().includes(editableLocation.toLowerCase())
                      )
                      .slice(0, 10)
                      .map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm font-mono hover:bg-muted/50 flex items-center gap-2"
                          onClick={() => setEditableLocation(loc)}
                        >
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {loc}
                        </button>
                      ))
                    }
                    {availableLocations.filter(loc =>
                      loc.toLowerCase().includes(editableLocation.toLowerCase())
                    ).length === 0 && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          ไม่พบตำแหน่ง "{editableLocation}" - จะสร้างใหม่
                        </div>
                      )}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                💡 กรอกตำแหน่งหรือเลือกจากรายการที่แนะนำ
              </p>
            </div>
          )}

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
              <SelectTrigger className="h-11 sm:h-10">
                <SelectValue placeholder="เลือกประเภทสินค้า" />
              </SelectTrigger>
              <SelectContent>
                {availableProductTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type === 'FG' ? '🏷️ FG - สินค้าสำเร็จรูป (Finished Goods)' :
                      type === 'PK' ? '📦 PK - วัสดุบรรจุภัณฑ์ (Packaging)' :
                        `📋 ${type} - ประเภทสินค้า`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProductType && (
              <p className="text-xs text-muted-foreground">
                {selectedProductType === 'FG'
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
                className="font-mono pr-10 h-11 sm:h-10"
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
                                className={`mr-2 h-4 w-4 ${productCodeInputValue === code ? 'opacity-100' : 'opacity-0'
                                  }`}
                              />
                              <div className="flex flex-col">
                                <span className="font-mono font-medium">{code}</span>
                                {(() => {
                                  const productInfo = productHelpers.getProductDisplayInfo(availableProducts, code);
                                  return productInfo.name && (
                                    <div className="flex flex-col text-xs text-muted-foreground">
                                      <span>{productInfo.name}</span>
                                      {productInfo.brand && productInfo.category && (
                                        <span className="text-xs opacity-60">
                                          {productInfo.brand} • {productInfo.category}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })()}
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
              className="h-11 sm:h-10"
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
              className="h-11 sm:h-10"
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
              className="h-11 sm:h-10"
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
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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
                        className="text-center h-11 sm:h-10"
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
                        className="text-center h-11 sm:h-10"
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
                      className="text-center h-11 sm:h-10"
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  {/* ลัง */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">ลัง</Label>
                    <Input
                      type="number"
                      min="0"
                      value={level1Quantity}
                      onChange={(e) => setLevel1Quantity(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="text-center h-11 sm:h-10"
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
                      className="text-center h-11 sm:h-10"
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
                      className="text-center h-11 sm:h-10"
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
        <div className="flex gap-2 pt-3 sm:pt-4 px-4 sm:px-6 pb-4">
          <Button variant="outline" onClick={onClose} className="flex-1 h-11 sm:h-10">
            ยกเลิก
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 h-11 sm:h-10"
            disabled={!productName.trim() || !productCode.trim() || !actualLocation.trim()}
          >
            บันทึก
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}