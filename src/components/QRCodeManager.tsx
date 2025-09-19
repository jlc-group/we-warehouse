import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { QrCode, Download, Camera, Search } from 'lucide-react';
import { InventoryModal } from './InventoryModal';
import type { InventoryItem } from '@/hooks/useInventory';

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

  // Get unique locations
  const locations = [...new Set(items.map(item => item.location))].sort();

  // Filter locations based on search
  const filteredLocations = locations.filter(location =>
    location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const generateQRCode = (location: string) => {
    // Generate QR code data URL (placeholder implementation)
    const qrData = `WAREHOUSE_LOCATION:${location}`;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      canvas.width = 200;
      canvas.height = 200;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 200, 200);
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('QR Code', 100, 90);
      ctx.fillText(location, 100, 110);
      ctx.fillText('(Placeholder)', 100, 130);
    }
    
    return canvas.toDataURL();
  };

  const downloadQRCode = (location: string) => {
    const dataUrl = generateQRCode(location);
    const link = document.createElement('a');
    link.download = `QR_${location.replace(/\//g, '_')}.png`;
    link.href = dataUrl;
    link.click();
  };

  const downloadAllQRCodes = () => {
    locations.forEach(location => {
      setTimeout(() => downloadQRCode(location), 100);
    });
  };

  const handleScanLocation = (location: string) => {
    setScanLocation(location);
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
                <Button onClick={downloadAllQRCodes} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  ดาวน์โหลดทั้งหมด
                </Button>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              พบ {filteredLocations.length} ตำแหน่งจากทั้งหมด {locations.length} ตำแหน่ง
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

          return (
            <Card key={location} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="font-mono">{location}</span>
                  <Badge variant="secondary">{totalItems} รายการ</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center">
                  <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                      <QrCode className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <div className="text-xs text-gray-500">QR Code</div>
                      <div className="text-xs text-gray-500">{location}</div>
                    </div>
                  </div>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadQRCode(location)}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    ดาวน์โหลด
                  </Button>
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
