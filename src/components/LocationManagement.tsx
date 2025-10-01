import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, MapPin, Edit, Trash2, Search, Grid3X3, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { normalizeLocation, isValidLocation, parseLocation } from '@/utils/locationUtils';
import { useWarehouseLocations } from '@/hooks/useWarehouseLocations';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type LocationRow = Database['public']['Tables']['warehouse_locations']['Row'];

interface LocationManagementProps {
  userRoleLevel: number;
}

export function LocationManagement({ userRoleLevel }: LocationManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationRow | null>(null);
  const { toast } = useToast();

  // Use the new warehouse locations hook
  const {
    locations,
    locationsWithInventory,
    loading,
    createLocation,
    updateLocation,
    deleteLocation,
    syncInventoryLocations,
  } = useWarehouseLocations();

  // Form state
  const [formData, setFormData] = useState<{
    row: string;
    level: number;
    position: number;
    location_type: "shelf" | "floor" | "special";
    capacity_boxes: number;
    capacity_loose: number;
    description: string;
  }>({
    row: '',
    level: 1,
    position: 1,
    location_type: 'shelf',
    capacity_boxes: 100,
    capacity_loose: 1000,
    description: ''
  });

  // Check if user has permission (manager level = 4+)
  const hasPermission = userRoleLevel >= 4;

  const createLocationsTable = async () => {
    toast({
      title: 'ตารางยังไม่พร้อม',
      description: 'ฟีเจอร์นี้จะพร้อมใช้งานในเร็วๆ นี้',
      variant: 'destructive',
    });
  };

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
        // Update existing location
        const { error } = await supabase
          .from('warehouse_locations')
          .update(locationData)
          .eq('id', editingLocation.id);

        if (error) throw error;

        toast({
          title: 'แก้ไขตำแหน่งสำเร็จ',
          description: `แก้ไขตำแหน่ง ${locationCode} แล้ว`,
        });
      } else {
        // Create new location
        const { error } = await supabase
          .from('warehouse_locations')
          .insert([locationData]);

        if (error) {
          if (error.code === '23505') { // Unique constraint violation
            toast({
              title: 'ตำแหน่งนี้มีอยู่แล้ว',
              description: `ตำแหน่ง ${locationCode} ถูกสร้างไว้แล้ว`,
              variant: 'destructive',
            });
            return;
          }
          throw error;
        }

        toast({
          title: 'เพิ่มตำแหน่งสำเร็จ',
          description: `เพิ่มตำแหน่ง ${locationCode} แล้ว`,
        });
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

      // Refresh locations - handled by the hook

    } catch (error) {
      console.error('Error saving location:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถบันทึกตำแหน่งได้',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (location: LocationRow) => {
    const parsed = parseLocation(location.location_code);
    if (parsed) {
      setFormData({
        row: parsed.row,
        level: parsed.level,
        position: parsed.position,
        location_type: location.location_type as "shelf" | "floor" | "special",
        capacity_boxes: location.capacity_boxes,
        capacity_loose: location.capacity_loose,
        description: location.description || ''
      });
      setEditingLocation(location);
      setIsAddDialogOpen(true);
    }
  };

  const handleDelete = async (location: LocationRow) => {
    if (!hasPermission) {
      toast({
        title: 'ไม่มีสิทธิ์',
        description: 'คุณต้องเป็น Manager ขึ้นไปเพื่อลบตำแหน่ง',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm(`ต้องการลบตำแหน่ง ${location.location_code} หรือไม่?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('warehouse_locations')
        .delete()
        .eq('id', location.id);

      if (error) throw error;

      toast({
        title: 'ลบตำแหน่งสำเร็จ',
        description: `ลบตำแหน่ง ${location.location_code} แล้ว`,
      });

      // Refresh handled by the hook
    } catch (error) {
      console.error('Error deleting location:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถลบตำแหน่งได้',
        variant: 'destructive',
      });
    }
  };

  const filteredLocations = locations.filter(location =>
    location.location_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!hasPermission) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">ไม่มีสิทธิ์เข้าถึง</h3>
          <p className="text-muted-foreground">
            คุณต้องเป็น Manager (Level 4) ขึ้นไปเพื่อจัดการตำแหน่งคลังสินค้า
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-6 w-6" />
          <h2 className="text-2xl font-bold">จัดการตำแหน่งคลัง</h2>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
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
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มตำแหน่งใหม่
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingLocation ? 'แก้ไขตำแหน่ง' : 'เพิ่มตำแหน่งใหม่'}
              </DialogTitle>
              <DialogDescription>
                กรุณากรอกข้อมูลตำแหน่งคลังสินค้า<br />
                <span className="text-sm text-blue-600">รูปแบบ: แถวตำแหน่ง/ชั้น → เช่น A1/1, B15/2, Z20/4</span>
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
                    setFormData(prev => ({ ...prev, location_type: value as "shelf" | "floor" | "special" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shelf">ชั้นวาง</SelectItem>
                    <SelectItem value="floor">พื้น</SelectItem>
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
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="capacity_loose">ความจุ (หลวม)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.capacity_loose}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacity_loose: parseInt(e.target.value) || 0 }))}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">หมายเหตุ (ไม่บังคับ)</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="รายละเอียดเพิ่มเติม..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setEditingLocation(null);
                  }}
                >
                  ยกเลิก
                </Button>
                <Button type="submit">
                  {editingLocation ? 'บันทึกการแก้ไข' : 'เพิ่มตำแหน่ง'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="ค้นหาตำแหน่ง..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Locations Grid */}
      {loading ? (
        <div className="text-center py-8">กำลังโหลดข้อมูล...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredLocations.map((location) => (
            <Card key={location.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{location.location_code}</CardTitle>
                  <Badge variant={location.is_active ? 'default' : 'secondary'}>
                    {location.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">ประเภท:</span>
                    <div className="font-medium">
                      {location.location_type === 'shelf' ? 'ชั้นวาง' :
                       location.location_type === 'floor' ? 'พื้น' : 'พิเศษ'}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ความจุ:</span>
                    <div className="font-medium">
                      {location.capacity_boxes}📦 / {location.capacity_loose}📋
                    </div>
                  </div>
                </div>

                {location.description && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">หมายเหตุ:</span>
                    <div className="text-xs mt-1 p-2 bg-muted rounded">
                      {location.description}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(location)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    แก้ไข
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(location)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    ลบ
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredLocations.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">ไม่พบตำแหน่ง</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'ไม่พบตำแหน่งที่ค้นหา' : 'ยังไม่มีตำแหน่งในระบบ'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มตำแหน่งแรก
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}