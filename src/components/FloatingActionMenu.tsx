import { useState, memo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Truck,
  Send,
  QrCode,
  X,
  Menu
} from 'lucide-react';

interface FloatingActionMenuProps {
  onAddItem: () => void;
  onTransferItem: () => void;
  onExportItem: () => void;
  onScanQR: () => void;
  onBulkExport?: () => void;
}

export const FloatingActionMenu = memo(function FloatingActionMenu({
  onAddItem,
  onTransferItem,
  onExportItem,
  onScanQR,
  onBulkExport
}: FloatingActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    {
      icon: Plus,
      label: 'เพิ่มสินค้า',
      onClick: onAddItem,
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      icon: Truck,
      label: 'ย้ายสินค้า',
      onClick: onTransferItem,
      color: 'bg-orange-500 hover:bg-orange-600'
    },
    {
      icon: Send,
      label: 'สินค้าส่งออก',
      onClick: onExportItem,
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      icon: QrCode,
      label: 'สแกน QR',
      onClick: onScanQR,
      color: 'bg-purple-500 hover:bg-purple-600'
    },
  ];

  // เพิ่ม bulk export ถ้ามี
  if (onBulkExport) {
    actions.push({
      icon: Send,
      label: 'ส่งออกหลาย',
      onClick: onBulkExport,
      color: 'bg-indigo-500 hover:bg-indigo-600'
    });
  }

  const handleActionClick = (onClick: () => void) => {
    onClick();
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
      {/* Action Buttons - แสดงเมื่อเปิดเมนู */}
      <div className={`flex flex-col gap-2 sm:gap-3 mb-2 sm:mb-3 transition-all duration-200 ${
        isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}>
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <div key={index} className="relative group">
              {/* Label - แสดงเมื่อ hover (ซ่อนบนมือถือ) */}
              <div className={`hidden sm:block absolute right-14 sm:right-16 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap ${
                isOpen ? '' : 'pointer-events-none'
              }`}>
                <div className="bg-gray-900 text-white text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-lg">
                  {action.label}
                </div>
              </div>

              {/* Button - เล็กลงบนมือถือ */}
              <Button
                onClick={() => handleActionClick(action.onClick)}
                className={`${action.color} text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 w-12 h-12 sm:w-14 sm:h-14 rounded-full p-0`}
                style={{
                  transitionDelay: isOpen ? `${index * 30}ms` : '0ms'
                }}
                title={action.label}
              >
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
            </div>
          );
        })}
      </div>

      {/* Main FAB Button - เล็กลงบนมือถือ */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-2xl transition-all duration-200 hover:scale-110 ${
          isOpen
            ? 'bg-red-500 hover:bg-red-600 rotate-45'
            : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
        }`}
        title={isOpen ? 'ปิดเมนู' : 'การดำเนินการด่วน'}
      >
        {isOpen ? (
          <X className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
        ) : (
          <Menu className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
        )}
      </Button>
    </div>
  );
});
