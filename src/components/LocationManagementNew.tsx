import React, { useState, useCallback, useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, MapPin, Edit, Trash2, Search, Grid3X3, RefreshCw, Package, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { normalizeLocation, isValidLocation, parseLocation } from '@/utils/locationUtils';
import { useWarehouseLocations } from '@/hooks/useWarehouseLocations';
import type { Database } from '@/integrations/supabase/types';

type LocationRow = Database['public']['Tables']['warehouse_locations']['Row'];

interface LocationManagementProps {
  userRoleLevel: number;
}

interface LocationWithInventoryCount extends LocationRow {
  inventory_count: number;
  total_boxes: number;
  total_loose: number;
  total_cartons: number;
  total_pieces: number;
  total_sheets: number;
  total_bottles: number;
  total_sachets: number;
  total_quantity_sum: number;
  product_list: string | null;
  detailed_inventory: InventoryItem[] | null;
  utilization_percentage: number;
}

interface InventoryItem {
  sku_code: string;
  product_name: string;
  unit: string;
  box_quantity: number;
  loose_quantity: number;
  total_quantity: number;
  unit_display: string;
}

// Memoized LocationCard component for better performance
const LocationCard = memo(({
  location,
  onEdit,
  onDelete
}: {
  location: LocationWithInventoryCount;
  onEdit: (location: LocationRow) => void;
  onDelete: (location: LocationRow) => void;
}) => (
  <div className="grid grid-cols-7 gap-4 p-4 border-b hover:bg-muted/25">
    <div className="flex items-center gap-2">
      <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
        {location.location_code}
      </code>
      {!location.is_active && (
        <Badge variant="secondary">ไม่ใช้งาน</Badge>
      )}
    </div>

    <div>
      <Badge variant={
        location.location_type === 'shelf' ? 'default' :
        location.location_type === 'floor' ? 'secondary' : 'outline'
      }>
        {location.location_type === 'shelf' ? 'ชั้นวาง' :
         location.location_type === 'floor' ? 'พื้นเก็บ' : 'พิเศษ'}
      </Badge>
    </div>

    <div className="text-sm">
      {location.capacity_boxes} / {location.capacity_loose}
    </div>

    <div className="text-sm">
      {location.inventory_count > 0 ? (
        <div className="space-y-1">
          {location.total_cartons > 0 && (
            <div className="text-blue-600">🧳 {location.total_cartons} ลัง</div>
          )}
          {location.total_boxes > 0 && (
            <div className="text-green-600">📦 {location.total_boxes} กล่อง</div>
          )}
          {location.total_pieces > 0 && (
            <div className="text-purple-600">🔲 {location.total_pieces} ชิ้น</div>
          )}
          {location.total_sheets > 0 && (
            <div className="text-indigo-600">📋 {location.total_sheets} แผง</div>
          )}
          {location.total_bottles > 0 && (
            <div className="text-cyan-600">🍼 {location.total_bottles} ขวด</div>
          )}
          {location.total_sachets > 0 && (
            <div className="text-pink-600">📦 {location.total_sachets} ซอง</div>
          )}
          {location.total_loose > 0 && (
            <div className="text-orange-600">📝 {location.total_loose} หลวม</div>
          )}
          <div className="text-xs text-muted-foreground border-t pt-1">
            รวม: {location.total_quantity_sum} หน่วย
          </div>
        </div>
      ) : (
        <span className="text-muted-foreground">ว่าง</span>
      )}
    </div>

    <div className="text-xs max-w-48">
      {location.product_list ? (
        <div className="truncate" title={location.product_list}>
          <Badge variant="outline" className="text-xs">
            {location.inventory_count} สินค้า
          </Badge>
          <div className="mt-1 text-muted-foreground line-clamp-2">
            {location.product_list}
          </div>
        </div>
      ) : (
        <span className="text-muted-foreground">ไม่มีสินค้า</span>
      )}
    </div>

    <div>
      <div className="flex items-center gap-2">
        <div className="w-20 bg-muted rounded-full h-2">
          <div
            className={`h-2 rounded-full ${
              location.utilization_percentage > 80 ? 'bg-red-500' :
              location.utilization_percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(location.utilization_percentage, 100)}%` }}
          />
        </div>
        <span className="text-sm">{Math.round(location.utilization_percentage)}%</span>
      </div>
    </div>

    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onEdit(location)}
      >
        <Edit className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onDelete(location)}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  </div>
));

