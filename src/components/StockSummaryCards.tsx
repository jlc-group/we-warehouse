import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Package,
  DollarSign,
  BarChart3,
  MapPin,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity
} from 'lucide-react';
import { useStockSummaryStats, formatStockValue, formatNumber, getStockStatusLabel } from '@/hooks/useStockSummaryStats';

export function StockSummaryCards() {
  const { stats, isLoading, hasData } = useStockSummaryStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!hasData) {
    return (
      <Card className="mb-6">
        <CardContent className="p-8 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">ไม่มีข้อมูลสต็อก</h3>
          <p className="text-sm text-gray-500">กรุณาเพิ่มสินค้าและสต็อกเพื่อดูสถิติ</p>
        </CardContent>
      </Card>
    );
  }

  const cards = [
    {
      title: 'จำนวนสินค้าทั้งหมด',
      value: formatNumber(stats.totalProducts),
      subtitle: `${formatNumber(stats.totalActiveProducts)} รายการที่ใช้งาน`,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'มูลค่าสต็อกรวม',
      value: formatStockValue(stats.totalStockValue),
      subtitle: `${formatNumber(stats.totalPieces)} ชิ้นทั้งหมด`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'จำนวน Location',
      value: formatNumber(stats.totalLocations),
      subtitle: `${formatNumber(stats.categoriesCount)} หมวดหมู่`,
      icon: MapPin,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'สถานะสต็อก',
      value: formatNumber(stats.highStockCount),
      subtitle: 'สินค้าสต็อกเยอะ',
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100'
    },
    {
      title: 'สต็อกน้อย',
      value: formatNumber(stats.lowStockCount),
      subtitle: 'ต้องเติมสต็อก',
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      title: 'หมดสต็อก',
      value: formatNumber(stats.outOfStockCount),
      subtitle: 'ต้องจัดหาสินค้า',
      icon: Clock,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      title: 'สต็อกปานกลาง',
      value: formatNumber(stats.mediumStockCount),
      subtitle: 'สถานะปกติ',
      icon: CheckCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'แบรนด์ทั้งหมด',
      value: formatNumber(stats.brandsCount),
      subtitle: `${stats.topBrands[0]?.brand || 'ไม่มีข้อมูล'} (ยอดนิยม)`,
      icon: Activity,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${card.color} mb-1`}>
                {card.value}
              </div>
              <p className="text-xs text-gray-500">
                {card.subtitle}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Component สำหรับแสดงสถิติรายละเอียดเพิ่มเติม
export function StockSummaryDetailCards() {
  const { stats, isLoading, hasData } = useStockSummaryStats();

  if (isLoading || !hasData) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Top Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            หมวดหมู่ยอดนิยม
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.topCategories.slice(0, 5).map((category, index) => (
              <div key={category.category} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    #{index + 1}
                  </span>
                  <span className="text-sm">{category.category}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {formatNumber(category.totalPieces)} ชิ้น
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatNumber(category.count)} รายการ
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Stock Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            สินค้าสต็อกสูงสุด
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.topStockItems.slice(0, 5).map((item, index) => (
              <div key={item.sku} className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-700">
                    #{index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{item.product_name}</div>
                    <div className="text-xs text-gray-500">{item.sku}</div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-medium">
                    {formatNumber(item.total_pieces)} ชิ้น
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full ${
                    item.stock_status === 'high_stock' ? 'bg-green-100 text-green-700' :
                    item.stock_status === 'medium_stock' ? 'bg-blue-100 text-blue-700' :
                    item.stock_status === 'low_stock' ? 'bg-orange-100 text-orange-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {getStockStatusLabel(item.stock_status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}