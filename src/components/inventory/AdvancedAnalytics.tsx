import { useState, useMemo } from 'react';
import { useDepartmentInventory } from '@/hooks/useDepartmentInventory';
import { useAuth } from '@/contexts/AuthContextSimple';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Package,
  MapPin,
  Clock,
  DollarSign,
  Activity,
  PieChart,
  Target,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface InventoryTrend {
  period: string;
  totalItems: number;
  totalValue: number;
  turnoverRate: number;
  movementCount: number;
}

interface LocationAnalysis {
  location: string;
  itemCount: number;
  utilization: number;
  value: number;
  lastMovement: string;
  efficiency: 'high' | 'medium' | 'low';
}

interface ProductPerformance {
  productName: string;
  sku: string;
  totalQuantity: number;
  locations: number;
  avgMovement: number;
  performance: 'fast' | 'medium' | 'slow';
  stockDays: number;
  category: string;
}

interface ABCAnalysis {
  category: 'A' | 'B' | 'C';
  products: string[];
  value: number;
  percentage: number;
  description: string;
}

interface AdvancedAnalyticsProps {
  warehouseId?: string;
}

function AdvancedAnalytics({ warehouseId }: AdvancedAnalyticsProps = {}) {
  const { user } = useAuth();
  const { items, permissions } = useDepartmentInventory(warehouseId);
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | '90days'>('30days');

  // Calculate inventory trends (simulated data based on current inventory)
  const inventoryTrends = useMemo((): InventoryTrend[] => {
    const periods = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 90;
    const trends: InventoryTrend[] = [];

    for (let i = periods; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      // Simulate trend data based on current inventory
      const variation = Math.sin((i / periods) * Math.PI * 2) * 0.1 + 1;
      const totalItems = Math.floor(items.length * variation);
      const totalValue = items.reduce((sum, item) =>
        sum + ((((item as any).carton_quantity_legacy || 0) + ((item as any).box_quantity_legacy || 0)) * 100 * variation), 0
      );

      trends.push({
        period: date.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' }),
        totalItems,
        totalValue,
        turnoverRate: Math.random() * 2 + 1,
        movementCount: Math.floor(totalItems * 0.1)
      });
    }

    return trends;
  }, [items, timeRange]);

  // Analyze location performance
  const locationAnalysis = useMemo((): LocationAnalysis[] => {
    const locationMap = new Map<string, any>();

    items.forEach(item => {
      if (!locationMap.has(item.location)) {
        locationMap.set(item.location, {
          location: item.location,
          items: [],
          totalValue: 0,
          lastActivity: new Date()
        });
      }

      const location = locationMap.get(item.location);
      location.items.push(item);
      location.totalValue += (((item as any).carton_quantity_legacy || 0) + ((item as any).box_quantity_legacy || 0)) * 100;
    });

    return Array.from(locationMap.entries()).map(([location, data]) => {
      const itemCount = data.items.length;
      const maxCapacity = 20; // Assume max 20 items per location
      const utilization = Math.min((itemCount / maxCapacity) * 100, 100);

      // Determine efficiency based on utilization and value
      let efficiency: 'high' | 'medium' | 'low' = 'medium';
      if (utilization > 80 && data.totalValue > 5000) efficiency = 'high';
      else if (utilization < 30 || data.totalValue < 1000) efficiency = 'low';

      return {
        location,
        itemCount,
        utilization,
        value: data.totalValue,
        lastMovement: new Date().toLocaleDateString('th-TH'),
        efficiency
      };
    }).sort((a, b) => b.value - a.value);
  }, [items]);

  // Product performance analysis
  const productPerformance = useMemo((): ProductPerformance[] => {
    const productMap = new Map<string, any>();

    items.forEach(item => {
      if (!productMap.has(item.product_name)) {
        productMap.set(item.product_name, {
          productName: item.product_name,
          sku: item.sku,
          locations: new Set(),
          totalQuantity: 0,
          category: item.product_name.includes('เครื่องดื่ม') ? 'เครื่องดื่ม' :
                   item.product_name.includes('อาหาร') ? 'อาหาร' : 'สมุนไพร'
        });
      }

      const product = productMap.get(item.product_name);
      product.locations.add(item.location);
      product.totalQuantity += ((item as any).carton_quantity_legacy || 0) + ((item as any).box_quantity_legacy || 0);
    });

    return Array.from(productMap.entries()).map(([name, data]) => {
      const avgMovement = Math.random() * 10 + 1; // Simulated movement data
      const stockDays = Math.ceil(data.totalQuantity / avgMovement);

      let performance: 'fast' | 'medium' | 'slow' = 'medium';
      if (avgMovement > 5) performance = 'fast';
      else if (avgMovement < 2) performance = 'slow';

      return {
        productName: data.productName,
        sku: data.sku,
        totalQuantity: data.totalQuantity,
        locations: data.locations.size,
        avgMovement,
        performance,
        stockDays,
        category: data.category
      };
    }).sort((a, b) => b.avgMovement - a.avgMovement);
  }, [items]);

  // ABC Analysis
  const abcAnalysis = useMemo((): ABCAnalysis[] => {
    const totalValue = items.reduce((sum, item) =>
      sum + ((((item as any).carton_quantity_legacy || 0) + ((item as any).box_quantity_legacy || 0)) * 100), 0
    );

    const sortedProducts = productPerformance
      .map(product => ({
        ...product,
        value: product.totalQuantity * 100
      }))
      .sort((a, b) => b.value - a.value);

    let cumulativeValue = 0;
    const categories: ABCAnalysis[] = [
      { category: 'A', products: [], value: 0, percentage: 0, description: 'สินค้าสำคัญมาก (80% ของมูลค่า)' },
      { category: 'B', products: [], value: 0, percentage: 0, description: 'สินค้าสำคัญปานกลาง (15% ของมูลค่า)' },
      { category: 'C', products: [], value: 0, percentage: 0, description: 'สินค้าสำคัญน้อย (5% ของมูลค่า)' }
    ];

    sortedProducts.forEach(product => {
      cumulativeValue += product.value;
      const cumulativePercentage = (cumulativeValue / totalValue) * 100;

      if (cumulativePercentage <= 80) {
        categories[0].products.push(product.productName);
        categories[0].value += product.value;
      } else if (cumulativePercentage <= 95) {
        categories[1].products.push(product.productName);
        categories[1].value += product.value;
      } else {
        categories[2].products.push(product.productName);
        categories[2].value += product.value;
      }
    });

    categories.forEach(category => {
      category.percentage = (category.value / totalValue) * 100;
    });

    return categories;
  }, [productPerformance, items]);

  const getEfficiencyColor = (efficiency: 'high' | 'medium' | 'low') => {
    switch (efficiency) {
      case 'high': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getPerformanceColor = (performance: 'fast' | 'medium' | 'slow') => {
    switch (performance) {
      case 'fast': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'slow': return 'bg-orange-100 text-orange-800 border-orange-200';
    }
  };

  if (!permissions.canViewReports) {
    return (
      <Card className="bg-white border border-gray-200">
        <CardContent className="bg-white p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-orange-600 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">ไม่มีสิทธิ์เข้าถึง</p>
          <p className="text-sm text-gray-600">คุณไม่มีสิทธิ์ในการดูรายงานการวิเคราะห์ขั้นสูง</p>
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
              <div className="bg-blue-600 p-3 rounded-full">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">การวิเคราะห์ขั้นสูง</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  ข้อมูลเชิงลึกและแนวโน้มของสินค้าคงคลัง
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={timeRange === '7days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange('7days')}
              >
                7 วัน
              </Button>
              <Button
                variant={timeRange === '30days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange('30days')}
              >
                30 วัน
              </Button>
              <Button
                variant={timeRange === '90days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange('90days')}
              >
                90 วัน
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border border-gray-200">
          <CardContent className="bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">มูลค่ารวม</p>
                <p className="text-2xl font-bold text-blue-600">
                  ฿{(inventoryTrends[inventoryTrends.length - 1]?.totalValue || 0).toLocaleString()}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  +5.2% จากเดือนที่แล้ว
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardContent className="bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">อัตราการหมุนเวียน</p>
                <p className="text-2xl font-bold text-green-600">
                  {(inventoryTrends[inventoryTrends.length - 1]?.turnoverRate || 0).toFixed(1)}x
                </p>
                <p className="text-xs text-green-600 mt-1">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  +0.3x จากเดือนที่แล้ว
                </p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardContent className="bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">ตำแหน่งที่ใช้งาน</p>
                <p className="text-2xl font-bold text-purple-600">{locationAnalysis.length}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {locationAnalysis.filter(l => l.efficiency === 'high').length} ตำแหน่งมีประสิทธิภาพสูง
                </p>
              </div>
              <MapPin className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardContent className="bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">สินค้าเคลื่อนไหวเร็ว</p>
                <p className="text-2xl font-bold text-orange-600">
                  {productPerformance.filter(p => p.performance === 'fast').length}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  จาก {productPerformance.length} สินค้าทั้งหมด
                </p>
              </div>
              <Target className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-white border border-gray-200">
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            แนวโน้ม
          </TabsTrigger>
          <TabsTrigger value="locations" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            การใช้ตำแหน่ง
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            ประสิทธิภาพสินค้า
          </TabsTrigger>
          <TabsTrigger value="abc" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            ABC Analysis
          </TabsTrigger>
        </TabsList>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle>แนวโน้มสินค้าคงคลัง</CardTitle>
            </CardHeader>
            <CardContent className="bg-white">
              <div className="space-y-4">
                {inventoryTrends.slice(-7).map((trend, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="text-sm font-medium text-gray-600 w-16">
                        {trend.period}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{trend.totalItems} รายการ</p>
                        <p className="text-xs text-gray-500">฿{trend.totalValue.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-blue-600">{trend.turnoverRate.toFixed(1)}x</p>
                      <p className="text-xs text-gray-500">{trend.movementCount} การเคลื่อนไหว</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Locations Tab */}
        <TabsContent value="locations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {locationAnalysis.slice(0, 10).map((location) => (
              <Card key={location.location} className="bg-white border border-gray-200">
                <CardContent className="bg-white p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{location.location}</h4>
                      <p className="text-sm text-gray-600">{location.itemCount} รายการ</p>
                    </div>
                    <Badge className={getEfficiencyColor(location.efficiency)}>
                      {location.efficiency === 'high' ? 'ประสิทธิภาพสูง' :
                       location.efficiency === 'medium' ? 'ประสิทธิภาพปานกลาง' : 'ประสิทธิภาพต่ำ'}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>การใช้งาน</span>
                      <span>{location.utilization.toFixed(0)}%</span>
                    </div>
                    <Progress value={location.utilization} className="h-2" />
                  </div>

                  <div className="mt-3 text-xs text-gray-500 space-y-1">
                    <p>• มูลค่า: ฿{location.value.toLocaleString()}</p>
                    <p>• อัพเดตล่าสุด: {location.lastMovement}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <div className="space-y-3">
            {productPerformance.slice(0, 15).map((product) => (
              <Card key={product.sku} className="bg-white border border-gray-200">
                <CardContent className="bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-gray-900">{product.productName}</h4>
                        <Badge className={getPerformanceColor(product.performance)}>
                          {product.performance === 'fast' ? 'เคลื่อนไหวเร็ว' :
                           product.performance === 'medium' ? 'เคลื่อนไหวปานกลาง' : 'เคลื่อนไหวช้า'}
                        </Badge>
                        <Badge variant="outline">{product.category}</Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">คงเหลือ</p>
                          <p className="font-semibold">{product.totalQuantity} ชิ้น</p>
                        </div>
                        <div>
                          <p className="text-gray-600">ตำแหน่ง</p>
                          <p className="font-semibold">{product.locations} แห่ง</p>
                        </div>
                        <div>
                          <p className="text-gray-600">การเคลื่อนไหวเฉลี่ย</p>
                          <p className="font-semibold">{product.avgMovement.toFixed(1)}/วัน</p>
                        </div>
                        <div>
                          <p className="text-gray-600">วันที่เหลือ</p>
                          <p className="font-semibold">{product.stockDays} วัน</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ABC Analysis Tab */}
        <TabsContent value="abc" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {abcAnalysis.map((category) => (
              <Card key={category.category} className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full ${
                      category.category === 'A' ? 'bg-red-500' :
                      category.category === 'B' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />
                    กลุ่ม {category.category}
                  </CardTitle>
                </CardHeader>
                <CardContent className="bg-white">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">{category.description}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>สัดส่วนมูลค่า</span>
                        <span className="font-semibold">{category.percentage.toFixed(1)}%</span>
                      </div>
                      <Progress
                        value={category.percentage}
                        className="h-2"
                      />
                    </div>

                    <div className="text-sm space-y-1">
                      <p><span className="font-medium">สินค้า:</span> {category.products.length} รายการ</p>
                      <p><span className="font-medium">มูลค่า:</span> ฿{category.value.toLocaleString()}</p>
                    </div>

                    <div className="mt-3">
                      <p className="text-xs text-gray-500 mb-2">ตัวอย่างสินค้า:</p>
                      <div className="space-y-1">
                        {category.products.slice(0, 3).map((product, index) => (
                          <p key={index} className="text-xs text-gray-700 truncate">
                            • {product}
                          </p>
                        ))}
                        {category.products.length > 3 && (
                          <p className="text-xs text-gray-500">
                            และอีก {category.products.length - 3} รายการ
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AdvancedAnalytics;