import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Package, Search, MapPin, Hash, BarChart3, Grid3X3, List, ExternalLink, Filter } from 'lucide-react';
import type { InventoryItem } from '@/hooks/useInventory';
import { useDebounce } from '@/hooks/useDebounce';
import { displayLocation } from '@/utils/locationUtils';
import { ProductTypeBadge, ProductTypeFilter } from '@/components/ProductTypeBadge';
import { getProductType } from '@/data/sampleInventory';

interface InventorySearchProps {
  items: InventoryItem[];
  onItemSelect?: (item: InventoryItem) => void;
}

type ViewMode = 'list' | 'location' | 'product';

export function InventorySearch({ items, onItemSelect }: InventorySearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('location');
  const [selectedProductTypes, setSelectedProductTypes] = useState<string[]>([]);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (debouncedSearchQuery) {
      const filteredItems = items.filter(item => {
        // Text search filter
        const matchesSearch = item.product_name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
          (item as any).sku?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
          item.location.toLowerCase().includes(debouncedSearchQuery.toLowerCase());

        if (!matchesSearch) return false;

        // Product type filter
        if (selectedProductTypes.length > 0) {
          const productType = getProductType((item as any).sku || '');
          return productType && selectedProductTypes.includes(productType);
        }

        return true;
      });

      // Debug logging for search results
      console.log('🔍 Search results:', {
        query: debouncedSearchQuery,
        selectedProductTypes,
        totalItems: items.length,
        filteredItems: filteredItems.length,
        sampleResults: filteredItems.slice(0, 3).map(item => ({
          sku: (item as any).sku,
          product_name: item.product_name,
          location: item.location,
          productType: getProductType((item as any).sku || '')
        }))
      });

      setSearchResults(filteredItems);
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearchQuery, items, selectedProductTypes]);

  const handleSearch = (query: string) => {
    const filteredItems = items.filter(item =>
      item.product_name.toLowerCase().includes(query.toLowerCase()) ||
      (item as any).sku?.toLowerCase().includes(query.toLowerCase()) ||
      item.location.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(filteredItems);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery);
    }
  };

  // Calculate summary statistics
  const searchSummary = useMemo(() => {
    if (searchResults.length === 0) return null;

    const uniqueLocations = new Set(searchResults.map(item => item.location));
    const uniqueProducts = new Set(searchResults.map(item => item.sku));
    const totalBoxes = searchResults.reduce((sum, item) => sum + ((item as any).carton_quantity_legacy || 0), 0);
    const totalLoose = searchResults.reduce((sum, item) => sum + ((item as any).box_quantity_legacy || 0), 0);

    // Count FG and PK products
    let fgCount = 0;
    let pkCount = 0;
    let unknownCount = 0;

    searchResults.forEach(item => {
      const productType = getProductType((item as any).sku || '');
      if (productType === 'FG') fgCount++;
      else if (productType === 'PK') pkCount++;
      else unknownCount++;
    });

    return {
      totalItems: searchResults.length,
      uniqueLocations: uniqueLocations.size,
      uniqueProducts: uniqueProducts.size,
      totalBoxes,
      totalLoose,
      fgCount,
      pkCount,
      unknownCount
    };
  }, [searchResults]);

  // Group items by location
  const itemsByLocation = useMemo(() => {
    return searchResults.reduce((acc, item) => {
      if (!acc[item.location]) {
        acc[item.location] = [];
      }
      acc[item.location].push(item);
      return acc;
    }, {} as Record<string, InventoryItem[]>);
  }, [searchResults]);

  // Group items by product
  const itemsByProduct = useMemo(() => {
    return searchResults.reduce((acc, item) => {
      const key = `${item.sku}-${item.product_name}`;
      if (!acc[key]) {
        acc[key] = {
          product_code: item.sku,
          product_name: item.product_name,
          items: [],
          totalBoxes: 0,
          totalLoose: 0,
          locations: new Set<string>()
        };
      }
      acc[key].items.push(item);
      acc[key].totalBoxes += ((item as any).carton_quantity_legacy || 0);
      acc[key].totalLoose += ((item as any).box_quantity_legacy || 0);
      acc[key].locations.add(item.location);
      return acc;
    }, {} as Record<string, {
      product_code: string;
      product_name: string;
      items: InventoryItem[];
      totalBoxes: number;
      totalLoose: number;
      locations: Set<string>;
    }>);
  }, [searchResults]);

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            ค้นหาสินค้าในคลัง
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="ค้นหาตามชื่อสินค้า รหัสสินค้า หรือตำแหน่ง..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10"
                />
              </div>
              <Button onClick={() => handleSearch(searchQuery)}>
                <Search className="h-4 w-4 mr-2" />
                ค้นหา
              </Button>
            </div>

            {/* Product Type Filter */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">กรองตามประเภทสินค้า:</span>
              </div>
              <ProductTypeFilter
                selectedTypes={selectedProductTypes}
                onTypeChange={setSelectedProductTypes}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-6">
          {/* Summary Section */}
          {searchSummary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  สรุปผลการค้นหา
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{searchSummary.totalItems}</div>
                    <div className="text-sm text-muted-foreground">รายการทั้งหมด</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{searchSummary.fgCount}</div>
                    <div className="text-sm text-muted-foreground">FG (สำเร็จรูป)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{searchSummary.pkCount}</div>
                    <div className="text-sm text-muted-foreground">PK (บรรจุภัณฑ์)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">{searchSummary.uniqueLocations}</div>
                    <div className="text-sm text-muted-foreground">จุดที่พบ</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-teal-600">{searchSummary.uniqueProducts}</div>
                    <div className="text-sm text-muted-foreground">สินค้าต่างชนิด</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{searchSummary.totalBoxes}</div>
                    <div className="text-sm text-muted-foreground">ลังรวม</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{searchSummary.totalLoose}</div>
                    <div className="text-sm text-muted-foreground">เศษรวม</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* View Mode Tabs */}
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="location" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                จัดกลุ่มตามตำแหน่ง
              </TabsTrigger>
              <TabsTrigger value="product" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                จัดกลุ่มตามสินค้า
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                รายการเดียว
              </TabsTrigger>
            </TabsList>

            {/* Location View */}
            <TabsContent value="location" className="space-y-4">
              {Object.entries(itemsByLocation).sort(([a], [b]) => a.localeCompare(b)).map(([location, locationItems]) => (
                <Card key={location}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-blue-600" />
                        <span>ตำแหน่ง: {location}</span>
                      </div>
                      <Badge variant="secondary">{locationItems.length} รายการ</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {locationItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => onItemSelect?.(item)}
                        >
                          <div className="flex items-center gap-3">
                            <Package className="h-4 w-4 text-primary" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium break-words" title={item.product_name}>{item.product_name}</div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                                <Hash className="h-3 w-3 flex-shrink-0" />
                                <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs" title={(item as any).sku || 'N/A'}>{(item as any).sku || 'N/A'}</span>
                                <ProductTypeBadge sku={(item as any).sku || ''} showIcon={true} />
                                {item.lot && (
                                  <>
                                    <span className="mx-1">•</span>
                                    <span title={`Lot: ${item.lot}`}>Lot: {item.lot}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{((item as any).carton_quantity_legacy || 0)} ลัง + {((item as any).box_quantity_legacy || 0)} เศษ</div>
                            {item.mfd && (
                              <div className="text-xs text-muted-foreground">MFD: {item.mfd}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Product View */}
            <TabsContent value="product" className="space-y-4">
              {Object.values(itemsByProduct).sort((a, b) => a.product_name.localeCompare(b.product_name)).map((productGroup) => (
                <Card key={`${productGroup.product_code}-${productGroup.product_name}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-green-600" />
                        <div className="flex-1 min-w-0">
                          <div className="break-words" title={productGroup.product_name}>{productGroup.product_name}</div>
                          <div className="flex items-center gap-2 text-sm font-normal text-muted-foreground flex-wrap" title={`รหัส: ${productGroup.product_code}`}>
                            <span>รหัส: {productGroup.product_code}</span>
                            <ProductTypeBadge sku={productGroup.product_code} showIcon={true} />
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary">{productGroup.locations.size} ตำแหน่ง</Badge>
                        <div className="text-sm text-muted-foreground mt-1">
                          รวม: {productGroup.totalBoxes} ลัง + {productGroup.totalLoose} เศษ
                        </div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {productGroup.items.sort((a, b) => a.location.localeCompare(b.location)).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => onItemSelect?.(item)}
                        >
                          <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 text-blue-600" />
                            <div>
                              <div className="font-medium">{displayLocation(item.location)}</div>
                              {item.lot && (
                                <div className="text-sm text-muted-foreground">Lot: {item.lot}</div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{((item as any).carton_quantity_legacy || 0)} ลัง + {((item as any).box_quantity_legacy || 0)} เศษ</div>
                            {item.mfd && (
                              <div className="text-xs text-muted-foreground">MFD: {item.mfd}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* List View */}
            <TabsContent value="list" className="space-y-4">
              <div className="grid gap-4">
                {searchResults.map((item) => (
                  <Card
                    key={item.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onItemSelect?.(item)}
                  >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-primary" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium break-words" title={item.product_name}>{item.product_name}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                            <Hash className="h-3 w-3 flex-shrink-0" />
                            <span title={item.sku}>{item.sku}</span>
                            <ProductTypeBadge sku={item.sku} showIcon={true} />
                            <MapPin className="h-3 w-3 ml-2 flex-shrink-0" />
                            <span title={displayLocation(item.location)}>{displayLocation(item.location)}</span>
                            {item.lot && (
                              <>
                                <span className="mx-1">•</span>
                                <span title={`Lot: ${item.lot}`}>Lot: {item.lot}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">
                          <span className="font-medium">{((item as any).carton_quantity_legacy || 0)}</span> ลัง
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span>{((item as any).box_quantity_legacy || 0)}</span> เศษ
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* No Results */}
      {debouncedSearchQuery && searchResults.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">ไม่พบสินค้าที่ค้นหา</h3>
            <p className="text-muted-foreground">
              ลองค้นหาด้วยคำที่แตกต่างหรือตรวจสอบการสะกดคำ
            </p>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {!debouncedSearchQuery && (
        <Card>
          <CardContent className="p-8 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">ค้นหาสินค้าในคลัง</h3>
            <p className="text-muted-foreground">
              ใส่ชื่อสินค้า รหัสสินค้า หรือตำแหน่งที่ต้องการค้นหา
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}