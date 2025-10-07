import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Truck, ArrowRight, Package, Building2, AlertTriangle, Clock,
  FileText, Users, CheckCircle2, XCircle, RefreshCw
} from 'lucide-react';
import { CompactWarehouseSelector } from '@/components/WarehouseSelector';
import { useWarehouses } from '@/hooks/useWarehouse';
import { useCreateWarehouseTransfer, type CreateWarehouseTransferData } from '@/hooks/useWarehouseTransfer';
import type { InventoryItem } from '@/hooks/useInventory';
import { formatUnitsDisplay } from '@/utils/unitCalculations';
import { ProductTypeBadge } from '@/components/ProductTypeBadge';
import { toast } from '@/components/ui/sonner';

interface EnhancedWarehouseTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: InventoryItem[];
  onSuccess?: () => void;
}

export function EnhancedWarehouseTransferModal({
  isOpen,
  onClose,
  selectedItems,
  onSuccess
}: EnhancedWarehouseTransferModalProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetWarehouseId: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    estimatedDuration: ''
  });

  const { data: warehouses } = useWarehouses();
  const createTransferMutation = useCreateWarehouseTransfer();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Auto-generate title
      const sourceWarehouses = getSourceWarehouses();
      setFormData(prev => ({
        ...prev,
        title: `ย้ายสินค้า ${selectedItems.length} รายการจาก ${sourceWarehouses.join(', ')}`,
        description: '',
        targetWarehouseId: '',
        priority: 'normal',
        estimatedDuration: ''
      }));
      setActiveTab('details');
    } else {
      setFormData({
        title: '',
        description: '',
        targetWarehouseId: '',
        priority: 'normal',
        estimatedDuration: ''
      });
    }
  }, [isOpen, selectedItems]);

  // Get unique source warehouses
  const getSourceWarehouses = () => {
    const sourceWarehouseIds = Array.from(
      new Set(selectedItems.map(item => item.warehouse_id).filter(Boolean))
    );

    return sourceWarehouseIds
      .map(warehouseId => warehouses?.find(w => w.id === warehouseId)?.name || 'ไม่ระบุ')
      .filter(Boolean);
  };

  const targetWarehouse = warehouses?.find(w => w.id === formData.targetWarehouseId);
  const sourceWarehouseIds = Array.from(
    new Set(selectedItems.map(item => item.warehouse_id).filter(Boolean))
  );

  // Check if target warehouse is same as source
  const isSameWarehouse = sourceWarehouseIds.includes(formData.targetWarehouseId);

  // Group items by product type
  const itemsByType = selectedItems.reduce((acc, item) => {
    const productType = item.sku ? (item.sku.startsWith('FG') ? 'FG' : 'PK') : 'Unknown';
    if (!acc[productType]) acc[productType] = [];
    acc[productType].push(item);
    return acc;
  }, {} as Record<string, InventoryItem[]>);

  const handleCreateTransfer = async () => {
    if (!formData.targetWarehouseId) {
      toast.error('กรุณาเลือก Warehouse ปลายทาง');
      return;
    }

    if (isSameWarehouse) {
      toast.error('Warehouse ปลายทางต้องแตกต่างจาก Warehouse ต้นทาง');
      return;
    }

    if (selectedItems.length === 0) {
      toast.error('ไม่มีสินค้าที่จะย้าย');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('กรุณากรอกชื่อใบย้ายสินค้า');
      return;
    }

    try {
      const transferData: CreateWarehouseTransferData = {
        title: formData.title.trim(),
        source_warehouse_id: sourceWarehouseIds[0], // Primary source warehouse
        target_warehouse_id: formData.targetWarehouseId,
        description: formData.description.trim() || undefined,
        priority: formData.priority,
        inventory_item_ids: selectedItems.map(item => item.id)
      };

      await createTransferMutation.mutateAsync(transferData);

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error creating transfer:', error);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const config = {
      urgent: { label: 'เร่งด่วน', color: 'bg-red-100 text-red-800 border-red-200' },
      high: { label: 'สูง', color: 'bg-orange-100 text-orange-800 border-orange-200' },
      normal: { label: 'ปกติ', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      low: { label: 'ต่ำ', color: 'bg-gray-100 text-gray-800 border-gray-200' }
    };
    const { label, color } = config[priority as keyof typeof config] || config.normal;
    return <Badge className={color}>{label}</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-600" />
            สร้างใบย้ายสินค้าระหว่าง Warehouse
          </DialogTitle>
          <DialogDescription>
            สร้างใบย้ายสินค้าพร้อมระบบติดตามและอนุมัติ
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">รายละเอียด</TabsTrigger>
            <TabsTrigger value="items">รายการสินค้า ({selectedItems.length})</TabsTrigger>
            <TabsTrigger value="summary">สรุป</TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    ข้อมูลพื้นฐาน
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">ชื่อใบย้ายสินค้า *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="เช่น ย้ายสินค้า FG จาก Warehouse D ไป A"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">รายละเอียดเพิ่มเติม</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="รายละเอียดการย้ายสินค้า เหตุผล หรือข้อกำหนดพิเศษ..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="priority">ระดับความสำคัญ</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => setFormData(prev => ({
                        ...prev,
                        priority: value as 'low' | 'normal' | 'high' | 'urgent'
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">🟢 ต่ำ</SelectItem>
                        <SelectItem value="normal">🔵 ปกติ</SelectItem>
                        <SelectItem value="high">🟠 สูง</SelectItem>
                        <SelectItem value="urgent">🔴 เร่งด่วน</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="estimatedDuration">เวลาโดยประมาณ (นาที)</Label>
                    <Input
                      id="estimatedDuration"
                      type="number"
                      value={formData.estimatedDuration}
                      onChange={(e) => setFormData(prev => ({ ...prev, estimatedDuration: e.target.value }))}
                      placeholder="60"
                      min="1"
                      max="1440"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Warehouse Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Warehouse
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Warehouse ต้นทาง</Label>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">{getSourceWarehouses().join(', ')}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Warehouse ปลายทาง *</Label>
                    <CompactWarehouseSelector
                      selectedWarehouseId={formData.targetWarehouseId}
                      onWarehouseChange={(warehouseId) =>
                        setFormData(prev => ({ ...prev, targetWarehouseId: warehouseId || '' }))
                      }
                      showAllOption={false}
                    />
                    {isSameWarehouse && (
                      <div className="flex items-center gap-2 mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm text-yellow-800">
                          Warehouse ปลายทางต้องแตกต่างจาก Warehouse ต้นทาง
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Transfer Preview */}
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">{getSourceWarehouses()[0] || 'ไม่ระบุ'}</span>
                      </div>

                      <ArrowRight className="h-4 w-4 text-muted-foreground" />

                      <div className="flex items-center gap-2">
                        {targetWarehouse ? (
                          <>
                            <Building2 className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium">{targetWarehouse.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {targetWarehouse.code}
                            </Badge>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">เลือก Warehouse ปลายทาง</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Items Tab */}
          <TabsContent value="items" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Items by Type */}
              {Object.entries(itemsByType).map(([productType, items]) => (
                <Card key={productType}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      สินค้าประเภท {productType} ({items.length} รายการ)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {items.map((item) => (
                        <div key={item.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm truncate">
                                  {item.product_name}
                                </span>
                                <ProductTypeBadge sku={item.sku} showIcon={true} />
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {item.sku} • {item.location}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground ml-2">
                              {formatUnitsDisplay(
                                item.unit_level1_quantity || 0,
                                item.unit_level2_quantity || 0,
                                item.unit_level3_quantity || 0,
                                item.unit_level1_name || 'ลัง',
                                item.unit_level2_name || 'กล่อง',
                                item.unit_level3_name || 'ชิ้น'
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  สรุปการย้ายสินค้า
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Transfer Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium">ชื่อใบย้าย</Label>
                    <p className="text-sm text-muted-foreground">{formData.title || 'ไม่ระบุ'}</p>
                  </div>
                  <div>
                    <Label className="font-medium">ระดับความสำคัญ</Label>
                    <div className="mt-1">{getPriorityBadge(formData.priority)}</div>
                  </div>
                  <div>
                    <Label className="font-medium">จำนวนรายการ</Label>
                    <p className="text-sm text-muted-foreground">{selectedItems.length} รายการ</p>
                  </div>
                  <div>
                    <Label className="font-medium">เวลาโดยประมาณ</Label>
                    <p className="text-sm text-muted-foreground">
                      {formData.estimatedDuration ? `${formData.estimatedDuration} นาที` : 'ไม่ระบุ'}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Warehouse Transfer */}
                <div>
                  <Label className="font-medium">การย้าย Warehouse</Label>
                  <div className="flex items-center gap-3 mt-2 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">{getSourceWarehouses().join(', ')}</span>
                    </div>

                    <ArrowRight className="h-4 w-4 text-muted-foreground" />

                    <div className="flex items-center gap-2">
                      {targetWarehouse ? (
                        <>
                          <Building2 className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">{targetWarehouse.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {targetWarehouse.code}
                          </Badge>
                        </>
                      ) : (
                        <span className="text-sm text-red-500">ยังไม่ได้เลือก Warehouse ปลายทาง</span>
                      )}
                    </div>
                  </div>
                </div>

                {formData.description && (
                  <>
                    <Separator />
                    <div>
                      <Label className="font-medium">รายละเอียดเพิ่มเติม</Label>
                      <p className="text-sm text-muted-foreground mt-1">{formData.description}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={createTransferMutation.isPending}
            className="flex-1"
          >
            ยกเลิก
          </Button>

          <Button
            onClick={handleCreateTransfer}
            disabled={
              !formData.title.trim() ||
              !formData.targetWarehouseId ||
              isSameWarehouse ||
              selectedItems.length === 0 ||
              createTransferMutation.isPending
            }
            className="flex-1"
          >
            {createTransferMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                กำลังสร้าง...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                สร้างใบย้ายสินค้า
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}