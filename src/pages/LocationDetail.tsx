import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MapPin,
  Package,
  Edit3,
  Plus,
  ArrowLeftRight,
  Send,
  ArrowLeft,
  BarChart3,
  Clock,
  Lock,
  Unlock,
  AlertTriangle,
  Calculator,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { localDb } from '@/integrations/local/client';
import { useToast } from '@/hooks/use-toast';
import { LocationEditModal } from '@/components/location/LocationEditModal';
import { LocationAddItemModal } from '@/components/location/LocationAddItemModal';
import { LocationTransferModal } from '@/components/location/LocationTransferModal';
import { LocationRemoveItemModal } from '@/components/location/LocationRemoveItemModal';
import { BulkTransferModal } from '@/components/BulkTransferModal';
import { UnitConverter } from '@/components/UnitConverter';
import { convertUrlToDbFormat } from '@/utils/locationUtils';

interface LocationInventory {
  id: string;
  sku: string;
  product_name: string;
  unit_level1_quantity: number;
  unit_level2_quantity: number;
  unit_level3_quantity: number;
  unit_level1_name: string;
  unit_level2_name: string;
  unit_level3_name: string;
  unit_level1_rate: number;
  unit_level2_rate: number;
  total_pieces: number;
}

interface LocationInfo {
  location: string;
  zone: string;
  section: string;
  level: string;
  position: string;
}

interface LocationDetailProps {
  propLocationId?: string;
  isEmbedded?: boolean;
}

