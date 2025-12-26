import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Filter,
  Truck,
  ArrowRightLeft,
  RefreshCw,
  Download,
  Trash2,
  Package
} from 'lucide-react';
import { SelectableInventoryTable } from '@/components/SelectableInventoryTable';
import { useDepartmentInventory } from '@/hooks/useDepartmentInventory';
import { WarehouseSelector } from '@/components/WarehouseSelector';
import { BulkExportModal } from '@/components/BulkExportModal';
import { MultiLocationBinTransferModal } from '@/components/MultiLocationBinTransferModal';
import { executeTransfer } from '@/services/transferService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner'; // Ensure toast is imported
import { useAuth } from '@/contexts/AuthContextSimple';

export default function WarehouseOperations() {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isMovingToPacking, setIsMovingToPacking] = useState(false);
  const { user } = useAuth();

  // Fetch items
  const { items: inventoryItems, loading, refetch: fetchItems } = useDepartmentInventory(selectedWarehouseId);

  // Filter items
  const filteredItems = useMemo(() => {
    return inventoryItems.filter(item =>
      item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [inventoryItems, searchTerm]);

  const selectedItemsList = useMemo(() => {
    return inventoryItems.filter(item => selectedIds.has(item.id));
  }, [inventoryItems, selectedIds]);

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };



  const handleQuickMoveToPacking = async () => {
    if (!confirm(`คุณต้องการย้ายสินค้า ${selectedIds.size} รายการ ไปที่จุดพัก "PACKING" หรือไม่?`)) {
      return;
    }

    setIsMovingToPacking(true);
    let successCount = 0;

    try {
      for (const item of selectedItemsList) {
        // Skip if already in PACKING
        if (item.location === 'PACKING') {
          successCount++; // Count as success to avoid confusion
          continue;
        }

        const result = await executeTransfer(item, 'PACKING', user);
        if (result.success) {
          successCount++;
        } else {
          console.error(result.message, result.error);
        }
      }

      if (successCount > 0) {
        toast.success(`ย้ายไป PACKING สำเร็จ ${successCount} รายการ`);
        handleClearSelection();
        fetchItems(); // Refresh
      } else {
        toast.error('เกิดข้อผิดพลาดในการย้ายสินค้า');
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to execute quick move');
    } finally {
      setIsMovingToPacking(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ดำเนินการแบบชุด (Bulk Operations)</h1>
          <p className="text-muted-foreground">จัดการสินค้าหลายรายการพร้อมกัน: ส่งออก, ย้ายตำแหน่ง</p>
        </div>
        <WarehouseSelector
          selectedWarehouseId={selectedWarehouseId}
          onWarehouseChange={setSelectedWarehouseId}
          showAddButton={false}
        />
      </div>

      {/* Actions & Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex items-center gap-2 flex-1 relative">
              <Search className="h-4 w-4 absolute left-3 text-muted-foreground" />
              <Input
                placeholder="ค้นหาตามชื่อ, SKU, หรือ Location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 max-w-md"
              />
              <Badge variant="outline" className="hidden sm:flex h-9 items-center px-3">
                {filteredItems.length} รายการ
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => fetchItems()}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                รีเฟรช
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SelectableInventoryTable
            items={filteredItems}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        </CardContent>
      </Card>

      {/* Floating Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white border shadow-xl rounded-full px-6 py-3 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2 pr-4 border-r">
            <Badge className="bg-primary text-primary-foreground h-6 w-6 p-0 flex items-center justify-center rounded-full">
              {selectedIds.size}
            </Badge>
            <span className="text-sm font-medium hidden sm:inline">รายการที่เลือก</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="gap-2 bg-orange-600 hover:bg-orange-700 text-white border-none shadow-sm"
              onClick={() => setIsExportModalOpen(true)}
            >
              <Truck className="h-4 w-4" />
              ส่งออก ({selectedIds.size})
            </Button>

            <Button
              size="sm"
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white border-none shadow-sm"
              onClick={handleQuickMoveToPacking}
              disabled={isMovingToPacking}
            >
              <Package className="h-4 w-4" />
              {isMovingToPacking ? 'กำลังย้าย...' : 'พักของ (Packing)'}
            </Button>

            <Button
              size="sm"
              variant="secondary"
              className="gap-2 shadow-sm"
              onClick={() => setIsTransferModalOpen(true)}
            >
              <ArrowRightLeft className="h-4 w-4" />
              ย้ายตำแหน่ง ({selectedIds.size})
            </Button>

            <Button
              size="icon"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive transition-colors ml-2"
              onClick={handleClearSelection}
              title="ยกเลิกการเลือก"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <BulkExportModal
        open={isExportModalOpen}
        onOpenChange={setIsExportModalOpen}
        inventoryItems={inventoryItems} // Pass full list for searching more
        preSelectedItems={selectedItemsList} // Pass selected items
      />

      {/* Placeholder for Transfer Modal - will implement next */}
      {/* <MultiLocationBinTransferModal 
         isOpen={isTransferModalOpen}
         onClose={() => setIsTransferModalOpen(false)}
         selectedItems={selectedItemsList}
       /> */}
    </div>
  );
}