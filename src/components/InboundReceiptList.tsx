/**
 * Inbound Receipt List - รายการประวัติการรับเข้าสินค้า
 * แสดงรายการทั้งหมด พร้อม filter และ detail view
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
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
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Package,
  Eye,
  RefreshCw,
  Search,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Factory,
  TruckIcon,
  Archive
} from 'lucide-react';
import { useInboundReceipts } from '@/hooks/useInboundReceipts';
import { useAuth } from '@/contexts/AuthContextSimple';
import type { ReceiptStatus, ReceiptType, InboundReceipt } from '@/services/inboundReceiptService';

export function InboundReceiptList() {
  const { user } = useAuth();

  // Filters
  const [statusFilter, setStatusFilter] = useState<ReceiptStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ReceiptType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);

  const {
    receipts,
    selectedReceipt,
    selectedReceiptItems,
    isLoading,
    isDetailsLoading,
    isUpdating,
    isStocking,
    setSelectedReceiptId,
    refetchReceipts,
    updateStatus,
    stockItems
  } = useInboundReceipts({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    receipt_type: typeFilter !== 'all' ? typeFilter : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined
  });

  // Filter by search term (client-side)
  const filteredReceipts = receipts.filter(receipt => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      receipt.receipt_number.toLowerCase().includes(term) ||
      receipt.po_number?.toLowerCase().includes(term) ||
      receipt.supplier_name?.toLowerCase().includes(term)
    );
  });

  const handleViewDetail = (receipt: InboundReceipt) => {
    setSelectedReceiptId(receipt.id);
    setShowDetailModal(true);
  };

  const handleUpdateStatus = async (receiptId: string, status: ReceiptStatus) => {
    await updateStatus({ receiptId, status, userId: user?.id });
    refetchReceipts();
  };

  const handleStockItems = async (receiptId: string) => {
    if (confirm('ยืนยันการเข้าสต็อกสินค้า? สินค้าจะถูกเพิ่มเข้าในระบบคลัง')) {
      await stockItems({ receiptId, userId: user?.id });
      setShowDetailModal(false);
    }
  };

  const getStatusBadge = (status: ReceiptStatus) => {
    const variants: Record<ReceiptStatus, any> = {
      draft: { variant: 'secondary', icon: <Clock className="h-3 w-3" />, label: 'ร่าง' },
      received: { variant: 'default', icon: <Package className="h-3 w-3" />, label: 'รับเข้าแล้ว' },
      qc_pending: { variant: 'outline', icon: <Clock className="h-3 w-3" />, label: 'รอ QC' },
      qc_approved: { variant: 'default', icon: <CheckCircle2 className="h-3 w-3" />, label: 'ผ่าน QC' },
      qc_rejected: { variant: 'destructive', icon: <XCircle className="h-3 w-3" />, label: 'ไม่ผ่าน QC' },
      completed: { variant: 'default', icon: <CheckCircle2 className="h-3 w-3" />, label: 'เสร็จสิ้น' },
      cancelled: { variant: 'destructive', icon: <XCircle className="h-3 w-3" />, label: 'ยกเลิก' }
    };

    const config = variants[status];
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getTypeBadge = (type: ReceiptType) => {
    const config: Record<ReceiptType, { icon: any; label: string; color: string }> = {
      po_fg: { icon: <Factory className="h-3 w-3" />, label: 'FG (โรงงาน)', color: 'bg-green-100 text-green-800' },
      po_pk: { icon: <TruckIcon className="h-3 w-3" />, label: 'PK (ซัพพลายเออร์)', color: 'bg-purple-100 text-purple-800' },
      manual: { icon: <Package className="h-3 w-3" />, label: 'Manual', color: 'bg-gray-100 text-gray-800' },
      return: { icon: <Archive className="h-3 w-3" />, label: 'สินค้าคืน', color: 'bg-blue-100 text-blue-800' },
      adjustment: { icon: <Package className="h-3 w-3" />, label: 'ปรับสต็อก', color: 'bg-orange-100 text-orange-800' }
    };

    const typeConfig = config[type];
    return (
      <Badge variant="outline" className={`flex items-center gap-1 ${typeConfig.color}`}>
        {typeConfig.icon}
        {typeConfig.label}
      </Badge>
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTotalPieces = (item: any): number => {
    return (
      (item.received_quantity_level1 || 0) * (item.unit_level1_rate || 144) +
      (item.received_quantity_level2 || 0) * (item.unit_level2_rate || 12) +
      (item.received_quantity_level3 || 0)
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">ประวัติการรับเข้าสินค้า</h2>
          <p className="text-muted-foreground">รายการทั้งหมด ({filteredReceipts.length} รายการ)</p>
        </div>
        <Button onClick={() => refetchReceipts()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          รีเฟรช
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label>ค้นหา</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="เลขที่เอกสาร, PO..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>สถานะ</Label>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="draft">ร่าง</SelectItem>
                  <SelectItem value="received">รับเข้าแล้ว</SelectItem>
                  <SelectItem value="qc_pending">รอ QC</SelectItem>
                  <SelectItem value="qc_approved">ผ่าน QC</SelectItem>
                  <SelectItem value="completed">เสร็จสิ้น</SelectItem>
                  <SelectItem value="cancelled">ยกเลิก</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type Filter */}
            <div className="space-y-2">
              <Label>ประเภท</Label>
              <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="po_fg">FG (โรงงาน)</SelectItem>
                  <SelectItem value="po_pk">PK (ซัพพลายเออร์)</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="return">สินค้าคืน</SelectItem>
                  <SelectItem value="adjustment">ปรับสต็อก</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div className="space-y-2">
              <Label>วันที่เริ่มต้น</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            {/* Date To */}
            <div className="space-y-2">
              <Label>วันที่สิ้นสุด</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>รายการรับเข้า</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
              <p className="ml-2 text-gray-600">กำลังโหลด...</p>
            </div>
          ) : filteredReceipts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">ไม่พบรายการรับเข้า</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เลขที่เอกสาร</TableHead>
                    <TableHead>วันที่</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead>PO Number</TableHead>
                    <TableHead>ผู้ส่ง</TableHead>
                    <TableHead className="text-center">รายการ</TableHead>
                    <TableHead className="text-right">จำนวน (ชิ้น)</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead className="text-center">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceipts.map((receipt) => (
                    <TableRow key={receipt.id}>
                      <TableCell className="font-medium">{receipt.receipt_number}</TableCell>
                      <TableCell>{formatDate(receipt.receipt_date)}</TableCell>
                      <TableCell>{getTypeBadge(receipt.receipt_type)}</TableCell>
                      <TableCell>{receipt.po_number || '-'}</TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate">{receipt.supplier_name || '-'}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{receipt.total_items}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {receipt.total_quantity?.toLocaleString() || '0'}
                      </TableCell>
                      <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetail(receipt)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              รายละเอียดการรับเข้า
            </DialogTitle>
            <DialogDescription>
              เลขที่: {selectedReceipt?.receipt_number}
            </DialogDescription>
          </DialogHeader>

          {isDetailsLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : selectedReceipt ? (
            <div className="space-y-6">
              {/* Header Info */}
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">วันที่รับเข้า</Label>
                      <p className="font-medium">{formatDate(selectedReceipt.receipt_date)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">ประเภท</Label>
                      <div className="mt-1">{getTypeBadge(selectedReceipt.receipt_type)}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">ผู้ส่ง/ซัพพลายเออร์</Label>
                      <p className="font-medium">{selectedReceipt.supplier_name || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">PO Number</Label>
                      <p className="font-medium">{selectedReceipt.po_number || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">คลัง</Label>
                      <p className="font-medium">{selectedReceipt.warehouse_name || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">สถานะ</Label>
                      <div className="mt-1">{getStatusBadge(selectedReceipt.status)}</div>
                    </div>
                  </div>
                  {selectedReceipt.notes && (
                    <div className="mt-4">
                      <Label className="text-muted-foreground">หมายเหตุ</Label>
                      <p className="text-sm">{selectedReceipt.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Items */}
              <Card>
                <CardHeader>
                  <CardTitle>รายการสินค้า ({selectedReceiptItems.length} รายการ)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>สินค้า</TableHead>
                        <TableHead className="text-center">ลัง</TableHead>
                        <TableHead className="text-center">กล่อง</TableHead>
                        <TableHead className="text-center">ชิ้น</TableHead>
                        <TableHead className="text-right">รวม (ชิ้น)</TableHead>
                        <TableHead>ตำแหน่ง</TableHead>
                        <TableHead>Lot</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedReceiptItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.product_name}</div>
                              <div className="text-xs text-muted-foreground">{item.product_code}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{item.received_quantity_level1}</TableCell>
                          <TableCell className="text-center">{item.received_quantity_level2}</TableCell>
                          <TableCell className="text-center">{item.received_quantity_level3}</TableCell>
                          <TableCell className="text-right font-medium">
                            {getTotalPieces(item).toLocaleString()}
                          </TableCell>
                          <TableCell>{item.location || '-'}</TableCell>
                          <TableCell>{item.lot_number || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Actions */}
              {selectedReceipt.status === 'received' && (
                <div className="flex gap-2 justify-end">
                  <Button
                    onClick={() => handleStockItems(selectedReceipt.id)}
                    disabled={isStocking}
                  >
                    {isStocking ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        กำลังเข้าสต็อก...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        เข้าสต็อก
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
