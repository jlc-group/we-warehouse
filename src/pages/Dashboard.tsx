/**
 * Dashboard - หน้าหลักใหม่ พร้อม Sidebar และ Header
 */

import { useState, Suspense, lazy, useCallback } from 'react';
import { AppLayout } from '@/components/layout';
import { ComponentLoadingFallback } from '@/components/ui/loading-fallback';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { WarehouseSelector } from '@/components/WarehouseSelector';
import { useDepartmentInventory } from '@/hooks/useDepartmentInventory';
import { PinGuard } from '@/components/security';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Hash, PackagePlus } from 'lucide-react';

// Lazy load components
const EnhancedOverview = lazy(() => import('@/components/EnhancedOverview').then(m => ({ default: m.EnhancedOverview })));
const StockOverviewPage = lazy(() => import('@/components/stock-overview/StockOverviewPage').then(m => ({ default: m.StockOverviewPage })));
const InventoryTable = lazy(() => import('@/components/InventoryTable').then(m => ({ default: m.InventoryTable })));
const ShelfGrid = lazy(() => import('@/components/ShelfGrid').then(m => ({ default: m.ShelfGrid })));
const PackingListTab = lazy(() => import('@/components/PackingListTab').then(m => ({ default: m.PackingListTab })));
const DailyShipmentSummary = lazy(() => import('@/components/DailyShipmentSummary').then(m => ({ default: m.DailyShipmentSummary })));
const StockCardTabNew = lazy(() => import('@/components/StockCardTabNew').then(m => ({ default: m.StockCardTabNew })));
const TransferTab = lazy(() => import('@/components/TransferTab').then(m => ({ default: m.TransferTab })));
const FinanceDashboard = lazy(() => import('@/components/FinanceDashboard').then(m => ({ default: m.FinanceDashboard })));
const SalesAnalytics = lazy(() => import('@/components/SalesAnalytics').then(m => ({ default: m.SalesAnalytics })));
const QRCodeManagement = lazy(() => import('@/components/QRCodeManagement'));
const LocationManagement = lazy(() => import('@/components/LocationManagementNew'));
const EnhancedEventLogs = lazy(() => import('@/components/EnhancedEventLogs').then(m => ({ default: m.EnhancedEventLogs })));
const UserManagement = lazy(() => import('@/components/admin/UserManagement'));
const DatabaseDebug = lazy(() => import('@/components/DatabaseDebug').then(m => ({ default: m.DatabaseDebug })));
const AIAnalyticsLab = lazy(() => import('@/components/AIAnalyticsLab').then(m => ({ default: m.AIAnalyticsLab })));
const ProductSummaryTable = lazy(() => import('@/components/ProductSummaryTable').then(m => ({ default: m.ProductSummaryTable })));
const ProductManagementPage = lazy(() => import('@/components/ProductManagementPage').then(m => ({ default: m.ProductManagementPage })));
const LocationQRScannerModal = lazy(() => import('@/components/LocationQRScannerModal').then(m => ({ default: m.LocationQRScannerModal })));
const WarehouseOperations = lazy(() => import('@/components/WarehouseOperations'));

