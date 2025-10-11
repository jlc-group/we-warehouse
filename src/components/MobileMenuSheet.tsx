import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  QrCode,
  Warehouse,
  BarChart3,
  Archive,
  Truck,
  PackagePlus,
  CreditCard,
  Grid3X3,
  ChevronRight,
  type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItem {
  value: string;
  icon: LucideIcon;
  label: string;
  description?: string;
  badge?: string;
  color?: string;
}

interface MenuItemButtonProps extends MenuItem {
  active?: boolean;
  onClick: () => void;
}

function MenuItemButton({
  icon: Icon,
  label,
  description,
  badge,
  color,
  active,
  onClick
}: MenuItemButtonProps) {
  return (
    <Button
      variant={active ? 'secondary' : 'ghost'}
      className={cn(
        'w-full justify-start h-auto p-4 transition-all',
        active && 'bg-blue-50 border-l-4 border-primary',
        color && !active && `hover:bg-${color}-50`
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 w-full">
        <div className={cn(
          'flex items-center justify-center w-10 h-10 rounded-lg',
          color ? `bg-${color}-100` : 'bg-gray-100'
        )}>
          <Icon className={cn(
            'h-5 w-5',
            color ? `text-${color}-600` : 'text-gray-600',
            active && 'text-primary'
          )} />
        </div>

        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{label}</span>
            {badge && (
              <Badge variant="secondary" className="text-[10px] h-5">
                {badge}
              </Badge>
            )}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {description}
            </p>
          )}
        </div>

        <ChevronRight className="h-4 w-4 text-gray-400" />
      </div>
    </Button>
  );
}

interface MobileMenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

/**
 * Mobile Menu Sheet - แสดงเมนูทั้งหมดที่ไม่อยู่ใน Bottom Nav
 */
export function MobileMenuSheet({
  open,
  onOpenChange,
  activeTab,
  onTabChange
}: MobileMenuSheetProps) {
  const menuSections = [
    {
      title: 'การจัดการ',
      items: [
        {
          value: 'qr',
          icon: QrCode,
          label: 'QR & ตำแหน่ง',
          description: 'สแกน QR และจัดการตำแหน่งคลัง',
          color: 'purple'
        },
        {
          value: 'warehouse-management',
          icon: Warehouse,
          label: 'จัดการคลัง',
          description: 'จัดการคลังสินค้าและ warehouse',
          color: 'green'
        },
        {
          value: 'transfers',
          icon: Truck,
          label: 'จัดการการย้าย',
          description: 'ย้ายสินค้าระหว่างคลังและแผนก',
          color: 'orange'
        },
        {
          value: 'inbound-outbound',
          icon: PackagePlus,
          label: 'รับเข้า-ส่งออก',
          description: 'จัดการสินค้ารับเข้าและส่งออก',
          color: 'teal'
        },
      ]
    },
    {
      title: 'ข้อมูลและรายงาน',
      items: [
        {
          value: 'stock-overview',
          icon: Grid3X3,
          label: 'สรุปสต็อก',
          description: 'ภาพรวมสต็อกทั้งหมด',
          color: 'blue'
        },
        {
          value: 'analytics',
          icon: BarChart3,
          label: 'Analytics & แผนก',
          description: 'วิเคราะห์ข้อมูลและแผนกต่าง ๆ',
          color: 'indigo'
        },
        {
          value: 'history',
          icon: Archive,
          label: 'ประวัติ',
          description: 'ประวัติการเคลื่อนไหวและเหตุการณ์',
          color: 'gray'
        },
      ]
    },
    {
      title: 'การเงิน',
      items: [
        {
          value: 'bill-clearing',
          icon: CreditCard,
          label: 'เคลียร์บิล',
          description: 'จัดการและเคลียร์บิล',
          color: 'red'
        },
        {
          value: 'bill-status',
          icon: BarChart3,
          label: 'ตรวจสอบสถานะ',
          description: 'ตรวจสอบสถานะบิลและคำสั่งซื้อ',
          color: 'purple'
        },
      ]
    }
  ];

  const handleMenuClick = (value: string) => {
    onTabChange(value);
    onOpenChange(false); // ปิด sheet หลังเลือก
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[85vh] rounded-t-xl p-0 overflow-hidden"
      >
        <SheetHeader className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <SheetTitle className="text-lg font-semibold flex items-center gap-2">
            📱 เมนูทั้งหมด
          </SheetTitle>
          <p className="text-sm text-muted-foreground mt-1">
            เลือกหน้าที่ต้องการเข้าใช้งาน
          </p>
        </SheetHeader>

        <div className="overflow-y-auto h-[calc(85vh-88px)] px-4 py-4 space-y-6">
          {menuSections.map((section, index) => (
            <div key={section.title}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">
                {section.title}
              </h3>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <MenuItemButton
                    key={item.value}
                    {...item}
                    active={activeTab === item.value}
                    onClick={() => handleMenuClick(item.value)}
                  />
                ))}
              </div>
              {index < menuSections.length - 1 && (
                <Separator className="mt-6" />
              )}
            </div>
          ))}

          {/* Spacer for bottom safe area */}
          <div className="h-20" />
        </div>
      </SheetContent>
    </Sheet>
  );
}
