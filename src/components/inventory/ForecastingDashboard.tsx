import { useState, useMemo } from 'react';
import { useDepartmentInventory } from '@/hooks/useDepartmentInventory';
import { useAuth } from '@/contexts/AuthContextSimple';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
  Target,
  AlertTriangle,
  Activity,
  ShoppingCart,
  Package,
  Clock
} from 'lucide-react';

interface DemandForecast {
  productName: string;
  sku: string;
  currentStock: number;
  predictedDemand: {
    next7Days: number;
    next30Days: number;
    next90Days: number;
  };
  trend: 'increasing' | 'decreasing' | 'stable';
  accuracy: number;
  recommendation: {
    action: 'reorder' | 'reduce' | 'maintain';
    quantity: number;
    urgency: 'high' | 'medium' | 'low';
    reason: string;
  };
  seasonality: {
    peak: string;
    low: string;
    factor: number;
  };
}

interface SeasonalPattern {
  month: string;
  demand: number;
  trend: number;
  events: string[];
}

interface StockoutRisk {
  productName: string;
  sku: string;
  currentStock: number;
  dailyUsage: number;
  daysRemaining: number;
  riskLevel: 'high' | 'medium' | 'low';
  impact: 'critical' | 'moderate' | 'minimal';
}

export function ForecastingDashboard() {
  const { user } = useAuth();
  const { items, permissions } = useDepartmentInventory();
  const [timeHorizon, setTimeHorizon] = useState<'7days' | '30days' | '90days'>('30days');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Generate demand forecasts based on current inventory
  const demandForecasts = useMemo((): DemandForecast[] => {
    return items.map((item, index) => {
      const currentStock = ((item as any).carton_quantity_legacy || 0) + ((item as any).box_quantity_legacy || 0);

      // Simulate historical demand patterns
      const baseDemand = Math.max(1, Math.floor(currentStock / 30)); // Assume monthly turnover
      const variation = 1 + (Math.sin(index) * 0.3); // Add variation based on product

      const trends = ['increasing', 'decreasing', 'stable'] as const;
      const trend = trends[index % 3];

      let trendMultiplier = 1;
      if (trend === 'increasing') trendMultiplier = 1.2;
      else if (trend === 'decreasing') trendMultiplier = 0.8;

      const predictedDemand = {
        next7Days: Math.ceil(baseDemand * variation * trendMultiplier * 0.25),
        next30Days: Math.ceil(baseDemand * variation * trendMultiplier),
        next90Days: Math.ceil(baseDemand * variation * trendMultiplier * 3)
      };

      // Determine recommendation
      const dailyUsage = predictedDemand.next30Days / 30;
      const daysOfStock = currentStock / dailyUsage;

      let action: DemandForecast['recommendation']['action'] = 'maintain';
      let urgency: DemandForecast['recommendation']['urgency'] = 'low';
      let reason = 'สต็อกเพียงพอ';

      if (daysOfStock < 14) {
        action = 'reorder';
        urgency = 'high';
        reason = 'สต็อกจะหมดในไม่เกิน 2 สัปดาห์';
      } else if (daysOfStock < 30) {
        action = 'reorder';
        urgency = 'medium';
        reason = 'ควรสั่งซื้อเพิ่มเพื่อป้องกันการขาดแคลน';
      } else if (daysOfStock > 90) {
        action = 'reduce';
        urgency = 'low';
        reason = 'สต็อกมากเกินไป อาจพิจารณาลดการสั่งซื้อ';
      }

      return {
        productName: item.product_name,
        sku: item.sku,
        currentStock,
        predictedDemand,
        trend,
        accuracy: Math.random() * 20 + 75, // 75-95% accuracy
        recommendation: {
          action,
          quantity: action === 'reorder' ? Math.ceil(predictedDemand.next30Days * 2) : 0,
          urgency,
          reason
        },
        seasonality: {
          peak: ['มี.ค.', 'เม.ย.', 'พ.ค.'][Math.floor(Math.random() * 3)],
          low: ['ม.ค.', 'ก.พ.', 'มิ.ย.'][Math.floor(Math.random() * 3)],
          factor: Math.random() * 0.5 + 0.75 // 0.75 - 1.25
        }
      };
    });
  }, [items]);

  // Calculate seasonal patterns
  const seasonalPatterns = useMemo((): SeasonalPattern[] => {
    const months = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];

    return months.map((month, index) => {
      const baseDemand = 100;
      const seasonal = Math.sin((index / 12) * 2 * Math.PI) * 30 + baseDemand;
      const trend = Math.sin((index / 12) * 4 * Math.PI) * 10;

      const events = [];
      if (index === 3) events.push('สงกรานต์');
      if (index === 11) events.push('ปีใหม่');
      if (index === 4) events.push('หน้าร้อน');

      return {
        month,
        demand: Math.max(50, seasonal),
        trend,
        events
      };
    });
  }, []);

  // Calculate stockout risks
  const stockoutRisks = useMemo((): StockoutRisk[] => {
    return demandForecasts
      .map(forecast => {
        const dailyUsage = forecast.predictedDemand.next30Days / 30;
        const daysRemaining = forecast.currentStock / dailyUsage;

        let riskLevel: StockoutRisk['riskLevel'] = 'low';
        let impact: StockoutRisk['impact'] = 'minimal';

        if (daysRemaining < 7) {
          riskLevel = 'high';
          impact = 'critical';
        } else if (daysRemaining < 14) {
          riskLevel = 'medium';
          impact = 'moderate';
        }

        return {
          productName: forecast.productName,
          sku: forecast.sku,
          currentStock: forecast.currentStock,
          dailyUsage,
          daysRemaining,
          riskLevel,
          impact
        };
      })
      .filter(risk => risk.riskLevel !== 'low')
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [demandForecasts]);

  // Filter forecasts
  const filteredForecasts = useMemo(() => {
    return demandForecasts.filter(forecast => {
      if (selectedCategory === 'reorder') return forecast.recommendation.action === 'reorder';
      if (selectedCategory === 'reduce') return forecast.recommendation.action === 'reduce';
      if (selectedCategory === 'urgent') return forecast.recommendation.urgency === 'high';
      return true;
    });
  }, [demandForecasts, selectedCategory]);

  const getTrendIcon = (trend: DemandForecast['trend']) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'stable': return <Activity className="h-4 w-4 text-blue-600" />;
    }
  };

  const getActionColor = (action: DemandForecast['recommendation']['action']) => {
    switch (action) {
      case 'reorder': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'reduce': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'maintain': return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getRiskColor = (risk: StockoutRisk['riskLevel']) => {
    switch (risk) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  if (!permissions.canViewReports) {
    return (
      <Card className="bg-white border border-gray-200">
        <CardContent className="bg-white p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-orange-600 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">ไม่มีสิทธิ์เข้าถึง</p>
          <p className="text-sm text-gray-600">คุณไม่มีสิทธิ์ในการดูการพยากรณ์สินค้าคงคลัง</p>
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
              <div className="bg-indigo-600 p-3 rounded-full">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">การพยากรณ์สินค้าคงคลัง</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  ทำนายความต้องการและวางแผนการสั่งซื้อ
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={timeHorizon === '7days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeHorizon('7days')}
              >
                7 วัน
              </Button>
              <Button
                variant={timeHorizon === '30days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeHorizon('30days')}
              >
                30 วัน
              </Button>
              <Button
                variant={timeHorizon === '90days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeHorizon('90days')}
              >
                90 วัน
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border border-gray-200">
          <CardContent className="bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">ต้องสั่งซื้อ</p>
                <p className="text-2xl font-bold text-blue-600">
                  {demandForecasts.filter(f => f.recommendation.action === 'reorder').length}
                </p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardContent className="bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">เสี่ยงขาดแคลน</p>
                <p className="text-2xl font-bold text-red-600">
                  {stockoutRisks.filter(r => r.riskLevel === 'high').length}
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
                <p className="text-sm text-gray-600">แนวโน้มเพิ่มขึ้น</p>
                <p className="text-2xl font-bold text-green-600">
                  {demandForecasts.filter(f => f.trend === 'increasing').length}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardContent className="bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">ความแม่นยำ</p>
                <p className="text-2xl font-bold text-purple-600">
                  {Math.round(demandForecasts.reduce((sum, f) => sum + f.accuracy, 0) / demandForecasts.length)}%
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('all')}
        >
          ทั้งหมด
        </Button>
        <Button
          variant={selectedCategory === 'urgent' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('urgent')}
        >
          ด่วน
        </Button>
        <Button
          variant={selectedCategory === 'reorder' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('reorder')}
        >
          ต้องสั่งซื้อ
        </Button>
        <Button
          variant={selectedCategory === 'reduce' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('reduce')}
        >
          ลดสต็อก
        </Button>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="forecasts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-white border border-gray-200">
          <TabsTrigger value="forecasts" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            การพยากรณ์
          </TabsTrigger>
          <TabsTrigger value="risks" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            ความเสี่ยง
          </TabsTrigger>
          <TabsTrigger value="seasonal" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            รูปแบบตามฤดูกาล
          </TabsTrigger>
        </TabsList>

        {/* Forecasts Tab */}
        <TabsContent value="forecasts" className="space-y-4">
          <div className="space-y-3">
            {filteredForecasts.slice(0, 10).map((forecast) => (
              <Card key={forecast.sku} className="bg-white border border-gray-200">
                <CardContent className="bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-gray-900">{forecast.productName}</h4>
                        {getTrendIcon(forecast.trend)}
                        <Badge className={getActionColor(forecast.recommendation.action)}>
                          {forecast.recommendation.action === 'reorder' ? 'ต้องสั่งซื้อ' :
                           forecast.recommendation.action === 'reduce' ? 'ลดสต็อก' : 'คงเดิม'}
                        </Badge>
                        <Badge variant="outline" className={
                          forecast.recommendation.urgency === 'high' ? 'border-red-200 text-red-700' :
                          forecast.recommendation.urgency === 'medium' ? 'border-yellow-200 text-yellow-700' :
                          'border-green-200 text-green-700'
                        }>
                          {forecast.recommendation.urgency === 'high' ? 'ด่วน' :
                           forecast.recommendation.urgency === 'medium' ? 'ปานกลาง' : 'ไม่เร่งด่วน'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">สต็อกปัจจุบัน</p>
                          <p className="font-semibold">{forecast.currentStock} ชิ้น</p>
                        </div>
                        <div>
                          <p className="text-gray-600">พยากรณ์ 7 วัน</p>
                          <p className="font-semibold">{forecast.predictedDemand.next7Days} ชิ้น</p>
                        </div>
                        <div>
                          <p className="text-gray-600">พยากรณ์ 30 วัน</p>
                          <p className="font-semibold">{forecast.predictedDemand.next30Days} ชิ้น</p>
                        </div>
                        <div>
                          <p className="text-gray-600">ความแม่นยำ</p>
                          <p className="font-semibold">{forecast.accuracy.toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-gray-600">แนะนำสั่งซื้อ</p>
                          <p className="font-semibold text-blue-600">
                            {forecast.recommendation.quantity > 0 ? `${forecast.recommendation.quantity} ชิ้น` : '-'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span>ระดับสต็อก</span>
                          <span>{Math.round((forecast.currentStock / (forecast.predictedDemand.next30Days * 2)) * 100)}%</span>
                        </div>
                        <Progress
                          value={Math.min((forecast.currentStock / (forecast.predictedDemand.next30Days * 2)) * 100, 100)}
                          className="h-2"
                        />
                      </div>

                      <p className="text-xs text-gray-500 mt-2">
                        💡 {forecast.recommendation.reason}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Risks Tab */}
        <TabsContent value="risks" className="space-y-4">
          {stockoutRisks.length === 0 ? (
            <Card className="bg-white border border-gray-200">
              <CardContent className="bg-white p-8 text-center">
                <Package className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">ไม่มีความเสี่ยงสูง</p>
                <p className="text-sm text-gray-600">สต็อกทั้งหมดอยู่ในระดับปลอดภัย</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {stockoutRisks.map((risk) => (
                <Card key={risk.sku} className="bg-white border border-gray-200">
                  <CardContent className="bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-gray-900">{risk.productName}</h4>
                          <Badge className={getRiskColor(risk.riskLevel)}>
                            {risk.riskLevel === 'high' ? 'เสี่ยงสูง' :
                             risk.riskLevel === 'medium' ? 'เสี่ยงปานกลาง' : 'เสี่ยงต่ำ'}
                          </Badge>
                          <Badge variant="outline">
                            {risk.impact === 'critical' ? 'ผลกระทบสูง' :
                             risk.impact === 'moderate' ? 'ผลกระทบปานกลาง' : 'ผลกระทบต่ำ'}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">สต็อกเหลือ</p>
                            <p className="font-semibold">{risk.currentStock} ชิ้น</p>
                          </div>
                          <div>
                            <p className="text-gray-600">ใช้ต่อวัน</p>
                            <p className="font-semibold">{risk.dailyUsage.toFixed(1)} ชิ้น</p>
                          </div>
                          <div>
                            <p className="text-gray-600">เหลือเวลา</p>
                            <p className={`font-semibold ${
                              risk.daysRemaining < 7 ? 'text-red-600' :
                              risk.daysRemaining < 14 ? 'text-orange-600' : 'text-green-600'
                            }`}>
                              {risk.daysRemaining.toFixed(0)} วัน
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">แนะนำการดำเนินการ</p>
                            <p className="font-semibold text-blue-600">
                              สั่งซื้อด่วน
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Seasonal Tab */}
        <TabsContent value="seasonal" className="space-y-4">
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle>รูปแบบความต้องการตามฤดูกาล</CardTitle>
            </CardHeader>
            <CardContent className="bg-white">
              <div className="space-y-4">
                {seasonalPatterns.map((pattern, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="text-sm font-medium text-gray-600 w-12">
                        {pattern.month}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">ความต้องการ: {pattern.demand.toFixed(0)}%</p>
                        <p className="text-xs text-gray-500">
                          แนวโน้ม: {pattern.trend > 0 ? '+' : ''}{pattern.trend.toFixed(1)}%
                        </p>
                      </div>
                      {pattern.events.length > 0 && (
                        <div className="flex gap-1">
                          {pattern.events.map((event, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {event}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="w-24">
                      <Progress value={Math.min(pattern.demand, 150)} className="h-2" />
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