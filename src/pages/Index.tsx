import { useState, useEffect, useMemo, useCallback, memo, Suspense, lazy } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShelfGrid } from '@/components/ShelfGrid';
import { InventoryTable } from '@/components/InventoryTable';
import { InventoryModalSimple } from '@/components/InventoryModalSimple';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { MovementLogs } from '@/components/MovementLogs';
import { EnhancedOverview } from '@/components/EnhancedOverview';
import { QRCodeManager } from '@/components/QRCodeManager';
import { DataRecovery } from '@/components/DataRecovery';
import { DataExport } from '@/components/DataExport';
import { BulkAddModal } from '@/components/BulkAddModal';
import { LocationQRModal } from '@/components/LocationQRModal';
import { LocationTransferModal } from '@/components/LocationTransferModal';
import { normalizeLocation } from '@/utils/locationUtils';
import { QRScanner } from '@/components/QRScanner';

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
import { Package, BarChart3, Grid3X3, Table, PieChart, QrCode, Archive, Plus, User, LogOut, Settings, Users, Warehouse, MapPin, Truck, Trash2 } from 'lucide-react';
import { useDepartmentInventory } from '@/hooks/useDepartmentInventory';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContextSimple';
import { UserProfile } from '@/components/profile/UserProfile';
import { AlertsPanel } from '@/components/inventory/AlertsPanel';
import { UnitConversionSettings } from '@/components/UnitConversionSettings';

const UserManagement = lazy(() => import('@/components/admin/UserManagement'));
const WarehouseDashboard = lazy(() => import('@/components/departments/WarehouseDashboard'));
const AdvancedAnalytics = lazy(() => import('@/components/inventory/AdvancedAnalytics'));
const BatchManagement = lazy(() => import('@/components/inventory/BatchManagement'));
const ForecastingDashboard = lazy(() => import('@/components/inventory/ForecastingDashboard'));
import type { InventoryItem } from '@/hooks/useDepartmentInventory';

