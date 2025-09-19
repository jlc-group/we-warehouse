import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QrCode, MapPin, Package, Clock, Download } from 'lucide-react';
import { normalizeLocation } from '@/utils/locationUtils';
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

  // Calculate totals using multi-level unit system
  const totals = useMemo(() => {
    return locationItems.reduce(
      (acc, item) => ({
        level1: acc.level1 + (item.unit_level1_quantity || (item as any).carton_quantity_legacy || 0),
        level2: acc.level2 + (item.unit_level2_quantity || (item as any).box_quantity_legacy || 0),
        level3: acc.level3 + (item.unit_level3_quantity || (item as any).pieces_quantity_legacy || 0),
        items: acc.items + 1,
      }),
      { level1: 0, level2: 0, level3: 0, items: 0 }
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

  // Calculate total pieces for each item
  const calculateTotalPieces = (item: InventoryItem) => {
    const level1Rate = item.unit_level1_rate || 0;
    const level2Rate = item.unit_level2_rate || 0;
    const level1Qty = item.unit_level1_quantity || 0;
    const level2Qty = item.unit_level2_quantity || 0;
    const level3Qty = item.unit_level3_quantity || 0;

    return (level1Qty * level1Rate) + (level2Qty * level2Rate) + level3Qty;
  };

  // Generate URL-based QR so scanning opens the app with the correct tab and location
  const qrUrl = useMemo(() => {
    const normalized = normalizeLocation(location);
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const params = new URLSearchParams();
    params.set('tab', 'overview');
    params.set('location', normalized);
    params.set('action', 'add');
    return `${baseUrl}?${params.toString()}`;
  }, [location]);

  // Generate QR Code
  useEffect(() => {
    if (isOpen && location && canvasRef.current) {
      QRCodeLib.toCanvas(canvasRef.current as HTMLCanvasElement, qrUrl, {
        width: 192, // 48 * 4 for high resolution
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }).catch(console.error);

      // Also generate data URL for download
      QRCodeLib.toDataURL(qrUrl, {
        width: 512,
        margin: 2
      }).then(setQrCodeDataURL).catch(console.error);
    }
  }, [isOpen, location, qrUrl]);

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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white">
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
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{totals.items}</div>
                  <div className="text-sm text-gray-600">รายการสินค้า</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{totals.level1}</div>
                  <div className="text-sm text-gray-600">ลัง</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{totals.level2}</div>
                  <div className="text-sm text-gray-600">กล่อง</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{totals.level3}</div>
                  <div className="text-sm text-gray-600">ชิ้น</div>
                </div>
                <div className="text-center p-3 bg-indigo-50 rounded-lg">
                  <div className="text-2xl font-bold text-indigo-600">{productGroups.length}</div>
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
                          {/* Level 1 Units (ลัง) */}
                          {groupItems.some(item => (item.unit_level1_quantity || 0) > 0) && (
                            <div className="text-sm">
                              <span className="font-medium">
                                {groupItems.reduce((sum, item) => sum + (item.unit_level1_quantity || 0), 0)}
                              </span>
                              <span className="text-gray-500"> {groupItems[0].unit_level1_name || 'ลัง'}</span>
                            </div>
                          )}
                          {/* Level 2 Units (กล่อง) */}
                          {groupItems.some(item => (item.unit_level2_quantity || 0) > 0) && (
                            <div className="text-sm">
                              <span className="font-medium">
                                {groupItems.reduce((sum, item) => sum + (item.unit_level2_quantity || 0), 0)}
                              </span>
                              <span className="text-gray-500"> {groupItems[0].unit_level2_name || 'กล่อง'}</span>
                            </div>
                          )}
                          {/* Level 3 Units (ชิ้น) */}
                          {groupItems.some(item => (item.unit_level3_quantity || 0) > 0) && (
                            <div className="text-sm">
                              <span className="font-medium">
                                {groupItems.reduce((sum, item) => sum + (item.unit_level3_quantity || 0), 0)}
                              </span>
                              <span className="text-gray-500"> {groupItems[0].unit_level3_name || 'ชิ้น'}</span>
                            </div>
                          )}
                          {/* Total Pieces */}
                          <div className="text-sm text-indigo-600 font-semibold border-t pt-1">
                            <span>รวม: </span>
                            <span className="font-bold">
                              {groupItems.reduce((sum, item) => sum + calculateTotalPieces(item), 0)}
                            </span>
                            <span> ชิ้น</span>
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
                                {item.unit_level1_quantity && item.unit_level1_quantity > 0 && `${item.unit_level1_quantity}${item.unit_level1_name || 'ลัง'} `}
                                {item.unit_level2_quantity && item.unit_level2_quantity > 0 && `${item.unit_level2_quantity}${item.unit_level2_name || 'กล่อง'} `}
                                {item.unit_level3_quantity && item.unit_level3_quantity > 0 && `${item.unit_level3_quantity}${item.unit_level3_name || 'ชิ้น'}`}
                                <span className="text-indigo-600 ml-2">(รวม: {calculateTotalPieces(item)} ชิ้น)</span>
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