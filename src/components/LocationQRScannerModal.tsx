import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { QRScanner } from './QRScanner';
import { LocationDetailView } from './LocationDetailView';

interface LocationQRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LocationQRScannerModal({ isOpen, onClose }: LocationQRScannerModalProps) {
  const [scannedLocation, setScannedLocation] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(true);

  const handleScanSuccess = (location: string, data: any) => {
    console.log('✅ QR Scanned:', { location, data });
    setScannedLocation(location);
    setShowScanner(false);
  };

  const handleClose = () => {
    setScannedLocation(null);
    setShowScanner(true);
    onClose();
  };

  const handleBackToScanner = () => {
    setScannedLocation(null);
    setShowScanner(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {showScanner ? (
          <QRScanner
            isOpen={isOpen}
            onClose={handleClose}
            onScanSuccess={handleScanSuccess}
          />
        ) : scannedLocation ? (
          <LocationDetailView
            location={scannedLocation}
            onClose={handleBackToScanner}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
