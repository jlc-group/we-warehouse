import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  ShoppingCart,
  ChevronUp,
  ChevronDown,
  X,
  Package,
  MapPin,
  Trash2,
  Calculator
} from 'lucide-react';
import type { InventoryItem } from '@/hooks/useInventory';
import { formatUnitsDisplay } from '@/utils/unitCalculations';

interface CartItem {
  item: InventoryItem;
  quantities: {
    level1: number;
    level2: number;
    level3: number;
  };
  unitPrice?: number;
}

interface FloatingMiniCartProps {
  items: CartItem[];
  onItemRemove: (itemId: string) => void;
  onItemUpdate?: (itemId: string, quantities: {
    level1: number;
    level2: number;
    level3: number;
  }) => void;
  onPriceUpdate?: (itemId: string, price: number) => void;
  onClearAll?: () => void;
  onCheckout?: () => void;
  isVisible?: boolean;
  className?: string;
}

export function FloatingMiniCart({
  items,
  onItemRemove,
  onItemUpdate,
  onPriceUpdate,
  onClearAll,
  onCheckout,
  isVisible = true,
  className = ''
}: FloatingMiniCartProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isVisible || items.length === 0) return null;

  // Calculate totals
  const totalItems = items.reduce((sum, cartItem) => {
    return sum + cartItem.quantities.level1 + cartItem.quantities.level2 + cartItem.quantities.level3;
  }, 0);

  const totalValue = items.reduce((sum, cartItem) => {
    const { level1, level2, level3 } = cartItem.quantities;
    const { item, unitPrice = 0 } = cartItem;

    // Calculate total pieces for pricing
    const level1Rate = item.unit_level1_rate || 1;
    const level2Rate = item.unit_level2_rate || 1;

    const totalPieces = (level1 * level1Rate * level2Rate) + (level2 * level2Rate) + level3;
    return sum + (totalPieces * unitPrice);
  }, 0);

  const getTotalQuantityForItem = (cartItem: CartItem) => {
    return cartItem.quantities.level1 + cartItem.quantities.level2 + cartItem.quantities.level3;
  };

  const getFormattedQuantity = (cartItem: CartItem) => {
    const { quantities, item } = cartItem;
    const parts: string[] = [];

    if (quantities.level1 > 0) {
      parts.push(`${quantities.level1} ${item.unit_level1_name || 'ลัง'}`);
    }
    if (quantities.level2 > 0) {
      parts.push(`${quantities.level2} ${item.unit_level2_name || 'กล่อง'}`);
    }
    if (quantities.level3 > 0) {
      parts.push(`${quantities.level3} ${item.unit_level3_name || 'ชิ้น'}`);
    }

    return parts.join(' • ');
  };

  if (isMinimized) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <Button
          onClick={() => setIsMinimized(false)}
          className="h-12 w-12 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg"
        >
          <div className="relative">
            <ShoppingCart className="h-5 w-5 text-white" />
            <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs min-w-[1.25rem] h-5 flex items-center justify-center">
              {items.length}
            </Badge>
          </div>
        </Button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] ${className}`}>
      <Card className="shadow-xl border-2">
        {/* Header */}
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-4 w-4" />
              รายการที่เลือก
              <Badge variant="default" className="ml-2">
                {items.length}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8 w-8 p-0"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(true)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Summary */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-gray-600">
                {totalItems} หน่วย
              </span>
              <span className="flex items-center gap-1 text-blue-600">
                <Calculator className="h-3 w-3" />
                ฿{totalValue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </CardHeader>

        {/* Expanded Content */}
        {isExpanded && (
          <CardContent className="pt-0">
            {/* Items List */}
            <ScrollArea className="max-h-64 mb-4">
              <div className="space-y-3">
                {items.map((cartItem) => (
                  <div
                    key={cartItem.item.id}
                    className="flex items-start gap-3 p-3 border rounded-lg bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate mb-1">
                        {cartItem.item.product_name}
                      </div>
                      <div className="text-xs text-gray-500 mb-1">
                        รหัส: {cartItem.item.sku}
                      </div>
                      <div className="flex items-center gap-1 mb-2">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-600">
                          {cartItem.item.location}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-blue-600">
                        {getFormattedQuantity(cartItem)}
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onItemRemove(cartItem.item.id)}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Separator className="mb-4" />

            {/* Actions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>รวมทั้งสิ้น:</span>
                <span>฿{totalValue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex gap-2">
                {onClearAll && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onClearAll}
                    className="flex-1"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    ล้างทั้งหมด
                  </Button>
                )}
                {onCheckout && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={onCheckout}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    สั่งซื้อ
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        )}

        {/* Collapsed Content */}
        {!isExpanded && (
          <CardContent className="pt-0 pb-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {totalItems} รายการ
              </div>
              {onCheckout && (
                <Button
                  type="button"
                  size="sm"
                  onClick={onCheckout}
                  className="bg-green-600 hover:bg-green-700"
                >
                  สั่งซื้อ
                </Button>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

// Simplified version for inline display
export function InlineMiniCart({
  items,
  onItemRemove,
  className = ''
}: {
  items: CartItem[];
  onItemRemove: (itemId: string) => void;
  className?: string;
}) {
  if (items.length === 0) return null;

  const totalItems = items.reduce((sum, cartItem) => {
    return sum + cartItem.quantities.level1 + cartItem.quantities.level2 + cartItem.quantities.level3;
  }, 0);

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">
            รายการที่เลือก ({items.length})
          </span>
        </div>
        <Badge variant="secondary">
          {totalItems} หน่วย
        </Badge>
      </div>

      <div className="space-y-2">
        {items.slice(0, 3).map((cartItem) => (
          <div
            key={cartItem.item.id}
            className="flex items-center justify-between text-xs"
          >
            <div className="flex-1 min-w-0">
              <div className="truncate font-medium">{cartItem.item.product_name}</div>
              <div className="text-gray-500">
                {cartItem.quantities.level1 + cartItem.quantities.level2 + cartItem.quantities.level3} หน่วย
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onItemRemove(cartItem.item.id)}
              className="h-5 w-5 p-0 text-red-500 hover:text-red-600"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}

        {items.length > 3 && (
          <div className="text-xs text-gray-500 text-center">
            และอีก {items.length - 3} รายการ...
          </div>
        )}
      </div>
    </div>
  );
}