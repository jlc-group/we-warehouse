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

import { useAuth } from '@/contexts/AuthContextSimple';

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
          <Suspense fallback={<ComponentLoadingFallback />}>
            <EnhancedOverview
              items={inventoryItems}
              warehouseId={selectedWarehouseId}
              loading={loading}
              onShelfClick={(location, item) => {
                console.log('Shelf clicked:', location, item);
              }}
              onAddItem={() => {
                console.log('Add item clicked');
              }}
              onTransferItem={() => {
                console.log('Transfer item clicked');
              }}
              onWarehouseTransfer={(items) => {
                console.log('Warehouse transfer:', items);
              }}
              onExportItem={async (id, cartonQty, boxQty, looseQty, destination, notes) => {
                console.log('Export item:', id, cartonQty, boxQty, looseQty, destination, notes);
              }}
              onScanQR={() => {
                console.log('Scan QR clicked');
              }}
            />
          </Suspense>
        );

      case 'stock-overview':
        return (
          <Suspense fallback={<ComponentLoadingFallback />}>
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
          <Suspense fallback={<ComponentLoadingFallback />}>
            <InventoryTable items={inventoryItems} />
          </Suspense>
        );

      case 'shelf':
        return (
          <Suspense fallback={<ComponentLoadingFallback />}>
            <ShelfGrid
              items={inventoryItems}
              warehouseId={selectedWarehouseId}
              onShelfClick={(location, item) => {
                console.log('Shelf clicked:', location, item);
                // TODO: เปิด modal หรือ navigate ไปหน้า location detail
              }}
            />
          </Suspense>
        );

      case 'locations':
        return (
          <Suspense fallback={<ComponentLoadingFallback />}>
            <LocationManagement />
          </Suspense>
        );

      case 'stock-card':
        return (
          <Suspense fallback={<ComponentLoadingFallback />}>
            <StockCardTabNew />
          </Suspense>
        );

      case 'packing-list':
        return (
          <Suspense fallback={<ComponentLoadingFallback />}>
            <PackingListTab />
          </Suspense>
        );

      case 'daily-shipment':
        return (
          <Suspense fallback={<ComponentLoadingFallback />}>
            <DailyShipmentSummary />
          </Suspense>
        );

      case 'finance':
        return (
          <Suspense fallback={<ComponentLoadingFallback />}>
            <PinGuard currentPage="finance">
              <FinanceDashboard />
            </PinGuard>
          </Suspense>
        );

      case 'analytics':
        return (
          <Suspense fallback={<ComponentLoadingFallback />}>
            <SalesAnalytics />
          </Suspense>
        );

      case 'ai-lab':
        return (
          <Suspense fallback={<ComponentLoadingFallback />}>
            <AIAnalyticsLab />
          </Suspense>
        );

      case 'qr-management':
        return (
          <Suspense fallback={<ComponentLoadingFallback />}>
            <QRCodeManagement items={inventoryItems} />
          </Suspense>
        );

      case 'transfer':
        return (
          <Suspense fallback={<ComponentLoadingFallback />}>
            <TransferTab />
          </Suspense>
        );

      case 'logs':
        return (
          <Suspense fallback={<ComponentLoadingFallback />}>
            <EnhancedEventLogs />
          </Suspense>
        );

      case 'users':
        return (
          <Suspense fallback={<ComponentLoadingFallback />}>
            <UserManagement />
          </Suspense>
        );

      case 'database':
        return (
          <Suspense fallback={<ComponentLoadingFallback />}>
            <DatabaseDebug />
          </Suspense>
        );

      case 'product-management':
        return (
          <Suspense fallback={<ComponentLoadingFallback />}>
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
      </AppLayout>
    </ErrorBoundary>
  );
}

