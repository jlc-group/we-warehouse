/**
 * StatsCards - แสดงสถิติภาพรวมด้านบน
 */

import { Card, CardContent } from '@/components/ui/card';
import { Package, MapPin, CheckCircle, TrendingUp } from 'lucide-react';

interface StatsCardsProps {
  totalItems: number;
  totalLocations: number;
  completedItems: number;
  totalQuantity: number;
}

export function StatsCards({ totalItems, totalLocations, completedItems, totalQuantity }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card className="bg-white shadow-sm border border-slate-200">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">รายการสินค้า</p>
            <h3 className="text-xl font-bold text-slate-800">{totalItems.toLocaleString()}</h3>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white shadow-sm border border-slate-200">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">ตำแหน่งที่ใช้</p>
            <h3 className="text-xl font-bold text-slate-800">{totalLocations.toLocaleString()}</h3>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white shadow-sm border border-slate-200">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">FG (สินค้าสำเร็จรูป)</p>
            <h3 className="text-xl font-bold text-slate-800">{completedItems.toLocaleString()}</h3>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white shadow-sm border border-slate-200">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">จำนวนชิ้นรวม</p>
            <h3 className="text-xl font-bold text-slate-800">{totalQuantity.toLocaleString()}</h3>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}




