import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContextSimple';
import { LoginForm } from './LoginForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Package, Shield, AlertTriangle, Users, Settings } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
  requiredPermission?: string;
  requiredRole?: string;
  minimumRoleLevel?: number;
  requiredDepartment?: string;
  fallbackMessage?: string;
}

export function AuthGuard({
  children,
  requiredPermission,
  requiredRole,
  minimumRoleLevel,
  requiredDepartment,
  fallbackMessage,
}: AuthGuardProps) {
  const {
    user,
    loading,
    hasPermission,
    hasRole,
    hasMinimumRole,
    isInDepartment,
  } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-sm">
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
              <p className="text-sm text-muted-foreground">กำลังตรวจสอบสิทธิ์...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If not authenticated, show login form
  if (!user) {
    return <LoginForm />;
  }

  // Check if user is active
  if (user && !user.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="bg-red-600 p-3 rounded-full">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-center">บัญชีถูกปิดใช้งาน</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                บัญชีของคุณถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check specific permission
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <UnauthorizedAccess
        title="ไม่มีสิทธิ์เข้าถึง"
        message={fallbackMessage || `คุณไม่มีสิทธิ์: ${requiredPermission}`}
        icon={<Shield className="h-6 w-6 text-white" />}
        profile={user}
      />
    );
  }

  // Check specific role
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <UnauthorizedAccess
        title="สิทธิ์ไม่เพียงพอ"
        message={fallbackMessage || `คุณต้องมีสิทธิ์: ${requiredRole}`}
        icon={<Users className="h-6 w-6 text-white" />}
        profile={user}
      />
    );
  }

  // Check minimum role level
  if (minimumRoleLevel && !hasMinimumRole(minimumRoleLevel)) {
    return (
      <UnauthorizedAccess
        title="ระดับสิทธิ์ไม่เพียงพอ"
        message={fallbackMessage || `คุณต้องมีสิทธิ์ระดับ ${minimumRoleLevel} ขึ้นไป`}
        icon={<Users className="h-6 w-6 text-white" />}
        profile={user}
      />
    );
  }

  // Check department requirement
  if (requiredDepartment && !isInDepartment(requiredDepartment)) {
    return (
      <UnauthorizedAccess
        title="แผนกไม่ถูกต้อง"
        message={fallbackMessage || `คุณต้องอยู่ในแผนก: ${requiredDepartment}`}
        icon={<Package className="h-6 w-6 text-white" />}
        profile={user}
      />
    );
  }

  // If all checks pass, render the protected content
  return <>{children}</>;
}

// Unauthorized access component
interface UnauthorizedAccessProps {
  title: string;
  message: string;
  icon: ReactNode;
  profile: any;
}

function UnauthorizedAccess({ title, message, icon, profile }: UnauthorizedAccessProps) {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="bg-red-600 p-3 rounded-full">
              {icon}
            </div>
          </div>
          <CardTitle className="text-center">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>

          <div className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-lg">
            <p><strong>ข้อมูลบัญชีของคุณ:</strong></p>
            <p>อีเมล: {profile?.email}</p>
            <p>แผนก: {profile?.department || 'ไม่ระบุ'}</p>
            <p>สิทธิ์: {profile?.role || 'ไม่ระบุ'}</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => window.history.back()}
              className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              กลับ
            </button>
            <button
              onClick={() => signOut()}
              className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              ออกจากระบบ
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}