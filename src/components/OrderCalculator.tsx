
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calculator, Percent, Receipt } from 'lucide-react';

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity_cartons: number;
  quantity_boxes: number;
  quantity_pieces: number;
  total_pieces: number;
  unit_price: number;
  line_total: number;
}

interface OrderCalculatorProps {
  orderItems: OrderItem[];
  className?: string;
  onTotalChange?: (totals: OrderTotals) => void;
}

export interface OrderTotals {
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  taxAmount: number;
  taxPercent: number;
  total: number;
  totalItems: number;
}

export const OrderCalculator: FC<OrderCalculatorProps> = ({
  orderItems,
  className,
  onTotalChange,
}) => {
  // คำนวณยอดรวมจากรายการสินค้า
  const subtotal = orderItems.reduce((sum, item) => sum + item.line_total, 0);

  // คำนวณจำนวนรายการทั้งหมด
  const totalItems = orderItems.reduce((sum, item) => sum + item.total_pieces, 0);

  // ตั้งค่าส่วนลดและภาษี (สำหรับตอนนี้ใช้ค่าคงที่)
  const discountPercent = 0; // 0%
  const taxPercent = 7; // 7% VAT

  const discountAmount = (subtotal * discountPercent) / 100;
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = (afterDiscount * taxPercent) / 100;
  const total = afterDiscount + taxAmount;

  const totals: OrderTotals = {
    subtotal,
    discountAmount,
    discountPercent,
    taxAmount,
    taxPercent,
    total,
    totalItems,
  };

  // เรียก callback เมื่อยอดเปลี่ยน
  useEffect(() => {
    onTotalChange?.(totals);
  }, [subtotal, discountAmount, taxAmount, total, totalItems, onTotalChange]);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5" />
          สรุปยอดสั่งซื้อ
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* รายการสินค้า */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">จำนวนรายการ:</span>
            <Badge variant="secondary">
              {orderItems.length} รายการ ({totalItems.toLocaleString()} ชิ้น)
            </Badge>
          </div>
        </div>

        {/* การคำนวณราคา */}
        <div className="space-y-3 border-t pt-3">
          {/* ยอดรวมก่อนส่วนลด */}
          <div className="flex items-center justify-between">
            <span className="text-sm">ยอดรวม:</span>
            <span className="font-medium">
              ฿{subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* ส่วนลด */}
          {discountPercent > 0 && (
            <div className="flex items-center justify-between text-green-600">
              <span className="text-sm flex items-center gap-1">
                <Percent className="h-3 w-3" />
                ส่วนลด ({discountPercent}%):
              </span>
              <span className="font-medium">
                -฿{discountAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* ยอดหลังส่วนลด */}
          {discountPercent > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm">ยอดหลังส่วนลด:</span>
              <span className="font-medium">
                ฿{afterDiscount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* ภาษี */}
          <div className="flex items-center justify-between text-orange-600">
            <span className="text-sm flex items-center gap-1">
              <Receipt className="h-3 w-3" />
              ภาษีมูลค่าเพิ่ม ({taxPercent}%):
            </span>
            <span className="font-medium">
              ฿{taxAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* ยอดรวมสุทธิ */}
          <div className="flex items-center justify-between text-lg font-bold border-t pt-3">
            <span>ยอดรวมสุทธิ:</span>
            <span className="text-primary">
              ฿{total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* ข้อมูลเพิ่มเติม */}
        {orderItems.length > 0 && (
          <div className="bg-muted/50 p-3 rounded-lg space-y-2">
            <p className="text-xs text-muted-foreground font-medium">รายละเอียดการคำนวณ:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">ราคาเฉลี่ย/ชิ้น:</span>
                <span className="ml-1 font-medium">
                  ฿{totalItems > 0 ? (subtotal / totalItems).toFixed(2) : '0.00'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">ราคาเฉลี่ย/รายการ:</span>
                <span className="ml-1 font-medium">
                  ฿{orderItems.length > 0 ? (subtotal / orderItems.length).toFixed(2) : '0.00'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ข้อความเมื่อไม่มีรายการ */}
        {orderItems.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Calculator className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">ยังไม่มีรายการสินค้า</p>
            <p className="text-xs">เพิ่มสินค้าเพื่อดูการคำนวณ</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderCalculator;