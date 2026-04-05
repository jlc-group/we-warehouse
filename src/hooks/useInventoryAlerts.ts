import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDepartmentInventory } from '@/hooks/useDepartmentInventory';
import { useAuth } from '@/contexts/AuthContextSimple';
import { localDb } from '@/integrations/local/client';
import { useToast } from '@/hooks/use-toast';
import type { InventoryItem } from '@/hooks/useDepartmentInventory';

interface AlertSettings {
  lowStockThreshold: number;
  criticalStockThreshold: number;
  outOfStockEnabled: boolean;
  expiryAlertDays: number;
  reorderPointEnabled: boolean;
  emailNotifications: boolean;
}

export interface StockAlert {
  id: string;
  type: 'low_stock' | 'critical_stock' | 'out_of_stock' | 'expiry_warning' | 'reorder_needed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  item: InventoryItem;
  message: string;
  actionRequired: string;
  createdAt: Date;
  acknowledged: boolean;
  currentQuantity: number;
  locationCount?: number;
  threshold?: number;
  daysUntilExpiry?: number;
}

interface ReorderPoint {
  productName: string;
  currentStock: number;
  reorderLevel: number;
  reorderQuantity: number;
  leadTimeDays: number;
  averageDailyUsage: number;
  safetyStock: number;
}

const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  lowStockThreshold: 10,
  criticalStockThreshold: 5,
  outOfStockEnabled: true,
  expiryAlertDays: 30,
  reorderPointEnabled: true,
  emailNotifications: false
};

/**
 * คำนวณจำนวนรวมของ item จากหน่วยหลายระดับ
 * ใช้ total_base_quantity ก่อน ถ้าไม่มีจึง fallback ไป unit_level หรือ legacy
 */
function getItemQuantity(item: any): number {
  // ใช้ total_base_quantity เป็นหลัก (คำนวณถูกต้องที่สุด)
  if (item.total_base_quantity != null && item.total_base_quantity > 0) {
    return item.total_base_quantity;
  }
  // Fallback: คำนวณจาก unit levels
  const l1 = (item.unit_level1_quantity || 0) * (item.unit_level1_rate || 0);
  const l2 = (item.unit_level2_quantity || 0) * (item.unit_level2_rate || 0);
  const l3 = item.unit_level3_quantity || 0;
  const fromLevels = l1 + l2 + l3;
  if (fromLevels > 0) return fromLevels;
  // Last fallback: legacy
  return (item.carton_quantity_legacy || 0) + (item.box_quantity_legacy || 0);
}

/**
 * จัดกลุ่ม items ตาม SKU แล้วรวมจำนวน
 */
function groupBySku(items: InventoryItem[]): Map<string, { totalQty: number; locationCount: number; representativeItem: InventoryItem }> {
  const groups = new Map<string, { totalQty: number; locationCount: number; representativeItem: InventoryItem }>();
  items.forEach(item => {
    const key = item.sku || item.product_name;
    const qty = getItemQuantity(item);
    const existing = groups.get(key);
    if (existing) {
      existing.totalQty += qty;
      existing.locationCount += 1;
    } else {
      groups.set(key, { totalQty: qty, locationCount: 1, representativeItem: item });
    }
  });
  return groups;
}

