import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShelfGrid } from '@/components/ShelfGrid';
import { InventoryTable } from '@/components/InventoryTable';
import { InventoryModal } from '@/components/InventoryModal';
import { InventoryAnalytics } from '@/components/InventoryAnalytics';
import { MovementLogs } from '@/components/MovementLogs';
import { ProductOverviewAndSearch } from '@/components/ProductOverviewAndSearch';
import { QRCodeManager } from '@/components/QRCodeManager';
import { QRCodeManagement } from '@/components/QRCodeManagement';
import { DataRecovery } from '@/components/DataRecovery';
import { DataExport } from '@/components/DataExport';
import { BulkAddModal } from '@/components/BulkAddModal';
import { LocationQRModal } from '@/components/LocationQRModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { setupQRTable } from '@/utils/setupQRTable';
import { Package, BarChart3, Grid3X3, Search, Table, History, PieChart, Wifi, WifiOff, RefreshCw, AlertCircle, QrCode, Camera, Archive, Download, Plus } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { useToast } from '@/hooks/use-toast';
import type { InventoryItem } from '@/hooks/useInventory';

function Index() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // All useState hooks at the top level - no conditional rendering
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isCreatingQRTable, setIsCreatingQRTable] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [qrSelectedLocation, setQrSelectedLocation] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | undefined>();
  const [activeTab, setActiveTab] = useState<string>('overview');
  
  // Custom hook after useState hooks
  const { toast } = useToast();
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

  // Handle URL parameters from QR code scan
  useEffect(() => {
    const tab = searchParams.get('tab');
    const location = searchParams.get('location');
    const action = searchParams.get('action');

    // Enhanced debugging for Lovable environment
    console.log('🌍 Environment Debug:');
    console.log('- URL:', window.location.href);
    console.log('- Search params:', window.location.search);
    console.log('- Is Lovable:', window.location.href.includes('lovableproject.com'));
    console.log('🔍 Parsed QR URL Parameters:', { tab, location, action });

    // Always set tab first if provided
    if (tab) {
      console.log('✅ Setting active tab to:', tab);
      setActiveTab(tab);
    }

    // Handle QR code scan with location and action
    if (location && action === 'add') {
      console.log('✅ QR Code detected - Opening modal for location:', location);

      // Delay modal opening slightly to ensure tab is set first
      setTimeout(() => {
        setSelectedLocation(location);
        setIsModalOpen(true);

        // Add toast notification to confirm it worked
        toast({
          title: '🔍 QR Code แสกนสำเร็จ',
          description: `เปิดหน้าเพิ่มสินค้าสำหรับตำแหน่ง: ${location}`,
          duration: 5000,
        });

        console.log('✅ Modal opened successfully for location:', location);
      }, 100);

      // Clear URL parameters after handling (with longer delay)
      setTimeout(() => {
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('location');
        newSearchParams.delete('action');
        if (tab) newSearchParams.delete('tab');

        const newUrl = newSearchParams.toString() ? '?' + newSearchParams.toString() : '/';
        console.log('🧹 Cleaning URL, navigating to:', newUrl);
        navigate(newUrl, { replace: true });
      }, 1000);
    }
  }, [searchParams, navigate, toast]);

  const handleShelfClick = (location: string, item?: InventoryItem) => {
    setSelectedLocation(location);
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleQRCodeClick = (location: string) => {
    setQrSelectedLocation(location);
    setIsQRModalOpen(true);
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

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    setIsCreatingQRTable(true);
                    try {
                      await setupQRTable();
                      toast({
                        title: '✅ สร้างตาราง QR สำเร็จ',
                        description: 'ตอนนี้สามารถใช้งาน QR Code ได้แล้ว',
                      });
                    } catch (error) {
                      console.error('QR table setup error:', error);
                      toast({
                        title: '⚠️ ต้องสร้างตารางด้วยตนเอง',
                        description: 'กรุณาดู Console (F12) สำหรับ SQL script หรือดู migration file',
                        variant: 'destructive',
                      });
                    } finally {
                      setIsCreatingQRTable(false);
                    }
                  }}
                  disabled={isCreatingQRTable || loading}
                  className="flex items-center gap-2"
                >
                  <QrCode className="h-4 w-4" />
                  {isCreatingQRTable ? 'กำลังสร้าง...' : 'สร้างตาราง QR'}
                </Button>

                <Button
                  onClick={() => {
                    const testLocation = 'TEST-A01';
                    const testUrl = `${window.location.origin}?tab=overview&location=${encodeURIComponent(testLocation)}&action=add`;
                    console.log('🧪 Testing QR URL:', testUrl);
                    console.log('🧪 Expected behavior: Modal should open with location:', testLocation);

                    // Add small delay and then navigate
                    toast({
                      title: '🧪 Testing QR URL',
                      description: `Navigating to test URL with location: ${testLocation}`,
                      duration: 3000,
                    });

                    setTimeout(() => {
                      window.location.href = testUrl;
                    }, 500);
                  }}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  🧪 Test QR URL
                </Button>

              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-9">
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
            <TabsTrigger value="qr-manage" className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              จัดการ QR
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
                onQRCodeClick={handleQRCodeClick}
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

          <TabsContent value="qr-manage" className="space-y-4">
            <QRCodeManagement items={inventoryItems} />
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

        {/* Location QR Modal */}
        <LocationQRModal
          isOpen={isQRModalOpen}
          onClose={() => setIsQRModalOpen(false)}
          location={qrSelectedLocation}
          items={inventoryItems}
        />
      </div>
    </div>
  );
}

export default Index;