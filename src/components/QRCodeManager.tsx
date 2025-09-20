import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { QrCode, Download, Camera, Search, Plus, RefreshCw } from 'lucide-react';
import { InventoryModal } from './InventoryModal';
import { useLocationQR } from '@/hooks/useLocationQR';
import { useToast } from '@/hooks/use-toast';
import type { InventoryItem } from '@/hooks/useInventory';
import { normalizeLocation } from '@/utils/locationUtils';

interface QRCodeManagerProps {
  items: InventoryItem[];
  onShelfClick?: (location: string, item?: InventoryItem) => void;
  onSaveItem?: (itemData: {
    product_name: string;
    product_code: string;
    location: string;
    lot?: string;
    mfd?: string;
    quantity_boxes: number;
    quantity_loose: number;
  }) => Promise<void>;
}

export function QRCodeManager({ items, onShelfClick, onSaveItem }: QRCodeManagerProps) {
  const [selectedLocation, setSelectedLocation] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanLocation, setScanLocation] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const { toast } = useToast();
  const { qrCodes, generateQRForLocation, loading } = useLocationQR();

  // Get unique locations from inventory
  const inventoryLocations = [...new Set(items.map(item => item.location))].sort();

  // Get locations that have QR codes
  const qrLocations = qrCodes.map(qr => qr.location);

  // Filter locations based on search
  const filteredLocations = inventoryLocations.filter(location =>
    location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleGenerateQR = useCallback(async (location: string) => {
    setIsGenerating(true);
    try {
      const result = await generateQRForLocation(location, items);
      if (result) {
        toast({
          title: 'สร้าง QR Code สำเร็จ',
          description: `สร้าง QR Code สำหรับตำแหน่ง ${location} แล้ว`,
        });
      }
    } catch (error) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: `ไม่สามารถสร้าง QR Code สำหรับตำแหน่ง ${location} ได้`,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [generateQRForLocation, items, toast]);

  const downloadQRCode = (location: string) => {
    const qrCode = qrCodes.find(qr => qr.location === location);
    if (qrCode && qrCode.qr_image_url) {
      const link = document.createElement('a');
      link.download = `QR_${location.replace(/\//g, '_')}.png`;
      link.href = qrCode.qr_image_url;
      link.click();
    } else {
      toast({
        title: 'ไม่พบ QR Code',
        description: `ไม่พบ QR Code สำหรับตำแหน่ง ${location}`,
        variant: 'destructive',
      });
    }
  };

  const downloadAllQRCodes = () => {
    const availableQRCodes = filteredLocations.filter(location =>
      qrCodes.some(qr => qr.location === location)
    );

    if (availableQRCodes.length === 0) {
      toast({
        title: 'ไม่มี QR Code',
        description: 'ไม่มี QR Code ที่สามารถดาวน์โหลดได้',
        variant: 'destructive',
      });
      return;
    }

    availableQRCodes.forEach((location, index) => {
      setTimeout(() => downloadQRCode(location), index * 100);
    });

    toast({
      title: 'เริ่มดาวน์โหลด',
      description: `กำลังดาวน์โหลด ${availableQRCodes.length} QR Code`,
    });
  };

  const handleGenerateAllQR = async () => {
    const locationsWithoutQR = filteredLocations.filter(location =>
      !qrCodes.some(qr => qr.location === location)
    );

    if (locationsWithoutQR.length === 0) {
      toast({
        title: 'QR Code ครบแล้ว',
        description: 'ทุกตำแหน่งมี QR Code แล้ว',
      });
      return;
    }

    setIsGenerating(true);
    let successCount = 0;

    for (const location of locationsWithoutQR) {
      try {
        const result = await generateQRForLocation(location, items);
        if (result) successCount++;
        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Failed to generate QR for ${location}:`, error);
      }
    }

    setIsGenerating(false);
    toast({
      title: 'สร้าง QR Code เสร็จสิ้น',
      description: `สร้างสำเร็จ ${successCount}/${locationsWithoutQR.length} ตำแหน่ง`,
    });
  };

  const handleScanLocation = (location: string) => {
    setScanLocation(normalizeLocation(location));
    setIsScanning(true);
  };

  const handleScanModalClose = () => {
    setIsScanning(false);
    setScanLocation('');
  };

  const handleSaveScannedItem = async (itemData: {
    product_name: string;
    product_code: string;
    location: string;
    lot?: string;
    mfd?: string;
    quantity_boxes: number;
    quantity_loose: number;
  }) => {
    try {
      if (onSaveItem) {
        await onSaveItem(itemData);
      }
      handleScanModalClose();
    } catch (error) {
      console.error('Error saving scanned item:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            จัดการ QR Code ตำแหน่งคลัง
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search">ค้นหาตำแหน่ง</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="ค้นหาตำแหน่งคลัง..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleGenerateAllQR}
                  disabled={isGenerating || loading}
                  className="flex items-center gap-2"
                  variant="default"
                >
                  <Plus className="h-4 w-4" />
                  {isGenerating ? 'กำลังสร้าง...' : 'สร้าง QR ทั้งหมด'}
                </Button>
                <Button
                  onClick={downloadAllQRCodes}
                  disabled={loading}
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <Download className="h-4 w-4" />
                  ดาวน์โหลดทั้งหมด
                </Button>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              พบ {filteredLocations.length} ตำแหน่งจากทั้งหมด {inventoryLocations.length} ตำแหน่ง
              {qrCodes.length > 0 && (
                <span className="ml-2 text-green-600">
                  • มี QR Code {qrCodes.length} ตำแหน่ง
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLocations.map(location => {
          const locationItems = items.filter(item => item.location === location);
          const totalItems = locationItems.length;
          const totalBoxes = locationItems.reduce((sum, item) => sum + (((item as any).carton_quantity_legacy || 0)), 0);
          const totalLoose = locationItems.reduce((sum, item) => sum + (((item as any).box_quantity_legacy || 0)), 0);

          // Check if this location has a QR code
          const qrCode = qrCodes.find(qr => qr.location === location);
          const hasQRCode = !!qrCode;

          return (
            <Card key={location} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="font-mono">{location}</span>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{totalItems} รายการ</Badge>
                    {hasQRCode ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        มี QR
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-orange-300 text-orange-600">
                        ไม่มี QR
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center">
                  {qrCode ? (
                    <div className="w-32 h-32 border-2 border-green-300 rounded-lg overflow-hidden bg-white">
                      <img
                        src={qrCode.qr_image_url || ''}
                        alt={`QR Code for ${location}`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                      <div className="text-center">
                        <QrCode className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <div className="text-xs text-gray-500">ยังไม่มี QR</div>
                        <div className="text-xs text-gray-500">{location}</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>จำนวนลัง:</span>
                    <span className="font-medium">{totalBoxes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>จำนวนเศษ:</span>
                    <span className="font-medium">{totalLoose}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {hasQRCode ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadQRCode(location)}
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      ดาวน์โหลด
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleGenerateQR(location)}
                      disabled={isGenerating}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      สร้าง QR
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleScanLocation(location)}
                    className="flex-1"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    แสกน
                  </Button>
                </div>

                {hasQRCode && (
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleGenerateQR(location)}
                      disabled={isGenerating}
                      className="flex-1"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      สร้างใหม่
                    </Button>
                  </div>
                )}

                {locationItems.length > 0 && (
                  <div className="border-t pt-3">
                    <div className="text-xs text-muted-foreground mb-2">สินค้าในตำแหน่งนี้:</div>
                    <div className="space-y-1">
                      {locationItems.slice(0, 3).map(item => (
                        <div key={item.id} className="text-xs flex justify-between">
                          <span className="truncate">{item.product_name}</span>
                          <span>{((item as any).carton_quantity_legacy || 0)}+{((item as any).box_quantity_legacy || 0)}</span>
                        </div>
                      ))}
                      {locationItems.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          และอีก {locationItems.length - 3} รายการ...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredLocations.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <QrCode className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">ไม่พบตำแหน่งที่ค้นหา</h3>
            <p className="text-muted-foreground">
              ลองเปลี่ยนคำค้นหาหรือเพิ่มสินค้าเข้าระบบก่อน
            </p>
          </CardContent>
        </Card>
      )}

      {/* Inventory Modal for Scanned Location */}
      {onSaveItem && (
        <InventoryModal
          isOpen={isScanning}
          onClose={handleScanModalClose}
          onSave={handleSaveScannedItem}
          location={scanLocation}
        />
      )}
    </div>
  );
}
