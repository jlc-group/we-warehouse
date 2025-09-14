import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Package, Search, MapPin } from 'lucide-react';
import type { InventoryItem } from '@/hooks/useInventory';

interface ShelfGridProps {
  items: InventoryItem[];
  onShelfClick: (location: string, item?: InventoryItem) => void;
}

export function ShelfGrid({ items, onShelfClick }: ShelfGridProps) {
  const [selectedShelf, setSelectedShelf] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedLocations, setHighlightedLocations] = useState<string[]>([]);

  // Create a map for easy lookup
  const itemsByLocation = items.reduce((acc, item) => {
    acc[item.location] = item;
    return acc;
  }, {} as Record<string, InventoryItem>);

  const handleShelfClick = (location: string) => {
    setSelectedShelf(location);
    const item = itemsByLocation[location];
    onShelfClick(location, item);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setHighlightedLocations([]);
      return;
    }

    const matchingItems = items.filter(item => 
      item.product_name.toLowerCase().includes(query.toLowerCase()) ||
      item.product_code.toLowerCase().includes(query.toLowerCase())
    );
    
    const locations = matchingItems.map(item => item.location);
    setHighlightedLocations(locations);
  };

  // Generate shelf grid (A-N rows, 4-1 levels from top to bottom, 1-20 positions)
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
  const levels = [4, 3, 2, 1]; // Display from top to bottom: 4, 3, 2, 1
  const positions = Array.from({ length: 20 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="ค้นหาสินค้าตามชื่อหรือรหัส..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => handleSearch(searchQuery)}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Shelf Grid */}
      <div className="space-y-8">
        {rows.map((row) => (
          <div key={row} className="space-y-4">
            <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                {row}
              </div>
              แถว {row}
            </h2>
            
            {levels.map((level) => (
              <div key={level} className="space-y-2">
                <h3 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
                  <div className="w-6 h-6 bg-muted text-muted-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    {level}
                  </div>
                  ชั้นที่ {level}
                </h3>
                
                <div className="overflow-x-auto">
                  <div className="flex gap-1 pb-2" style={{ minWidth: 'max-content' }}>
                    {positions.map((position) => {
                      const location = `${row}/${level}/${position}`;
                      const item = itemsByLocation[location];
                      const isSelected = selectedShelf === location;
                      const isHighlighted = highlightedLocations.includes(location);
                      
                      return (
                        <Card
                          key={location}
                          className={`
                            w-16 h-16 cursor-pointer transition-all duration-200 hover:shadow-md flex-shrink-0
                            ${isSelected ? 'ring-2 ring-primary shadow-lg' : ''}
                            ${isHighlighted ? 'ring-2 ring-yellow-400 bg-yellow-50' : ''}
                            ${item ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-dashed'}
                          `}
                          onClick={() => handleShelfClick(location)}
                        >
                          <CardContent className="p-1 h-full flex flex-col justify-between">
                            <div className="text-xs font-mono text-muted-foreground text-center">
                              {row}{position}
                            </div>
                            
                            <div className="flex-1 flex items-center justify-center">
                              {item ? (
                                <div className="text-xs text-center">
                                  <div className="font-medium truncate text-xs">{item.product_name.slice(0, 8)}</div>
                                  <div className="text-muted-foreground text-xs">{item.product_code.slice(0, 6)}</div>
                                  <div className="flex gap-1 text-xs justify-center">
                                    <span className="bg-primary/10 text-primary px-1 rounded text-xs">
                                      {item.quantity_boxes}
                                    </span>
                                    <span className="bg-secondary/50 px-1 rounded text-xs">
                                      {item.quantity_loose}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground text-center">
                                  <Package className="h-3 w-3 mx-auto mb-1 opacity-30" />
                                  <div className="text-xs">ว่าง</div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-primary/5 border border-primary/20 rounded"></div>
                <span>มีสินค้า</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-muted/30 border border-dashed rounded"></div>
                <span>ตำแหน่งว่าง</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-50 border-2 border-yellow-400 rounded"></div>
                <span>ผลการค้นหา</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>คลิกเพื่อเพิ่มหรือแก้ไขสินค้า</span>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            <p>ระบบคลัง: 14 แถว (A-N) × 4 ชั้น × 20 ตำแหน่ง = {14 * 4 * 20} ตำแหน่งทั้งหมด</p>
            <p>การเรียงชั้น: ชั้น 4 (บนสุด) → ชั้น 3 → ชั้น 2 → ชั้น 1 (ล่างสุด)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}