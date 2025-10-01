
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCustomers } from '@/hooks/useCustomers';
import { useSalesOrders } from '@/hooks/useSalesOrders';
import { useAvailableProductsForSales } from '@/hooks/useProductsSummary';
import { AlertCircle, CheckCircle, Database, Users, Package, ShoppingCart } from 'lucide-react';

// Component สำหรับแสดงสถานะการเชื่อมต่อฐานข้อมูล
export const SalesSystemDebug: React.FC = () => {
  const { data: customers, isLoading: customersLoading, error: customersError } = useCustomers();
  const { data: orders, isLoading: ordersLoading, error: ordersError } = useSalesOrders();
  const { data: products, isLoading: productsLoading, error: productsError } = useAvailableProductsForSales();

  const checks = [
    {
      name: 'ตารางลูกค้า (Customers)',
      icon: Users,
      data: customers,
      loading: customersLoading,
      error: customersError,
      description: 'ควรมีลูกค้าตัวอย่าง 5 รายการ'
    },
    {
      name: 'ตารางใบสั่งซื้อ (Sales Orders)',
      icon: ShoppingCart,
      data: orders,
      loading: ordersLoading,
      error: ordersError,
      description: 'ตารางใบสั่งซื้อ (อาจยังไม่มีข้อมูล)'
    },
    {
      name: 'สินค้าสำหรับขาย (Products)',
      icon: Package,
      data: products,
      loading: productsLoading,
      error: productsError,
      description: 'สินค้าที่มีสต็อกสำหรับการขาย'
    }
  ];

  const getStatus = (check: any) => {
    if (check.loading) return { type: 'loading', text: 'กำลังโหลด...', color: 'bg-yellow-500' };
    if (check.error) return { type: 'error', text: 'เกิดข้อผิดพลาด', color: 'bg-red-500' };
    if (check.data && check.data.length > 0) return { type: 'success', text: `พบ ${check.data.length} รายการ`, color: 'bg-green-500' };
    return { type: 'empty', text: 'ไม่มีข้อมูล', color: 'bg-gray-500' };
  };

  const testMigrationApplied = () => {
    const hasCustomers = customers && customers.length > 0;
    const hasProducts = products && products.length > 0;
    const noErrors = !customersError && !ordersError && !productsError;

    return hasCustomers && hasProducts && noErrors;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          สถานะระบบขาย (Sales System Debug)
        </CardTitle>
        <CardDescription>
          ตรวจสอบการเชื่อมต่อฐานข้อมูลและการ apply migration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className="p-4 rounded-lg border bg-muted/50">
          <div className="flex items-center justify-between">
            <span className="font-medium">สถานะโดยรวม:</span>
            {testMigrationApplied() ? (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                พร้อมใช้งาน
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                ต้อง Apply Migration
              </Badge>
            )}
          </div>
        </div>

        {/* Individual Checks */}
        {checks.map((check, index) => {
          const status = getStatus(check);
          const IconComponent = check.icon;

          return (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <IconComponent className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">{check.name}</div>
                  <div className="text-sm text-muted-foreground">{check.description}</div>
                </div>
              </div>
              <Badge
                variant={status.type === 'success' ? 'default' : status.type === 'error' ? 'destructive' : 'secondary'}
                className={status.type === 'success' ? 'bg-green-500' : ''}
              >
                {status.text}
              </Badge>
            </div>
          );
        })}

        {/* Error Details */}
        {(customersError || ordersError || productsError) && (
          <div className="p-4 rounded-lg border border-red-200 bg-red-50">
            <h4 className="font-medium text-red-800 mb-2">รายละเอียดข้อผิดพลาด:</h4>
            <div className="space-y-1 text-sm text-red-700">
              {customersError && <div>• Customers: {customersError.message}</div>}
              {ordersError && <div>• Orders: {ordersError.message}</div>}
              {productsError && <div>• Products: {productsError.message}</div>}
            </div>
          </div>
        )}

        {/* Instructions */}
        {!testMigrationApplied() && (
          <div className="p-4 rounded-lg border border-orange-200 bg-orange-50">
            <h4 className="font-medium text-orange-800 mb-2">วิธีแก้ไข:</h4>
            <ol className="text-sm text-orange-700 space-y-1 ml-4 list-decimal">
              <li>เปิด Supabase Dashboard → SQL Editor</li>
              <li>Apply migration: <code className="bg-orange-100 px-1 rounded">20250929_create_sales_system.sql</code></li>
              <li>Apply migration: <code className="bg-orange-100 px-1 rounded">products_summary_views.sql</code></li>
              <li>Refresh หน้านี้เพื่อตรวจสอบอีกครั้ง</li>
            </ol>
          </div>
        )}

        {/* Success Message */}
        {testMigrationApplied() && (
          <div className="p-4 rounded-lg border border-green-200 bg-green-50">
            <h4 className="font-medium text-green-800 mb-2">🎉 ระบบพร้อมใช้งาน!</h4>
            <p className="text-sm text-green-700">
              สามารถใช้งาน Sales system ได้เต็มรูปแบบแล้ว ลองไปที่แท็บ "ใบสั่งซื้อ" เพื่อทดสอบการสร้างใบสั่งซื้อ
            </p>
          </div>
        )}

        {/* Refresh Button */}
        <div className="pt-2">
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="w-full"
          >
            รีเฟรชเพื่อตรวจสอบอีกครั้ง
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SalesSystemDebug;