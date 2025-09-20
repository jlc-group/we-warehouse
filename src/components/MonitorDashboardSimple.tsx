import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Monitor,
  Package,
  MapPin,
  TrendingUp,
  Activity,
  Grid3X3,
  BarChart3,
  Clock,
  RefreshCw,
  Maximize,
  Eye
} from 'lucide-react';
import type { InventoryItem } from '@/hooks/useInventory';
import { normalizeLocation } from '@/utils/locationUtils';

interface MonitorDashboardSimpleProps {
  items: InventoryItem[];
  onLocationClick?: (location: string) => void;
}

// Color mapping for different product categories
const getProductCategoryColor = (sku: string, productName: string): { bg: string; border: string; text: string; category: string } => {
  const upperSku = sku.toUpperCase();
  const upperName = productName.toUpperCase();

  if (upperSku.startsWith('L') || upperName.includes('บีบี') || upperName.includes('CREAM')) {
    return { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-800', category: 'เครื่องสำอาง' };
  }
  if (upperSku.startsWith('H') || upperName.includes('วิตามิน') || upperName.includes('อาหารเสริม')) {
    return { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-800', category: 'อาหารเสริม' };
  }
  if (upperSku.startsWith('M') || upperName.includes('ยา') || upperName.includes('เวช')) {
    return { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-800', category: 'เวชภัณฑ์' };
  }
  if (upperSku.startsWith('S') || upperName.includes('เซรั่ม') || upperName.includes('ครีม')) {
    return { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-800', category: 'ดูแลผิว' };
  }
  if (upperSku.startsWith('D') || upperName.includes('ผงซัก') || upperName.includes('ทำความสะอาด')) {
    return { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-800', category: 'ของใช้ในบ้าน' };
  }
  if (upperSku.startsWith('E') || upperName.includes('อิเล็ก')) {
    return { bg: 'bg-indigo-100', border: 'border-indigo-400', text: 'text-indigo-800', category: 'อิเล็กทรอนิกส์' };
  }
  return { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-800', category: 'อื่นๆ' };
};

export function MonitorDashboardSimple({ items, onLocationClick }: MonitorDashboardSimpleProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Helpers for quantity fields across schemas
  const getCartonQty = (item: any) => Number(item.unit_level1_quantity ?? item.carton_quantity_legacy ?? 0) || 0;
  const getBoxQty = (item: any) => Number(item.unit_level2_quantity ?? item.box_quantity_legacy ?? 0) || 0;

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Statistics by category
  const categoryStats = useMemo(() => {
    const stats = new Map<string, { count: number; color: any; totalQty: number; locations: Set<string> }>();

    items.forEach(item => {
      const color = getProductCategoryColor(item.sku || '', item.product_name || '');
      const normalized = normalizeLocation(item.location);
      const qty = getCartonQty(item) + getBoxQty(item);

      const existing = stats.get(color.category) || {
        count: 0,
        color,
        totalQty: 0,
        locations: new Set()
      };

      existing.count += 1;
      existing.totalQty += qty;
      existing.locations.add(normalized);
      stats.set(color.category, existing);
    });

    return Array.from(stats.entries()).map(([category, data]) => ({
      category,
      ...data,
      locationCount: data.locations.size
    }));
  }, [items]);

  // Overall statistics
  const overallStats = useMemo(() => {
    const totalItems = items.length;
    const occupiedLocations = new Set(items.map(item => normalizeLocation(item.location))).size;
    const totalQuantity = items.reduce((sum, item) => sum + getCartonQty(item) + getBoxQty(item), 0);

    return {
      totalItems,
      occupiedLocations,
      totalQuantity,
      availableLocations: 1120 - occupiedLocations, // A-N (14) * 4 levels * 20 positions
      categories: categoryStats.length
    };
  }, [items, categoryStats]);

  // Top locations by item count
  const topLocations = useMemo(() => {
    const locationMap = new Map<string, { items: InventoryItem[]; totalQty: number }>();

    items.forEach(item => {
      const normalized = normalizeLocation(item.location);
      const existing = locationMap.get(normalized) || { items: [], totalQty: 0 };
      existing.items.push(item);
      existing.totalQty += getCartonQty(item) + getBoxQty(item);
      locationMap.set(normalized, existing);
    });

    return Array.from(locationMap.entries())
      .map(([location, data]) => ({
        location,
        itemCount: data.items.length,
        totalQty: data.totalQty,
        categories: [...new Set(data.items.map(item =>
          getProductCategoryColor(item.sku || '', item.product_name || '').category
        ))]
      }))
      .sort((a, b) => b.itemCount - a.itemCount)
      .slice(0, 10);
  }, [items]);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Monitor className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold">หน้าจอมอนิเตอร์คลังสินค้า</h1>
          </div>
          <Badge variant="outline" className="px-3 py-1">
            <Clock className="h-4 w-4 mr-1" />
            {currentTime.toLocaleString('th-TH')}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            รีเฟรชอัตโนมัติ
          </Button>
          <Button variant="outline" size="sm" onClick={toggleFullscreen}>
            <Maximize className="h-4 w-4 mr-1" />
            เต็มจอ
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">ภาพรวม</TabsTrigger>
          <TabsTrigger value="categories">ประเภทสินค้า</TabsTrigger>
          <TabsTrigger value="locations">ตำแหน่งยอดนิยม</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Overall Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Package className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{overallStats.totalItems}</p>
                <p className="text-sm text-muted-foreground">รายการทั้งหมด</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <MapPin className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{overallStats.occupiedLocations}</p>
                <p className="text-sm text-muted-foreground">ตำแหน่งที่ใช้</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Grid3X3 className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{overallStats.availableLocations}</p>
                <p className="text-sm text-muted-foreground">ตำแหน่งว่าง</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{overallStats.totalQuantity}</p>
                <p className="text-sm text-muted-foreground">จำนวนรวม</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <BarChart3 className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{overallStats.categories}</p>
                <p className="text-sm text-muted-foreground">ประเภทสินค้า</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">สัดส่วนประเภทสินค้า</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categoryStats.slice(0, 5).map((stat) => (
                    <div key={stat.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded ${stat.color.bg} ${stat.color.border} border-2`} />
                        <span className="text-sm font-medium">{stat.category}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">{stat.count} รายการ</div>
                        <div className="text-xs text-muted-foreground">{stat.locationCount} ตำแหน่ง</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ตำแหน่งที่มีสินค้ามากที่สุด</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topLocations.slice(0, 5).map((location) => (
                    <div
                      key={location.location}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                      onClick={() => onLocationClick?.(normalizeLocation(location.location))}
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        <span className="font-mono font-medium">{location.location}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">{location.itemCount} รายการ</div>
                        <div className="text-xs text-muted-foreground">{location.categories.length} ประเภท</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryStats.map((stat) => (
              <Card key={stat.category}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className={`w-16 h-16 rounded-lg ${stat.color.bg} ${stat.color.border} border-2 flex items-center justify-center`}>
                      <Package className={`h-8 w-8 ${stat.color.text}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{stat.category}</h3>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>{stat.count} รายการสินค้า</p>
                        <p>{stat.locationCount} ตำแหน่ง</p>
                        <p>{stat.totalQty} หน่วยรวม</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                ตำแหน่งยอดนิยม (เรียงตามจำนวนรายการ)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topLocations.map((location, index) => (
                  <div
                    key={location.location}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => onLocationClick?.(normalizeLocation(location.location))}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-mono font-bold text-lg">{location.location}</div>
                        <div className="text-sm text-muted-foreground">
                          {location.categories.join(', ')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-blue-600">{location.itemCount}</div>
                      <div className="text-sm text-muted-foreground">รายการ</div>
                      <div className="text-xs text-muted-foreground">{location.totalQty} หน่วย</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}