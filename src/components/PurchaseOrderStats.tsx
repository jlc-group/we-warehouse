/**
 * Purchase Order Statistics Dashboard
 * แสดงภาพรวมสถิติ PO และ Fulfillment Tasks
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ShoppingCart,
  Clock,
  Package,
  CheckCircle,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Truck
} from 'lucide-react';
import type { PurchaseOrderHeader, FulfillmentTask } from '@/services/purchaseOrderService';

interface PurchaseOrderStatsProps {
  purchaseOrders: PurchaseOrderHeader[];
  fulfillmentTasks: FulfillmentTask[];
  loading?: boolean;
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'blue' | 'yellow' | 'green' | 'purple' | 'orange' | 'red';
  loading?: boolean;
}

const StatCard = ({
  icon: Icon,
  label,
  value,
  subtext,
  trend,
  trendValue,
  color = 'blue',
  loading = false
}: StatCardProps) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    red: 'bg-red-50 text-red-600 border-red-100',
  };

  const trendIcons = {
    up: <TrendingUp className="h-3 w-3 text-green-600" />,
    down: <TrendingUp className="h-3 w-3 text-red-600 rotate-180" />,
    neutral: null,
  };

  if (loading) {
    return (
      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>

            {subtext && (
              <p className="text-xs text-gray-500 mt-1">{subtext}</p>
            )}

            {trend && trendValue && (
              <div className="flex items-center gap-1 mt-2">
                {trendIcons[trend]}
                <span className={`text-xs font-medium ${
                  trend === 'up' ? 'text-green-600' :
                  trend === 'down' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {trendValue}
                </span>
              </div>
            )}
          </div>

          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const PurchaseOrderStats = ({
  purchaseOrders,
  fulfillmentTasks,
  loading = false
}: PurchaseOrderStatsProps) => {

  // Calculate statistics
  const stats = useMemo(() => {
    // PO Statistics
    const totalPOs = purchaseOrders.length;
    const totalValue = purchaseOrders.reduce((sum, po) =>
      sum + parseFloat(po.M_TotalAmount || '0'), 0
    );

    // Fulfillment Statistics
    const totalTasks = fulfillmentTasks.length;
    const pendingTasks = fulfillmentTasks.filter(t => t.status === 'pending').length;
    const inProgressTasks = fulfillmentTasks.filter(t => t.status === 'in_progress').length;
    const packedTasks = fulfillmentTasks.filter(t => t.status === 'packed').length;
    const shippedTasks = fulfillmentTasks.filter(t => t.status === 'shipped').length;
    const completedTasks = fulfillmentTasks.filter(t => t.status === 'completed' || t.status === 'delivered').length;

    // Today's statistics
    const today = new Date().toISOString().split('T')[0];
    const completedToday = fulfillmentTasks.filter(t => {
      if (t.status !== 'completed' && t.status !== 'delivered') return false;
      const updatedDate = new Date(t.updated_at).toISOString().split('T')[0];
      return updatedDate === today;
    }).length;

    // POs without fulfillment tasks
    const poWithTasks = new Set(fulfillmentTasks.map(t => t.po_number));
    const posWithoutTasks = purchaseOrders.filter(po => !poWithTasks.has(po.PO_Number)).length;

    // Urgent tasks (delivery date within 2 days)
    const urgentTasks = fulfillmentTasks.filter(t => {
      if (t.status === 'completed' || t.status === 'delivered' || t.status === 'cancelled') return false;
      const deliveryDate = new Date(t.delivery_date);
      const twoDaysFromNow = new Date();
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
      return deliveryDate <= twoDaysFromNow;
    }).length;

    return {
      totalPOs,
      totalValue,
      totalTasks,
      pendingTasks,
      inProgressTasks,
      packedTasks,
      shippedTasks,
      completedTasks,
      completedToday,
      posWithoutTasks,
      urgentTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    };
  }, [purchaseOrders, fulfillmentTasks]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Main Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard
          icon={ShoppingCart}
          label="PO ทั้งหมด"
          value={stats.totalPOs}
          subtext={`${stats.posWithoutTasks} รายการยังไม่สร้างงาน`}
          color="blue"
          loading={loading}
        />

        <StatCard
          icon={Clock}
          label="รอจัดสินค้า"
          value={stats.pendingTasks}
          subtext={`${stats.posWithoutTasks} PO ยังไม่เริ่ม`}
          color="yellow"
          loading={loading}
        />

        <StatCard
          icon={Package}
          label="กำลังจัดสินค้า"
          value={stats.inProgressTasks + stats.packedTasks}
          subtext={`${stats.packedTasks} รายการจัดครบแล้ว`}
          color="purple"
          loading={loading}
        />

        <StatCard
          icon={CheckCircle}
          label="เสร็จสมบูรณ์"
          value={stats.completedToday}
          subtext="วันนี้"
          trend="neutral"
          color="green"
          loading={loading}
        />

        <StatCard
          icon={DollarSign}
          label="มูลค่ารวม"
          value={formatCurrency(stats.totalValue)}
          subtext={`${stats.totalPOs} รายการ`}
          color="orange"
          loading={loading}
        />
      </div>

      {/* Secondary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={Truck}
          label="กำลังจัดส่ง"
          value={stats.shippedTasks}
          subtext="อยู่ระหว่างการขนส่ง"
          color="blue"
          loading={loading}
        />

        <StatCard
          icon={AlertCircle}
          label="งานเร่งด่วน"
          value={stats.urgentTasks}
          subtext="ต้องส่งภายใน 2 วัน"
          color="red"
          loading={loading}
        />

        <StatCard
          icon={TrendingUp}
          label="อัตราความสำเร็จ"
          value={`${stats.completionRate}%`}
          subtext={`${stats.completedTasks}/${stats.totalTasks} งาน`}
          trend={stats.completionRate >= 80 ? 'up' : stats.completionRate >= 50 ? 'neutral' : 'down'}
          trendValue={`${stats.completionRate >= 80 ? 'ดีเยี่ยม' : stats.completionRate >= 50 ? 'ปานกลาง' : 'ต้องปรับปรุง'}`}
          color="green"
          loading={loading}
        />
      </div>

      {/* Summary Bar */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-600">สรุปสถานะงาน</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">ความคืบหน้าโดยรวม</span>
              <span className="font-semibold text-gray-900">{stats.completionRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${stats.completionRate}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>รอจัดสินค้า: {stats.pendingTasks}</span>
              <span>กำลังดำเนินการ: {stats.inProgressTasks}</span>
              <span>เสร็จสมบูรณ์: {stats.completedTasks}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
