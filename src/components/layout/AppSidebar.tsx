/**
 * AppSidebar - Sidebar หลักของแอพ (Redesigned)
 */

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  PackagePlus,
  BarChart3,
  Grid3X3,
  Table,
  QrCode,
  Warehouse,
  MapPin,
  Truck,
  FileText,
  TrendingUp,
  Users,
  Home,
  ClipboardList,
  Send,
  ArrowRightLeft,
  Database,
  History,
  LayoutDashboard,
  BoxesIcon,
  Settings,
  LogOut,
  ChevronRight,
  Brain
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContextSimple';
import { cn } from '@/lib/utils';

interface MenuItem {
  title: string;
  icon: React.ElementType;
  value: string;
  badge?: string;
  badgeColor?: string;
}

interface MenuGroup {
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    label: 'หน้าหลัก',
    icon: Home,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    items: [
      { title: 'ภาพรวม', icon: LayoutDashboard, value: 'overview' },
      { title: 'สรุปสต็อก', icon: BoxesIcon, value: 'stock-overview' },
    ]
  },
  {
    label: 'คลังสินค้า',
    icon: Warehouse,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    items: [
      { title: 'รายการสินค้า', icon: Table, value: 'inventory' },
      { title: 'จัดการสินค้า', icon: PackagePlus, value: 'product-management', badge: 'เพิ่ม/แก้ไข', badgeColor: 'bg-emerald-500' },
      { title: 'แผนผังคลัง', icon: Grid3X3, value: 'shelf' },
      { title: 'จัดการ Location', icon: MapPin, value: 'locations' },
      { title: 'Stock Card', icon: FileText, value: 'stock-card' },
    ]
  },
  {
    label: 'การส่งออก',
    icon: Truck,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    items: [
      { title: 'รายการส่งของ', icon: ClipboardList, value: 'packing-list', badge: 'Picking' },
      { title: 'สรุปส่ง Csmile', icon: Send, value: 'daily-shipment', badge: 'ใหม่', badgeColor: 'bg-green-500' },
    ]
  },
  {
    label: 'การเงิน',
    icon: TrendingUp,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    items: [
      { title: 'รายงานการเงิน', icon: TrendingUp, value: 'finance' },
      { title: 'วิเคราะห์ยอดขาย', icon: BarChart3, value: 'analytics' },
      { title: 'AI Analytics Lab', icon: Brain, value: 'ai-lab', badge: 'AI', badgeColor: 'bg-indigo-600' },
    ]
  },
  {
    label: 'เครื่องมือ',
    icon: Settings,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    items: [
      { title: 'QR Code', icon: QrCode, value: 'qr-management' },
      { title: 'โอนย้ายสินค้า', icon: ArrowRightLeft, value: 'transfer' },
      { title: 'ประวัติ', icon: History, value: 'logs' },
    ]
  },
  {
    label: 'ตั้งค่า',
    icon: Database,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    items: [
      { title: 'จัดการผู้ใช้', icon: Users, value: 'users' },
      { title: 'ข้อมูลระบบ', icon: Database, value: 'database' },
    ]
  }
];

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
  const { user, logout } = useAuth();

  return (
    <Sidebar className="border-r-2 border-slate-200">
      {/* Header */}
      <SidebarHeader className="border-b-2 border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex items-center gap-3 px-4 py-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
            <Warehouse className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">WE Warehouse</h1>
            <p className="text-xs text-slate-400">ระบบจัดการคลังสินค้า</p>
          </div>
        </div>
      </SidebarHeader>

      {/* Content */}
      <SidebarContent className="bg-gradient-to-b from-slate-50 to-white">
        {menuGroups.map((group, groupIndex) => (
          <SidebarGroup key={group.label} className="px-3 py-2">
            {/* Group Label */}
            <SidebarGroupLabel className="px-3 py-2 mb-1">
              <div className={cn(
                "flex items-center gap-2 px-2 py-1 rounded-lg",
                group.bgColor
              )}>
                <group.icon className={cn("h-4 w-4", group.color)} />
                <span className={cn("text-xs font-semibold uppercase tracking-wider", group.color)}>
                  {group.label}
                </span>
              </div>
            </SidebarGroupLabel>
            
            {/* Menu Items */}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = activeTab === item.value;
                  return (
                    <SidebarMenuItem key={item.value}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => onTabChange(item.value)}
                        className={cn(
                          "w-full justify-start rounded-xl transition-all duration-200",
                          "hover:bg-slate-100 hover:shadow-sm",
                          isActive && "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/25 hover:from-blue-600 hover:to-indigo-700"
                        )}
                      >
                        <div className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-lg mr-2",
                          isActive ? "bg-white/20" : "bg-slate-100"
                        )}>
                          <item.icon className={cn(
                            "h-4 w-4",
                            isActive ? "text-white" : "text-slate-600"
                          )} />
                        </div>
                        <span className={cn(
                          "font-medium",
                          isActive ? "text-white" : "text-slate-700"
                        )}>
                          {item.title}
                        </span>
                        {item.badge && (
                          <Badge 
                            className={cn(
                              "ml-auto text-[10px] px-2 py-0.5 font-semibold",
                              item.badgeColor || "bg-blue-500",
                              "text-white border-0"
                            )}
                          >
                            {item.badge}
                          </Badge>
                        )}
                        {isActive && (
                          <ChevronRight className="ml-auto h-4 w-4 text-white/70" />
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
            
            {groupIndex < menuGroups.length - 1 && (
              <Separator className="mt-3 bg-slate-200" />
            )}
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t-2 border-slate-200 bg-gradient-to-br from-slate-100 to-slate-50">
        <div className="p-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white shadow-sm border border-slate-200">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 text-white text-sm font-bold shadow-md">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {user?.email?.split('@')[0] || 'Guest'}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {user?.role || 'User'}
              </p>
            </div>
            <button
              onClick={() => logout()}
              className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
              title="ออกจากระบบ"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
