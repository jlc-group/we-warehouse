// Permission Configuration for Role-Based Access Control
// This file defines permissions for different user roles in the warehouse system

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'inventory' | 'sales' | 'finance' | 'reports' | 'admin' | 'system';
}

export interface RolePermissions {
  roleLevel: number;
  roleName: string;
  permissions: string[];
  description: string;
}

// Define all available permissions
export const PERMISSIONS: Permission[] = [
  // Inventory permissions
  { id: 'inventory.view', name: 'ดูข้อมูลสต็อก', description: 'ดูข้อมูลสินค้าในคลัง', category: 'inventory' },
  { id: 'inventory.add', name: 'เพิ่มสินค้า', description: 'เพิ่มสินค้าเข้าสต็อก', category: 'inventory' },
  { id: 'inventory.edit', name: 'แก้ไขสินค้า', description: 'แก้ไขข้อมูลสินค้า', category: 'inventory' },
  { id: 'inventory.delete', name: 'ลบสินค้า', description: 'ลบสินค้าออกจากระบบ', category: 'inventory' },
  { id: 'inventory.transfer', name: 'โอนย้ายสินค้า', description: 'โอนย้ายสินค้าระหว่างคลัง', category: 'inventory' },
  { id: 'inventory.approve', name: 'อนุมัติการเปลี่ยนแปลง', description: 'อนุมัติการเปลี่ยนแปลงสต็อก', category: 'inventory' },

  // Sales permissions
  { id: 'sales.view', name: 'ดูข้อมูลการขาย', description: 'ดูข้อมูลการขายและใบสั่งซื้อ', category: 'sales' },
  { id: 'sales.create', name: 'สร้างใบสั่งขาย', description: 'สร้างใบสั่งขายใหม่', category: 'sales' },
  { id: 'sales.edit', name: 'แก้ไขใบสั่งขาย', description: 'แก้ไขใบสั่งขายที่มีอยู่', category: 'sales' },
  { id: 'sales.delete', name: 'ลบใบสั่งขาย', description: 'ลบใบสั่งขาย', category: 'sales' },
  { id: 'sales.discount', name: 'อนุมัติส่วนลด', description: 'อนุมัติส่วนลดพิเศษ', category: 'sales' },
  { id: 'sales.pricing', name: 'แก้ไขราคา', description: 'แก้ไขราคาสินค้า', category: 'sales' },
  { id: 'sales.manage', name: 'จัดการระบบขาย', description: 'จัดการระบบขายทั้งหมด', category: 'sales' },

  // Finance permissions
  { id: 'finance.view', name: 'ดูข้อมูลการเงิน', description: 'ดูข้อมูลการเงินพื้นฐาน', category: 'finance' },
  { id: 'finance.bills', name: 'จัดการใบเสร็จ', description: 'สร้างและจัดการใบเสร็จ', category: 'finance' },
  { id: 'finance.payments', name: 'จัดการการชำระเงิน', description: 'จัดการการชำระเงินและเก็บหนี้', category: 'finance' },
  { id: 'finance.accounting', name: 'เข้าถึงบัญชี', description: 'เข้าถึงระบบบัญชีทั้งหมด', category: 'finance' },
  { id: 'finance.audit', name: 'ตรวจสอบการเงิน', description: 'ตรวจสอบและควบคุมการเงิน', category: 'finance' },

  // Reports permissions
  { id: 'reports.basic', name: 'รายงานพื้นฐาน', description: 'ดูรายงานพื้นฐาน', category: 'reports' },
  { id: 'reports.inventory', name: 'รายงานสต็อก', description: 'รายงานเกี่ยวกับสต็อก', category: 'reports' },
  { id: 'reports.sales', name: 'รายงานการขาย', description: 'รายงานการขายและยอดขาย', category: 'reports' },
  { id: 'reports.financial', name: 'รายงานการเงิน', description: 'รายงานการเงินและกำไรขาดทุน', category: 'reports' },
  { id: 'reports.export', name: 'ส่งออกรายงาน', description: 'ส่งออกรายงานเป็นไฟล์', category: 'reports' },
  { id: 'reports.all', name: 'รายงานทั้งหมด', description: 'เข้าถึงรายงานทุกประเภท', category: 'reports' },

  // Admin permissions
  { id: 'admin.users', name: 'จัดการผู้ใช้', description: 'จัดการผู้ใช้งานระบบ', category: 'admin' },
  { id: 'admin.roles', name: 'จัดการสิทธิ์', description: 'จัดการสิทธิ์และบทบาท', category: 'admin' },
  { id: 'admin.settings', name: 'ตั้งค่าระบบ', description: 'ตั้งค่าระบบทั่วไป', category: 'admin' },
  { id: 'admin.backup', name: 'สำรองข้อมูล', description: 'สำรองและกู้คืนข้อมูล', category: 'admin' },

  // System permissions
  { id: 'system.debug', name: 'Debug ระบบ', description: 'เข้าถึงเครื่องมือ debug', category: 'system' },
  { id: 'system.logs', name: 'ดู System Logs', description: 'ดู system logs และ audit trail', category: 'system' },
  { id: 'system.full', name: 'ควบคุมระบบเต็ม', description: 'ควบคุมระบบอย่างเต็มที่', category: 'system' },
];

