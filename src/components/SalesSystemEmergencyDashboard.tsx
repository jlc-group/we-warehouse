import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  RefreshCw,
  AlertCircle,
  Settings,
  BookOpen,
  Activity,
  XCircle
} from 'lucide-react';

import { DatabaseMigrationStatus } from './DatabaseMigrationStatus';
import { MigrationGuide } from './MigrationGuide';
import { EmergencyFallback, useEmergencyFallback } from './EmergencyFallback';
import { testSalesSystemStatus, generateMigrationChecklist, type DatabaseStatus } from '@/utils/connectionTest';
import { useCustomers } from '@/hooks/useCustomers';
import { useSalesOrders } from '@/hooks/useSalesOrders';
import { useAvailableProductsForSales } from '@/hooks/useProductsSummary';

// Main emergency dashboard component
export const SalesSystemEmergencyDashboard: React.FC = () => {
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Hook into existing data fetching
  const { error: customersError } = useCustomers({ limit: 1 });
  const { error: ordersError } = useSalesOrders({ limit: 1 });
  const { error: productsError } = useAvailableProductsForSales();

  // Use emergency fallback hook
  const { shouldShowFallback, isDatabaseError } = useEmergencyFallback(
    customersError || ordersError || productsError
  );

  // Test database status
  const refreshStatus = async () => {
    setIsLoading(true);
    try {
      const status = await testSalesSystemStatus();
      setDatabaseStatus(status);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to test database status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  // Generate overall health score
  const getHealthScore = (): number => {
    if (!databaseStatus) return 0;
    return Math.round((databaseStatus.passedTests / databaseStatus.totalTests) * 100);
  };

  const healthScore = getHealthScore();
  const checklist = databaseStatus ? generateMigrationChecklist(databaseStatus) : [];

  // If no database errors, show success state
  if (!shouldShowFallback && databaseStatus?.isHealthy) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">🎉 ระบบขายพร้อมใช้งาน!</AlertTitle>
          <AlertDescription className="text-green-700">
            ฐานข้อมูลทำงานปกติ สามารถใช้งานระบบขายได้เต็มรูปแบบแล้ว
          </AlertDescription>
        </Alert>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              สถานะระบบ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{healthScore}%</div>
                <div className="text-sm text-muted-foreground">สุขภาพระบบ</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{databaseStatus?.passedTests}</div>
                <div className="text-sm text-muted-foreground">การทดสอบผ่าน</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{databaseStatus?.completedMigrations.length}</div>
                <div className="text-sm text-muted-foreground">Migrations สำเร็จ</div>
              </div>
            </div>

            <Button
              onClick={refreshStatus}
              disabled={isLoading}
              variant="outline"
              className="w-full mt-4"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              ตรวจสอบใหม่
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Main Status Alert */}
      <Alert variant="destructive" className="border-2">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="text-lg font-semibold">
          🚨 ระบบขายต้องการการแก้ไข
        </AlertTitle>
        <AlertDescription className="mt-2">
          พบปัญหาการเชื่อมต่อฐานข้อมูล กรุณาใช้แดชบอร์ดนี้เพื่อวินิจฉัยและแก้ไขปัญหา
        </AlertDescription>
      </Alert>

      {/* Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              ภาพรวมสุขภาพระบบ
            </div>
            <Button
              onClick={refreshStatus}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              อัปเดต
            </Button>
          </CardTitle>
          <CardDescription>
            อัปเดตล่าสุด: {lastUpdate.toLocaleString('th-TH')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${healthScore > 70 ? 'text-green-600' : healthScore > 30 ? 'text-yellow-600' : 'text-red-600'}`}>
                {isLoading ? '...' : `${healthScore}%`}
              </div>
              <div className="text-sm text-muted-foreground">สุขภาพระบบ</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {isLoading ? '...' : `${databaseStatus?.passedTests || 0}/${databaseStatus?.totalTests || 0}`}
              </div>
              <div className="text-sm text-muted-foreground">การทดสอบผ่าน</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {isLoading ? '...' : databaseStatus?.completedMigrations.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Migrations สำเร็จ</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {isLoading ? '...' : databaseStatus?.pendingMigrations.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Migrations รอดำเนินการ</div>
            </div>
          </div>

          {!isLoading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>ความคืบหน้า</span>
                <span>{healthScore}%</span>
              </div>
              <Progress value={healthScore} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Migration Checklist */}
      {checklist.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              รายการตรวจสอบ Migration
            </CardTitle>
            <CardDescription>
              ติดตาม migration ที่จำเป็นสำหรับระบบขาย
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {item.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <div>
                      <div className="font-medium">{item.title}</div>
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                    </div>
                  </div>
                  <Badge variant={item.completed ? "default" : "destructive"} className={item.completed ? "bg-green-500" : ""}>
                    {item.completed ? "เสร็จสิ้น" : "รอดำเนินการ"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Summary */}
      {databaseStatus?.errors && databaseStatus.errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              สรุปข้อผิดพลาด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {databaseStatus.errors.map((error, index) => (
                <div key={index} className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {error}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="status" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="status" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            สถานะระบบ
          </TabsTrigger>
          <TabsTrigger value="guide" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            คู่มือแก้ไข
          </TabsTrigger>
          <TabsTrigger value="emergency" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Emergency Help
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="mt-6">
          <DatabaseMigrationStatus />
        </TabsContent>

        <TabsContent value="guide" className="mt-6">
          <MigrationGuide />
        </TabsContent>

        <TabsContent value="emergency" className="mt-6">
          <EmergencyFallback
            title="ระบบขายไม่พร้อมใช้งาน"
            description="กรุณาแก้ไขปัญหาฐานข้อมูลเพื่อเปิดใช้งานระบบขาย"
            error={customersError?.message || ordersError?.message || productsError?.message}
            onRetry={refreshStatus}
            showDatabaseGuide={isDatabaseError}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SalesSystemEmergencyDashboard;