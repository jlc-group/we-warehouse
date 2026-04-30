import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Package, MapPin, Search, ChevronsUpDown, Check } from 'lucide-react';
import { WarehouseManagementService, type Warehouse } from '@/services/warehouseManagementService';
import { useToast } from '@/hooks/use-toast';
import { localDb } from '@/integrations/local/client';
import { LocationCombobox } from '@/components/location/LocationCombobox';

interface InterWarehouseTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: Warehouse[];
  onTransferComplete: () => void;
}

export const InterWarehouseTransferModal = ({
  open,
  onOpenChange,
  warehouses,
  onTransferComplete,
}: InterWarehouseTransferModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [sourceInventory, setSourceInventory] = useState<any[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState(false);
  const [productTypeFilter, setProductTypeFilter] = useState<'ALL' | 'FG' | 'PK' | 'RM'>('ALL');

  // Multi-level units
  const [transferCarton, setTransferCarton] = useState('0');
  const [transferBox, setTransferBox] = useState('0');
  const [transferPieces, setTransferPieces] = useState('0');

  const [toLocation, setToLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [targetLocations, setTargetLocations] = useState<string[]>([]);

  useEffect(() => {
    if (fromWarehouseId) {
      loadSourceInventory();
    } else {
      setSourceInventory([]);
      setFilteredInventory([]);
      setSelectedItem(null);
      setSearchQuery('');
    }
  }, [fromWarehouseId]);

  // โหลด locations ของคลังปลายทาง — ใช้ใน LocationCombobox
  useEffect(() => {
    if (!toWarehouseId) {
      setTargetLocations([]);
      setToLocation('');
      return;
    }
    (async () => {
      const { data, error } = await localDb
        .from('warehouse_locations')
        .select('location_code')
        .eq('warehouse_id', toWarehouseId)
        .eq('is_active', true)
        .order('location_code', { ascending: true });
      if (error) {
        console.error('Error loading target warehouse locations:', error);
        setTargetLocations([]);
        return;
      }
      const codes = (data || [])
        .map((l: any) => l.location_code)
        .filter(Boolean);
      setTargetLocations(codes);
    })();
  }, [toWarehouseId]);

  // Filter inventory by search query and product type
  useEffect(() => {
    let filtered = sourceInventory;

    // Filter by product type
    if (productTypeFilter !== 'ALL') {
      filtered = filtered.filter(item => item.product_type === productTypeFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.product_name?.toLowerCase().includes(query) ||
        item.sku?.toLowerCase().includes(query) ||
        item.location?.toLowerCase().includes(query)
      );
    }

    setFilteredInventory(filtered);
  }, [searchQuery, sourceInventory, productTypeFilter]);

  const loadSourceInventory = async () => {
    try {
      const items = await WarehouseManagementService.getWarehouseInventory(fromWarehouseId);
      setSourceInventory(items);
      setFilteredInventory(items);
    } catch (error) {
      console.error('Error loading source inventory:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดรายการสินค้าได้',
        variant: 'destructive',
      });
    }
  };

  // Calculate total pieces from multi-level units
  const calculateTotalPieces = () => {
    const carton = parseInt(transferCarton) || 0;
    const box = parseInt(transferBox) || 0;
    const pieces = parseInt(transferPieces) || 0;

    const cartonRate = selectedItem?.unit_level1_rate || 1;
    const boxRate = selectedItem?.unit_level2_rate || 1;

    return (carton * cartonRate) + (box * boxRate) + pieces;
  };

  // Get available quantities in each unit
  const getAvailableQuantities = () => {
    if (!selectedItem) return { carton: 0, box: 0, pieces: 0 };

    // Use actual stored quantities if available, otherwise calculate from total pieces
    const carton = selectedItem.unit_level1_quantity || 0;
    const box = selectedItem.unit_level2_quantity || 0;
    const pieces = selectedItem.unit_level3_quantity || 0;

    // If no unit quantities are stored, calculate from total pieces
    if (carton === 0 && box === 0 && pieces === 0 && selectedItem.quantity_pieces > 0) {
      const totalPieces = selectedItem.quantity_pieces || 0;
      const cartonRate = selectedItem.unit_level1_rate || 1;
      const boxRate = selectedItem.unit_level2_rate || 1;

      const calculatedCarton = Math.floor(totalPieces / cartonRate);
      const remainingAfterCarton = totalPieces % cartonRate;
      const calculatedBox = Math.floor(remainingAfterCarton / boxRate);
      const calculatedPieces = remainingAfterCarton % boxRate;

      return { carton: calculatedCarton, box: calculatedBox, pieces: calculatedPieces };
    }

    return { carton, box, pieces };
  };

  // Helper function: แสดง product type badge
  const getProductTypeBadge = (productType: string) => {
    const types = {
      FG: { label: 'FG', color: 'bg-green-100 text-green-800 border-green-300' },
      PK: { label: 'PK', color: 'bg-blue-100 text-blue-800 border-blue-300' },
      RM: { label: 'RM', color: 'bg-orange-100 text-orange-800 border-orange-300' },
    };
    const type = types[productType as keyof typeof types];
    return type || { label: productType || 'N/A', color: 'bg-gray-100 text-gray-700 border-gray-300' };
  };

  const handleTransfer = async () => {
    try {
      if (!fromWarehouseId || !toWarehouseId || !selectedItem || !toLocation) {
        toast({
          title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
          description: 'กรุณาเลือกคลัง สินค้า และกรอกจำนวนที่ต้องการย้าย',
          variant: 'destructive',
        });
        return;
      }

      const totalPieces = calculateTotalPieces();

      if (totalPieces <= 0) {
        toast({
          title: 'จำนวนไม่ถูกต้อง',
          description: 'กรุณากรอกจำนวนที่ต้องการย้ายให้ถูกต้อง',
          variant: 'destructive',
        });
        return;
      }

      if (totalPieces > (selectedItem.quantity_pieces || 0)) {
        toast({
          title: 'จำนวนเกินกว่าที่มี',
          description: `สินค้ามีเพียง ${selectedItem.quantity_pieces} ชิ้น`,
          variant: 'destructive',
        });
        return;
      }

      setLoading(true);

      await WarehouseManagementService.transferBetweenWarehouses({
        from_warehouse_id: fromWarehouseId,
        to_warehouse_id: toWarehouseId,
        inventory_item_id: selectedItem.id,
        product_name: selectedItem.product_name,
        product_code: selectedItem.sku || '',
        quantity_to_transfer: totalPieces,
        transfer_carton: parseInt(transferCarton) || 0,
        transfer_box: parseInt(transferBox) || 0,
        transfer_pieces: parseInt(transferPieces) || 0,
        from_location: selectedItem.location,
        to_location: toLocation,
        notes: notes || undefined,
      });

      const transferSummary = [];
      if (parseInt(transferCarton) > 0) transferSummary.push(`${transferCarton} ${selectedItem.unit_level1_name || 'ลัง'}`);
      if (parseInt(transferBox) > 0) transferSummary.push(`${transferBox} ${selectedItem.unit_level2_name || 'กล่อง'}`);
      if (parseInt(transferPieces) > 0) transferSummary.push(`${transferPieces} ${selectedItem.unit_level3_name || 'ชิ้น'}`);

      toast({
        title: 'สำเร็จ',
        description: `ย้ายสินค้า ${transferSummary.join(' + ')} (${totalPieces} ชิ้น) เรียบร้อย`,
      });

      // Reset form
      setFromWarehouseId('');
      setToWarehouseId('');
      setSelectedItem(null);
      setSearchQuery('');
      setTransferCarton('0');
      setTransferBox('0');
      setTransferPieces('0');
      setToLocation('');
      setNotes('');

      onTransferComplete();
    } catch (error: any) {
      console.error('Error transferring:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message || 'ไม่สามารถย้ายสินค้าได้',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const sourceWarehouse = warehouses.find((w) => w.id === fromWarehouseId);
  const targetWarehouse = warehouses.find((w) => w.id === toWarehouseId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            ย้ายสินค้าระหว่างคลัง
          </DialogTitle>
          <DialogDescription>เลือกคลังต้นทางและปลายทาง พร้อมสินค้าที่ต้องการย้าย</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warehouse Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>คลังต้นทาง</Label>
              <Select value={fromWarehouseId} onValueChange={setFromWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกคลังต้นทาง" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses
                    .filter((w) => w.is_active && w.id !== toWarehouseId)
                    .map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name} ({warehouse.code})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>คลังปลายทาง</Label>
              <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกคลังปลายทาง" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses
                    .filter((w) => w.is_active && w.id !== fromWarehouseId)
                    .map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.name} ({warehouse.code})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Transfer Flow Visualization */}
          {fromWarehouseId && toWarehouseId && (
            <div className="flex items-center justify-center gap-4 p-4 bg-muted rounded-lg">
              <Badge variant="outline" className="text-lg px-4 py-2">
                {sourceWarehouse?.name}
              </Badge>
              <ArrowRight className="h-6 w-6 text-primary" />
              <Badge variant="default" className="text-lg px-4 py-2">
                {targetWarehouse?.name}
              </Badge>
            </div>
          )}

          {/* Product Selection with Search - Using Command Component */}
          {fromWarehouseId && (
            <div className="space-y-2">
              <Label>ค้นหาและเลือกสินค้า</Label>
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={isItemDropdownOpen}
                  className="w-full justify-between font-normal"
                  onClick={() => setIsItemDropdownOpen(!isItemDropdownOpen)}
                >
                  <span className={selectedItem ? "" : "text-muted-foreground"}>
                    {selectedItem
                      ? selectedItem.product_name
                      : "ค้นหาชื่อสินค้า, รหัส SKU หรือตำแหน่ง..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
                {isItemDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-md max-w-2xl">
                    <Command shouldFilter={false}>
                      {/* Search Bar */}
                      <div className="flex items-center border-b px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <Input
                          placeholder="ค้นหาสินค้า..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </div>

                      {/* Product Type Filter Tabs */}
                      <div className="flex items-center gap-1 p-2 border-b bg-slate-50">
                        <Button
                          type="button"
                          size="sm"
                          variant={productTypeFilter === 'ALL' ? 'default' : 'outline'}
                          onClick={() => setProductTypeFilter('ALL')}
                          className="h-7 text-xs"
                        >
                          ทั้งหมด
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={productTypeFilter === 'FG' ? 'default' : 'outline'}
                          onClick={() => setProductTypeFilter('FG')}
                          className="h-7 text-xs bg-green-100 hover:bg-green-200 text-green-800 border-green-300"
                        >
                          🏭 FG
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={productTypeFilter === 'PK' ? 'default' : 'outline'}
                          onClick={() => setProductTypeFilter('PK')}
                          className="h-7 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300"
                        >
                          📦 PK
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={productTypeFilter === 'RM' ? 'default' : 'outline'}
                          onClick={() => setProductTypeFilter('RM')}
                          className="h-7 text-xs bg-orange-100 hover:bg-orange-200 text-orange-800 border-orange-300"
                        >
                          🔧 RM
                        </Button>
                        {(searchQuery || productTypeFilter !== 'ALL') && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            {filteredInventory.length} รายการ
                          </span>
                        )}
                      </div>

                      <CommandList className="max-h-96 overflow-auto">
                        {filteredInventory.length === 0 ? (
                          <CommandEmpty>
                            {searchQuery ? 'ไม่พบสินค้าที่ค้นหา' : 'ไม่มีสินค้าในคลังนี้'}
                          </CommandEmpty>
                        ) : (
                          <CommandGroup>
                            {filteredInventory.map((item) => {
                      // Calculate available quantities for this specific item
                      const itemCarton = item.unit_level1_quantity || 0;
                      const itemBox = item.unit_level2_quantity || 0;
                      const itemPieces = item.unit_level3_quantity || 0;

                      // If no unit quantities stored, calculate from total pieces
                      let displayCarton = itemCarton;
                      let displayBox = itemBox;
                      let displayPieces = itemPieces;

                      if (itemCarton === 0 && itemBox === 0 && itemPieces === 0 && item.quantity_pieces > 0) {
                        const totalPieces = item.quantity_pieces || 0;
                        const cartonRate = item.unit_level1_rate || 1;
                        const boxRate = item.unit_level2_rate || 1;

                        displayCarton = Math.floor(totalPieces / cartonRate);
                        const remainingAfterCarton = totalPieces % cartonRate;
                        displayBox = Math.floor(remainingAfterCarton / boxRate);
                        displayPieces = remainingAfterCarton % boxRate;
                      }

                              const isSelected = selectedItem?.id === item.id;

                              return (
                                <CommandItem
                                  key={item.id}
                                  value={item.id}
                                  onSelect={() => {
                                    setSelectedItem(item);
                                    setTransferCarton('0');
                                    setTransferBox('0');
                                    setTransferPieces('0');
                                    setIsItemDropdownOpen(false);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${isSelected ? 'opacity-100' : 'opacity-0'}`}
                                  />
                                  <div className="flex flex-col gap-1.5 py-1 w-full">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-medium">{item.product_name}</span>
                                      <Badge variant="outline" className="text-xs font-mono">
                                        {item.sku}
                                      </Badge>
                                      {item.product_type && (() => {
                                        const typeBadge = getProductTypeBadge(item.product_type);
                                        return (
                                          <Badge className={`text-xs font-semibold border ${typeBadge.color}`}>
                                            {typeBadge.label}
                                          </Badge>
                                        );
                                      })()}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <MapPin className="h-3 w-3" />
                                      <span>{item.location}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs pt-1 border-t">
                                      <div className="flex items-center gap-1">
                                        <Package className="h-3 w-3 text-green-600" />
                                        <span className="font-semibold text-green-700">
                                          {displayCarton}
                                        </span>
                                        <span className="text-muted-foreground">{item.unit_level1_name || 'ลัง'}</span>
                                      </div>
                                      <span className="text-muted-foreground">•</span>
                                      <div className="flex items-center gap-1">
                                        <Package className="h-3 w-3 text-blue-600" />
                                        <span className="font-semibold text-blue-700">
                                          {displayBox}
                                        </span>
                                        <span className="text-muted-foreground">{item.unit_level2_name || 'กล่อง'}</span>
                                      </div>
                                      <span className="text-muted-foreground">•</span>
                                      <div className="flex items-center gap-1">
                                        <Package className="h-3 w-3 text-orange-600" />
                                        <span className="font-semibold text-orange-700">
                                          {displayPieces}
                                        </span>
                                        <span className="text-muted-foreground">{item.unit_level3_name || 'ชิ้น'}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs bg-slate-50 px-2 py-1 rounded">
                                      <span className="text-muted-foreground">รวมทั้งหมด:</span>
                                      <span className="font-bold text-slate-900 text-sm">{item.quantity_pieces.toLocaleString()}</span>
                                      <span className="text-muted-foreground">ชิ้น</span>
                                    </div>
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Selected Item Info */}
          {selectedItem && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg space-y-3">
              <div className="flex items-center gap-2 font-semibold text-lg">
                <Package className="h-5 w-5 text-blue-600" />
                {selectedItem.product_name}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 bg-white p-2 rounded">
                  <span className="text-muted-foreground">รหัส:</span>
                  <span className="font-mono font-medium">{selectedItem.sku}</span>
                </div>
                <div className="flex items-center gap-2 bg-white p-2 rounded col-span-2">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  <span className="text-muted-foreground">ตำแหน่ง:</span>
                  <span className="font-medium">{selectedItem.location}</span>
                </div>
              </div>

              {/* Available Quantities */}
              <div className="bg-white p-3 rounded-lg border border-blue-200">
                <div className="text-sm font-semibold text-blue-800 mb-2">จำนวนที่มีอยู่</div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center p-2 bg-green-50 rounded">
                    <div className="text-xs text-muted-foreground">{selectedItem.unit_level1_name || 'ลัง'}</div>
                    <div className="text-lg font-bold text-green-700">
                      {getAvailableQuantities().carton}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-blue-50 rounded">
                    <div className="text-xs text-muted-foreground">{selectedItem.unit_level2_name || 'กล่อง'}</div>
                    <div className="text-lg font-bold text-blue-700">
                      {getAvailableQuantities().box}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-orange-50 rounded">
                    <div className="text-xs text-muted-foreground">{selectedItem.unit_level3_name || 'ชิ้น'}</div>
                    <div className="text-lg font-bold text-orange-700">
                      {getAvailableQuantities().pieces}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-center text-muted-foreground mt-2">
                  รวม: {selectedItem.quantity_pieces} ชิ้น
                </div>
              </div>
            </div>
          )}

          {/* Transfer Details */}
          {selectedItem && (
            <>
              {/* Multi-level Unit Input */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">จำนวนที่ต้องการย้าย</Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">{selectedItem.unit_level1_name || 'ลัง'}</Label>
                    <Input
                      type="number"
                      value={transferCarton}
                      onChange={(e) => setTransferCarton(e.target.value)}
                      placeholder="0"
                      min="0"
                      max={getAvailableQuantities().carton}
                      className="text-center font-bold"
                    />
                    <p className="text-xs text-center text-muted-foreground">
                      สูงสุด {getAvailableQuantities().carton}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">{selectedItem.unit_level2_name || 'กล่อง'}</Label>
                    <Input
                      type="number"
                      value={transferBox}
                      onChange={(e) => setTransferBox(e.target.value)}
                      placeholder="0"
                      min="0"
                      className="text-center font-bold"
                    />
                    <p className="text-xs text-center text-muted-foreground">
                      สูงสุด {getAvailableQuantities().box}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">{selectedItem.unit_level3_name || 'ชิ้น'}</Label>
                    <Input
                      type="number"
                      value={transferPieces}
                      onChange={(e) => setTransferPieces(e.target.value)}
                      placeholder="0"
                      min="0"
                      className="text-center font-bold"
                    />
                    <p className="text-xs text-center text-muted-foreground">
                      สูงสุด {getAvailableQuantities().pieces}
                    </p>
                  </div>
                </div>

                {/* Total Calculation */}
                {calculateTotalPieces() > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded text-center">
                    <div className="text-sm text-muted-foreground">รวมทั้งหมด</div>
                    <div className="text-2xl font-bold text-blue-700">
                      {calculateTotalPieces()} ชิ้น
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>ตำแหน่งปลายทาง</Label>
                {targetLocations.length > 0 ? (
                  <LocationCombobox
                    value={toLocation}
                    onChange={setToLocation}
                    allLocations={targetLocations}
                    placeholder="เลือกตำแหน่งใน คลังปลายทาง..."
                  />
                ) : (
                  <Input
                    value={toLocation}
                    onChange={(e) => setToLocation(e.target.value.toUpperCase())}
                    placeholder={toWarehouseId ? 'คลังนี้ยังไม่มีตำแหน่ง' : 'เลือกคลังปลายทางก่อน'}
                    disabled={!toWarehouseId}
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  {targetLocations.length > 0
                    ? `${targetLocations.length} ตำแหน่งในคลังปลายทาง — แสดงตำแหน่งว่างก่อน`
                    : 'รูปแบบ: แถว/ชั้น/ตำแหน่ง (เช่น A1/4)'}
                </p>
              </div>

              <div className="space-y-2">
                <Label>หมายเหตุ (ถ้ามี)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="เพิ่มหมายเหตุ..."
                  rows={3}
                />
              </div>

              {/* Transfer Summary */}
              {calculateTotalPieces() > 0 && toLocation && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">📋 สรุปการย้าย</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">จำนวนที่ย้าย:</span>
                      <div className="font-bold text-right">
                        {parseInt(transferCarton) > 0 && <div>{transferCarton} {selectedItem.unit_level1_name || 'ลัง'}</div>}
                        {parseInt(transferBox) > 0 && <div>{transferBox} {selectedItem.unit_level2_name || 'กล่อง'}</div>}
                        {parseInt(transferPieces) > 0 && <div>{transferPieces} {selectedItem.unit_level3_name || 'ชิ้น'}</div>}
                        <div className="text-blue-600">= {calculateTotalPieces()} ชิ้น</div>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">จาก:</span>
                      <span className="font-medium">{sourceWarehouse?.name} ({selectedItem?.location})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ไปยัง:</span>
                      <span className="font-medium">{targetWarehouse?.name} ({toLocation})</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-green-300">
                      <span className="text-muted-foreground">คงเหลือต้นทาง:</span>
                      <span className="font-bold text-orange-600">
                        {(selectedItem?.quantity_pieces || 0) - calculateTotalPieces()} ชิ้น
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            ยกเลิก
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={loading || !selectedItem || calculateTotalPieces() === 0 || !toLocation}
          >
            {loading ? 'กำลังย้าย...' : 'ย้ายสินค้า'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
