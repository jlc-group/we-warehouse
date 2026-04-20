import { useState, useEffect, useMemo, useCallback, memo, Suspense, lazy } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShelfGrid } from '@/components/ShelfGrid';
import { InventoryTable } from '@/components/InventoryTable';
import { InventoryModalSimple } from '@/components/InventoryModalSimple';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { MovementLogs } from '@/components/MovementLogs';
import { EnhancedEventLogs } from '@/components/EnhancedEventLogs';
import { EnhancedOverview } from '@/components/EnhancedOverview';
import { ExportHistory } from '@/components/ExportHistory';
import { CustomerExportDashboard } from '@/components/CustomerExportDashboard';
import { UnifiedExportHistory } from '@/components/UnifiedExportHistory';
import { QRCodeManager } from '@/components/QRCodeManager';
import { DataRecovery } from '@/components/DataRecovery';
import { DataExport } from '@/components/DataExport';
import { BulkAddModal } from '@/components/BulkAddModal';
import { LocationQRModal } from '@/components/LocationQRModal';
import { LocationTransferModal } from '@/components/location/LocationTransferModal';
import { LocationItemSelector } from '@/components/LocationItemSelector';
import { DebugPermissions } from '@/components/DebugPermissions';
import { QRScanner } from '@/components/QRScanner';
import { FloatingQRScanner } from '@/components/FloatingQRScanner';
import { DatabaseDebug } from '@/components/DatabaseDebug';
import { DisabledComponent } from '@/components/DisabledComponents';
import { UserProfile } from '@/components/profile/UserProfile';
import { ManualExportModal } from '@/components/ManualExportModal';
import { BulkExportModal } from '@/components/BulkExportModal';
import { SPOUTDebug } from '@/components/debug/SPOUTDebug';

const QRCodeManagement = lazy(() => import('@/components/QRCodeManagement'));
const InventoryAnalytics = lazy(() => import('@/components/InventoryAnalytics'));
const LocationManagement = lazy(() => import('@/components/LocationManagementNew'));
// const ProductConfiguration = lazy(() => import('@/components/ProductConfiguration'));
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComponentLoadingFallback } from '@/components/ui/loading-fallback';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { setupQRTable } from '@/utils/setupQRTable';
import {
  generateAllWarehouseLocations,
  normalizeLocation,
  parseWarehouseLocationQR,
  generateWarehouseLocationQR
} from '@/utils/locationUtils';
import { Package, BarChart3, Grid3X3, Table, PieChart, QrCode, Archive, Plus, User, LogOut, Settings, Users, Warehouse, MapPin, Truck, Trash2, PackagePlus, ShoppingCart, Hash, CreditCard, Database as DatabaseIcon, Table2, ArrowRightLeft, FileText, TrendingUp } from 'lucide-react';
import { useDepartmentInventory } from '@/hooks/useDepartmentInventory';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContextSimple';
// Using full UserProfile component with edit capabilities
import { AlertsPanel } from '@/components/inventory/AlertsPanel';
import { ProductSummaryTable } from '@/components/ProductSummaryTable';
import { AddProductForm } from '@/components/AddProductForm';
import { ErrorBoundaryFetch } from '@/components/ErrorBoundaryFetch';
import { WarehouseSelector } from '@/components/WarehouseSelector';
import { EnhancedWarehouseTransferModal } from '@/components/EnhancedWarehouseTransferModal';
import { WarehouseTransferDashboard } from '@/components/WarehouseTransferDashboard';
import { OrdersTab } from '@/components/OrdersTab';
import { OrderStatusDashboard } from '@/components/OrderStatusDashboard';
import { FallbackBanner } from '@/components/FallbackBanner';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { PurchaseOrdersList } from '@/components/PurchaseOrdersList';
import { FulfillmentQueue } from '@/components/FulfillmentQueue';
import { WarehousePickingSystem } from '@/components/WarehousePickingSystem';
import { ProductMasterList } from '@/components/ProductMasterList';
import { DepartmentTransferDashboard } from '@/components/DepartmentTransferDashboard';
import { InboundOutboundDashboard } from '@/components/InboundOutboundDashboard';
import { ProductManagementPage } from '@/components/ProductManagementPage';
import { FloatingActionMenu } from '@/components/FloatingActionMenu';
import { StockOverviewPage } from '@/components/stock-overview/StockOverviewPage';
import { WarehouseManagementPage } from '@/components/WarehouseManagementPage';
// import { ExternalSalesTab } from '@/components/ExternalSalesTab'; // ปิดชั่วคราว - ยังไม่จำเป็นต้องใช้
import { PackingListTab } from '@/components/PackingListTab';
import { DailyShipmentSummary } from '@/components/DailyShipmentSummary';
import { StockCardTab } from '@/components/StockCardTab';
import { StockCardTabNew } from '@/components/StockCardTabNew';
import { TransferTab } from '@/components/TransferTab';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { MobileMenuSheet } from '@/components/MobileMenuSheet';
import { FinanceDashboard } from '@/components/FinanceDashboard';
import { SalesAnalytics } from '@/components/SalesAnalytics';
import { ReservedStockDashboard } from '@/components/ReservedStockDashboard';
import { FinancePasswordGuard } from '@/components/FinancePasswordGuard';

const UserManagement = lazy(() => import('@/components/admin/UserManagement'));
const WarehouseDashboard = lazy(() => import('@/components/departments/WarehouseDashboard'));
const AdvancedAnalytics = lazy(() => import('@/components/inventory/AdvancedAnalytics'));
const BatchManagement = lazy(() => import('@/components/inventory/BatchManagement'));
const ForecastingDashboard = lazy(() => import('@/components/inventory/ForecastingDashboard'));
import type { InventoryItem } from '@/hooks/useDepartmentInventory';
import type { Database } from '@/integrations/supabase/types';

type InventoryItemContext = Database['public']['Tables']['inventory_items']['Row'];

