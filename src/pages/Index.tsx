import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShelfGrid } from '@/components/ShelfGrid';
import { InventoryTable } from '@/components/InventoryTable';
import { InventoryModal } from '@/components/InventoryModal';
import { InventoryAnalytics } from '@/components/InventoryAnalytics';
import { MovementLogs } from '@/components/MovementLogs';
import { ProductOverviewAndSearch } from '@/components/ProductOverviewAndSearch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, BarChart3, Grid3X3, Search, Table, History, PieChart, Database, Trash2 } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import type { InventoryItem } from '@/hooks/useInventory';

function Index() {
  // All useState hooks at the top level - no conditional rendering
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | undefined>();
  
  // Custom hook after useState hooks
  const { items: inventoryItems, loading, addItem, updateItem, loadSampleData, clearAllData } = useInventory();

  const handleShelfClick = (location: string, item?: InventoryItem) => {
    setSelectedLocation(location);
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleSaveItem = async (itemData: {
    product_name: string;
    product_code: string;
    location: string;
    lot?: string;
    mfd?: string;
    quantity_boxes: number;
    quantity_loose: number;
  }) => {
    try {
      if (selectedItem) {
        await updateItem(selectedItem.id, itemData);
      } else {
        await addItem(itemData);
      }
      
      setIsModalOpen(false);
      setSelectedItem(undefined);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleBulkSave = async (locations: string[], itemData: any) => {
    try {
      for (const location of locations) {
        await addItem({
          ...itemData,
          location
        });
      }
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-6 w-6" />
              ระบบจัดการคลัง Inventory Warehouse
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-muted-foreground">
                  {loading ? 'กำลังโหลด...' : `จำนวนสินค้าทั้งหมด: ${inventoryItems.length} รายการ`}
                </p>
                <p className="text-sm text-success mt-2">
                  ✅ ระบบพร้อมใช้งาน
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadSampleData}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Database className="h-4 w-4" />
                  โหลดข้อมูลตัวอย่าง
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllData}
                  disabled={loading || inventoryItems.length === 0}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  ล้างข้อมูลทั้งหมด
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="grid" className="flex items-center gap-2">
              <Grid3X3 className="h-4 w-4" />
              แผนผังคลัง
            </TabsTrigger>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              ภาพรวมและค้นหา
            </TabsTrigger>
            <TabsTrigger value="table" className="flex items-center gap-2">
              <Table className="h-4 w-4" />
              ตารางสรุป
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              วิเคราะห์ข้อมูล
            </TabsTrigger>
            <TabsTrigger value="movements" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              ประวัติการเคลื่อนไหว
            </TabsTrigger>
          </TabsList>

          <TabsContent value="grid" className="space-y-4">
            {loading ? (
              <div className="text-center py-8">กำลังโหลดข้อมูล...</div>
            ) : (
              <ShelfGrid
                items={inventoryItems}
                onShelfClick={handleShelfClick}
              />
            )}
          </TabsContent>

          <TabsContent value="overview" className="space-y-4">
            {loading ? (
              <div className="text-center py-8">กำลังโหลดข้อมูล...</div>
            ) : (
              <ProductOverviewAndSearch
                items={inventoryItems}
                onShelfClick={handleShelfClick}
              />
            )}
          </TabsContent>

          <TabsContent value="table" className="space-y-4">
            {loading ? (
              <div className="text-center py-8">กำลังโหลดข้อมูล...</div>
            ) : (
              <InventoryTable items={inventoryItems} />
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            {loading ? (
              <div className="text-center py-8">กำลังโหลดข้อมูล...</div>
            ) : (
              <InventoryAnalytics items={inventoryItems} />
            )}
          </TabsContent>

          <TabsContent value="movements" className="space-y-4">
            <MovementLogs />
          </TabsContent>
        </Tabs>

        {/* Inventory Modal */}
        <InventoryModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedItem(undefined);
          }}
          onSave={handleSaveItem}
          location={selectedLocation}
          existingItem={selectedItem}
        />
      </div>
    </div>
  );
}

export default Index;