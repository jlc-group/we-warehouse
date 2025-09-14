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
      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row} className="space-y-2">
            <h2 className="text-lg font-semibold text-primary flex items-center gap-2 mb-1">
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-md flex items-center justify-center text-sm font-bold">
                {row}
              </div>
              แถว {row}
            </h2>

            {levels.map((level) => (
              <div key={level} className="space-y-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 bg-muted text-muted-foreground rounded flex items-center justify-center text-xs font-semibold">
                    {level}
                  </div>
                  <span className="text-sm text-muted-foreground">ชั้นที่ {level}</span>
                </div>
                
                <div className="overflow-x-auto">
                  <div className="flex gap-0.5 pb-1" style={{ minWidth: 'max-content' }}>
                    {positions.map((position) => {
                      const location = `${row}/${level}/${position}`;
                      const item = itemsByLocation[location];
                      const isSelected = selectedShelf === location;
                      const isHighlighted = highlightedLocations.includes(location);

                      return (
                        <Card
                          key={location}
                          className={`
                            w-16 h-12 cursor-pointer transition-all duration-200 hover:shadow-sm hover:scale-105 flex-shrink-0
                            ${isSelected ? 'ring-2 ring-primary shadow-md scale-105' : ''}
                            ${isHighlighted ? 'ring-2 ring-yellow-400 bg-yellow-50/80' : ''}
                            ${item ? 'bg-green-50/80 border-green-200/60 hover:bg-green-100/80' : 'bg-gray-50/50 border-gray-200/50 border-dashed hover:bg-gray-100/50'}
                          `}
                          onClick={() => handleShelfClick(location)}
                        >
                          <CardContent className="p-0.5 h-full flex flex-col justify-center items-center">
                            <div className="text-[9px] font-mono text-muted-foreground font-semibold leading-none">
                              {row}{position}/{level}
                            </div>

                            <div className="flex-1 flex items-center justify-center mt-0.5">
                              {item ? (
                                <div className="text-center">
                                  <div className="w-2 h-2 bg-green-500 rounded-full mx-auto mb-0.5"></div>
                                  <div className="text-[8px] text-green-700 font-semibold leading-none">
                                    {item.quantity_boxes + item.quantity_loose > 0 ?
                                      `${item.quantity_boxes}+${item.quantity_loose}` :
                                      '0'
                                    }
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center">
                                  <div className="w-2 h-2 bg-gray-300 rounded-full mx-auto"></div>
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
      <Card className="border-0 bg-muted/30">
        <CardContent className="p-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-50 border border-green-200 rounded flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                </div>
                <span>มีสินค้า</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-50 border border-gray-200 border-dashed rounded flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
                </div>
                <span>ตำแหน่งว่าง</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-50 border-2 border-yellow-400 rounded"></div>
                <span>ผลการค้นหา</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <MapPin className="h-3 w-3" />
              <span>คลิกที่ตำแหน่งเพื่อจัดการสินค้า</span>
            </div>
          </div>

          <div className="mt-3 text-xs text-muted-foreground space-y-1">
            <p>• ระบบคลัง: 14 แถว (A-N) × 4 ชั้น × 20 ตำแหน่ง = {14 * 4 * 20} ตำแหน่งทั้งหมด</p>
            <p>• การเรียงชั้น: ชั้น 4 (บนสุด) → ชั้น 3 → ชั้น 2 → ชั้น 1 (ล่างสุด)</p>
            <p>• ตัวเลขในตำแหน่ง: จำนวนลัง+เศษ (เช่น 5+3 = 5 ลัง 3 เศษ)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}