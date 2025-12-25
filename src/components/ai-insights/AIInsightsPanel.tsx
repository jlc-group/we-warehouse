/**
 * AIInsightsPanel - แสดงผลการวิเคราะห์ AI
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Target,
  Lightbulb,
  ArrowRight,
  RefreshCw,
  Zap
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart
} from 'recharts';
import {
  SalesDataPoint,
  ProductSalesData,
  CustomerSalesData,
  analyzeTrend,
  analyzeProducts,
  analyzeCustomers,
  analyzeSeasonalPatterns,
  generateAIInsights,
  generateExecutiveSummary,
  TrendResult,
  ProductAlert,
  CustomerAlert,
  AIInsight,
  SeasonalPattern,
  calculateMovingAverage
} from './aiAnalysisUtils';

interface AIInsightsPanelProps {
  salesData: SalesDataPoint[];
  currentProducts: ProductSalesData[];
  previousProducts: ProductSalesData[];
  currentCustomers: CustomerSalesData[];
  previousCustomers: CustomerSalesData[];
  totalSales: number;
  orderCount: number;
  isLoading?: boolean;
}

// Format helpers
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatPercent = (value: number) => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
};

// Priority colors
const priorityColors = {
  high: 'bg-red-100 text-red-800 border-red-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  low: 'bg-green-100 text-green-800 border-green-300'
};

const impactColors = {
  positive: 'text-green-600',
  negative: 'text-red-600',
  neutral: 'text-gray-600'
};

export function AIInsightsPanel({
  salesData,
  currentProducts,
  previousProducts,
  currentCustomers,
  previousCustomers,
  totalSales,
  orderCount,
  isLoading = false
}: AIInsightsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Run AI Analysis
  const analysis = useMemo(() => {
    if (salesData.length === 0) return null;

    const trend = analyzeTrend(salesData);
    const productAlerts = analyzeProducts(currentProducts, previousProducts);
    const customerAlerts = analyzeCustomers(currentCustomers, previousCustomers);
    const seasonalPattern = analyzeSeasonalPatterns(salesData);
    const insights = generateAIInsights(salesData, productAlerts, customerAlerts, seasonalPattern, trend);
    const summary = generateExecutiveSummary(totalSales, orderCount, trend, productAlerts, customerAlerts);

    // Calculate moving average for chart
    const amounts = salesData.map(d => d.amount);
    const ma7 = calculateMovingAverage(amounts, Math.min(7, amounts.length));

    return {
      trend,
      productAlerts,
      customerAlerts,
      seasonalPattern,
      insights,
      summary,
      chartData: salesData.map((d, i) => ({
        date: d.date,
        amount: d.amount,
        ma7: ma7[i - (amounts.length - ma7.length)] || null
      }))
    };
  }, [salesData, currentProducts, previousProducts, currentCustomers, previousCustomers, totalSales, orderCount]);

  if (isLoading) {
    return (
      <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 via-white to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-600 animate-pulse" />
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              🤖 AI กำลังวิเคราะห์...
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-8 bg-purple-100 rounded animate-pulse" />
            <div className="h-32 bg-purple-100 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className="border-2 border-gray-200">
        <CardContent className="py-8 text-center text-gray-500">
          <Brain className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>ไม่มีข้อมูลเพียงพอสำหรับการวิเคราะห์</p>
        </CardContent>
      </Card>
    );
  }

  const { trend, productAlerts, customerAlerts, seasonalPattern, insights, summary, chartData } = analysis;
  const highPriorityCount = insights.filter(i => i.priority === 'high').length;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 via-white to-indigo-50 shadow-lg">
        {/* Header */}
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-purple-50/50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Brain className="h-7 w-7 text-purple-600" />
                  <Sparkles className="h-4 w-4 text-yellow-500 absolute -top-1 -right-1" />
                </div>
                <div>
                  <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent text-xl font-bold">
                    🤖 AI Sales Insights
                  </span>
                  <p className="text-sm font-normal text-gray-500 mt-0.5">
                    วิเคราะห์อัตโนมัติ | อัปเดตเรียลไทม์
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {highPriorityCount > 0 && (
                  <Badge className="bg-red-500 text-white animate-pulse">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {highPriorityCount} ต้องดูแลด่วน
                  </Badge>
                )}
                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Executive Summary */}
            <div className="p-4 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-xl border border-purple-200">
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-purple-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-purple-900 mb-1">📋 สรุปสำหรับผู้บริหาร</p>
                  <p className="text-sm text-purple-800">{summary}</p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 bg-purple-100">
                <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                  <Target className="h-4 w-4 mr-1" />
                  ภาพรวม
                </TabsTrigger>
                <TabsTrigger value="products" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                  <Package className="h-4 w-4 mr-1" />
                  สินค้า
                </TabsTrigger>
                <TabsTrigger value="customers" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                  <Users className="h-4 w-4 mr-1" />
                  ลูกค้า
                </TabsTrigger>
                <TabsTrigger value="insights" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                  <Lightbulb className="h-4 w-4 mr-1" />
                  Insights
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4 mt-4">
                {/* Trend Card */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <Card className={`border-2 ${trend.direction === 'up' ? 'border-green-300 bg-green-50' : trend.direction === 'down' ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-gray-50'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">แนวโน้มยอดขาย</span>
                        {trend.direction === 'up' ? (
                          <TrendingUp className="h-5 w-5 text-green-600" />
                        ) : trend.direction === 'down' ? (
                          <TrendingDown className="h-5 w-5 text-red-600" />
                        ) : (
                          <ArrowRight className="h-5 w-5 text-gray-600" />
                        )}
                      </div>
                      <p className={`text-2xl font-bold ${trend.direction === 'up' ? 'text-green-700' : trend.direction === 'down' ? 'text-red-700' : 'text-gray-700'}`}>
                        {formatPercent(trend.percentChange)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        ความมั่นใจ: {trend.confidence === 'high' ? 'สูง' : trend.confidence === 'medium' ? 'ปานกลาง' : 'ต่ำ'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-blue-300 bg-blue-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">คาดการณ์ยอดถัดไป</span>
                        <Sparkles className="h-5 w-5 text-blue-600" />
                      </div>
                      <p className="text-2xl font-bold text-blue-700">
                        {formatCurrency(trend.prediction)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        จาก Linear Regression
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-purple-300 bg-purple-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">วันขายดีที่สุด</span>
                        <Calendar className="h-5 w-5 text-purple-600" />
                      </div>
                      <p className="text-2xl font-bold text-purple-700">
                        {seasonalPattern.bestDay}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {seasonalPattern.pattern}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Trend Chart with Moving Average */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-purple-600" />
                      กราฟยอดขายพร้อม Moving Average (7 วัน)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(d) => new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                          tick={{ fontSize: 10 }}
                        />
                        <YAxis 
                          tickFormatter={(v) => `฿${(v / 1000).toFixed(0)}K`}
                          tick={{ fontSize: 10 }}
                        />
                        <Tooltip
                          formatter={(value: any, name: string) => [
                            formatCurrency(value),
                            name === 'amount' ? 'ยอดขาย' : 'MA7'
                          ]}
                          labelFormatter={(d) => new Date(d).toLocaleDateString('th-TH')}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="amount" 
                          stroke="#8b5cf6" 
                          fill="url(#colorAmount)"
                          strokeWidth={2}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="ma7" 
                          stroke="#ef4444" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-6 mt-2 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-purple-500 rounded"></div>
                        <span>ยอดขายรายวัน</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-0.5 bg-red-500"></div>
                        <span>Moving Average 7 วัน</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Day of Week Performance */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-purple-600" />
                      ประสิทธิภาพรายวันในสัปดาห์
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={Object.entries(seasonalPattern.dayOfWeek).map(([day, avg]) => ({ day, avg }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={(v) => `฿${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: any) => formatCurrency(v)} />
                        <Bar 
                          dataKey="avg" 
                          fill="#8b5cf6"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Products Tab */}
              <TabsContent value="products" className="space-y-4 mt-4">
                <div className="grid gap-3">
                  {productAlerts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>ไม่มีการแจ้งเตือนสินค้า</p>
                    </div>
                  ) : (
                    productAlerts.map((alert, idx) => (
                      <Card key={idx} className={`border-l-4 ${
                        alert.alertType === 'rising_star' ? 'border-l-green-500 bg-green-50' :
                        alert.alertType === 'declining' ? 'border-l-red-500 bg-red-50' :
                        alert.alertType === 'new_entry' ? 'border-l-blue-500 bg-blue-50' :
                        'border-l-gray-300 bg-gray-50'
                      }`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className={priorityColors[alert.priority]}>
                                  {alert.priority === 'high' ? 'ด่วน' : alert.priority === 'medium' ? 'ปานกลาง' : 'ต่ำ'}
                                </Badge>
                                <span className="text-xs text-gray-500">{alert.productCode}</span>
                              </div>
                              <p className="font-semibold text-gray-900">{alert.message}</p>
                              <p className="text-sm text-gray-600 mt-1">
                                💡 {alert.recommendation}
                              </p>
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-lg font-bold">
                                {formatPercent(alert.percentChange)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatCurrency(alert.currentSales)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Customers Tab */}
              <TabsContent value="customers" className="space-y-4 mt-4">
                <div className="grid gap-3">
                  {customerAlerts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>ไม่มีการแจ้งเตือนลูกค้า</p>
                    </div>
                  ) : (
                    customerAlerts.map((alert, idx) => (
                      <Card key={idx} className={`border-l-4 ${
                        alert.alertType === 'vip_risk' || alert.alertType === 'inactive' ? 'border-l-red-500 bg-red-50' :
                        alert.alertType === 'increasing' || alert.alertType === 'new' ? 'border-l-green-500 bg-green-50' :
                        'border-l-yellow-500 bg-yellow-50'
                      }`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className={priorityColors[alert.priority]}>
                                  {alert.priority === 'high' ? 'ด่วน' : alert.priority === 'medium' ? 'ปานกลาง' : 'ต่ำ'}
                                </Badge>
                                <span className="text-xs text-gray-500">{alert.arcode}</span>
                              </div>
                              <p className="font-semibold text-gray-900">{alert.message}</p>
                              <p className="text-sm text-gray-600 mt-1">
                                💡 {alert.recommendation}
                              </p>
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-lg font-bold">
                                {formatPercent(alert.percentChange)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatCurrency(alert.currentPurchases)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Insights Tab */}
              <TabsContent value="insights" className="space-y-4 mt-4">
                <div className="grid gap-3">
                  {insights.map((insight) => (
                    <Card key={insight.id} className="border hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            insight.impact === 'positive' ? 'bg-green-100' :
                            insight.impact === 'negative' ? 'bg-red-100' :
                            'bg-gray-100'
                          }`}>
                            {insight.category === 'trend' && <TrendingUp className={`h-5 w-5 ${impactColors[insight.impact]}`} />}
                            {insight.category === 'product' && <Package className={`h-5 w-5 ${impactColors[insight.impact]}`} />}
                            {insight.category === 'customer' && <Users className={`h-5 w-5 ${impactColors[insight.impact]}`} />}
                            {insight.category === 'seasonal' && <Calendar className={`h-5 w-5 ${impactColors[insight.impact]}`} />}
                            {insight.category === 'general' && <Lightbulb className={`h-5 w-5 ${impactColors[insight.impact]}`} />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                              <Badge variant="outline" className={priorityColors[insight.priority]}>
                                {insight.priority === 'high' ? 'สำคัญ' : insight.priority === 'medium' ? 'ปานกลาง' : 'ทั่วไป'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                            <div className="flex flex-wrap gap-2">
                              {insight.actionItems.slice(0, 3).map((action, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  {action}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}