// CRITICAL: Memoized Index component to prevent unnecessary re-renders
const Index = memo(() => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Feature flags for bill clearing system
  const { features, isFallbackMode } = useFeatureFlags();

  // All useState hooks at the top level - no conditional rendering
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isWarehouseTransferModalOpen, setIsWarehouseTransferModalOpen] = useState(false);
  const [isLocationItemSelectorOpen, setIsLocationItemSelectorOpen] = useState(false);
  const [isManualExportModalOpen, setIsManualExportModalOpen] = useState(false);
  const [isBulkExportModalOpen, setIsBulkExportModalOpen] = useState(false);
  const [isCreatingQRTable, setIsCreatingQRTable] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [qrSelectedLocation, setQrSelectedLocation] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | undefined>();
  const [locationItems, setLocationItems] = useState<InventoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [showScanner, setShowScanner] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | undefined>();
  const [selectedItemsForTransfer, setSelectedItemsForTransfer] = useState<InventoryItem[]>([]);
  const [purchaseOrdersSubTab, setPurchaseOrdersSubTab] = useState<string>('po-list');
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Custom hooks after useState hooks
  const { toast } = useToast();
  const { user, signOut } = useAuth();

  // Use useDepartmentInventory for all operations - but with better memoization
  const {
    items: inventoryItems,
    loading,
    connectionStatus,
    addItem,
    updateItem,
    deleteItem,
    exportItem,
    transferItems,
    bulkUploadToSupabase,
    loadSampleData,
    accessSummary,
    permissions,
    refetch,
    clearAllData,
    getItemsAtLocation
  } = useDepartmentInventory(selectedWarehouseId);

  // CRITICAL: Ultra-stable memoization to prevent cascade re-renders
  const stableInventoryItems = useMemo(() => {
    if (!inventoryItems || inventoryItems.length === 0) {
      console.log('📦 No inventory items - returning empty array');
      return [];
    }
    console.log(`📦 Stable inventory: ${inventoryItems.length} items`);
    return inventoryItems;
  }, [inventoryItems]); // ESLint requirement - include full dependency

  // Ultra-stable location calculations
  const inventoryLocations = useMemo(() => {
    if (stableInventoryItems.length === 0) return [];
    const locations = [...new Set(stableInventoryItems.map(item => item.location))];
    console.log(`📍 Locations calculated: ${locations.length} unique`);
    return locations;
  }, [stableInventoryItems]); // ESLint requirement - include full dependency

  // Cache all warehouse locations once (now cached in utility function)
  const allWarehouseLocations = useMemo(() => {
    return generateAllWarehouseLocations();
  }, []); // Empty dependency - computed once

  // CRITICAL: Super stable location merging
  const availableLocations = useMemo(() => {
    // Combine existing inventory locations with all possible locations
    const combinedLocations = [...new Set([...inventoryLocations, ...allWarehouseLocations])];
    console.log(`📋 Available locations: ${combinedLocations.length} total`);
    return combinedLocations.sort();
  }, [inventoryLocations, allWarehouseLocations]); // ESLint requirement - include full dependencies

  // Function to handle navigation to fulfillment queue after task creation
  const handleTaskCreated = useCallback((poNumber: string) => {
    // Switch to purchase-orders tab if not already there
    if (activeTab !== 'purchase-orders') {
      setActiveTab('purchase-orders');
    }
    // Switch to fulfillment sub-tab
    setPurchaseOrdersSubTab('fulfillment');

    // Enhanced toast with action button
    toast({
      title: '✅ สร้างงานสำเร็จ',
      description: `สร้างงานจัดสินค้าสำหรับใบสั่งซื้อ ${poNumber} แล้ว`,
      action: (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setActiveTab('purchase-orders');
            setPurchaseOrdersSubTab('fulfillment');
          }}
          className="ml-2"
        >
          ดูงาน
        </Button>
      ),
    });
  }, [activeTab, toast]);

  const userInitials = useMemo(() => {
    if (user?.full_name) {
      return user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  }, [user?.full_name, user?.email]);

  const userDisplayName = useMemo(() => {
    return user?.full_name || user?.email?.split('@')[0] || 'ผู้ใช้งาน';
  }, [user?.full_name, user?.email]);

  const showWarehouseTab = useMemo(() => {
    return user && ['คลังสินค้า', 'ผู้บริหาร'].includes(user.department);
  }, [user]);

  const showAdminFeatures = useMemo(() => {
    return user && user.role_level >= 4;
  }, [user]);

  // Handle clear data with confirmation
  const handleClearData = useCallback(async () => {
    if (!showAdminFeatures) {
      toast({
        title: '✅ แก้ไขสำเร็จ',
        description: `แก้ไขข้อมูล "${(selectedItem as any).product_name || selectedItem.sku}" ในตำแหน่ง ${selectedItem.location}`,
      });
      return;
    }

    if (clearAllData) {
      await clearAllData();
      setShowClearConfirm(false);
      toast({
        title: '🗑️ ล้างข้อมูลสำเร็จ',
        description: 'ข้อมูลทั้งหมดได้ถูกล้างออกจากระบบแล้ว',
      });
    }
  }, [clearAllData, showAdminFeatures, toast, selectedItem]);

  // CRITICAL: Throttled URL parameters handling to prevent loops
  const [lastUrlProcessTime, setLastUrlProcessTime] = useState(0);
  const URL_PROCESS_THROTTLE = 5000; // 5 seconds

  useEffect(() => {
    const now = Date.now();
    if (now - lastUrlProcessTime < URL_PROCESS_THROTTLE) {
      console.log('🚫 URL parameters processing throttled');
      return;
    }

    const tab = searchParams.get('tab');
    const location = searchParams.get('location');
    const action = searchParams.get('action');

    // Only process if we have actual parameters
    if (!tab && !location && !action) return;

    console.log('🔄 Processing URL parameters:', { tab, location, action });
    setLastUrlProcessTime(now);

    // Always set tab first if provided
    if (tab) {
      setActiveTab(tab);
    }

    // Handle QR code scan with location and action
    if (location && (action === 'add' || action === 'view')) {
      // Use refs to avoid dependency on inventoryItems
      setTimeout(() => {
        setSelectedLocation(location);

        if (action === 'add') {
          setIsModalOpen(true);
          toast({
            title: `🎯 เปิดฟอร์มเพิ่มสินค้าที่ตำแหน่ง: ${location}`,
            description: 'QR Code ทำงานถูกต้อง - กรุณากรอกข้อมูลสินค้า',
            duration: 5000,
          });
        } else if (action === 'view') {
          setQrSelectedLocation(location);
          setIsQRModalOpen(true);

          toast({
            title: `📍 ข้อมูลตำแหน่ง: ${location}`,
            description: 'กำลังโหลดข้อมูลสินค้า...',
            duration: 3000,
          });
        }
      }, 100);

      // Clear URL parameters after handling
      setTimeout(() => {
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('location');
        newSearchParams.delete('action');
        if (tab) newSearchParams.delete('tab');

        const newUrl = newSearchParams.toString() ? '?' + newSearchParams.toString() : '/';
        navigate(newUrl, { replace: true });
      }, 1000);
    }
  }, [searchParams, navigate, toast, lastUrlProcessTime]); // Remove inventoryItems dependency

  const handleLocationScan = useCallback((locationId: string) => {
    console.log('🏗️ Location QR scanned:', locationId);

    // Parse QR data to extract warehouse and location
    const qrData = parseWarehouseLocationQR(locationId);

    if (qrData) {
      // If warehouse is different from current selection, update warehouse filter
      if (selectedWarehouseId !== qrData.warehouseCode) {
        // Find warehouse ID by code
        // For now, navigate with full location - warehouse switching will be handled in LocationDetail
        console.log('📍 QR contains warehouse info:', qrData.warehouseCode, 'Current:', selectedWarehouseId);
      }

      // Navigate to LocationDetailPage with full location including warehouse
      navigate(`/location/${encodeURIComponent(qrData.fullLocation)}`);

      toast({
        title: `📍 กำลังเปิดหน้า Location`,
        description: `${qrData.warehouseCode === 'MAIN' ? '' : qrData.warehouseCode + ' - '}${qrData.location}`,
        duration: 3000,
      });
    } else {
      // Fallback for invalid QR codes
      navigate(`/location/${encodeURIComponent(locationId)}`);

      toast({
        title: `📍 กำลังเปิดหน้า Location`,
        description: `ตำแหน่ง: ${locationId}`,
        duration: 3000,
      });
    }
  }, [navigate, toast, selectedWarehouseId]);

  const handleShelfClick = useCallback((location: string, item?: InventoryItem) => {
    // Normalize the location for consistent matching
    const normalizedLocation = normalizeLocation(location);

    // Find all items at this location
    const itemsAtLocation = inventoryItems.filter(inventoryItem =>
      normalizeLocation(inventoryItem.location) === normalizedLocation
    );

    console.log('🎯 handleShelfClick called:');
    console.log('  Location (raw):', location);
    console.log('  Location (normalized):', normalizedLocation);
    console.log('  Items at location:', itemsAtLocation.length);
    itemsAtLocation.forEach((item, idx) => {
      console.log(`  Item ${idx + 1}:`, {
        product_name: item.product_name,
        location: item.location,
        sku: item.sku,
        unit_level3_quantity: item.unit_level3_quantity,
        carton_quantity_legacy: item.carton_quantity_legacy,
        box_quantity_legacy: item.box_quantity_legacy,
        pieces_quantity_legacy: item.pieces_quantity_legacy
      });
    });

    setSelectedLocation(normalizedLocation);

    // If any items exist at this location, show the LocationItemSelector
    if (itemsAtLocation.length >= 1) {
      setLocationItems(itemsAtLocation);
      setIsLocationItemSelectorOpen(true);
    } else {
      // Empty location - use the existing modal for adding new item
      setSelectedItem(undefined); // Clear any selected item for new item creation
      setIsModalOpen(true);
    }
  }, [inventoryItems]);

  // Handler for Stock Overview location click
  const handleStockOverviewLocationClick = useCallback((location: string) => {
    console.log('📍 Stock Overview location clicked:', location);

    // Filter items for this location
    const itemsAtLocation = inventoryItems.filter(item => {
      const normalizedItemLocation = item.location?.trim().toUpperCase();
      const normalizedTargetLocation = location.trim().toUpperCase();
      return normalizedItemLocation === normalizedTargetLocation;
    });

    console.log(`Found ${itemsAtLocation.length} items at location ${location}`);

    // Set selected location and items
    setSelectedLocation(location);
    setLocationItems(itemsAtLocation);

    // Open LocationItemSelector modal
    setIsLocationItemSelectorOpen(true);
  }, [inventoryItems]);

  // Location handlers for LocationItemSelector
  const handleLocationTransfer = useCallback(() => {
    // Open transfer modal
    setIsLocationItemSelectorOpen(false);
    setIsTransferModalOpen(true);
  }, []);

  const handleLocationExport = useCallback(() => {
    console.log('📤 handleLocationExport called');
    console.log('  selectedLocation:', selectedLocation);
    console.log('  locationItems:', locationItems);
    console.log('  locationItems.length:', locationItems.length);
    locationItems.forEach((item, idx) => {
      console.log(`  📦 Item ${idx + 1} being sent to modal:`, {
        id: item.id,
        product_name: item.product_name,
        location: item.location,
        sku: item.sku,
        unit_level3_quantity: item.unit_level3_quantity,
        carton_quantity_legacy: item.carton_quantity_legacy,
        box_quantity_legacy: item.box_quantity_legacy
      });
    });

    // Open manual export modal
    setIsLocationItemSelectorOpen(false);
    setIsManualExportModalOpen(true);
  }, [selectedLocation, locationItems]);

  const handleQRCodeClick = useCallback((location: string) => {
    setQrSelectedLocation(location);
    setIsQRModalOpen(true);
  }, []);

  const handleSaveItem = useCallback(async (itemData: {
    product_name: string;
    product_code: string;
    location: string;
    lot?: string;
    mfd?: string;
    quantity_boxes: number;
    quantity_loose: number;
    quantity_pieces?: number;
    unit?: string;
    unit_level1_rate?: number;
    unit_level2_rate?: number;
  }) => {
    try {
      // Validate permissions and prepare data

      const dbItemData = {
        product_name: itemData.product_name || '',
        sku: itemData.product_code || '',
        location: itemData.location || '',
        lot: itemData.lot || null,
        mfd: itemData.mfd || null,
        unit: itemData.unit || 'กล่อง',
        // Use ACTUAL database columns - ป้องกัน null constraint violations
        carton_quantity_legacy: Number(itemData.quantity_boxes) || 0,    // ลัง
        box_quantity_legacy: Number(itemData.quantity_loose) || 0,       // กล่อง/เศษ
        pieces_quantity_legacy: Number(itemData.quantity_pieces) || 0,   // ชิ้น
        quantity_pieces: Number(itemData.quantity_pieces) || 0,          // ชิ้น (new field)
        // Multi-level unit fields
        unit_level1_quantity: Number(itemData.quantity_boxes) || 0,      // ลัง
        unit_level2_quantity: Number(itemData.quantity_loose) || 0,      // กล่อง
        unit_level3_quantity: Number(itemData.quantity_pieces) || 0,     // ชิ้น
        unit_level1_name: 'ลัง',
        unit_level2_name: 'กล่อง',
        unit_level3_name: 'ชิ้น',
        unit_level1_rate: Number(itemData.unit_level1_rate) || 0,
        unit_level2_rate: Number(itemData.unit_level2_rate) || 0,
      };

      // Process data for database

      let result;
      if (selectedItem) {
        result = await updateItem(selectedItem.id, dbItemData);
      } else {
        result = await addItem(dbItemData);
      }

      // Only close modal if operation was successful
      if (result !== null) {
        setIsModalOpen(false);
        setSelectedItem(undefined);
        // Local state already updated by useInventory
      }
    } catch (error) {
      // Error handling is done in the hook - keep modal open for retry
      console.error('Error in handleSaveItem:', error);
    }
  }, [selectedItem, updateItem, addItem]);

  const handleBulkSave = useCallback(async (locations: string[], itemData: {
    product_name: string;
    sku: string;
    lot?: string;
    mfd?: string;
    box_quantity: number;
    loose_quantity: number;
    pieces_quantity: number;
    unit_level1_rate?: number;
    unit_level2_rate?: number;
  }) => {
    try {
      console.log('🚀 handleBulkSave started:', {
        locationCount: locations.length,
        locations,
        itemData
      });

      let successCount = 0;

      for (const location of locations) {
        console.log(`📍 Processing location: ${location}`);

        const result = await addItem({
          ...itemData,
          location: location,
          // Map BulkAddModal data to addItem expected fields
          quantity_boxes: itemData.box_quantity,
          quantity_loose: itemData.loose_quantity,
          pieces_quantity_legacy: itemData.pieces_quantity,
          unit_level1_quantity: itemData.box_quantity,
          unit_level2_quantity: itemData.loose_quantity,
          unit_level3_quantity: itemData.pieces_quantity,
          unit_level1_rate: itemData.unit_level1_rate || 144,
          unit_level2_rate: itemData.unit_level2_rate || 12,
          // Add warehouse and user information
          warehouse_id: 'c6f43c5a-3949-46fd-9165-a3cd6e0b7509', // Default to main warehouse
          user_id: '00000000-0000-0000-0000-000000000000' // Default user ID for system
        });

        if (result !== null) {
          successCount++;
          console.log(`✅ Successfully added item to ${location}`);
        } else {
          console.log(`❌ Failed to add item to ${location}`);
        }
      }

      console.log(`🎯 Bulk save completed: ${successCount}/${locations.length} successful`);
      // Bulk save completed, local state updated

    } catch (error) {
      // Error handling is done in the hook
      console.error('❌ Error in handleBulkSave:', error);
    }
  }, [addItem]);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedItem(undefined);
  }, []);

  const handleBulkModalClose = useCallback(() => {
    setIsBulkModalOpen(false);
  }, []);

  const handleQRModalClose = useCallback(() => {
    setIsQRModalOpen(false);
  }, []);

  const handleTransferModalClose = useCallback(() => {
    setIsTransferModalOpen(false);
  }, []);

  const handleLocationItemSelectorClose = useCallback(() => {
    setIsLocationItemSelectorOpen(false);
    setLocationItems([]);
  }, []);

  const handleSelectEditItem = useCallback((item: InventoryItem) => {
    setSelectedItem(item);
    setIsLocationItemSelectorOpen(false);
    setIsModalOpen(true);
  }, []);

  const handleDeleteLocationItem = useCallback(async (itemId: string) => {
    try {
      await deleteItem(itemId);
      // Update the locationItems state to remove the deleted item
      setLocationItems(prev => prev.filter(item => item.id !== itemId));
      return true;
    } catch (error) {
      throw error; // Let the LocationItemSelector component handle the error display
    }
  }, [deleteItem]);

  const handleClearLocationItems = useCallback(async () => {
    try {
      // Delete all items at the selected location
      const itemIdsToDelete = locationItems.map(item => item.id);

      // Delete items sequentially to avoid race conditions
      for (const itemId of itemIdsToDelete) {
        await deleteItem(itemId);
      }

      setIsLocationItemSelectorOpen(false);
      setLocationItems([]);
      return true;
    } catch (error) {
      throw error; // Let the LocationItemSelector component handle the error display
    }
  }, [locationItems, deleteItem]);

  const handleAddNewItemAtLocation = useCallback(() => {
    // Close the LocationItemSelector and open the InventoryModalSimple for adding new item
    setIsLocationItemSelectorOpen(false);
    setSelectedItem(undefined); // Clear any selected item to indicate this is a new item
    setIsModalOpen(true);
  }, []);

  const handleSetupQRTable = useCallback(async () => {
    setIsCreatingQRTable(true);
    try {
      await setupQRTable();
      toast({
        title: '✅ สร้างตาราง QR สำเร็จ',
        description: 'ตอนนี้สามารถใช้งาน QR Code ได้แล้ว',
      });
    } catch (error) {
      toast({
        title: '⚠️ ต้องสร้างตารางด้วยตนเอง',
        description: 'กรุณาดู Console (F12) สำหรับ SQL script หรือดู migration file',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingQRTable(false);
    }
  }, [toast]);

  const handleTestQRUrl = useCallback(() => {
    // Test the QR URL functionality
    const testLocation = 'A7/4';

    toast({
      title: '🧪 Test QR URL สำหรับ A7/4',
      description: `จะเปิดหน้า QR Modal พร้อมข้อมูลจริง`,
      duration: 3000,
    });

    // Navigate to the test URL
    navigate(`?tab=overview&location=${encodeURIComponent(testLocation)}&action=view`);
  }, [navigate, toast]);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
  }, []);

  const handleOpenBulkModal = useCallback(() => {
    setIsBulkModalOpen(true);
  }, []);

  const handleOpenTransferModal = useCallback(() => {
    setIsTransferModalOpen(true);
  }, []);


  return (
    <div className="min-h-screen bg-white pb-20 lg:pb-0">
      <div className="w-full mx-auto px-2 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-8 max-w-[1920px]">
        {/* Header */}
        <Card className="bg-white border border-gray-200">
          <CardHeader className="p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Package className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="hidden sm:inline">ระบบจัดการคลัง Inventory Warehouse</span>
                  <span className="sm:hidden">คลังสินค้า</span>
                </CardTitle>

                {/* Warehouse Selector */}
                <WarehouseSelector
                  selectedWarehouseId={selectedWarehouseId}
                  onWarehouseChange={setSelectedWarehouseId}
                  showAddButton={true}
                  className="min-w-0 w-full sm:w-auto"
                />
              </div>

              {/* User Profile Section */}
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium">{user?.role || 'ผู้ใช้งาน'}</p>
                  <div className="flex items-center gap-2">
                    {user?.department && (
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: '#3b82f6',
                          color: '#3b82f6',
                        }}
                      >
                        {user.department}
                      </Badge>
                    )}
                    {user?.role && (
                      <Badge variant="secondary">
                        {user.role}
                      </Badge>
                    )}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full">
                      <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                        <AvatarImage src={user?.avatar_url} alt={user?.full_name || 'User'} />
                        <AvatarFallback>
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-white border border-gray-200 shadow-lg" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {userDisplayName}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user?.email || user?.email}
                        </p>
                        {user?.employee_code && (
                          <p className="text-xs leading-none text-muted-foreground">
                            รหัส: {user.employee_code}
                          </p>
                        )}
                        {!user && (
                          <p className="text-xs leading-none text-orange-600">
                            กำลังโหลดข้อมูลโปรไฟล์...
                          </p>
                        )}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {showAdminFeatures && (
                      <>
                        <DropdownMenuItem onClick={() => navigate('/admin')}>
                          <Users className="mr-2 h-4 w-4" />
                          <span>Admin จัดการสิทธิ์</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setActiveTab('management')}>
                          <Archive className="mr-2 h-4 w-4" />
                          <span>จัดการ</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setShowClearConfirm(true)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>ล้างข้อมูลทั้งหมด</span>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem onClick={() => setActiveTab('profile')}>
                      <User className="mr-2 h-4 w-4" />
                      <span>โปรไฟล์</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>ตั้งค่า</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>ออกจากระบบ</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent className="bg-white p-3 sm:p-6">
            {loading && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <ComponentLoadingFallback componentName="ระบบคลังสินค้า" />
              </div>
            )}

            {!loading && inventoryItems.length === 0 && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-6 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="text-center space-y-2 sm:space-y-4">
                  <div className="text-orange-600 text-base sm:text-lg font-semibold">
                    📦 ไม่พบข้อมูลในระบบ
                  </div>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    ระบบไม่พบข้อมูลสินค้าในคลัง กรุณาใช้แท็บ "กู้คืนข้อมูล" เพื่อเพิ่มข้อมูล
                  </p>
                </div>
              </div>
            )}

            {!loading && inventoryItems.length > 0 && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="text-sm sm:text-base text-green-700 font-medium">
                    ✅ พบข้อมูลสินค้า {inventoryItems.length} รายการ
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    สถานะ: {connectionStatus === 'connected' ? '🟢 เชื่อมต่อแล้ว' :
                      connectionStatus === 'connecting' ? '🟡 กำลังเชื่อมต่อ...' :
                        '🔴 ไม่สามารถเชื่อมต่อได้'}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {loading ? 'กำลังโหลด...' : `จำนวนสินค้าทั้งหมด: ${inventoryItems.length} รายการ`}
                </p>
                {accessSummary && (
                  <p className="text-xs text-blue-600 mt-1">
                    🔒 เข้าถึงได้ {accessSummary.accessibleItems}/{accessSummary.totalItems} รายการ ({accessSummary.accessPercentage}%)
                  </p>
                )}
                <p className="text-xs sm:text-sm text-success mt-1 sm:mt-2">
                  ✅ ระบบพร้อมใช้งาน
                </p>
              </div>

              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                {permissions.canAdd && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenBulkModal}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    เพิ่มหลายตำแหน่ง
                  </Button>
                )}
                {permissions.canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenTransferModal}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    <Truck className="h-4 w-4" />
                    ย้ายสินค้า
                  </Button>
                )}

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSetupQRTable}
                  disabled={isCreatingQRTable || loading}
                  className="flex items-center gap-2"
                >
                  <QrCode className="h-4 w-4" />
                  {isCreatingQRTable ? 'กำลังสร้าง...' : 'สร้างตาราง QR'}
                </Button>

                <Button
                  onClick={handleTestQRUrl}
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

        {/* Navigation Tabs - 5 Main Categories with Permission-based Access */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="hidden lg:grid w-full grid-cols-5 bg-white border border-gray-200 h-auto">
            {/* 📊 ภาพรวม - Everyone can access */}
            <TabsTrigger value="overview" className="flex items-center gap-2 h-12 hover:bg-gray-50">
              <PieChart className="h-4 w-4" />
              <span>📊 ภาพรวม</span>
            </TabsTrigger>

            {/* 📦 คลังสินค้า - Everyone can access */}
            <TabsTrigger value="warehouse" className="flex items-center gap-2 h-12 bg-green-50 hover:bg-green-100">
              <Warehouse className="h-4 w-4 text-green-600" />
              <span className="text-green-600 font-medium">📦 คลังสินค้า</span>
            </TabsTrigger>

            {/* 💰 การเงิน - Everyone can access */}
            <TabsTrigger value="finance" className="flex items-center gap-2 h-12 bg-yellow-50 hover:bg-yellow-100">
              <CreditCard className="h-4 w-4 text-yellow-600" />
              <span className="text-yellow-600 font-medium">💰 การเงิน</span>
            </TabsTrigger>

            {/* 📈 รายงาน - Everyone can access */}
            <TabsTrigger value="reports" className="flex items-center gap-2 h-12 bg-blue-50 hover:bg-blue-100">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <span className="text-blue-600 font-medium">📈 รายงาน</span>
            </TabsTrigger>

            {/* 🔧 เครื่องมือ - Everyone can access */}
            <TabsTrigger value="tools" className="flex items-center gap-2 h-12 hover:bg-gray-50">
              <Settings className="h-4 w-4" />
              <span>🔧 เครื่องมือ</span>
            </TabsTrigger>
          </TabsList>


          {/* 📊 ภาพรวม - Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <EnhancedOverview
              items={inventoryItems}
              warehouseId={selectedWarehouseId}
              onShelfClick={handleShelfClick}
              onAddItem={() => setIsModalOpen(true)}
              onTransferItem={() => setIsTransferModalOpen(true)}
              onWarehouseTransfer={(items) => {
                setSelectedItemsForTransfer(items);
                setIsWarehouseTransferModalOpen(true);
              }}
              onExportItem={exportItem}
              onScanQR={() => setShowScanner(true)}
              onBulkExport={() => setIsBulkExportModalOpen(true)}
              loading={loading}
            />
          </TabsContent>

          {/* 📦 คลังสินค้า - Warehouse Tab with 8 sub-tabs */}
          <TabsContent value="warehouse" className="space-y-4">
            <Tabs defaultValue="packing-list" className="space-y-4">
              <TabsList className="grid w-full grid-cols-8 bg-white border border-gray-200">
                <TabsTrigger value="inbound-outbound" className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  รับเข้า-ส่งออก
                </TabsTrigger>
                <TabsTrigger value="packing-list" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  รายการส่งของ
                </TabsTrigger>
                <TabsTrigger value="daily-shipment" className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  สรุปส่ง Csmile
                </TabsTrigger>
                <TabsTrigger value="warehouse-management" className="flex items-center gap-2">
                  <Warehouse className="h-4 w-4" />
                  จัดการคลัง
                </TabsTrigger>
                <TabsTrigger value="stock-overview" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  สรุปสต็อก
                </TabsTrigger>
                <TabsTrigger value="stock-card" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Stock Card
                </TabsTrigger>
                <TabsTrigger value="stock-transfer" className="flex items-center gap-2 bg-purple-50">
                  <ArrowRightLeft className="h-4 w-4 text-purple-600" />
                  <span className="text-purple-600">ใบโอนย้าย</span>
                </TabsTrigger>
                <TabsTrigger value="table" className="flex items-center gap-2">
                  <Table2 className="h-4 w-4" />
                  ตารางข้อมูล
                </TabsTrigger>
                <TabsTrigger value="transfers" className="flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4" />
                  จัดการการย้าย
                </TabsTrigger>
              </TabsList>

              <TabsContent value="inbound-outbound" className="space-y-4">
                <InboundOutboundDashboard />
              </TabsContent>

              <TabsContent value="packing-list" className="space-y-4">
                <PackingListTab />
              </TabsContent>

              <TabsContent value="daily-shipment" className="space-y-4">
                <DailyShipmentSummary />
              </TabsContent>

              <TabsContent value="warehouse-management" className="space-y-4">
                <WarehouseManagementPage />
              </TabsContent>

              <TabsContent value="stock-overview" className="space-y-4">
                <StockOverviewPage
                  warehouseId={selectedWarehouseId}
                  onLocationClick={handleStockOverviewLocationClick}
                />
              </TabsContent>

              <TabsContent value="stock-card" className="space-y-4">
                <StockCardTabNew
                  documentTypeFilter="non-transfer"
                  title="Stock Card - ใบขาย และ ใบรับซื้อ"
                />
              </TabsContent>

              <TabsContent value="stock-transfer" className="space-y-4">
                <TransferTab />
              </TabsContent>

              <TabsContent value="table" className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">กำลังโหลดข้อมูล...</div>
                ) : (
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
                      <TabsTrigger value="product-management" className="flex items-center gap-2">
                        <PackagePlus className="h-4 w-4" />
                        จัดการข้อมูลสินค้า
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="inventory" className="space-y-4">
                      <InventoryTable
                        key={`inventory-table-${inventoryItems.length}`}
                        items={inventoryItems}
                      />
                    </TabsContent>

                    <TabsContent value="products" className="space-y-4">
                      <ProductSummaryTable />
                    </TabsContent>

                    <TabsContent value="product-management" className="space-y-4">
                      <ProductManagementPage />
                    </TabsContent>
                  </Tabs>
                )}
              </TabsContent>

              <TabsContent value="transfers" className="space-y-4">
                <Tabs defaultValue="warehouse-transfer" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2 bg-white border border-gray-200">
                    <TabsTrigger value="warehouse-transfer" className="flex items-center gap-2">
                      <Warehouse className="h-4 w-4" />
                      ย้ายข้าม Warehouse
                    </TabsTrigger>
                    <TabsTrigger value="department-transfer" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      ย้ายข้ามแผนก
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="warehouse-transfer" className="space-y-4">
                    <WarehouseTransferDashboard
                      onCreateTransfer={() => setIsWarehouseTransferModalOpen(true)}
                    />
                  </TabsContent>

                  <TabsContent value="department-transfer" className="space-y-4">
                    <DepartmentTransferDashboard />
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* 💰 การเงิน - Finance Tab - Keep as is */}
          <TabsContent value="finance" className="space-y-4">
            <Tabs defaultValue="dashboard" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3 bg-white border border-gray-200">
                <TabsTrigger value="dashboard" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Dashboard การเงิน
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  วิเคราะห์การขาย
                </TabsTrigger>
                <TabsTrigger value="bill-status" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  ตรวจสอบสถานะ
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard">
                <FinancePasswordGuard>
                  <FinanceDashboard />
                </FinancePasswordGuard>
              </TabsContent>

              <TabsContent value="analytics">
                <FinancePasswordGuard>
                  <SalesAnalytics />
                </FinancePasswordGuard>
              </TabsContent>

              <TabsContent value="bill-status">
                <FallbackBanner
                  show={isFallbackMode || !features.orderStatusHistory}
                  type="info"
                  title="ระบบตรวจสอบสถานะอยู่ในโหมดสำรอง"
                  description="การติดตามประวัติสถานะและสิทธิ์จะใช้ข้อมูลเริ่มต้น เมื่อ apply migration แล้วจะมีข้อมูลครบถ้วน"
                  showMigrationButton={true}
                />
                <OrderStatusDashboard userRole="bill_checker" />
              </TabsContent>

              {/* ซ่อน Bill Clearing ไว้ก่อน - ยังไม่ได้ใช้งาน */}
              {/* <TabsContent value="bill-clearing">
                <FallbackBanner
                  show={isFallbackMode || !features.billClearing}
                  type="info"
                  title="ระบบ Bill Clearing อยู่ในโหมดสำรอง"
                  description="ฐานข้อมูลยังไม่มีตารางสำหรับระบบ Bill Clearing ครบถ้วน การทำงานจะใช้ข้อมูลเดิมและฟังก์ชันสำรอง"
                  showMigrationButton={true}
                />
                <OrderStatusDashboard userRole="bill_clearer" />
              </TabsContent> */}
            </Tabs>
          </TabsContent>

          {/* 📈 รายงาน - Reports Tab with 3 sub-tabs */}
          <TabsContent value="reports" className="space-y-4">
            <Tabs defaultValue="analytics" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3 bg-white border border-gray-200">
                <TabsTrigger value="analytics" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="department-analytics" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Analytics แผนก
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <Archive className="h-4 w-4" />
                  ประวัติ
                </TabsTrigger>
              </TabsList>

              <TabsContent value="analytics" className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">กำลังโหลดข้อมูล...</div>
                ) : (
                  <Tabs defaultValue="monitoring" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-5 bg-white border border-gray-200">
                      <TabsTrigger value="monitoring">📊 ภาพรวมและการติดตาม</TabsTrigger>
                      <TabsTrigger value="alerts">🔔 การแจ้งเตือนและควบคุม</TabsTrigger>
                      <TabsTrigger value="analysis">📈 การวิเคราะห์และประสิทธิภาพ</TabsTrigger>
                      <TabsTrigger value="forecasting">🔮 การพยากรณ์และวางแผน</TabsTrigger>
                      <TabsTrigger value="technical">🛠️ เทคนิคและระบบ</TabsTrigger>
                    </TabsList>

                    <TabsContent value="monitoring" className="space-y-4">
                      <div className="grid gap-4">
                        <Suspense fallback={<ComponentLoadingFallback componentName="Analytics Overview" />}>
                          <InventoryAnalytics items={inventoryItems} />
                        </Suspense>
                        {showWarehouseTab && (
                          <Suspense fallback={<ComponentLoadingFallback componentName="Warehouse Dashboard" />}>
                            <WarehouseDashboard />
                          </Suspense>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="alerts" className="space-y-4">
                      <AlertsPanel />
                    </TabsContent>

                    <TabsContent value="analysis" className="space-y-4">
                      <Suspense fallback={<ComponentLoadingFallback componentName="Advanced Analytics" />}>
                        <AdvancedAnalytics warehouseId={selectedWarehouseId} />
                      </Suspense>
                    </TabsContent>

                    <TabsContent value="forecasting" className="space-y-4">
                      <div className="grid gap-4">
                        <Suspense fallback={<ComponentLoadingFallback componentName="Forecasting Dashboard" />}>
                          <ForecastingDashboard warehouseId={selectedWarehouseId} />
                        </Suspense>
                        <Suspense fallback={<ComponentLoadingFallback componentName="Batch Management" />}>
                          <BatchManagement warehouseId={selectedWarehouseId} />
                        </Suspense>
                      </div>
                    </TabsContent>

                    <TabsContent value="technical" className="space-y-4">
                      <div className="space-y-4">
                        <DatabaseDebug />
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
              </TabsContent>

              <TabsContent value="department-analytics" className="space-y-4">
                {showWarehouseTab && (
                  <Suspense fallback={<ComponentLoadingFallback componentName="Warehouse Dashboard" />}>
                    <WarehouseDashboard />
                  </Suspense>
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                <Tabs defaultValue="export_history" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="export_history">ประวัติการส่งออก</TabsTrigger>
                    <TabsTrigger value="customer_dashboard">Dashboard ลูกค้า</TabsTrigger>
                    <TabsTrigger value="unified_export">วิเคราะห์การส่งออก</TabsTrigger>
                    <TabsTrigger value="movement_logs">ประวัติสต็อก</TabsTrigger>
                    <TabsTrigger value="reserved_stock">🔒 Reserved Stock</TabsTrigger>
                    <TabsTrigger value="system_events">กิจกรรมระบบ</TabsTrigger>
                  </TabsList>
                  <TabsContent value="export_history">
                    <ExportHistory />
                  </TabsContent>
                  <TabsContent value="customer_dashboard">
                    <CustomerExportDashboard />
                  </TabsContent>
                  <TabsContent value="unified_export">
                    <UnifiedExportHistory />
                  </TabsContent>
                  <TabsContent value="movement_logs">
                    <MovementLogs />
                  </TabsContent>
                  <TabsContent value="reserved_stock">
                    <ReservedStockDashboard />
                  </TabsContent>
                  <TabsContent value="system_events">
                    <EnhancedEventLogs />
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* 🔧 เครื่องมือ - Tools Tab with 3 sub-tabs */}
          <TabsContent value="tools" className="space-y-4">
            <Tabs defaultValue="qr-scanner" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3 bg-white border border-gray-200">
                <TabsTrigger value="qr-scanner" className="flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  📱 QR Scanner
                </TabsTrigger>
                <TabsTrigger value="qr-management" className="flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  🏷️ จัดการ QR
                </TabsTrigger>
                {showAdminFeatures && (
                  <TabsTrigger value="location-management" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    📍 จัดการตำแหน่ง
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="qr-scanner" className="space-y-4">
                <QRCodeManager
                  items={inventoryItems}
                  onShelfClick={handleShelfClick}
                  onSaveItem={handleSaveItem}
                />
              </TabsContent>

              <TabsContent value="qr-management" className="space-y-4">
                <Suspense fallback={<ComponentLoadingFallback componentName="QR Code Management" />}>
                  <QRCodeManagement items={inventoryItems} />
                </Suspense>
              </TabsContent>

              {showAdminFeatures && (
                <TabsContent value="location-management" className="space-y-4">
                  <Suspense fallback={<ComponentLoadingFallback componentName="Location Management" />}>
                    <LocationManagement />
                  </Suspense>
                </TabsContent>
              )}
            </Tabs>
          </TabsContent>

          {/* Old management tab - can be removed or kept for admin */}
          <TabsContent value="management" className="space-y-4">
            <Tabs defaultValue="recovery" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3 bg-white border border-gray-200">
                <TabsTrigger value="recovery">กู้คืนข้อมูล</TabsTrigger>
                <TabsTrigger value="export">Import/Export</TabsTrigger>
                <TabsTrigger value="debug-spout">🔍 Debug SPOUT</TabsTrigger>
              </TabsList>

              <TabsContent value="recovery" className="space-y-4">
                <DataRecovery />
              </TabsContent>

              <TabsContent value="export" className="space-y-4">
                <DisabledComponent name="Data Export" />
              </TabsContent>

              <TabsContent value="debug-spout" className="space-y-4">
                <SPOUTDebug />
              </TabsContent>
            </Tabs>
          </TabsContent>



          {showAdminFeatures && (
            <TabsContent value="admin" className="space-y-4">
              <Suspense fallback={<ComponentLoadingFallback componentName="User Management" />}>
                <UserManagement />
              </Suspense>
            </TabsContent>
          )}

          <TabsContent value="profile" className="space-y-4">
            <UserProfile />
          </TabsContent>

          <TabsContent value="debug-spout" className="space-y-4">
            <SPOUTDebug />
          </TabsContent>

          {/* 📦 จัดการสินค้า - Product Management (Direct access from Sidebar) */}
          <TabsContent value="product-management" className="space-y-4">
            {loading ? (
              <div className="text-center py-8">กำลังโหลดข้อมูล...</div>
            ) : (
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
                  <InventoryTable
                    key={`inventory-table-sidebar-${inventoryItems.length}`}
                    items={inventoryItems}
                  />
                </TabsContent>

                <TabsContent value="products" className="space-y-4">
                  <ProductSummaryTable />
                </TabsContent>

                <TabsContent value="product-mgmt" className="space-y-4">
                  <ProductManagementPage />
                </TabsContent>
              </Tabs>
            )}
          </TabsContent>
        </Tabs>

        {/* Inventory Modal */}
        <ErrorBoundary>
          <InventoryModalSimple
            isOpen={isModalOpen}
            onClose={handleModalClose}
            onSave={handleSaveItem}
            location={selectedLocation}
            existingItem={selectedItem}
            otherItemsAtLocation={
              selectedItem
                ? inventoryItems.filter(item =>
                  normalizeLocation(item.location) === normalizeLocation(selectedLocation) &&
                  item.id !== selectedItem.id
                )
                : inventoryItems.filter(item =>
                  normalizeLocation(item.location) === normalizeLocation(selectedLocation)
                )
            }
          />
        </ErrorBoundary>

        {/* Bulk Add Modal */}
        <BulkAddModal
          isOpen={isBulkModalOpen}
          onClose={handleBulkModalClose}
          onSave={handleBulkSave}
          availableLocations={availableLocations}
          inventoryItems={inventoryItems}
        />

        {/* Location QR Modal */}
        <LocationQRModal
          isOpen={isQRModalOpen}
          onClose={handleQRModalClose}
          location={qrSelectedLocation}
          items={inventoryItems}
        />

        {/* Location Transfer Modal */}
        <LocationTransferModal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          fromLocationId={selectedLocation}
          inventory={locationItems.map(item => ({
            id: item.id,
            sku: item.sku,
            product_name: item.product_name,
            unit_level1_quantity: item.unit_level1_quantity,
            unit_level2_quantity: item.unit_level2_quantity,
            unit_level3_quantity: item.unit_level3_quantity,
            unit_level1_name: item.unit_level1_name || 'ลัง',
            unit_level2_name: item.unit_level2_name || 'กล่อง',
            unit_level3_name: item.unit_level3_name || 'ชิ้น',
            unit_level1_rate: item.unit_level1_rate || 24,
            unit_level2_rate: item.unit_level2_rate || 1,
            lot: item.lot,
            mfd: item.mfd,
          }))}
          onSuccess={() => {
            refetch();
            setIsTransferModalOpen(false);
          }}
        />

        {/* Location Item Selector Modal */}
        <LocationItemSelector
          isOpen={isLocationItemSelectorOpen}
          onClose={handleLocationItemSelectorClose}
          location={selectedLocation}
          items={locationItems}
          onSelectEdit={handleSelectEditItem}
          onDeleteItem={handleDeleteLocationItem}
          onClearLocation={handleClearLocationItems}
          onAddNewItem={handleAddNewItemAtLocation}
          onExport={handleLocationExport}
          onTransfer={handleLocationTransfer}
        />

        {/* Manual Export Modal */}
        <ManualExportModal
          isOpen={isManualExportModalOpen}
          onClose={() => setIsManualExportModalOpen(false)}
          location={selectedLocation}
          items={locationItems}
          onExportSuccess={() => {
            // Refresh inventory data
            refetch();
            // Refresh location items
            if (selectedLocation) {
              const updatedItems = getItemsAtLocation(selectedLocation);
              setLocationItems(updatedItems);
            }
          }}
        />

        {/* Bulk Export Modal - ส่งออกหลายรายการพร้อมกัน */}
        <BulkExportModal
          open={isBulkExportModalOpen}
          onOpenChange={setIsBulkExportModalOpen}
          inventoryItems={inventoryItems}
        />

        {/* QR Scanner */}
        <QRScanner
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          onScanSuccess={handleShelfClick}
        />

        {/* Clear Data Confirmation Dialog */}
        <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                ยืนยันการล้างข้อมูล
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                คุณกำลังจะล้างข้อมูลสินค้าทั้งหมดออกจากระบบ การดำเนินการนี้
                <span className="font-bold text-red-600"> ไม่สามารถย้อนกลับได้</span>
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2">ข้อมูลที่จะถูกลบ:</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• ข้อมูลสินค้าทั้งหมด ({inventoryItems.length} รายการ)</li>
                  <li>• ประวัติการเคลื่อนไหวสินค้า</li>
                  <li>• ข้อมูล QR Code ที่เกี่ยวข้อง</li>
                  <li>• ข้อมูลสถิติและรายงาน</li>
                </ul>
              </div>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 <strong>หมายเหตุ:</strong> ข้อมูลสำรองจะถูกเก็บไว้หากได้ทำการ backup แล้ว
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowClearConfirm(false)}
              >
                ยกเลิก
              </Button>
              <Button
                variant="destructive"
                onClick={handleClearData}
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                ยืนยันล้างข้อมูล
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Enhanced Warehouse Transfer Modal */}
        <EnhancedWarehouseTransferModal
          isOpen={isWarehouseTransferModalOpen}
          onClose={() => {
            setIsWarehouseTransferModalOpen(false);
            setSelectedItemsForTransfer([]);
          }}
          selectedItems={selectedItemsForTransfer}
          onSuccess={() => {
            // Refresh inventory data
            refetch();
          }}
        />

        {/* Debug Permissions Component */}
        <DebugPermissions />

        {/* Resource Monitor Component - Temporarily disabled to fix WebSocket conflicts */}
        {/* <ResourceMonitor /> */}
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onMoreClick={() => setShowMobileMenu(true)}
      />

      {/* Mobile Menu Sheet */}
      <MobileMenuSheet
        open={showMobileMenu}
        onOpenChange={setShowMobileMenu}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Floating Action Menu - ปุ่มลอยมุมขวาล่าง (Responsive) */}
      <FloatingActionMenu
        onAddItem={() => {
          setSelectedLocation('');
          setSelectedItem(undefined);
          setIsModalOpen(true);
        }}
        onTransferItem={() => setIsTransferModalOpen(true)}
        onExportItem={() => setIsManualExportModalOpen(true)}
        onScanQR={() => setShowScanner(true)}
        onBulkExport={() => setIsBulkExportModalOpen(true)}
      />
    </div>
  );
});

Index.displayName = 'Index';

export default Index;