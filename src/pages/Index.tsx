import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ShelfGrid } from '@/components/ShelfGrid';
import { InventorySearch } from '@/components/InventorySearch';
import { InventoryTable } from '@/components/InventoryTable';
import { InventoryModal } from '@/components/InventoryModal';
import { InventoryAnalytics } from '@/components/InventoryAnalytics';
import { MovementLogs } from '@/components/MovementLogs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, BarChart3, Grid3X3, Search, Table, History } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
// Remove useAuth import since it conflicts with existing auth context
import type { InventoryItem } from '@/hooks/useInventory';

function Index() {
  const { items: inventoryItems, loading, addItem, updateItem } = useInventory();
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | undefined>();

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
        // Update existing item
        await updateItem(selectedItem.id, itemData);
      } else {
        // Add new item
        await addItem(itemData);
      }
      
      setIsModalOpen(false);
      setSelectedItem(undefined);
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
            <p className="text-muted-foreground">
              {loading ? 'กำลังโหลด...' : `จำนวนสินค้าทั้งหมด: ${inventoryItems.length} รายการ`}
            </p>
            <p className="text-sm text-success mt-2">
              ✅ ระบบพร้อมใช้งาน - เข้าสู่ระบบแล้ว
            </p>
          </CardContent>
        </Card>

        {/* Navigation Tabs */}
        <Tabs defaultValue="grid" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="grid" className="flex items-center gap-2">
              <Grid3X3 className="h-4 w-4" />
              แผนผังคลัง
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              ค้นหาสินค้า
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

          <TabsContent value="search" className="space-y-4">
            {loading ? (
              <div className="text-center py-8">กำลังโหลดข้อมูล...</div>
            ) : (
              <InventorySearch 
                items={inventoryItems}
                onItemSelect={(item) => handleShelfClick(item.location, item)}
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