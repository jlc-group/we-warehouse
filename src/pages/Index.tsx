import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShelfGrid } from '@/components/ShelfGrid';
import { InventoryTable } from '@/components/InventoryTable';
import { InventoryModal } from '@/components/InventoryModal';
import { InventoryAnalytics } from '@/components/InventoryAnalytics';
import { MovementLogs } from '@/components/MovementLogs';
import { ProductOverviewAndSearch } from '@/components/ProductOverviewAndSearch';
import { QRCodeManager } from '@/components/QRCodeManager';
import { DataRecovery } from '@/components/DataRecovery';
import { DataExport } from '@/components/DataExport';
import { BulkAddModal } from '@/components/BulkAddModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, BarChart3, Grid3X3, Search, Table, History, PieChart, Wifi, WifiOff, RefreshCw, AlertCircle, QrCode, Camera, Archive, Download, Plus } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import type { InventoryItem } from '@/hooks/useInventory';

function Index() {
  const navigate = useNavigate();

  // All useState hooks at the top level - no conditional rendering
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | undefined>();
  
  // Custom hook after useState hooks
  const { 
    items: inventoryItems, 
    loading, 
    connectionStatus,
    isOfflineMode,
    addItem, 
    updateItem, 
    retryConnection,
    emergencyRecovery,
    bulkUploadToSupabase,
    recoverUserData,
    importData
  } = useInventory();

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
      const dbItemData = {
        product_name: itemData.product_name,
        sku: itemData.product_code,
        location: itemData.location,
        lot: itemData.lot,
        mfd: itemData.mfd,
        box_quantity: itemData.quantity_boxes,
        loose_quantity: itemData.quantity_loose,
      };
      
      if (selectedItem) {
        await updateItem(selectedItem.id, dbItemData);
      } else {
        await addItem(dbItemData);
      }
      
      setIsModalOpen(false);
      setSelectedItem(undefined);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleBulkSave = async (locations: string[], itemData: {
    product_name: string;
    sku: string;
    lot?: string;
    mfd?: string;
    box_quantity: number;
    loose_quantity: number;
  }) => {
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
            {inventoryItems.length === 0 && !loading && (
              <div className="mb-6 p-6 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="text-center space-y-4">
                  <div className="text-orange-600 text-lg font-semibold">
                    📦 ไม่พบข้อมูลในระบบ
                  </div>
                  <p className="text-muted-foreground">
                    ระบบไม่พบข้อมูลสินค้าในคลัง กรุณาใช้แท็บ "กู้คืนข้อมูล" เพื่อเพิ่มข้อมูล
                  </p>
                </div>
              </div>
            )}
            
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
                  onClick={() => setIsBulkModalOpen(true)}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  เพิ่มหลายตำแหน่ง
                </Button>

              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="grid" className="flex items-center gap-2">
              <Grid3X3 className="h-4 w-4" />
              แผนผังคลัง
            </TabsTrigger>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              ภาพรวมและสินค้า
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
            <TabsTrigger value="qr" className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              QR Scanner
            </TabsTrigger>
            <TabsTrigger value="recovery" className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              กู้คืนข้อมูล
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export
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

          <TabsContent value="qr" className="space-y-4">
            <QRCodeManager
              items={inventoryItems}
              onShelfClick={handleShelfClick}
              onSaveItem={handleSaveItem}
            />
          </TabsContent>

          <TabsContent value="recovery" className="space-y-4">
            <DataRecovery />
          </TabsContent>

          <TabsContent value="export" className="space-y-4">
            <DataExport
              items={inventoryItems}
              onImportData={importData}
              onUploadToSupabase={bulkUploadToSupabase}
            />
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

        {/* Bulk Add Modal */}
        <BulkAddModal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          onSave={handleBulkSave}
          availableLocations={[...new Set(inventoryItems.map(item => item.location))].sort()}
        />
      </div>
    </div>
  );
}

export default Index;