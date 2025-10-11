import { Badge } from '@/components/ui/badge';
import { Hash, Package, Info, Copy, Check } from 'lucide-react';
import { MouseEvent, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface SKUDisplayProps {
  sku: string;
  productName?: string;
  size?: 'sm' | 'md' | 'lg';
  layout?: 'horizontal' | 'vertical' | 'compact';
  showIcon?: boolean;
  showCopy?: boolean;
  clickable?: boolean;
  onClick?: () => void;
  className?: string;
}

// Product name mapping (เหมือนใน ProductInfoCard)
const PRODUCT_MAPPING: Record<string, string> = {
  'A1-40G': 'จุฬาเฮิร์บ บีบี บอดี้โลชั่น 40ก.รุ่นซอง',
  'L13-10G': 'จุฬาเฮิร์บ บลูโรส ไวท์เทนนิ่ง อันเดอร์อาร์มครีม10ก',
  'L8A-6G': 'จุฬาเฮิร์บ วอเตอร์เมลอน อีอี คูชั่น 01 6 ก.รุ่นซอง',
  'L8B-6G': 'จุฬาเฮิร์บ วอเตอร์เมลอน อีอี คูชั่น 02 6 ก.รุ่นซอง',
  'L8A-30G': 'จุฬาเฮิร์บ วอเตอร์เมลอน อีอี คูชั่น 01 30 ก.รุ่นหลอด',
  'L3-40G': 'จุฬาเฮิร์บ ดีดี วอเตอร์เมลอน ซันสกรีน 40ก',
  'L7-6G': 'จุฬาเฮิร์บ เรดออเร้นจ์ กลูต้า เซรั่ม 6ก',
  'L4-40G': 'จุฬาเฮิร์บ ลองแกน เมลาสม่า เซรั่ม 40 ก.รุ่นหลอด',
  'L10-7G': 'จุฬาเฮิร์บ วอเตอร์เมลอน 3D ออร่า ซันการ์ด 7ก',
  'L3-8G': 'จุฬาเฮิร์บ ดีดี วอเตอร์เมลอน ซันสกรีน 8ก',
  'L11-40G': 'จุฬาเฮิร์บ เรด ออเรนจ์ ออร่า ไบรท์ บอดี้ โลชั่น 40ก',
  'L14-40G': 'จุฬาเฮิร์บ วอเตอร์เมลอน ออร่า คลีนซิ่ง วิป โฟม 40ก',
  'L4-8G': 'จุฬาเฮิร์บ ลองแกน เมลาสม่า เซรั่ม 8 ก.รุ่นซอง',
  'TB-L3-40G': 'จุฬาเฮิร์บ ดีดี วอเตอร์เมลอน ซันสกรีน 40ก',
  'TB-L3-8G': 'จุฬาเฮิร์บ ดีดี วอเตอร์เมลอน ซันสกรีน 8ก'
};

// สร้างสีตาม SKU (เหมือนใน ProductInfoCard)
const getSKUColor = (sku: string) => {
  if (!sku) return { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-700' };

  let hash = 0;
  for (let i = 0; i < sku.length; i++) {
    hash = sku.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash % 360);
  const saturation = 65 + (Math.abs(hash >> 8) % 25);
  const lightness = 45 + (Math.abs(hash >> 16) % 20);

  return {
    bg: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    border: `hsl(${hue}, ${saturation + 10}%, ${lightness - 15}%)`,
    text: lightness > 55 ? '#1f2937' : '#ffffff'
  };
};

// Get product name from SKU
const getProductName = (sku: string): string => {
  return PRODUCT_MAPPING[sku] || '';
};

export function SKUDisplay({
  sku,
  productName,
  size = 'md',
  layout = 'horizontal',
  showIcon = true,
  showCopy = false,
  clickable = false,
  onClick,
  className = ""
}: SKUDisplayProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  if (!sku) return null;

  const colors = getSKUColor(sku);
  const mappedProductName = getProductName(sku);
  const displayProductName = productName || mappedProductName;

  const sizeClasses = {
    sm: { sku: 'text-xs px-2 py-1', product: 'text-xs', icon: 'h-3 w-3' },
    md: { sku: 'text-sm px-2.5 py-1', product: 'text-sm', icon: 'h-3.5 w-3.5' },
    lg: { sku: 'text-base px-3 py-1.5', product: 'text-base', icon: 'h-4 w-4' }
  };

  const handleCopy = async (e?: MouseEvent) => {
    if (e) e.stopPropagation();

    try {
      await navigator.clipboard.writeText(sku);
      setCopied(true);
      toast({
        title: "คัดลอกแล้ว",
        description: `SKU: ${sku} ถูกคัดลอกไปยัง clipboard`,
        duration: 2000,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "ไม่สามารถคัดลอกได้",
        description: "เกิดข้อผิดพลาดในการคัดลอก",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  // Compact layout
  if (layout === 'compact') {
    return (
      <div
        className={`
          inline-flex items-center gap-1
          ${clickable ? 'cursor-pointer hover:scale-105' : ''}
          transition-all duration-200
          ${className}
        `}
        onClick={clickable ? onClick : undefined}
      >
        <Badge
          className={`
            ${sizeClasses[size].sku}
            font-mono font-bold
          `}
          style={{
            backgroundColor: colors.bg,
            color: colors.text,
            border: `1px solid ${colors.border}`
          }}
        >
          {showIcon && <Hash className={`${sizeClasses[size].icon} mr-1`} />}
          {sku}
        </Badge>

        {showCopy && (
          <button
            onClick={handleCopy}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="คัดลอก SKU"
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Copy className="h-3 w-3 text-gray-500" />
            )}
          </button>
        )}
      </div>
    );
  }

  // Vertical layout
  if (layout === 'vertical') {
    return (
      <div
        className={`
          space-y-2
          ${clickable ? 'cursor-pointer hover:scale-105' : ''}
          transition-all duration-200
          ${className}
        `}
        onClick={clickable ? onClick : undefined}
      >
        <div className="flex items-center gap-2">
          <Badge
            className={`
              ${sizeClasses[size].sku}
              font-mono font-bold
            `}
            style={{
              backgroundColor: colors.bg,
              color: colors.text,
              border: `1px solid ${colors.border}`
            }}
          >
            {showIcon && <Hash className={`${sizeClasses[size].icon} mr-1`} />}
            {sku}
          </Badge>

          {showCopy && (
            <button
              onClick={handleCopy}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="คัดลอก SKU"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3 text-gray-500" />
              )}
            </button>
          )}
        </div>

        {displayProductName && (
          <div className="flex items-start gap-2">
            <Package className={`${sizeClasses[size].icon} text-gray-500 mt-0.5 flex-shrink-0`} />
            <p className={`${sizeClasses[size].product} text-gray-700 leading-tight`}>
              {displayProductName}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Horizontal layout (default)
  return (
    <div
      className={`
        flex items-center gap-3
        ${clickable ? 'cursor-pointer hover:scale-105' : ''}
        transition-all duration-200
        ${className}
      `}
      onClick={clickable ? onClick : undefined}
    >
      <div className="flex items-center gap-2">
        <Badge
          className={`
            ${sizeClasses[size].sku}
            font-mono font-bold
          `}
          style={{
            backgroundColor: colors.bg,
            color: colors.text,
            border: `1px solid ${colors.border}`
          }}
        >
          {showIcon && <Hash className={`${sizeClasses[size].icon} mr-1`} />}
          {sku}
        </Badge>

        {showCopy && (
          <button
            onClick={handleCopy}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="คัดลอก SKU"
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Copy className="h-3 w-3 text-gray-500" />
            )}
          </button>
        )}
      </div>

      {displayProductName && (
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <Package className={`${sizeClasses[size].icon} text-gray-500 mt-0.5 flex-shrink-0`} />
          <p className={`${sizeClasses[size].product} text-gray-700 leading-tight truncate`}>
            {displayProductName}
          </p>
        </div>
      )}
    </div>
  );
}

// SKU Grid สำหรับแสดงหลาย SKU
interface SKUGridProps {
  skus: string[];
  onSKUClick?: (sku: string) => void;
  maxDisplay?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SKUGrid({ skus, onSKUClick, maxDisplay = 6, size = 'sm', className = "" }: SKUGridProps) {
  if (!skus || skus.length === 0) return null;

  const uniqueSKUs = [...new Set(skus.filter(Boolean))];
  const displaySKUs = uniqueSKUs.slice(0, maxDisplay);
  const remainingCount = uniqueSKUs.length - maxDisplay;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {displaySKUs.map((sku) => (
        <SKUDisplay
          key={sku}
          sku={sku}
          size={size}
          layout="compact"
          clickable={!!onSKUClick}
          onClick={onSKUClick ? () => onSKUClick(sku) : undefined}
        />
      ))}

      {remainingCount > 0 && (
        <Badge variant="outline" className="bg-gray-50 text-gray-600">
          +{remainingCount} อื่นๆ
        </Badge>
      )}
    </div>
  );
}