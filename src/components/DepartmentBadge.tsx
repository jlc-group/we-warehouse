import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Crown, Package, Box, ShoppingCart, Calculator,
  User, Users, Building2, Shield, Settings
} from 'lucide-react';

// Department และ Role colors และ icons
const DEPARTMENT_CONFIG = {
  admin: {
    name: 'ผู้ดูแลระบบ',
    color: '#dc2626',
    bgColor: '#fee2e2',
    icon: Crown
  },
  warehouse_fg: {
    name: 'คลัง FG',
    color: '#2563eb',
    bgColor: '#dbeafe',
    icon: Package
  },
  warehouse_pk: {
    name: 'คลัง PK',
    color: '#16a34a',
    bgColor: '#dcfce7',
    icon: Box
  },
  sales: {
    name: 'ขาย',
    color: '#ea580c',
    bgColor: '#fed7aa',
    icon: ShoppingCart
  },
  accounting: {
    name: 'บัญชี',
    color: '#7c3aed',
    bgColor: '#e9d5ff',
    icon: Calculator
  }
} as const;

const ROLE_CONFIG = {
  // Admin roles
  super_admin: {
    name: 'ผู้ดูแลระบบสูงสุด',
    shortName: 'Super Admin',
    level: 100,
    type: 'admin',
    icon: Crown
  },

  // Manager roles
  warehouse_fg_manager: {
    name: 'หัวหน้าคลัง FG',
    shortName: 'หัวหน้า FG',
    level: 80,
    type: 'manager',
    icon: Package
  },
  warehouse_pk_manager: {
    name: 'หัวหน้าคลัง PK',
    shortName: 'หัวหน้า PK',
    level: 80,
    type: 'manager',
    icon: Box
  },
  sales_manager: {
    name: 'หัวหน้าขาย',
    shortName: 'หัวหน้าขาย',
    level: 70,
    type: 'manager',
    icon: ShoppingCart
  },
  accounting_manager: {
    name: 'หัวหน้าบัญชี',
    shortName: 'หัวหน้าบัญชี',
    level: 70,
    type: 'manager',
    icon: Calculator
  },

  // Staff roles
  warehouse_fg_staff: {
    name: 'พนักงานคลัง FG',
    shortName: 'พนักงาน FG',
    level: 40,
    type: 'staff',
    icon: User
  },
  warehouse_pk_staff: {
    name: 'พนักงานคลัง PK',
    shortName: 'พนักงาน PK',
    level: 40,
    type: 'staff',
    icon: User
  },
  sales_staff: {
    name: 'พนักงานขาย',
    shortName: 'พนักงานขาย',
    level: 30,
    type: 'staff',
    icon: Users
  },
  accounting_staff: {
    name: 'พนักงานบัญชี',
    shortName: 'พนักงานบัญชี',
    level: 30,
    type: 'staff',
    icon: Calculator
  }
} as const;

type Department = keyof typeof DEPARTMENT_CONFIG;
type Role = keyof typeof ROLE_CONFIG;

interface DepartmentBadgeProps {
  department: Department;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  variant?: 'default' | 'outline' | 'filled';
  className?: string;
}

interface RoleBadgeProps {
  role: Role;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showLevel?: boolean;
  variant?: 'default' | 'outline' | 'filled';
  className?: string;
}

interface PermissionLevelBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Department Badge Component
export function DepartmentBadge({
  department,
  size = 'md',
  showIcon = true,
  variant = 'filled',
  className = ''
}: DepartmentBadgeProps) {
  const config = DEPARTMENT_CONFIG[department];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const badgeStyle = variant === 'filled'
    ? {
        backgroundColor: config.bgColor,
        color: config.color,
        border: `1px solid ${config.color}20`
      }
    : variant === 'outline'
    ? {
        backgroundColor: 'transparent',
        color: config.color,
        border: `1px solid ${config.color}`
      }
    : {};

  return (
    <Badge
      variant="secondary"
      className={`${sizeClasses[size]} ${className} inline-flex items-center gap-1.5 font-medium`}
      style={badgeStyle}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.name}
    </Badge>
  );
}

// Role Badge Component
export function RoleBadge({
  role,
  size = 'md',
  showIcon = true,
  showLevel = true,
  variant = 'default',
  className = ''
}: RoleBadgeProps) {
  const roleConfig = ROLE_CONFIG[role];
  const Icon = roleConfig.icon;

  // Determine color based on role type
  const getTypeColor = (type: string, level: number) => {
    if (type === 'admin') return { color: '#dc2626', bg: '#fee2e2' };
    if (type === 'manager') return { color: '#2563eb', bg: '#dbeafe' };
    if (level >= 40) return { color: '#16a34a', bg: '#dcfce7' };
    return { color: '#6b7280', bg: '#f3f4f6' };
  };

  const colors = getTypeColor(roleConfig.type, roleConfig.level);

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const badgeStyle = variant === 'filled'
    ? {
        backgroundColor: colors.bg,
        color: colors.color,
        border: `1px solid ${colors.color}20`
      }
    : variant === 'outline'
    ? {
        backgroundColor: 'transparent',
        color: colors.color,
        border: `1px solid ${colors.color}`
      }
    : {};

  return (
    <Badge
      variant="secondary"
      className={`${sizeClasses[size]} ${className} inline-flex items-center gap-1.5 font-medium`}
      style={badgeStyle}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>{roleConfig.shortName}</span>
      {showLevel && (
        <span className="text-xs opacity-75 ml-1">
          L{roleConfig.level}
        </span>
      )}
    </Badge>
  );
}

// Permission Level Badge
export function PermissionLevelBadge({
  level,
  size = 'md',
  className = ''
}: PermissionLevelBadgeProps) {
  const getLevelConfig = (level: number) => {
    if (level >= 100) return { text: 'Super Admin', color: '#dc2626', bg: '#fee2e2', icon: Crown };
    if (level >= 80) return { text: 'Manager+', color: '#2563eb', bg: '#dbeafe', icon: Settings };
    if (level >= 70) return { text: 'Manager', color: '#059669', bg: '#d1fae5', icon: Building2 };
    if (level >= 50) return { text: 'Supervisor', color: '#d97706', bg: '#fef3c7', icon: Shield };
    if (level >= 30) return { text: 'Staff', color: '#6b7280', bg: '#f3f4f6', icon: User };
    return { text: 'Guest', color: '#9ca3af', bg: '#f9fafb', icon: User };
  };

  const config = getLevelConfig(level);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <Badge
      variant="secondary"
      className={`${sizeClasses[size]} ${className} inline-flex items-center gap-1.5 font-medium`}
      style={{
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.color}20`
      }}
    >
      <Icon className={iconSizes[size]} />
      <span>{config.text}</span>
      <span className="text-xs opacity-75 ml-1">
        {level}
      </span>
    </Badge>
  );
}

// Combined User Badge (Department + Role)
interface UserBadgeProps {
  department: Department;
  role: Role;
  size?: 'sm' | 'md' | 'lg';
  showBoth?: boolean;
  className?: string;
}

export function UserBadge({
  department,
  role,
  size = 'md',
  showBoth = true,
  className = ''
}: UserBadgeProps) {
  if (!showBoth) {
    return <RoleBadge role={role} size={size} className={className} />;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <DepartmentBadge department={department} size={size} />
      <RoleBadge role={role} size={size} showLevel={false} />
    </div>
  );
}

// Export configurations for use in other components
export { DEPARTMENT_CONFIG, ROLE_CONFIG };
export type { Department, Role };