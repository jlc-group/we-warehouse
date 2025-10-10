import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  Truck,
  RotateCcw,
  Search,
  Filter,
  Eye,
  Settings
} from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
// Fulfillment hooks removed - using placeholder functionality
type PendingOrderItem = any;
import { toast } from '@/components/ui/sonner';

// ใช้ PendingOrderItem จาก useFulfillment hook แล้ว

// สถานะและสีสำหรับแสดงผล
const fulfillmentStatusConfig = {
  pending: { label: 'รอจัด', color: 'gray', bgColor: 'bg-gray-50 text-gray-700 border-gray-200' },
  assigned: { label: 'กำหนด Location แล้ว', color: 'blue', bgColor: 'bg-blue-50 text-blue-700 border-blue-200' },
  picking: { label: 'กำลังเบิก', color: 'yellow', bgColor: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  picked: { label: 'เบิกเสร็จแล้ว', color: 'purple', bgColor: 'bg-purple-50 text-purple-700 border-purple-200' },
  shipped: { label: 'จัดส่งแล้ว', color: 'green', bgColor: 'bg-green-50 text-green-700 border-green-200' }
};

const priorityConfig = {
  LOW: { label: 'ต่ำ', color: 'gray', bgColor: 'bg-gray-50 text-gray-600 border-gray-200' },
  NORMAL: { label: 'ปกติ', color: 'blue', bgColor: 'bg-blue-50 text-blue-600 border-blue-200' },
  HIGH: { label: 'สูง', color: 'orange', bgColor: 'bg-orange-50 text-orange-600 border-orange-200' },
  URGENT: { label: 'ด่วนมาก', color: 'red', bgColor: 'bg-red-50 text-red-600 border-red-200' }
};

// ลบ mock data แล้ว - จะใช้ข้อมูลจาก API

interface LocationSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderItem: PendingOrderItem | null;
  onLocationSelect: (itemId: string, location: string) => void;
}

