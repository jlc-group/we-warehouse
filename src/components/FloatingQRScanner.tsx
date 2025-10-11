import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { QrCode, X } from 'lucide-react';
import { QRScanner } from './QRScanner';
import { cn } from '@/lib/utils';

interface FloatingQRScannerProps {
  onScanSuccess: (location: string, data: any) => void;
  className?: string;
}

export function FloatingQRScanner({ onScanSuccess, className }: FloatingQRScannerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleScanSuccess = (location: string, data: any) => {
    setIsOpen(false);
    onScanSuccess(location, data);
  };

  return (
    <>
      {/* Floating QR Scanner Button */}
      <div className={cn(
        "fixed bottom-6 right-6 z-50",
        className
      )}>
        <Button
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-200 bg-blue-600 hover:bg-blue-700"
          onClick={() => setIsOpen(true)}
          title="สแกน QR Code"
        >
          <QrCode className="h-6 w-6" />
          <span className="sr-only">สแกน QR Code</span>
        </Button>
      </div>

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </>
  );
}