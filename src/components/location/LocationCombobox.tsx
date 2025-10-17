import { useState } from 'react';
import { Check, ChevronsUpDown, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import {
  useLocationInventoryCounts,
  getLocationStatus,
} from '@/hooks/useLocationInventoryCounts';

interface LocationComboboxProps {
  value: string;
  onChange: (value: string) => void;
  allLocations: string[];
  excludeLocation?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function LocationCombobox({
  value,
  onChange,
  allLocations,
  excludeLocation,
  placeholder = 'เลือกตำแหน่งปลายทาง...',
  disabled = false,
}: LocationComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch location inventory counts
  const { data: locationCounts, isLoading } = useLocationInventoryCounts();

  // Filter and sort locations
  const filteredLocations = allLocations
    .filter((location) => location !== excludeLocation)
    .filter((location) =>
      location.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // Sort by: empty first, then by item count (ascending), then alphabetically
      const countA = locationCounts?.[a]?.count || 0;
      const countB = locationCounts?.[b]?.count || 0;

      if (countA === 0 && countB !== 0) return -1;
      if (countA !== 0 && countB === 0) return 1;
      if (countA !== countB) return countA - countB;
      return a.localeCompare(b);
    });

  // Get selected location info
  const selectedLocation = allLocations.find((loc) => loc === value);
  const selectedLocationCount = locationCounts?.[value]?.count || 0;
  const selectedLocationStatus = getLocationStatus(selectedLocationCount);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-11"
          disabled={disabled}
        >
          {selectedLocation ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <MapPin className="h-4 w-4 flex-shrink-0 text-blue-600" />
              <span className="font-medium truncate">{selectedLocation}</span>
              <Badge
                variant="outline"
                className={cn(
                  'ml-auto flex-shrink-0 text-xs',
                  selectedLocationStatus.color,
                  selectedLocationStatus.bgColor
                )}
              >
                {selectedLocationStatus.icon} {selectedLocationStatus.label}
              </Badge>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="ค้นหาตำแหน่ง..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>ไม่พบตำแหน่งที่ค้นหา</CommandEmpty>
            <CommandGroup>
              {isLoading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  กำลังโหลด...
                </div>
              ) : (
                filteredLocations.map((location) => {
                  const count = locationCounts?.[location]?.count || 0;
                  const status = getLocationStatus(count);

                  return (
                    <CommandItem
                      key={location}
                      value={location}
                      onSelect={(currentValue) => {
                        onChange(currentValue === value ? '' : currentValue);
                        setOpen(false);
                        setSearchQuery('');
                      }}
                      className={cn(
                        'flex items-center justify-between gap-2 px-3 py-2',
                        status.bgColor
                      )}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Check
                          className={cn(
                            'h-4 w-4 flex-shrink-0',
                            value === location ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <MapPin className="h-4 w-4 flex-shrink-0 text-blue-600" />
                        <span className="font-medium truncate">{location}</span>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          'flex-shrink-0 text-xs border-0',
                          status.color
                        )}
                      >
                        {status.icon} {status.label}
                      </Badge>
                    </CommandItem>
                  );
                })
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
