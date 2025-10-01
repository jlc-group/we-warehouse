import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  ShoppingCart,
  Package,
  Calendar,
  DollarSign,
  Eye,
  RefreshCw,
  Search,
  FileText,
  Building
} from 'lucide-react';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { PurchaseOrderService } from '@/services/purchaseOrderService';
import type { PurchaseOrderHeader } from '@/services/purchaseOrderService';

interface PurchaseOrdersListProps {
  onCreateFulfillment?: (poNumber: string) => void;
}

export const PurchaseOrdersList: React.FC<PurchaseOrdersListProps> = ({
  onCreateFulfillment
}) => {
  const {
    purchaseOrders,
    selectedPO,
    loading,
    detailsLoading,
    refreshing,
    error,
    fetchPurchaseOrders,
    fetchPODetails,
    createFulfillmentTask,
    refreshData,
    clearSelectedPO
  } = usePurchaseOrders();

  const [searchTerm, setSearchTerm] = useState('');
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Filter POs based on search term
  const filteredOrders = purchaseOrders.filter(po =>
    po.PO_Number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    po.ARCODE.toLowerCase().includes(searchTerm.toLowerCase()) ||
    po.Warehouse_Name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewDetails = async (poNumber: string) => {
    await fetchPODetails(poNumber);
    setDetailModalOpen(true);
  };

  const handleCreateFulfillment = async (poNumber: string) => {
    await createFulfillmentTask(poNumber);
    if (onCreateFulfillment) {
      onCreateFulfillment(poNumber);
    }
  };

  const handleCloseDetailModal = () => {
    setDetailModalOpen(false);
    clearSelectedPO();
  };

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center">
          <div className="text-red-600 mb-4">❌ เกิดข้อผิดพลาด</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={refreshData} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            ลองใหม่
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Refresh */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Purchase Orders
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="search">ค้นหาใบสั่งซื้อ</Label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  id="search"
                  placeholder="ค้นหาด้วย PO Number, รหัสลูกค้า, หรือชื่อคลัง..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button
              onClick={refreshData}
              disabled={refreshing}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              รีเฟรช
            </Button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold text-blue-800">
                    {filteredOrders.length}
                  </div>
                  <div className="text-sm text-blue-600">ใบสั่งซื้อทั้งหมด</div>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-2xl font-bold text-green-800">
                    {PurchaseOrderService.formatCurrency(
                      filteredOrders.reduce((sum, po) => sum + parseFloat(po.M_TotalAmount), 0)
                    )}
                  </div>
                  <div className="text-sm text-green-600">มูลค่ารวม</div>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-orange-600" />
                <div>
                  <div className="text-2xl font-bold text-orange-800">
                    {new Set(filteredOrders.map(po => po.Warehouse_Name)).size}
                  </div>
                  <div className="text-sm text-orange-600">คลังปลายทาง</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Orders Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>กำลังโหลดข้อมูล...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>รหัสลูกค้า</TableHead>
                  <TableHead>วันที่ PO</TableHead>
                  <TableHead>กำหนดส่ง</TableHead>
                  <TableHead>คลังปลายทาง</TableHead>
                  <TableHead className="text-right">มูลค่า</TableHead>
                  <TableHead className="text-center">การดำเนินการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      {searchTerm ? 'ไม่พบใบสั่งซื้อที่ตรงกับการค้นหา' : 'ไม่มีใบสั่งซื้อ'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((po) => (
                    <TableRow key={po.PO_Number} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="font-mono font-medium">{po.PO_Number}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{po.ARCODE}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {PurchaseOrderService.formatDate(po.PO_Date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            new Date(po.Delivery_Date) < new Date()
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {PurchaseOrderService.formatDate(po.Delivery_Date)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{po.Warehouse_Name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {PurchaseOrderService.formatCurrency(po.M_TotalAmount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetails(po.PO_Number)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleCreateFulfillment(po.PO_Number)}
                          >
                            <Package className="h-4 w-4 mr-1" />
                            สร้างงาน
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* PO Details Modal */}
      <Dialog open={detailModalOpen} onOpenChange={handleCloseDetailModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              รายละเอียดใบสั่งซื้อ {selectedPO?.header.PO_Number}
            </DialogTitle>
            <DialogDescription>
              ข้อมูลทั้งหมดของใบสั่งซื้อและรายการสินค้า
            </DialogDescription>
          </DialogHeader>

          {detailsLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>กำลังโหลดรายละเอียด...</span>
            </div>
          ) : selectedPO ? (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">ข้อมูลใบสั่งซื้อ</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div><strong>PO Number:</strong> {selectedPO.header.PO_Number}</div>
                    <div><strong>รหัสลูกค้า:</strong> {selectedPO.header.ARCODE}</div>
                    <div><strong>วันที่ PO:</strong> {PurchaseOrderService.formatDate(selectedPO.header.PO_Date)}</div>
                    <div><strong>กำหนดส่ง:</strong> {PurchaseOrderService.formatDate(selectedPO.header.Delivery_Date)}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">ข้อมูลการเงิน</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div><strong>มูลค่ารวม:</strong> {PurchaseOrderService.formatCurrency(selectedPO.header.M_TotalAmount)}</div>
                    <div><strong>มูลค่าสุทธิ:</strong> {PurchaseOrderService.formatCurrency(selectedPO.header.M_NetAmount)}</div>
                    <div><strong>ภาษี:</strong> {PurchaseOrderService.formatCurrency(selectedPO.header.M_VatAmount)}</div>
                    <div><strong>คลังปลายทาง:</strong> {selectedPO.header.Warehouse_Name}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Items Table */}
              <Card>
                <CardHeader>
                  <CardTitle>รายการสินค้า ({selectedPO.details.length} รายการ)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>รายการสินค้า</TableHead>
                        <TableHead className="text-right">จำนวน</TableHead>
                        <TableHead className="text-right">ราคาต่อหน่วย</TableHead>
                        <TableHead className="text-right">มูลค่า</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPO.details.map((item, index) => (
                        <TableRow key={item.ID || index}>
                          <TableCell>
                            <div className="font-medium">{item.Keydata}</div>
                          </TableCell>
                          <TableCell className="text-right">
                            {parseFloat(item.Quantity).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {PurchaseOrderService.formatCurrency(item.UnitPrice)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {PurchaseOrderService.formatCurrency(item.TotalAmount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={() => handleCreateFulfillment(selectedPO.header.PO_Number)}
                  className="flex-1"
                >
                  <Package className="h-4 w-4 mr-2" />
                  สร้างงานจัดสินค้า
                </Button>
                <Button variant="outline" onClick={handleCloseDetailModal}>
                  ปิด
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseOrdersList;