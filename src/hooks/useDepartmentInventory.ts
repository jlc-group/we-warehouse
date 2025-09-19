import { useState, useEffect, useCallback, useMemo } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { useAuth } from '@/contexts/AuthContextSimple';
import type { InventoryItem } from '@/hooks/useInventory';

// Department access rules - defines which departments can access which inventory data
const DEPARTMENT_ACCESS_RULES = {
  // คลังสินค้า (Warehouse) - Can access all inventory data
  'คลังสินค้า': {
    canAccess: ['*'],
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
    description: 'เข้าถึงข้อมูลทางการเงินและต้นทุน'
  },

  // ผู้บริหาร (Management) - Can access all data plus analytics
  'ผู้บริหาร': {
    canAccess: ['*'],
    description: 'เข้าถึงข้อมูลทั้งหมดและรายงานผู้บริหาร'
  }
};

// Location-based access patterns
const LOCATION_PATTERNS = {
  warehouse: /^[A-Z]-[0-9]{2}[A-Z]?$/, // Standard warehouse locations like A-01, B-12A
  receiving: /^RECEIVING-/,
  qualityControl: /^QC-/,
  quarantine: /^QUARANTINE-/,
  shipping: /^SHIPPING-/,
  returns: /^RETURN-/
};

export function useDepartmentInventory() {
  const { user } = useAuth();
  const { items: allItems, loading, ...inventoryHook } = useInventory();
  const [permissionDeniedAttempts, setPermissionDeniedAttempts] = useState(0);

  // Check if user has permission to access specific inventory data
  const checkItemAccess = useCallback((item: InventoryItem): boolean => {
    if (!user) return false;

    const departmentRules = DEPARTMENT_ACCESS_RULES[user.department as keyof typeof DEPARTMENT_ACCESS_RULES];

    if (!departmentRules) {
      return false;
    }

    // Management and Warehouse have full access
    if (departmentRules.canAccess.includes('*')) {
      return true;
    }

    // Check location-based access
    if (departmentRules.locations) {
      const hasLocationAccess = departmentRules.locations.some(pattern => {
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

  // Filtered items based on department permissions
  const items = useMemo(() => {
    if (!user) return [];

    const filtered = allItems.filter(checkItemAccess);


    return filtered;
  }, [allItems, checkItemAccess, user]);

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

  // Get items by location category
  const getItemsByLocationCategory = useCallback((category: keyof typeof LOCATION_PATTERNS) => {
    const pattern = LOCATION_PATTERNS[category];
    return items.filter(item => pattern.test(item.location));
  }, [items]);

  // Check if user can perform specific actions
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

  // Record permission denied attempts (for audit purposes)
  const recordPermissionDenied = useCallback((action: string, reason: string) => {
    setPermissionDeniedAttempts(prev => prev + 1);

    // In a real app, this would log to an audit trail
  }, [user]);

  // Wrapper functions that check permissions before executing
  const addItemWithPermission = useCallback(async (itemData: Parameters<typeof inventoryHook.addItem>[0]) => {
    if (!permissions.canAdd) {
      recordPermissionDenied('add_item', `User in department ${user?.department} with role level ${user?.role_level} cannot add items`);
      throw new Error('คุณไม่มีสิทธิ์เพิ่มสินค้าในระบบ');
    }

    return inventoryHook.addItem(itemData);
  }, [permissions.canAdd, recordPermissionDenied, user, inventoryHook]);

  const updateItemWithPermission = useCallback(async (id: string, updates: Parameters<typeof inventoryHook.updateItem>[1]) => {
    if (!permissions.canEdit) {
      recordPermissionDenied('update_item', `User in department ${user?.department} with role level ${user?.role_level} cannot edit items`);
      throw new Error('คุณไม่มีสิทธิ์แก้ไขสินค้าในระบบ');
    }

    // Additional check: can user access this specific item?
    const item = allItems.find(item => item.id === id);
    if (item && !checkItemAccess(item)) {
      recordPermissionDenied('update_item', `User cannot access item in location ${item.location}`);
      throw new Error('คุณไม่มีสิทธิ์เข้าถึงสินค้านี้');
    }

    return inventoryHook.updateItem(id, updates);
  }, [permissions.canEdit, recordPermissionDenied, user, inventoryHook, allItems, checkItemAccess]);

  const deleteItemWithPermission = useCallback(async (id: string) => {
    if (!permissions.canDelete) {
      recordPermissionDenied('delete_item', `User in department ${user?.department} with role level ${user?.role_level} cannot delete items`);
      throw new Error('คุณไม่มีสิทธิ์ลบสินค้าในระบบ');
    }

    // Additional check: can user access this specific item?
    const item = allItems.find(item => item.id === id);
    if (item && !checkItemAccess(item)) {
      recordPermissionDenied('delete_item', `User cannot access item in location ${item.location}`);
      throw new Error('คุณไม่มีสิทธิ์เข้าถึงสินค้านี้');
    }

    return inventoryHook.deleteItem(id);
  }, [permissions.canDelete, recordPermissionDenied, user, inventoryHook, allItems, checkItemAccess]);

  // Transfer items with permission check
  const transferItemsWithPermission = useCallback(async (itemIds: string[], targetLocation: string, notes?: string) => {
    if (!permissions.canEdit) {
      recordPermissionDenied('transfer_items', `User in department ${user?.department} with role level ${user?.role_level} cannot transfer items`);
      throw new Error('คุณไม่มีสิทธิ์ย้ายสินค้าในระบบ');
    }

    // Check if user can access all items to transfer
    const itemsToTransfer = allItems.filter(item => itemIds.includes(item.id));
    const deniedItems = itemsToTransfer.filter(item => !checkItemAccess(item));

    if (deniedItems.length > 0) {
      recordPermissionDenied('transfer_items', `User cannot access ${deniedItems.length} items to transfer`);
      throw new Error(`คุณไม่มีสิทธิ์เข้าถึงสินค้าบางรายการที่จะย้าย (${deniedItems.length} รายการ)`);
    }

    return inventoryHook.transferItems(itemIds, targetLocation, notes);
  }, [permissions.canEdit, recordPermissionDenied, user, inventoryHook, allItems, checkItemAccess]);

  // Ship out items with permission check
  const shipOutItemsWithPermission = useCallback(async (itemIds: string[], notes?: string) => {
    if (!permissions.canDelete) {
      recordPermissionDenied('ship_out_items', `User in department ${user?.department} with role level ${user?.role_level} cannot ship out items`);
      throw new Error('คุณไม่มีสิทธิ์ส่งออกสินค้าในระบบ');
    }

    // Check if user can access all items to ship out
    const itemsToShipOut = allItems.filter(item => itemIds.includes(item.id));
    const deniedItems = itemsToShipOut.filter(item => !checkItemAccess(item));

    if (deniedItems.length > 0) {
      recordPermissionDenied('ship_out_items', `User cannot access ${deniedItems.length} items to ship out`);
      throw new Error(`คุณไม่มีสิทธิ์เข้าถึงสินค้าบางรายการที่จะส่งออก (${deniedItems.length} รายการ)`);
    }

    return inventoryHook.shipOutItems(itemIds, notes);
  }, [permissions.canDelete, recordPermissionDenied, user, inventoryHook, allItems, checkItemAccess]);

  // Export item with permission check
  const exportItemWithPermission = useCallback(async (id: string, cartonQty: number, boxQty: number, looseQty: number, destination: string, notes?: string) => {
    if (!permissions.canEdit) {
      recordPermissionDenied('export_item', `User in department ${user?.department} with role level ${user?.role_level} cannot export items`);
      throw new Error('คุณไม่มีสิทธิ์ส่งออกสินค้าในระบบ');
    }

    // Additional check: can user access this specific item?
    const item = allItems.find(item => item.id === id);
    if (!item || !checkItemAccess(item)) {
      recordPermissionDenied('export_item', `User cannot access item with id ${id}`);
      throw new Error('คุณไม่มีสิทธิ์เข้าถึงสินค้านี้');
    }

    return inventoryHook.exportItem(id, cartonQty, boxQty, looseQty, destination, notes);
  }, [permissions.canEdit, recordPermissionDenied, user, inventoryHook, allItems, checkItemAccess]);

  return {
    // Filtered data based on department permissions
    items,
    loading,

    // Permission-aware CRUD operations
    addItem: addItemWithPermission,
    updateItem: updateItemWithPermission,
    deleteItem: deleteItemWithPermission,
    exportItem: exportItemWithPermission,
    transferItems: transferItemsWithPermission,
    shipOutItems: shipOutItemsWithPermission,

    // Access control information
    accessSummary,
    permissions,
    checkItemAccess,

    // Location-based filtering
    getItemsByLocationCategory,

    // Audit information
    permissionDeniedAttempts,

    // Pass through other inventory hook functions
    ...inventoryHook
  };
}

export type { InventoryItem };