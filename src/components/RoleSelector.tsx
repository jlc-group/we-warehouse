import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  User, Shield, Users, ShoppingCart, Calculator,
  Package, Box, Building2, Crown, UserCheck
} from 'lucide-react';

// Role definitions matching our access control system
const ROLES = {
  super_admin: {
    name: 'ผู้ดูแลระบบสูงสุด',
    department: 'ผู้ดูแลระบบ',
    level: 100,
    color: '#dc2626',
    icon: Crown,
    description: 'เข้าถึงได้ทุกฟังก์ชัน รวมถึงการจัดการผู้ใช้',
    permissions: ['ทุกสิทธิ์การเข้าถึง', 'จัดการผู้ใช้', 'ตั้งค่าระบบ', 'ดูรายงานทั้งหมด']
  },
  warehouse_fg_manager: {
    name: 'หัวหน้าคลัง FG',
    department: 'แผนกคลัง FG',
    level: 80,
    color: '#2563eb',
    icon: Package,
    description: 'จัดการสินค้าสำเร็จรูปและคลัง FG',
    permissions: ['จัดการสินค้า FG', 'จัดการคลัง FG', 'ประมวลผลคำสั่งซื้อ FG', 'รายงาน FG']
  },
  warehouse_pk_manager: {
    name: 'หัวหน้าคลัง PK',
    department: 'แผนกคลัง PK',
    level: 80,
    color: '#16a34a',
    icon: Box,
    description: 'จัดการวัสดุบรรจุภัณฑ์และคลัง PK',
    permissions: ['จัดการสินค้า PK', 'จัดการคลัง PK', 'ประมวลผลคำสั่งซื้อ PK', 'รายงาน PK']
  },
  sales_manager: {
    name: 'หัวหน้าขาย',
    department: 'แผนกขาย',
    level: 70,
    color: '#ea580c',
    icon: ShoppingCart,
    description: 'จัดการออเดอร์ ลูกค้า และรายงานการขาย',
    permissions: ['จัดการออเดอร์', 'จัดการลูกค้า', 'ดูสต็อกทั้งหมด', 'รายงานการขาย']
  },
  accounting_manager: {
    name: 'หัวหน้าบัญชี',
    department: 'แผนกบัญชี',
    level: 70,
    color: '#7c3aed',
    icon: Calculator,
    description: 'จัดการข้อมูลทางการเงินและรายงานบัญชี',
    permissions: ['ดูข้อมูลการเงิน', 'จัดการเครดิตลูกค้า', 'รายงานทางการเงิน', 'ตรวจสอบต้นทุน']
  },
  warehouse_fg_staff: {
    name: 'พนักงานคลัง FG',
    department: 'แผนกคลัง FG',
    level: 40,
    color: '#2563eb',
    icon: User,
    description: 'พนักงานปฏิบัติการคลัง FG',
    permissions: ['ดูสินค้า FG', 'อัปเดตสินค้า FG', 'สแกน QR', 'บันทึกการเคลื่อนไหวสินค้า']
  },
  warehouse_pk_staff: {
    name: 'พนักงานคลัง PK',
    department: 'แผนกคลัง PK',
    level: 40,
    color: '#16a34a',
    icon: User,
    description: 'พนักงานปฏิบัติการคลัง PK',
    permissions: ['ดูสินค้า PK', 'อัปเดตสินค้า PK', 'สแกน QR', 'บันทึกการเคลื่อนไหวสินค้า']
  },
  sales_staff: {
    name: 'พนักงานขาย',
    department: 'แผนกขาย',
    level: 30,
    color: '#ea580c',
    icon: Users,
    description: 'พนักงานขายและดูแลลูกค้า',
    permissions: ['สร้างออเดอร์', 'ดูลูกค้า', 'ตรวจสอบสต็อก', 'รายงานขายพื้นฐาน']
  },
  accounting_staff: {
    name: 'พนักงานบัญชี',
    department: 'แผนกบัญชี',
    level: 30,
    color: '#7c3aed',
    icon: Calculator,
    description: 'พนักงานบัญชีและการเงิน',
    permissions: ['ดูข้อมูลการเงิน', 'ดูต้นทุนสินค้า', 'รายงานบัญชีพื้นฐาน']
  }
} as const;

type RoleKey = keyof typeof ROLES;

interface RoleSelectorProps {
  onRoleSelect?: (role: RoleKey, roleName: string) => void;
  currentRole?: RoleKey | null;
  showDemo?: boolean;
}

