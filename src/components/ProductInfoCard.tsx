import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, MapPin, Calendar, Hash, Boxes, Package2 } from 'lucide-react';
import type { InventoryItem } from '@/hooks/useInventory';

interface ProductInfoCardProps {
  item: InventoryItem;
  onClick?: () => void;
  showLocation?: boolean;
  compact?: boolean;
  className?: string;
}

// Product name mapping (เหมือนใน EnhancedOverview)
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

// สร้างสีตาม SKU (เหมือนใน EnhancedOverview)
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
  return PRODUCT_MAPPING[sku] || sku;
};

// Helper functions for quantities
const getCartonQty = (item: any) => Number(item.unit_level1_quantity ?? item.carton_quantity_legacy ?? 0) || 0;
const getBoxQty = (item: any) => Number(item.unit_level2_quantity ?? item.box_quantity_legacy ?? 0) || 0;
const getPiecesQty = (item: any) => Number(item.unit_level3_quantity ?? item.pieces_quantity_legacy ?? 0) || 0;

// Calculate total pieces with conversion rates
const calculateTotalPieces = (item: any) => {
  const cartonQty = getCartonQty(item);
  const boxQty = getBoxQty(item);
  const piecesQty = getPiecesQty(item);
  
  // Get conversion rates (default to 1 if not available)
  const cartonRate = Number(item.unit_level1_rate ?? 1) || 1;
  const boxRate = Number(item.unit_level2_rate ?? 1) || 1;
  
  // Convert everything to base pieces
  const totalFromCartons = cartonQty * cartonRate;
  const totalFromBoxes = boxQty * boxRate;
  const totalPieces = totalFromCartons + totalFromBoxes + piecesQty;
  
  return {
    totalPieces,
    breakdown: {
      fromCartons: totalFromCartons,
      fromBoxes: totalFromBoxes,
      fromPieces: piecesQty
    }
  };
};

export function ProductInfoCard({
  item,
  onClick,
  showLocation = true,
  compact = false,
  className = ""
}: ProductInfoCardProps) {
  const colors = getSKUColor(item.sku);
  const productName = getProductName(item.sku);
  const cartonQty = getCartonQty(item);
  const boxQty = getBoxQty(item);
  const piecesQty = getPiecesQty(item);

  // Calculate total with proper conversion
  const totalCalculation = calculateTotalPieces(item);
  const totalQty = cartonQty + boxQty + piecesQty; // For display logic
  const totalPieces = totalCalculation.totalPieces;

  return (
    <Card
      className={`
        ${compact ? 'p-2' : 'p-4'}
        hover:shadow-md transition-all duration-200 cursor-pointer border-l-4
        ${className}
      `}
      style={{ borderLeftColor: colors.border }}
      onClick={onClick}
    >
      <CardContent className={compact ? 'p-2 space-y-2' : 'p-4 space-y-3'}>
        {/* Header with SKU */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-gray-500" />
            <Badge
              className="font-mono text-sm font-bold"
              style={{
                backgroundColor: colors.bg,
                color: colors.text,
                border: `1px solid ${colors.border}`
              }}
            >
              {item.sku}
            </Badge>
          </div>

          {/* Lot Badge */}
          {item.lot && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <Calendar className="h-3 w-3 mr-1" />
              LOT: {item.lot}
            </Badge>
          )}
        </div>

        {/* Product Name */}
        <div className="space-y-1">
          <div className="flex items-start gap-2">
            <Package className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <p className={`
              ${compact ? 'text-sm' : 'text-base'}
              font-medium text-gray-800 leading-tight
            `}>
              {productName !== item.sku ? productName : item.product_name || 'ไม่ระบุชื่อสินค้า'}
            </p>
          </div>

          {productName !== item.sku && item.product_name && item.product_name !== productName && (
            <p className="text-xs text-gray-500 ml-6">
              {item.product_name}
            </p>
          )}
        </div>

        {/* Location */}
        {showLocation && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-500" />
            <span className={`
              ${compact ? 'text-sm' : 'text-base'}
              font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded
            `}>
              {item.location}
            </span>
          </div>
        )}

        {/* Quantities */}
        {totalQty > 0 && (
          <div className="space-y-3 mt-3">
            {/* Individual Quantities */}
            <div className="grid grid-cols-3 gap-2">
              <div className="flex items-center gap-1 bg-blue-50 p-2 rounded text-center">
                <Boxes className="h-3 w-3 text-blue-600" />
                <span className="text-xs font-medium text-blue-700">
                  {cartonQty}
                </span>
                <span className="text-xs text-blue-600">ลัง</span>
              </div>

              <div className="flex items-center gap-1 bg-green-50 p-2 rounded text-center">
                <Package2 className="h-3 w-3 text-green-600" />
                <span className="text-xs font-medium text-green-700">
                  {boxQty}
                </span>
                <span className="text-xs text-green-600">กล่อง</span>
              </div>

              <div className="flex items-center gap-1 bg-purple-50 p-2 rounded text-center">
                <Package className="h-3 w-3 text-purple-600" />
                <span className="text-xs font-medium text-purple-700">
                  {piecesQty}
                </span>
                <span className="text-xs text-purple-600">ชิ้น</span>
              </div>
            </div>

            {/* Total Summary */}
            <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 p-3 rounded-lg">
              <Package className="h-4 w-4 text-orange-600" />
              <div className="text-center">
                <div className="text-sm font-bold text-orange-800">
                  รวมทั้งหมด: {totalPieces.toLocaleString()} ชิ้น
                </div>
                {totalPieces !== (cartonQty + boxQty + piecesQty) && (
                  <div className="text-xs text-orange-600 mt-1">
                    (คำนวณจากอัตราแปลง)
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MFD if available */}
        {item.mfd && (
          <div className="text-xs text-gray-500 mt-2">
            MFD: {new Date(item.mfd).toLocaleDateString('th-TH')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}