import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { Users, TrendingUp, AlertTriangle, UserPlus, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CustomerSegment {
  segment: 'vip' | 'regular' | 'new' | 'atRisk' | 'churned';
  count: number;
  percentage: number;
  value: number;
  avgOrderValue: number;
  lastOrderDays: number;
}

interface CustomerSegmentationProps {
  segments: CustomerSegment[];
  onSegmentClick?: (segment: string) => void;
}

const SEGMENT_COLORS = {
  vip: '#8B5CF6',       // Purple
  regular: '#3B82F6',   // Blue
  new: '#10B981',       // Green
  atRisk: '#F59E0B',    // Orange
  churned: '#EF4444',   // Red
};

const SEGMENT_CONFIG = {
  vip: {
    label: 'VIP',
    icon: TrendingUp,
    description: 'ลูกค้าที่ซื้อมากกว่า 100,000 บาท/เดือน',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-600',
    borderColor: 'border-purple-200',
  },
  regular: {
    label: 'ลูกค้าปกติ',
    icon: Users,
    description: 'ลูกค้าที่ซื้อสม่ำเสมอ',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-200',
  },
  new: {
    label: 'ลูกค้าใหม่',
    icon: UserPlus,
    description: 'ลูกค้าที่เข้ามาใหม่ภายใน 30 วัน',
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
    borderColor: 'border-green-200',
  },
  atRisk: {
    label: 'เสี่ยงหาย',
    icon: AlertTriangle,
    description: 'ไม่ได้สั่งซื้อมากกว่า 30 วัน',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-600',
    borderColor: 'border-orange-200',
  },
  churned: {
    label: 'หยุดซื้อ',
    icon: UserX,
    description: 'ไม่ได้สั่งซื้อมากกว่า 90 วัน',
    bgColor: 'bg-red-50',
    textColor: 'text-red-600',
    borderColor: 'border-red-200',
  },
};

export const CustomerSegmentation = ({ segments, onSegmentClick }: CustomerSegmentationProps) => {
  const totalCustomers = useMemo(() => {
    return segments.reduce((sum, seg) => sum + seg.count, 0);
  }, [segments]);

  const totalValue = useMemo(() => {
    return segments.reduce((sum, seg) => sum + seg.value, 0);
  }, [segments]);

  const chartData = useMemo(() => {
    return segments.map(seg => ({
      name: SEGMENT_CONFIG[seg.segment].label,
      value: seg.count,
      percentage: seg.percentage,
      segment: seg.segment,
    }));
  }, [segments]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {data.value} ราย ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">🎯 การแบ่งกลุ่มลูกค้า</h3>
          <p className="text-sm text-muted-foreground">
            วิเคราะห์ลูกค้าตามพฤติกรรมการซื้อ
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{totalCustomers}</div>
          <p className="text-xs text-muted-foreground">ลูกค้าทั้งหมด</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">สัดส่วนลูกค้า</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.percentage.toFixed(0)}%`}
                  outerRadius={100}
                  innerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                  paddingAngle={2}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={SEGMENT_COLORS[entry.segment as keyof typeof SEGMENT_COLORS]}
                      style={{ cursor: 'pointer' }}
                      onClick={() => onSegmentClick?.(entry.segment)}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Segment Details */}
        <div className="space-y-2">
          {segments.map((segment) => {
            const config = SEGMENT_CONFIG[segment.segment];
            const Icon = config.icon;

            return (
              <Card
                key={segment.segment}
                className={cn(
                  "border-l-4 transition-all hover:shadow-md cursor-pointer",
                  config.borderColor
                )}
                onClick={() => onSegmentClick?.(segment.segment)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={cn("p-2 rounded-lg", config.bgColor)}>
                        <Icon className={cn("h-4 w-4", config.textColor)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm">{config.label}</h4>
                          <Badge variant="outline" className="text-xs">
                            {segment.count} ราย
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {config.description}
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">มูลค่ารวม:</span>
                            <span className="font-semibold ml-1">
                              ฿{segment.value.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">เฉลี่ย/ราย:</span>
                            <span className="font-semibold ml-1">
                              ฿{segment.avgOrderValue.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={cn("text-2xl font-bold", config.textColor)}>
                        {segment.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Summary Stats */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {segments.find(s => s.segment === 'vip')?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground">ลูกค้า VIP</p>
              <p className="text-xs font-semibold text-purple-600">
                {((segments.find(s => s.segment === 'vip')?.value || 0) / totalValue * 100).toFixed(1)}% ของรายได้
              </p>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {segments.find(s => s.segment === 'atRisk')?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground">ลูกค้าเสี่ยง</p>
              <p className="text-xs font-semibold text-orange-600">
                ต้องติดตาม
              </p>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {segments.find(s => s.segment === 'new')?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground">ลูกค้าใหม่</p>
              <p className="text-xs font-semibold text-green-600">
                30 วันล่าสุด
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