export function RoleSelector({ onRoleSelect, currentRole, showDemo = true }: RoleSelectorProps) {
  const [selectedRole, setSelectedRole] = useState<RoleKey | ''>('');
  const [showDetails, setShowDetails] = useState<RoleKey | null>(null);

  const handleRoleChange = (value: string) => {
    const role = value as RoleKey;
    setSelectedRole(role);
    if (onRoleSelect && role) {
      onRoleSelect(role, ROLES[role].name);
    }
  };

  const handleQuickSelect = (role: RoleKey) => {
    setSelectedRole(role);
    if (onRoleSelect) {
      onRoleSelect(role, ROLES[role].name);
    }
  };

  const groupedRoles = {
    admin: ['super_admin'] as RoleKey[],
    managers: ['warehouse_fg_manager', 'warehouse_pk_manager', 'sales_manager', 'accounting_manager'] as RoleKey[],
    staff: ['warehouse_fg_staff', 'warehouse_pk_staff', 'sales_staff', 'accounting_staff'] as RoleKey[]
  };

  return (
    <div className="space-y-6">
      {/* Quick Role Selection */}
      {showDemo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              เลือกบทบาทการใช้งาน
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              เลือกบทบาทเพื่อทดสอบระบบควบคุมการเข้าถึง
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Dropdown Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">เลือกบทบาท</label>
              <Select value={selectedRole} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกบทบาทของคุณ" />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2 text-xs font-semibold text-muted-foreground">ผู้บริหาร</div>
                  {groupedRoles.admin.map((role) => {
                    const roleData = ROLES[role];
                    const Icon = roleData.icon;
                    return (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" style={{ color: roleData.color }} />
                          <span>{roleData.name}</span>
                          <Badge variant="outline" className="ml-auto">
                            Level {roleData.level}
                          </Badge>
                        </div>
                      </SelectItem>
                    );
                  })}

                  <Separator className="my-2" />
                  <div className="p-2 text-xs font-semibold text-muted-foreground">หัวหน้าแผนก</div>
                  {groupedRoles.managers.map((role) => {
                    const roleData = ROLES[role];
                    const Icon = roleData.icon;
                    return (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" style={{ color: roleData.color }} />
                          <span>{roleData.name}</span>
                          <Badge variant="outline" className="ml-auto">
                            Level {roleData.level}
                          </Badge>
                        </div>
                      </SelectItem>
                    );
                  })}

                  <Separator className="my-2" />
                  <div className="p-2 text-xs font-semibold text-muted-foreground">พนักงานปฏิบัติการ</div>
                  {groupedRoles.staff.map((role) => {
                    const roleData = ROLES[role];
                    const Icon = roleData.icon;
                    return (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" style={{ color: roleData.color }} />
                          <span>{roleData.name}</span>
                          <Badge variant="outline" className="ml-auto">
                            Level {roleData.level}
                          </Badge>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Role Details */}
            {selectedRole && (
              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-3 mb-3">
                  {React.createElement(ROLES[selectedRole].icon, {
                    className: "h-5 w-5",
                    style: { color: ROLES[selectedRole].color }
                  })}
                  <div>
                    <h4 className="font-medium">{ROLES[selectedRole].name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {ROLES[selectedRole].department} • Level {ROLES[selectedRole].level}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="ml-auto"
                    style={{ backgroundColor: `${ROLES[selectedRole].color}20`, color: ROLES[selectedRole].color }}
                  >
                    {ROLES[selectedRole].level >= 80 ? 'Manager' : ROLES[selectedRole].level >= 50 ? 'Supervisor' : 'Staff'}
                  </Badge>
                </div>

                <p className="text-sm mb-3">{ROLES[selectedRole].description}</p>

                <div>
                  <p className="text-sm font-medium mb-2">สิทธิ์การเข้าถึง:</p>
                  <div className="flex flex-wrap gap-1">
                    {ROLES[selectedRole].permissions.map((permission, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {permission}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Current Role Display */}
            {currentRole && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <UserCheck className="h-4 w-4 text-green-600" />
                <span className="text-sm">
                  <strong>บทบาทปัจจุบัน:</strong> {ROLES[currentRole].name}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Access Cards (Optional) */}
      {showDemo && (
        <Card>
          <CardHeader>
            <CardTitle>เข้าใช้งานด่วน</CardTitle>
            <p className="text-sm text-muted-foreground">
              คลิกเพื่อเข้าใช้งานในบทบาทที่เลือก
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(['super_admin', 'warehouse_fg_manager', 'sales_manager', 'warehouse_fg_staff', 'sales_staff'] as RoleKey[]).map((role) => {
                const roleData = ROLES[role];
                const Icon = roleData.icon;

                return (
                  <Button
                    key={role}
                    variant={selectedRole === role ? "default" : "outline"}
                    className="h-auto p-3 flex flex-col items-center gap-2"
                    onClick={() => handleQuickSelect(role)}
                  >
                    <Icon className="h-5 w-5" style={{ color: selectedRole === role ? 'white' : roleData.color }} />
                    <div className="text-center">
                      <div className="text-xs font-medium">{roleData.name}</div>
                      <div className="text-xs opacity-70">{roleData.department}</div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}