import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Package, Search, MapPin, Hash } from 'lucide-react';
import type { InventoryItem } from '@/hooks/useInventory';

interface InventorySearchProps {
  items: InventoryItem[];
  onItemSelect?: (item: InventoryItem) => void;
}

export function InventorySearch({ items, onItemSelect }: InventorySearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);

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
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">ผลการค้นหา ({searchResults.length} รายการ)</h3>
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