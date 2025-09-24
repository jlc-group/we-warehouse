import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RoleSelector } from '@/components/RoleSelector';
import { PermissionGate, PermissionDebug, usePermissionCheck } from '@/components/PermissionGate';
import { DepartmentBadge, RoleBadge, PermissionLevelBadge, UserBadge } from '@/components/DepartmentBadge';
import {
  Shield, Eye, Edit, Trash2, Plus, Settings,
  Package, Box, ShoppingCart, Calculator,
  Lock, Unlock, AlertTriangle, CheckCircle
} from 'lucide-react';

// Mock role state (ในการใช้งานจริงจะใช้ Context)
type RoleKey =
  | 'super_admin'
  | 'warehouse_fg_manager' | 'warehouse_pk_manager'
  | 'sales_manager' | 'accounting_manager'
  | 'warehouse_fg_staff' | 'warehouse_pk_staff'
  | 'sales_staff' | 'accounting_staff';

export function AccessControlDemo() {
  const [currentRole, setCurrentRole] = useState<RoleKey | null>(null);
  const [selectedTab, setSelectedTab] = useState('role-selection');

  // Mock permission checking based on selected role
  const getMockPermissions = (role: RoleKey | null) => {
    if (!role) return {};

    const permissions: Record<string, boolean> = {};

    // Super Admin gets everything
    if (role === 'super_admin') {
      return {
        'admin.full_access': true,
        'inventory.fg.full_access': true,
        'inventory.pk.full_access': true,
        'inventory.all.view': true,
        'orders.all.full_access': true,
        'customers.full_access': true,
        'analytics.full_access': true,
        'users.manage': true,
        'system.settings': true
      };
    }

    // FG permissions
    if (role.includes('fg')) {
      permissions['inventory.fg.view'] = true;
      permissions['inventory.fg.update'] = role.includes('manager');
      permissions['inventory.fg.full_access'] = role.includes('manager');
    }

    // PK permissions
    if (role.includes('pk')) {
      permissions['inventory.pk.view'] = true;
      permissions['inventory.pk.update'] = role.includes('manager');
      permissions['inventory.pk.full_access'] = role.includes('manager');
    }

    // Sales permissions
    if (role.includes('sales')) {
      permissions['orders.view'] = true;
      permissions['orders.create'] = true;
      permissions['customers.view'] = true;
      permissions['inventory.all.view'] = true;
      permissions['orders.full_access'] = role.includes('manager');
    }

    // Accounting permissions
    if (role.includes('accounting')) {
      permissions['orders.financial.view'] = true;
      permissions['customers.financial.view'] = true;
      permissions['inventory.costs.view'] = true;
    }

    return permissions;
  };

  const mockPermissions = getMockPermissions(currentRole);

  const handleRoleSelect = (role: RoleKey, roleName: string) => {
    setCurrentRole(role);
    setSelectedTab('permissions');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            ระบบควบคุมการเข้าถึง (Access Control System)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            ทดสอบและแสดงความสามารถของระบบควบคุมการเข้าถึงตามแผนกและบทบาท
          </p>
        </CardHeader>
      </Card>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="role-selection">เลือกบทบาท</TabsTrigger>
          <TabsTrigger value="permissions">สิทธิ์การเข้าถึง</TabsTrigger>
          <TabsTrigger value="ui-demo">Demo UI</TabsTrigger>
          <TabsTrigger value="badges">Badge Components</TabsTrigger>
        </TabsList>

        <TabsContent value="role-selection">
          <RoleSelector
            onRoleSelect={handleRoleSelect}
            currentRole={currentRole}
            showDemo={true}
          />
        </TabsContent>

        <TabsContent value="permissions">
          <div className="space-y-4">
            {currentRole ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      บทบาทปัจจุบัน
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <UserBadge
                        department={currentRole.includes('admin') ? 'admin' :
                                  currentRole.includes('fg') ? 'warehouse_fg' :
                                  currentRole.includes('pk') ? 'warehouse_pk' :
                                  currentRole.includes('sales') ? 'sales' : 'accounting'}
                        role={currentRole}
                        size="lg"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>รายละเอียดสิทธิ์</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(mockPermissions).map(([permission, hasAccess]) => (
                        <div
                          key={permission}
                          className={`p-3 rounded-lg border ${
                            hasAccess
                              ? 'bg-green-50 border-green-200'
                              : 'bg-red-50 border-red-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {hasAccess ? (
                              <Unlock className="h-4 w-4 text-green-600" />
                            ) : (
                              <Lock className="h-4 w-4 text-red-600" />
                            )}
                            <span className="text-sm font-medium">
                              {permission}
                            </span>
                          </div>
                          <div className={`text-xs ${hasAccess ? 'text-green-700' : 'text-red-700'}`}>
                            {hasAccess ? 'อนุญาต' : 'ไม่อนุญาต'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <AlertTriangle className="h-12 w-12 text-orange-500 mb-4" />
                  <h3 className="text-lg font-medium mb-2">กรุณาเลือกบทบาท</h3>
                  <p className="text-sm text-muted-foreground mb-4 text-center">
                    กลับไปที่แท็บ "เลือกบทบาท" เพื่อเลือกบทบาทที่ต้องการทดสอบ
                  </p>
                  <Button onClick={() => setSelectedTab('role-selection')}>
                    เลือกบทบาท
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="ui-demo">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>ตัวอย่างการใช้งาน Permission Gate</CardTitle>
                <p className="text-sm text-muted-foreground">
                  UI Elements จะแสดง/ซ่อนตามสิทธิ์ของบทบาทที่เลือก
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* สินค้า FG Section */}
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-3">
                    <Package className="h-4 w-4 text-blue-600" />
                    การจัดการสินค้าสำเร็จรูป (FG)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <MockPermissionGate permission="inventory.fg.view" hasPermission={mockPermissions['inventory.fg.view']}>
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="h-4 w-4 mr-2" />
                        ดูสินค้า FG
                      </Button>
                    </MockPermissionGate>

                    <MockPermissionGate permission="inventory.fg.update" hasPermission={mockPermissions['inventory.fg.update']}>
                      <Button variant="outline" size="sm" className="w-full">
                        <Edit className="h-4 w-4 mr-2" />
                        แก้ไขสินค้า FG
                      </Button>
                    </MockPermissionGate>

                    <MockPermissionGate permission="inventory.fg.full_access" hasPermission={mockPermissions['inventory.fg.full_access']}>
                      <Button variant="outline" size="sm" className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        เพิ่มสินค้า FG
                      </Button>
                    </MockPermissionGate>

                    <MockPermissionGate permission="inventory.fg.full_access" hasPermission={mockPermissions['inventory.fg.full_access']}>
                      <Button variant="outline" size="sm" className="w-full">
                        <Trash2 className="h-4 w-4 mr-2" />
                        ลบสินค้า FG
                      </Button>
                    </MockPermissionGate>
                  </div>
                </div>

                <Separator />

                {/* สินค้า PK Section */}
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-3">
                    <Box className="h-4 w-4 text-green-600" />
                    การจัดการวัสดุบรรจุภัณฑ์ (PK)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <MockPermissionGate permission="inventory.pk.view" hasPermission={mockPermissions['inventory.pk.view']}>
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="h-4 w-4 mr-2" />
                        ดูสินค้า PK
                      </Button>
                    </MockPermissionGate>

                    <MockPermissionGate permission="inventory.pk.update" hasPermission={mockPermissions['inventory.pk.update']}>
                      <Button variant="outline" size="sm" className="w-full">
                        <Edit className="h-4 w-4 mr-2" />
                        แก้ไขสินค้า PK
                      </Button>
                    </MockPermissionGate>

                    <MockPermissionGate permission="inventory.pk.full_access" hasPermission={mockPermissions['inventory.pk.full_access']}>
                      <Button variant="outline" size="sm" className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        เพิ่มสินค้า PK
                      </Button>
                    </MockPermissionGate>

                    <MockPermissionGate permission="inventory.pk.full_access" hasPermission={mockPermissions['inventory.pk.full_access']}>
                      <Button variant="outline" size="sm" className="w-full">
                        <Trash2 className="h-4 w-4 mr-2" />
                        ลบสินค้า PK
                      </Button>
                    </MockPermissionGate>
                  </div>
                </div>

                <Separator />

                {/* Admin Section */}
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-3">
                    <Settings className="h-4 w-4 text-red-600" />
                    การจัดการระบบ
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <MockPermissionGate permission="users.manage" hasPermission={mockPermissions['users.manage']}>
                      <Button variant="outline" size="sm" className="w-full">
                        <Users className="h-4 w-4 mr-2" />
                        จัดการผู้ใช้
                      </Button>
                    </MockPermissionGate>

                    <MockPermissionGate permission="system.settings" hasPermission={mockPermissions['system.settings']}>
                      <Button variant="outline" size="sm" className="w-full">
                        <Settings className="h-4 w-4 mr-2" />
                        ตั้งค่าระบบ
                      </Button>
                    </MockPermissionGate>

                    <MockPermissionGate permission="admin.full_access" hasPermission={mockPermissions['admin.full_access']}>
                      <Button variant="outline" size="sm" className="w-full">
                        <Shield className="h-4 w-4 mr-2" />
                        Admin Panel
                      </Button>
                    </MockPermissionGate>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="badges">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Badge Components</CardTitle>
                <p className="text-sm text-muted-foreground">
                  แสดงตัวอย่างการใช้งาน Badge Components สำหรับแสดงแผนก บทบาท และระดับสิทธิ์
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Department Badges */}
                <div>
                  <h4 className="font-medium mb-3">Department Badges</h4>
                  <div className="flex flex-wrap gap-3">
                    <DepartmentBadge department="admin" />
                    <DepartmentBadge department="warehouse_fg" />
                    <DepartmentBadge department="warehouse_pk" />
                    <DepartmentBadge department="sales" />
                    <DepartmentBadge department="accounting" />
                  </div>
                </div>

                <Separator />

                {/* Role Badges */}
                <div>
                  <h4 className="font-medium mb-3">Role Badges</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Manager Roles</p>
                      <div className="flex flex-wrap gap-2">
                        <RoleBadge role="super_admin" />
                        <RoleBadge role="warehouse_fg_manager" />
                        <RoleBadge role="warehouse_pk_manager" />
                        <RoleBadge role="sales_manager" />
                        <RoleBadge role="accounting_manager" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Staff Roles</p>
                      <div className="flex flex-wrap gap-2">
                        <RoleBadge role="warehouse_fg_staff" />
                        <RoleBadge role="warehouse_pk_staff" />
                        <RoleBadge role="sales_staff" />
                        <RoleBadge role="accounting_staff" />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Permission Level Badges */}
                <div>
                  <h4 className="font-medium mb-3">Permission Level Badges</h4>
                  <div className="flex flex-wrap gap-3">
                    <PermissionLevelBadge level={100} />
                    <PermissionLevelBadge level={80} />
                    <PermissionLevelBadge level={70} />
                    <PermissionLevelBadge level={40} />
                    <PermissionLevelBadge level={30} />
                    <PermissionLevelBadge level={10} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Mock Permission Gate for demo purposes
function MockPermissionGate({
  children,
  permission,
  hasPermission,
}: {
  children: React.ReactNode;
  permission: string;
  hasPermission?: boolean;
}) {
  if (!hasPermission) {
    return (
      <div className="relative">
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Lock className="h-4 w-4 text-red-500" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}