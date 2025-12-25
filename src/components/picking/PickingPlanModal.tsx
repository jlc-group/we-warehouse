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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
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
  Square,
  Truck,
  PackageCheck,
  RefreshCw,
  Clock,
  ArrowDown,
  ArrowUp
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
  const [confirming, setConfirming] = useState(false);
  const [validating, setValidating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
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
  
  // State สำหรับ Stock Change Warning
  const [stockChanges, setStockChanges] = useState<Array<{
    location: string;
    productCode: string;
    plannedStock: number;
    currentStock: number;
    difference: number;
    canProceed: boolean;
  }>>([]);
  const [planCreatedAt, setPlanCreatedAt] = useState<Date | null>(null);
  
  // State สำหรับ Edit จำนวนที่หยิบ (key: productCode-location, value: quantity)
  const [editedQuantities, setEditedQuantities] = useState<Map<string, number>>(new Map());

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
      setPlanCreatedAt(new Date()); // บันทึกเวลาที่สร้างแผน
      setStockChanges([]); // Reset stock changes
      setEditedQuantities(new Map()); // Reset edited quantities

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

  /**
   * แก้ไขจำนวนที่ต้องการหยิบสำหรับ Location นั้นๆ
   */
  const handleQuantityEdit = (key: string, value: number, maxValue: number) => {
    const newMap = new Map(editedQuantities);
    // จำกัดค่าไม่ให้เกิน maxValue และไม่ต่ำกว่า 0
    const clampedValue = Math.min(Math.max(0, value), maxValue);
    newMap.set(key, clampedValue);
    setEditedQuantities(newMap);
  };

  /**
   * ดึงจำนวนที่จะหยิบจริง (ใช้ edited value ถ้ามี)
   */
  const getActualPickQuantity = (key: string, originalToPick: number): number => {
    if (editedQuantities.has(key)) {
      return editedQuantities.get(key) || 0;
    }
    return originalToPick;
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

  // คำนวณเวลาที่ผ่านไปตั้งแต่สร้างแผน
  const planAgeMinutes = useMemo(() => {
    if (!planCreatedAt) return 0;
    return Math.floor((new Date().getTime() - planCreatedAt.getTime()) / 60000);
  }, [planCreatedAt]);

  /**
   * 🔍 ตรวจสอบ Stock ล่าสุดก่อนยืนยัน (Real-time Check)
   * - ดึงข้อมูล Stock ปัจจุบันจาก Database
   * - เปรียบเทียบกับแผนที่สร้างไว้
   * - แจ้งเตือนถ้ามีการเปลี่ยนแปลง
   */
  const validateStockBeforeConfirm = async (): Promise<boolean> => {
    setValidating(true);
    const changes: typeof stockChanges = [];
    
    try {
      // ตรวจสอบว่าแผนหมดอายุหรือไม่ (เกิน 30 นาที)
      if (planAgeMinutes > 30) {
        toast({
          title: '⏰ แผนหมดอายุแล้ว',
          description: `แผนนี้สร้างมานานกว่า ${planAgeMinutes} นาที กรุณารีเฟรชแผนใหม่`,
          variant: 'destructive'
        });
        return false;
      }

      // วนลูปตรวจสอบทุก Location ที่ต้องหยิบ
      for (const plan of pickingPlans) {
        if (plan.status === 'not_found') continue;

        for (const location of plan.locations) {
          if (location.toPick <= 0) continue;

          // ดึง Stock ปัจจุบันจาก Database
          const { data: currentItem, error } = await supabase
            .from('inventory_items')
            .select('unit_level3_quantity')
            .eq('id', location.inventoryId)
            .single();

          if (error || !currentItem) {
            changes.push({
              location: location.location,
              productCode: plan.productCode,
              plannedStock: location.available,
              currentStock: 0,
              difference: -location.available,
              canProceed: false
            });
            continue;
          }

          const currentStock = currentItem.unit_level3_quantity || 0;
          const plannedStock = location.available;
          const difference = currentStock - plannedStock;

          // ถ้า Stock เปลี่ยนแปลง
          if (difference !== 0) {
            const canProceed = currentStock >= location.toPick; // ยังพอหยิบได้ไหม
            changes.push({
              location: location.location,
              productCode: plan.productCode,
              plannedStock,
              currentStock,
              difference,
              canProceed
            });
          }
        }
      }

      setStockChanges(changes);

      // ถ้าไม่มีการเปลี่ยนแปลง → ผ่าน
      if (changes.length === 0) {
        console.log('✅ Stock validation passed - no changes detected');
        return true;
      }

      // ถ้ามีการเปลี่ยนแปลง → แสดง Warning Dialog
      console.log(`⚠️ Stock changes detected: ${changes.length} locations`);
      setShowWarningDialog(true);
      return false; // จะดำเนินการต่อจาก Warning Dialog

    } catch (error) {
      console.error('Error validating stock:', error);
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: 'ไม่สามารถตรวจสอบ Stock ได้',
        variant: 'destructive'
      });
      return false;
    } finally {
      setValidating(false);
    }
  };

  /**
   * จัดการเมื่อกดปุ่ม "ยืนยันและหัก Stock"
   */
  const handleConfirmClick = async () => {
    const isValid = await validateStockBeforeConfirm();
    if (isValid) {
      setShowConfirmDialog(true);
    }
  };

  /**
   * ดำเนินการต่อแม้ว่า Stock เปลี่ยนแปลง
   */
  const proceedDespiteChanges = () => {
    setShowWarningDialog(false);
    setShowConfirmDialog(true);
  };

  /**
   * ยืนยันการ Picking และหัก Stock จริง
   * - หักเฉพาะ Location ที่ tick (☑️) แล้วเท่านั้น
   * - อัปเดต unit_level3_quantity ใน inventory_items
   * - บันทึกประวัติการ Picking
   */
  const confirmPicking = async () => {
    if (pickingPlans.length === 0) return;
    if (completedItems.size === 0) {
      toast({
        title: '⚠️ กรุณาเลือกรายการที่หยิบแล้ว',
        description: 'ต้อง tick (☑️) อย่างน้อย 1 รายการก่อนยืนยัน',
        variant: 'destructive'
      });
      return;
    }

    setConfirming(true);
    try {
      let totalDeducted = 0;
      let deductionErrors: string[] = [];
      let itemsProcessed = 0;

      // วนลูปแต่ละ Picking Plan
      for (const plan of pickingPlans) {
        if (plan.status === 'not_found') continue;

        // วนลูปแต่ละ Location ที่ต้องหยิบ
        for (const location of plan.locations) {
          if (location.toPick <= 0) continue;

          // ✅ ตรวจสอบว่า Location นี้ถูก tick แล้วหรือยัง
          const itemKey = `${plan.productCode}-${location.location}`;
          if (!completedItems.has(itemKey)) {
            console.log(`⏭️ Skipping ${itemKey} - not ticked`);
            continue; // ข้ามถ้ายังไม่ tick
          }

          // ✅ ดึงจำนวนที่จะหยิบจริง (อาจถูก edit แล้ว)
          const actualPickQty = getActualPickQuantity(itemKey, location.toPick);
          if (actualPickQty <= 0) {
            console.log(`⏭️ Skipping ${itemKey} - quantity is 0`);
            continue; // ข้ามถ้าจำนวน = 0
          }

          // ดึงข้อมูล inventory item ปัจจุบัน
          const { data: currentItem, error: fetchError } = await supabase
            .from('inventory_items')
            .select('id, unit_level3_quantity, unit_level2_quantity, unit_level1_quantity')
            .eq('id', location.inventoryId)
            .single();

          if (fetchError || !currentItem) {
            deductionErrors.push(`ไม่พบ inventory: ${location.location}`);
            continue;
          }

          // คำนวณจำนวนที่ต้องหัก (ใช้จำนวนที่ edit แล้ว)
          let remainingToDeduct = actualPickQty;
          let newLevel3Qty = currentItem.unit_level3_quantity || 0;

          // หักจาก level 3 (base unit)
          if (newLevel3Qty >= remainingToDeduct) {
            newLevel3Qty -= remainingToDeduct;
            remainingToDeduct = 0;
          } else {
            remainingToDeduct -= newLevel3Qty;
            newLevel3Qty = 0;
          }

          // อัปเดต inventory
          const { error: updateError } = await supabase
            .from('inventory_items')
            .update({
              unit_level3_quantity: newLevel3Qty,
              updated_at: new Date().toISOString()
            })
            .eq('id', location.inventoryId);

          if (updateError) {
            deductionErrors.push(`อัปเดตไม่สำเร็จ: ${location.location}`);
            continue;
          }

          totalDeducted += actualPickQty;
          itemsProcessed++;
          console.log(`✅ Deducted ${actualPickQty} from ${location.location} (ID: ${location.inventoryId})`);
        }
      }

      // บันทึกประวัติการ Picking (ถ้ามี table)
      try {
        await supabase
          .from('picking_history')
          .insert({
            picking_date: selectedDate,
            total_items: pickingRoute.length,
            total_quantity: totalDeducted,
            status: 'completed',
            picking_plans: JSON.stringify(pickingPlans.map(p => ({
              productCode: p.productCode,
              baseSKU: p.baseSKU,
              multiplier: p.multiplier,
              totalNeeded: p.totalNeeded,
              totalAvailable: p.totalAvailable,
              locations: p.locations.map(l => ({
                location: l.location,
                toPick: l.toPick
              }))
            }))),
            created_at: new Date().toISOString()
          });
      } catch (historyError) {
        console.log('Note: picking_history table may not exist yet');
      }

      // แสดงผลลัพธ์
      if (deductionErrors.length > 0) {
        toast({
          title: '⚠️ หักสต็อกบางส่วนไม่สำเร็จ',
          description: `หักสำเร็จ ${totalDeducted} ชิ้น, ไม่สำเร็จ ${deductionErrors.length} รายการ`,
          variant: 'destructive'
        });
      } else {
        toast({
          title: '✅ ยืนยันการจัดสินค้าสำเร็จ!',
          description: `หักสต็อกแล้ว ${totalDeducted.toLocaleString()} ชิ้น จาก ${pickingRoute.length} ตำแหน่ง`,
        });

        // ปิด modal และ reset state
        setShowConfirmDialog(false);
        onClose();
        setPickingPlans([]);
        setPickingRoute([]);
        setCompletedItems(new Set());
      }

    } catch (error) {
      console.error('Error confirming picking:', error);
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: error instanceof Error ? error.message : 'ไม่สามารถยืนยันการจัดสินค้าได้',
        variant: 'destructive'
      });
    } finally {
      setConfirming(false);
    }
  };

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
                          <div>
                            <span>{plan.productCode} - {plan.productName}</span>
                            {/* แสดง Multiplier ถ้ามี */}
                            {plan.multiplier > 1 && (
                              <div className="text-sm font-normal text-orange-600 mt-1">
                                📦 แพ็ค {plan.multiplier} ชิ้น/หน่วย → ค้นหา: <span className="font-mono font-semibold">{plan.baseSKU}</span>
                                <span className="text-gray-500 ml-2">
                                  (ต้องการ {plan.originalQuantity?.toLocaleString()} × {plan.multiplier} = {plan.totalNeeded?.toLocaleString()} ชิ้น)
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(plan.status)}
                          <Badge variant="outline">
                            {plan.totalAvailable?.toLocaleString()} / {plan.totalNeeded?.toLocaleString()}
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
                                    <TableCell className="text-right">{location.available.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">
                                      <Input
                                        type="number"
                                        min={0}
                                        max={location.available}
                                        value={getActualPickQuantity(itemKey, location.toPick)}
                                        onChange={(e) => handleQuantityEdit(itemKey, parseInt(e.target.value) || 0, location.available)}
                                        className="w-24 text-right font-bold text-blue-600"
                                      />
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {(location.available - getActualPickQuantity(itemKey, location.toPick)).toLocaleString()}
                                    </TableCell>
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
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  min={0}
                                  max={route.quantity}
                                  value={getActualPickQuantity(itemKey, route.quantity)}
                                  onChange={(e) => handleQuantityEdit(itemKey, parseInt(e.target.value) || 0, route.quantity)}
                                  className="w-24 text-right font-bold text-blue-600"
                                />
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
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={onClose}>
                  ปิด
                </Button>
                {/* ปุ่มเลือกทั้งหมด */}
                <Button 
                  variant="outline"
                  onClick={() => {
                    const allKeys = new Set<string>();
                    pickingPlans.forEach(plan => {
                      plan.locations.forEach(loc => {
                        allKeys.add(`${plan.productCode}-${loc.location}`);
                      });
                    });
                    setCompletedItems(allKeys);
                    toast({
                      title: '✅ เลือกทั้งหมดแล้ว',
                      description: `เลือก ${allKeys.size} รายการ`
                    });
                  }}
                  disabled={pickingRoute.length === 0}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  เลือกทั้งหมด
                </Button>
                {/* ปุ่มยกเลิกการเลือก */}
                {completedItems.size > 0 && (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setCompletedItems(new Set());
                      toast({
                        title: 'ยกเลิกการเลือกแล้ว',
                      });
                    }}
                  >
                    <Square className="h-4 w-4 mr-2" />
                    ยกเลิกการเลือก
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline">
                  <Printer className="h-4 w-4 mr-2" />
                  พิมพ์
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  ส่งออก Excel
                </Button>
                
                {/* ปุ่มยืนยันและหัก Stock - หักเฉพาะที่ tick แล้ว */}
                <Button 
                  onClick={handleConfirmClick}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  disabled={completedItems.size === 0 || validating}
                >
                  {validating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      กำลังตรวจสอบ Stock...
                    </>
                  ) : (
                    <>
                      <PackageCheck className="h-4 w-4 mr-2" />
                      ยืนยันและหัก Stock ({completedItems.size} รายการที่เลือก)
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Stock Change Warning Dialog */}
        <AlertDialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-yellow-600">
                <AlertTriangle className="h-5 w-5" />
                ⚠️ Stock มีการเปลี่ยนแปลง!
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    พบว่า Stock มีการเปลี่ยนแปลงตั้งแต่คุณสร้างแผน ({planAgeMinutes} นาทีที่แล้ว)
                  </p>
                  
                  {/* Plan Age Warning */}
                  {planAgeMinutes > 15 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-500" />
                      <span className="text-sm text-orange-800">
                        แผนนี้สร้างมานาน {planAgeMinutes} นาที แนะนำให้รีเฟรชแผนใหม่
                      </span>
                    </div>
                  )}

                  {/* Stock Changes Table */}
                  <div className="max-h-60 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Location</TableHead>
                          <TableHead>สินค้า</TableHead>
                          <TableHead className="text-right">แผน</TableHead>
                          <TableHead className="text-right">ปัจจุบัน</TableHead>
                          <TableHead className="text-right">เปลี่ยนแปลง</TableHead>
                          <TableHead className="text-center">สถานะ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stockChanges.map((change, idx) => (
                          <TableRow key={idx} className={change.canProceed ? '' : 'bg-red-50'}>
                            <TableCell className="font-mono font-semibold">
                              {change.location}
                            </TableCell>
                            <TableCell className="text-sm">
                              {change.productCode}
                            </TableCell>
                            <TableCell className="text-right">
                              {change.plannedStock.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {change.currentStock.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`flex items-center justify-end gap-1 ${
                                change.difference > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {change.difference > 0 ? (
                                  <ArrowUp className="h-3 w-3" />
                                ) : (
                                  <ArrowDown className="h-3 w-3" />
                                )}
                                {Math.abs(change.difference).toLocaleString()}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              {change.canProceed ? (
                                <Badge className="bg-green-100 text-green-800">หยิบได้</Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-800">ไม่พอ</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Summary */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between text-sm">
                      <span>รายการที่ยังหยิบได้:</span>
                      <span className="font-semibold text-green-600">
                        {stockChanges.filter(c => c.canProceed).length} / {stockChanges.length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>รายการที่ Stock ไม่พอ:</span>
                      <span className="font-semibold text-red-600">
                        {stockChanges.filter(c => !c.canProceed).length}
                      </span>
                    </div>
                  </div>

                  {/* Action Recommendation */}
                  {stockChanges.some(c => !c.canProceed) ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-800">
                        ❌ <strong>แนะนำ:</strong> มีบาง Location ที่ Stock ไม่เพียงพอแล้ว กรุณารีเฟรชแผนใหม่
                      </p>
                    </div>
                  ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        ℹ️ Stock เปลี่ยนแปลงแต่ยังเพียงพอสำหรับการหยิบทั้งหมด คุณสามารถดำเนินการต่อได้
                      </p>
                    </div>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowWarningDialog(false);
                  loadPickingPlan(); // รีเฟรชแผน
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                รีเฟรชแผนใหม่
              </Button>
              <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
              {stockChanges.every(c => c.canProceed) && (
                <AlertDialogAction
                  onClick={proceedDespiteChanges}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  ดำเนินการต่อ
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirm Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-green-600" />
                ยืนยันการจัดสินค้าและหัก Stock
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <p>คุณกำลังจะยืนยันการจัดสินค้าและหัก Stock ออกจากคลัง</p>
                  
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span>📅 วันที่:</span>
                      <span className="font-semibold">{selectedDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>☑️ รายการที่เลือก (tick):</span>
                      <span className="font-semibold text-blue-600">{completedItems.size} รายการ</span>
                    </div>
                    <div className="flex justify-between text-gray-500 text-sm">
                      <span>📍 ตำแหน่งทั้งหมด:</span>
                      <span>{summary.totalLocations} ตำแหน่ง</span>
                    </div>
                  </div>

                  {completedItems.size < pickingRoute.length && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        ℹ️ <strong>หมายเหตุ:</strong> คุณเลือกเพียง {completedItems.size} จาก {pickingRoute.length} รายการ 
                        ระบบจะหัก Stock เฉพาะรายการที่เลือกเท่านั้น
                      </p>
                    </div>
                  )}
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      ⚠️ <strong>คำเตือน:</strong> หลังจากยืนยันแล้ว Stock จะถูกหักทันที และไม่สามารถย้อนกลับได้
                    </p>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={confirming}>ยกเลิก</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmPicking}
                disabled={confirming}
                className="bg-green-600 hover:bg-green-700"
              >
                {confirming ? (
                  <>
                    <Package className="h-4 w-4 mr-2 animate-pulse" />
                    กำลังหัก Stock...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    ยืนยันและหัก Stock
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};
