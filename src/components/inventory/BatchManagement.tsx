import { useState, useMemo } from 'react';
import { useDepartmentInventory } from '@/hooks/useDepartmentInventory';
import { useAuth } from '@/contexts/AuthContextSimple';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calendar,
  Package,
  AlertTriangle,
  Clock,
  CheckCircle,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  ShoppingCart
} from 'lucide-react';

interface BatchInfo {
  id: string;
  batchNumber: string;
  productName: string;
  sku: string;
  manufacturingDate: string;
  expiryDate: string;
  quantity: number;
  location: string;
  supplier?: string;
  qualityStatus: 'passed' | 'pending' | 'failed' | 'quarantine';
  daysUntilExpiry: number;
  status: 'active' | 'expired' | 'near_expiry' | 'recalled';
}

interface ExpiryAlert {
  severity: 'critical' | 'warning' | 'info';
  batches: BatchInfo[];
  message: string;
  actionRequired: string;
}

interface BatchManagementProps {
  warehouseId?: string;
}

function BatchManagement({ warehouseId }: BatchManagementProps = {}) {
  const { user } = useAuth();
  const { items, permissions, updateItem } = useDepartmentInventory(warehouseId);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isAddBatchModalOpen, setIsAddBatchModalOpen] = useState(false);

  // Convert inventory items to batch info
  const batches = useMemo((): BatchInfo[] => {
    return items.map((item, index) => {
      const manufacturingDate = item.mfd || new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const mfdDate = new Date(manufacturingDate);
      const expiryDate = new Date(mfdDate.getTime() + (365 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]; // +1 year

      const today = new Date();
      const expiry = new Date(expiryDate);
      const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let status: BatchInfo['status'] = 'active';
      if (daysUntilExpiry < 0) status = 'expired';
      else if (daysUntilExpiry <= 30) status = 'near_expiry';

      const qualityStatuses: BatchInfo['qualityStatus'][] = ['passed', 'pending', 'failed', 'quarantine'];
      const qualityStatus = qualityStatuses[Math.floor(Math.random() * qualityStatuses.length)];

      return {
        id: item.id,
        batchNumber: item.lot || `BATCH-${Date.now().toString().slice(-6)}-${index}`,
        productName: item.product_name,
        sku: item.sku,
        manufacturingDate,
        expiryDate,
        quantity: ((item as any).carton_quantity_legacy || 0) + ((item as any).box_quantity_legacy || 0),
        location: item.location,
        supplier: `ผู้จำหน่าย ${String.fromCharCode(65 + (index % 26))}`,
        qualityStatus,
        daysUntilExpiry,
        status
      };
    });
  }, [items]);

  // Filter batches based on search and status
  const filteredBatches = useMemo(() => {
    return batches.filter(batch => {
      const matchesSearch =
        batch.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.sku.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = selectedStatus === 'all' || batch.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [batches, searchTerm, selectedStatus]);

  // Calculate expiry alerts
  const expiryAlerts = useMemo((): ExpiryAlert[] => {
    const alerts: ExpiryAlert[] = [];

    const expiredBatches = batches.filter(b => b.status === 'expired');
    const nearExpiryBatches = batches.filter(b => b.status === 'near_expiry' && b.daysUntilExpiry <= 7);
    const soonExpiryBatches = batches.filter(b => b.daysUntilExpiry > 7 && b.daysUntilExpiry <= 30);

    if (expiredBatches.length > 0) {
      alerts.push({
        severity: 'critical',
        batches: expiredBatches,
        message: `พบสินค้าหมดอายุ ${expiredBatches.length} Batch`,
        actionRequired: 'ถอดออกจากสต็อกหรือจัดการทิ้งทันที'
      });
    }

    if (nearExpiryBatches.length > 0) {
      alerts.push({
        severity: 'warning',
        batches: nearExpiryBatches,
        message: `สินค้าจะหมดอายุใน 7 วัน ${nearExpiryBatches.length} Batch`,
        actionRequired: 'วางแผนการขายหรือใช้ด่วน'
      });
    }

    if (soonExpiryBatches.length > 0) {
      alerts.push({
        severity: 'info',
        batches: soonExpiryBatches,
        message: `สินค้าจะหมดอายุใน 30 วัน ${soonExpiryBatches.length} Batch`,
        actionRequired: 'วางแผนการขายล่วงหน้า'
      });
    }

    return alerts;
  }, [batches]);

  const getStatusColor = (status: BatchInfo['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'near_expiry': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'expired': return 'bg-red-100 text-red-800 border-red-200';
      case 'recalled': return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getQualityColor = (status: BatchInfo['qualityStatus']) => {
    switch (status) {
      case 'passed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      case 'quarantine': return 'bg-orange-100 text-orange-800 border-orange-200';
    }
  };

  const getAlertColor = (severity: ExpiryAlert['severity']) => {
    switch (severity) {
      case 'critical': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'info': return 'border-blue-200 bg-blue-50';
    }
  };

  if (!permissions.canViewReports) {
    return (
      <Card className="bg-white border border-gray-200">
        <CardContent className="bg-white p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-orange-600 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">ไม่มีสิทธิ์เข้าถึง</p>
          <p className="text-sm text-gray-600">คุณไม่มีสิทธิ์ในการจัดการ Batch/Lot</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-white border border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-purple-600 p-3 rounded-full">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">จัดการ Batch & Lot</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  ติดตาม Batch, วันหมดอายุ และการควบคุมคุณภาพ
                </p>
              </div>
            </div>

            <Dialog open={isAddBatchModalOpen} onOpenChange={setIsAddBatchModalOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2" disabled={!permissions.canAdd}>
                  <Plus className="h-4 w-4" />
                  เพิ่ม Batch
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white">
                <DialogHeader>
                  <DialogTitle>เพิ่ม Batch ใหม่</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-gray-600">
                    ฟีเจอร์เพิ่ม Batch ใหม่จะพัฒนาเพิ่มเติมในอนาคต
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Alert Cards */}
      {expiryAlerts.length > 0 && (
        <div className="space-y-3">
          {expiryAlerts.map((alert, index) => (
            <Alert key={index} className={getAlertColor(alert.severity)}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{alert.message}</p>
                    <p className="text-sm mt-1">{alert.actionRequired}</p>
                  </div>
                  <Button size="sm" variant="outline">
                    ดูรายละเอียด
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border border-gray-200">
          <CardContent className="bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Batch ทั้งหมด</p>
                <p className="text-2xl font-bold text-blue-600">{batches.length}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardContent className="bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">ใกล้หมดอายุ</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {batches.filter(b => b.status === 'near_expiry').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardContent className="bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">หมดอายุแล้ว</p>
                <p className="text-2xl font-bold text-red-600">
                  {batches.filter(b => b.status === 'expired').length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardContent className="bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">ผ่านมาตรฐาน</p>
                <p className="text-2xl font-bold text-green-600">
                  {batches.filter(b => b.qualityStatus === 'passed').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="bg-white border border-gray-200">
        <CardContent className="bg-white p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="ค้นหา Batch, สินค้า หรือ SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
              >
                <option value="all">ทั้งหมด</option>
                <option value="active">ปกติ</option>
                <option value="near_expiry">ใกล้หมดอายุ</option>
                <option value="expired">หมดอายุ</option>
                <option value="recalled">เรียกคืน</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batch List */}
      <div className="space-y-3">
        {filteredBatches.length === 0 ? (
          <Card className="bg-white border border-gray-200">
            <CardContent className="bg-white p-8 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">ไม่พบ Batch</p>
              <p className="text-sm text-gray-600">ไม่พบ Batch ที่ตรงกับเงื่อนไขการค้นหา</p>
            </CardContent>
          </Card>
        ) : (
          filteredBatches.map((batch) => (
            <Card key={batch.id} className="bg-white border border-gray-200">
              <CardContent className="bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-gray-900">{batch.productName}</h4>
                      <Badge className={getStatusColor(batch.status)}>
                        {batch.status === 'active' ? 'ปกติ' :
                         batch.status === 'near_expiry' ? 'ใกล้หมดอายุ' :
                         batch.status === 'expired' ? 'หมดอายุ' : 'เรียกคืน'}
                      </Badge>
                      <Badge className={getQualityColor(batch.qualityStatus)}>
                        {batch.qualityStatus === 'passed' ? 'ผ่าน' :
                         batch.qualityStatus === 'pending' ? 'รอตรวจ' :
                         batch.qualityStatus === 'failed' ? 'ไม่ผ่าน' : 'กักกัน'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Batch No.</p>
                        <p className="font-medium">{batch.batchNumber}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">จำนวน</p>
                        <p className="font-medium">{batch.quantity} ชิ้น</p>
                      </div>
                      <div>
                        <p className="text-gray-600">ตำแหน่ง</p>
                        <p className="font-medium">{batch.location}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">วันที่ผลิต</p>
                        <p className="font-medium">{new Date(batch.manufacturingDate).toLocaleDateString('th-TH')}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">วันหมดอายุ</p>
                        <p className="font-medium">{new Date(batch.expiryDate).toLocaleDateString('th-TH')}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">เหลือเวลา</p>
                        <p className={`font-medium ${
                          batch.daysUntilExpiry < 0 ? 'text-red-600' :
                          batch.daysUntilExpiry <= 7 ? 'text-orange-600' :
                          batch.daysUntilExpiry <= 30 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {batch.daysUntilExpiry < 0 ?
                            `หมดอายุแล้ว ${Math.abs(batch.daysUntilExpiry)} วัน` :
                            `${batch.daysUntilExpiry} วัน`}
                        </p>
                      </div>
                    </div>

                    {batch.supplier && (
                      <p className="text-xs text-gray-500 mt-2">
                        ผู้จำหน่าย: {batch.supplier} • SKU: {batch.sku}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4" />
                    </Button>
                    {permissions.canEdit && (
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

export default BatchManagement;