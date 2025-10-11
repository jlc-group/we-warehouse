import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Truck, FileText, Clock, CheckCircle2, XCircle, AlertCircle,
  Search, Filter, Plus, Eye, Play, Pause, RotateCcw,
  Building2, Package, Users, TrendingUp
} from 'lucide-react';
import {
  useWarehouseTransfers,
  useWarehouseTransferItems,
  useUpdateTransferStatus,
  useExecuteWarehouseTransfer,
  useWarehouseTransferStats,
  type WarehouseTransfer
} from '@/hooks/useWarehouseTransfer';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';
import { ProductTypeBadge } from '@/components/ProductTypeBadge';
import { formatUnitsDisplay } from '@/utils/unitCalculations';

interface WarehouseTransferDashboardProps {
  onCreateTransfer?: () => void;
}

export function WarehouseTransferDashboard({ onCreateTransfer }: WarehouseTransferDashboardProps) {
  const [selectedTransfer, setSelectedTransfer] = useState<WarehouseTransfer | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: activeTransfers } = useWarehouseTransfers({ active: true });
  const { data: recentTransfers } = useWarehouseTransfers({ recent: true });
  const { data: allTransfers } = useWarehouseTransfers();
  const { data: stats } = useWarehouseTransferStats();
  const { data: transferItems } = useWarehouseTransferItems(selectedTransfer?.id || '');

  const updateStatusMutation = useUpdateTransferStatus();
  const executeTransferMutation = useExecuteWarehouseTransfer();

  // Filter transfers based on search and status
  const filterTransfers = (transfers: WarehouseTransfer[] | undefined) => {
    if (!transfers) return [];

    return transfers.filter(transfer => {
      const matchesSearch = !searchQuery ||
        transfer.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transfer.transfer_number.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || transfer.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  };

  const getStatusBadge = (status: string) => {
    const config = {
      draft: { label: '📝 ฉบับร่าง', color: 'bg-gray-100 text-gray-800' },
      pending: { label: '⏳ รอการอนุมัติ', color: 'bg-yellow-100 text-yellow-800' },
      approved: { label: '✅ อนุมัติแล้ว', color: 'bg-green-100 text-green-800' },
      in_progress: { label: '🔄 กำลังดำเนินการ', color: 'bg-blue-100 text-blue-800' },
      completed: { label: '✅ เสร็จสิ้น', color: 'bg-emerald-100 text-emerald-800' },
      cancelled: { label: '❌ ยกเลิก', color: 'bg-red-100 text-red-800' }
    };

    const { label, color } = config[status as keyof typeof config] || config.draft;
    return <Badge className={color}>{label}</Badge>;
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

  const handleStatusUpdate = async (transferId: string, newStatus: WarehouseTransfer['status']) => {
    try {
      await updateStatusMutation.mutateAsync({
        transferId,
        status: newStatus
      });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleExecuteTransfer = async (transferId: string) => {
    try {
      await executeTransferMutation.mutateAsync(transferId);
    } catch (error) {
      console.error('Error executing transfer:', error);
    }
  };

  const openTransferDetail = (transfer: WarehouseTransfer) => {
    setSelectedTransfer(transfer);
    setIsDetailModalOpen(true);
  };

  const renderTransferTable = (transfers: WarehouseTransfer[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>หมายเลขใบย้าย</TableHead>
          <TableHead>ชื่อใบย้าย</TableHead>
          <TableHead>จาก → ไป</TableHead>
          <TableHead>สถานะ</TableHead>
          <TableHead>ระดับความสำคัญ</TableHead>
          <TableHead>รายการ</TableHead>
          <TableHead>วันที่สร้าง</TableHead>
          <TableHead>การจัดการ</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transfers.map((transfer) => (
          <TableRow key={transfer.id} className="hover:bg-muted/50">
            <TableCell className="font-mono text-sm">
              {transfer.transfer_number}
            </TableCell>
            <TableCell className="font-medium">
              {transfer.title}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2 text-sm">
                <span className="truncate">{transfer.source_warehouse_code}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="truncate">{transfer.target_warehouse_code}</span>
              </div>
            </TableCell>
            <TableCell>
              {getStatusBadge(transfer.status)}
            </TableCell>
            <TableCell>
              {getPriorityBadge(transfer.priority)}
            </TableCell>
            <TableCell className="text-center">
              <Badge variant="outline">{transfer.total_items}</Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(transfer.created_at), { locale: th, addSuffix: true })}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openTransferDetail(transfer)}
                >
                  <Eye className="h-4 w-4" />
                </Button>

                {transfer.status === 'draft' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStatusUpdate(transfer.id, 'pending')}
                    disabled={updateStatusMutation.isPending}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                )}

                {transfer.status === 'pending' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStatusUpdate(transfer.id, 'approved')}
                    disabled={updateStatusMutation.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}

                {transfer.status === 'approved' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleExecuteTransfer(transfer.id)}
                    disabled={executeTransferMutation.isPending}
                  >
                    <Truck className="h-4 w-4" />
                  </Button>
                )}

                {['draft', 'pending', 'approved'].includes(transfer.status) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStatusUpdate(transfer.id, 'cancelled')}
                    disabled={updateStatusMutation.isPending}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">การจัดการใบย้ายสินค้า</h2>
          <p className="text-muted-foreground">ติดตามและจัดการการย้ายสินค้าระหว่าง Warehouse</p>
        </div>
        {onCreateTransfer && (
          <Button onClick={onCreateTransfer} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            สร้างใบย้ายใหม่
          </Button>
        )}
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ใบย้ายทั้งหมด</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">รอการอนุมัติ</p>
                  <p className="text-2xl font-bold">{stats.byStatus.pending || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">เสร็จสิ้นแล้ว</p>
                  <p className="text-2xl font-bold">{stats.byStatus.completed || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">เดือนนี้</p>
                  <p className="text-2xl font-bold">{stats.thisMonth}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาด้วยหมายเลขใบย้ายหรือชื่อ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="กรองตามสถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                <SelectItem value="draft">ฉบับร่าง</SelectItem>
                <SelectItem value="pending">รอการอนุมัติ</SelectItem>
                <SelectItem value="approved">อนุมัติแล้ว</SelectItem>
                <SelectItem value="in_progress">กำลังดำเนินการ</SelectItem>
                <SelectItem value="completed">เสร็จสิ้น</SelectItem>
                <SelectItem value="cancelled">ยกเลิก</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transfer Lists */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">
            ใบย้ายที่กำลังดำเนินการ ({filterTransfers(activeTransfers).length})
          </TabsTrigger>
          <TabsTrigger value="recent">
            ใบย้ายล่าสุด ({filterTransfers(recentTransfers).length})
          </TabsTrigger>
          <TabsTrigger value="all">
            ใบย้ายทั้งหมด ({filterTransfers(allTransfers).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>ใบย้ายที่กำลังดำเนินการ</CardTitle>
            </CardHeader>
            <CardContent>
              {renderTransferTable(filterTransfers(activeTransfers))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>ใบย้ายล่าสุด (30 วันที่ผ่านมา)</CardTitle>
            </CardHeader>
            <CardContent>
              {renderTransferTable(filterTransfers(recentTransfers))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>ใบย้ายทั้งหมด</CardTitle>
            </CardHeader>
            <CardContent>
              {renderTransferTable(filterTransfers(allTransfers))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transfer Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              รายละเอียดใบย้ายสินค้า {selectedTransfer?.transfer_number}
            </DialogTitle>
            <DialogDescription>
              {selectedTransfer?.title}
            </DialogDescription>
          </DialogHeader>

          {selectedTransfer && (
            <div className="space-y-6">
              {/* Transfer Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">ข้อมูลการย้าย</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>หมายเลขใบย้าย:</span>
                      <span className="font-mono">{selectedTransfer.transfer_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>สถานะ:</span>
                      {getStatusBadge(selectedTransfer.status)}
                    </div>
                    <div className="flex justify-between">
                      <span>ระดับความสำคัญ:</span>
                      {getPriorityBadge(selectedTransfer.priority)}
                    </div>
                    <div className="flex justify-between">
                      <span>จำนวนรายการ:</span>
                      <span>{selectedTransfer.total_items} รายการ</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Warehouse</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>ต้นทาง:</span>
                      <span>{selectedTransfer.source_warehouse_name} ({selectedTransfer.source_warehouse_code})</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ปลายทาง:</span>
                      <span>{selectedTransfer.target_warehouse_name} ({selectedTransfer.target_warehouse_code})</span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedTransfer.description && (
                <div>
                  <h4 className="font-medium mb-2">รายละเอียด</h4>
                  <p className="text-sm text-muted-foreground">{selectedTransfer.description}</p>
                </div>
              )}

              {/* Transfer Items */}
              {transferItems && transferItems.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">รายการสินค้า</h4>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>สินค้า</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>ตำแหน่ง</TableHead>
                          <TableHead>จำนวน</TableHead>
                          <TableHead>สถานะ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transferItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{item.product_name}</span>
                                {item.product_type && (
                                  <ProductTypeBadge sku={item.sku} showIcon={true} />
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                            <TableCell>{item.source_location}</TableCell>
                            <TableCell>
                              {formatUnitsDisplay(
                                item.unit_level1_quantity,
                                item.unit_level2_quantity,
                                item.unit_level3_quantity,
                                'ลัง', 'กล่อง', 'ชิ้น'
                              )}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(item.status)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                {selectedTransfer.status === 'draft' && (
                  <Button
                    onClick={() => handleStatusUpdate(selectedTransfer.id, 'pending')}
                    disabled={updateStatusMutation.isPending}
                  >
                    ส่งเพื่อขออนุมัติ
                  </Button>
                )}

                {selectedTransfer.status === 'pending' && (
                  <>
                    <Button
                      onClick={() => handleStatusUpdate(selectedTransfer.id, 'approved')}
                      disabled={updateStatusMutation.isPending}
                    >
                      อนุมัติ
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleStatusUpdate(selectedTransfer.id, 'cancelled')}
                      disabled={updateStatusMutation.isPending}
                    >
                      ปฏิเสธ
                    </Button>
                  </>
                )}

                {selectedTransfer.status === 'approved' && (
                  <Button
                    onClick={() => handleExecuteTransfer(selectedTransfer.id)}
                    disabled={executeTransferMutation.isPending}
                  >
                    {executeTransferMutation.isPending ? 'กำลังย้าย...' : 'เริ่มย้ายสินค้า'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}