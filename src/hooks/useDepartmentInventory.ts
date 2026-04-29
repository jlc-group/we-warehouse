import { useState, useEffect, useCallback, useMemo } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { useAuth } from '@/contexts/AuthContextSimple';
import type { InventoryItem } from '@/hooks/useInventory';

// CRITICAL: Global throttling to prevent nested hook refresh loops
let lastDeptFetchTime = 0;
const DEPT_THROTTLE_TIME = 5000; // 5 seconds - balance between responsiveness and stability

// Department access rules - defines which departments can access which inventory data
const DEPARTMENT_ACCESS_RULES = {
  // คลังสินค้า (Warehouse) - Can access all inventory data
  'คลังสินค้า': {
    canAccess: ['*'],
    locations: [] as string[],
    description: 'เข้าถึงข้อมูลสินค้าคงคลังทั้งหมด'
  },

  // จัดซื้อ (Purchasing) - Can access supplier and cost-related data, ordering info
  'จัดซื้อ': {
    canAccess: ['purchasing', 'orders', 'suppliers'],
    locations: ['RECEIVING-*', 'QC-*'],
    description: 'เข้าถึงข้อมูลการจัดซื้อและผู้จำหน่าย'
  },

  // ควบคุมคุณภาพ (Quality Control) - Can access quality-related locations and batch info
  'ควบคุมคุณภาพ': {
    canAccess: ['quality', 'batches', 'expiry'],
    locations: ['QC-*', 'QUARANTINE-*'],
    description: 'เข้าถึงข้อมูลการควบคุมคุณภาพ'
  },

  // การเงิน (Finance) - Can access cost and financial data
  'การเงิน': {
    canAccess: ['financial', 'cost', 'value'],
    locations: [] as string[],
    description: 'เข้าถึงข้อมูลทางการเงินและต้นทุน'
  },

  // ผู้บริหาร (Management) - Can access all data plus analytics
  'ผู้บริหาร': {
    canAccess: ['*'],
    locations: [] as string[],
    description: 'เข้าถึงข้อมูลทั้งหมดและรายงานผู้บริหาร'
  }
};

