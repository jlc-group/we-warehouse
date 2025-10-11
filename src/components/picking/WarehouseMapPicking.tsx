/**
 * Warehouse Map Picking - แผนที่คลังแบบ Interactive สำหรับ Picking
 * Highlight Locations ที่ต้องหยิบสินค้า
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Package } from 'lucide-react';
import type { PickingRoute } from '@/utils/pickingAlgorithm';

interface WarehouseMapPickingProps {
  pickingRoute: PickingRoute[];
  completedItems: Set<string>;
  onLocationClick?: (location: string) => void;
}

export const WarehouseMapPicking = ({
  pickingRoute,
  completedItems,
  onLocationClick
}: WarehouseMapPickingProps) => {
  // สร้าง Set ของ Locations ที่ต้องหยิบ
  const pickingLocations = useMemo(() => {
    return new Set(pickingRoute.map(route => route.normalizedLocation));
  }, [pickingRoute]);

  // สร้างแผนที่ตำแหน่ง (Simplified Grid)
  const zones = ['A', 'B', 'C', 'D'];
  const positions = [1, 2, 3, 4, 5];
  const levels = [1, 2, 3, 4];

  // คำนวณจำนวน Items ที่แต่ละ Location
  const locationItemCount = useMemo(() => {
    const counts = new Map<string, number>();
    pickingRoute.forEach(route => {
      const key = route.normalizedLocation;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [pickingRoute]);

  // เช็คว่า Location นี้ถูกหยิบครบแล้วหรือยัง
  const isLocationCompleted = (location: string): boolean => {
    const itemsAtLocation = pickingRoute.filter(route => route.normalizedLocation === location);
    return itemsAtLocation.every(route => {
      const key = `${route.productCode}-${route.location}`;
      return completedItems.has(key);
    });
  };

  const renderLocation = (zone: string, position: number, level: number) => {
    const location = `${zone}${position}/${level}`;
    const needsPicking = pickingLocations.has(location);
    const isCompleted = needsPicking && isLocationCompleted(location);
    const itemCount = locationItemCount.get(location) || 0;

    let bgColor = 'bg-gray-100 border-gray-300';
    let textColor = 'text-gray-400';
    let cursor = 'cursor-default';

    if (needsPicking) {
      if (isCompleted) {
        bgColor = 'bg-green-100 border-green-500';
        textColor = 'text-green-700';
      } else {
        bgColor = 'bg-blue-100 border-blue-500 animate-pulse';
        textColor = 'text-blue-700';
        cursor = 'cursor-pointer hover:bg-blue-200';
      }
    }

    return (
      <div
        key={location}
        className={`${bgColor} ${textColor} ${cursor} border-2 rounded p-2 text-center transition-all relative`}
        onClick={() => needsPicking && onLocationClick && onLocationClick(location)}
      >
        <div className="text-xs font-mono font-semibold">{location}</div>
        {needsPicking && (
          <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]" variant={isCompleted ? 'default' : 'destructive'}>
            {itemCount}
          </Badge>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          แผนที่คลัง - ตำแหน่งที่ต้องหยิบ
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Legend */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-100 border-2 border-gray-300 rounded"></div>
              <span className="text-sm">ตำแหน่งว่าง</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-100 border-2 border-blue-500 rounded"></div>
              <span className="text-sm">ต้องหยิบ</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-100 border-2 border-green-500 rounded"></div>
              <span className="text-sm">หยิบแล้ว</span>
            </div>
          </div>

          {/* Warehouse Grid */}
          <div className="space-y-6">
            {zones.map(zone => (
              <div key={zone} className="border rounded-lg p-4">
                <h3 className="font-bold text-lg mb-3">โซน {zone}</h3>
                <div className="grid grid-cols-5 gap-2">
                  {positions.map(position => (
                    <div key={`${zone}-${position}`} className="space-y-1">
                      <p className="text-xs text-center text-gray-600 font-semibold">แถว {position}</p>
                      <div className="space-y-1">
                        {levels.map(level => renderLocation(zone, position, level))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Summary Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-blue-900">ข้อมูลการหยิบ</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">ตำแหน่งทั้งหมด</p>
                <p className="text-xl font-bold text-blue-600">{pickingLocations.size}</p>
              </div>
              <div>
                <p className="text-gray-600">หยิบแล้ว</p>
                <p className="text-xl font-bold text-green-600">
                  {Array.from(pickingLocations).filter(loc => isLocationCompleted(loc)).length}
                </p>
              </div>
              <div>
                <p className="text-gray-600">คงเหลือ</p>
                <p className="text-xl font-bold text-orange-600">
                  {Array.from(pickingLocations).filter(loc => !isLocationCompleted(loc)).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
