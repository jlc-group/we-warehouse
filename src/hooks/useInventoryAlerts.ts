import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDepartmentInventory } from '@/hooks/useDepartmentInventory';
import { useAuth } from '@/contexts/AuthContextSimple';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { InventoryItem } from '@/hooks/useDepartmentInventory';

// Alert configuration types
interface AlertSettings {
  lowStockThreshold: number;
  criticalStockThreshold: number;
  outOfStockEnabled: boolean;
  expiryAlertDays: number;
  reorderPointEnabled: boolean;
  emailNotifications: boolean;
}

interface StockAlert {
  id: string;
  type: 'low_stock' | 'critical_stock' | 'out_of_stock' | 'expiry_warning' | 'reorder_needed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  item: InventoryItem;
  message: string;
  actionRequired: string;
  createdAt: Date;
  acknowledged: boolean;
  currentQuantity: number;
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

export function useInventoryAlerts() {
  const { user } = useAuth();
  const { items, permissions } = useDepartmentInventory();
  const { toast } = useToast();

  const [alertSettings, setAlertSettings] = useState<AlertSettings>(DEFAULT_ALERT_SETTINGS);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [reorderPoints, setReorderPoints] = useState<ReorderPoint[]>([]);

  // Calculate stock alerts based on current inventory
  const calculateStockAlerts = useCallback(() => {
    if (!items.length) return [];

    const newAlerts: StockAlert[] = [];

    items.forEach(item => {
      const currentQuantity = ((item as any).carton_quantity_legacy || 0) + ((item as any).box_quantity_legacy || 0);
      const alertId = `${item.id}-${Date.now()}`;

      // Out of Stock Alert
      if (currentQuantity === 0 && alertSettings.outOfStockEnabled) {
        newAlerts.push({
          id: `${alertId}-out-of-stock`,
          type: 'out_of_stock',
          severity: 'critical',
          item,
          message: `${item.product_name} หมดสต็อกแล้ว`,
          actionRequired: 'สั่งซื้อหรือโอนสต็อกจากตำแหน่งอื่นทันที',
          createdAt: new Date(),
          acknowledged: false,
          currentQuantity
        });
      }

      // Critical Stock Alert
      else if (currentQuantity > 0 && currentQuantity <= alertSettings.criticalStockThreshold) {
        newAlerts.push({
          id: `${alertId}-critical`,
          type: 'critical_stock',
          severity: 'high',
          item,
          message: `${item.product_name} เหลือสต็อกต่ำมาก (${currentQuantity} ชิ้น)`,
          actionRequired: 'วางแผนสั่งซื้อด่วน',
          createdAt: new Date(),
          acknowledged: false,
          currentQuantity,
          threshold: alertSettings.criticalStockThreshold
        });
      }

      // Low Stock Alert
      else if (currentQuantity > alertSettings.criticalStockThreshold &&
               currentQuantity <= alertSettings.lowStockThreshold) {
        newAlerts.push({
          id: `${alertId}-low`,
          type: 'low_stock',
          severity: 'medium',
          item,
          message: `${item.product_name} เหลือสต็อกน้อย (${currentQuantity} ชิ้น)`,
          actionRequired: 'เตรียมวางแผนสั่งซื้อ',
          createdAt: new Date(),
          acknowledged: false,
          currentQuantity,
          threshold: alertSettings.lowStockThreshold
        });
      }

      // Expiry Warning Alert
      if (item.mfd) {
        const mfdDate = new Date(item.mfd);
        const currentDate = new Date();
        const daysDifference = Math.ceil((currentDate.getTime() - mfdDate.getTime()) / (1000 * 3600 * 24));

        // Assuming products expire after 365 days (can be customized per product)
        const assumedShelfLifeDays = 365;
        const expiryDate = new Date(mfdDate.getTime() + (assumedShelfLifeDays * 24 * 60 * 60 * 1000));
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - currentDate.getTime()) / (1000 * 3600 * 24));

        if (daysUntilExpiry <= alertSettings.expiryAlertDays && daysUntilExpiry > 0) {
          newAlerts.push({
            id: `${alertId}-expiry`,
            type: 'expiry_warning',
            severity: daysUntilExpiry <= 7 ? 'high' : 'medium',
            item,
            message: `${item.product_name} จะหมดอายุใน ${daysUntilExpiry} วัน`,
            actionRequired: daysUntilExpiry <= 7 ? 'จัดการขายหรือใช้ทันที' : 'วางแผนการขายหรือการใช้',
            createdAt: new Date(),
            acknowledged: false,
            currentQuantity,
            daysUntilExpiry
          });
        }
      }
    });

    return newAlerts.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }, [items, alertSettings]);

  // Calculate reorder points based on historical data and current stock levels
  const calculateReorderPoints = useCallback(() => {
    if (!items.length) return [];

    // Group items by product name to calculate reorder points
    const productGroups = items.reduce((acc, item) => {
      const key = item.product_name;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {} as Record<string, InventoryItem[]>);

    const newReorderPoints: ReorderPoint[] = [];

    Object.entries(productGroups).forEach(([productName, productItems]) => {
      const totalCurrentStock = productItems.reduce((sum, item) =>
        sum + ((item as any).carton_quantity_legacy || 0) + ((item as any).box_quantity_legacy || 0), 0
      );

      // Simplified reorder calculation (in real app, this would use historical data)
      const averageDailyUsage = Math.max(1, Math.ceil(totalCurrentStock / 30)); // Assume monthly turnover
      const leadTimeDays = 7; // Assume 1 week lead time
      const safetyStock = Math.ceil(averageDailyUsage * 3); // 3 days safety stock
      const reorderLevel = (averageDailyUsage * leadTimeDays) + safetyStock;
      const reorderQuantity = Math.max(reorderLevel * 2, 50); // Order enough for 2 cycles, min 50

      if (totalCurrentStock <= reorderLevel && alertSettings.reorderPointEnabled) {
        newReorderPoints.push({
          productName,
          currentStock: totalCurrentStock,
          reorderLevel,
          reorderQuantity,
          leadTimeDays,
          averageDailyUsage,
          safetyStock
        });
      }
    });

    return newReorderPoints.sort((a, b) => a.currentStock - b.currentStock);
  }, [items, alertSettings]);

  // Update alerts when items or settings change
  useEffect(() => {
    const newAlerts = calculateStockAlerts();
    setAlerts(newAlerts);

    const newReorderPoints = calculateReorderPoints();
    setReorderPoints(newReorderPoints);

    // Show toast for critical alerts
    const criticalAlerts = newAlerts.filter(alert => alert.severity === 'critical');
    if (criticalAlerts.length > 0 && permissions.canViewReports) {
      toast({
        title: '🚨 แจ้งเตือนด่วน!',
        description: `พบสินค้าหมดสต็อก ${criticalAlerts.length} รายการ`,
        variant: 'destructive',
        duration: 8000
      });
    }
  }, [items, alertSettings, calculateStockAlerts, calculateReorderPoints, permissions, toast]);

  // Update alert settings
  const updateAlertSettings = useCallback(async (newSettings: Partial<AlertSettings>) => {
    setAlertSettings(prev => ({ ...prev, ...newSettings }));

    // In a real app, save settings to database

    toast({
      title: 'บันทึกการตั้งค่า',
      description: 'อัพเดตการตั้งค่าแจ้งเตือนเรียบร้อยแล้ว'
    });
  }, [toast]);

  // Acknowledge alert
  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));

    toast({
      title: 'รับทราบแจ้งเตือน',
      description: 'ทำเครื่องหมายรับทราบแจ้งเตือนแล้ว'
    });
  }, [toast]);

  // Dismiss alert
  const dismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));

    toast({
      title: 'ปิดแจ้งเตือน',
      description: 'ปิดแจ้งเตือนเรียบร้อยแล้ว'
    });
  }, [toast]);

  // Get alerts by severity
  const getAlertsBySeverity = useCallback((severity: StockAlert['severity']) => {
    return alerts.filter(alert => alert.severity === severity);
  }, [alerts]);

  // Get summary statistics
  const alertSummary = useMemo(() => {
    const totalAlerts = alerts.length;
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    const highAlerts = alerts.filter(a => a.severity === 'high').length;
    const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged).length;
    const reorderNeeded = reorderPoints.length;

    return {
      totalAlerts,
      criticalAlerts,
      highAlerts,
      unacknowledgedAlerts,
      reorderNeeded,
      hasActiveAlerts: totalAlerts > 0,
      hasCriticalIssues: criticalAlerts > 0 || reorderNeeded > 0
    };
  }, [alerts, reorderPoints]);

  return {
    // Alert data
    alerts,
    reorderPoints,
    alertSettings,
    alertSummary,
    loading,

    // Alert functions
    updateAlertSettings,
    acknowledgeAlert,
    dismissAlert,
    getAlertsBySeverity,

    // Calculations
    calculateStockAlerts,
    calculateReorderPoints
  };
}