import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X, CheckCircle, AlertCircle, Scan, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocationQR } from '@/hooks/useLocationQR';

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
  const { toast } = useToast();
  const { getQRByLocation } = useLocationQR();

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
      // Parse the scanned URL to extract location information
      const url = new URL(decodedText);
      const location = url.searchParams.get('location');
      const action = url.searchParams.get('action');

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
    onClose();
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
      <DialogContent className="max-w-md mx-auto bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            สแกน QR Code
          </DialogTitle>
          <DialogDescription>
            นำกล้องไปส่อง QR Code ที่ตำแหน่งคลังสินค้า
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera Permission */}
          {cameraPermission === 'denied' && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-800">
                      ไม่สามารถเข้าถึงกล้องได้
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      กรุณาอนุญาตการเข้าถึงกล้องในเบราว์เซอร์
                    </p>
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={handlePermissionRequest}
                    >
                      <Camera className="h-4 w-4 mr-1" />
                      อนุญาตการเข้าถึงกล้อง
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Scanner Container */}
          {!scanResult && !error && cameraPermission !== 'denied' && (
            <Card>
              <CardContent className="p-4">
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <Camera className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">
                      {isScanning ? 'กำลังเปิดกล้อง...' : 'เตรียมสแกน QR Code'}
                    </span>
                  </div>

                  <div
                    id="qr-scanner-container"
                    className="mx-auto max-w-sm"
                    style={{ minHeight: '300px' }}
                  />

                  {isScanning && (
                    <div className="text-xs text-muted-foreground">
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
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-5 w-5" />
                  สแกนสำเร็จ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Badge variant="secondary" className="mb-2">
                      ตำแหน่ง: {scanResult.location}
                    </Badge>
                  </div>

                  <div className="text-sm space-y-2">
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
                      className="w-full"
                      onClick={() => onScanSuccess(scanResult.location, scanResult.data)}
                    >
                      ไปยังตำแหน่งนี้
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-800 mb-2">{error}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRetry}
                      className="border-red-300 text-red-700 hover:bg-red-100"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      ลองใหม่
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              <X className="h-4 w-4 mr-1" />
              ปิด
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}