import { useAuth } from '@/contexts/AuthContextSimple';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | undefined>();

  // ใช้ useDepartmentInventory เพื่อ filter ตาม warehouse
  const {
    items: inventoryItems,
    loading,
    fetchItems
  } = useDepartmentInventory(selectedWarehouseId);

  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showQRScanner, setShowQRScanner] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchItems();
    setIsRefreshing(false);
  }, [fetchItems]);

  // Render Warehouse Selector สำหรับบาง tabs
  const renderWarehouseSelector = () => {
    const tabsWithWarehouseSelector = ['overview', 'stock-overview', 'inventory', 'shelf', 'locations', 'product-management'];
    if (!tabsWithWarehouseSelector.includes(activeTab)) return null;

    return (
      <div className="mb-4">
        <WarehouseSelector
          selectedWarehouseId={selectedWarehouseId}
          onWarehouseChange={setSelectedWarehouseId}
          showAddButton={false}
        />
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <Suspense fallback={<ComponentLoadingFallback componentName="Overview" />}>
            <EnhancedOverview
              items={inventoryItems}
              warehouseId={selectedWarehouseId}
              loading={loading}
              onShelfClick={(location, item) => {
                console.log('Shelf clicked:', location, item);
                const encodedLocation = encodeURIComponent(location);
                navigate(`/location/${encodedLocation}`);
              }}
              onAddItem={() => {
                toast({
                  title: "เลือกตำแหน่งสินค้า",
                  description: "กรุณาเลือกตำแหน่ง (Location) จากตาราง หรือสแกน QR Code ก่อนเพิ่มสินค้า",
                });
              }}
              onTransferItem={() => {
                toast({
                  title: "เลือกตำแหน่งสินค้า",
                  description: "กรุณาเลือกตำแหน่ง (Location) ต้นทางจากตาราง หรือสแกน QR Code ก่อนเริ่มย้ายสินค้า",
                });
              }}
              onWarehouseTransfer={(items) => {
                console.log('Warehouse transfer:', items);
                toast({
                  title: "ยังไม่พร้อมใช้งาน",
                  description: "ฟีเจอร์ย้ายคลังอยู่ระหว่างการพัฒนา",
                });
              }}
              onExportItem={async (id, cartonQty, boxQty, looseQty, destination, notes) => {
                console.log('Export item:', { id, cartonQty, boxQty, looseQty, destination, notes });
                toast({
                  title: "บันทึกการส่งออก",
                  description: "ระบบได้รับข้อมูลการส่งออกแล้ว (Simulation)",
                });
              }}
              onScanQR={() => {
                setShowQRScanner(true);
              }}
            />
          </Suspense>
        );

      case 'stock-overview':
        return (
          <Suspense fallback={<ComponentLoadingFallback componentName="Stock Overview" />}>
            <StockOverviewPage
              warehouseId={selectedWarehouseId}
              onLocationClick={(location) => {
                console.log('Location clicked:', location);
              }}
            />
          </Suspense>
        );

      case 'inventory':
        return (
          <Suspense fallback={<ComponentLoadingFallback componentName="Inventory Table" />}>
            <InventoryTable items={inventoryItems} />
          </Suspense>
        );

      case 'shelf':
        return (
          <Suspense fallback={<ComponentLoadingFallback componentName="Shelf Grid" />}>
            <ShelfGrid
              items={inventoryItems}
              warehouseId={selectedWarehouseId}
              onShelfClick={(location, item) => {
                console.log('Shelf clicked:', location, item);
                // Navigate to location detail page
                // Note: The formatLocation used in ShelfGrid produces "A1/4" which is URL-safe but using encodeURIComponent is safer
                // However, our router expects /location/:id and LocationDetail uses normalization.
                // Using encodeURIComponent to handle slash safely in URL param
                const encodedLocation = encodeURIComponent(location);
                window.location.href = `/location/${encodedLocation}`;
              }}
            />
          </Suspense>
        );

      case 'locations':
        return (
          <Suspense fallback={<ComponentLoadingFallback componentName="Location Management" />}>
            <LocationManagement />
          </Suspense>
        );

      case 'stock-card':
        return (
          <Suspense fallback={<ComponentLoadingFallback componentName="Stock Card" />}>
            <StockCardTabNew />
          </Suspense>
        );

      case 'packing-list':
        return (
          <Suspense fallback={<ComponentLoadingFallback componentName="Packing List" />}>
            <PackingListTab />
          </Suspense>
        );

      case 'daily-shipment':
        return (
          <Suspense fallback={<ComponentLoadingFallback componentName="Daily Shipment" />}>
            <DailyShipmentSummary />
          </Suspense>
        );

      case 'finance':
        return (
          <Suspense fallback={<ComponentLoadingFallback componentName="Finance" />}>
            <PinGuard currentPage="finance">
              <FinanceDashboard />
            </PinGuard>
          </Suspense>
        );

      case 'analytics':
        return (
          <Suspense fallback={<ComponentLoadingFallback componentName="Analytics" />}>
            <SalesAnalytics />
          </Suspense>
        );

      case 'ai-lab':
        return (
          <Suspense fallback={<ComponentLoadingFallback componentName="AI Lab" />}>
            <AIAnalyticsLab />
          </Suspense>
        );

      case 'qr-management':
        return (
          <Suspense fallback={<ComponentLoadingFallback componentName="QR Management" />}>
            <QRCodeManagement items={inventoryItems} />
          </Suspense>
        );

      case 'transfer':
        return (
          <Suspense fallback={<ComponentLoadingFallback componentName="Transfer" />}>
            <TransferTab />
          </Suspense>
        );

      case 'logs':
        return (
          <Suspense fallback={<ComponentLoadingFallback componentName="Logs" />}>
            <EnhancedEventLogs />
          </Suspense>
        );

      case 'users':
        return (
          <Suspense fallback={<ComponentLoadingFallback componentName="User Management" />}>
            <UserManagement />
          </Suspense>
        );

      case 'database':
        return (
          <Suspense fallback={<ComponentLoadingFallback componentName="Database Debug" />}>
            <DatabaseDebug />
          </Suspense>
        );

      case 'operations':
        return (
          <Suspense fallback={<ComponentLoadingFallback componentName="Warehouse Operations" />}>
            <WarehouseOperations />
          </Suspense>
        );

      case 'product-management':
        return (
          <Suspense fallback={<ComponentLoadingFallback componentName="Product Management" />}>
            <Tabs defaultValue="inventory" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3 bg-white border border-gray-200">
                <TabsTrigger value="inventory" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  รายการสต็อก
                </TabsTrigger>
                <TabsTrigger value="products" className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  สรุปสินค้า
                </TabsTrigger>
                <TabsTrigger value="product-mgmt" className="flex items-center gap-2">
                  <PackagePlus className="h-4 w-4" />
                  จัดการข้อมูลสินค้า
                </TabsTrigger>
              </TabsList>

              <TabsContent value="inventory" className="space-y-4">
                <InventoryTable items={inventoryItems} />
              </TabsContent>

              <TabsContent value="products" className="space-y-4">
                <ProductSummaryTable />
              </TabsContent>

              <TabsContent value="product-mgmt" className="space-y-4">
                <ProductManagementPage />
              </TabsContent>
            </Tabs>
          </Suspense>
        );

      default:
        return (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">เลือกเมนูจาก Sidebar</p>
          </div>
        );
    }
  };

  return (
    <ErrorBoundary>
      <AppLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing || loading}
      >
        {renderWarehouseSelector()}
        {renderContent()}

        {/* Global Modals */}
        <Suspense fallback={null}>
          {showQRScanner && (
            <LocationQRScannerModal
              isOpen={showQRScanner}
              onClose={() => setShowQRScanner(false)}
            />
          )}
        </Suspense>
      </AppLayout>
    </ErrorBoundary>
  );
}

