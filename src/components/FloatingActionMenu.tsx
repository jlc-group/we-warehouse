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
    <div className="fixed bottom-6 right-6 z-50">
      {/* Action Buttons - แสดงเมื่อเปิดเมนู */}
      <div className={`flex flex-col gap-3 mb-3 transition-all duration-200 ${
        isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}>
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <div key={index} className="relative group">
              {/* Label - แสดงเมื่อ hover */}
              <div className={`absolute right-16 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap ${
                isOpen ? '' : 'pointer-events-none'
              }`}>
                <div className="bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg shadow-lg">
                  {action.label}
                </div>
              </div>

              {/* Button */}
              <Button
                onClick={() => handleActionClick(action.onClick)}
                className={`${action.color} text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 w-14 h-14 rounded-full p-0`}
                style={{
                  transitionDelay: isOpen ? `${index * 30}ms` : '0ms'
                }}
                title={action.label}
              >
                <Icon className="h-6 w-6" />
              </Button>
            </div>
          );
        })}
      </div>

      {/* Main FAB Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-full shadow-2xl transition-all duration-200 hover:scale-110 ${
          isOpen
            ? 'bg-red-500 hover:bg-red-600 rotate-45'
            : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
        }`}
        title={isOpen ? 'ปิดเมนู' : 'การดำเนินการด่วน'}
      >
        {isOpen ? (
          <X className="h-7 w-7 text-white" />
        ) : (
          <Menu className="h-7 w-7 text-white" />
        )}
      </Button>
    </div>
  );
});
