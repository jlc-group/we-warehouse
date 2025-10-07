import { useState, useEffect } from 'react';
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
  AlertTriangle,
  XCircle,
  Send
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

export const WarehousePickingSystem = () => {
  const { fulfillmentTasks, updateTaskStatus, cancelFulfillmentItem, confirmTaskShipment } = usePurchaseOrders();
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
      isCompleted: items.every(item => item.status === 'picked' || item.status === 'completed')
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

  const pickItem = async (item: FulfillmentItem, pickedQuantity: number, selectedLocations?: LocationOption[]) => {
    try {
      if (!selectedTask) return;

      // อัปเดต status เป็น 'picked' (ยังยกเลิกได้)
      const newStatus = 'picked';

      const { error } = await supabase
        .from('fulfillment_items')
        .update({
          fulfilled_quantity: pickedQuantity,
          status: newStatus,
          picked_at: new Date().toISOString(),
          picked_by: '00000000-0000-0000-0000-000000000000', // TODO: ใช้ user ID จริง
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);

      if (error) throw error;

      // หักสต็อกจากทุก location ที่เลือก
      if (selectedLocations && selectedLocations.length > 0) {
        for (const loc of selectedLocations) {
          if (loc.selected_quantity > 0) {
            const { error: stockError } = await supabase
              .from('inventory_items')
              .update({
                quantity: supabase.raw(`GREATEST(quantity - ${loc.selected_quantity}, 0)`)
              })
              .eq('id', loc.inventory_item_id);

            if (stockError) {
              console.error('Error deducting stock:', stockError);
              throw stockError;
            }
          }
        }
      } else if (item.inventory_item_id) {
        // Fallback: หักจาก location เดียว (เหมือนเดิม)
        const { error: stockError } = await supabase
          .from('inventory_items')
          .update({
            quantity: supabase.raw(`GREATEST(quantity - ${pickedQuantity}, 0)`)
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
              ? { ...i, fulfilled_quantity: pickedQuantity, status: newStatus, picked_at: new Date().toISOString() }
              : i
          ),
          isCompleted: loc.items.every(i =>
            i.id === item.id ? true : (i.status === 'picked' || i.status === 'completed')
          )
        }))
      );

      const locationSummary = selectedLocations && selectedLocations.length > 0
        ? `จาก ${selectedLocations.filter(l => l.selected_quantity > 0).length} ตำแหน่ง`
        : '';

      toast({
        title: '✅ จัดสินค้าสำเร็จ',
        description: `จัด ${item.product_name} จำนวน ${pickedQuantity} ${locationSummary} แล้ว (ยังยกเลิกได้)`
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

  // ยกเลิกรายการที่ picked แล้ว
  const handleCancelItem = async (item: FulfillmentItem) => {
    try {
      if (!selectedTask) return;

      const result = await cancelFulfillmentItem(item.id);

      if (result.success) {
        // Update local state
        setPickingLocations(prev =>
          prev.map(loc => ({
            ...loc,
            items: loc.items.map(i =>
              i.id === item.id
                ? { ...i, fulfilled_quantity: 0, status: 'pending', picked_at: undefined, picked_by: undefined }
                : i
            ),
            isCompleted: false
          }))
        );

        toast({
          title: '✅ ยกเลิกสำเร็จ',
          description: `ยกเลิกการจัด ${item.product_name} และคืนสต็อกแล้ว`
        });
      }
    } catch (error) {
      console.error('Error canceling item:', error);
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: 'ไม่สามารถยกเลิกได้',
        variant: 'destructive'
      });
    }
  };

  // ยืนยันการจัดส่ง (จะเปลี่ยน status จาก picked → completed และเปลี่ยน task เป็น shipped)
  const handleConfirmShipment = async () => {
    if (!selectedTask) return;

    try {
      const result = await confirmTaskShipment(selectedTask.id);

      if (result.success) {
        setPickingMode(false);
        setSelectedTask(null);
        setPickingLocations([]);

        toast({
          title: '🎉 ยืนยันการจัดส่งสำเร็จ',
          description: `PO ${selectedTask.po_number} พร้อมส่งมอบ (ยกเลิกไม่ได้แล้ว)`,
        });
      }
    } catch (error) {
      console.error('Error confirming shipment:', error);
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: 'ไม่สามารถยืนยันการจัดส่งได้',
        variant: 'destructive'
      });
    }
  };

  const calculateTaskProgress = (task: FulfillmentTask): number => {
    if (task.items.length === 0) return 0;
    const pickedItems = task.items.filter(item => item.status === 'picked' || item.status === 'completed').length;
    return (pickedItems / task.items.length) * 100;
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
                      onCancel={handleCancelItem}
                      onNavigateToLocation={navigateToLocation}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Confirm Shipment */}
        {pickingLocations.every(loc => loc.isCompleted) && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Send className="h-12 w-12 text-blue-600 mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold text-blue-800">
                    พร้อมยืนยันการจัดส่ง
                  </h3>
                  <p className="text-blue-600">
                    สินค้าทั้งหมดจัดเรียบร้อย - กดยืนยันเพื่อส่งมอบ
                  </p>
                  <p className="text-sm text-orange-600 mt-2">
                    ⚠️ หลังจากยืนยันแล้วจะยกเลิกไม่ได้
                  </p>
                </div>
                <Button onClick={handleConfirmShipment} className="bg-blue-600 hover:bg-blue-700">
                  <Send className="h-4 w-4 mr-2" />
                  ยืนยันการจัดส่ง
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
                items={inventoryItems || []}
                onShelfClick={handleShelfClick}
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
  onPick: (item: FulfillmentItem, quantity: number, selectedLocations?: LocationOption[]) => void;
  onCancel: (item: FulfillmentItem) => void;
  onNavigateToLocation?: (location: string) => void;
}

