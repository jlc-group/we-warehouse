import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  Play,
  Eye,
  Calendar,
  User,
  Building,
  FileText,
  Edit
} from 'lucide-react';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import {
  PurchaseOrderService,
  type FulfillmentTask,
  type FulfillmentStatus
} from '@/services/purchaseOrderService';

export const FulfillmentQueue = () => {
  const {
    fulfillmentTasks,
    updateTaskStatus,
    cancelFulfillmentItem
  } = usePurchaseOrders();

  const [selectedTask, setSelectedTask] = useState<FulfillmentTask | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  // Filter tasks based on status and source
  const filteredTasks = fulfillmentTasks.filter(task => {
    if (statusFilter !== 'all' && task.status !== statusFilter) return false;
    if (sourceFilter !== 'all' && task.source_type !== sourceFilter) return false;
    return true;
  });

  // Calculate statistics
  const stats = {
    pending: fulfillmentTasks.filter(t => t.status === 'pending').length,
    in_progress: fulfillmentTasks.filter(t => t.status === 'in_progress').length,
    completed: fulfillmentTasks.filter(t => t.status === 'completed').length,
    total: fulfillmentTasks.length
  };

  const handleViewTask = (task: FulfillmentTask) => {
    setSelectedTask(task);
    setDetailModalOpen(true);
  };

  const handleStatusChange = async (taskId: string, newStatus: FulfillmentStatus) => {
    await updateTaskStatus(taskId, newStatus);
  };

  const handleStartTask = (taskId: string) => {
    handleStatusChange(taskId, 'in_progress');
  };

  const handleCompleteTask = (taskId: string) => {
    handleStatusChange(taskId, 'completed');
  };

  const getStatusIcon = (status: FulfillmentStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'in_progress':
        return <Play className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'shipped':
        return <Truck className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const calculateTaskProgress = (task: FulfillmentTask): number => {
    if (task.items.length === 0) return 0;
    const fulfilledItems = task.items.filter(item => item.status === 'picked' || item.status === 'completed').length;
    return (fulfilledItems / task.items.length) * 100;
  };

  const handleCancelItem = async (itemId: string) => {
    const result = await cancelFulfillmentItem(itemId);
    if (result.success && selectedTask) {
      // Refresh selected task details
      const updatedTask = fulfillmentTasks.find(t => t.id === selectedTask.id);
      if (updatedTask) setSelectedTask(updatedTask);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            งานจัดสินค้า (Fulfillment Queue)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <div>
                  <div className="text-2xl font-bold text-yellow-800">
                    {stats.pending}
                  </div>
                  <div className="text-sm text-yellow-600">รอดำเนินการ</div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Play className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold text-blue-800">
                    {stats.in_progress}
                  </div>
                  <div className="text-sm text-blue-600">กำลังทำงาน</div>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-2xl font-bold text-green-800">
                    {stats.completed}
                  </div>
                  <div className="text-sm text-green-600">เสร็จสิ้น</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-gray-600" />
                <div>
                  <div className="text-2xl font-bold text-gray-800">
                    {stats.total}
                  </div>
                  <div className="text-sm text-gray-600">งานทั้งหมด</div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mt-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="กรองตามสถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="pending">รอดำเนินการ</SelectItem>
                <SelectItem value="in_progress">กำลังทำงาน</SelectItem>
                <SelectItem value="completed">เสร็จสิ้น</SelectItem>
                <SelectItem value="shipped">จัดส่งแล้ว</SelectItem>
                <SelectItem value="cancelled">ยกเลิก</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="กรองตามแหล่ง" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกแหล่ง</SelectItem>
                <SelectItem value="api">จาก PO (API)</SelectItem>
                <SelectItem value="manual">สร้างเอง (Manual)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Task List */}
      <Card>
        <CardContent className="p-0">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">
                {statusFilter === 'all' ? 'ยังไม่มีงานจัดสินค้า' : `ไม่มีงานในสถานะ "${PurchaseOrderService.getStatusLabel(statusFilter as FulfillmentStatus)}"`}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>แหล่ง</TableHead>
                  <TableHead>รหัสลูกค้า</TableHead>
                  <TableHead>กำหนดส่ง</TableHead>
                  <TableHead>คลัง</TableHead>
                  <TableHead>ความคืบหน้า</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-center">การดำเนินการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task) => {
                  const progress = calculateTaskProgress(task);
                  const isOverdue = new Date(task.delivery_date) < new Date() && task.status !== 'completed';

                  return (
                    <TableRow key={task.id} className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : ''}`}>
                      <TableCell>
                        <div className="font-mono font-medium">{task.po_number}</div>
                        <div className="text-xs text-gray-500">
                          สร้างเมื่อ: {PurchaseOrderService.formatDate(task.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {task.source_type === 'manual' ? (
                          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                            <Edit className="h-3 w-3 mr-1" />
                            สร้างเอง
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            <FileText className="h-3 w-3 mr-1" />
                            จาก PO
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <Badge variant="outline">{task.customer_code}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <Badge variant={isOverdue ? "destructive" : "secondary"}>
                            {PurchaseOrderService.formatDate(task.delivery_date)}
                          </Badge>
                        </div>
                        {isOverdue && (
                          <div className="text-xs text-red-600 mt-1">เกินกำหนด!</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{task.warehouse_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{Math.round(progress)}%</span>
                            <span className="text-gray-500">
                              {task.items.filter(i => i.status === 'completed').length}/{task.items.length}
                            </span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={PurchaseOrderService.getStatusColor(task.status)}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(task.status)}
                            {PurchaseOrderService.getStatusLabel(task.status)}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewTask(task)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {task.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => handleStartTask(task.id)}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              เริ่มงาน
                            </Button>
                          )}

                          {task.status === 'in_progress' && (
                            <Button
                              size="sm"
                              onClick={() => handleCompleteTask(task.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              เสร็จสิ้น
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Task Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              รายละเอียดงาน: {selectedTask?.po_number}
            </DialogTitle>
            <DialogDescription>
              ข้อมูลทั้งหมดของงานจัดสินค้าและรายการสินค้า
            </DialogDescription>
          </DialogHeader>

          {selectedTask && (
            <div className="space-y-6">
              {/* Task Summary */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">ข้อมูลงาน</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div><strong>PO Number:</strong> {selectedTask.po_number}</div>
                    <div><strong>รหัสลูกค้า:</strong> {selectedTask.customer_code}</div>
                    <div><strong>วันที่ PO:</strong> {PurchaseOrderService.formatDate(selectedTask.po_date)}</div>
                    <div><strong>กำหนดส่ง:</strong> {PurchaseOrderService.formatDate(selectedTask.delivery_date)}</div>
                    <div><strong>คลัง:</strong> {selectedTask.warehouse_name}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">สถานะงาน</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <strong>สถานะปัจจุบัน:</strong>
                      <Badge className={PurchaseOrderService.getStatusColor(selectedTask.status)}>
                        {getStatusIcon(selectedTask.status)}
                        <span className="ml-1">{PurchaseOrderService.getStatusLabel(selectedTask.status)}</span>
                      </Badge>
                    </div>
                    <div><strong>ความคืบหน้า:</strong> {Math.round(calculateTaskProgress(selectedTask))}%</div>
                    <div><strong>มูลค่างาน:</strong> {PurchaseOrderService.formatCurrency(selectedTask.total_amount)}</div>
                    <div><strong>อัปเดตล่าสุด:</strong> {PurchaseOrderService.formatDate(selectedTask.updated_at)}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Items Progress */}
              <Card>
                <CardHeader>
                  <CardTitle>รายการสินค้า ({selectedTask.items.length} รายการ)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>รายการสินค้า</TableHead>
                        <TableHead>รหัสสินค้า</TableHead>
                        <TableHead>ตำแหน่ง</TableHead>
                        <TableHead className="text-right">จำนวนที่ต้องการ</TableHead>
                        <TableHead className="text-right">สต็อกที่มี</TableHead>
                        <TableHead className="text-right">จัดไปแล้ว</TableHead>
                        <TableHead className="text-center">สถานะ</TableHead>
                        <TableHead className="text-right">มูลค่า</TableHead>
                        <TableHead className="text-center">การดำเนินการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTask.items.map((item) => {
                        const isStockShortage = (item.available_stock || 0) < item.requested_quantity;

                        return (
                          <TableRow key={item.id} className={isStockShortage ? 'bg-red-50' : ''}>
                            <TableCell>
                              <div className="font-medium">{item.product_name}</div>
                              {!item.inventory_item_id && (
                                <div className="text-xs text-orange-600 mt-1">⚠️ ไม่พบในระบบสต็อก</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono">
                                {item.product_code || '⚠️ ไม่มีรหัส'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {item.location || '❌ ไม่พบในสต็อก'}
                              </div>
                              {!item.inventory_item_id && (
                                <Badge variant="destructive" className="text-xs mt-1">
                                  ⚠️ ไม่พบในระบบ
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.requested_quantity.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={isStockShortage ? 'text-red-600 font-semibold' : 'text-green-600'}>
                                {(item.available_stock ?? 0).toLocaleString()}
                              </span>
                              {isStockShortage && (
                                <div className="text-xs text-red-600">ขาด {(item.requested_quantity - (item.available_stock ?? 0)).toLocaleString()}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.fulfilled_quantity.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={
                                  item.status === 'completed' ? 'default' :
                                  item.status === 'picked' ? 'secondary' : 'outline'
                                }
                                className={
                                  item.status === 'picked' ? 'bg-blue-100 text-blue-800' : ''
                                }
                              >
                                {item.status === 'completed' ? 'เสร็จสิ้น' :
                                 item.status === 'picked' ? 'จัดแล้ว' : 'รอจัด'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {PurchaseOrderService.formatCurrency(item.total_amount)}
                            </TableCell>
                            <TableCell className="text-center">
                              {item.status === 'picked' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 hover:bg-red-50"
                                  onClick={() => handleCancelItem(item.id)}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  ยกเลิก
                                </Button>
                              )}
                              {item.status === 'completed' && (
                                <span className="text-xs text-gray-500">-</span>
                              )}
                              {item.status === 'pending' && (
                                <span className="text-xs text-gray-500">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Status Update Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Select
                  value={selectedTask.status}
                  onValueChange={(value) => handleStatusChange(selectedTask.id, value as FulfillmentStatus)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">รอดำเนินการ</SelectItem>
                    <SelectItem value="in_progress">กำลังทำงาน</SelectItem>
                    <SelectItem value="completed">เสร็จสิ้น</SelectItem>
                    <SelectItem value="shipped">จัดส่งแล้ว</SelectItem>
                    <SelectItem value="cancelled">ยกเลิก</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={() => setDetailModalOpen(false)}
                  className="ml-auto"
                >
                  ปิด
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FulfillmentQueue;