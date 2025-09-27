import { useState } from 'react';
import { List, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type WorkingMode = 'select_items' | 'select_delivered';

interface WorkingModeSelectorProps {
  onModeChange?: (mode: WorkingMode) => void;
  defaultMode?: WorkingMode;
}

export function WorkingModeSelector({
  onModeChange,
  defaultMode = 'select_items'
}: WorkingModeSelectorProps) {
  const [activeMode, setActiveMode] = useState<WorkingMode>(defaultMode);

  const handleModeChange = (mode: WorkingMode) => {
    setActiveMode(mode);
    onModeChange?.(mode);
  };

  const modes = [
    {
      id: 'select_items' as WorkingMode,
      title: 'เลือกรายการ',
      description: 'ตั้งค่าสถานะรายการและสั่งพิมพ์รายการ',
      icon: List,
      isActive: activeMode === 'select_items',
    },
    {
      id: 'select_delivered' as WorkingMode,
      title: 'เลือกตามแบบที่จัดส่งแล้ว',
      description: 'เลือกจากสินค้าจากคลังสินค้าในแบบที่จัดส่งแล้ว',
      icon: Archive,
      isActive: activeMode === 'select_delivered',
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">โหมดการทำงาน</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {modes.map((mode) => {
          const IconComponent = mode.icon;

          return (
            <Button
              key={mode.id}
              variant="ghost"
              className={`h-auto p-0 hover:bg-transparent ${
                mode.isActive ? '' : 'opacity-80 hover:opacity-100'
              }`}
              onClick={() => handleModeChange(mode.id)}
            >
              <Card className={`w-full shadow-md transition-all duration-200 hover:shadow-lg ${
                mode.isActive
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200'
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className={`flex-shrink-0 ${
                      mode.isActive ? 'text-white' : 'text-gray-600'
                    }`}>
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-semibold text-lg mb-1">
                        {mode.title}
                      </div>
                      <div className={`text-sm ${
                        mode.isActive ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {mode.description}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Button>
          );
        })}
      </div>
    </div>
  );
}