interface LocationOption {
  inventory_item_id: string;
  location: string;
  available_stock: number;
  selected_quantity: number;
}

const PickingItemRow = ({ item, onPick, onCancel, onNavigateToLocation }) => {
  const [pickQuantity, setPickQuantity] = useState(item.requested_quantity);
  const [showDialog, setShowDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);

  const isPicked = item.status === 'picked';
  const isCompleted = item.status === 'completed';
  const isShortage = (item.available_stock || 0) < item.requested_quantity;

  // Load available locations when dialog opens
  const handleDialogOpen = async (open: boolean) => {
    setShowDialog(open);

    if (open && !isPicked && !isCompleted) {
      setLoadingLocations(true);
      try {
        // ใช้ฟังก์ชันใหม่ค้นหาทุก location
        const locations = await PurchaseOrderService.findAllInventoryLocationsForProduct(item.product_name);

        if (locations.length === 0) {
          console.warn('No locations found for product:', item.product_name);
          setLocationOptions([]);
        } else {
          const options: LocationOption[] = locations.map(loc => ({
            inventory_item_id: loc.inventory_item_id,
            location: loc.location,
            available_stock: loc.available_stock,
            selected_quantity: 0
          }));

          setLocationOptions(options);
        }
      } catch (error) {
        console.error('Error loading locations:', error);
        setLocationOptions([]);
      } finally {
        setLoadingLocations(false);
      }
    }
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const newOptions = [...locationOptions];
    newOptions[index].selected_quantity = Math.max(0, Math.min(quantity, newOptions[index].available_stock));
    setLocationOptions(newOptions);
  };

  const getTotalSelected = () => {
    return locationOptions.reduce((sum, opt) => sum + opt.selected_quantity, 0);
  };

  const handlePick = () => {
    const totalSelected = getTotalSelected();
    if (totalSelected === 0) {
      alert('กรุณาเลือกจำนวนที่จะเบิกอย่างน้อย 1 ตำแหน่ง');
      return;
    }

    if (totalSelected > item.requested_quantity) {
      alert(`จำนวนรวมเกินที่ต้องการ (${totalSelected} > ${item.requested_quantity})`);
      return;
    }

    // ส่ง locationOptions ที่เลือกไปด้วย
    onPick(item, totalSelected, locationOptions.filter(loc => loc.selected_quantity > 0));
    setShowDialog(false);
  };

  const handleCancelConfirm = () => {
    onCancel(item);
    setShowCancelDialog(false);
  };

  return (
    <div className={`border rounded-lg p-4 ${isPicked ? 'bg-blue-50 border-blue-200' : isCompleted ? 'bg-green-50 border-green-200' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-medium">{item.product_name}</h4>
            {isPicked && <CheckCircle className="h-4 w-4 text-blue-600" />}
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

        <div className="ml-4 flex gap-2">
          {!isPicked && !isCompleted && (
            <Dialog open={showDialog} onOpenChange={handleDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Package className="h-4 w-4 mr-1" />
                  จัดสินค้า
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>จัดสินค้า: {item.product_name}</DialogTitle>
                  <DialogDescription>
                    เลือกตำแหน่งและจำนวนที่จะเบิก
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* สรุปยอดต้องการ */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">ต้องการทั้งหมด:</span>
                      <span className="text-lg font-bold text-blue-600">{item.requested_quantity}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-gray-600">เลือกแล้ว:</span>
                      <span className={`text-lg font-bold ${getTotalSelected() > item.requested_quantity ? 'text-red-600' : 'text-green-600'}`}>
                        {getTotalSelected()}
                      </span>
                    </div>
                  </div>

                  {/* รายการ locations */}
                  {loadingLocations ? (
                    <div className="text-center py-8">
                      <div className="text-gray-500">กำลังโหลดตำแหน่ง...</div>
                    </div>
                  ) : locationOptions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-2 text-orange-400" />
                      <p>ไม่พบสินค้าในคลัง</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="text-sm font-medium">เลือกตำแหน่งที่จะเบิก:</label>
                      {locationOptions.map((option, index) => (
                        <Card key={option.inventory_item_id} className="border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <MapPin className="h-4 w-4 text-blue-600" />
                                  <span className="font-mono font-semibold">{option.location}</span>
                                  <Badge variant="outline">
                                    มี {option.available_stock} หน่วย
                                  </Badge>
                                </div>
                              </div>
                              <div className="w-32">
                                <Input
                                  type="number"
                                  placeholder="จำนวน"
                                  value={option.selected_quantity || ''}
                                  onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                                  max={option.available_stock}
                                  min={0}
                                  className={option.selected_quantity > option.available_stock ? 'border-red-500' : ''}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* คำเตือนถ้าเกิน */}
                  {getTotalSelected() > item.requested_quantity && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                      ⚠️ จำนวนที่เลือกเกินที่ต้องการ ({getTotalSelected()} &gt; {item.requested_quantity})
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      onClick={handlePick}
                      className="flex-1"
                      disabled={getTotalSelected() === 0 || getTotalSelected() > item.requested_quantity}
                    >
                      ยืนยันการจัดสินค้า ({getTotalSelected()} หน่วย)
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
          )}

          {isPicked && (
            <>
              <Badge variant="default" className="bg-blue-100 text-blue-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                จัดแล้ว
              </Badge>
              <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50">
                    <XCircle className="h-4 w-4 mr-1" />
                    ยกเลิก
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>ยกเลิกการจัดสินค้า</DialogTitle>
                    <DialogDescription>
                      คุณต้องการยกเลิกการจัดสินค้านี้ใช่หรือไม่?
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>{item.product_name}</strong>
                        <br />
                        จำนวน: {item.fulfilled_quantity} หน่วย
                        <br />
                        <span className="text-xs">สต็อกจะถูกคืนกลับทันที</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleCancelConfirm}
                        variant="destructive"
                        className="flex-1"
                      >
                        ยืนยันการยกเลิก
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowCancelDialog(false)}
                      >
                        ไม่ยกเลิก
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}

          {isCompleted && (
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