import { FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyOrderStateProps {
  onCreateOrder?: () => void;
  title?: string;
  description?: string;
  showCreateButton?: boolean;
}

export function EmptyOrderState({
  onCreateOrder,
  title = 'ไม่พบใบสั่งซื้อ',
  description = 'เริ่มต้นสร้างใบสั่งซื้อของคุณ',
  showCreateButton = true
}: EmptyOrderStateProps) {
  return (
    <Card className="border-2 border-dashed border-gray-200 bg-gray-50">
      <CardContent className="p-10">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <FileText className="w-8 h-8 text-gray-300" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-gray-500 font-semibold">
              {title}
            </div>
            <div className="text-xs text-gray-400">
              {description}
            </div>
          </div>

          {showCreateButton && (
            <div className="pt-2">
              <Button
                onClick={onCreateOrder}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                สร้างใบสั่งซื้อใหม่
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface EmptyOrderStateWithCountProps extends EmptyOrderStateProps {
  count?: number;
}

export function EmptyOrderStateWithCount({
  count = 0,
  onCreateOrder,
  title,
  description,
  showCreateButton = true
}: EmptyOrderStateWithCountProps) {
  return (
    <div className="space-y-6">
      <EmptyOrderState
        onCreateOrder={onCreateOrder}
        title={title}
        description={description}
        showCreateButton={showCreateButton}
      />

      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-800">
          ใบสั่งซื้อ ({count.toLocaleString()} รายการ)
        </h3>
      </div>
    </div>
  );
}