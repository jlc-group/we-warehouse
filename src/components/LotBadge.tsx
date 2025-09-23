import { Badge } from '@/components/ui/badge';
import { Calendar, Package } from 'lucide-react';

interface LotBadgeProps {
  lot: string;
  mfd?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'secondary' | 'outline' | 'destructive';
  showIcon?: boolean;
  showMfd?: boolean;
  className?: string;
}

// สร้างสีตาม Lot number
const getLotColor = (lot: string) => {
  if (!lot) return { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-700' };

  // สร้าง hash จาก lot string
  let hash = 0;
  for (let i = 0; i < lot.length; i++) {
    hash = lot.charCodeAt(i) + ((hash << 5) - hash);
  }

  // แปลง hash เป็นสีที่นุ่มและสวยงาม
  const hue = Math.abs(hash % 360);
  const saturation = 40 + (Math.abs(hash >> 8) % 20); // 40-60% (นุ่มกว่า SKU)
  const lightness = 85 + (Math.abs(hash >> 16) % 10); // 85-95% (สว่างกว่า SKU)

  return {
    bg: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    border: `hsl(${hue}, ${saturation + 20}%, ${lightness - 20}%)`,
    text: `hsl(${hue}, ${saturation + 30}%, 25%)`
  };
};

// แปลงวันที่เป็นรูปแบบที่อ่านง่าย
const formatMfd = (mfd: string): string => {
  try {
    const date = new Date(mfd);
    return date.toLocaleDateString('th-TH', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit'
    });
  } catch {
    return mfd;
  }
};

export function LotBadge({
  lot,
  mfd,
  size = 'md',
  variant = 'outline',
  showIcon = true,
  showMfd = false,
  className = ""
}: LotBadgeProps) {
  if (!lot) return null;

  const colors = getLotColor(lot);

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4'
  };

  // ใช้สีที่สร้างเองแทน variant เมื่อเป็น default
  const badgeStyle = variant === 'default' ? {
    backgroundColor: colors.bg,
    color: colors.text,
    border: `1px solid ${colors.border}`
  } : {};

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Badge
        variant={variant === 'default' ? 'outline' : variant}
        className={`
          ${sizeClasses[size]}
          font-mono font-medium
          ${variant === 'default' ? '' : 'bg-blue-50 text-blue-700 border-blue-200'}
        `}
        style={badgeStyle}
      >
        {showIcon && (
          <Package className={`${iconSizes[size]} mr-1 flex-shrink-0`} />
        )}
        LOT: {lot}
      </Badge>

      {showMfd && mfd && (
        <Badge
          variant="outline"
          className={`
            ${sizeClasses[size]}
            bg-green-50 text-green-700 border-green-200
          `}
        >
          <Calendar className={`${iconSizes[size]} mr-1 flex-shrink-0`} />
          MFD: {formatMfd(mfd)}
        </Badge>
      )}
    </div>
  );
}

// Lot Indicator สำหรับแสดงใน list หรือ grid
interface LotIndicatorProps {
  lot: string;
  count?: number;
  onClick?: () => void;
  className?: string;
}

export function LotIndicator({ lot, count, onClick, className = "" }: LotIndicatorProps) {
  if (!lot) return null;

  const colors = getLotColor(lot);

  return (
    <div
      className={`
        inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
        ${onClick ? 'cursor-pointer hover:scale-105' : ''}
        transition-all duration-200
        ${className}
      `}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`
      }}
      onClick={onClick}
    >
      <Package className="h-3 w-3" />
      <span className="font-mono">{lot}</span>
      {count !== undefined && (
        <span className="bg-white bg-opacity-70 px-1 rounded text-xs">
          {count}
        </span>
      )}
    </div>
  );
}

// Lot Group สำหรับแสดงรายการ lots
interface LotGroupProps {
  lots: string[];
  onLotClick?: (lot: string) => void;
  maxDisplay?: number;
  className?: string;
}

export function LotGroup({ lots, onLotClick, maxDisplay = 3, className = "" }: LotGroupProps) {
  if (!lots || lots.length === 0) return null;

  const uniqueLots = [...new Set(lots.filter(Boolean))];
  const displayLots = uniqueLots.slice(0, maxDisplay);
  const remainingCount = uniqueLots.length - maxDisplay;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {displayLots.map((lot) => (
        <LotIndicator
          key={lot}
          lot={lot}
          onClick={onLotClick ? () => onLotClick(lot) : undefined}
        />
      ))}

      {remainingCount > 0 && (
        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
          +{remainingCount} อื่นๆ
        </div>
      )}
    </div>
  );
}