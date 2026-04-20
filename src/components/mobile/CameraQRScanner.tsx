import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from '@/components/ui/sonner';

interface CameraQRScannerProps {
    onScan: (code: string) => void;
    buttonText?: string;
    buttonClassName?: string;
    modalTitle?: string;
    modalHint?: string;
    scannerId?: string;
}

export const CameraQRScanner: React.FC<CameraQRScannerProps> = ({
    onScan,
    buttonText = '📷 สแกน QR ด้วยกล้อง',
    buttonClassName = '',
    modalTitle = '📷 สแกน QR Code',
    modalHint = 'เล็งกล้องไปที่ QR Code',
    scannerId = 'qr-reader'
}) => {
    const [showScanner, setShowScanner] = useState(false);
    const [html5QrCode, setHtml5QrCode] = useState<Html5Qrcode | null>(null);

    const startCameraScanner = async () => {
        setShowScanner(true);
        // Small delay to ensure DOM element exists
        setTimeout(async () => {
            try {
                const scanner = new Html5Qrcode(scannerId);
                setHtml5QrCode(scanner);

                await scanner.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    (decodedText) => {
                        onScan(decodedText);
                        stopCameraScanner();
                        toast.success(`สแกนได้: ${decodedText}`);
                    },
                    () => { } // Ignore scan errors
                );
            } catch (err) {
                console.error('Camera error:', err);
                toast.error('ไม่สามารถเปิดกล้องได้');
                setShowScanner(false);
            }
        }, 100);
    };

    const stopCameraScanner = () => {
        if (html5QrCode) {
            html5QrCode.stop().catch(() => { });
            setHtml5QrCode(null);
        }
        setShowScanner(false);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (html5QrCode) {
                html5QrCode.stop().catch(() => { });
            }
        };
    }, [html5QrCode]);

    return (
        <>
            {/* Camera QR Scanner Modal */}
            {showScanner && (
                <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
                    <div className="flex justify-between items-center p-4 bg-black text-white">
                        <span className="font-bold">{modalTitle}</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={stopCameraScanner}
                            className="text-white hover:bg-white/20"
                        >
                            <X className="h-6 w-6" />
                        </Button>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-4">
                        <div id={scannerId} className="w-full max-w-sm bg-white rounded-lg overflow-hidden" />
                    </div>
                    <div className="p-4 text-center text-white text-sm">
                        {modalHint}
                    </div>
                </div>
            )}

            {/* Camera Scan Button */}
            <Button
                onClick={startCameraScanner}
                className={`w-full h-12 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold shadow-lg ${buttonClassName}`}
            >
                <Camera className="h-5 w-5 mr-2" />
                {buttonText}
            </Button>
        </>
    );
};

export default CameraQRScanner;
