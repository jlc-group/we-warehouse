import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Package, MapPin, Plus, Minus, Search, Hash, Check, ChevronsUpDown, AlertTriangle, CheckCircle, Filter } from 'lucide-react';
import { normalizeLocation, displayLocation } from '@/utils/locationUtils';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { InventoryItem } from '@/hooks/useInventory';
import { PRODUCT_NAME_MAPPING, PRODUCT_TYPES, getProductsByType, type ProductType } from '@/data/sampleInventory';

type Product = Database['public']['Tables']['products']['Row'];


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
    pieces_quantity: number;
  }) => void;
  availableLocations: string[];
  inventoryItems: InventoryItem[];
}

export function BulkAddModal({ isOpen, onClose, onSave, availableLocations, inventoryItems }: BulkAddModalProps) {
  const [productName, setProductName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [lot, setLot] = useState('');
  const [mfd, setMfd] = useState('');
  const [quantityBoxes, setQuantityBoxes] = useState(0);
  const [quantityLoose, setQuantityLoose] = useState(0);
  const [quantityPieces, setQuantityPieces] = useState(0);
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());
  const [customLocation, setCustomLocation] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState<'all' | 'empty' | 'occupied'>('all');
  const [rowFilter, setRowFilter] = useState<string>('all');

  // Product management states
  const [products, setProducts] = useState<Product[]>([]);
  const [isProductCodeOpen, setIsProductCodeOpen] = useState(false);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [productCodeInputValue, setProductCodeInputValue] = useState('');

  // Product type selection state
  const [selectedProductType, setSelectedProductType] = useState<ProductType | ''>('');

  // Consistent product selection across locations
  const [applyToAllLocations, setApplyToAllLocations] = useState(true);

  const resetForm = () => {
    setProductName('');
    setProductCode('');
    setLot('');
    setMfd('');
    setQuantityBoxes(0);
    setQuantityLoose(0);
    setQuantityPieces(0);
    setSelectedLocations(new Set());
    setCustomLocation('');
    setLocationSearch('');
    setProductCodeInputValue('');
    setIsProductCodeOpen(false);
    setIsNewProduct(false);
    setSelectedProductType('');
    setRowFilter('all');
    setApplyToAllLocations(true);
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

    onSave(Array.from(selectedLocations).map(loc => normalizeLocation(loc)), {
      product_name: productName.trim(),
      sku: productCode.trim(),
      lot: lot.trim() || undefined,
      mfd: mfd || undefined,
      box_quantity: quantityBoxes,
      loose_quantity: quantityLoose,
      pieces_quantity: quantityPieces,
    });

    resetForm();
    onClose();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Fetch products data on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('product_name');

        if (error) throw error;
        setProducts(data || []);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen]);

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
    setProductCodeInputValue(value);

    // Find product name from mapping first
    const mappedName = PRODUCT_NAME_MAPPING[value.toUpperCase()];
    if (mappedName) {
      setProductName(mappedName);
      setIsNewProduct(false);
      return;
    }

    // Find from products database
    const foundProduct = products.find(
      product => product.sku_code.toLowerCase() === value.toLowerCase()
    );

    if (foundProduct) {
      setProductName(foundProduct.product_name);
      setIsNewProduct(false);
    } else if (value === '') {
      setProductName('');
      setIsNewProduct(false);
    } else {
      // New product
      setIsNewProduct(true);
    }
  };

  // Handle product code select from dropdown
  const handleProductCodeSelect = (code: string) => {
    handleProductCodeChange(code);
    setIsProductCodeOpen(false);
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

  // Helper function to get inventory count at location
  const getLocationInventoryCount = useCallback((location: string) => {
    return inventoryItems.filter(item =>
      normalizeLocation(item.location) === normalizeLocation(location)
    ).length;
  }, [inventoryItems]);

  // Helper function to check if location is empty
  const isLocationEmpty = useCallback((location: string) => {
    return getLocationInventoryCount(location) === 0;
  }, [getLocationInventoryCount]);

  // Get available rows from locations
  const availableRows = useMemo(() => {
    const rows = new Set<string>();
    availableLocations.forEach(location => {
      const match = location.match(/^([A-Z])/);
      if (match) {
        rows.add(match[1]);
      }
    });
    return Array.from(rows).sort();
  }, [availableLocations]);

  // Enhanced location data with status
  const locationsWithStatus = useMemo(() => {
    return availableLocations.map(location => ({
      location,
      itemCount: getLocationInventoryCount(location),
      isEmpty: isLocationEmpty(location)
    }));
  }, [availableLocations, getLocationInventoryCount, isLocationEmpty]);

  // Filter locations based on search and filter type
  const filteredLocations = useMemo(() => {
    return locationsWithStatus.filter(locationData => {
      // Apply search filter
      const matchesSearch = locationData.location.toLowerCase().includes(locationSearch.toLowerCase());

      // Apply type filter
      const matchesFilter = locationFilter === 'all' ||
        (locationFilter === 'empty' && locationData.isEmpty) ||
        (locationFilter === 'occupied' && !locationData.isEmpty);

      // Apply row filter
      const matchesRow = rowFilter === 'all' || locationData.location.startsWith(rowFilter + '/');

      return matchesSearch && matchesFilter && matchesRow;
    });
  }, [locationsWithStatus, locationSearch, locationFilter, rowFilter]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            เพิ่มสินค้าหลายตำแหน่ง
          </DialogTitle>
          <DialogDescription>
            เพิ่มสินค้าชนิดเดียวกันในหลายตำแหน่งพร้อมกัน
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Product Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">ข้อมูลสินค้า</h3>

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
                    🎯 FG - สินค้าสำเร็จรูป (Finished Goods)
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

            {/* Apply to all locations checkbox */}
            {selectedLocations.size > 1 && (
              <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Checkbox
                  id="applyToAllLocations"
                  checked={applyToAllLocations}
                  onCheckedChange={(checked) => setApplyToAllLocations(checked as boolean)}
                />
                <Label
                  htmlFor="applyToAllLocations"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  ใช้ข้อมูลสินค้าเดียวกันสำหรับทุกตำแหน่งที่เลือก ({selectedLocations.size} ตำแหน่ง)
                </Label>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className={isNewProduct ? "border-orange-300 focus-visible:ring-orange-500" : ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="productCode" className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  รหัสสินค้า *
                </Label>
                <div className="relative">
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isProductCodeOpen}
                    className="w-full justify-between"
                    onClick={() => setIsProductCodeOpen(!isProductCodeOpen)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (productCodeInputValue && filteredProductCodes.length === 0) {
                          handleProductCodeChange(productCodeInputValue);
                          setIsProductCodeOpen(false);
                        }
                      }
                    }}
                  >
                    <span className={productCodeInputValue ? "font-mono" : "text-muted-foreground"}>
                      {productCodeInputValue || "เลือกรหัสสินค้า"}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  {(isProductCodeOpen && (filteredProductCodes.length > 0 || productCodeInputValue)) && (
                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-md">
                      <Command shouldFilter={false}>
                        <div className="flex items-center border-b px-3">
                          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                          <Input
                            placeholder="ค้นหารหัสสินค้า..."
                            value={productCodeInputValue}
                            onChange={(e) => {
                              setProductCodeInputValue(e.target.value);
                              setIsNewProduct(checkIfNewProduct(e.target.value));
                            }}
                            className="border-0 px-0 py-2 focus-visible:ring-0"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (productCodeInputValue && filteredProductCodes.length === 0) {
                                  handleProductCodeChange(productCodeInputValue);
                                  setIsProductCodeOpen(false);
                                }
                              }
                            }}
                          />
                        </div>
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
                                  onSelect={() => handleProductCodeSelect(code)}
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

            <div className="grid grid-cols-3 gap-4">
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
                <Label htmlFor="quantityLoose">จำนวนกล่อง</Label>
                <Input
                  id="quantityLoose"
                  type="number"
                  min="0"
                  value={quantityLoose}
                  onChange={(e) => setQuantityLoose(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantityPieces">จำนวนชิ้น</Label>
                <Input
                  id="quantityPieces"
                  type="number"
                  min="0"
                  value={quantityPieces}
                  onChange={(e) => setQuantityPieces(parseInt(e.target.value) || 0)}
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
              <div className="flex items-center justify-between">
                <Label>ตำแหน่งที่มีอยู่:</Label>
                <Badge variant="outline">
                  ทั้งหมด {availableLocations.length} ตำแหน่ง
                </Badge>
              </div>

              {/* Location Search and Filter */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหาตำแหน่ง (เช่น A/1 หรือ A/1/1)"
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={rowFilter} onValueChange={setRowFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="แถว" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกแถว</SelectItem>
                    {availableRows.map(row => (
                      <SelectItem key={row} value={row}>แถว {row}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={locationFilter} onValueChange={(value: 'all' | 'empty' | 'occupied') => setLocationFilter(value)}>
                  <SelectTrigger className="w-40">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    <SelectItem value="empty">ตำแหน่งว่าง</SelectItem>
                    <SelectItem value="occupied">มีสินค้าแล้ว</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="max-h-48 overflow-y-auto border rounded-lg p-3">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {filteredLocations.length > 0 ? (
                    filteredLocations.map(locationData => (
                      <div key={locationData.location} className={`flex items-start space-x-2 p-2 rounded-lg border ${
                        locationData.isEmpty
                          ? 'bg-green-50 border-green-200'
                          : 'bg-yellow-50 border-yellow-200'
                      }`}>
                        <Checkbox
                          id={locationData.location}
                          checked={selectedLocations.has(locationData.location)}
                          onCheckedChange={() => handleLocationToggle(locationData.location)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            {locationData.isEmpty ? (
                              <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                            ) : (
                              <AlertTriangle className="h-3 w-3 text-yellow-600 flex-shrink-0" />
                            )}
                            <Label
                              htmlFor={locationData.location}
                              className="text-sm font-mono cursor-pointer truncate"
                            >
                              {displayLocation(locationData.location)}
                            </Label>
                          </div>
                          <div className={`text-xs ${
                            locationData.isEmpty ? 'text-green-600' : 'text-yellow-600'
                          }`}>
                            {locationData.isEmpty
                              ? 'ว่าง'
                              : `มี ${locationData.itemCount} รายการ`
                            }
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center text-muted-foreground py-4">
                      {locationSearch ? 'ไม่พบตำแหน่งที่ค้นหา' : 'ไม่มีตำแหน่งให้เลือก'}
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
