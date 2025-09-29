import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { QrCode, Package, CheckCircle, Clock, Truck, AlertCircle, Search, MapPin, User } from 'lucide-react';
import { WarehouseAssignmentService } from '@/services/warehouseAssignmentService';
import { FulfillmentService } from '@/services/fulfillmentService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContextSimple';
import type {
  SalesBillWithItems,
  WarehouseAssignmentWithDetails,
  AssignmentStatus
} from '@/integrations/supabase/types-3phase';

export const WarehouseOperations: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const [salesBillsQueue, setSalesBillsQueue] = useState<SalesBillWithItems[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<WarehouseAssignmentWithDetails[]>([]);
  const [selectedBill, setSelectedBill] = useState<SalesBillWithItems | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<WarehouseAssignmentWithDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('queue');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<AssignmentStatus | 'all'>('all');
  const [use3PhaseSystem, setUse3PhaseSystem] = useState(true);
  const [migrationInfo, setMigrationInfo] = useState<any>(null);

  // Picking form states
  const [pickingData, setPickingData] = useState({
    level1: 0,
    level2: 0,
    level3: 0,
    notes: ''
  });

  useEffect(() => {
    checkSystemAndLoadData();
  }, []);

  const checkSystemAndLoadData = async () => {
    try {
      // Always use 3-phase system since fallback service was removed
      setUse3PhaseSystem(true);
      await loadData(true);
    } catch (error) {
      console.error('Error checking system:', error);
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อฐานข้อมูล",
        variant: "destructive",
      });
    }
  };

  const loadData = async (useThreePhase: boolean = use3PhaseSystem) => {
    setLoading(true);
    try {
      if (useThreePhase) {
        const [queue, assignments] = await Promise.all([
          WarehouseAssignmentService.getSalesBillsQueue(),
          WarehouseAssignmentService.getAssignmentsByStatus('assigned')
        ]);
        setSalesBillsQueue(queue);
        setAssignedTasks(assignments);
      } else {
        // Fallback functionality removed - only using 3-phase system
        setSalesBillsQueue([]);
        setAssignedTasks([]);
      }
    } catch (error) {
      console.error('Error loading warehouse data:', error);
      toast({
        title: "ข้อผิดพลาด",
        description: useThreePhase ?
          "ไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อฐานข้อมูล" :
          "ไม่สามารถโหลดข้อมูลสำรองได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePickItems = async (assignmentId: string) => {
    if (!user?.id) return;

    try {
      if (use3PhaseSystem) {
        await WarehouseAssignmentService.markItemsPicked(
          assignmentId,
          pickingData,
          user.id,
          pickingData.notes
        );
      } else {
        // Fallback functionality removed - only using 3-phase system
        throw new Error('Fallback functionality is no longer available');
      }

      toast({
        title: "บันทึกการจัดเก็บสำเร็จ",
        description: "อัปเดตจำนวนสินค้าที่จัดเก็บแล้ว",
      });

      setPickingData({ level1: 0, level2: 0, level3: 0, notes: '' });
      setSelectedAssignment(null);
      loadData();
    } catch (error) {
      console.error('Error picking items:', error);
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถบันทึกการจัดเก็บได้",
        variant: "destructive",
      });
    }
  };

  const handlePackItems = async (assignmentId: string, notes?: string) => {
    if (!user?.id) return;

    try {
      if (use3PhaseSystem) {
        await WarehouseAssignmentService.markItemsPacked(assignmentId, user.id, notes);
      } else {
        // Fallback functionality removed - only using 3-phase system
        throw new Error('Fallback functionality is no longer available');
      }

      toast({
        title: "บันทึกการแพ็คสำเร็จ",
        description: "สินค้าพร้อมสำหรับการจัดส่ง",
      });

      loadData();
    } catch (error) {
      console.error('Error packing items:', error);
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถบันทึกการแพ็คได้",
        variant: "destructive",
      });
    }
  };

  const handleMarkReadyToShip = async (assignmentId: string) => {
    try {
      if (use3PhaseSystem) {
        await WarehouseAssignmentService.markReadyToShip(assignmentId);
      } else {
        // Fallback functionality removed - only using 3-phase system
        throw new Error('Fallback functionality is no longer available');
      }

      toast({
        title: "พร้อมจัดส่ง",
        description: "สินค้าพร้อมสำหรับการจัดส่ง",
      });

      loadData();
    } catch (error) {
      console.error('Error marking ready to ship:', error);
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตสถานะได้",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      assigned: { label: 'มอบหมายแล้ว', color: 'bg-blue-100 text-blue-800' },
      picked: { label: 'จัดเก็บแล้ว', color: 'bg-yellow-100 text-yellow-800' },
      packed: { label: 'แพ็คแล้ว', color: 'bg-purple-100 text-purple-800' },
      ready_to_ship: { label: 'พร้อมจัดส่ง', color: 'bg-green-100 text-green-800' },
      shipped: { label: 'จัดส่งแล้ว', color: 'bg-gray-100 text-gray-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.assigned;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      urgent: { label: 'ด่วนพิเศษ', color: 'bg-red-100 text-red-800' },
      high: { label: 'ด่วน', color: 'bg-orange-100 text-orange-800' },
      normal: { label: 'ปกติ', color: 'bg-gray-100 text-gray-800' },
      low: { label: 'ไม่ด่วน', color: 'bg-green-100 text-green-800' }
    };

    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.normal;
    return <Badge variant="outline" className={config.color}>{config.label}</Badge>;
  };

  const filteredAssignments = assignedTasks.filter(assignment => {
    const matchesSearch = !searchTerm ||
      assignment.sales_bill?.bill_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.sales_bill?.customer?.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.source_location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || assignment.assignment_status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Migration Banner */}
      {!use3PhaseSystem && migrationInfo && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <div className="flex flex-col gap-3">
            <div>
              <h4 className="font-semibold text-orange-800">ระบบ 3-Phase Sales Workflow ยังไม่พร้อม</h4>
              <p className="text-orange-700">{migrationInfo.message}</p>
            </div>
            <div className="bg-white p-3 rounded border text-sm">
              <p className="font-medium mb-2">วิธีการแก้ไข:</p>
              <ol className="list-decimal list-inside space-y-1 text-gray-700">
                <li>เปิด Supabase Dashboard</li>
                <li>ไปที่ SQL Editor</li>
                <li>รันไฟล์: supabase/migrations/20250126_3phase_sales_workflow.sql</li>
                <li>รันไฟล์: supabase/migrations/20250927_add_payment_tracking.sql</li>
              </ol>
              <p className="mt-2 text-amber-600">ตอนนี้ระบบกำลังใช้โหมดสำรองที่จำกัดความสามารถ</p>
            </div>
          </div>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">การจัดการคลังสินค้า</h2>
          <p className="text-muted-foreground">
            จัดการงานคลัง การหยิบ และการแพ็คสินค้า
            {!use3PhaseSystem && (
              <span className="text-orange-600 font-medium"> (โหมดสำรอง)</span>
            )}
          </p>
        </div>
        <Button onClick={() => loadData()} disabled={loading}>
          {loading ? "กำลังโหลด..." : "รีเฟรช"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            คิวงาน ({salesBillsQueue.length})
          </TabsTrigger>
          <TabsTrigger value="assigned" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            งานที่มอบหมาย ({assignedTasks.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            งานที่เสร็จแล้ว
          </TabsTrigger>
        </TabsList>

        {/* Sales Bills Queue */}
        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                คิวใบสั่งขายที่รอการมอบหมาย
              </CardTitle>
            </CardHeader>
            <CardContent>
              {salesBillsQueue.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">ไม่มีใบสั่งขายที่รอการมอบหมาย</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {salesBillsQueue.map((bill) => (
                    <Card key={bill.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{bill.bill_number}</span>
                              {getPriorityBadge(bill.priority || 'normal')}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              ลูกค้า: {bill.customer?.customer_name} ({bill.customer?.customer_code})
                            </p>
                            <p className="text-sm text-muted-foreground">
                              วันที่: {new Date(bill.bill_date || '').toLocaleDateString('th-TH')}
                            </p>
                            <p className="text-sm">
                              รายการ: {bill.sales_bill_items?.length || 0} รายการ
                            </p>
                          </div>
                          <div className="text-right space-y-2">
                            <p className="text-lg font-semibold">
                              ฿{(bill.total_amount || 0).toLocaleString()}
                            </p>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedBill(bill)}
                                >
                                  ดูรายละเอียด
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>รายละเอียดใบสั่งขาย {bill.bill_number}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>ลูกค้า</Label>
                                      <p>{bill.customer?.customer_name}</p>
                                    </div>
                                    <div>
                                      <Label>รหัสลูกค้า</Label>
                                      <p>{bill.customer?.customer_code}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <Label>รายการสินค้า</Label>
                                    <div className="mt-2 space-y-2">
                                      {bill.sales_bill_items?.map((item, index) => (
                                        <Card key={item.id} className="p-3">
                                          <div className="flex justify-between items-center">
                                            <div>
                                              <p className="font-medium">{item.product_name}</p>
                                              <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                                              <p className="text-sm">
                                                จำนวน: {item.quantity_level1} {item.unit_level1_name} /
                                                {item.quantity_level2} {item.unit_level2_name} /
                                                {item.quantity_level3} {item.unit_level3_name}
                                              </p>
                                            </div>
                                            <div className="text-right">
                                              <p className="font-semibold">
                                                ฿{(item.line_total || 0).toLocaleString()}
                                              </p>
                                            </div>
                                          </div>
                                        </Card>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assigned Tasks */}
        <TabsContent value="assigned" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  งานที่มอบหมายแล้ว
                </CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                    <Input
                      placeholder="ค้นหาใบสั่ง, ลูกค้า, ตำแหน่ง..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as AssignmentStatus | 'all')}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value="all">ทุกสถานะ</option>
                    <option value="assigned">มอบหมายแล้ว</option>
                    <option value="picked">จัดเก็บแล้ว</option>
                    <option value="packed">แพ็คแล้ว</option>
                    <option value="ready_to_ship">พร้อมจัดส่ง</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredAssignments.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">ไม่มีงานที่มอบหมาย</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredAssignments.map((assignment) => (
                    <Card key={assignment.id} className="border-l-4 border-l-orange-500">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">
                                {assignment.sales_bill?.bill_number}
                              </span>
                              {getStatusBadge(assignment.assignment_status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              ลูกค้า: {assignment.sales_bill?.customer?.customer_name}
                            </p>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {assignment.source_location}
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                {assignment.assigned_by ? 'มอบหมายแล้ว' : 'รอมอบหมาย'}
                              </span>
                            </div>
                            <p className="text-sm">
                              จำนวนที่มอบหมาย: {assignment.assigned_quantity_level1} /
                              {assignment.assigned_quantity_level2} /
                              {assignment.assigned_quantity_level3}
                            </p>
                            {assignment.picked_quantity_level1 !== null && (
                              <p className="text-sm text-green-600">
                                จำนวนที่จัดเก็บ: {assignment.picked_quantity_level1} /
                                {assignment.picked_quantity_level2} /
                                {assignment.picked_quantity_level3}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            {assignment.assignment_status === 'assigned' && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedAssignment(assignment);
                                      setPickingData({
                                        level1: assignment.assigned_quantity_level1 || 0,
                                        level2: assignment.assigned_quantity_level2 || 0,
                                        level3: assignment.assigned_quantity_level3 || 0,
                                        notes: ''
                                      });
                                    }}
                                  >
                                    จัดเก็บสินค้า
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>บันทึกการจัดเก็บสินค้า</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <Alert>
                                      <AlertCircle className="h-4 w-4" />
                                      <AlertDescription>
                                        ตำแหน่ง: {assignment.source_location} |
                                        สินค้า: {assignment.sales_bill_item?.product_name}
                                      </AlertDescription>
                                    </Alert>

                                    <div className="grid grid-cols-3 gap-4">
                                      <div>
                                        <Label>ลัง</Label>
                                        <Input
                                          type="number"
                                          value={pickingData.level1}
                                          onChange={(e) => setPickingData(prev => ({
                                            ...prev, level1: parseInt(e.target.value) || 0
                                          }))}
                                        />
                                      </div>
                                      <div>
                                        <Label>กล่อง</Label>
                                        <Input
                                          type="number"
                                          value={pickingData.level2}
                                          onChange={(e) => setPickingData(prev => ({
                                            ...prev, level2: parseInt(e.target.value) || 0
                                          }))}
                                        />
                                      </div>
                                      <div>
                                        <Label>ชิ้น</Label>
                                        <Input
                                          type="number"
                                          value={pickingData.level3}
                                          onChange={(e) => setPickingData(prev => ({
                                            ...prev, level3: parseInt(e.target.value) || 0
                                          }))}
                                        />
                                      </div>
                                    </div>

                                    <div>
                                      <Label>หมายเหตุ</Label>
                                      <Textarea
                                        value={pickingData.notes}
                                        onChange={(e) => setPickingData(prev => ({
                                          ...prev, notes: e.target.value
                                        }))}
                                        placeholder="หมายเหตุการจัดเก็บ (ถ้ามี)"
                                      />
                                    </div>

                                    <Button
                                      onClick={() => handlePickItems(assignment.id)}
                                      className="w-full"
                                    >
                                      บันทึกการจัดเก็บ
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}

                            {assignment.assignment_status === 'picked' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePackItems(assignment.id)}
                              >
                                แพ็คสินค้า
                              </Button>
                            )}

                            {assignment.assignment_status === 'packed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkReadyToShip(assignment.id)}
                              >
                                พร้อมจัดส่ง
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Completed Tasks */}
        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                งานที่เสร็จสิ้นแล้ว
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">ส่วนนี้จะแสดงงานที่เสร็จสิ้นแล้ว</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};