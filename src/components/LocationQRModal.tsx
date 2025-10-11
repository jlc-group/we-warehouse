import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QrCode, MapPin, Package, Clock, Download, RefreshCw, Printer } from 'lucide-react';
import { useMemo, useEffect, useRef, useState, memo, useCallback } from 'react';
import QRCodeLib from 'qrcode';
import type { InventoryItem } from '@/hooks/useInventory';
import { useLocationQR } from '@/hooks/useLocationQR';
import { normalizeLocation } from '@/utils/locationUtils';

interface LocationQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: string;
  items: InventoryItem[];
}

export const LocationQRModal = memo(function LocationQRModal({ isOpen, onClose, location, items }: LocationQRModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');
  
  // Use QR hook to get existing QR or generate new one
  const { getQRByLocation, generateQRForLocation, loading: qrLoading } = useLocationQR();
  
  // Get existing QR for this location
  const existingQR = useMemo(() => {
    return getQRByLocation(location);
  }, [getQRByLocation, location]);

  // Filter items for this location using normalized comparison
  const locationItems = useMemo(() => {
    const normalizedLocation = normalizeLocation(location);
    return items.filter(item => normalizeLocation(item.location) === normalizedLocation);
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

  // Generate QR Code data with comprehensive location info
  const qrData = useMemo(() => {
    const locationData = {
      type: 'WAREHOUSE_LOCATION',
      location: location,
      timestamp: new Date().toISOString(),
      summary: {
        total_items: totals.items,
        total_level1: totals.level1,
        total_level2: totals.level2,
        total_level3: totals.level3,
        product_types: productGroups.length
      },
      items: locationItems.map(item => ({
        sku: item.sku,
        product_name: item.product_name,
        location: item.location,
        lot: item.lot,
        mfd: item.mfd,
        level1_quantity: item.unit_level1_quantity || 0,
        level1_name: item.unit_level1_name || 'ลัง',
        level2_quantity: item.unit_level2_quantity || 0,
        level2_name: item.unit_level2_name || 'กล่อง',
        level3_quantity: item.unit_level3_quantity || 0,
        level3_name: item.unit_level3_name || 'ชิ้น',
        total_pieces: calculateTotalPieces(item)
      }))
    };
    return JSON.stringify(locationData);
  }, [location, locationItems, totals, productGroups]);

  // Generate QR Code - use existing QR if available, otherwise create new one
  useEffect(() => {
    if (isOpen && location && canvasRef.current) {
      let qrDataToUse = qrData;
      
      // If we have existing QR, use its data
      if (existingQR?.qr_code_data) {
        qrDataToUse = existingQR.qr_code_data;
      }
      
      // Render QR to canvas
      QRCodeLib.toCanvas(canvasRef.current, qrDataToUse, {
        width: 192,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }).catch(console.error);

      // Also generate data URL for download
      QRCodeLib.toDataURL(qrDataToUse, {
        width: 512,
        margin: 2
      }).then(setQrCodeDataURL).catch(console.error);
    }
  }, [isOpen, location, qrData, existingQR]);

  // Generate QR if it doesn't exist
  const handleGenerateQR = useCallback(async () => {
    if (!existingQR && !qrLoading) {
      await generateQRForLocation(location, items);
    }
  }, [existingQR, qrLoading, generateQRForLocation, location, items]);

  const downloadQR = useCallback(() => {
    if (qrCodeDataURL) {
      const a = document.createElement('a');
      a.href = qrCodeDataURL;
      a.download = `location-${location.replace(/\//g, '-')}-qr.png`;
      a.click();
    }
  }, [qrCodeDataURL, location]);

  const generatePrintableQR = useCallback(async () => {
    if (!qrCodeDataURL) return;

    try {
      // Create a canvas for the printable version
      const printCanvas = document.createElement('canvas');
      const ctx = printCanvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size for printable format (300 DPI equivalent)
      const canvasWidth = 600;
      const canvasHeight = 800;
      printCanvas.width = canvasWidth;
      printCanvas.height = canvasHeight;

      // Fill white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Load QR code image
      const qrImage = new Image();
      qrImage.onload = () => {
        // Draw QR code centered
        const qrSize = 400;
        const qrX = (canvasWidth - qrSize) / 2;
        const qrY = 80;
        ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

        // Add title text
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 28px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ตำแหน่งคลังสินค้า', canvasWidth / 2, 40);

        // Add location text below QR code
        ctx.font = 'bold 36px Arial, sans-serif';
        ctx.fillText(location, canvasWidth / 2, qrY + qrSize + 60);

        // Add summary information
        ctx.font = '20px Arial, sans-serif';
        ctx.fillStyle = '#666666';
        const summaryY = qrY + qrSize + 100;
        ctx.fillText(`สินค้า ${totals.items} รายการ`, canvasWidth / 2, summaryY);

        if (totals.level1 > 0 || totals.level2 > 0 || totals.level3 > 0) {
          const stockText = [];
          if (totals.level1 > 0) stockText.push(`${totals.level1} ลัง`);
          if (totals.level2 > 0) stockText.push(`${totals.level2} กล่อง`);
          if (totals.level3 > 0) stockText.push(`${totals.level3} ชิ้น`);
          ctx.fillText(stockText.join(' • '), canvasWidth / 2, summaryY + 30);
        }

        // Add timestamp
        ctx.font = '16px Arial, sans-serif';
        ctx.fillStyle = '#999999';
        const timestamp = new Date().toLocaleString('th-TH');
        ctx.fillText(`สร้างเมื่อ: ${timestamp}`, canvasWidth / 2, summaryY + 80);

        // Add instruction text
        ctx.font = '18px Arial, sans-serif';
        ctx.fillStyle = '#333333';
        ctx.fillText('สแกน QR Code เพื่อดูรายละเอียดสินค้า', canvasWidth / 2, summaryY + 120);

        // Convert to data URL and download
        const printableDataURL = printCanvas.toDataURL('image/png', 1.0);
        const a = document.createElement('a');
        a.href = printableDataURL;
        a.download = `location-${location.replace(/\//g, '-')}-printable.png`;
        a.click();
      };
      qrImage.src = qrCodeDataURL;
    } catch (error) {
      console.error('Error generating printable QR:', error);
    }
  }, [qrCodeDataURL, location, totals]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full h-full sm:max-w-2xl sm:h-auto sm:max-h-[80vh] overflow-y-auto">
        <DialogHeader className="p-4 sm:p-6">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <QrCode className="h-4 w-4 sm:h-5 sm:w-5" />
            QR Code - ตำแหน่ง {location}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            สร้างและดาวน์โหลด QR Code สำหรับตำแหน่ง {location} รวมข้อมูลสินค้าทั้งหมดในตำแหน่งนี้
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 py-2 sm:py-4 px-4 sm:px-6">
          {/* QR Code Display */}
          <div className="flex flex-col items-center space-y-3 sm:space-y-4">
            <div className="w-40 h-40 sm:w-48 sm:h-48 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center p-2">
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-full"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              {!existingQR ? (
                <Button
                  onClick={handleGenerateQR}
                  variant="default"
                  className="flex items-center gap-2 h-11 sm:h-10 text-sm"
                  disabled={qrLoading}
                >
                  {qrLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <QrCode className="h-4 w-4" />
                  )}
                  สร้าง QR Code
                </Button>
              ) : (
                <>
                  <Button onClick={downloadQR} variant="outline" className="flex items-center gap-2 h-11 sm:h-10 text-xs sm:text-sm" disabled={!qrCodeDataURL}>
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">ดาวน์โหลด QR Code</span>
                    <span className="sm:hidden">ดาวน์โหลด</span>
                  </Button>
                  <Button
                    onClick={generatePrintableQR}
                    variant="default"
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 h-11 sm:h-10 text-xs sm:text-sm"
                    disabled={!qrCodeDataURL}
                  >
                    <Printer className="h-4 w-4" />
                    <span className="hidden sm:inline">พิมพ์พร้อมข้อความ</span>
                    <span className="sm:hidden">พิมพ์</span>
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
                    className="flex items-center gap-2 h-11 sm:h-10 text-xs sm:text-sm"
                    disabled={!qrCodeDataURL || !navigator.share}
                  >
                    <QrCode className="h-4 w-4" />
                    แชร์
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Location Summary */}
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                ข้อมูลตำแหน่ง
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">
                <div className="text-center p-2 sm:p-3 bg-blue-50 rounded-lg">
                  <div className="text-lg sm:text-2xl font-bold text-blue-600">{totals.items}</div>
                  <div className="text-[10px] sm:text-sm text-gray-600">รายการสินค้า</div>
                </div>
                <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
                  <div className="text-lg sm:text-2xl font-bold text-green-600">{totals.level1}</div>
                  <div className="text-[10px] sm:text-sm text-gray-600">ลัง</div>
                </div>
                <div className="text-center p-2 sm:p-3 bg-orange-50 rounded-lg">
                  <div className="text-lg sm:text-2xl font-bold text-orange-600">{totals.level2}</div>
                  <div className="text-[10px] sm:text-sm text-gray-600">กล่อง</div>
                </div>
                <div className="text-center p-2 sm:p-3 bg-purple-50 rounded-lg">
                  <div className="text-lg sm:text-2xl font-bold text-purple-600">{totals.level3}</div>
                  <div className="text-[10px] sm:text-sm text-gray-600">ชิ้น</div>
                </div>
                <div className="text-center p-2 sm:p-3 bg-indigo-50 rounded-lg col-span-2 sm:col-span-1">
                  <div className="text-lg sm:text-2xl font-bold text-indigo-600">{productGroups.length}</div>
                  <div className="text-[10px] sm:text-sm text-gray-600">ประเภทสินค้า</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product List */}
          {locationItems.length > 0 && (
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Package className="h-3 w-3 sm:h-4 sm:w-4" />
                  สินค้าในตำแหน่งนี้
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="space-y-2 sm:space-y-3">
                  {productGroups.map(([sku, groupItems]) => (
                    <div key={sku} className="border rounded-lg p-2 sm:p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-xs sm:text-sm truncate">{groupItems[0].product_name}</div>
                          <div className="text-[10px] sm:text-sm text-gray-500 font-mono truncate">{sku}</div>
                          {groupItems.length > 1 && (
                            <div className="text-[10px] sm:text-xs text-blue-600">
                              {groupItems.length} Lot ที่แตกต่างกัน
                            </div>
                          )}
                        </div>
                        <div className="text-right space-y-0.5 sm:space-y-1 flex-shrink-0">
                          {/* Level 1 Units (ลัง) */}
                          {groupItems.some(item => (item.unit_level1_quantity || 0) > 0) && (
                            <div className="text-xs sm:text-sm">
                              <span className="font-medium">
                                {groupItems.reduce((sum, item) => sum + (item.unit_level1_quantity || 0), 0)}
                              </span>
                              <span className="text-gray-500"> {groupItems[0].unit_level1_name || 'ลัง'}</span>
                            </div>
                          )}
                          {/* Level 2 Units (กล่อง) */}
                          {groupItems.some(item => (item.unit_level2_quantity || 0) > 0) && (
                            <div className="text-xs sm:text-sm">
                              <span className="font-medium">
                                {groupItems.reduce((sum, item) => sum + (item.unit_level2_quantity || 0), 0)}
                              </span>
                              <span className="text-gray-500"> {groupItems[0].unit_level2_name || 'กล่อง'}</span>
                            </div>
                          )}
                          {/* Level 3 Units (ชิ้น) */}
                          {groupItems.some(item => (item.unit_level3_quantity || 0) > 0) && (
                            <div className="text-xs sm:text-sm">
                              <span className="font-medium">
                                {groupItems.reduce((sum, item) => sum + (item.unit_level3_quantity || 0), 0)}
                              </span>
                              <span className="text-gray-500"> {groupItems[0].unit_level3_name || 'ชิ้น'}</span>
                            </div>
                          )}
                          {/* Total Pieces */}
                          <div className="text-xs sm:text-sm text-indigo-600 font-semibold border-t pt-0.5 sm:pt-1">
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
                            <div key={index} className="flex items-start sm:items-center justify-between text-[10px] sm:text-xs gap-2">
                              <span className="flex items-center gap-1 sm:gap-2 flex-wrap min-w-0">
                                <Badge variant="outline" className="text-[10px] sm:text-xs">{item.lot || 'ไม่ระบุ LOT'}</Badge>
                                {item.mfd && (
                                  <span className="text-gray-500 text-[10px] sm:text-xs">MFD: {item.mfd}</span>
                                )}
                              </span>
                              <span className="text-gray-600 text-right flex-shrink-0 text-[10px] sm:text-xs">
                                {item.unit_level1_quantity && item.unit_level1_quantity > 0 && `${item.unit_level1_quantity}${item.unit_level1_name || 'ลัง'} `}
                                {item.unit_level2_quantity && item.unit_level2_quantity > 0 && `${item.unit_level2_quantity}${item.unit_level2_name || 'กล่อง'} `}
                                {item.unit_level3_quantity && item.unit_level3_quantity > 0 && `${item.unit_level3_quantity}${item.unit_level3_name || 'ชิ้น'}`}
                                <span className="text-indigo-600 ml-1 sm:ml-2 block sm:inline">(รวม: {calculateTotalPieces(item)} ชิ้น)</span>
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
              <CardContent className="p-6 sm:p-8 text-center">
                <Package className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-gray-400 mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-gray-600 mb-1 sm:mb-2">ตำแหน่งว่าง</h3>
                <p className="text-sm sm:text-base text-gray-500">
                  ยังไม่มีสินค้าในตำแหน่งนี้
                </p>
              </CardContent>
            </Card>
          )}

          {/* QR Status */}
          {existingQR && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-green-600" />
                    <span className="text-xs sm:text-sm font-medium text-green-800">QR Code พร้อมใช้งาน</span>
                  </div>
                  <div className="text-[10px] sm:text-xs text-green-600">
                    สร้างเมื่อ: {new Date(existingQR.generated_at || existingQR.created_at).toLocaleString('th-TH')}
                  </div>
                </div>
                <div className="mt-2 text-[10px] sm:text-xs text-green-700">
                  📱 สแกน QR Code นี้เพื่อดูข้อมูลล่าสุดของตำแหน่ง {location}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Last Updated */}
          <div className="flex items-center justify-center text-[10px] sm:text-xs text-gray-500">
            <Clock className="h-3 w-3 mr-1" />
            ข้อมูลอัพเดต: {new Date().toLocaleString('th-TH')}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});