import { useState } from 'react';
import { useInventoryAlerts } from '@/hooks/useInventoryAlerts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  Clock,
  Package,
  TrendingDown,
  Settings,
  CheckCircle,
  X,
  Bell,
  ShoppingCart,
  Calendar,
  BarChart3,
  Eye,
  EyeOff
} from 'lucide-react';
// Types moved to component file
interface StockAlert {
  id: string;
  type: 'low_stock' | 'critical_stock' | 'out_of_stock' | 'expiry_warning' | 'reorder_needed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  item: any;
  message: string;
  actionRequired: string;
  createdAt: Date;
  acknowledged: boolean;
  currentQuantity: number;
  threshold?: number;
  daysUntilExpiry?: number;
}

interface AlertsPanelProps {
  className?: string;
}

export function AlertsPanel({ className = '' }: AlertsPanelProps) {
  const {
    alerts,
    reorderPoints,
    alertSettings,
    alertSummary,
    updateAlertSettings,
    acknowledgeAlert,
    dismissAlert,
    getAlertsBySeverity
  } = useInventoryAlerts();

  const [showSettings, setShowSettings] = useState(false);
  const [showAcknowledged, setShowAcknowledged] = useState(false);

  const getSeverityIcon = (severity: StockAlert['severity']) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'high': return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'medium': return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'low': return <Package className="h-5 w-5 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity: StockAlert['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getTypeIcon = (type: StockAlert['type']) => {
    switch (type) {
      case 'out_of_stock': return <TrendingDown className="h-4 w-4" />;
      case 'critical_stock': return <AlertTriangle className="h-4 w-4" />;
      case 'low_stock': return <Package className="h-4 w-4" />;
      case 'expiry_warning': return <Calendar className="h-4 w-4" />;
      case 'reorder_needed': return <ShoppingCart className="h-4 w-4" />;
    }
  };

  const filteredAlerts = showAcknowledged
    ? alerts
    : alerts.filter(alert => !alert.acknowledged);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border border-gray-200">
          <CardContent className="bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">แจ้งเตือนทั้งหมด</p>
                <p className="text-2xl font-bold text-gray-900">{alertSummary.totalAlerts}</p>
              </div>
              <Bell className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardContent className="bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">สถานะวิกฤต</p>
                <p className="text-2xl font-bold text-red-600">{alertSummary.criticalAlerts}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardContent className="bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">ยังไม่รับทราบ</p>
                <p className="text-2xl font-bold text-orange-600">{alertSummary.unacknowledgedAlerts}</p>
              </div>
              <Eye className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardContent className="bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">ต้องสั่งซื้อ</p>
                <p className="text-2xl font-bold text-blue-600">{alertSummary.reorderNeeded}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="alerts" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-fit grid-cols-3 bg-white border border-gray-200">
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              แจ้งเตือน
            </TabsTrigger>
            <TabsTrigger value="reorder" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              จุดสั่งซื้อ
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              ตั้งค่า
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAcknowledged(!showAcknowledged)}
              className="flex items-center gap-2"
            >
              {showAcknowledged ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showAcknowledged ? 'ซ่อนที่รับทราบ' : 'แสดงทั้งหมด'}
            </Button>
          </div>
        </div>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          {filteredAlerts.length === 0 ? (
            <Card className="bg-white border border-gray-200">
              <CardContent className="bg-white p-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">ไม่มีแจ้งเตือนที่ต้องดำเนินการ</p>
                <p className="text-sm text-gray-600">สินค้าในคลังอยู่ในสภาพปกติ</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
                <Card key={alert.id} className="bg-white border border-gray-200">
                  <CardContent className="bg-white p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(alert.severity)}
                          {getTypeIcon(alert.type)}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getSeverityColor(alert.severity)}>
                              {alert.severity === 'critical' ? 'วิกฤต' :
                               alert.severity === 'high' ? 'สูง' :
                               alert.severity === 'medium' ? 'ปานกลาง' : 'ต่ำ'}
                            </Badge>
                            <Badge variant="outline">
                              {alert.item.location}
                            </Badge>
                            {alert.acknowledged && (
                              <Badge className="bg-green-100 text-green-800">
                                รับทราบแล้ว
                              </Badge>
                            )}
                          </div>

                          <h4 className="font-medium text-gray-900 mb-1">{alert.message}</h4>
                          <p className="text-sm text-gray-600 mb-2">{alert.actionRequired}</p>

                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>SKU: {alert.item.sku}</span>
                            <span>คงเหลือ: {alert.currentQuantity} ชิ้น</span>
                            {alert.threshold && <span>ขีดจำกัด: {alert.threshold} ชิ้น</span>}
                            {alert.daysUntilExpiry && <span>หมดอายุใน: {alert.daysUntilExpiry} วัน</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!alert.acknowledged && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => acknowledgeAlert(alert.id)}
                          >
                            รับทราบ
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => dismissAlert(alert.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Reorder Points Tab */}
        <TabsContent value="reorder" className="space-y-4">
          {reorderPoints.length === 0 ? (
            <Card className="bg-white border border-gray-200">
              <CardContent className="bg-white p-8 text-center">
                <ShoppingCart className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">ไม่มีสินค้าที่ต้องสั่งซื้อ</p>
                <p className="text-sm text-gray-600">สต็อกทั้งหมดยังเพียงพอ</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reorderPoints.map((point, index) => (
                <Card key={index} className="bg-white border border-gray-200">
                  <CardContent className="bg-white p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{point.productName}</h4>
                          <p className="text-sm text-gray-600">จำเป็นต้องสั่งซื้อเพิ่ม</p>
                        </div>
                        <Badge className="bg-orange-100 text-orange-800">
                          ต้องสั่งซื้อ
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-600">สต็อกปัจจุบัน</p>
                          <p className="text-lg font-semibold text-red-600">{point.currentStock}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">จุดสั่งซื้อ</p>
                          <p className="text-lg font-semibold text-orange-600">{point.reorderLevel}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">แนะนำสั่งซื้อ</p>
                          <p className="text-lg font-semibold text-blue-600">{point.reorderQuantity}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Lead Time</p>
                          <p className="text-lg font-semibold text-gray-600">{point.leadTimeDays} วัน</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>ระดับสต็อก</span>
                          <span>{Math.round((point.currentStock / point.reorderLevel) * 100)}%</span>
                        </div>
                        <Progress
                          value={Math.min((point.currentStock / point.reorderLevel) * 100, 100)}
                          className="h-2"
                        />
                      </div>

                      <div className="text-xs text-gray-500 space-y-1">
                        <p>• การใช้เฉลี่ยต่อวัน: {point.averageDailyUsage} ชิ้น</p>
                        <p>• สต็อกสำรอง: {point.safetyStock} ชิ้น</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                ตั้งค่าการแจ้งเตือน
              </CardTitle>
            </CardHeader>
            <CardContent className="bg-white space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="lowStockThreshold">ขีดจำกัดสต็อกต่ำ (ชิ้น)</Label>
                  <Input
                    id="lowStockThreshold"
                    type="number"
                    value={alertSettings.lowStockThreshold}
                    onChange={(e) => updateAlertSettings({ lowStockThreshold: parseInt(e.target.value) })}
                    className="bg-white"
                  />
                  <p className="text-xs text-gray-500">แจ้งเตือนเมื่อสต็อกต่ำกว่าจำนวนนี้</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="criticalStockThreshold">ขีดจำกัดสต็อกวิกฤต (ชิ้น)</Label>
                  <Input
                    id="criticalStockThreshold"
                    type="number"
                    value={alertSettings.criticalStockThreshold}
                    onChange={(e) => updateAlertSettings({ criticalStockThreshold: parseInt(e.target.value) })}
                    className="bg-white"
                  />
                  <p className="text-xs text-gray-500">แจ้งเตือนด่วนเมื่อสต็อกต่ำกว่าจำนวนนี้</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiryAlertDays">แจ้งเตือนหมดอายุ (วันล่วงหน้า)</Label>
                  <Input
                    id="expiryAlertDays"
                    type="number"
                    value={alertSettings.expiryAlertDays}
                    onChange={(e) => updateAlertSettings({ expiryAlertDays: parseInt(e.target.value) })}
                    className="bg-white"
                  />
                  <p className="text-xs text-gray-500">แจ้งเตือนก่อนหมดอายุกี่วัน</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="outOfStockEnabled">แจ้งเตือนสินค้าหมด</Label>
                    <p className="text-xs text-gray-500">แจ้งเตือนเมื่อสินค้าหมดสต็อก</p>
                  </div>
                  <Switch
                    id="outOfStockEnabled"
                    checked={alertSettings.outOfStockEnabled}
                    onCheckedChange={(checked) => updateAlertSettings({ outOfStockEnabled: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="reorderPointEnabled">จุดสั่งซื้ออัตโนมัติ</Label>
                    <p className="text-xs text-gray-500">คำนวณจุดสั่งซื้อใหม่อัตโนมัติ</p>
                  </div>
                  <Switch
                    id="reorderPointEnabled"
                    checked={alertSettings.reorderPointEnabled}
                    onCheckedChange={(checked) => updateAlertSettings({ reorderPointEnabled: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="emailNotifications">การแจ้งเตือนทางอีเมล</Label>
                    <p className="text-xs text-gray-500">ส่งอีเมลแจ้งเตือนสำหรับการแจ้งเตือนสำคัญ</p>
                  </div>
                  <Switch
                    id="emailNotifications"
                    checked={alertSettings.emailNotifications}
                    onCheckedChange={(checked) => updateAlertSettings({ emailNotifications: checked })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}