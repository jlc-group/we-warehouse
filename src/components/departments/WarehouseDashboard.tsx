import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContextSimple';
import { useDepartmentInventory } from '@/hooks/useDepartmentInventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  QrCode,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Shield,
  Users
} from 'lucide-react';
import type { InventoryItem } from '@/hooks/useDepartmentInventory';

interface StockSummary {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  recentMovements: number;
  totalValue: number;
}

interface LocationUtilization {
  location: string;
  utilization: number;
  itemCount: number;
  capacity: number;
}

export function WarehouseDashboard() {
  const { user } = useAuth();
  const {
    items,
    loading,
    addItem,
    updateItem,
    deleteItem,
    accessSummary,
    permissions,
    getItemsByLocationCategory
  } = useDepartmentInventory();
  const [activeTab, setActiveTab] = useState('overview');
  const [stockSummary, setStockSummary] = useState<StockSummary>({
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    recentMovements: 0,
    totalValue: 0
  });

  // ตรวจสอบสิทธิ์แผนกคลังสินค้า
  if (!user || !['คลังสินค้า', 'ผู้บริหาร'].includes(user.department)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <Card className="w-full max-w-md bg-white border border-gray-200">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="bg-orange-600 p-3 rounded-full">
                <Package className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-center">ไม่มีสิทธิ์เข้าถึง</CardTitle>
          </CardHeader>
          <CardContent className="bg-white">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                แดชบอร์ดนี้เฉพาะแผนกคลังสินค้าและผู้บริหารเท่านั้น
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // คำนวณข้อมูลสรุป
  useEffect(() => {
    if (!items.length) return;

    const totalItems = items.length;
    const lowStockItems = items.filter(item =>
      (((item as any).carton_quantity_legacy || 0) + ((item as any).box_quantity_legacy || 0)) < 10
    ).length;
    const outOfStockItems = items.filter(item =>
      (((item as any).carton_quantity_legacy || 0) + ((item as any).box_quantity_legacy || 0)) === 0
    ).length;

    // คำนวณมูลค่าประมาณ (ถ้ามีข้อมูลราคา)
    const totalValue = items.reduce((sum, item) => {
      const quantity = ((item as any).carton_quantity_legacy || 0) + ((item as any).box_quantity_legacy || 0);
      // ใช้ราคาประมาณ 100 บาทต่อชิ้น (สามารถปรับได้)
      return sum + (quantity * 100);
    }, 0);

    setStockSummary({
      totalItems,
      lowStockItems,
      outOfStockItems,
      recentMovements: Math.floor(totalItems * 0.1), // ประมาณ 10% ของสินค้า
      totalValue
    });
  }, [items]);

  // หาสินค้าที่ต้องเติม
  const getLowStockItems = () => {
    return items.filter(item => {
      const totalQty = ((item as any).carton_quantity_legacy || 0) + ((item as any).box_quantity_legacy || 0);
      return totalQty > 0 && totalQty < 10;
    }).sort((a, b) => {
      const qtyA = a.box_quantity + a.loose_quantity;
      const qtyB = b.box_quantity + b.loose_quantity;
      return qtyA - qtyB;
    });
  };

  // หาสินค้าที่หมด
  const getOutOfStockItems = () => {
    return items.filter(item =>
      (((item as any).carton_quantity_legacy || 0) + ((item as any).box_quantity_legacy || 0)) === 0
    );
  };

  // วิเคราะห์การใช้งานตำแหน่ง
  const getLocationUtilization = () => {
    const locationMap = new Map<string, { count: number; items: InventoryItem[] }>();

    items.forEach(item => {
      const location = item.location;
      if (!locationMap.has(location)) {
        locationMap.set(location, { count: 0, items: [] });
      }
      locationMap.get(location)!.count++;
      locationMap.get(location)!.items.push(item);
    });

    const utilization: LocationUtilization[] = Array.from(locationMap.entries()).map(([location, data]) => {
      const capacity = 20; // สมมติว่าแต่ละตำแหน่งจุได้ 20 รายการ
      const utilization = (data.count / capacity) * 100;

      return {
        location,
        utilization: Math.min(utilization, 100),
        itemCount: data.count,
        capacity
      };
    });

    return utilization.sort((a, b) => b.utilization - a.utilization);
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'bg-red-500';
    if (utilization >= 70) return 'bg-orange-500';
    if (utilization >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getUtilizationBadgeColor = (utilization: number) => {
    if (utilization >= 90) return 'bg-red-100 text-red-800 border-red-200';
    if (utilization >= 70) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (utilization >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-green-600 p-3 rounded-full">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">แดชบอร์ดแผนกคลังสินค้า</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    ภาพรวมการจัดการสต็อกและตำแหน่งเก็บสินค้า
                  </p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800">
                {user.department}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white border border-gray-200">
            <CardContent className="bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">สินค้าทั้งหมด</p>
                  <p className="text-2xl font-bold text-blue-600">{stockSummary.totalItems}</p>
                  <p className="text-xs text-gray-500 mt-1">รายการ</p>
                </div>
                <Package className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200">
            <CardContent className="bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">สินค้าใกล้หมด</p>
                  <p className="text-2xl font-bold text-orange-600">{stockSummary.lowStockItems}</p>
                  <p className="text-xs text-gray-500 mt-1">รายการ</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200">
            <CardContent className="bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">สินค้าหมด</p>
                  <p className="text-2xl font-bold text-red-600">{stockSummary.outOfStockItems}</p>
                  <p className="text-xs text-gray-500 mt-1">รายการ</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200">
            <CardContent className="bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">มูลค่าประมาณ</p>
                  <p className="text-2xl font-bold text-green-600">
                    ฿{stockSummary.totalValue.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">บาท</p>
                </div>
                <BarChart3 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Access Control Information */}
        {accessSummary && (
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                ข้อมูลสิทธิ์การเข้าถึง
              </CardTitle>
            </CardHeader>
            <CardContent className="bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">แผนก</p>
                    <p className="text-xs text-blue-600">{accessSummary.department}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <Package className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800">สินค้าที่เข้าถึงได้</p>
                    <p className="text-xs text-green-600">{accessSummary.accessibleItems}/{accessSummary.totalItems} รายการ</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-purple-800">เปอร์เซ็นต์การเข้าถึง</p>
                    <p className="text-xs text-purple-600">{accessSummary.accessPercentage}%</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <CheckCircle className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">สิทธิ์</p>
                    <div className="flex gap-1 mt-1">
                      {permissions.canAdd && <Badge className="bg-green-100 text-green-800 text-xs">เพิ่ม</Badge>}
                      {permissions.canEdit && <Badge className="bg-blue-100 text-blue-800 text-xs">แก้ไข</Badge>}
                      {permissions.canDelete && <Badge className="bg-red-100 text-red-800 text-xs">ลบ</Badge>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">คำอธิบาย:</span> {accessSummary.description}
                </p>
                {accessSummary.locations && accessSummary.locations.length > 0 && (
                  <p className="text-xs text-gray-600 mt-2">
                    <span className="font-medium">ตำแหน่งที่เข้าถึงได้:</span> {accessSummary.locations.join(', ')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 bg-white border border-gray-200">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              ภาพรวม
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              แจ้งเตือน
            </TabsTrigger>
            <TabsTrigger value="locations" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              ตำแหน่งเก็บ
            </TabsTrigger>
            <TabsTrigger value="actions" className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              จัดการ
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Low Stock Alert */}
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    สินค้าใกล้หมด (&lt; 10 ชิ้น)
                  </CardTitle>
                </CardHeader>
                <CardContent className="bg-white">
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {getLowStockItems().slice(0, 5).map((item) => {
                      const totalQty = ((item as any).carton_quantity_legacy || 0) + ((item as any).box_quantity_legacy || 0);
                      return (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.product_name}</p>
                            <p className="text-xs text-gray-600">{item.location}</p>
                          </div>
                          <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
                            {totalQty} ชิ้น
                          </Badge>
                        </div>
                      );
                    })}
                    {getLowStockItems().length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                        ไม่มีสินค้าใกล้หมด
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Out of Stock */}
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                    สินค้าหมด
                  </CardTitle>
                </CardHeader>
                <CardContent className="bg-white">
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {getOutOfStockItems().slice(0, 5).map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.product_name}</p>
                          <p className="text-xs text-gray-600">{item.location}</p>
                        </div>
                        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                          หมด
                        </Badge>
                      </div>
                    ))}
                    {getOutOfStockItems().length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                        ไม่มีสินค้าหมด
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-4">
            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  การแจ้งเตือนทั้งหมด
                </CardTitle>
              </CardHeader>
              <CardContent className="bg-white space-y-4">
                {(stockSummary.lowStockItems > 0 || stockSummary.outOfStockItems > 0) ? (
                  <>
                    {stockSummary.outOfStockItems > 0 && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>สินค้าหมด {stockSummary.outOfStockItems} รายการ</strong> - ต้องเติมสต็อกด่วน
                        </AlertDescription>
                      </Alert>
                    )}
                    {stockSummary.lowStockItems > 0 && (
                      <Alert>
                        <Clock className="h-4 w-4" />
                        <AlertDescription>
                          <strong>สินค้าใกล้หมด {stockSummary.lowStockItems} รายการ</strong> - ควรเตรียมเติมสต็อก
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-600" />
                    <p className="text-lg font-medium">ทุกอย่างเรียบร้อย!</p>
                    <p className="text-sm">ไม่มีการแจ้งเตือนในขณะนี้</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Locations Tab */}
          <TabsContent value="locations" className="space-y-4">
            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  การใช้งานตำแหน่งเก็บสินค้า
                </CardTitle>
              </CardHeader>
              <CardContent className="bg-white">
                <div className="space-y-4">
                  {getLocationUtilization().slice(0, 10).map((location) => (
                    <div key={location.location} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{location.location}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">
                            {location.itemCount}/{location.capacity}
                          </span>
                          <Badge
                            variant="outline"
                            className={getUtilizationBadgeColor(location.utilization)}
                          >
                            {Math.round(location.utilization)}%
                          </Badge>
                        </div>
                      </div>
                      <Progress
                        value={location.utilization}
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="bg-white p-6 text-center">
                  <QrCode className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                  <h3 className="font-semibold mb-2">สแกน QR Code</h3>
                  <p className="text-sm text-gray-600 mb-4">สแกนเพื่อดูข้อมูลสินค้า</p>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    เปิดกล้อง
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="bg-white p-6 text-center">
                  <Plus className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <h3 className="font-semibold mb-2">เพิ่มสินค้าใหม่</h3>
                  <p className="text-sm text-gray-600 mb-4">เพิ่มสินค้าเข้าสต็อก</p>
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    เพิ่มสินค้า
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="bg-white p-6 text-center">
                  <RefreshCw className="h-12 w-12 mx-auto mb-4 text-purple-600" />
                  <h3 className="font-semibold mb-2">ย้ายสินค้า</h3>
                  <p className="text-sm text-gray-600 mb-4">เปลี่ยนตำแหน่งเก็บ</p>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700">
                    ย้ายสินค้า
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}