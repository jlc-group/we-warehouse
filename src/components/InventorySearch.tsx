import { useState } from 'react';
import { Search, MapPin, Package, Hash } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { InventoryItem } from '@/hooks/useInventory';

interface InventorySearchProps {
  items: InventoryItem[];
  onItemSelect?: (item: InventoryItem) => void;
}

export function InventorySearch({ items, onItemSelect }: InventorySearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const results = items.filter(item => 
      item.productName.toLowerCase().includes(query) ||
      item.productCode.toLowerCase().includes(query) ||
      item.location.toLowerCase().includes(query)
    );
    
    setSearchResults(results);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="ค้นหาสินค้า, รหัสสินค้า, หรือตำแหน่ง..."
            className="pl-10 h-12"
          />
        </div>
        <Button 
          onClick={handleSearch}
          className="h-12 px-6 bg-gradient-primary"
        >
          ค้นหา
        </Button>
      </div>

      {searchResults.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            พบ {searchResults.length} รายการ
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {searchResults.map((item) => (
              <Card 
                key={item.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onItemSelect?.(item)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{item.productName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Hash className="h-3 w-3" />
                        <span>{item.productCode}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>ตำแหน่ง: {item.location}</span>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-medium">{item.quantityBoxes} ลัง</div>
                      <div className="text-muted-foreground">{item.quantityLoose} เศษ</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {searchQuery && searchResults.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>ไม่พบสินค้าที่ค้นหา</p>
        </div>
      )}
    </div>
  );
}