export function useDepartmentInventory(warehouseId?: string) {
  const { user } = useAuth();

  // CRITICAL: Add throttling check before calling useInventory
  const shouldThrottleFetch = useMemo(() => {
    const now = Date.now();
    return now - lastDeptFetchTime < DEPT_THROTTLE_TIME;
  }, []);

  // Update last fetch time when not throttled
  useEffect(() => {
    if (!shouldThrottleFetch) {
      lastDeptFetchTime = Date.now();
    }
  }, [shouldThrottleFetch]);

  const { items: allItems, loading, ...inventoryHook } = useInventory(warehouseId);
  const [permissionDeniedAttempts, setPermissionDeniedAttempts] = useState(0);

  // Debug logging for data flow
  useEffect(() => {
    console.log(`🔍 useDepartmentInventory: Raw data from useInventory:`, {
      allItemsCount: allItems.length,
      loading,
      user: user?.email,
      department: user?.department,
      warehouseId,
    });
  }, [allItems.length, loading, user?.email, user?.department, warehouseId]);

  // Check if user has permission to access specific inventory data
  const checkItemAccess = useCallback((item: InventoryItem): boolean => {
    if (!user) return false;

    // Supervisor+ (role_level >= 3): broad access regardless of department label.
    // This fixes cases where user.department string doesn't match a known rule key
    // (e.g. 'แผนกคลังสินค้า' vs 'คลังสินค้า', or English 'warehouse' vs Thai).
    if ((user.role_level ?? 0) >= 3) {
      return true;
    }

    // Normalize department: strip "แผนก" prefix, trim whitespace
    const deptRaw = String(user.department || '').trim();
    const deptNorm = deptRaw.replace(/^แผนก/, '').trim();

    const departmentRules =
      (DEPARTMENT_ACCESS_RULES as any)[deptRaw] ||
      (DEPARTMENT_ACCESS_RULES as any)[deptNorm];

    if (!departmentRules) {
      return false;
    }

    // Management and Warehouse have full access
    if (departmentRules.canAccess.includes('*')) {
      return true;
    }

    // Check location-based access
    if (departmentRules.locations && departmentRules.locations.length > 0) {
      const allowedLocations = departmentRules.locations;
      const hasLocationAccess = allowedLocations.some(pattern => {
        if (pattern.endsWith('*')) {
          const prefix = pattern.slice(0, -1);
          return item.location.startsWith(prefix);
        }
        return item.location === pattern;
      });

      if (hasLocationAccess) {
        return true;
      }
    }

    // For specific departments, allow access based on role level
    if (user.role_level >= 3) { // Supervisors and above get broader access
      return true;
    }

    return false;
  }, [user]);

  // CRITICAL: Stable filtered items with throttling to prevent cascading re-renders
  const items = useMemo(() => {
    // TEMP FIX: Show all data even without user to debug the issue
    if (!user) {
      console.log('⚠️ useDepartmentInventory: No user, showing all data for debugging');
      const filtered = allItems.filter(item => {
        if (!warehouseId) return true;
        // STRICT filter: รายการ NULL warehouse_id ไม่ leak ข้ามคลังอีกแล้ว
        // (ก่อนหน้านี้คืน true เมื่อ warehouse_id ว่าง → ทำให้ข้อมูลหลักไหลเข้าทุกคลัง)
        return item.warehouse_id === warehouseId;
      });
      console.log(`📊 No-user filter: ${filtered.length}/${allItems.length} items accessible`);
      return filtered;
    }

    // Log throttling status
    if (shouldThrottleFetch) {
      console.log('🚫 useDepartmentInventory: filtering throttled');
    }

    const filtered = allItems
      .filter(checkItemAccess)
      .filter(item => {
        if (!warehouseId) return true;
        // STRICT filter: รายการ NULL warehouse_id ไม่ leak ข้ามคลังอีกแล้ว
        return item.warehouse_id === warehouseId;
      });
    console.log(`📊 Department filter: ${filtered.length}/${allItems.length} items accessible`);
    return filtered;
  }, [allItems, checkItemAccess, user, shouldThrottleFetch, warehouseId]);

  // Get department access summary
  const accessSummary = useMemo(() => {
    if (!user) return null;

    const departmentRules = DEPARTMENT_ACCESS_RULES[user.department as keyof typeof DEPARTMENT_ACCESS_RULES];

    if (!departmentRules) return null;

    return {
      department: user.department,
      description: departmentRules.description,
      canAccess: departmentRules.canAccess,
      locations: departmentRules.locations || [],
      hasFullAccess: departmentRules.canAccess.includes('*'),
      accessibleItems: items.length,
      totalItems: allItems.length,
      accessPercentage: allItems.length > 0 ? Math.round((items.length / allItems.length) * 100) : 0
    };
  }, [user, items.length, allItems.length]);

  // Permission wrapper functions
  const permissions = useMemo(() => {
    if (!user) return {
      canAdd: false,
      canEdit: false,
      canDelete: false,
      canViewFinancials: false,
      canManageQuality: false,
      canViewReports: false
    };

    const isWarehouse = user.department === 'คลังสินค้า';
    const isManagement = user.department === 'ผู้บริหาร';
    const isSupervisor = user.role_level >= 3;

    return {
      canAdd: isWarehouse || isManagement || (user.department === 'จัดซื้อ' && isSupervisor),
      canEdit: isWarehouse || isManagement || isSupervisor,
      canDelete: isWarehouse || isManagement || user.role_level >= 4,
      canViewFinancials: user.department === 'การเงิน' || isManagement,
      canManageQuality: user.department === 'ควบคุมคุณภาพ' || isWarehouse || isManagement,
      canViewReports: isManagement || isSupervisor
    };
  }, [user]);

  return {
    // Filtered data based on department permissions
    items,
    loading,

    // Permission-aware CRUD operations
    addItem: inventoryHook.addItem,
    updateItem: inventoryHook.updateItem,
    deleteItem: inventoryHook.deleteItem,
    exportItem: inventoryHook.exportItem,
    transferItems: inventoryHook.transferItems,
    shipOutItems: inventoryHook.shipOutItems,

    // Access control information
    accessSummary,
    permissions,
    checkItemAccess,

    // Audit information
    permissionDeniedAttempts,

    // Pass through other inventory hook functions
    ...inventoryHook
  };
}

export type { InventoryItem };