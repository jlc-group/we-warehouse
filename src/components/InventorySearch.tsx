import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Package, Search, MapPin, Hash, BarChart3, Grid3X3, List, ExternalLink } from 'lucide-react';
import type { InventoryItem } from '@/hooks/useInventory';

interface InventorySearchProps {
  items: InventoryItem[];
  onItemSelect?: (item: InventoryItem) => void;
}

type ViewMode = 'list' | 'location' | 'product';

export function InventorySearch({ items, onItemSelect }: InventorySearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('location');

  const handleSearch = (query: string = searchQuery) => {
    const filteredItems = items.filter(item =>
      item.product_name.toLowerCase().includes(query.toLowerCase()) ||
      item.product_code.toLowerCase().includes(query.toLowerCase()) ||
      item.location.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(filteredItems);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Calculate summary statistics
  const searchSummary = useMemo(() => {
    if (searchResults.length === 0) return null;

    const uniqueLocations = new Set(searchResults.map(item => item.location));
    const uniqueProducts = new Set(searchResults.map(item => item.product_code));
    const totalBoxes = searchResults.reduce((sum, item) => sum + item.quantity_boxes, 0);
    const totalLoose = searchResults.reduce((sum, item) => sum + item.quantity_loose, 0);

    return {
      totalItems: searchResults.length,
      uniqueLocations: uniqueLocations.size,
      uniqueProducts: uniqueProducts.size,
      totalBoxes,
      totalLoose
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
      const key = `${item.product_code}-${item.product_name}`;
      if (!acc[key]) {
        acc[key] = {
          product_code: item.product_code,
          product_name: item.product_name,
          items: [],
          totalBoxes: 0,
          totalLoose: 0,
          locations: new Set<string>()
        };
      }
      acc[key].items.push(item);
      acc[key].totalBoxes += item.quantity_boxes;
      acc[key].totalLoose += item.quantity_loose;
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
            <Button onClick={() => handleSearch()}>
              <Search className="h-4 w-4 mr-2" />
              ค้นหา
            </Button>
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
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{searchSummary.totalItems}</div>
                    <div className="text-sm text-muted-foreground">รายการทั้งหมด</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{searchSummary.uniqueLocations}</div>
                    <div className="text-sm text-muted-foreground">จุดที่พบ</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{searchSummary.uniqueProducts}</div>
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
                            <div>
                              <div className="font-medium">{item.product_name}</div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Hash className="h-3 w-3" />
                                <span>{item.product_code}</span>
                                {item.lot && (
                                  <>
                                    <span className="mx-1">•</span>
                                    <span>Lot: {item.lot}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{item.quantity_boxes} ลัง + {item.quantity_loose} เศษ</div>
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
                        <div>
                          <div>{productGroup.product_name}</div>
                          <div className="text-sm font-normal text-muted-foreground">รหัส: {productGroup.product_code}</div>
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
                              <div className="font-medium">{item.location}</div>
                              {item.lot && (
                                <div className="text-sm text-muted-foreground">Lot: {item.lot}</div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{item.quantity_boxes} ลัง + {item.quantity_loose} เศษ</div>
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
                        <div>
                          <h3 className="font-medium">{item.product_name}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Hash className="h-3 w-3" />
                            <span>{item.product_code}</span>
                            <MapPin className="h-3 w-3 ml-2" />
                            <span>{item.location}</span>
                            {item.lot && (
                              <>
                                <span className="mx-1">•</span>
                                <span>Lot: {item.lot}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">
                          <span className="font-medium">{item.quantity_boxes}</span> ลัง
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span>{item.quantity_loose}</span> เศษ
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
      {searchQuery && searchResults.length === 0 && (
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
      {!searchQuery && (
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