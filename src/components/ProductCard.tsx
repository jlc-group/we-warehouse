import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  MapPin,
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useState } from 'react';
import type { InventoryItem } from '@/hooks/useInventory';
import { formatUnitsDisplay } from '@/utils/unitCalculations';

interface ProductCardProps {
  item: InventoryItem;
  selectedQuantity?: {
    level1: number;
    level2: number;
    level3: number;
  };
  onQuantityChange: (item: InventoryItem, quantity: {
    level1: number;
    level2: number;
    level3: number;
  }) => void;
  locationColor?: string;
  showLocation?: boolean;
}

export function ProductCard({
  item,
  selectedQuantity = { level1: 0, level2: 0, level3: 0 },
  onQuantityChange,
  locationColor,
  showLocation = true
}: ProductCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate total selected quantity for this item
  const totalSelected = selectedQuantity.level1 + selectedQuantity.level2 + selectedQuantity.level3;
  const isSelected = totalSelected > 0;

  // Get stock level and color
  const getStockLevel = () => {
    const total = (item.unit_level1_quantity || 0) +
                  (item.unit_level2_quantity || 0) +
                  (item.unit_level3_quantity || 0);

    if (total === 0) return { level: 'empty', color: 'bg-red-100 text-red-800 border-red-200' };
    if (total < 10) return { level: 'low', color: 'bg-orange-100 text-orange-800 border-orange-200' };
    if (total < 50) return { level: 'medium', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    return { level: 'high', color: 'bg-green-100 text-green-800 border-green-200' };
  };

  const getStockIcon = (level: string) => {
    switch (level) {
      case 'empty': return <AlertTriangle className="h-3 w-3" />;
      case 'low': return <AlertCircle className="h-3 w-3" />;
      case 'medium': return <Package className="h-3 w-3" />;
      case 'high': return <CheckCircle className="h-3 w-3" />;
      default: return <Package className="h-3 w-3" />;
    }
  };

  const stockLevel = getStockLevel();

  // Handle quantity changes
  const updateQuantity = (level: 'level1' | 'level2' | 'level3', change: number) => {
    const newQuantity = { ...selectedQuantity };
    const currentValue = newQuantity[level];
    const maxAvailable = level === 'level1' ? (item.unit_level1_quantity || 0) :
                        level === 'level2' ? (item.unit_level2_quantity || 0) :
                        (item.unit_level3_quantity || 0);

    const newValue = Math.max(0, Math.min(maxAvailable, currentValue + change));
    newQuantity[level] = newValue;

    onQuantityChange(item, newQuantity);
  };

  const quickAdd = (level: 'level1' | 'level2' | 'level3') => {
    updateQuantity(level, 1);
  };

  return (
    <Card className={`
      transition-all duration-200 hover:shadow-md cursor-pointer group
      ${isSelected ? 'ring-2 ring-green-500 bg-green-50/50' : 'hover:shadow-lg'}
    `}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate mb-1">
              {item.product_name}
            </div>
            <div className="text-xs text-gray-500 mb-2">
              รหัส: {item.sku}
            </div>

            {/* Location Badge */}
            {showLocation && (
              <div className="flex items-center gap-1 mb-2">
                <MapPin className="h-3 w-3 text-gray-400" />
                <Badge
                  variant="outline"
                  className={`text-xs ${locationColor || 'bg-gray-100'}`}
                >
                  {item.location}
                </Badge>
              </div>
            )}

            {/* Stock Level Indicator */}
            <Badge
              variant="outline"
              className={`text-xs ${stockLevel.color}`}
            >
              <div className="flex items-center gap-1">
                {getStockIcon(stockLevel.level)}
                <span>
                  {stockLevel.level === 'empty' && 'หมด'}
                  {stockLevel.level === 'low' && 'น้อย'}
                  {stockLevel.level === 'medium' && 'ปานกลาง'}
                  {stockLevel.level === 'high' && 'เยอะ'}
                </span>
              </div>
            </Badge>
          </div>

          {/* Selected Indicator */}
          {isSelected && (
            <div className="flex items-center justify-center w-6 h-6 bg-green-500 rounded-full">
              <CheckCircle className="h-4 w-4 text-white" />
            </div>
          )}
        </div>

        {/* Stock Info */}
        <div className="text-xs text-gray-600 mb-3 space-y-1">
          {item.unit_level1_quantity && item.unit_level1_quantity > 0 && (
            <div>• {item.unit_level1_name || 'ลัง'}: {item.unit_level1_quantity}</div>
          )}
          {item.unit_level2_quantity && item.unit_level2_quantity > 0 && (
            <div>• {item.unit_level2_name || 'กล่อง'}: {item.unit_level2_quantity}</div>
          )}
          {item.unit_level3_quantity && item.unit_level3_quantity > 0 && (
            <div>• {item.unit_level3_name || 'ชิ้น'}: {item.unit_level3_quantity}</div>
          )}
        </div>

        {/* Quick Add Buttons */}
        <div className="space-y-2">
          {item.unit_level1_quantity && item.unit_level1_quantity > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">{item.unit_level1_name}</span>
              <div className="flex items-center gap-1">
                {selectedQuantity.level1 > 0 ? (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateQuantity('level1', -1);
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-xs font-medium px-2">
                      {selectedQuantity.level1}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateQuantity('level1', 1);
                      }}
                      className="h-6 w-6 p-0"
                      disabled={selectedQuantity.level1 >= (item.unit_level1_quantity || 0)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      quickAdd('level1');
                    }}
                    className="h-6 text-xs px-2"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    เพิ่ม
                  </Button>
                )}
              </div>
            </div>
          )}

          {item.unit_level2_quantity && item.unit_level2_quantity > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">{item.unit_level2_name}</span>
              <div className="flex items-center gap-1">
                {selectedQuantity.level2 > 0 ? (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateQuantity('level2', -1);
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-xs font-medium px-2">
                      {selectedQuantity.level2}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateQuantity('level2', 1);
                      }}
                      className="h-6 w-6 p-0"
                      disabled={selectedQuantity.level2 >= (item.unit_level2_quantity || 0)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      quickAdd('level2');
                    }}
                    className="h-6 text-xs px-2"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    เพิ่ม
                  </Button>
                )}
              </div>
            </div>
          )}

          {item.unit_level3_quantity && item.unit_level3_quantity > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">{item.unit_level3_name}</span>
              <div className="flex items-center gap-1">
                {selectedQuantity.level3 > 0 ? (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateQuantity('level3', -1);
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-xs font-medium px-2">
                      {selectedQuantity.level3}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateQuantity('level3', 1);
                      }}
                      className="h-6 w-6 p-0"
                      disabled={selectedQuantity.level3 >= (item.unit_level3_quantity || 0)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      quickAdd('level3');
                    }}
                    className="h-6 text-xs px-2"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    เพิ่ม
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Selected Summary */}
        {isSelected && (
          <div className="mt-3 pt-3 border-t bg-green-50 -mx-4 -mb-4 px-4 pb-4">
            <div className="text-xs font-medium text-green-800 mb-1">
              เลือกแล้ว: {totalSelected} หน่วย
            </div>
            <div className="text-xs text-green-700">
              {selectedQuantity.level1 > 0 && `${selectedQuantity.level1} ${item.unit_level1_name || 'ลัง'}`}
              {selectedQuantity.level1 > 0 && (selectedQuantity.level2 > 0 || selectedQuantity.level3 > 0) && ' • '}
              {selectedQuantity.level2 > 0 && `${selectedQuantity.level2} ${item.unit_level2_name || 'กล่อง'}`}
              {selectedQuantity.level2 > 0 && selectedQuantity.level3 > 0 && ' • '}
              {selectedQuantity.level3 > 0 && `${selectedQuantity.level3} ${item.unit_level3_name || 'ชิ้น'}`}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}