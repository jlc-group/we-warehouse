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
  Scan,
  X,
  RefreshCw
} from 'lucide-react';
import {
  LocationActivityService,
  type LocationActivity,
  type LocationInventorySummary
} from '@/services/locationActivityService';

interface LocationDetailViewProps {
  location: string;
  onClose: () => void;
}

export function LocationDetailView({ location, onClose }: LocationDetailViewProps) {
  const [inventory, setInventory] = useState<LocationInventorySummary | null>(null);
  const [history, setHistory] = useState<LocationActivity[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin className="h-6 w-6 text-blue-500" />
          <div>
            <h2 className="text-2xl font-bold">{location}</h2>
            <p className="text-sm text-gray-600">
              {inventory?.totalItems || 0} ชนิดสินค้า
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-6 w-6 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">{stats.move_in_count || 0}</p>
              <p className="text-xs text-gray-600">รับเข้า (30 วัน)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingDown className="h-6 w-6 text-red-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-red-600">{stats.move_out_count || 0}</p>
              <p className="text-xs text-gray-600">ส่งออก (30 วัน)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <ArrowRight className="h-6 w-6 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">{stats.transfer_count || 0}</p>
              <p className="text-xs text-gray-600">ย้าย (30 วัน)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Scan className="h-6 w-6 text-purple-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-600">{stats.scan_count || 0}</p>
              <p className="text-xs text-gray-600">สแกน (30 วัน)</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="inventory">
            <Package className="h-4 w-4 mr-2" />
            สินค้าปัจจุบัน
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock className="h-4 w-4 mr-2" />
            ประวัติ
          </TabsTrigger>
        </TabsList>

        {/* Tab: Inventory */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>สินค้าใน Location นี้</CardTitle>
            </CardHeader>
            <CardContent>
              {inventory && inventory.products.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>ชื่อสินค้า</TableHead>
                      <TableHead>LOT</TableHead>
                      <TableHead>MFD</TableHead>
                      <TableHead className="text-right">จำนวน</TableHead>
                      <TableHead>หน่วย</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.products.map((product, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono">{product.sku}</TableCell>
                        <TableCell>{product.product_name}</TableCell>
                        <TableCell>
                          {product.lot ? (
                            <Badge variant="outline" className="font-mono text-xs">
                              {product.lot}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {product.mfd ? (
                            <span className="text-xs">
                              {new Date(product.mfd).toLocaleDateString('th-TH')}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {product.quantity.toLocaleString()}
                        </TableCell>
                        <TableCell>{product.unit}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>ไม่มีสินค้าใน Location นี้</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: History */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>ประวัติการเคลื่อนไหว (20 รายการล่าสุด)</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length > 0 ? (
                <div className="space-y-2">
                  {history.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-shrink-0">
                        {getActivityIcon(activity.activity_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getActivityBadge(activity.activity_type)}
                          {activity.product_sku && (
                            <span className="font-mono text-sm text-gray-600">
                              {activity.product_sku}
                            </span>
                          )}
                        </div>
                        {activity.product_name && (
                          <p className="text-sm text-gray-700">{activity.product_name}</p>
                        )}
                        {activity.quantity && (
                          <p className="text-sm font-semibold">
                            จำนวน: {activity.quantity > 0 ? '+' : ''}
                            {activity.quantity.toLocaleString()} {activity.unit || ''}
                          </p>
                        )}
                        {activity.notes && (
                          <p className="text-xs text-gray-500">{activity.notes}</p>
                        )}
                        {activity.user_name && (
                          <p className="text-xs text-gray-500">โดย: {activity.user_name}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-xs text-gray-500">
                          {new Date(activity.created_at).toLocaleDateString('th-TH', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                        <p className="text-xs text-gray-500">
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
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>ยังไม่มีประวัติการเคลื่อนไหว</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={loadLocationData} variant="outline" className="flex-1">
          <RefreshCw className="h-4 w-4 mr-2" />
          รีเฟรช
        </Button>
        <Button onClick={onClose} className="flex-1">
          ปิด
        </Button>
      </div>
    </div>
  );
}
