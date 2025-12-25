import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, X, CheckCircle, AlertCircle, Scan, RefreshCw, Search, QrCode, MapPin, Grid3X3, List } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocationQR, type LocationQRCode } from '@/hooks/useLocationQR';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (location: string, data: any) => void;
}

interface ScanResult {
  location: string;
  data: any;
  timestamp: Date;
}

export function QRScanner({ isOpen, onClose, onScanSuccess }: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string>('');
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [activeTab, setActiveTab] = useState<'scan' | 'browse'>('scan');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const { qrCodes, getQRByLocation } = useLocationQR();

  // Initialize scanner when dialog opens
  useEffect(() => {
    if (isOpen && !scannerRef.current) {
      initializeScanner();
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, [isOpen]);

  // Get all QR codes for browsing
  const allQRCodes = qrCodes;
  const filteredQRCodes = allQRCodes.filter(qr =>
    qr.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const initializeScanner = async () => {
    try {
      setError('');
      setIsScanning(true);

      // Check camera permission
      if (navigator.permissions) {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setCameraPermission(result.state);

        result.onchange = () => {
          setCameraPermission(result.state);
        };
      }

      const html5QrcodeScanner = new Html5QrcodeScanner(
        'qr-scanner-container',
        {
          fps: 10,
          qrbox: {
            width: 280,
            height: 280,
          },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
          defaultZoomValueIfSupported: 2,
        },
        false
      );

      html5QrcodeScanner.render(handleScanSuccess, onScanFailure);
      scannerRef.current = html5QrcodeScanner;

    } catch (error) {
      console.error('❌ Failed to initialize QR scanner:', error);
      setError('ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบสิทธิ์การเข้าถึงกล้อง');
      setIsScanning(false);
    }
  };

  const handleScanSuccess = (decodedText: string, decodedResult: any) => {

    try {
      let location = '';
      let action = 'view';
      
      // Try to parse as URL
      try {
        const url = new URL(decodedText);
        location = url.searchParams.get('location') || '';
        action = url.searchParams.get('action') || 'view';
      } catch {
        // If not a URL, treat as plain location string
        location = decodedText.trim();
      }

      if (!location) {
        throw new Error('ไม่พบข้อมูลตำแหน่งใน QR Code');
      }

      // Check if this location has a QR code in our system
      const qrData = getQRByLocation(location);

      const result: ScanResult = {
        location,
        data: {
          url: decodedText,
          location,
          action,
          qrData,
          rawData: decodedResult
        },
        timestamp: new Date()
      };

      setScanResult(result);
      setIsScanning(false);

      // Stop the scanner
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }

      toast({
        title: 'สแกน QR Code สำเร็จ',
        description: `พบข้อมูลตำแหน่ง: ${location}`,
      });

      // Call the success callback
      onScanSuccess(location, result.data);

    } catch (error) {
      console.error('❌ Error parsing QR code:', error);
      setError(`ไม่สามารถอ่าน QR Code ได้: ${error instanceof Error ? error.message : 'ข้อมูลไม่ถูกต้อง'}`);

      toast({
        title: 'QR Code ไม่ถูกต้อง',
        description: 'กรุณาสแกน QR Code ของระบบคลังสินค้า',
        variant: 'destructive',
      });
    }
  };

  const onScanFailure = (error: string) => {
    // Don't show every scan attempt error, only real errors
    if (error.includes('NotFoundException')) {
      return; // Normal when no QR code is in view
    }

  };

  const handleClose = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setIsScanning(false);
    setScanResult(null);
    setError('');
    setActiveTab('scan');
    setSearchQuery('');
    onClose();
  };

  const handleQRCodeSelect = (qrCode: LocationQRCode) => {
    const result: ScanResult = {
      location: qrCode.location,
      data: {
        url: qrCode.url,
        location: qrCode.location,
        action: 'browse',
        qrData: qrCode,
        rawData: null
      },
      timestamp: new Date()
    };

    setScanResult(result);
    setActiveTab('scan');

    toast({
      title: 'เลือก QR Code สำเร็จ',
      description: `ตำแหน่ง: ${qrCode.location}`,
    });

    onScanSuccess(qrCode.location, result.data);
  };

  const handleRetry = () => {
    setError('');
    setScanResult(null);
    initializeScanner();
  };

  const handlePermissionRequest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop()); // Stop immediately after getting permission
      setCameraPermission('granted');
      initializeScanner();
    } catch (error) {
      console.error('Camera permission denied:', error);
      setCameraPermission('denied');
      setError('กรุณาอนุญาตการเข้าถึงกล้องเพื่อใช้งานการสแกน QR Code');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-full h-full sm:max-w-2xl sm:h-auto mx-auto bg-white">
        <DialogHeader className="p-4 sm:p-6">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Scan className="h-4 w-4 sm:h-5 sm:w-5" />
            สแกน QR Code
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            สแกนหรือเลือก QR Code ที่ตำแหน่งคลังสินค้า
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'scan' | 'browse')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-11 sm:h-10">
            <TabsTrigger value="scan" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Camera className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">สแกนกล้อง</span>
              <span className="sm:hidden">สแกน</span>
            </TabsTrigger>
            <TabsTrigger value="browse" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <List className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">เลือกจากรายการ ({allQRCodes.length})</span>
              <span className="sm:hidden">รายการ ({allQRCodes.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scan" className="space-y-3 sm:space-y-4">
            {/* Camera Permission */}
            {cameraPermission === 'denied' && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs sm:text-sm text-red-800">
                        ไม่สามารถเข้าถึงกล้องได้
                      </p>
                      <p className="text-[10px] sm:text-xs text-red-600 mt-1">
                        กรุณาอนุญาตการเข้าถึงกล้องในเบราว์เซอร์
                      </p>
                      <Button
                        size="sm"
                        className="mt-2 h-9 sm:h-8 text-xs sm:text-sm"
                        onClick={handlePermissionRequest}
                      >
                        <Camera className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">อนุญาตการเข้าถึงกล้อง</span>
                        <span className="sm:hidden">อนุญาต</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Scanner Container */}
            {!scanResult && !error && cameraPermission !== 'denied' && (
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="text-center space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-center gap-2">
                      <Camera className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      <span className="text-xs sm:text-sm font-medium">
                        {isScanning ? 'กำลังเปิดกล้อง...' : 'เตรียมสแกน QR Code'}
                      </span>
                    </div>

                    <div
                      id="qr-scanner-container"
                      className="mx-auto max-w-sm min-h-[250px]"
                    />

                    {isScanning && (
                      <div className="text-[10px] sm:text-xs text-muted-foreground">
                        นำกล้องไปส่อง QR Code ที่ตำแหน่งคลัง
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Scan Result */}
            {scanResult && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="flex items-center gap-2 text-green-800 text-sm sm:text-base">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                    สแกนสำเร็จ
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Badge variant="secondary" className="mb-2 text-xs sm:text-sm">
                      ตำแหน่ง: {scanResult.location}
                    </Badge>
                  </div>

                  <div className="text-xs sm:text-sm space-y-2">
                    <div>
                      <span className="font-medium">เวลาสแกน:</span>
                      <span className="ml-2">{scanResult.timestamp.toLocaleString('th-TH')}</span>
                    </div>

                    {scanResult.data.action && (
                      <div>
                        <span className="font-medium">การดำเนินการ:</span>
                        <span className="ml-2">{scanResult.data.action}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t">
                    <Button
                      size="sm"
                      className="w-full h-11 sm:h-10 text-xs sm:text-sm"
                      onClick={() => onScanSuccess(scanResult.location, scanResult.data)}
                    >
                      ไปยังตำแหน่งนี้
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error State */}
            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs sm:text-sm text-red-800 mb-2">{error}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRetry}
                        className="border-red-300 text-red-700 hover:bg-red-100 h-9 sm:h-8 text-xs sm:text-sm"
                      >
                        <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        ลองใหม่
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="browse" className="space-y-3 sm:space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาตำแหน่ง (เช่น A01-01)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 sm:pl-10 h-11 sm:h-10 text-xs sm:text-sm"
              />
            </div>

            {/* QR Code List */}
            <div className="max-h-80 sm:max-h-96 overflow-y-auto">
              {filteredQRCodes.length === 0 ? (
                <Card>
                  <CardContent className="p-6 sm:p-8 text-center">
                    <QrCode className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {searchQuery ? 'ไม่พบ QR Code ที่ตรงกับการค้นหา' : 'ไม่มี QR Code ในระบบ'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-2">
                  {filteredQRCodes.map((qrCode) => (
                    <Card key={qrCode.location} className="hover:bg-slate-50 cursor-pointer transition-colors">
                      <CardContent className="p-3 sm:p-4">
                        <div
                          className="flex items-center justify-between gap-2"
                          onClick={() => handleQRCodeSelect(qrCode)}
                        >
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            <div className="flex-shrink-0">
                              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary/10 rounded flex items-center justify-center">
                                <QrCode className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-sm sm:text-base truncate">{qrCode.location}</div>
                              <div className="text-xs sm:text-sm text-muted-foreground truncate">
                                {qrCode.description || 'ตำแหน่งคลังสินค้า'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                            <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground hidden sm:block" />
                            <Badge variant="outline" className="text-[10px] sm:text-xs">เลือก</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {filteredQRCodes.length > 0 && (
              <div className="text-[10px] sm:text-xs text-center text-muted-foreground pt-2 border-t">
                แสดง {filteredQRCodes.length} จาก {allQRCodes.length} QR Code ทั้งหมด
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Close Button */}
        <div className="flex justify-end pt-3 sm:pt-4 border-t">
          <Button variant="outline" onClick={handleClose} className="h-11 sm:h-10 text-xs sm:text-sm">
            <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            ปิด
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}