import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GrowthBadge } from './GrowthBadge';
import { formatNumber } from './utils';

interface ComparisonCardProps {
  title: string;
  icon: React.ReactNode;
  currentValue: number;
  previousValue: number;
  growth: number;
  formatValue?: (value: number) => string;
}

export function ComparisonCard({
  title,
  icon,
  currentValue,
  previousValue,
  growth,
  formatValue = formatNumber
}: ComparisonCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500">ปัจจุบัน</p>
            <p className="text-2xl font-bold text-gray-900">{formatValue(currentValue)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">ช่วงก่อนหน้า</p>
            <p className="text-lg font-semibold text-gray-600">{formatValue(previousValue)}</p>
          </div>
          <div className="pt-2 border-t">
            <GrowthBadge value={growth} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
