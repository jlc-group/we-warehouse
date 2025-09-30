import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Package,
  MapPin,
  CheckCircle,
  Clock,
  Truck,
  QrCode,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import {
  PurchaseOrderService,
  type FulfillmentTask,
  type FulfillmentItem
} from '@/services/purchaseOrderService';
import { supabase } from '@/integrations/supabase/client';
import { ShelfGrid } from '@/components/ShelfGrid';
import { useInventory } from '@/hooks/useInventory';

interface PickingLocation {
  location: string;
  items: FulfillmentItem[];
  isCompleted: boolean;
}

export const WarehousePickingSystem: React.FC = () => {
  const { fulfillmentTasks, updateTaskStatus } = usePurchaseOrders();
  const { items: inventoryItems } = useInventory();
  const { toast } = useToast();

  const [selectedTask, setSelectedTask] = useState<FulfillmentTask | null>(null);
  const [pickingLocations, setPickingLocations] = useState<PickingLocation[]>([]);
  const [currentLocation, setCurrentLocation] = useState<string>('');
  const [scannedBarcode, setScannedBarcode] = useState<string>('');
  const [pickingMode, setPickingMode] = useState(false);
  const [showWarehouseMap, setShowWarehouseMap] = useState(false);
  const [highlightedLocation, setHighlightedLocation] = useState<string>('');

  // Group items by location for picking optimization
  const groupItemsByLocation = (task: FulfillmentTask): PickingLocation[] => {
    const locationMap = new Map<string, FulfillmentItem[]>();

    task.items.forEach(item => {
      const location = item.location || 'ไม่ระบุตำแหน่ง';
      if (!locationMap.has(location)) {
        locationMap.set(location, []);
      }
      locationMap.get(location)!.push(item);
    });

    return Array.from(locationMap.entries()).map(([location, items]) => ({
      location,
      items,
      isCompleted: items.every(item => item.status === 'completed')
    }));
  };

  const startPicking = (task: FulfillmentTask) => {
    setSelectedTask(task);
    setPickingLocations(groupItemsByLocation(task));
    setPickingMode(true);

    // Update task status to in_progress
    updateTaskStatus(task.id, 'in_progress');

    toast({
      title: '🎯 เริ่มจัดสินค้า',
      description: `เริ่มจัดสินค้าสำหรับ PO: ${task.po_number}`
    });
  };

  const pickItem = async (item: FulfillmentItem, pickedQuantity: number) => {
    try {
      if (!selectedTask) return;

      // Update item status in database
      const newStatus = pickedQuantity >= item.requested_quantity ? 'completed' : 'partial';

      const { error } = await supabase
        .from('fulfillment_items')
        .update({
          fulfilled_quantity: pickedQuantity,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);

      if (error) throw error;

      // Update inventory stock
      if (item.inventory_item_id) {
        const { error: stockError } = await supabase
          .from('inventory_items')
          .update({
            quantity: (item.available_stock || 0) - pickedQuantity
          })
          .eq('id', item.inventory_item_id);

        if (stockError) throw stockError;
      }

      // Update local state
      setPickingLocations(prev =>
        prev.map(loc => ({
          ...loc,
          items: loc.items.map(i =>
            i.id === item.id
              ? { ...i, fulfilled_quantity: pickedQuantity, status: newStatus }
              : i
          ),
          isCompleted: loc.items.every(i =>
            i.id === item.id ? newStatus === 'completed' : i.status === 'completed'
          )
        }))
      );

      toast({
        title: '✅ จัดสินค้าสำเร็จ',
        description: `จัด ${item.product_name} จำนวน ${pickedQuantity} แล้ว`
      });

    } catch (error) {
      console.error('Error picking item:', error);
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: 'ไม่สามารถบันทึกการจัดสินค้าได้',
        variant: 'destructive'
      });
    }
  };

  const completeTask = async () => {
    if (!selectedTask) return;

    try {
      await updateTaskStatus(selectedTask.id, 'completed');

      setPickingMode(false);
      setSelectedTask(null);
      setPickingLocations([]);

      toast({
        title: '🎉 จัดสินค้าเสร็จสิ้น',
        description: `PO ${selectedTask.po_number} พร้อมส่งมอบ`,
      });

    } catch (error) {
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: 'ไม่สามารถอัปเดตสถานะงานได้',
        variant: 'destructive'
      });
    }
  };

  const calculateTaskProgress = (task: FulfillmentTask): number => {
    if (task.items.length === 0) return 0;
    const completedItems = task.items.filter(item => item.status === 'completed').length;
    return (completedItems / task.items.length) * 100;
  };

  // Navigate to location in warehouse map
  const navigateToLocation = (location: string) => {
    setHighlightedLocation(location);
    setShowWarehouseMap(true);

    toast({
      title: '🗺️ เปิดแผนผังคลัง',
      description: `แสดงตำแหน่ง: ${location}`,
    });
  };

  // Handle shelf click from warehouse map
  const handleShelfClick = (location: string) => {
    setCurrentLocation(location);
    setShowWarehouseMap(false);

    toast({
      title: '📍 เลือกตำแหน่ง',
      description: `กำลังงานที่ตำแหน่ง: ${location}`,
    });
  };

  // Filter tasks that are ready for picking
  const pendingTasks = fulfillmentTasks.filter(task =>
    task.status === 'pending' || task.status === 'in_progress'
  );

  if (pickingMode && selectedTask) {
    return (
      <div className="space-y-6">
        {/* Task Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                กำลังจัดสินค้า: {selectedTask.po_number}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {selectedTask.customer_code}
                </Badge>
                <Button
                  variant="outline"
                  onClick={() => setPickingMode(false)}
                >
                  ย้อนกลับ
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <div className="text-sm text-gray-500">กำหนดส่ง</div>
                <div className="font-medium">
                  {PurchaseOrderService.formatDate(selectedTask.delivery_date)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">คลังสินค้า</div>
                <div className="font-medium">{selectedTask.warehouse_name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">ความคืบหน้า</div>
                <div className="flex items-center gap-2">
                  <Progress value={calculateTaskProgress(selectedTask)} className="flex-1" />
                  <span className="text-sm">{Math.round(calculateTaskProgress(selectedTask))}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Picking by Location */}
        <div className="space-y-4">
          {pickingLocations.map((location, index) => (
            <Card key={index} className={location.isCompleted ? 'border-green-200 bg-green-50' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    ตำแหน่ง: {location.location}
                    {location.isCompleted && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateToLocation(location.location)}
                      className="text-xs"
                    >
                      🗺️ ดูแผนผัง
                    </Button>
                    <Badge variant={location.isCompleted ? 'default' : 'secondary'}>
                      {location.items.length} รายการ
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {location.items.map((item) => (
                    <PickingItemRow
                      key={item.id}
                      item={item}
                      onPick={pickItem}
                      onNavigateToLocation={navigateToLocation}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Complete Task */}
        {pickingLocations.every(loc => loc.isCompleted) && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold text-green-800">
                    จัดสินค้าเสร็จสิ้น!
                  </h3>
                  <p className="text-green-600">
                    สินค้าทั้งหมดพร้อมสำหรับจัดส่ง
                  </p>
                </div>
                <Button onClick={completeTask} className="bg-green-600 hover:bg-green-700">
                  <Truck className="h-4 w-4 mr-2" />
                  เสร็จสิ้น - พร้อมจัดส่ง
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Warehouse Map Modal */}
        <Dialog open={showWarehouseMap} onOpenChange={setShowWarehouseMap}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                แผนผังคลังสินค้า - ตำแหน่ง: {highlightedLocation}
              </DialogTitle>
              <DialogDescription>
                คลิกที่ตำแหน่งในแผนผังเพื่อเลือกพื้นที่ทำงาน
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <ShelfGrid
                onShelfClick={handleShelfClick}
                highlightedShelf={highlightedLocation}
                showLocationInfo={true}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowWarehouseMap(false)}
                >
                  ปิด
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            ระบบจัดสินค้าคลัง (Warehouse Picking)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            เลือกงานจัดสินค้าเพื่อเริ่มจัดเตรียมสินค้าตามตำแหน่งในคลัง
          </p>

          {pendingTasks.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">ไม่มีงานจัดสินค้าที่รอดำเนินการ</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>ลูกค้า</TableHead>
                  <TableHead>กำหนดส่ง</TableHead>
                  <TableHead>จำนวนรายการ</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-center">การดำเนินการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-mono">{task.po_number}</TableCell>
                    <TableCell>{task.customer_code}</TableCell>
                    <TableCell>
                      {PurchaseOrderService.formatDate(task.delivery_date)}
                    </TableCell>
                    <TableCell>{task.items.length} รายการ</TableCell>
                    <TableCell>
                      <Badge className={PurchaseOrderService.getStatusColor(task.status)}>
                        {PurchaseOrderService.getStatusLabel(task.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        onClick={() => startPicking(task)}
                        size="sm"
                      >
                        <QrCode className="h-4 w-4 mr-1" />
                        เริ่มจัดสินค้า
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Individual picking item component
interface PickingItemRowProps {
  item: FulfillmentItem;
  onPick: (item: FulfillmentItem, quantity: number) => void;
  onNavigateToLocation?: (location: string) => void;
}

const PickingItemRow: React.FC<PickingItemRowProps> = ({ item, onPick, onNavigateToLocation }) => {
  const [pickQuantity, setPickQuantity] = useState(item.requested_quantity);
  const [showDialog, setShowDialog] = useState(false);

  const isCompleted = item.status === 'completed';
  const isShortage = (item.available_stock || 0) < item.requested_quantity;

  const handlePick = () => {
    onPick(item, pickQuantity);
    setShowDialog(false);
  };

  return (
    <div className={`border rounded-lg p-4 ${isCompleted ? 'bg-green-50 border-green-200' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-medium">{item.product_name}</h4>
            {isCompleted && <CheckCircle className="h-4 w-4 text-green-600" />}
            {isShortage && <AlertTriangle className="h-4 w-4 text-orange-500" />}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <span className="text-gray-500">รหัสสินค้า:</span>
              <div className="font-mono">{item.product_code || 'N/A'}</div>
            </div>
            <div>
              <span className="text-gray-500">ตำแหน่ง:</span>
              <div className="flex items-center gap-1">
                <span className="font-mono text-blue-600">{item.location || 'N/A'}</span>
                {item.location && onNavigateToLocation && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigateToLocation(item.location!)}
                    className="h-5 w-5 p-0 text-blue-500 hover:text-blue-700"
                    title="ดูในแผนผัง"
                  >
                    🗺️
                  </Button>
                )}
              </div>
            </div>
            <div>
              <span className="text-gray-500">ต้องการ:</span>
              <div className="font-semibold">{item.requested_quantity}</div>
            </div>
            <div>
              <span className="text-gray-500">สต็อกที่มี:</span>
              <div className={isShortage ? 'text-orange-600 font-semibold' : 'text-green-600'}>
                {item.available_stock || 0}
              </div>
            </div>
            <div>
              <span className="text-gray-500">จัดแล้ว:</span>
              <div className="font-semibold text-blue-600">{item.fulfilled_quantity}</div>
            </div>
          </div>

          {isShortage && (
            <div className="mt-2 text-sm text-orange-600">
              ⚠️ สต็อกไม่เพียงพอ (ขาด {item.requested_quantity - (item.available_stock || 0)} หน่วย)
            </div>
          )}
        </div>

        <div className="ml-4">
          {!isCompleted ? (
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Package className="h-4 w-4 mr-1" />
                  จัดสินค้า
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>จัดสินค้า: {item.product_name}</DialogTitle>
                  <DialogDescription>
                    กรอกจำนวนที่จัดได้จริง
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">จำนวนที่จัด:</label>
                    <Input
                      type="number"
                      value={pickQuantity}
                      onChange={(e) => setPickQuantity(Number(e.target.value))}
                      max={Math.min(item.requested_quantity, item.available_stock || 0)}
                      min={0}
                      className="mt-1"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      สูงสุด: {Math.min(item.requested_quantity, item.available_stock || 0)} หน่วย
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handlePick} className="flex-1">
                      ยืนยันการจัดสินค้า
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowDialog(false)}
                    >
                      ยกเลิก
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Badge variant="default" className="bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              เสร็จสิ้น
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export default WarehousePickingSystem;