// Function to generate proper inventory description with all units
const generateInventoryDescription = (location: LocationWithInventoryCount): string => {
  if (location.inventory_count === 0) {
    return '';
  }

  const units = [];

  if (location.total_cartons > 0) {
    units.push(`🧳 ${location.total_cartons} ลัง`);
  }
  if (location.total_boxes > 0) {
    units.push(`📦 ${location.total_boxes} กล่อง`);
  }
  if (location.total_pieces > 0) {
    units.push(`🔲 ${location.total_pieces} ชิ้น`);
  }
  if (location.total_sheets > 0) {
    units.push(`📋 ${location.total_sheets} แผง`);
  }
  if (location.total_bottles > 0) {
    units.push(`🍼 ${location.total_bottles} ขวด`);
  }
  if (location.total_sachets > 0) {
    units.push(`📦 ${location.total_sachets} ซอง`);
  }
  if (location.total_loose > 0) {
    units.push(`📝 ${location.total_loose} หลวม`);
  }

  const itemText = location.inventory_count === 1 ? 'สินค้า' : 'สินค้า';
  const unitsText = units.length > 0 ? units.join(', ') : '';

  return `${itemText}: ${unitsText} (รวม ${location.total_quantity_sum} หน่วย)`;
};

export function LocationManagement({ userRoleLevel }: LocationManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationRow | null>(null);
  const { toast } = useToast();

  // Use the new warehouse locations hook with search
  const {
    locations,
    locationsWithInventory,
    statistics,
    loading,
    hasMore,
    loadMore,
    createLocation,
    updateLocation,
    deleteLocation,
    syncInventoryLocations,
  } = useWarehouseLocations(searchTerm, 50);

  // Form state
  const [formData, setFormData] = useState({
    row: '',
    level: 1,
    position: 1,
    location_type: 'shelf' as const,
    capacity_boxes: 100,
    capacity_loose: 1000,
    description: ''
  });

  // Check if user has permission (manager level = 4+)
  const hasPermission = userRoleLevel >= 4;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasPermission) {
      toast({
        title: 'ไม่มีสิทธิ์',
        description: 'คุณต้องเป็น Manager ขึ้นไปเพื่อจัดการตำแหน่ง',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Validate form inputs before processing
      if (!formData.row.trim()) {
        toast({
          title: 'ข้อมูลไม่ครบถ้วน',
          description: 'กรุณาระบุแถว (A-Z)',
          variant: 'destructive',
        });
        return;
      }

      if (formData.level < 1 || formData.level > 4) {
        toast({
          title: 'ข้อมูลไม่ถูกต้อง',
          description: 'ชั้นต้องอยู่ระหว่าง 1-4',
          variant: 'destructive',
        });
        return;
      }

      if (formData.position < 1 || formData.position > 99) {
        toast({
          title: 'ข้อมูลไม่ถูกต้อง',
          description: 'ตำแหน่งต้องอยู่ระหว่าง 1-99',
          variant: 'destructive',
        });
        return;
      }

      const locationCode = normalizeLocation(`${formData.row}/${formData.level}/${formData.position}`);
      console.log('Generated location code:', locationCode);
      console.log('Form data:', formData);

      if (!isValidLocation(locationCode)) {
        toast({
          title: 'รูปแบบตำแหน่งไม่ถูกต้อง',
          description: `รูปแบบที่ได้: ${locationCode}. กรุณาใส่แถว (A-Z), ชั้น (1-4), ตำแหน่ง (1-99)`,
          variant: 'destructive',
        });
        return;
      }

      const locationData = {
        location_code: locationCode,
        row: formData.row.toUpperCase(),
        level: formData.level,
        position: formData.position,
        location_type: formData.location_type,
        capacity_boxes: formData.capacity_boxes,
        capacity_loose: formData.capacity_loose,
        description: formData.description || null,
        user_id: '00000000-0000-0000-0000-000000000000'
      };

      if (editingLocation) {
        // Update existing location using hook
        await updateLocation(editingLocation.id, locationData);
      } else {
        // Create new location using hook
        await createLocation(locationData);
      }

      // Reset form and close dialog
      setFormData({
        row: '',
        level: 1,
        position: 1,
        location_type: 'shelf',
        capacity_boxes: 100,
        capacity_loose: 1000,
        description: ''
      });
      setIsAddDialogOpen(false);
      setEditingLocation(null);

    } catch (error) {
      // Error handling is done in the hook
      console.error('Error in handleSubmit:', error);
    }
  };

  // Memoized handlers for better performance
  const handleEdit = useCallback((location: LocationWithInventoryCount) => {
    const parsed = parseLocation(location.location_code);
    if (parsed) {
      // Generate proper inventory description with all units
      const inventoryDescription = generateInventoryDescription(location);
      const finalDescription = inventoryDescription || location.description || '';

      setFormData({
        row: parsed.row,
        level: parsed.level,
        position: parsed.position,
        location_type: location.location_type,
        capacity_boxes: location.capacity_boxes,
        capacity_loose: location.capacity_loose,
        description: finalDescription
      });
      setEditingLocation(location);
      setIsAddDialogOpen(true);
    }
  }, []);

  const handleDelete = useCallback(async (location: LocationRow) => {
    if (!hasPermission) {
      toast({
        title: 'ไม่มีสิทธิ์',
        description: 'คุณต้องเป็น Manager ขึ้นไปเพื่อลบตำแหน่ง',
        variant: 'destructive',
      });
      return;
    }

    if (confirm(`คุณแน่ใจหรือไม่ที่จะลบตำแหน่ง ${location.location_code}?`)) {
      try {
        await deleteLocation(location.id);
      } catch (error) {
        // Error handling is done in the hook
        console.error('Error deleting location:', error);
      }
    }
  }, [hasPermission, toast, deleteLocation]);


  // Memoized filtered data for better performance
  const filteredLocationsWithInventory = useMemo(() =>
    locationsWithInventory.filter(location =>
      location.location_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.description?.toLowerCase().includes(searchTerm.toLowerCase())
    ), [locationsWithInventory, searchTerm]
  );

  // Memoized statistics to prevent re-calculations
  const optimizedStats = useMemo(() => {
    const total = statistics?.total_locations || locations.length;
    const withInventory = statistics?.total_with_inventory ||
      filteredLocationsWithInventory.filter(loc => loc.inventory_count > 0).length;
    const avgUtilization = statistics?.average_utilization ||
      (filteredLocationsWithInventory.length > 0
        ? filteredLocationsWithInventory.reduce((sum, loc) => sum + loc.utilization_percentage, 0) / filteredLocationsWithInventory.length
        : 0);
    const activeCount = locations.filter(loc => loc.is_active).length;

    return {
      total,
      withInventory,
      avgUtilization: Math.round(avgUtilization),
      activeCount
    };
  }, [statistics, locations, filteredLocationsWithInventory]);

  if (!hasPermission) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              คุณต้องเป็น Manager (Level 4+) เพื่อเข้าถึงการจัดการตำแหน่งคลัง
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 mx-auto animate-spin text-muted-foreground mb-2" />
            <p className="text-muted-foreground">กำลังโหลดข้อมูลตำแหน่ง...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <Grid3X3 className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">ตำแหน่งทั้งหมด</p>
              <p className="text-2xl font-bold">{optimizedStats.total}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <Package className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">มีสินค้าคงคลัง</p>
              <p className="text-2xl font-bold">{optimizedStats.withInventory}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <BarChart3 className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">ความจุเฉลี่ย</p>
              <p className="text-2xl font-bold">{optimizedStats.avgUtilization}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <MapPin className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">ใช้งานอยู่</p>
              <p className="text-2xl font-bold">{optimizedStats.activeCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header with Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              จัดการตำแหน่งคลัง
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={syncInventoryLocations}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                ซิงค์จาก Inventory
              </Button>

              <Dialog
                open={isAddDialogOpen}
                onOpenChange={(open) => {
                  setIsAddDialogOpen(open);
                  if (!open) {
                    setEditingLocation(null);
                    setFormData({
                      row: '',
                      level: 1,
                      position: 1,
                      location_type: 'shelf',
                      capacity_boxes: 100,
                      capacity_loose: 1000,
                      description: ''
                    });
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    เพิ่มตำแหน่งใหม่
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-w-md bg-white">
                  <DialogHeader>
                    <DialogTitle>
                      {editingLocation ? 'แก้ไขตำแหน่ง' : 'เพิ่มตำแหน่งใหม่'}
                    </DialogTitle>
                    <DialogDescription>
                      กรุณากรอกข้อมูลตำแหน่งคลังสินค้า<br />
                      <span className="text-sm text-blue-600">รูปแบบ: แถว (A-Z) / ชั้น (1-4) / ตำแหน่ง (1-99) → เช่น A/1/01</span>
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="row">แถว</Label>
                        <Select
                          value={formData.row}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, row: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="เลือกแถว" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).map(letter => (
                              <SelectItem key={letter} value={letter}>{letter}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="level">ชั้น</Label>
                        <Select
                          value={formData.level.toString()}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, level: parseInt(value) }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4].map(level => (
                              <SelectItem key={level} value={level.toString()}>{level}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="position">ตำแหน่ง</Label>
                        <Input
                          type="number"
                          min="1"
                          max="99"
                          value={formData.position}
                          onChange={(e) => setFormData(prev => ({ ...prev, position: parseInt(e.target.value) || 1 }))}
                          required
                        />
                      </div>
                    </div>

                    {/* Preview of location code */}
                    {formData.row && (
                      <div className="p-3 bg-blue-50 rounded-lg border">
                        <div className="text-sm text-blue-700 font-medium">ตัวอย่างรหัสตำแหน่งที่จะสร้าง:</div>
                        <div className="text-lg font-bold text-blue-900">
                          {normalizeLocation(`${formData.row}/${formData.level}/${formData.position}`)}
                        </div>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="location_type">ประเภทตำแหน่ง</Label>
                      <Select
                        value={formData.location_type}
                        onValueChange={(value: 'shelf' | 'floor' | 'special') =>
                          setFormData(prev => ({ ...prev, location_type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="shelf">ชั้นวาง</SelectItem>
                          <SelectItem value="floor">พื้นเก็บ</SelectItem>
                          <SelectItem value="special">พิเศษ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="capacity_boxes">ความจุ (กล่อง)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.capacity_boxes}
                          onChange={(e) => setFormData(prev => ({ ...prev, capacity_boxes: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="capacity_loose">ความจุ (หลวม)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.capacity_loose}
                          onChange={(e) => setFormData(prev => ({ ...prev, capacity_loose: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">หมายเหตุ</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="คำอธิบายตำแหน่ง (ไม่จำเป็น)"
                      />
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button type="submit" className="flex-1">
                        {editingLocation ? 'แก้ไข' : 'เพิ่ม'}ตำแหน่ง
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsAddDialogOpen(false)}
                      >
                        ยกเลิก
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Search */}
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="ค้นหาตำแหน่งหรือคำอธิบาย..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Locations Table */}
          <div className="border rounded-lg">
            <div className="grid grid-cols-7 gap-4 p-4 border-b bg-muted/50 font-medium text-sm">
              <div>รหัสตำแหน่ง</div>
              <div>ประเภท</div>
              <div>ความจุ (กล่อง/หลวม)</div>
              <div>จำนวนคงคลัง</div>
              <div>รายการสินค้า</div>
              <div>ความจุที่ใช้</div>
              <div>การจัดการ</div>
            </div>

            {filteredLocationsWithInventory.length > 0 ? (
              <>
                {filteredLocationsWithInventory.map((location) => (
                  <LocationCard
                    key={location.id}
                    location={location}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}

                {/* Load More Button */}
                {hasMore && !loading && (
                  <div className="p-4 text-center border-t">
                    <Button
                      variant="outline"
                      onClick={loadMore}
                      className="w-full"
                    >
                      โหลดข้อมูลเพิ่มเติม ({filteredLocationsWithInventory.length} จากทั้งหมด)
                    </Button>
                  </div>
                )}

                {loading && (
                  <div className="p-4 text-center border-t">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>กำลังโหลด...</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                {searchTerm ? 'ไม่พบตำแหน่งที่ตรงกับการค้นหา' : 'ยังไม่มีตำแหน่งในระบบ'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}