
import { useAuth } from '@/contexts/AuthContextSimple';
import { hasPermission } from '@/config/permissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, ShieldAlert, Eye, AlertTriangle, ArrowLeft } from 'lucide-react';

interface PermissionGateProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
  showFallback?: boolean;
  requiredRole?: string;
  feature?: string;
}

interface AccessDeniedProps {
  permission: string;
  feature?: string;
  requiredRole?: string;
  userRole?: string;
  compact?: boolean;
}

const AccessDenied = ({
  permission,
  feature,
  requiredRole,
  userRole,
  compact = false
}) => {
  if (compact) {
    return (
      <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center">
          <Lock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">ไม่มีสิทธิ์เข้าถึง</p>
          {requiredRole && (
            <p className="text-xs text-gray-500">ต้องการสิทธิ์: {requiredRole}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <ShieldAlert className="h-16 w-16 text-red-500" />
            <Lock className="h-6 w-6 text-red-600 absolute -bottom-1 -right-1 bg-white rounded-full p-1" />
          </div>
        </div>
        <CardTitle className="text-xl text-red-700">
          ไม่มีสิทธิ์เข้าถึงฟีเจอร์นี้
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            คุณไม่มีสิทธิ์เข้าถึงฟีเจอร์ {feature || 'นี้'} กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์เพิ่มเติม
          </AlertDescription>
        </Alert>

        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">สิทธิ์ปัจจุบัน:</span>
            <Badge variant="outline" className="text-blue-700 border-blue-300">
              {userRole || 'ไม่ระบุ'}
            </Badge>
          </div>

          {requiredRole && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">สิทธิ์ที่ต้องการ:</span>
              <Badge variant="destructive">
                {requiredRole}
              </Badge>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Permission:</span>
            <code className="text-xs bg-gray-200 px-2 py-1 rounded">
              {permission}
            </code>
          </div>
        </div>

        <div className="text-center pt-2">
          <div className="flex items-center justify-center text-sm text-gray-600 mb-3">
            <Eye className="h-4 w-4 mr-2" />
            เพื่อความปลอดภัยของข้อมูล ฟีเจอร์นี้ถูกจำกัดตามสิทธิ์ผู้ใช้
          </div>

          <Button variant="outline" className="text-blue-600 border-blue-300" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            กลับไปหน้าที่แล้ว
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const PermissionGate = ({
  permission,
  children,
  fallback,
  showFallback = true,
  requiredRole,
  feature
}) => {
  const { user } = useAuth();

  // If no user is logged in, deny access
  if (!user) {
    if (!showFallback) return null;
    return fallback || (
      <AccessDenied
        permission={permission}
        feature={feature}
        requiredRole={requiredRole}
        userRole="ไม่ได้เข้าสู่ระบบ"
      />
    );
  }

  // Check if user has the required permission
  const hasAccess = hasPermission(user.role_level, permission);

  if (hasAccess) {
    return <>{children}</>;
  }

  // Access denied
  if (!showFallback) return null;

  return fallback || (
    <AccessDenied
      permission={permission}
      feature={feature}
      requiredRole={requiredRole}
      userRole={user.role}
    />
  );
};

// Specialized components for common use cases
export const FinanceGate = ({
  children,
  compact = false
}) => (
  <PermissionGate
    permission="finance.view"
    feature="ระบบการเงิน"
    requiredRole="ผู้จัดการคลัง หรือสูงกว่า"
    fallback={compact ? <AccessDenied permission="finance.view" feature="ระบบการเงิน" compact /> : undefined}
  >
    {children}
  </PermissionGate>
);

export const SalesGate = ({
  children,
  compact = false
}) => (
  <PermissionGate
    permission="sales.create"
    feature="ระบบการขาย"
    requiredRole="หัวหน้าแผนก หรือสูงกว่า"
    fallback={compact ? <AccessDenied permission="sales.create" feature="ระบบการขาย" compact /> : undefined}
  >
    {children}
  </PermissionGate>
);

export const AccountingGate = ({
  children,
  compact = false
}) => (
  <PermissionGate
    permission="finance.accounting"
    feature="ระบบบัญชี"
    requiredRole="ผู้จัดการคลัง หรือสูงกว่า"
    fallback={compact ? <AccessDenied permission="finance.accounting" feature="ระบบบัญชี" compact /> : undefined}
  >
    {children}
  </PermissionGate>
);

export const FinancialReportsGate = ({
  children,
  compact = false
}) => (
  <PermissionGate
    permission="reports.financial"
    feature="รายงานการเงิน"
    requiredRole="หัวหน้าแผนก หรือสูงกว่า"
    fallback={compact ? <AccessDenied permission="reports.financial" feature="รายงานการเงิน" compact /> : undefined}
  >
    {children}
  </PermissionGate>
);

export const AdminGate = ({
  children,
  compact = false
}) => (
  <PermissionGate
    permission="admin.users"
    feature="การจัดการระบบ"
    requiredRole="ผู้ดูแลระบบ"
    fallback={compact ? <AccessDenied permission="admin.users" feature="การจัดการระบบ" compact /> : undefined}
  >
    {children}
  </PermissionGate>
);

// Hook for checking permissions in components
export const usePermissions = () => {
  const { user } = useAuth();

  return {
    hasPermission: (permission: string) => user ? hasPermission(user.role_level, permission) : false,
    canAccessFinance: user ? hasPermission(user.role_level, 'finance.view') : false,
    canManageSales: user ? hasPermission(user.role_level, 'sales.create') : false,
    canAccessAccounting: user ? hasPermission(user.role_level, 'finance.accounting') : false,
    canViewFinancialReports: user ? hasPermission(user.role_level, 'reports.financial') : false,
    canManageUsers: user ? hasPermission(user.role_level, 'admin.users') : false,
    userRole: user?.role || 'ไม่ได้เข้าสู่ระบบ',
    roleLevel: user?.role_level || 0
  };
};