// Define role-based permissions
export const ROLE_PERMISSIONS: RolePermissions[] = [
  {
    roleLevel: 5,
    roleName: 'ผู้ดูแลระบบ',
    description: 'สิทธิ์เต็มทุกระบบ',
    permissions: [
      // Full access to everything
      'inventory.view', 'inventory.add', 'inventory.edit', 'inventory.delete', 'inventory.transfer', 'inventory.approve',
      'sales.view', 'sales.create', 'sales.edit', 'sales.delete', 'sales.discount', 'sales.pricing', 'sales.manage',
      'finance.view', 'finance.bills', 'finance.payments', 'finance.accounting', 'finance.audit',
      'reports.basic', 'reports.inventory', 'reports.sales', 'reports.financial', 'reports.export', 'reports.all',
      'admin.users', 'admin.roles', 'admin.settings', 'admin.backup',
      'system.debug', 'system.logs', 'system.full'
    ]
  },
  {
    roleLevel: 4,
    roleName: 'ผู้จัดการคลัง',
    description: 'จัดการคลังและการเงิน (ยกเว้นการตรวจสอบระบบ)',
    permissions: [
      'inventory.view', 'inventory.add', 'inventory.edit', 'inventory.delete', 'inventory.transfer', 'inventory.approve',
      'sales.view', 'sales.create', 'sales.edit', 'sales.discount', 'sales.pricing', 'sales.manage',
      'finance.view', 'finance.bills', 'finance.payments', 'finance.accounting',
      'reports.basic', 'reports.inventory', 'reports.sales', 'reports.financial', 'reports.export',
      'admin.users', 'admin.settings'
    ]
  },
  {
    roleLevel: 3,
    roleName: 'หัวหน้าแผนก',
    description: 'จัดการคลังและการขาย (การเงินจำกัด)',
    permissions: [
      'inventory.view', 'inventory.add', 'inventory.edit', 'inventory.transfer',
      'sales.view', 'sales.create', 'sales.edit',
      'finance.view', 'finance.bills', // จำกัดการเงิน: ดูได้ จัดการใบเสร็จได้ แต่ไม่มีสิทธิ์ accounting เต็ม
      'reports.basic', 'reports.inventory', 'reports.sales'
    ]
  },
  {
    roleLevel: 2,
    roleName: 'เจ้าหน้าที่',
    description: 'จัดการสต็อกพื้นฐาน (ไม่มีสิทธิ์การเงิน)',
    permissions: [
      'inventory.view', 'inventory.add', 'inventory.edit', 'inventory.transfer',
      'sales.view', // ดูการขายได้ แต่ไม่สามารถสร้างหรือแก้ไข
      // ไม่มีสิทธิ์การเงินเลย
      'reports.basic', 'reports.inventory'
    ]
  },
  {
    roleLevel: 1,
    roleName: 'ผู้อ่านอย่างเดียว',
    description: 'ดูข้อมูลอย่างเดียว',
    permissions: [
      'inventory.view',
      'sales.view',
      'reports.basic'
    ]
  }
];

// Helper functions
export const getPermissionsByRole = (roleLevel: number): string[] => {
  const roleConfig = ROLE_PERMISSIONS.find(r => r.roleLevel === roleLevel);
  return roleConfig?.permissions || [];
};

export const hasPermission = (userRoleLevel: number, permission: string): boolean => {
  const userPermissions = getPermissionsByRole(userRoleLevel);
  return userPermissions.includes(permission);
};

export const getPermissionInfo = (permissionId: string): Permission | undefined => {
  return PERMISSIONS.find(p => p.id === permissionId);
};

export const getPermissionsByCategory = (category: Permission['category']): Permission[] => {
  return PERMISSIONS.filter(p => p.category === category);
};

// Special permission checks for complex features
export const canAccessFinancialFeatures = (roleLevel: number): boolean => {
  return hasPermission(roleLevel, 'finance.view');
};

export const canManageSales = (roleLevel: number): boolean => {
  return hasPermission(roleLevel, 'sales.create');
};

export const canAccessAccounting = (roleLevel: number): boolean => {
  return hasPermission(roleLevel, 'finance.accounting');
};

export const canViewFinancialReports = (roleLevel: number): boolean => {
  return hasPermission(roleLevel, 'reports.financial');
};