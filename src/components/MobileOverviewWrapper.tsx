import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Filter, Plus, Truck, QrCode, Download, Grid3X3 } from 'lucide-react';
import type { InventoryItem } from '@/hooks/useInventory';

interface MobileOverviewWrapperProps {
  children: React.ReactNode;
  onAddItem: () => void;
  onTransferItem: () => void;
  onScanQR: () => void;
  onBulkExport?: () => void;
}

/**
 * Mobile-first wrapper สำหรับหน้า Overview
 * แสดงปุ่มแบบ simplified บน mobile และใช้ Sheet สำหรับฟิลเตอร์
 */
export function MobileOverviewWrapper({
  children,
  onAddItem,
  onTransferItem,
  onScanQR,
  onBulkExport
}: MobileOverviewWrapperProps) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="space-y-4">
      {/* Mobile Action Bar */}
      <div className="block lg:hidden sticky top-0 z-10 bg-white border-b border-gray-200 pb-3 -mx-2 px-2 sm:-mx-4 sm:px-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          <Button
            onClick={onAddItem}
            size="sm"
            className="flex items-center gap-1 h-9 text-xs whitespace-nowrap"
          >
            <Plus className="h-3 w-3" />
            เพิ่ม
          </Button>

          <Button
            onClick={onTransferItem}
            variant="outline"
            size="sm"
            className="flex items-center gap-1 h-9 text-xs whitespace-nowrap"
          >
            <Truck className="h-3 w-3" />
            ย้าย
          </Button>

          <Button
            onClick={onScanQR}
            variant="outline"
            size="sm"
            className="flex items-center gap-1 h-9 text-xs whitespace-nowrap"
          >
            <QrCode className="h-3 w-3" />
            สแกน
          </Button>

          {onBulkExport && (
            <Button
              onClick={onBulkExport}
              variant="outline"
              size="sm"
              className="flex items-center gap-1 h-9 text-xs whitespace-nowrap"
            >
              <Download className="h-3 w-3" />
              Export
            </Button>
          )}

          <Sheet open={showFilters} onOpenChange={setShowFilters}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1 h-9 text-xs whitespace-nowrap ml-auto"
              >
                <Filter className="h-3 w-3" />
                ตัวกรอง
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  ตัวกรองและการตั้งค่า
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4 overflow-y-auto h-[calc(80vh-80px)]">
                <p className="text-sm text-muted-foreground">
                  ฟีเจอร์ตัวกรองจะถูกเพิ่มในเร็วๆ นี้
                </p>
                {/* TODO: Add filters here */}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content - Hide desktop filters on mobile */}
      <div className="mobile-overview-content">
        {children}
      </div>
    </div>
  );
}
