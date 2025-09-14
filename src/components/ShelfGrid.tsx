import { useState } from 'react';
import { Package, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { InventoryItem } from '@/hooks/useInventory';

interface ShelfGridProps {
  items: InventoryItem[];
  onShelfClick: (location: string, item?: InventoryItem) => void;
}

export function ShelfGrid({ items, onShelfClick }: ShelfGridProps) {
  const [selectedShelf, setSelectedShelf] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedLocations, setHighlightedLocations] = useState<Set<string>>(new Set());
  
  const columns = 4;
  const rows = 20;
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const shelfRange = alphabet.substring(0, alphabet.indexOf('O') + 1); // A-O
  
  const itemsByLocation = items.reduce((acc, item) => {
    acc[item.location] = item;
    return acc;
  }, {} as Record<string, InventoryItem>);

  const handleShelfClick = (location: string) => {
    setSelectedShelf(location);
    const item = itemsByLocation[location];
    onShelfClick(location, item);
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setHighlightedLocations(new Set());
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const matchingLocations = items
      .filter(item => 
        item.productName.toLowerCase().includes(query) ||
        item.productCode.toLowerCase().includes(query)
      )
      .map(item => item.location);
    
    setHighlightedLocations(new Set(matchingLocations));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="ค้นหาสินค้า, รหัสสินค้า..."
            className="pl-10 h-12"
          />
        </div>
        <Button 
          onClick={handleSearch}
          className="h-12 px-6 bg-gradient-primary"
        >
          ค้นหา
        </Button>
        {highlightedLocations.size > 0 && (
          <Button 
            onClick={() => {
              setSearchQuery('');
              setHighlightedLocations(new Set());
            }}
            variant="outline"
            className="h-12 px-6"
          >
            ล้างการค้นหา
          </Button>
        )}
      </div>
      
      {highlightedLocations.size > 0 && (
        <div className="mb-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
          <p className="text-sm font-medium text-primary">
            พบ {highlightedLocations.size} รายการที่ตรงกับการค้นหา (ตำแหน่งที่ไฮไลต์จะแสดงด้วยสีแดง)
          </p>
        </div>
      )}
      
      {shelfRange.split('').map(rowLetter => (
        <div key={rowLetter} className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-bold text-foreground">แถว {rowLetter}</h3>
            <div className="h-px bg-border flex-1" />
          </div>
          
          <div className="grid grid-cols-5 sm:grid-cols-10 lg:grid-cols-20 gap-2">
            {Array.from({ length: rows }, (_, i) => i + 1).map(shelfNumber => (
              <div key={shelfNumber} className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground text-center">
                  {rowLetter}{shelfNumber}
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {Array.from({ length: columns }, (_, j) => columns - j).map(level => {
                    const location = `${rowLetter}${shelfNumber}/${level}`;
                    const item = itemsByLocation[location];
                    const isSelected = selectedShelf === location;
                    const hasItem = !!item;
                    const isHighlighted = highlightedLocations.has(location);
                    
                    return (
                      <Button
                        key={level}
                        variant="outline"
                        size="sm"
                        onClick={() => handleShelfClick(location)}
                        className={cn(
                          "h-16 w-16 p-1 flex flex-col items-center justify-center text-xs relative transition-all duration-200",
                          hasItem 
                            ? "bg-shelf-occupied hover:bg-success/20 border-success/30" 
                            : "bg-shelf-empty hover:bg-shelf-hover",
                          isSelected && "ring-2 ring-primary shadow-lg",
                          isHighlighted && "ring-2 ring-destructive border-destructive bg-destructive/10"
                        )}
                      >
                        {hasItem ? (
                          <>
                            <Package className="h-3 w-3 text-success mb-1" />
                            <div className="text-[8px] font-medium text-center leading-tight truncate w-full">
                              {item.productName}
                            </div>
                            <div className="text-[7px] text-muted-foreground">
                              {item.quantityBoxes}ลัง
                            </div>
                          </>
                        ) : (
                          <Plus className="h-4 w-4 text-muted-foreground opacity-50" />
                        )}
                        
                        <div className="absolute -bottom-1 -right-1 text-[6px] font-mono text-muted-foreground bg-background px-1 rounded">
                          {level}
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}