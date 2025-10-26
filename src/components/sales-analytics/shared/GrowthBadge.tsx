import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatPercent } from './utils';

interface GrowthBadgeProps {
  value: number;
  label?: string;
}

export function GrowthBadge({ value, label = 'เปลี่ยนแปลง' }: GrowthBadgeProps) {
  // Safety check for undefined or NaN values
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
  const isPositive = safeValue >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isPositive
    ? 'bg-green-100 text-green-800 border-green-300'
    : 'bg-red-100 text-red-800 border-red-300';

  return (
    <Badge variant="outline" className={`${colorClass} flex items-center gap-1 px-3 py-1`}>
      <Icon className="h-3 w-3" />
      <span className="font-semibold">
        {label && `${label}: `}{formatPercent(safeValue)}
      </span>
    </Badge>
  );
}
