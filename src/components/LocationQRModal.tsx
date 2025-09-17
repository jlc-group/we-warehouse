import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QrCode, MapPin, Package, Clock, Download } from 'lucide-react';
import { useMemo, useEffect, useRef, useState } from 'react';
import QRCodeLib from 'qrcode';
import type { InventoryItem } from '@/hooks/useInventory';

interface LocationQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: string;
  items: InventoryItem[];
}

export function LocationQRModal({ isOpen, onClose, location, items }: LocationQRModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');

  // Filter items for this location
  const locationItems = useMemo(() => {
    return items.filter(item => item.location === location);
  }, [items, location]);

  // Calculate totals
  const totals = useMemo(() => {
    return locationItems.reduce(
      (acc, item) => ({
        boxes: acc.boxes + item.box_quantity,
        loose: acc.loose + item.loose_quantity,
        items: acc.items + 1,
      }),
      { boxes: 0, loose: 0, items: 0 }
    );
  }, [locationItems]);

  // Group by product
  const productGroups = useMemo(() => {
    const groups = new Map<string, InventoryItem[]>();
    locationItems.forEach(item => {
      const key = item.sku;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    });
    return Array.from(groups.entries());
  }, [locationItems]);

  // Generate QR Code data with comprehensive location info
  const qrData = useMemo(() => {
    const locationData = {
      type: 'WAREHOUSE_LOCATION',
      location: location,
      timestamp: new Date().toISOString(),
      summary: {
        total_items: totals.items,
        total_boxes: totals.boxes,
        total_loose: totals.loose,
        product_types: productGroups.length
      },
      items: locationItems.map(item => ({
        sku: item.sku,
        product_name: item.product_name,
        lot: item.lot,
        mfd: item.mfd,
        boxes: item.box_quantity,
        loose: item.loose_quantity
      }))
    };
    return JSON.stringify(locationData);
  }, [location, locationItems, totals, productGroups]);

  // Generate QR Code
  useEffect(() => {
    if (isOpen && location && canvasRef.current) {
      QRCodeLib.toCanvas(canvasRef.current, qrData, {
        width: 192, // 48 * 4 for high resolution
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }).catch(console.error);

      // Also generate data URL for download
      QRCodeLib.toDataURL(qrData, {
        width: 512,
        margin: 2
      }).then(setQrCodeDataURL).catch(console.error);
    }
  }, [isOpen, location, qrData]);

  const downloadQR = () => {
    if (qrCodeDataURL) {
      const a = document.createElement('a');
      a.href = qrCodeDataURL;
      a.download = `location-${location.replace(/\//g, '-')}-qr.png`;
      a.click();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code - ตำแหน่ง {location}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* QR Code Display */}
          <div className="flex flex-col items-center space-y-4">
            <div className="w-48 h-48 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center p-2">
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-full"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={downloadQR} variant="outline" className="flex items-center gap-2" disabled={!qrCodeDataURL}>
                <Download className="h-4 w-4" />
                ดาวน์โหลด QR Code
              </Button>
              <Button
                onClick={() => {
                  if (navigator.share && qrCodeDataURL) {
                    fetch(qrCodeDataURL)
                      .then(res => res.blob())
                      .then(blob => {
                        const file = new File([blob], `location-${location.replace(/\//g, '-')}-qr.png`, { type: 'image/png' });
                        navigator.share({ files: [file], title: `QR Code - ตำแหน่ง ${location}` });
                      })
                      .catch(console.error);
                  }
                }}
                variant="outline"
                className="flex items-center gap-2"
                disabled={!qrCodeDataURL || !navigator.share}
              >
                <QrCode className="h-4 w-4" />
                แชร์
              </Button>
            </div>
          </div>

          {/* Location Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                ข้อมูลตำแหน่ง
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{totals.items}</div>
                  <div className="text-sm text-gray-600">รายการสินค้า</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{totals.boxes}</div>
                  <div className="text-sm text-gray-600">ลัง</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{totals.loose}</div>
                  <div className="text-sm text-gray-600">เศษ</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{productGroups.length}</div>
                  <div className="text-sm text-gray-600">ประเภทสินค้า</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product List */}
          {locationItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  สินค้าในตำแหน่งนี้
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {productGroups.map(([sku, groupItems]) => (
                    <div key={sku} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{groupItems[0].product_name}</div>
                          <div className="text-sm text-gray-500 font-mono">{sku}</div>
                          {groupItems.length > 1 && (
                            <div className="text-xs text-blue-600">
                              {groupItems.length} Lot ที่แตกต่างกัน
                            </div>
                          )}
                        </div>
                        <div className="text-right space-y-1">
                          <div className="text-sm">
                            <span className="font-medium">
                              {groupItems.reduce((sum, item) => sum + item.box_quantity, 0)}
                            </span>
                            <span className="text-gray-500"> ลัง</span>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">
                              {groupItems.reduce((sum, item) => sum + item.loose_quantity, 0)}
                            </span>
                            <span className="text-gray-500"> เศษ</span>
                          </div>
                        </div>
                      </div>

                      {/* LOT Details */}
                      {groupItems.length > 1 && (
                        <div className="mt-2 pt-2 border-t space-y-1">
                          {groupItems.map((item, index) => (
                            <div key={index} className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-2">
                                <Badge variant="outline">{item.lot || 'ไม่ระบุ LOT'}</Badge>
                                {item.mfd && (
                                  <span className="text-gray-500">MFD: {item.mfd}</span>
                                )}
                              </span>
                              <span className="text-gray-600">
                                {item.box_quantity}ลัง {item.loose_quantity}เศษ
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {locationItems.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">ตำแหน่งว่าง</h3>
                <p className="text-gray-500">
                  ยังไม่มีสินค้าในตำแหน่งนี้
                </p>
              </CardContent>
            </Card>
          )}

          {/* Last Updated */}
          <div className="flex items-center justify-center text-xs text-gray-500">
            <Clock className="h-3 w-3 mr-1" />
            อัพเดตล่าสุด: {new Date().toLocaleString('th-TH')}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}