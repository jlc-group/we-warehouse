/**
 * AppLayout - Layout หลักของแอพ พร้อม Sidebar และ Header
 */

import { ReactNode } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';

interface AppLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function AppLayout({
  children,
  activeTab,
  onTabChange,
  title,
  subtitle,
  onRefresh,
  isRefreshing
}: AppLayoutProps) {
  // Map tab to title
  const tabTitles: Record<string, { title: string; subtitle?: string }> = {
    'overview': { title: 'ภาพรวม', subtitle: 'Dashboard สรุปข้อมูลทั้งหมด' },
    'stock-overview': { title: 'สรุปสต็อก', subtitle: 'ดูจำนวนสินค้าคงเหลือ' },
    'inventory': { title: 'รายการสินค้า', subtitle: 'จัดการสินค้าในคลัง' },
    'shelf': { title: 'แผนผังคลัง', subtitle: 'ดู Layout คลังสินค้า' },
    'locations': { title: 'จัดการ Location', subtitle: 'เพิ่ม/แก้ไขตำแหน่งจัดเก็บ' },
    'stock-card': { title: 'Stock Card', subtitle: 'ประวัติการเคลื่อนไหว' },
    'packing-list': { title: 'รายการส่งของ', subtitle: 'Packing List ตาม TAXDATE' },
    'daily-shipment': { title: 'สรุปส่ง Csmile', subtitle: 'รวมบิลส่งออกรายวัน' },
    'finance': { title: 'รายงานการเงิน', subtitle: 'สรุปยอดขายและรายได้' },
    'analytics': { title: 'วิเคราะห์ยอดขาย', subtitle: 'กราฟและสถิติการขาย' },
    'qr-management': { title: 'QR Code', subtitle: 'จัดการ QR Code สินค้า' },
    'transfer': { title: 'โอนย้ายสินค้า', subtitle: 'โอนย้ายระหว่าง Location' },
    'logs': { title: 'ประวัติ', subtitle: 'บันทึกการเปลี่ยนแปลง' },
    'users': { title: 'จัดการผู้ใช้', subtitle: 'เพิ่ม/แก้ไขผู้ใช้งาน' },
    'database': { title: 'ข้อมูลระบบ', subtitle: 'Debug และ Export ข้อมูล' },
    'ai-lab': { title: 'AI Analytics Lab', subtitle: 'ทดลองให้ AI วิเคราะห์สินค้า ยอดขาย และ movement' },
    'product-management': { title: 'จัดการสินค้า', subtitle: 'เพิ่ม/แก้ไขข้อมูลสินค้า หน่วยนับ และอัตราแปลง' },
  };

  const currentTitle = tabTitles[activeTab] || { title: 'WE Warehouse' };

  return (
    <SidebarProvider>
      <AppSidebar activeTab={activeTab} onTabChange={onTabChange} />
      <SidebarInset>
        <AppHeader
          title={title || currentTitle.title}
          subtitle={subtitle || currentTitle.subtitle}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />
        <main className="flex-1 p-3 sm:p-4 md:p-6 bg-gray-50/50 overflow-x-hidden">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