export function useInventoryAlerts() {
  const { user } = useAuth();
  const { items, permissions } = useDepartmentInventory();
  const { toast } = useToast();

  const [alertSettings, setAlertSettings] = useState<AlertSettings>(DEFAULT_ALERT_SETTINGS);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [reorderPoints, setReorderPoints] = useState<ReorderPoint[]>([]);

  // Calculate stock alerts — GROUP by SKU เพื่อไม่ให้ซ้ำ
  const calculateStockAlerts = useCallback(() => {
    if (!items.length) return [];

    const grouped = groupBySku(items);
    const newAlerts: StockAlert[] = [];

    grouped.forEach(({ totalQty, locationCount, representativeItem }, sku) => {
      // Out of Stock — ทุก location ของ SKU นี้รวมกันได้ 0
      if (totalQty === 0 && alertSettings.outOfStockEnabled) {
        newAlerts.push({
          id: `${sku}-out-of-stock`,
          type: 'out_of_stock',
          severity: 'critical',
          item: representativeItem,
          message: 'หมดสต็อกทุกตำแหน่ง',
          actionRequired: 'สั่งซื้อหรือโอนสต็อกจากคลังอื่น',
          createdAt: new Date(),
          acknowledged: false,
          currentQuantity: 0,
          locationCount,
        });
      }
      // Critical Stock
      else if (totalQty > 0 && totalQty <= alertSettings.criticalStockThreshold) {
        newAlerts.push({
          id: `${sku}-critical`,
          type: 'critical_stock',
          severity: 'high',
          item: representativeItem,
          message: `เหลือ ${totalQty.toLocaleString()} ชิ้น (${locationCount} ตำแหน่ง)`,
          actionRequired: 'วางแผนสั่งซื้อด่วน',
          createdAt: new Date(),
          acknowledged: false,
          currentQuantity: totalQty,
          locationCount,
          threshold: alertSettings.criticalStockThreshold,
        });
      }
      // Low Stock
      else if (totalQty > alertSettings.criticalStockThreshold && totalQty <= alertSettings.lowStockThreshold) {
        newAlerts.push({
          id: `${sku}-low`,
          type: 'low_stock',
          severity: 'medium',
          item: representativeItem,
          message: `เหลือ ${totalQty.toLocaleString()} ชิ้น (${locationCount} ตำแหน่ง)`,
          actionRequired: 'เตรียมวางแผนสั่งซื้อ',
          createdAt: new Date(),
          acknowledged: false,
          currentQuantity: totalQty,
          locationCount,
          threshold: alertSettings.lowStockThreshold,
        });
      }
    });

    // Expiry check — ดูจาก item แต่ละตัว
    items.forEach(item => {
      if (!item.mfd) return;
      const mfdDate = new Date(item.mfd);
      const now = new Date();
      const shelfLifeDays = 365;
      const expiryDate = new Date(mfdDate.getTime() + shelfLifeDays * 86400000);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / 86400000);

      if (daysUntilExpiry > 0 && daysUntilExpiry <= alertSettings.expiryAlertDays) {
        const existingExpiry = newAlerts.find(a => a.type === 'expiry_warning' && a.item.sku === item.sku);
        if (!existingExpiry) {
          newAlerts.push({
            id: `${item.sku}-expiry`,
            type: 'expiry_warning',
            severity: daysUntilExpiry <= 7 ? 'high' : 'medium',
            item,
            message: `จะหมดอายุใน ${daysUntilExpiry} วัน`,
            actionRequired: daysUntilExpiry <= 7 ? 'จัดการขายหรือใช้ทันที' : 'วางแผนการขาย',
            createdAt: new Date(),
            acknowledged: false,
            currentQuantity: getItemQuantity(item),
            daysUntilExpiry,
          });
        }
      }
    });

    return newAlerts.sort((a, b) => {
      const order = { critical: 4, high: 3, medium: 2, low: 1 };
      return order[b.severity] - order[a.severity];
    });
  }, [items, alertSettings]);

  // Reorder points — group by product
  const calculateReorderPoints = useCallback(() => {
    if (!items.length) return [];
    const grouped = groupBySku(items);
    const result: ReorderPoint[] = [];

    grouped.forEach(({ totalQty }, productName) => {
      const avgDaily = Math.max(1, Math.ceil(totalQty / 30));
      const leadTime = 7;
      const safety = Math.ceil(avgDaily * 3);
      const reorderLevel = avgDaily * leadTime + safety;

      if (totalQty <= reorderLevel && alertSettings.reorderPointEnabled) {
        result.push({
          productName,
          currentStock: totalQty,
          reorderLevel,
          reorderQuantity: Math.max(reorderLevel * 2, 50),
          leadTimeDays: leadTime,
          averageDailyUsage: avgDaily,
          safetyStock: safety,
        });
      }
    });

    return result.sort((a, b) => a.currentStock - b.currentStock);
  }, [items, alertSettings]);

  useEffect(() => {
    const newAlerts = calculateStockAlerts();
    setAlerts(newAlerts);
    setReorderPoints(calculateReorderPoints());

    const critical = newAlerts.filter(a => a.severity === 'critical');
    if (critical.length > 0 && permissions.canViewReports) {
      toast({
        title: 'แจ้งเตือนด่วน!',
        description: `พบสินค้าหมดสต็อก ${critical.length} รายการ`,
        variant: 'destructive',
        duration: 8000,
      });
    }
  }, [items, alertSettings, calculateStockAlerts, calculateReorderPoints, permissions, toast]);

  const updateAlertSettings = useCallback(async (newSettings: Partial<AlertSettings>) => {
    setAlertSettings(prev => ({ ...prev, ...newSettings }));
    toast({ title: 'บันทึกการตั้งค่า', description: 'อัพเดตการตั้งค่าแจ้งเตือนเรียบร้อยแล้ว' });
  }, [toast]);

  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
  }, []);

  const dismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  }, []);

  const getAlertsBySeverity = useCallback((severity: StockAlert['severity']) => {
    return alerts.filter(a => a.severity === severity);
  }, [alerts]);

  const alertSummary = useMemo(() => {
    const totalAlerts = alerts.length;
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    const highAlerts = alerts.filter(a => a.severity === 'high').length;
    const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged).length;

    return {
      totalAlerts,
      criticalAlerts,
      highAlerts,
      unacknowledgedAlerts,
      reorderNeeded: reorderPoints.length,
      hasActiveAlerts: totalAlerts > 0,
      hasCriticalIssues: criticalAlerts > 0 || reorderPoints.length > 0,
    };
  }, [alerts, reorderPoints]);

  return {
    alerts,
    reorderPoints,
    alertSettings,
    alertSummary,
    loading,
    updateAlertSettings,
    acknowledgeAlert,
    dismissAlert,
    getAlertsBySeverity,
    calculateStockAlerts,
    calculateReorderPoints,
  };
}
