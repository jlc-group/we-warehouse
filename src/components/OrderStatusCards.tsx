import { FileText, CheckCircle, Package, Truck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface OrderStats {
  total: number;
  confirmed: number;
  preparing: number;
  delivered: number;
}

interface OrderStatusCardsProps {
  stats: OrderStats;
  isLoading?: boolean;
}

export function OrderStatusCards({ stats, isLoading = false }: OrderStatusCardsProps) {
  const statusCards = [
    {
      title: 'ใบสั่งซื้อทั้งหมด',
      value: stats.total,
      icon: FileText,
      bgColor: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      description: '',
    },
    {
      title: 'ยืนยันแล้ว',
      value: stats.confirmed,
      icon: CheckCircle,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
      description: `${stats.confirmed} รอจัดเตรียม`,
    },
    {
      title: 'กำลังจัดเตรียม',
      value: stats.preparing,
      icon: Package,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600',
      description: `${stats.preparing} กำลังดำเนินการ`,
    },
    {
      title: 'ส่งมอบแล้ว',
      value: stats.delivered,
      icon: Truck,
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
      description: `${stats.delivered} เสร็จสิ้น`,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, index) => (
          <Card key={index} className="bg-gray-50 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-8 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {statusCards.map((card, index) => {
        const IconComponent = card.icon;

        return (
          <Card key={index} className="bg-gray-50 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full ${card.bgColor} ${card.iconColor}`}>
                  <IconComponent className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-semibold text-gray-800">
                    {card.value.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500 font-medium">
                    {card.title}
                  </div>
                  {card.description && (
                    <div className="text-xs text-gray-400 mt-1">
                      {card.description}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}