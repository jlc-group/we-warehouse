import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  PieChart,
  Package,
  Table,
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
}

function NavButton({ icon: Icon, label, value, active, badge, onClick }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center h-full relative',
        'transition-colors duration-200',
        active
          ? 'text-primary bg-blue-50'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      )}
    >
      <div className="relative">
        <Icon className={cn(
          'h-5 w-5',
          active && 'text-primary'
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
        'text-[10px] mt-1 font-medium',
        active && 'text-primary'
      )}>
        {label}
      </span>
      {active && (
        <div className="absolute top-0 inset-x-0 h-0.5 bg-primary" />
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
 * แสดง 4 เมนูหลัก + ปุ่ม More
 */
export function MobileBottomNav({
  activeTab,
  onTabChange,
  onMoreClick,
  unreadCount
}: MobileBottomNavProps) {
  const mainTabs = [
    { value: 'overview', icon: PieChart, label: 'หน้าแรก' },
    { value: 'packing-list', icon: Package, label: 'ส่งของ' },
    { value: 'table', icon: Table, label: 'ตาราง' },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-50 safe-area-inset-bottom">
      <div className="grid grid-cols-4 h-16 max-w-[600px] mx-auto">
        {mainTabs.map((tab) => (
          <NavButton
            key={tab.value}
            icon={tab.icon}
            label={tab.label}
            value={tab.value}
            active={activeTab === tab.value}
            onClick={() => onTabChange(tab.value)}
          />
        ))}

        {/* More Button */}
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
      </div>
    </div>
  );
}
