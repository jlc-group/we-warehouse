import { useState } from 'react';
import { Package, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface InventoryItem {
  id: string;
  location: string;
  productName: string;
  productCode: string;
  lot?: string;
  mfd?: string;
  quantityBoxes: number;
  quantityLoose: number;
  updatedAt: Date;
}

interface ShelfGridProps {
  items: InventoryItem[];
  onShelfClick: (location: string, item?: InventoryItem) => void;
}

export function ShelfGrid({ items, onShelfClick }: ShelfGridProps) {
  const [selectedShelf, setSelectedShelf] = useState<string | null>(null);
  
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

  return (
    <div className="space-y-8">
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
                  {Array.from({ length: columns }, (_, j) => j + 1).map(level => {
                    const location = `${rowLetter}${shelfNumber}/${level}`;
                    const item = itemsByLocation[location];
                    const isSelected = selectedShelf === location;
                    const hasItem = !!item;
                    
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
                          isSelected && "ring-2 ring-primary shadow-lg"
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