import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Box, MapPin, Boxes, Clock, TrendingUp } from 'lucide-react';
import type { StockOverviewSummary } from '@/hooks/useStockOverview';

interface StockOverviewStatsProps {
  summary: StockOverviewSummary;
  lastUpdated?: string;
}

export function StockOverviewStats({ summary, lastUpdated }: StockOverviewStatsProps) {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('th-TH').format(Math.round(num));
  };

  const formatLastUpdated = (dateString?: string) => {
    if (!dateString) return 'ไม่ทราบ';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('th-TH', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date);
  };

  const stats = [
    {
      title: 'จำนวนรายการทั้งหมด',
      value: formatNumber(summary.totalItems),
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'จำนวนสินค้า (SKU)',
      value: formatNumber(summary.totalProducts),
      icon: Box,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'ตำแหน่งที่ใช้งาน',
      value: formatNumber(summary.totalLocations),
      icon: MapPin,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'จำนวนชิ้นทั้งหมด',
      value: formatNumber(summary.totalPieces),
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'จำนวนลัง (Cartons)',
      value: formatNumber(summary.totalCartons),
      icon: Boxes,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50'
    },
    {
      title: 'อัพเดทล่าสุด',
      value: formatLastUpdated(lastUpdated),
      icon: Clock,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card
            key={index}
            className="overflow-hidden border-none shadow-md hover:shadow-lg transition-all duration-200"
          >
            <div className={`h-1 bg-gradient-to-r ${
              index === 0 ? 'from-blue-400 to-blue-600' :
              index === 1 ? 'from-green-400 to-green-600' :
              index === 2 ? 'from-purple-400 to-purple-600' :
              index === 3 ? 'from-orange-400 to-orange-600' :
              index === 4 ? 'from-pink-400 to-pink-600' :
              'from-gray-400 to-gray-600'
            }`} />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`p-3 rounded-xl ${stat.bgColor} shadow-sm`}>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className={`text-3xl font-bold ${stat.color} tracking-tight`}>
                {stat.value}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
