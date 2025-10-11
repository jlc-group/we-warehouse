/**
 * Picking Plan Modal - แสดงแผนการหยิบสินค้าจาก Packing List
 * เชื่อมโยงกับ inventory_items เพื่อบอก Location ที่ต้องหยิบ
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Package,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Printer,
  Download,
  Navigation,
  CheckSquare,
  Square
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  generateBulkPickingPlans,
  type ProductNeed,
  type InventoryLocation,
  type PickingPlan,
  type PickingRoute
} from '@/utils/pickingAlgorithm';

interface PickingPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  productSummary: Array<{
    productCode: string;
    productName: string;
    totalQuantity: number;
    unitCode: string;
  }>;
  selectedDate: string;
}

export const PickingPlanModal = ({
  isOpen,
  onClose,
  productSummary,
  selectedDate
}: PickingPlanModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [pickingPlans, setPickingPlans] = useState<PickingPlan[]>([]);
  const [pickingRoute, setPickingRoute] = useState<PickingRoute[]>([]);
  const [summary, setSummary] = useState({
    totalProducts: 0,
    sufficientProducts: 0,
    insufficientProducts: 0,
    notFoundProducts: 0,
    totalLocations: 0
  });
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());

  // โหลดข้อมูล Inventory Locations
  useEffect(() => {
    if (isOpen && productSummary.length > 0) {
      loadPickingPlan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, productSummary]);

  const loadPickingPlan = async () => {
    setLoading(true);
    try {
      // เตรียม Product Needs
      const productNeeds: ProductNeed[] = productSummary.map(product => ({
        productCode: product.productCode,
        productName: product.productName,
        quantity: product.totalQuantity,
        unitCode: product.unitCode
      }));

      // ดึงข้อมูล Inventory จาก Supabase (รวม LOT และ MFD ที่มีอยู่แล้ว)
      const { data: inventoryData, error } = await supabase
        .from('inventory_items')
        .select('id, sku, product_name, location, unit_level1_quantity, unit_level1_rate, unit_level2_quantity, unit_level2_rate, unit_level3_quantity, unit_level1_name, unit_level2_name, unit_level3_name, warehouse_id, lot, mfd, created_at')
        .or('unit_level1_quantity.gt.0,unit_level2_quantity.gt.0,unit_level3_quantity.gt.0') // เฉพาะที่มีของอยู่
        .order('created_at', { ascending: true }); // เรียงตาม FIFO (วันที่สร้างเก่าก่อน)

      if (error) {
        console.error('Error fetching inventory:', error);
        toast({
          title: '❌ เกิดข้อผิดพลาด',
          description: 'ไม่สามารถโหลดข้อมูล Inventory',
          variant: 'destructive'
        });
        return;
      }

      const inventoryLocations: InventoryLocation[] = (inventoryData || []) as any;

      // สร้าง Picking Plans
      const result = generateBulkPickingPlans(productNeeds, inventoryLocations);

      setPickingPlans(result.pickingPlans);
      setPickingRoute(result.pickingRoute);
      setSummary(result.summary);

      toast({
        title: '✅ สร้างแผนการหยิบสินค้าสำเร็จ',
        description: `พบ ${result.summary.totalLocations} ตำแหน่งที่ต้องหยิบ`
      });

    } catch (error) {
      console.error('Error generating picking plan:', error);
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: 'ไม่สามารถสร้างแผนการหยิบสินค้า',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleItemComplete = (key: string) => {
    const newCompleted = new Set(completedItems);
    if (newCompleted.has(key)) {
      newCompleted.delete(key);
    } else {
      newCompleted.add(key);
    }
    setCompletedItems(newCompleted);
  };

  const getStatusIcon = (status: 'sufficient' | 'insufficient' | 'not_found') => {
    switch (status) {
      case 'sufficient':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'insufficient':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'not_found':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusBadge = (status: 'sufficient' | 'insufficient' | 'not_found') => {
    const variants = {
      sufficient: { label: 'พอเพียง', className: 'bg-green-100 text-green-800' },
      insufficient: { label: 'ไม่พอ', className: 'bg-yellow-100 text-yellow-800' },
      not_found: { label: 'ไม่พบ', className: 'bg-red-100 text-red-800' }
    };
    const variant = variants[status];
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const completionPercentage = useMemo(() => {
    if (pickingRoute.length === 0) return 0;
    return Math.round((completedItems.size / pickingRoute.length) * 100);
  }, [completedItems, pickingRoute]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <MapPin className="h-6 w-6 text-blue-500" />
            แผนการหยิบสินค้า - {selectedDate}
          </DialogTitle>
          <DialogDescription>
            แผนการหยิบสินค้าจาก Packing List พร้อมตำแหน่งในคลัง
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Package className="h-12 w-12 text-gray-400 animate-pulse mx-auto mb-4" />
              <p className="text-gray-600">กำลังสร้างแผนการหยิบสินค้า...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <Package className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{summary.totalProducts}</p>
                    <p className="text-xs text-gray-600">สินค้าทั้งหมด</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600">{summary.sufficientProducts}</p>
                    <p className="text-xs text-gray-600">พอเพียง</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <AlertTriangle className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-yellow-600">{summary.insufficientProducts}</p>
                    <p className="text-xs text-gray-600">ไม่พอ</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <XCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-red-600">{summary.notFoundProducts}</p>
                    <p className="text-xs text-gray-600">ไม่พบ</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <MapPin className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-purple-600">{summary.totalLocations}</p>
                    <p className="text-xs text-gray-600">ตำแหน่งที่ต้องหยิบ</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Progress Bar */}
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">ความคืบหน้า</p>
                    <p className="text-sm font-bold text-blue-600">
                      {completedItems.size} / {pickingRoute.length} ({completionPercentage}%)
                    </p>
                  </div>
                  <Progress value={completionPercentage} className="h-3" />
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="by-product" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="by-product">
                  <Package className="h-4 w-4 mr-2" />
                  ตามสินค้า
                </TabsTrigger>
                <TabsTrigger value="by-route">
                  <Navigation className="h-4 w-4 mr-2" />
                  ตามเส้นทาง
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: By Product */}
              <TabsContent value="by-product" className="space-y-4">
                {pickingPlans.map((plan, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(plan.status)}
                          <span>{plan.productCode} - {plan.productName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(plan.status)}
                          <Badge variant="outline">
                            {plan.totalAvailable} / {plan.totalNeeded}
                          </Badge>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {plan.locations.length > 0 ? (
                        <>
                          <Progress value={plan.percentage} className="h-2 mb-4" />
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[50px]">สถานะ</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>LOT</TableHead>
                                <TableHead>MFD</TableHead>
                                <TableHead className="text-right">มีอยู่</TableHead>
                                <TableHead className="text-right">หยิบ</TableHead>
                                <TableHead className="text-right">คงเหลือ</TableHead>
                                <TableHead>โซน</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {plan.locations.map((location, idx) => {
                                const itemKey = `${plan.productCode}-${location.location}`;
                                const isCompleted = completedItems.has(itemKey);

                                return (
                                  <TableRow key={idx} className={isCompleted ? 'opacity-50 bg-green-50' : ''}>
                                    <TableCell>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleItemComplete(itemKey)}
                                      >
                                        {isCompleted ? (
                                          <CheckSquare className="h-5 w-5 text-green-500" />
                                        ) : (
                                          <Square className="h-5 w-5 text-gray-400" />
                                        )}
                                      </Button>
                                    </TableCell>
                                    <TableCell className="font-mono font-semibold">
                                      {location.location}
                                    </TableCell>
                                    <TableCell>
                                      {location.lot ? (
                                        <Badge variant="outline" className="font-mono text-xs">
                                          {location.lot}
                                        </Badge>
                                      ) : (
                                        <span className="text-gray-400 text-xs">-</span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {location.mfd ? (
                                        <span className="text-xs">
                                          {new Date(location.mfd).toLocaleDateString('th-TH', {
                                            year: '2-digit',
                                            month: '2-digit',
                                            day: '2-digit'
                                          })}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400 text-xs">-</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right">{location.available}</TableCell>
                                    <TableCell className="text-right font-bold text-blue-600">
                                      {location.toPick}
                                    </TableCell>
                                    <TableCell className="text-right">{location.remaining}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline">{location.zone}</Badge>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </>
                      ) : (
                        <div className="text-center py-8 text-red-600">
                          <XCircle className="h-12 w-12 mx-auto mb-2" />
                          <p className="font-semibold">ไม่พบสินค้านี้ในคลัง</p>
                          <p className="text-sm">กรุณาเช็คสต็อกหรือเพิ่มสินค้าเข้าระบบ</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              {/* Tab 2: By Route */}
              <TabsContent value="by-route">
                <Card>
                  <CardHeader>
                    <CardTitle>เส้นทางการหยิบสินค้า ({pickingRoute.length} ตำแหน่ง)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">สถานะ</TableHead>
                          <TableHead className="w-[80px]">ลำดับ</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>สินค้า</TableHead>
                          <TableHead className="text-right">จำนวน</TableHead>
                          <TableHead>โซน</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pickingRoute.map((route) => {
                          const itemKey = `${route.productCode}-${route.location}`;
                          const isCompleted = completedItems.has(itemKey);

                          return (
                            <TableRow key={`${route.sequence}-${route.productCode}`} className={isCompleted ? 'opacity-50 bg-green-50' : ''}>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleItemComplete(itemKey)}
                                >
                                  {isCompleted ? (
                                    <CheckSquare className="h-5 w-5 text-green-500" />
                                  ) : (
                                    <Square className="h-5 w-5 text-gray-400" />
                                  )}
                                </Button>
                              </TableCell>
                              <TableCell className="text-center font-bold">
                                {route.sequence}
                              </TableCell>
                              <TableCell className="font-mono font-semibold">
                                {route.location}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-semibold">{route.productCode}</p>
                                  <p className="text-xs text-gray-600">{route.productName}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-bold text-blue-600">
                                {route.quantity}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{route.zone}</Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                ปิด
              </Button>
              <div className="flex gap-2">
                <Button variant="outline">
                  <Printer className="h-4 w-4 mr-2" />
                  พิมพ์
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  ส่งออก Excel
                </Button>
                {completionPercentage === 100 && (
                  <Button className="bg-green-600 hover:bg-green-700">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    เสร็จสิ้นทั้งหมด
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
