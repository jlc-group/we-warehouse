import React, { useState, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Send, MapPin, Search, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { generateAllWarehouseLocations } from '@/utils/locationUtils';
import { supabase } from '@/integrations/supabase/client';

interface InventoryItem {
  id: string;
  product_name: string;
  sku: string;
  unit_level1_name: string;
  unit_level1_quantity: number;
  unit_level2_name: string;
  unit_level2_quantity: number;
  unit_level3_name: string;
  unit_level3_quantity: number;
  location: string;
}

interface ExportItem {
  selected: boolean;
  exportQuantities: {
    level1: number;
    level2: number;
    level3: number;
  };
}

interface LocationExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  locationId: string;
  onSuccess: () => void;
}

export const LocationExportModal: React.FC<LocationExportModalProps> = ({
  isOpen,
  onClose,
  inventory,
  locationId,
  onSuccess
}) => {
  const [exportItems, setExportItems] = useState<{ [itemId: string]: ExportItem }>({});
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  // Generate all possible locations excluding current location
  const filteredLocations = useMemo(() => {
    const allLocations = generateAllWarehouseLocations();
    const availableLocations = allLocations.filter(loc => loc !== locationId);

    if (!locationSearch.trim()) {
      return availableLocations.slice(0, 20); // Show first 20 by default
    }

    const searchTerm = locationSearch.toLowerCase();
    const filtered = availableLocations.filter(location =>
      location.toLowerCase().includes(searchTerm)
    );

    return filtered.slice(0, 50); // Max 50 results
  }, [locationSearch, locationId]);

  // Filter items for this location
  const items = React.useMemo(() => {
    return inventory.filter(item => item.location === locationId);
  }, [inventory, locationId]);

  // Initialize export items when modal opens
  React.useEffect(() => {
    if (isOpen && items.length > 0) {
      const initialExportItems: { [itemId: string]: ExportItem } = {};
      items.forEach(item => {
        initialExportItems[item.id] = {
          selected: false,
          exportQuantities: {
            level1: 0,
            level2: 0,
            level3: 0
          }
        };
      });
      setExportItems(initialExportItems);
      setDestination('');
      setLocationSearch('');
    }
  }, [isOpen, items]);

  const handleItemSelection = useCallback((itemId: string, selected: boolean) => {
    setExportItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        selected
      }
    }));
  }, []);

  const handleQuantityChange = useCallback((itemId: string, level: 'level1' | 'level2' | 'level3', value: string) => {
    const numValue = Math.max(0, parseInt(value) || 0);

    setExportItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        exportQuantities: {
          ...prev[itemId].exportQuantities,
          [level]: numValue
        }
      }
    }));
  }, []);

  const handleLocationSelect = useCallback((location: string) => {
    setDestination(location);
    setLocationSearch(location);
    setShowLocationDropdown(false);
  }, []);

  const handleSelectAll = useCallback(() => {
    const allSelected = items.every(item => exportItems[item.id]?.selected);

    setExportItems(prev => {
      const updated = { ...prev };
      items.forEach(item => {
        updated[item.id] = {
          ...updated[item.id],
          selected: !allSelected
        };
      });
      return updated;
    });
  }, [items, exportItems]);

  const selectedCount = useMemo(() => {
    return items.filter(item => exportItems[item.id]?.selected).length;
  }, [items, exportItems]);

  const handleExport = async () => {
    const selectedItems = items.filter(item => exportItems[item.id]?.selected);

    if (selectedItems.length === 0) {
      toast.error('กรุณาเลือกสินค้าที่ต้องการส่งออก');
      return;
    }

    if (!destination.trim()) {
      toast.error('กรุณาเลือกจุดหมายปลายทาง');
      return;
    }

    // Validate quantities
    const hasInvalidQuantity = selectedItems.some(item => {
      const exportItem = exportItems[item.id];
      const total1 = exportItem.exportQuantities.level1;
      const total2 = exportItem.exportQuantities.level2;
      const total3 = exportItem.exportQuantities.level3;

      return (total1 > item.unit_level1_quantity) ||
             (total2 > item.unit_level2_quantity) ||
             (total3 > item.unit_level3_quantity) ||
             (total1 === 0 && total2 === 0 && total3 === 0);
    });

    if (hasInvalidQuantity) {
      toast.error('กรุณาตรวจสอบจำนวนสินค้าที่ต้องการส่งออก');
      return;
    }

    try {
      setLoading(true);

      // Process each selected item
      const updates = [];
      const movements = [];

      for (const item of selectedItems) {
        const exportItem = exportItems[item.id];
        const exportQty = exportItem.exportQuantities;

        // Calculate new quantities
        const newLevel1 = item.unit_level1_quantity - exportQty.level1;
        const newLevel2 = item.unit_level2_quantity - exportQty.level2;
        const newLevel3 = item.unit_level3_quantity - exportQty.level3;

        // Update original item quantities
        updates.push({
          id: item.id,
          unit_level1_quantity: newLevel1,
          unit_level2_quantity: newLevel2,
          unit_level3_quantity: newLevel3
        });

        // Create new inventory item at destination if quantities > 0
        if (exportQty.level1 > 0 || exportQty.level2 > 0 || exportQty.level3 > 0) {
          updates.push({
            product_name: item.product_name,
            sku: item.sku,
            location: destination,
            unit_level1_name: item.unit_level1_name,
            unit_level1_quantity: exportQty.level1,
            unit_level1_rate: item.unit_level1_rate,
            unit_level2_name: item.unit_level2_name,
            unit_level2_quantity: exportQty.level2,
            unit_level2_rate: item.unit_level2_rate,
            unit_level3_name: item.unit_level3_name,
            unit_level3_quantity: exportQty.level3,
            lot: item.lot,
            mfd: item.mfd,
            user_id: crypto.randomUUID()
          });
        }

        // Record movement
        movements.push({
          inventory_item_id: item.id,
          movement_type: 'export',
          quantity_level1: exportQty.level1,
          quantity_level2: exportQty.level2,
          quantity_level3: exportQty.level3,
          from_location: locationId,
          to_location: destination,
          notes: `ส่งออกไปยัง ${destination}`,
          user_id: crypto.randomUUID()
        });
      }

      // Update original items
      for (const update of updates.filter(u => u.id)) {
        const { error: updateError } = await supabase
          .from('inventory_items')
          .update({
            unit_level1_quantity: update.unit_level1_quantity,
            unit_level2_quantity: update.unit_level2_quantity,
            unit_level3_quantity: update.unit_level3_quantity
          })
          .eq('id', update.id);

        if (updateError) throw updateError;
      }

      // Insert new items at destination
      const newItems = updates.filter(u => !u.id);
      if (newItems.length > 0) {
        const { error: insertError } = await supabase
          .from('inventory_items')
          .insert(newItems);

        if (insertError) throw insertError;
      }

      // Record movements
      if (movements.length > 0) {
        const { error: movementError } = await supabase
          .from('inventory_movements')
          .insert(movements);

        if (movementError) console.warn('Movement logging failed:', movementError);
      }

      toast.success(`ส่งออกสินค้า ${selectedItems.length} รายการไปยัง ${destination} เรียบร้อยแล้ว`);
      onSuccess(); // Refresh data
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      toast.error('เกิดข้อผิดพลาดในการส่งออกสินค้า');
    } finally {
      setLoading(false);
    }
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showLocationDropdown) {
        const target = event.target as Element;
        if (!target.closest('.location-dropdown-container')) {
          setShowLocationDropdown(false);
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showLocationDropdown]);

  // Debug logging
  console.log('🚀 LocationExportModal render:', {
    isOpen,
    locationId,
    inventoryCount: inventory.length,
    filteredItemsCount: items.length
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-lg font-bold text-red-700">
            <Send className="h-5 w-5" />
            <span>ส่งออกสินค้าจากตำแหน่ง {locationId}</span>
          </DialogTitle>
          <DialogDescription>
            เลือกสินค้าและระบุจำนวนที่ต้องการส่งออกไปยังตำแหน่งใหม่
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Destination Location Selector */}
          <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
            <Label className="text-sm font-semibold text-blue-800 mb-2 block">
              <MapPin className="h-4 w-4 inline mr-1" />
              เลือกจุดหมายปลายทาง
            </Label>
            <div className="location-dropdown-container relative">
              <div className="relative">
                <Input
                  value={locationSearch}
                  onChange={(e) => {
                    setLocationSearch(e.target.value);
                    setDestination(e.target.value);
                    setShowLocationDropdown(true);
                  }}
                  onFocus={() => setShowLocationDropdown(true)}
                  placeholder="ค้นหาตำแหน่ง (เช่น A1/1, B2/3)"
                  className="pr-10"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                  <Search className="h-4 w-4 text-gray-400" />
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
              </div>

              {showLocationDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredLocations.length > 0 ? (
                    <div className="py-1">
                      {filteredLocations.map((location) => (
                        <button
                          key={location}
                          onClick={() => handleLocationSelect(location)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          {location}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      ไม่พบตำแหน่งที่ตรงกับการค้นหา
                    </div>
                  )}
                </div>
              )}
            </div>
            {destination && (
              <div className="mt-2 text-sm text-green-600">
                ✓ เลือก: <strong>{destination}</strong>
              </div>
            )}
          </div>

          {/* Item Selection Header */}
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center space-x-3">
              <Checkbox
                checked={items.length > 0 && items.every(item => exportItems[item.id]?.selected)}
                onCheckedChange={handleSelectAll}
              />
              <Label className="font-medium">เลือกทั้งหมด ({selectedCount}/{items.length})</Label>
            </div>

            {selectedCount > 0 && (
              <div className="text-sm text-green-600 font-medium">
                เลือกแล้ว {selectedCount} รายการ
              </div>
            )}
          </div>

          {/* Items List */}
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {items.map((item) => {
              const exportItem = exportItems[item.id];
              if (!exportItem) return null;

              return (
                <div key={item.id} className="border rounded-lg p-4 bg-white">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      checked={exportItem.selected}
                      onCheckedChange={(checked) => handleItemSelection(item.id, !!checked)}
                    />

                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">{item.product_name}</h4>
                          <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                        </div>
                      </div>

                      {exportItem.selected && (
                        <div className="bg-gray-50 p-4 rounded-lg border-2 border-blue-200">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Level 1 Quantity */}
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-blue-700">
                                🔵 ส่งออก {item.unit_level1_name}
                              </Label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  min="0"
                                  max={item.unit_level1_quantity}
                                  value={exportItem.exportQuantities.level1}
                                  onChange={(e) => handleQuantityChange(item.id, 'level1', e.target.value)}
                                  className="text-center font-medium border-blue-300 focus:border-blue-500"
                                  placeholder="0"
                                />
                                <div className="text-xs text-gray-500 mt-1 text-center">
                                  สูงสุด: {item.unit_level1_quantity}
                                </div>
                              </div>
                            </div>

                            {/* Level 2 Quantity */}
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-orange-700">
                                🟠 ส่งออก {item.unit_level2_name}
                              </Label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  min="0"
                                  max={item.unit_level2_quantity}
                                  value={exportItem.exportQuantities.level2}
                                  onChange={(e) => handleQuantityChange(item.id, 'level2', e.target.value)}
                                  className="text-center font-medium border-orange-300 focus:border-orange-500"
                                  placeholder="0"
                                />
                                <div className="text-xs text-gray-500 mt-1 text-center">
                                  สูงสุด: {item.unit_level2_quantity}
                                </div>
                              </div>
                            </div>

                            {/* Level 3 Quantity */}
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-red-700">
                                🔴 ส่งออก {item.unit_level3_name}
                              </Label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  min="0"
                                  max={item.unit_level3_quantity}
                                  value={exportItem.exportQuantities.level3}
                                  onChange={(e) => handleQuantityChange(item.id, 'level3', e.target.value)}
                                  className="text-center font-medium border-red-300 focus:border-red-500"
                                  placeholder="0"
                                />
                                <div className="text-xs text-gray-500 mt-1 text-center">
                                  สูงสุด: {item.unit_level3_quantity}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Quick action buttons */}
                          <div className="mt-3 flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setExportItems(prev => ({
                                  ...prev,
                                  [item.id]: {
                                    ...prev[item.id],
                                    exportQuantities: {
                                      level1: item.unit_level1_quantity,
                                      level2: item.unit_level2_quantity,
                                      level3: item.unit_level3_quantity
                                    }
                                  }
                                }));
                              }}
                              className="text-xs flex-1"
                            >
                              ส่งออกทั้งหมด
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setExportItems(prev => ({
                                  ...prev,
                                  [item.id]: {
                                    ...prev[item.id],
                                    exportQuantities: {
                                      level1: 0,
                                      level2: 0,
                                      level3: 0
                                    }
                                  }
                                }));
                              }}
                              className="text-xs flex-1"
                            >
                              ล้าง
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              <X className="h-4 w-4 mr-2" />
              ยกเลิก
            </Button>
            <Button
              onClick={handleExport}
              disabled={loading || selectedCount === 0 || !destination.trim()}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400"
            >
              <Send className="h-4 w-4 mr-2" />
              {loading ? 'กำลังส่งออก...' : `ส่งออกสินค้า (${selectedCount} รายการ)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};