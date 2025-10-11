import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  PieChart,
  Package,
  Warehouse,
  CreditCard,
  BarChart3,
  Settings,
  MoreHorizontal,
  type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavButtonProps {
  icon: LucideIcon;
  label: string;
  value: string;
  active?: boolean;
  badge?: string;
  onClick: () => void;
  color?: string;
}

function NavButton({ icon: Icon, label, value, active, badge, onClick, color }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center h-full relative',
        'transition-colors duration-200',
        active
          ? `bg-${color || 'blue'}-50`
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      )}
      style={active ? { color: color || '#3b82f6' } : undefined}
    >
      <div className="relative">
        <Icon className={cn(
          'h-5 w-5',
          active && color
        )} />
        {badge && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-4 min-w-[16px] px-1 text-[10px] flex items-center justify-center"
          >
            {badge}
          </Badge>
        )}
      </div>
      <span className={cn(
        'text-[10px] mt-1 font-medium'
      )}>
        {label}
      </span>
      {active && (
        <div className="absolute top-0 inset-x-0 h-0.5" style={{ backgroundColor: color || '#3b82f6' }} />
      )}
    </button>
  );
}

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onMoreClick: () => void;
  unreadCount?: number;
}

/**
 * Bottom Navigation Bar สำหรับ Mobile
 * แสดง 5 เมนูหลัก (ทุกคนเข้าถึงได้เหมือน Desktop)
 */
export function MobileBottomNav({
  activeTab,
  onTabChange,
  onMoreClick,
  unreadCount
}: MobileBottomNavProps) {
  // Define all tabs - everyone can access (same as desktop)
  const allTabs = [
    { value: 'overview', icon: PieChart, label: 'ภาพรวม' },
    { value: 'warehouse', icon: Warehouse, label: 'คลังสินค้า', color: '#16a34a' },
    { value: 'finance', icon: CreditCard, label: 'การเงิน', color: '#ca8a04' },
    { value: 'reports', icon: BarChart3, label: 'รายงาน', color: '#2563eb' },
    { value: 'tools', icon: Settings, label: 'เครื่องมือ' },
  ];

  // Show up to 4 tabs + More button
  const mainTabs = allTabs.slice(0, 4);
  const hasMore = allTabs.length > 4;

  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-50 safe-area-inset-bottom">
      <div className={`grid ${hasMore ? 'grid-cols-5' : `grid-cols-${mainTabs.length}`} h-16 max-w-[600px] mx-auto`}>
        {mainTabs.map((tab) => (
          <NavButton
            key={tab.value}
            icon={tab.icon}
            label={tab.label}
            value={tab.value}
            active={activeTab === tab.value}
            color={tab.color}
            onClick={() => onTabChange(tab.value)}
          />
        ))}

        {/* More Button - only show if there are hidden tabs */}
        {hasMore && (
          <button
            onClick={onMoreClick}
            className="flex flex-col items-center justify-center h-full relative text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200"
          >
            <div className="relative">
              <MoreHorizontal className="h-5 w-5" />
              {unreadCount && unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-4 min-w-[16px] px-1 text-[10px] flex items-center justify-center"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </div>
            <span className="text-[10px] mt-1 font-medium">เพิ่มเติม</span>
          </button>
        )}
      </div>
    </div>
  );
}