export function LocationDetail({ propLocationId, isEmbedded = false }: LocationDetailProps) {
  const { locationId: paramLocationId } = useParams<{ locationId: string }>();
  const locationId = propLocationId || paramLocationId;

  const navigate = useNavigate();
  const { toast } = useToast();

  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [inventory, setInventory] = useState<LocationInventory[]>([]);
  const [loading, setLoading] = useState(true);

  // Storage type state
  const [storageType, setStorageType] = useState<'full_carton_only' | 'allow_all'>('allow_all');
  const [storageTypeLoading, setStorageTypeLoading] = useState(false);

  // Unit converter toggle per item
  const [expandedConverters, setExpandedConverters] = useState<Set<string>>(new Set());

  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [bulkTransferModalOpen, setBulkTransferModalOpen] = useState(false);

  // Debug logging
  console.log('🔍 LocationDetail render:', {
    locationId,
    inventory: inventory.length,
    loading,
    locationInfo,
    storageType
  });

  useEffect(() => {
    if (locationId) {
      loadLocationData();
      loadStorageType();
    }
  }, [locationId]);

  const loadLocationData = async () => {
    try {
      setLoading(true);

      // Convert URL format to database format for querying
      const dbLocationId = convertUrlToDbFormat(locationId || '');
      console.log('🔍 LocationDetail query conversion:', {
        original: locationId,
        converted: dbLocationId
      });

      // Load inventory items for this location using localDb
      const { data: inventoryData, error: inventoryError } = await localDb
        .from('inventory_items')
        .select('id,sku,product_name,unit_level1_quantity,unit_level2_quantity,unit_level3_quantity,unit_level1_name,unit_level2_name,unit_level3_name,unit_level1_rate,unit_level2_rate')
        .eq('location', dbLocationId)
        .order('sku');

      if (inventoryError) {
        console.error('Error loading inventory:', inventoryError);
        toast({
          title: 'ข้อผิดพลาด',
          description: 'ไม่สามารถโหลดข้อมูลสินค้าได้',
          variant: 'destructive'
        });
        return;
      }

      // Calculate total pieces for each item
      const processedInventory = (inventoryData as any[])?.map(item => {
        const level1Pieces = (item.unit_level1_quantity || 0) * (item.unit_level1_rate || 0);
        const level2Pieces = (item.unit_level2_quantity || 0) * (item.unit_level2_rate || 0);
        const level3Pieces = item.unit_level3_quantity || 0;
        const total_pieces = level1Pieces + level2Pieces + level3Pieces;

        return {
          ...item,
          total_pieces
        };
      }) || [];

      setInventory(processedInventory);

      // Parse location info from location string (e.g., "A-01-B-02")
      if (locationId) {
        const parts = locationId.split('-');
        setLocationInfo({
          location: locationId,
          zone: parts[0] || '',
          section: parts[1] || '',
          level: parts[2] || '',
          position: parts[3] || ''
        });
      }

    } catch (error) {
      console.error('Error loading location data:', error);
      toast({
        title: 'ข้อผิดพลาด',
        description: 'เกิดข้อผิดพลาดในการโหลดข้อมูล',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Load storage type setting for this location
  const loadStorageType = async () => {
    if (!locationId) return;
    try {
      const dbLocationId = convertUrlToDbFormat(locationId);
      const { data, error } = await localDb
        .from('location_settings')
        .select('*')
        .eq('location', dbLocationId)
        .single();

      if (data && !error) {
        setStorageType(data.storage_type || 'allow_all');
      }
    } catch (err) {
      // Table might not exist yet - that's ok, default to allow_all
      console.log('📦 Location settings not found, using default');
    }
  };

  // Toggle storage type
  const handleToggleStorageType = useCallback(async () => {
    if (!locationId) return;
    const dbLocationId = convertUrlToDbFormat(locationId);
    const newType = storageType === 'allow_all' ? 'full_carton_only' : 'allow_all';

    setStorageTypeLoading(true);
    try {
      // Try update first
      const { data: existing } = await localDb
        .from('location_settings')
        .select('id')
        .eq('location', dbLocationId)
        .single();

      if (existing) {
        await localDb
          .from('location_settings')
          .update({ storage_type: newType })
          .eq('location', dbLocationId);
      } else {
        await localDb
          .from('location_settings')
          .insert({ location: dbLocationId, storage_type: newType });
      }

      setStorageType(newType);
      toast({
        title: newType === 'full_carton_only' ? '🔒 ตั้งค่าเต็มลังเท่านั้น' : '📦 อนุญาตมีเศษได้',
        description: `Location ${locationId} ${newType === 'full_carton_only' ? 'รับเฉพาะเต็มลัง' : 'รับทุกจำนวน'}`,
      });
    } catch (error) {
      console.error('Error updating storage type:', error);
      toast({
        title: 'ข้อผิดพลาด',
        description: 'ไม่สามารถอัปเดตการตั้งค่าได้',
        variant: 'destructive'
      });
    } finally {
      setStorageTypeLoading(false);
    }
  }, [locationId, storageType, toast]);

  // Check if any item has loose pieces (not full cartons)
  const hasLoosePieces = useCallback((): { hasLoose: boolean; looseItems: { name: string; remainder: number }[] } => {
    const looseItems: { name: string; remainder: number }[] = [];
    for (const item of inventory) {
      if (item.unit_level1_rate > 0) {
        const remainder = item.total_pieces % item.unit_level1_rate;
        if (remainder > 0) {
          looseItems.push({ name: item.product_name, remainder });
        }
      }
    }
    return { hasLoose: looseItems.length > 0, looseItems };
  }, [inventory]);

  // Toggle converter visibility for an item
  const toggleConverter = useCallback((itemId: string) => {
    setExpandedConverters(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const formatQuantityDisplay = (item: LocationInventory): string => {
    const parts = [];

    if (item.unit_level1_quantity > 0) {
      parts.push(`${item.unit_level1_quantity} ${item.unit_level1_name || 'L1'}`);
    }
    if (item.unit_level2_quantity > 0) {
      parts.push(`${item.unit_level2_quantity} ${item.unit_level2_name || 'L2'}`);
    }
    if (item.unit_level3_quantity > 0) {
      parts.push(`${item.unit_level3_quantity} ${item.unit_level3_name || 'L3'}`);
    }

    return parts.length > 0 ? parts.join(' + ') : '0 ชิ้น';
  };

  const getTotalStock = (): number => {
    return inventory.reduce((sum, item) => sum + item.total_pieces, 0);
  };

  const getUniqueProducts = (): number => {
    return inventory.length;
  };

  const looseCheck = hasLoosePieces();

  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!locationInfo) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="text-center py-8 text-gray-500">
          <p>ไม่พบข้อมูล Location</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            กลับหน้าหลัก
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      {/* Header - Only show if not embedded */}
      {!isEmbedded && (
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับ
          </Button>
        </div>
      )}

      {/* Location Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <MapPin className="h-6 w-6 text-blue-600" />
            <div>
              <div className="text-2xl font-bold">{locationInfo.location}</div>
              <div className="text-sm text-gray-500 font-normal">
                โซน {locationInfo.zone} • เซกชัน {locationInfo.section} • ชั้น {locationInfo.level} • ตำแหน่ง {locationInfo.position}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{getUniqueProducts()}</div>
              <div className="text-sm text-gray-500">รายการสินค้า</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{getTotalStock().toLocaleString()}</div>
              <div className="text-sm text-gray-500">รวมชิ้น</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                <Clock className="h-5 w-5 inline mr-1" />
                {new Date().toLocaleDateString('th-TH')}
              </div>
              <div className="text-sm text-gray-500">วันที่อัปเดต</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storage Type Toggle Card */}
      <Card className={`border-2 transition-colors ${storageType === 'full_carton_only' ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {storageType === 'full_carton_only' ? (
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-amber-600" />
                </div>
              ) : (
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Unlock className="h-5 w-5 text-green-600" />
                </div>
              )}
              <div>
                <div className="font-medium text-sm">
                  {storageType === 'full_carton_only' ? '🔒 เต็มลังเท่านั้น' : '📦 มีเศษได้'}
                </div>
                <div className="text-xs text-gray-500">
                  {storageType === 'full_carton_only'
                    ? 'Location นี้รับเฉพาะสินค้าที่ครบลัง'
                    : 'Location นี้รับสินค้าทุกจำนวน'}
                </div>
              </div>
            </div>

            <Button
              variant={storageType === 'full_carton_only' ? 'default' : 'outline'}
              size="sm"
              onClick={handleToggleStorageType}
              disabled={storageTypeLoading}
              className={`transition-all ${storageType === 'full_carton_only'
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'border-gray-300 hover:bg-gray-50'
                }`}
            >
              {storageTypeLoading ? (
                <span className="animate-pulse">...</span>
              ) : storageType === 'full_carton_only' ? (
                <>
                  <Unlock className="h-4 w-4 mr-1" />
                  ปลดล็อค
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-1" />
                  ล็อคเต็มลัง
                </>
              )}
            </Button>
          </div>

          {/* Warning: Loose pieces detected in full_carton_only mode */}
          {storageType === 'full_carton_only' && looseCheck.hasLoose && (
            <div className="mt-3 bg-orange-100 border border-orange-300 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-orange-800 text-sm">
                    ⚠️ พบเศษสินค้าที่ไม่ครบลัง!
                  </div>
                  <div className="text-xs text-orange-700 mt-1 space-y-0.5">
                    {looseCheck.looseItems.map((item, idx) => (
                      <div key={idx}>• {item.name}: เศษ {item.remainder} ชิ้น</div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 text-orange-700 border-orange-400 hover:bg-orange-200 text-xs"
                    onClick={() => setTransferModalOpen(true)}
                  >
                    <ArrowLeftRight className="h-3 w-3 mr-1" />
                    ย้ายเศษไป location อื่น
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inventory List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            สินค้าในคลัง
          </CardTitle>
        </CardHeader>
        <CardContent>
          {inventory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>ไม่มีสินค้าใน Location นี้</p>
            </div>
          ) : (
            <div className="space-y-3">
              {inventory.map((item) => {
                const isConverterOpen = expandedConverters.has(item.id);
                const hasRate = item.unit_level1_rate > 0 && item.unit_level2_rate > 0;

                return (
                  <div
                    key={item.id}
                    className="border rounded-lg overflow-hidden hover:border-blue-200 transition-colors"
                  >
                    {/* Item Info */}
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="font-mono">
                              {item.sku}
                            </Badge>
                            {storageType === 'full_carton_only' && item.unit_level1_rate > 0 && (
                              item.total_pieces % item.unit_level1_rate !== 0 ? (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  มีเศษ
                                </Badge>
                              ) : (
                                <Badge className="text-xs bg-green-100 text-green-700 border-green-300">
                                  ✓ ครบลัง
                                </Badge>
                              )
                            )}
                          </div>
                          <h3 className="font-medium text-gray-900 mb-2">
                            {item.product_name}
                          </h3>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>📦 {formatQuantityDisplay(item)}</div>
                            <div className="flex items-center gap-2">
                              <BarChart3 className="h-4 w-4" />
                              <span className="font-medium text-green-600">
                                รวม {item.total_pieces.toLocaleString()} ชิ้น
                              </span>
                            </div>
                            {hasRate && (
                              <div className="text-xs text-gray-400">
                                อัตรา: 1 {item.unit_level1_name || 'ลัง'} = {item.unit_level1_rate} ชิ้น | 1 {item.unit_level2_name || 'กล่อง'} = {item.unit_level2_rate} ชิ้น
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Toggle converter button */}
                      {hasRate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs"
                          onClick={() => toggleConverter(item.id)}
                        >
                          <Calculator className="h-3 w-3 mr-1" />
                          {isConverterOpen ? 'ซ่อน' : 'เปิด'} เครื่องคิดเลขหน่วย
                          {isConverterOpen ? (
                            <ChevronUp className="h-3 w-3 ml-1" />
                          ) : (
                            <ChevronDown className="h-3 w-3 ml-1" />
                          )}
                        </Button>
                      )}
                    </div>

                    {/* Unit Converter (expandable) */}
                    {isConverterOpen && hasRate && (
                      <div className="px-4 pb-4">
                        <UnitConverter
                          unit1Name={item.unit_level1_name || 'ลัง'}
                          unit2Name={item.unit_level2_name || 'กล่อง'}
                          unit3Name={item.unit_level3_name || 'ชิ้น'}
                          unit1Rate={item.unit_level1_rate}
                          unit2Rate={item.unit_level2_rate}
                          initialPieces={item.total_pieces}
                          showRemainderWarning={storageType === 'full_carton_only'}
                          compact={false}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons - Enhanced for Mobile */}
      <Card className="sticky bottom-4 z-10 shadow-lg border-2 border-gray-300 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-center text-lg">🛠️ จัดการ Location</CardTitle>
          <p className="text-center text-sm text-gray-600">เลือกการดำเนินการ</p>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Button
              variant="outline"
              className="h-24 sm:h-20 flex flex-col items-center gap-1 bg-blue-50 border-blue-300 hover:bg-blue-100 shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
              onClick={() => {
                console.log('🔵 Edit button clicked');
                setEditModalOpen(true);
              }}
            >
              <Edit3 className="h-6 w-6 sm:h-5 sm:w-5 text-blue-600" />
              <span className="text-blue-700 font-medium text-sm">แก้ไข</span>
              <span className="text-xs text-blue-500">Edit</span>
            </Button>

            <Button
              variant="outline"
              className="h-24 sm:h-20 flex flex-col items-center gap-1 bg-green-50 border-green-300 hover:bg-green-100 shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
              onClick={() => {
                setAddModalOpen(true);
              }}
            >
              <Plus className="h-6 w-6 sm:h-5 sm:w-5 text-green-600" />
              <span className="text-green-700 font-medium text-sm">เพิ่มสินค้า</span>
              <span className="text-xs text-green-500">Add Item</span>
            </Button>

            <Button
              variant="outline"
              className="h-24 sm:h-20 flex flex-col items-center gap-1 bg-orange-50 border-orange-300 hover:bg-orange-100 shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
              onClick={() => {
                console.log('🟠 Transfer button clicked');
                setTransferModalOpen(true);
              }}
            >
              <ArrowLeftRight className="h-6 w-6 sm:h-5 sm:w-5 text-orange-600" />
              <span className="text-orange-700 font-medium text-sm">ย้ายคลัง</span>
              <span className="text-xs text-orange-500">Transfer</span>
            </Button>

            <Button
              variant="outline"
              className="h-24 sm:h-20 flex flex-col items-center gap-1 bg-red-50 border-red-300 hover:bg-red-100 shadow-md hover:shadow-lg transition-all duration-200 active:scale-95"
              onClick={() => {
                setExportModalOpen(true);
              }}
            >
              <Send className="h-6 w-6 sm:h-5 sm:w-5 text-red-600" />
              <span className="text-red-700 font-medium text-sm">ส่งออก</span>
              <span className="text-xs text-red-500">Export</span>
            </Button>
          </div>

          <div className="mt-4 border-t pt-4">
            <Button
              variant="default"
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => setBulkTransferModalOpen(true)}
            >
              <Package className="h-4 w-4 mr-2" />
              ย้ายสินค้าหลายรายการ (Bulk Transfer)
            </Button>
          </div>

          {/* Mobile hint */}
          <div className="mt-3 text-center">
            <p className="text-xs text-gray-500">👆 แตะปุ่มเพื่อเลือกการดำเนินการ</p>
          </div>
        </CardContent>
      </Card>

      {/* Floating Quick Action Button - Visible on scroll */}
      <div className="fixed bottom-20 right-4 sm:hidden z-20">
        <Button
          size="lg"
          className="rounded-full h-14 w-14 bg-blue-600 hover:bg-blue-700 shadow-xl border-2 border-white"
          onClick={() => {
            // Scroll to action buttons (optimized to avoid forced reflow)
            const actionCard = document.querySelector('.sticky.bottom-4');
            if (actionCard) {
              requestAnimationFrame(() => {
                actionCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
              });
            }
          }}
        >
          <Package className="h-6 w-6 text-white" />
        </Button>
      </div>

      {/* Modal Components */}
      {locationId && (
        <>
          <LocationEditModal
            isOpen={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            locationId={locationId}
            inventory={inventory}
            onSuccess={loadLocationData}
          />

          <LocationAddItemModal
            isOpen={addModalOpen}
            onClose={() => setAddModalOpen(false)}
            location={locationId}
            onSuccess={loadLocationData}
          />

          <LocationTransferModal
            isOpen={transferModalOpen}
            onClose={() => setTransferModalOpen(false)}
            fromLocationId={locationId}
            inventory={inventory}
            onSuccess={loadLocationData}
          />

          <LocationRemoveItemModal
            isOpen={exportModalOpen}
            onClose={() => setExportModalOpen(false)}
            location={locationId}
            inventory={{
              products: inventory.map(item => ({
                sku: item.sku,
                product_name: item.product_name,
                quantity: item.total_pieces,
                unit: 'ชิ้น',
                lot: ''
              })),
              totalItems: inventory.length,
              total_quantity: inventory.reduce((acc, item) => acc + item.total_pieces, 0),
              last_updated: new Date().toISOString()
            } as any}
            onSuccess={loadLocationData}
          />

          <BulkTransferModal
            isOpen={bulkTransferModalOpen}
            onClose={() => setBulkTransferModalOpen(false)}
            sourceLocation={locationId}
            onTransferComplete={loadLocationData}
          />
        </>
      )}
    </div>
  );
}