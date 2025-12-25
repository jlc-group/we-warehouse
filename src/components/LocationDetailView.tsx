import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  MapPin,
  Package,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ArrowLeftRight,
  Scan,
  X,
  RefreshCw,
  Plus,
  Minus
} from 'lucide-react';
import {
  LocationActivityService,
  type LocationActivity,
  type LocationInventorySummary
} from '@/services/locationActivityService';
import { LocationAddItemModal } from '@/components/location/LocationAddItemModal';
import { LocationRemoveItemModal } from '@/components/location/LocationRemoveItemModal';
import { LocationTransferModal } from '@/components/location/LocationTransferModal';
import { supabase } from '@/integrations/supabase/client';

interface LocationDetailViewProps {
  location: string;
  onClose: () => void;
}

export function LocationDetailView({ location, onClose }: LocationDetailViewProps) {
  const [inventory, setInventory] = useState<LocationInventorySummary | null>(null);
  const [history, setHistory] = useState<LocationActivity[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showRemoveItemModal, setShowRemoveItemModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [locationInventory, setLocationInventory] = useState<any[]>([]);

  useEffect(() => {
    loadLocationData();
    // Log scan activity
    LocationActivityService.logScan(location, 'User');
  }, [location]);

  const loadLocationData = async () => {
    setLoading(true);
    try {
      const [inventoryData, historyData, statsData] = await Promise.all([
        LocationActivityService.getLocationInventory(location),
        LocationActivityService.getLocationHistory(location, 20),
        LocationActivityService.getLocationStats(location)
      ]);

      setInventory(inventoryData);
      setHistory(historyData.data);
      setStats(statsData);

      // Load full inventory for transfer modal
      const { data: fullInventory } = await (supabase
        .from('inventory_items') as any)
        .select('*')
        .eq('location', location);
      setLocationInventory(fullInventory || []);
    } catch (error) {
      console.error('Error loading location data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'MOVE_IN':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'MOVE_OUT':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'TRANSFER':
        return <ArrowRight className="h-4 w-4 text-blue-500" />;
      case 'SCAN':
        return <Scan className="h-4 w-4 text-purple-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityBadge = (type: string) => {
    const badges = {
      MOVE_IN: { label: 'รับเข้า', className: 'bg-green-100 text-green-800' },
      MOVE_OUT: { label: 'ส่งออก', className: 'bg-red-100 text-red-800' },
      TRANSFER: { label: 'ย้าย', className: 'bg-blue-100 text-blue-800' },
      ADJUST: { label: 'แก้ไข', className: 'bg-yellow-100 text-yellow-800' },
      SCAN: { label: 'สแกน', className: 'bg-purple-100 text-purple-800' }
    };
    const badge = badges[type as keyof typeof badges] || badges.SCAN;
    return <Badge className={badge.className}>{badge.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-2xl font-bold truncate">{location}</h2>
            <p className="text-xs sm:text-sm text-gray-600">
              {inventory?.totalItems || 0} ชนิดสินค้า
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10">
          <X className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 mx-auto mb-1 sm:mb-2" />
              <p className="text-lg sm:text-2xl font-bold text-green-600">{stats.move_in_count || 0}</p>
              <p className="text-[10px] sm:text-xs text-gray-600">รับเข้า (30 วัน)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <TrendingDown className="h-5 w-5 sm:h-6 sm:w-6 text-red-500 mx-auto mb-1 sm:mb-2" />
              <p className="text-lg sm:text-2xl font-bold text-red-600">{stats.move_out_count || 0}</p>
              <p className="text-[10px] sm:text-xs text-gray-600">ส่งออก (30 วัน)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 mx-auto mb-1 sm:mb-2" />
              <p className="text-lg sm:text-2xl font-bold text-blue-600">{stats.transfer_count || 0}</p>
              <p className="text-[10px] sm:text-xs text-gray-600">ย้าย (30 วัน)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <Scan className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500 mx-auto mb-1 sm:mb-2" />
              <p className="text-lg sm:text-2xl font-bold text-purple-600">{stats.scan_count || 0}</p>
              <p className="text-[10px] sm:text-xs text-gray-600">สแกน (30 วัน)</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Buttons */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-3 sm:p-4">
          <div className="text-xs sm:text-sm font-medium text-gray-700 mb-2">⚡ ดำเนินการ</div>
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={() => setShowAddItemModal(true)}
              className="bg-green-600 hover:bg-green-700 h-12 sm:h-10 text-xs sm:text-sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">รับเข้า</span>
              <span className="sm:hidden">รับ</span>
            </Button>
            <Button
              onClick={() => setShowRemoveItemModal(true)}
              className="bg-red-600 hover:bg-red-700 h-12 sm:h-10 text-xs sm:text-sm"
              disabled={!inventory?.products?.length}
            >
              <Minus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">ส่งออก</span>
              <span className="sm:hidden">ออก</span>
            </Button>
            <Button
              onClick={() => setShowTransferModal(true)}
              className="bg-blue-600 hover:bg-blue-700 h-12 sm:h-10 text-xs sm:text-sm"
              disabled={!locationInventory.length}
            >
              <ArrowLeftRight className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">ย้าย</span>
              <span className="sm:hidden">ย้าย</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="inventory" className="space-y-3 sm:space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="inventory" className="text-xs sm:text-sm">
            <Package className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            สินค้าปัจจุบัน
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs sm:text-sm">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            ประวัติ
          </TabsTrigger>
        </TabsList>

        {/* Tab: Inventory */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg">สินค้าใน Location นี้</CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              {inventory && inventory.products.length > 0 ? (
                <div className="overflow-x-auto -mx-0">
                  <Table className="min-w-[640px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm">SKU</TableHead>
                        <TableHead className="text-xs sm:text-sm">ชื่อสินค้า</TableHead>
                        <TableHead className="text-xs sm:text-sm">LOT</TableHead>
                        <TableHead className="text-xs sm:text-sm">MFD</TableHead>
                        <TableHead className="text-right text-xs sm:text-sm">จำนวน</TableHead>
                        <TableHead className="text-xs sm:text-sm">หน่วย</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventory.products.map((product, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs sm:text-sm">{product.sku}</TableCell>
                          <TableCell className="text-xs sm:text-sm">{product.product_name}</TableCell>
                          <TableCell>
                            {product.lot ? (
                              <Badge variant="outline" className="font-mono text-[10px] sm:text-xs">
                                {product.lot}
                              </Badge>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {product.mfd ? (
                              <span className="text-[10px] sm:text-xs">
                                {new Date(product.mfd).toLocaleDateString('th-TH')}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-bold text-xs sm:text-sm">
                            {product.quantity.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">{product.unit}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-6 sm:py-8 text-gray-500 px-4">
                  <Package className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm sm:text-base">ไม่มีสินค้าใน Location นี้</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: History */}
        <TabsContent value="history">
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg">ประวัติการเคลื่อนไหว (20 รายการล่าสุด)</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              {history.length > 0 ? (
                <div className="space-y-2">
                  {history.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {getActivityIcon(activity.activity_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 sm:gap-2 mb-1 flex-wrap">
                          {getActivityBadge(activity.activity_type)}
                          {activity.product_sku && (
                            <span className="font-mono text-xs sm:text-sm text-gray-600 truncate">
                              {activity.product_sku}
                            </span>
                          )}
                        </div>
                        {activity.product_name && (
                          <p className="text-xs sm:text-sm text-gray-700 line-clamp-2">{activity.product_name}</p>
                        )}
                        {activity.quantity && (
                          <p className="text-xs sm:text-sm font-semibold">
                            จำนวน: {activity.quantity > 0 ? '+' : ''}
                            {activity.quantity.toLocaleString()} {activity.unit || ''}
                          </p>
                        )}
                        {activity.notes && (
                          <p className="text-[10px] sm:text-xs text-gray-500 line-clamp-2">{activity.notes}</p>
                        )}
                        {activity.user_name && (
                          <p className="text-[10px] sm:text-xs text-gray-500">โดย: {activity.user_name}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap">
                          {new Date(activity.created_at).toLocaleDateString('th-TH', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap">
                          {new Date(activity.created_at).toLocaleTimeString('th-TH', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 sm:py-8 text-gray-500">
                  <Clock className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm sm:text-base">ยังไม่มีประวัติการเคลื่อนไหว</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer Buttons */}
      <div className="flex gap-2">
        <Button onClick={loadLocationData} variant="outline" className="flex-1 h-11 sm:h-10">
          <RefreshCw className="h-4 w-4 mr-2" />
          รีเฟรช
        </Button>
        <Button onClick={onClose} className="flex-1 h-11 sm:h-10">
          ปิด
        </Button>
      </div>

      {/* Modals */}
      <LocationAddItemModal
        isOpen={showAddItemModal}
        onClose={() => setShowAddItemModal(false)}
        location={location}
        onSuccess={() => {
          loadLocationData();
          setShowAddItemModal(false);
        }}
      />

      <LocationRemoveItemModal
        isOpen={showRemoveItemModal}
        onClose={() => setShowRemoveItemModal(false)}
        location={location}
        inventory={inventory}
        onSuccess={() => {
          loadLocationData();
          setShowRemoveItemModal(false);
        }}
      />

      <LocationTransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        fromLocationId={location}
        inventory={locationInventory}
        onSuccess={() => {
          loadLocationData();
          setShowTransferModal(false);
        }}
      />
    </div>
  );
}