function LocationSelectionModal({ isOpen, onClose, orderItem, onLocationSelect }: LocationSelectionModalProps) {
  const [selectedLocation, setSelectedLocation] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const { items: inventoryItems } = useInventory();

  // หา inventory items ที่ตรงกับ SKU ของ order item
  const availableItems = inventoryItems?.filter(item =>
    item.sku === orderItem?.sku &&
    (searchLocation === '' || item.location.toLowerCase().includes(searchLocation.toLowerCase()))
  ) || [];

  const handleConfirm = () => {
    if (selectedLocation && orderItem) {
      onLocationSelect(orderItem.id, selectedLocation);
      onClose();
      setSelectedLocation('');
      setSearchLocation('');
    }
  };

  if (!orderItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full h-full sm:max-w-4xl sm:max-h-[80vh] overflow-y-auto">
        <DialogHeader className="p-4 sm:p-6">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">เลือก Location สำหรับ {orderItem.product_name}</span>
            <span className="sm:hidden truncate">เลือก Location</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4">
          {/* Order Item Info */}
          <Card>
            <CardContent className="pt-3 sm:pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                <div>
                  <strong>ใบสั่ง:</strong> {orderItem.order_number}
                </div>
                <div>
                  <strong>ลูกค้า:</strong> {orderItem.customer_name}
                </div>
                <div>
                  <strong>สินค้า:</strong> {orderItem.product_name}
                </div>
                <div>
                  <strong>รหัส:</strong> {orderItem.sku}
                </div>
                <div className="col-span-2">
                  <strong>จำนวนที่สั่ง:</strong> ลัง {orderItem.ordered_quantity_level1} | กล่อง {orderItem.ordered_quantity_level2} | ชิ้น {orderItem.ordered_quantity_level3}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location Search */}
          <div className="space-y-2">
            <Label>ค้นหา Location</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="พิมพ์ location เพื่อค้นหา..."
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Available Locations */}
          <div className="space-y-2">
            <Label>เลือก Location ที่มีสินค้า</Label>
            <div className="border rounded-lg max-h-60 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>สต็อกคงเหลือ</TableHead>
                    <TableHead>เพียงพอ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableItems.map((item) => {
                    const isEnough =
                      (item.unit_level1_quantity || 0) >= orderItem.ordered_quantity_level1 &&
                      (item.unit_level2_quantity || 0) >= orderItem.ordered_quantity_level2 &&
                      (item.unit_level3_quantity || 0) >= orderItem.ordered_quantity_level3;

                    return (
                      <TableRow
                        key={item.id}
                        className={`cursor-pointer hover:bg-muted/50 ${
                          selectedLocation === item.location ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => setSelectedLocation(item.location)}
                      >
                        <TableCell>
                          <input
                            type="radio"
                            checked={selectedLocation === item.location}
                            onChange={() => setSelectedLocation(item.location)}
                            className="w-4 h-4"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{item.location}</TableCell>
                        <TableCell>
                          <div className="text-sm space-y-1">
                            <div>ลัง: {item.unit_level1_quantity || 0}</div>
                            <div>กล่อง: {item.unit_level2_quantity || 0}</div>
                            <div>ชิ้น: {item.unit_level3_quantity || 0}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isEnough ? (
                            <Badge className="bg-green-50 text-green-700 border-green-200">
                              เพียงพอ
                            </Badge>
                          ) : (
                            <Badge className="bg-red-50 text-red-700 border-red-200">
                              ไม่เพียงพอ
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {availableItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>ไม่พบสินค้าในระบบสำหรับ SKU นี้</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedLocation}
            >
              <MapPin className="w-4 h-4 mr-2" />
              เลือก Location นี้
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function WarehouseFulfillmentDashboard() {
  const [selectedItem, setSelectedItem] = useState<PendingOrderItem | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // API hooks
  // Fulfillment functionality removed - using placeholder data
  const pendingItems = [];
  const isLoading = false;
  const stats = {};
  const updateLocationMutation = { mutate: () => {}, isLoading: false };
  const updateStatusMutation = { mutate: () => {}, isLoading: false };

  // Filter items
  const filteredItems = pendingItems.filter(item => {
    const matchesStatus = statusFilter === 'all' || item.fulfillment_status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || item.priority === priorityFilter;
    const matchesSearch = searchTerm === '' ||
      item.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesPriority && matchesSearch;
  });

  // Statistics - ใช้จาก API หรือ fallback ไปยังการนับจาก pending items
  const statisticsData = {
    pending: stats.pending?.item_count || pendingItems.filter(item => item.fulfillment_status === 'pending').length,
    assigned: stats.assigned?.item_count || pendingItems.filter(item => item.fulfillment_status === 'assigned').length,
    picking: stats.picking?.item_count || pendingItems.filter(item => item.fulfillment_status === 'picking').length,
    picked: stats.picked?.item_count || pendingItems.filter(item => item.fulfillment_status === 'picked').length,
    shipped: stats.shipped?.item_count || pendingItems.filter(item => item.fulfillment_status === 'shipped').length,
  };

  const handleLocationSelect = (itemId: string, location: string) => {
    updateLocationMutation.mutate({
      itemId,
      location
    });
  };

  const handleStatusUpdate = (itemId: string, newStatus: PendingOrderItem['fulfillment_status']) => {
    updateStatusMutation.mutate({
      itemId,
      status: newStatus,
      fulfilledBy: 'คลังสินค้า' // TODO: ใช้ user ID จริง
    });
  };

  const openLocationModal = (item: PendingOrderItem) => {
    setSelectedItem(item);
    setIsLocationModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Warehouse Fulfillment</h2>
          <p className="text-muted-foreground">จัดการการเบิก-จัดส่งสินค้าตามใบสั่ง</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">รอจัด</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{statisticsData.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
              <div>
                <p className="text-xs sm:text-sm font-medium text-blue-600 truncate">กำหนด Location</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-900">{statisticsData.assigned}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-yellow-600">กำลังเบิก</p>
                <p className="text-2xl font-bold text-yellow-900">{statisticsData.picking}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-purple-600">เบิกเสร็จ</p>
                <p className="text-2xl font-bold text-purple-900">{statisticsData.picked}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Truck className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-green-600">จัดส่งแล้ว</p>
                <p className="text-2xl font-bold text-green-900">{statisticsData.shipped}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>ค้นหา</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ใบสั่ง, ลูกค้า, สินค้า..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>สถานะ</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกสถานะ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="pending">รอจัด</SelectItem>
                  <SelectItem value="assigned">กำหนด Location แล้ว</SelectItem>
                  <SelectItem value="picking">กำลังเบิก</SelectItem>
                  <SelectItem value="picked">เบิกเสร็จแล้ว</SelectItem>
                  <SelectItem value="shipped">จัดส่งแล้ว</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ความสำคัญ</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกความสำคัญ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="URGENT">ด่วนมาก</SelectItem>
                  <SelectItem value="HIGH">สูง</SelectItem>
                  <SelectItem value="NORMAL">ปกติ</SelectItem>
                  <SelectItem value="LOW">ต่ำ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="invisible">.</Label>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                }}
                className="w-full"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                ล้างตัวกรอง
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>รายการใบสั่งที่ต้องจัด ({filteredItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ใบสั่ง</TableHead>
                  <TableHead>ลูกค้า</TableHead>
                  <TableHead>สินค้า</TableHead>
                  <TableHead>จำนวน</TableHead>
                  <TableHead>ความสำคัญ</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>การดำเนินการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.order_number}</div>
                        <div className="text-sm text-muted-foreground">{item.order_date}</div>
                      </div>
                    </TableCell>
                    <TableCell>{item.customer_name}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.product_name}</div>
                        <div className="text-sm text-muted-foreground">{item.sku}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>ลัง: {item.ordered_quantity_level1}</div>
                        <div>กล่อง: {item.ordered_quantity_level2}</div>
                        <div>ชิ้น: {item.ordered_quantity_level3}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={priorityConfig[item.priority].bgColor}
                      >
                        {priorityConfig[item.priority].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={fulfillmentStatusConfig[item.fulfillment_status].bgColor}
                      >
                        {fulfillmentStatusConfig[item.fulfillment_status].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.fulfillment_location ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">{item.fulfillment_location}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.fulfillment_status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => openLocationModal(item)}
                          >
                            <MapPin className="w-4 h-4 mr-1" />
                            เลือก Location
                          </Button>
                        )}

                        {item.fulfillment_status === 'assigned' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(item.id, 'picking')}
                          >
                            <Package className="w-4 h-4 mr-1" />
                            เริ่มเบิก
                          </Button>
                        )}

                        {item.fulfillment_status === 'picking' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(item.id, 'picked')}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            เบิกเสร็จ
                          </Button>
                        )}

                        {item.fulfillment_status === 'picked' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(item.id, 'shipped')}
                          >
                            <Truck className="w-4 h-4 mr-1" />
                            จัดส่ง
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location Selection Modal */}
      <LocationSelectionModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        orderItem={selectedItem}
        onLocationSelect={handleLocationSelect}
      />
    </div>
  );
}