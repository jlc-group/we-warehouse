import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Warehouse, Building2, Plus, Settings } from 'lucide-react';
import { useWarehouses, useWarehouseStats } from '@/hooks/useWarehouse';
import { toast } from 'sonner';

interface WarehouseSelectorProps {
  selectedWarehouseId?: string;
  onWarehouseChange: (warehouseId: string | undefined) => void;
  showAddButton?: boolean;
  showAllOption?: boolean;
  className?: string;
}

function WarehouseStatsDisplay({ warehouseId }: { warehouseId: string }) {
  const { data: stats, isLoading } = useWarehouseStats(warehouseId);

  if (isLoading) {
    return <span className="text-xs text-muted-foreground">กำลังโหลด...</span>;
  }

  if (!stats) return null;

  return (
    <div className="flex gap-2 text-xs text-muted-foreground">
      <Badge variant="secondary" className="text-xs">
        {stats.totalItems} รายการ
      </Badge>
      <Badge variant="outline" className="text-xs">
        {stats.totalQuantity.toLocaleString()} ชิ้น
      </Badge>
    </div>
  );
}

export function WarehouseSelector({
  selectedWarehouseId,
  onWarehouseChange,
  showAddButton = false,
  showAllOption = true,
  className = '',
}: WarehouseSelectorProps) {
  const { data: warehouses, isLoading, error } = useWarehouses();
  const [isOpen, setIsOpen] = useState(false);

  const handleValueChange = (value: string) => {
    if (value === 'all') {
      onWarehouseChange(undefined);
    } else {
      onWarehouseChange(value);
    }
    setIsOpen(false);
  };

  const selectedWarehouse = warehouses?.find(w => w.id === selectedWarehouseId);

  if (error) {
    console.error('Error loading warehouses:', error);
    return (
      <div className="flex items-center gap-2 text-sm text-red-600">
        <Warehouse className="h-4 w-4" />
        ไม่สามารถโหลด warehouse ได้
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Warehouse className="h-4 w-4 text-muted-foreground flex-shrink-0" />

        <Select
          value={selectedWarehouseId || 'all'}
          onValueChange={handleValueChange}
          open={isOpen}
          onOpenChange={setIsOpen}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[200px] h-8">
            <SelectValue placeholder="เลือก Warehouse">
              <div className="flex items-center gap-2">
                <Building2 className="h-3 w-3" />
                {selectedWarehouse ? (
                  <span className="truncate">
                    {selectedWarehouse.name} ({selectedWarehouse.code})
                  </span>
                ) : (
                  'ทุก Warehouse'
                )}
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {showAllOption && (
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>ทุก Warehouse</span>
                </div>
              </SelectItem>
            )}

            {isLoading ? (
              <SelectItem value="loading" disabled>
                กำลังโหลด...
              </SelectItem>
            ) : (
              warehouses?.map((warehouse) => (
                <SelectItem key={warehouse.id} value={warehouse.id}>
                  <div className="flex flex-col gap-1 py-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span className="font-medium">
                        {warehouse.name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {warehouse.code}
                      </Badge>
                    </div>

                    {warehouse.description && (
                      <span className="text-xs text-muted-foreground">
                        {warehouse.description}
                      </span>
                    )}

                    <WarehouseStatsDisplay warehouseId={warehouse.id} />
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Selected warehouse info */}
      {selectedWarehouse && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-xs">
              {selectedWarehouse.code}
            </Badge>
            {selectedWarehouse.is_active === false && (
              <Badge variant="destructive" className="text-xs">
                ไม่ใช้งาน
              </Badge>
            )}
          </div>
          <WarehouseStatsDisplay warehouseId={selectedWarehouse.id} />
        </div>
      )}

      {/* Action buttons */}
      {showAddButton && (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              toast.info('ฟีเจอร์เพิ่ม Warehouse ยังไม่พร้อมใช้งาน');
            }}
            className="h-8 px-2"
          >
            <Plus className="h-3 w-3" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              toast.info('ฟีเจอร์จัดการ Warehouse ยังไม่พร้อมใช้งาน');
            }}
            className="h-8 px-2"
          >
            <Settings className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Compact version for use in modals or tight spaces
export function CompactWarehouseSelector({
  selectedWarehouseId,
  onWarehouseChange,
  showAllOption = true,
}: Omit<WarehouseSelectorProps, 'showAddButton' | 'className'>) {
  const { data: warehouses, isLoading } = useWarehouses();

  const handleValueChange = (value: string) => {
    if (value === 'all') {
      onWarehouseChange(undefined);
    } else {
      onWarehouseChange(value);
    }
  };

  return (
    <Select
      value={selectedWarehouseId || 'all'}
      onValueChange={handleValueChange}
      disabled={isLoading}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="เลือก Warehouse" />
      </SelectTrigger>
      <SelectContent>
        {showAllOption && (
          <SelectItem value="all">ทุก Warehouse</SelectItem>
        )}

        {isLoading ? (
          <SelectItem value="loading" disabled>
            กำลังโหลด...
          </SelectItem>
        ) : (
          warehouses?.map((warehouse) => (
            <SelectItem key={warehouse.id} value={warehouse.id}>
              {warehouse.name} ({warehouse.code})
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

export default WarehouseSelector;