const Index = memo(() => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // All useState hooks at the top level - no conditional rendering
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isCreatingQRTable, setIsCreatingQRTable] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [qrSelectedLocation, setQrSelectedLocation] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | undefined>();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [showScanner, setShowScanner] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Custom hooks after useState hooks
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const {
    items: inventoryItems,
    loading,
    connectionStatus,
    addItem,
    updateItem,
    exportItem,
    transferItems,
    bulkUploadToSupabase,
    importData,
    accessSummary,
    permissions,
    refetch,
    clearAllData
  } = useDepartmentInventory();

  // Memoized calculations for expensive operations
  const availableLocations = useMemo(
    () => [...new Set(inventoryItems.map(item => item.location))].sort(),
    [inventoryItems]
  );

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
        title: '⚠️ ไม่มีสิทธิ์',
        description: 'คุณไม่มีสิทธิ์ในการล้างข้อมูล',
        variant: 'destructive',
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
  }, [clearAllData, showAdminFeatures, toast]);

  // Handle URL parameters from QR code scan
  useEffect(() => {
    const tab = searchParams.get('tab');
    const location = searchParams.get('location');
    const action = searchParams.get('action');

    // Handle QR URL parameters

    // Always set tab first if provided
    if (tab) {
      setActiveTab(tab);
    }

    // Handle QR code scan with location and action
    if (location && (action === 'add' || action === 'view')) {
      // Delay modal opening slightly to ensure tab is set first
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
          // For view action, find items at this location and show QR modal with real data
          const locationItems = inventoryItems.filter(item => 
            item.location === location || 
            item.location.replace(/\s+/g, '') === location.replace(/\s+/g, '')
          );
          
          // Always show QR modal with real inventory data
          setQrSelectedLocation(location);
          setIsQRModalOpen(true);
          
          if (locationItems.length > 0) {
            toast({
              title: `📍 ข้อมูลตำแหน่ง: ${location}`,
              description: `พบ ${locationItems.length} รายการสินค้า`,
              duration: 5000,
            });
          } else {
            toast({
              title: `📍 ตำแหน่งว่าง: ${location}`,
              description: 'ยังไม่มีสินค้าในตำแหน่งนี้',
              duration: 5000,
            });
          }
        }
      }, 100);

      // Clear URL parameters after handling (with longer delay)
      setTimeout(() => {
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('location');
        newSearchParams.delete('action');
        if (tab) newSearchParams.delete('tab');

        const newUrl = newSearchParams.toString() ? '?' + newSearchParams.toString() : '/';
        navigate(newUrl, { replace: true });
      }, 1000);
    }
  }, [searchParams, navigate, toast, inventoryItems]);

  const handleShelfClick = useCallback((location: string, item?: InventoryItem) => {
    setSelectedLocation(location);
    setSelectedItem(item);
    setIsModalOpen(true);
  }, []);

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
    unit?: string;
    unit_level1_rate?: number;
    unit_level2_rate?: number;
  }) => {
    try {
      // Comprehensive validation before processing
      console.log('🔍 Index handleSubmit - Raw form data:', {
        receivedItemData: itemData,
        selectedItem: selectedItem ? { id: selectedItem.id, product_name: selectedItem.product_name } : null,
        validationCheck: {
          hasProductName: Boolean(itemData.product_name),
          hasProductCode: Boolean(itemData.product_code),
          hasLocation: Boolean(itemData.location),
          quantityBoxes: itemData.quantity_boxes,
          quantityLoose: itemData.quantity_loose,
          quantityBoxesType: typeof itemData.quantity_boxes,
          quantityLooseType: typeof itemData.quantity_loose,
        }
      });

      // Prepare update payload with proper null-safe defaults to prevent constraint violations
      // Updated to use ACTUAL database schema: carton_quantity_legacy, box_quantity_legacy
      const dbItemData = {
        product_name: itemData.product_name || '',
        sku: itemData.product_code || '',
        location: normalizeLocation(itemData.location || ''),
        lot: itemData.lot || null,
        mfd: itemData.mfd || null,
        unit: itemData.unit || 'กล่อง',
        // Use ACTUAL database columns - ป้องกัน null constraint violations
        carton_quantity_legacy: Number(itemData.quantity_boxes) || 0,    // ลัง
        box_quantity_legacy: Number(itemData.quantity_loose) || 0,       // กล่อง/เศษ
        pieces_quantity_legacy: 0,                                       // ชิ้น
        // Multi-level unit fields
        unit_level1_quantity: Number(itemData.quantity_boxes) || 0,      // ลัง
        unit_level2_quantity: Number(itemData.quantity_loose) || 0,      // กล่อง
        unit_level3_quantity: 0,                                         // ชิ้น
        unit_level1_name: 'ลัง',
        unit_level2_name: 'กล่อง',
        unit_level3_name: 'ชิ้น',
        unit_level1_rate: Number(itemData.unit_level1_rate) || 0,
        unit_level2_rate: Number(itemData.unit_level2_rate) || 0,
      };

      // Debug processed data before sending
      console.log('🔍 Index handleSubmit - Processed DB payload:', {
        dbItemData,
        operation: selectedItem ? 'UPDATE' : 'INSERT',
        payloadValidation: {
          allStringsValid: Boolean(dbItemData.product_name && dbItemData.sku && dbItemData.location),
          allNumbersValid: !isNaN(dbItemData.carton_quantity_legacy) && !isNaN(dbItemData.box_quantity_legacy),
          quantityTypes: {
            carton_quantity_legacy: typeof dbItemData.carton_quantity_legacy,
            box_quantity_legacy: typeof dbItemData.box_quantity_legacy,
            pieces_quantity_legacy: typeof dbItemData.pieces_quantity_legacy,
          }
        }
      });

      if (selectedItem) {
        console.log('🔍 Index handleSubmit - Calling updateItem with ID:', selectedItem.id);
        await updateItem(selectedItem.id, dbItemData);
      } else {
        console.log('🔍 Index handleSubmit - Calling addItem for new item');
        await addItem(dbItemData);
      }
      
      setIsModalOpen(false);
      setSelectedItem(undefined);
    } catch (error) {
      // Error handling is done in the hook
    }
  }, [selectedItem, updateItem, addItem]);

  const handleBulkSave = useCallback(async (locations: string[], itemData: {
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
          location: normalizeLocation(location)
        });
      }
    } catch (error) {
      // Error handling is done in the hook
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
    const testLocation = 'A/4/07';

    toast({
      title: '🧪 Test QR URL สำหรับ A/4/07',
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
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-6 w-6" />
                ระบบจัดการคลัง Inventory Warehouse
              </CardTitle>

              {/* User Profile Section */}
              <div className="flex items-center gap-4">
                <div className="text-right">
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
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-9 w-9">
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
                        <DropdownMenuItem onClick={() => setActiveTab('admin')}>
                          <Users className="mr-2 h-4 w-4" />
                          <span>Admin</span>
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
          <CardContent className="bg-white">
            {loading && (
              <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <ComponentLoadingFallback componentName="ระบบคลังสินค้า" />
              </div>
            )}

            {!loading && inventoryItems.length === 0 && (
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

            {!loading && inventoryItems.length > 0 && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="text-green-700 font-medium">
                    ✅ พบข้อมูลสินค้า {inventoryItems.length} รายการ
                  </div>
                  <div className="text-sm text-muted-foreground">
                    สถานะ: {connectionStatus === 'connected' ? '🟢 เชื่อมต่อแล้ว' :
                           connectionStatus === 'connecting' ? '🟡 กำลังเชื่อมต่อ...' :
                           '🔴 ไม่สามารถเชื่อมต่อได้'}
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-muted-foreground">
                  {loading ? 'กำลังโหลด...' : `จำนวนสินค้าทั้งหมด: ${inventoryItems.length} รายการ`}
                </p>
                {accessSummary && (
                  <p className="text-xs text-blue-600 mt-1">
                    🔒 เข้าถึงได้ {accessSummary.accessibleItems}/{accessSummary.totalItems} รายการ ({accessSummary.accessPercentage}%)
                  </p>
                )}
                <p className="text-sm text-success mt-2">
                  ✅ ระบบพร้อมใช้งาน
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
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

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-6 lg:grid-cols-9 bg-white border border-gray-200">
            <TabsTrigger value="grid" className="flex items-center gap-2">
              <Grid3X3 className="h-4 w-4" />
              <span className="hidden sm:inline">แผนผัง</span>
            </TabsTrigger>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              <span className="hidden sm:inline">ภาพรวม</span>
            </TabsTrigger>
            <TabsTrigger value="table" className="flex items-center gap-2">
              <Table className="h-4 w-4" />
              <span className="hidden sm:inline">ตาราง</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="qr" className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              <span className="hidden sm:inline">QR System</span>
            </TabsTrigger>
            <TabsTrigger value="management" className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              <span className="hidden sm:inline">จัดการ</span>
            </TabsTrigger>
            {showWarehouseTab && (
              <TabsTrigger value="warehouse" className="flex items-center gap-2">
                <Warehouse className="h-4 w-4" />
                <span className="hidden sm:inline">แผนก</span>
              </TabsTrigger>
            )}
            {showAdminFeatures && (
              <TabsTrigger value="locations" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">ตำแหน่ง</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">ตั้งค่า</span>
            </TabsTrigger>
            {/* Admin tab removed from navbar as requested */}
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
            <EnhancedOverview
              items={inventoryItems}
              onShelfClick={handleShelfClick}
              onAddItem={() => setIsModalOpen(true)}
              onTransferItem={() => setIsTransferModalOpen(true)}
              onExportItem={exportItem}
              onScanQR={() => setShowScanner(true)}
              loading={loading}
            />
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
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid w-full grid-cols-5 bg-white border border-gray-200">
                  <TabsTrigger value="overview">ภาพรวม</TabsTrigger>
                  <TabsTrigger value="advanced">ขั้นสูง</TabsTrigger>
                  <TabsTrigger value="alerts">แจ้งเตือน</TabsTrigger>
                  <TabsTrigger value="batch">Batch</TabsTrigger>
                  <TabsTrigger value="forecast">พยากรณ์</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <Suspense fallback={<ComponentLoadingFallback componentName="Analytics" />}>
                    <InventoryAnalytics items={inventoryItems} />
                  </Suspense>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4">
                  <Suspense fallback={<ComponentLoadingFallback componentName="Advanced Analytics" />}>
                    <AdvancedAnalytics />
                  </Suspense>
                </TabsContent>

                <TabsContent value="alerts" className="space-y-4">
                  <AlertsPanel />
                </TabsContent>

                <TabsContent value="batch" className="space-y-4">
                  <Suspense fallback={<ComponentLoadingFallback componentName="Batch Management" />}>
                    <BatchManagement />
                  </Suspense>
                </TabsContent>

                <TabsContent value="forecast" className="space-y-4">
                  <Suspense fallback={<ComponentLoadingFallback componentName="Forecasting Dashboard" />}>
                    <ForecastingDashboard />
                  </Suspense>
                </TabsContent>
              </Tabs>
            )}
          </TabsContent>

          <TabsContent value="qr" className="space-y-4">
            <Tabs defaultValue="scanner" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3 bg-white border border-gray-200">
                <TabsTrigger value="scanner">Scanner</TabsTrigger>
                <TabsTrigger value="management">จัดการ QR</TabsTrigger>
                <TabsTrigger value="history">ประวัติ</TabsTrigger>
              </TabsList>

              <TabsContent value="scanner" className="space-y-4">
                <QRCodeManager
                  items={inventoryItems}
                  onShelfClick={handleShelfClick}
                  onSaveItem={handleSaveItem}
                />
              </TabsContent>

              <TabsContent value="management" className="space-y-4">
                <Suspense fallback={<ComponentLoadingFallback componentName="QR Code Management" />}>
                  <QRCodeManagement items={inventoryItems} />
                </Suspense>
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                <MovementLogs />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="management" className="space-y-4">
            <Tabs defaultValue="recovery" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 bg-white border border-gray-200">
                <TabsTrigger value="recovery">กู้คืนข้อมูล</TabsTrigger>
                <TabsTrigger value="export">Import/Export</TabsTrigger>
              </TabsList>

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
          </TabsContent>

          {showWarehouseTab && (
            <TabsContent value="warehouse" className="space-y-4">
              <Suspense fallback={<ComponentLoadingFallback componentName="Warehouse Dashboard" />}>
                <WarehouseDashboard />
              </Suspense>
            </TabsContent>
          )}

          {showAdminFeatures && (
            <TabsContent value="locations" className="space-y-4">
              <Suspense fallback={<ComponentLoadingFallback componentName="Location Management" />}>
                <LocationManagement userRoleLevel={user?.role_level || 0} />
              </Suspense>
            </TabsContent>
          )}

          <TabsContent value="config" className="space-y-4">
            <UnitConversionSettings />
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
        </Tabs>

        {/* Inventory Modal */}
        <ErrorBoundary>
          <InventoryModalSimple
            isOpen={isModalOpen}
            onClose={handleModalClose}
            onSave={handleSaveItem}
            location={selectedLocation}
            existingItem={selectedItem}
          />
        </ErrorBoundary>

        {/* Bulk Add Modal */}
        <BulkAddModal
          isOpen={isBulkModalOpen}
          onClose={handleBulkModalClose}
          onSave={handleBulkSave}
          availableLocations={availableLocations}
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
          onClose={handleTransferModalClose}
          onTransfer={transferItems}
          items={inventoryItems}
          onRefreshData={refetch}
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
      </div>
    </div>
  );
});

export default Index;