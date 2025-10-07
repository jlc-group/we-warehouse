import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Warehouse, Building2, Plus, ArrowRightLeft, Package, TrendingUp, Edit, Trash2, RefreshCw } from 'lucide-react';
import { WarehouseManagementService, type Warehouse as WarehouseType, type WarehouseStats } from '@/services/warehouseManagementService';
import { InventoryDataFixService } from '@/services/inventoryDataFixService';
import { useToast } from '@/hooks/use-toast';
import { InterWarehouseTransferModal } from '@/components/InterWarehouseTransferModal';

export const WarehouseManagementPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [warehouseStats, setWarehouseStats] = useState<WarehouseStats[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isFixingData, setIsFixingData] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseType | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    address: '',
    location_prefix_start: '',
    location_prefix_end: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [warehousesData, statsData] = await Promise.all([
        WarehouseManagementService.getAllWarehouses(),
        WarehouseManagementService.getWarehouseStats(),
      ]);
      setWarehouses(warehousesData);
      setWarehouseStats(statsData);
    } catch (error) {
      console.error('Error loading warehouse data:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดข้อมูลคลังได้',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWarehouse = async () => {
    try {
      if (!formData.name || !formData.code) {
        toast({
          title: 'กรุณากรอกข้อมูล',
          description: 'กรุณากรอกชื่อและรหัสคลัง',
          variant: 'destructive',
        });
        return;
      }

      await WarehouseManagementService.createWarehouse(formData);

      toast({
        title: 'สำเร็จ',
        description: 'สร้างคลังใหม่เรียบร้อย',
      });

      setIsCreateDialogOpen(false);
      setFormData({
        name: '',
        code: '',
        description: '',
        address: '',
        location_prefix_start: '',
        location_prefix_end: '',
      });

      loadData();
    } catch (error) {
      console.error('Error creating warehouse:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถสร้างคลังได้',
        variant: 'destructive',
      });
    }
  };

  const handleEditWarehouse = (warehouse: WarehouseType) => {
    setSelectedWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      code: warehouse.code,
      description: warehouse.description || '',
      address: warehouse.address || '',
      location_prefix_start: warehouse.location_prefix_start || '',
      location_prefix_end: warehouse.location_prefix_end || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateWarehouse = async () => {
    try {
      if (!selectedWarehouse || !formData.name || !formData.code) {
        toast({
          title: 'กรุณากรอกข้อมูล',
          description: 'กรุณากรอกชื่อและรหัสคลัง',
          variant: 'destructive',
        });
        return;
      }

      await WarehouseManagementService.updateWarehouse(selectedWarehouse.id, {
        name: formData.name,
        code: formData.code,
        description: formData.description || null,
        address: formData.address || null,
        location_prefix_start: formData.location_prefix_start || null,
        location_prefix_end: formData.location_prefix_end || null,
      });

      toast({
        title: 'สำเร็จ',
        description: 'อัปเดตข้อมูลคลังเรียบร้อย',
      });

      setIsEditDialogOpen(false);
      setSelectedWarehouse(null);
      setFormData({
        name: '',
        code: '',
        description: '',
        address: '',
        location_prefix_start: '',
        location_prefix_end: '',
      });

      loadData();
    } catch (error) {
      console.error('Error updating warehouse:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถอัปเดตคลังได้',
        variant: 'destructive',
      });
    }
  };

  const handleFixUnitQuantities = async () => {
    try {
      setIsFixingData(true);

      toast({
        title: 'กำลังแก้ไขข้อมูล',
        description: 'กำลังอัปเดตจำนวนหน่วยสินค้าในสต็อก...',
      });

      const result = await InventoryDataFixService.populateUnitLevelQuantities();

      if (result.success) {
        toast({
          title: 'แก้ไขข้อมูลสำเร็จ',
          description: `อัปเดต ${result.updatedCount} รายการสินค้าเรียบร้อย`,
        });
      } else {
        toast({
          title: 'แก้ไขข้อมูลเสร็จสิ้น (มีข้อผิดพลาดบางส่วน)',
          description: `อัปเดตสำเร็จ ${result.updatedCount} รายการ, ข้อผิดพลาด ${result.errors.length} รายการ`,
          variant: 'destructive',
        });
      }

      // Reload data after fix
      await loadData();
    } catch (error: any) {
      console.error('Error fixing unit quantities:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message || 'ไม่สามารถแก้ไขข้อมูลได้',
        variant: 'destructive',
      });
    } finally {
      setIsFixingData(false);
    }
  };

  const getWarehouseStat = (warehouseId: string) => {
    return warehouseStats.find((s) => s.warehouse_id === warehouseId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            จัดการคลังสินค้า
          </h2>
          <p className="text-muted-foreground mt-1">
            จัดการคลังและย้ายสินค้าระหว่างคลัง
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                สร้างคลังใหม่
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>สร้างคลังใหม่</DialogTitle>
                <DialogDescription>เพิ่มคลังสินค้าใหม่เข้าสู่ระบบ</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">ชื่อคลัง *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="เช่น คลัง E-commerce"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="code">รหัสคลัง *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="เช่น ECOM"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">คำอธิบาย</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="รายละเอียดคลัง..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">ที่อยู่</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="ที่อยู่คลัง..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="prefix_start">Prefix เริ่มต้น</Label>
                    <Input
                      id="prefix_start"
                      value={formData.location_prefix_start}
                      onChange={(e) =>
                        setFormData({ ...formData, location_prefix_start: e.target.value })
                      }
                      placeholder="เช่น EC"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="prefix_end">Prefix สิ้นสุด</Label>
                    <Input
                      id="prefix_end"
                      value={formData.location_prefix_end}
                      onChange={(e) =>
                        setFormData({ ...formData, location_prefix_end: e.target.value })
                      }
                      placeholder="เช่น EZ"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  ยกเลิก
                </Button>
                <Button onClick={handleCreateWarehouse}>สร้างคลัง</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Warehouse Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>แก้ไขข้อมูลคลัง</DialogTitle>
                <DialogDescription>อัปเดตข้อมูลคลังสินค้า</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">ชื่อคลัง *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="เช่น คลัง E-commerce"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-code">รหัสคลัง *</Label>
                  <Input
                    id="edit-code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="เช่น ECOM"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-description">คำอธิบาย</Label>
                  <Textarea
                    id="edit-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="รายละเอียดคลัง..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-address">ที่อยู่</Label>
                  <Textarea
                    id="edit-address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="ที่อยู่คลัง..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-prefix_start">Prefix เริ่มต้น</Label>
                    <Input
                      id="edit-prefix_start"
                      value={formData.location_prefix_start}
                      onChange={(e) =>
                        setFormData({ ...formData, location_prefix_start: e.target.value })
                      }
                      placeholder="เช่น EC"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-prefix_end">Prefix สิ้นสุด</Label>
                    <Input
                      id="edit-prefix_end"
                      value={formData.location_prefix_end}
                      onChange={(e) =>
                        setFormData({ ...formData, location_prefix_end: e.target.value })
                      }
                      placeholder="เช่น EZ"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  ยกเลิก
                </Button>
                <Button onClick={handleUpdateWarehouse}>บันทึกการแก้ไข</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={() => setIsTransferModalOpen(true)}>
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            ย้ายสินค้าระหว่างคลัง
          </Button>

          <Button
            variant="outline"
            onClick={handleFixUnitQuantities}
            disabled={isFixingData}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isFixingData ? 'animate-spin' : ''}`} />
            {isFixingData ? 'กำลังแก้ไข...' : 'แก้ไขข้อมูลหน่วย'}
          </Button>
        </div>
      </div>

      {/* Warehouse Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {warehouses.map((warehouse) => {
          const stats = getWarehouseStat(warehouse.id);
          return (
            <Card key={warehouse.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{warehouse.name}</CardTitle>
                  </div>
                  <Badge variant={warehouse.is_active ? 'default' : 'secondary'}>
                    {warehouse.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                  </Badge>
                </div>
                <CardDescription>รหัส: {warehouse.code}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {warehouse.description && (
                    <p className="text-sm text-muted-foreground">{warehouse.description}</p>
                  )}

                  {/* Edit Button */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditWarehouse(warehouse)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      แก้ไข
                    </Button>
                  </div>

                  {stats && (
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                          <Package className="h-3 w-3" />
                          <span>สินค้า</span>
                        </div>
                        <div className="text-2xl font-bold">{stats.total_items}</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                          <TrendingUp className="h-3 w-3" />
                          <span>จำนวน</span>
                        </div>
                        <div className="text-2xl font-bold">
                          {stats.total_quantity.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                          <Warehouse className="h-3 w-3" />
                          <span>ชนิด</span>
                        </div>
                        <div className="text-2xl font-bold">{stats.unique_products}</div>
                      </div>
                    </div>
                  )}

                  {warehouse.address && (
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      📍 {warehouse.address}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Warehouse Table */}
      <Card>
        <CardHeader>
          <CardTitle>รายละเอียดคลังทั้งหมด</CardTitle>
          <CardDescription>ข้อมูลคลังในระบบ</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อคลัง</TableHead>
                <TableHead>รหัส</TableHead>
                <TableHead>Prefix</TableHead>
                <TableHead className="text-right">รายการสินค้า</TableHead>
                <TableHead className="text-right">จำนวนชิ้น</TableHead>
                <TableHead>สถานะ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warehouses.map((warehouse) => {
                const stats = getWarehouseStat(warehouse.id);
                return (
                  <TableRow key={warehouse.id}>
                    <TableCell className="font-medium">{warehouse.name}</TableCell>
                    <TableCell>{warehouse.code}</TableCell>
                    <TableCell>
                      {warehouse.location_prefix_start && warehouse.location_prefix_end
                        ? `${warehouse.location_prefix_start} - ${warehouse.location_prefix_end}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">{stats?.total_items || 0}</TableCell>
                    <TableCell className="text-right">
                      {stats?.total_quantity.toLocaleString() || 0}
                    </TableCell>
                    <TableCell>
                      <Badge variant={warehouse.is_active ? 'default' : 'secondary'}>
                        {warehouse.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Inter-Warehouse Transfer Modal */}
      <InterWarehouseTransferModal
        open={isTransferModalOpen}
        onOpenChange={setIsTransferModalOpen}
        warehouses={warehouses}
        onTransferComplete={() => {
          loadData();
          setIsTransferModalOpen(false);
        }}
      />
    </div>
  );
};
