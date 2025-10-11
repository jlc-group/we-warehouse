import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Package,
  Clock,
  CheckCircle,
  AlertTriangle,
  Truck,
  User,
  Calendar,
  DollarSign,
  Phone,
  MapPin,
  FileText,
  RotateCcw
} from 'lucide-react';
// Order hooks removed - using placeholder functionality
import { useAuth } from '@/contexts/AuthContextSimple';
import { toast } from '@/components/ui/sonner';
import { formatCurrency } from '@/utils/formatters';

interface AcceptOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  onAccept: (orderId: string, notes?: string) => void;
  isLoading: boolean;
}

function AcceptOrderDialog({ isOpen, onClose, order, onAccept, isLoading }: AcceptOrderDialogProps) {
  const [notes, setNotes] = useState('');

  const handleAccept = () => {
    onAccept(order?.id, notes);
    setNotes('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">รับงาน: {order?.order_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4">
          <div className="p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded">
            <h4 className="font-medium text-blue-900 text-sm sm:text-base">รายละเอียดใบสั่งขาย</h4>
            <div className="mt-2 space-y-1 text-xs sm:text-sm text-blue-700">
              <p><strong>ลูกค้า:</strong> {order?.customer_name}</p>
              <p><strong>ยอดรวม:</strong> {formatCurrency(order?.total_amount || 0)}</p>
              <p><strong>วันที่สั่ง:</strong> {new Date(order?.order_date).toLocaleDateString('th-TH')}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-xs sm:text-sm">หมายเหตุการรับงาน (ไม่บังคับ)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ระบุหมายเหตุเพิ่มเติม..."
              rows={3}
              className="text-xs sm:text-sm"
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading} className="h-11 sm:h-10 w-full sm:w-auto">
            ยกเลิก
          </Button>
          <Button onClick={handleAccept} disabled={isLoading} className="bg-green-600 hover:bg-green-700 h-11 sm:h-10 w-full sm:w-auto">
            {isLoading ? (
              <>
                <Clock className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                กำลังรับงาน...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                รับงาน
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function WarehouseOrdersDashboard() {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);

  const { user } = useAuth();
  // Order management removed - using placeholder data
  const pendingOrders = [];
  const isLoading = false;
  const error = null;
  const refetch = () => {};
  const acceptOrderMutation = { mutate: () => {}, isLoading: false };

  const handleAcceptOrder = async (orderId: string, notes?: string) => {
    try {
      // 1. Accept the order in warehouse system
      await acceptOrderMutation.mutateAsync({
        orderId,
        acceptedBy: user?.id,
        notes
      });

      // 2. TODO: Create fulfillment items for this order
      // This will be implemented to connect with fulfillment system
      console.log('🔄 Order accepted, ready for fulfillment integration:', {
        orderId,
        acceptedBy: user?.id,
        notes
      });

      setIsAcceptDialogOpen(false);
      setSelectedOrder(null);
      refetch(); // Refresh the list

      toast.success('รับงานสำเร็จ!', {
        description: 'งานถูกรับแล้ว สามารถติดตามใน "งานที่รับแล้ว" ได้'
      });
    } catch (error: any) {
      toast.error('ไม่สามารถรับงานได้', {
        description: error.message || 'เกิดข้อผิดพลาดในการรับงาน'
      });
    }
  };

  const openAcceptDialog = (order: any) => {
    setSelectedOrder(order);
    setIsAcceptDialogOpen(true);
  };

  // Statistics
  const totalOrders = pendingOrders?.length || 0;
  const urgentOrders = pendingOrders?.filter(order =>
    new Date(order.assigned_to_warehouse_at) < new Date(Date.now() - 24 * 60 * 60 * 1000)
  ).length || 0;

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <p>ไม่สามารถโหลดข้อมูลงานคลังได้: {error.message}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">งานใหม่จาก Sales</h2>
          <p className="text-muted-foreground">ใบสั่งขายที่ส่งมาให้คลังดำเนินการ</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
          <RotateCcw className="mr-2 h-4 w-4" />
          รีเฟรช
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">งานรอรับทั้งหมด</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">{totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">เกิน 24 ชั่วโมง</p>
                <p className="text-xl sm:text-2xl font-bold text-orange-600">{urgentOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">พร้อมดำเนินการ</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            รายการงานรอรับ
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Clock className="mr-2 h-4 w-4 animate-spin" />
              กำลังโหลดข้อมูล...
            </div>
          ) : totalOrders === 0 ? (
            <div className="text-center p-8 text-gray-500">
              <Package className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p className="text-lg font-medium">ไม่มีงานใหม่</p>
              <p className="text-sm">รอใบสั่งขายจากฝ่าย Sales</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>เลขที่ใบสั่ง</TableHead>
                  <TableHead>ลูกค้า</TableHead>
                  <TableHead>วันที่ส่งมา</TableHead>
                  <TableHead>ยอดรวม</TableHead>
                  <TableHead>จำนวนสินค้า</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-center">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingOrders?.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.order_number}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.customer_name}</p>
                        <p className="text-sm text-gray-500">{order.customer_code}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          {new Date(order.assigned_to_warehouse_at).toLocaleDateString('th-TH')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">
                          {formatCurrency(order.total_amount || 0)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Package className="h-4 w-4 text-gray-400" />
                        <span>{order.total_items || 0} รายการ</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-purple-50 text-purple-700 border-purple-200"
                      >
                        ส่งให้คลังแล้ว
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        onClick={() => openAcceptDialog(order)}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={acceptOrderMutation.isPending}
                      >
                        <CheckCircle className="mr-1 h-4 w-4" />
                        รับงาน
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Accept Order Dialog */}
      <AcceptOrderDialog
        isOpen={isAcceptDialogOpen}
        onClose={() => {
          setIsAcceptDialogOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        onAccept={handleAcceptOrder}
        isLoading={acceptOrderMutation.isPending}
      />
    </div>
  );
}