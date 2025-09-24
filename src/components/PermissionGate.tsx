import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Lock, AlertTriangle } from 'lucide-react';

interface PermissionGateProps {
  children: React.ReactNode;
  permission?: string;
  role?: string;
  department?: string;
  minLevel?: number;
  productType?: 'FG' | 'PK';
  fallback?: React.ReactNode;
  showError?: boolean;
  className?: string;
}

// Helper component for access denied message
function AccessDeniedMessage({
  reason,
  suggestion
}: {
  reason: string;
  suggestion?: string;
}) {
  return (
    <Alert className="border-orange-200 bg-orange-50">
      <Lock className="h-4 w-4 text-orange-600" />
      <AlertDescription className="text-orange-800">
        <div className="font-medium mb-1">ไม่มีสิทธิ์การเข้าถึง</div>
        <div className="text-sm">{reason}</div>
        {suggestion && (
          <div className="text-xs mt-2 text-orange-600">{suggestion}</div>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * PermissionGate - Component สำหรับควบคุมการเข้าถึง UI ตามสิทธิ์
 *
 * @param children - Component ที่จะแสดงเมื่อมีสิทธิ์
 * @param permission - สิทธิ์ที่ต้องการ (เช่น 'inventory.fg.view')
 * @param role - บทบาทที่ต้องการ (เช่น 'warehouse_fg_manager')
 * @param department - แผนกที่ต้องการ (เช่น 'warehouse_fg')
 * @param minLevel - ระดับสิทธิ์ขั้นต่ำ (เช่น 70)
 * @param productType - ประเภทสินค้าที่สามารถเข้าถึง ('FG' หรือ 'PK')
 * @param fallback - Component ที่จะแสดงแทนเมื่อไม่มีสิทธิ์
 * @param showError - แสดงข้อความข้อผิดพลาดเมื่อไม่มีสิทธิ์
 */
export function PermissionGate({
  children,
  permission,
  role,
  department,
  minLevel,
  productType,
  fallback,
  showError = true,
  className
}: PermissionGateProps) {
  const { profile, hasPermission, hasRole, hasMinimumRole, isInDepartment } = useAuth();

  // ถ้าไม่ได้ login
  if (!profile) {
    if (showError) {
      return (
        <AccessDeniedMessage
          reason="กรุณาเข้าสู่ระบบเพื่อเข้าถึงฟังก์ชันนี้"
          suggestion="กดปุ่มเข้าสู่ระบบเพื่อดำเนินการต่อ"
        />
      );
    }
    return fallback || null;
  }

  let hasAccess = true;
  let denialReason = '';

  // ตรวจสอบสิทธิ์เฉพาะ
  if (permission && !hasPermission(permission)) {
    hasAccess = false;
    denialReason = `ต้องการสิทธิ์ "${permission}" เพื่อเข้าถึงฟังก์ชันนี้`;
  }

  // ตรวจสอบบทบาท
  if (role && !hasRole(role)) {
    hasAccess = false;
    denialReason = `ต้องการบทบาท "${role}" เพื่อเข้าถึงฟังก์ชันนี้`;
  }

  // ตรวจสอบแผนก
  if (department && !isInDepartment(department)) {
    hasAccess = false;
    denialReason = `ต้องอยู่ในแผนก "${department}" เพื่อเข้าถึงฟังก์ชันนี้`;
  }

  // ตรวจสอบระดับสิทธิ์ขั้นต่ำ
  if (minLevel && !hasMinimumRole(minLevel)) {
    hasAccess = false;
    denialReason = `ต้องการระดับสิทธิ์ขั้นต่ำ ${minLevel} เพื่อเข้าถึงฟังก์ชันนี้ (ปัจจุบัน: ${profile.role?.level || 0})`;
  }

  // ตรวจสอบประเภทสินค้า (Custom logic สำหรับระบบนี้)
  if (productType) {
    const canAccessType =
      hasPermission('admin.full_access') ||
      hasPermission('inventory.all.view') ||
      (productType === 'FG' && (hasPermission('inventory.fg.view') || hasPermission('inventory.fg.full_access'))) ||
      (productType === 'PK' && (hasPermission('inventory.pk.view') || hasPermission('inventory.pk.full_access')));

    if (!canAccessType) {
      hasAccess = false;
      denialReason = `ต้องมีสิทธิ์เข้าถึงสินค้าประเภท ${productType} เพื่อใช้ฟังก์ชันนี้`;
    }
  }

  // ถ้าไม่มีสิทธิ์
  if (!hasAccess) {
    if (showError) {
      const suggestion = getSuggestion(permission, role, department, minLevel, productType);
      return <AccessDeniedMessage reason={denialReason} suggestion={suggestion} />;
    }
    return fallback || null;
  }

  // มีสิทธิ์ - แสดง children
  return (
    <div className={className}>
      {children}
    </div>
  );
}

// ฟังก์ชันช่วยให้คำแนะนำ
function getSuggestion(
  permission?: string,
  role?: string,
  department?: string,
  minLevel?: number,
  productType?: string
): string | undefined {
  if (permission?.includes('admin')) {
    return 'ติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์การเข้าถึง';
  }

  if (role?.includes('manager')) {
    return 'ฟังก์ชันนี้สำหรับหัวหน้าแผนกเท่านั้น';
  }

  if (department) {
    return `ติดต่อหัวหน้าแผนก${department}เพื่อขอสิทธิ์การเข้าถึง`;
  }

  if (minLevel && minLevel >= 70) {
    return 'ฟังก์ชันนี้สำหรับผู้บริหารเท่านั้น';
  }

  if (productType) {
    return `ฟังก์ชันนี้สำหรับพนักงานคลัง ${productType} เท่านั้น`;
  }

  return 'ติดต่อผู้ดูแลระบบเพื่อสอบถามเกี่ยวกับสิทธิ์การเข้าถึง';
}

// Hook สำหรับใช้งานการตรวจสอบสิทธิ์แบบง่าย
export function usePermissionCheck() {
  const { profile, hasPermission, hasRole, hasMinimumRole, isInDepartment } = useAuth();

  return {
    canView: (permission: string) => hasPermission(permission),
    canEdit: (permission: string) => hasPermission(permission),
    canDelete: (permission: string) => hasPermission(permission),
    canManage: (permission: string) => hasPermission(permission),

    canAccessFG: () => hasPermission('inventory.fg.view') || hasPermission('inventory.fg.full_access') || hasPermission('inventory.all.view'),
    canAccessPK: () => hasPermission('inventory.pk.view') || hasPermission('inventory.pk.full_access') || hasPermission('inventory.all.view'),

    isManager: () => hasMinimumRole(70),
    isAdmin: () => hasPermission('admin.full_access'),
    isStaff: () => profile?.role?.level && profile.role.level < 50,

    inWarehouseFG: () => isInDepartment('warehouse_fg'),
    inWarehousePK: () => isInDepartment('warehouse_pk'),
    inSales: () => isInDepartment('sales'),
    inAccounting: () => isInDepartment('accounting')
  };
}

// Component สำหรับแสดงสถานะสิทธิ์ (สำหรับ Debug)
export function PermissionDebug() {
  const { profile, hasPermission } = useAuth();
  const permissions = usePermissionCheck();

  if (!profile) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          ไม่ได้เข้าสู่ระบบ
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-muted/50 text-sm">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="h-4 w-4" />
        <strong>ข้อมูลสิทธิ์การเข้าถึง</strong>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <strong>บทบาท:</strong> {profile.role?.name_thai || 'ไม่ระบุ'}
        </div>
        <div>
          <strong>แผนก:</strong> {profile.department?.name_thai || 'ไม่ระบุ'}
        </div>
        <div>
          <strong>ระดับ:</strong> {profile.role?.level || 0}
        </div>
        <div>
          <strong>จำนวนสิทธิ์:</strong> {profile.role?.permissions?.length || 0}
        </div>
      </div>

      <div className="mt-3">
        <strong>สิทธิ์การเข้าถึงหลัก:</strong>
        <div className="flex flex-wrap gap-1 mt-1">
          {permissions.isAdmin() && <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">Admin</span>}
          {permissions.isManager() && <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Manager</span>}
          {permissions.canAccessFG() && <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">FG</span>}
          {permissions.canAccessPK() && <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">PK</span>}
        </div>
      </div>
    </div>
  );
}