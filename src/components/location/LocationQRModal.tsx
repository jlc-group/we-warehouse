import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, Download, ExternalLink, MapPin, Copy, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLocationQR } from '@/hooks/useLocationQR';
import { useBackClosesModal } from '@/hooks/useBackClosesModal';

interface LocationQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: string;
}

/**
 * Modal แสดง QR Code ของ location
 * - QR ขนาดใหญ่ (300x300) สแกน/Print ได้
 * - ปุ่ม Print, Download, Copy URL, "ลองเปิด" (navigate ไปหน้า mobile)
 */
export function LocationQRModal({ isOpen, onClose, location }: LocationQRModalProps) {
  const { toast } = useToast();
  const { getQRByLocation, generateQRForLocation, refetch } = useLocationQR();
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  useBackClosesModal(isOpen, onClose);

  const qr = getQRByLocation(location);

  // ถ้าไม่มี QR → generate ให้อัตโนมัติเมื่อเปิด modal
  useEffect(() => {
    if (isOpen && !qr && !generating) {
      setGenerating(true);
      generateQRForLocation(location, [])
        .then(() => refetch())
        .finally(() => setGenerating(false));
    }
  }, [isOpen, qr, location, generating, generateQRForLocation, refetch]);

  const handlePrint = () => {
    if (!qr?.qr_image_url) return;
    const printWin = window.open('', '_blank', 'width=400,height=500');
    if (!printWin) return;
    printWin.document.write(`
      <html>
        <head>
          <title>QR ${location}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 20px; margin: 0; }
            h1 { font-size: 28px; margin: 10px 0; }
            img { width: 300px; height: 300px; }
            .url { font-size: 10px; color: #666; word-break: break-all; max-width: 320px; margin: 10px auto; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>📍 ${location}</h1>
          <img src="${qr.qr_image_url}" alt="QR ${location}" />
          <div class="url">${qr.qr_code_data || ''}</div>
          <script>setTimeout(() => { window.print(); window.close(); }, 250);</script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const handleDownload = () => {
    if (!qr?.qr_image_url) return;
    const a = document.createElement('a');
    a.href = qr.qr_image_url;
    a.download = `qr-${location.replace(/\//g, '-')}.png`;
    a.click();
    toast({ title: '✅ ดาวน์โหลดสำเร็จ', description: `บันทึก qr-${location.replace(/\//g, '-')}.png แล้ว` });
  };

  const handleCopyUrl = async () => {
    if (!qr?.qr_code_data) return;
    try {
      await navigator.clipboard.writeText(qr.qr_code_data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'คัดลอกไม่สำเร็จ', variant: 'destructive' });
    }
  };

  const handleOpenMobile = () => {
    if (!qr?.qr_code_data) return;
    window.open(qr.qr_code_data, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            QR Code: {location}
          </DialogTitle>
          <DialogDescription>
            สแกน, พิมพ์ หรือดาวน์โหลด QR สำหรับตำแหน่งนี้
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {qr?.qr_image_url ? (
            <div className="rounded-lg border-2 border-blue-200 bg-white p-3 shadow-sm">
              <img
                src={qr.qr_image_url}
                alt={`QR ${location}`}
                className="h-72 w-72 object-contain"
              />
            </div>
          ) : (
            <div className="flex h-72 w-72 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
              <span className="text-sm text-gray-500">
                {generating ? 'กำลังสร้าง QR...' : 'ไม่มี QR Code'}
              </span>
            </div>
          )}

          {qr?.qr_code_data && (
            <div className="w-full">
              <div className="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2">
                <span className="flex-1 truncate text-xs text-gray-600 font-mono">
                  {qr.qr_code_data}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  onClick={handleCopyUrl}
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 mr-1 text-green-600" />
                      <span className="text-xs">คัดลอกแล้ว</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      <span className="text-xs">คัดลอก</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {qr?.qr_image_url && (
            <div className="grid w-full grid-cols-3 gap-2">
              <Button onClick={handlePrint} variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-1" />
                <span className="text-xs">พิมพ์</span>
              </Button>
              <Button onClick={handleDownload} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                <span className="text-xs">ดาวน์โหลด</span>
              </Button>
              <Button onClick={handleOpenMobile} variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-1" />
                <span className="text-xs">ลองเปิด</span>
              </Button>
            </div>
          )}

          <Badge variant="secondary" className="text-[10px]">
            💡 สแกน QR นี้ด้วยมือถือ → เปิดหน้าจัดการ {location} ทันที
          </Badge>
        </div>
      </DialogContent>
    </Dialog>
  );
}
