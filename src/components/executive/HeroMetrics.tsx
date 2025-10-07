import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Package, DollarSign, Users, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeroMetricsProps {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalItems: number;
  revenueChange: number;
  ordersChange: number;
  topCustomer: string;
  topProduct: string;
}

export const HeroMetrics = ({
  totalRevenue,
  totalOrders,
  totalCustomers,
  totalItems,
  revenueChange,
  ordersChange,
  topCustomer,
  topProduct,
}: HeroMetricsProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => num.toLocaleString('th-TH');

  const formatChange = (change: number) => {
    const isPositive = change > 0;
    return {
      value: Math.abs(change),
      isPositive,
      Icon: isPositive ? TrendingUp : TrendingDown,
      color: isPositive ? 'text-green-600' : 'text-red-600',
      bgColor: isPositive ? 'bg-green-50' : 'bg-red-50',
    };
  };

  const revenueChangeData = formatChange(revenueChange);
  const ordersChangeData = formatChange(ordersChange);

  return (
    <div className="relative">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-2xl" />

      {/* Content */}
      <Card className="relative border-0 shadow-xl">
        <CardContent className="p-8">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Revenue Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <DollarSign className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">มูลค่าการส่งออกรวม</p>
                  <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {formatCurrency(totalRevenue)}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className={cn("flex items-center gap-1 px-3 py-1 rounded-full", revenueChangeData.bgColor)}>
                  <revenueChangeData.Icon className={cn("h-4 w-4", revenueChangeData.color)} />
                  <span className={cn("text-sm font-semibold", revenueChangeData.color)}>
                    {revenueChangeData.value}%
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">vs ช่วงก่อนหน้า</span>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">ลูกค้าอันดับ 1</p>
                <p className="text-sm font-semibold text-blue-600">🏆 {topCustomer}</p>
              </div>
            </div>

            {/* Orders & Items Section */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-purple-600" />
                    <p className="text-sm font-medium text-muted-foreground">คำสั่งซื้อ</p>
                  </div>
                  <h3 className="text-3xl font-bold text-purple-600">
                    {formatNumber(totalOrders)}
                  </h3>
                  <div className={cn("flex items-center gap-1", ordersChangeData.color)}>
                    <ordersChangeData.Icon className="h-3 w-3" />
                    <span className="text-xs font-semibold">{ordersChangeData.value}%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-pink-600" />
                    <p className="text-sm font-medium text-muted-foreground">รายการ</p>
                  </div>
                  <h3 className="text-3xl font-bold text-pink-600">
                    {formatNumber(totalItems)}
                  </h3>
                  <p className="text-xs text-muted-foreground">ชิ้น</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-600" />
                  <p className="text-sm font-medium text-muted-foreground">ลูกค้าทั้งหมด</p>
                </div>
                <h3 className="text-3xl font-bold text-indigo-600">
                  {formatNumber(totalCustomers)}
                </h3>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">สินค้าขายดี</p>
                <p className="text-sm font-semibold text-purple-600">🔥 {topProduct}</p>
              </div>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="mt-6 pt-6 border-t">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(totalOrders > 0 ? totalRevenue / totalOrders : 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">มูลค่าเฉลี่ย/คำสั่งซื้อ</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {formatNumber(totalOrders > 0 ? Math.round(totalItems / totalOrders) : 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">รายการเฉลี่ย/คำสั่งซื้อ</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-pink-600">
                  {formatCurrency(totalCustomers > 0 ? totalRevenue / totalCustomers : 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">มูลค่าเฉลี่ย/ลูกค้า</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
