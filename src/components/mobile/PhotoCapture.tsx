import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, RotateCcw, Check, X } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface PhotoCaptureProps {
  onCapture: (photoDataUrl: string) => void;
  label?: string;
  className?: string;
}

const MAX_WIDTH = 800;
const JPEG_QUALITY = 0.7;

export const PhotoCapture: React.FC<PhotoCaptureProps> = ({
  onCapture,
  label = 'ถ่ายรูปยืนยัน',
  className = '',
}) => {
  const [photo, setPhoto] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(mediaStream);
      setShowCamera(true);
      // Attach stream after DOM renders
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 50);
    } catch (err) {
      console.error('Camera error:', err);
      toast.error('ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการใช้กล้อง');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  }, [stream]);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Calculate scaled dimensions
    const ratio = Math.min(MAX_WIDTH / video.videoWidth, 1);
    canvas.width = video.videoWidth * ratio;
    canvas.height = video.videoHeight * ratio;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);

    setPhoto(dataUrl);
    onCapture(dataUrl);
    stopCamera();
    toast.success('ถ่ายรูปสำเร็จ');
  }, [onCapture, stopCamera]);

  const retakePhoto = useCallback(() => {
    setPhoto(null);
    onCapture('');
    startCamera();
  }, [onCapture, startCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className={className}>
      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Full-screen camera overlay */}
      {showCamera && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex justify-between items-center p-4 bg-black text-white">
            <span className="font-bold">📷 {label}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={stopCamera}
              className="text-white hover:bg-white/20"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>

          <div className="p-6 flex justify-center bg-black">
            <button
              onClick={capturePhoto}
              className="w-16 h-16 rounded-full bg-white border-4 border-red-500 hover:bg-red-50 active:bg-red-100 transition-all shadow-lg flex items-center justify-center"
            >
              <Camera className="h-7 w-7 text-red-500" />
            </button>
          </div>
        </div>
      )}

      {/* Photo preview or capture button */}
      {photo ? (
        <div className="border rounded-lg overflow-hidden bg-gray-50">
          <img src={photo} alt="ภาพถ่ายยืนยัน" className="w-full max-h-48 object-cover" />
          <div className="p-2 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={retakePhoto}
              className="flex-1"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              ถ่ายใหม่
            </Button>
            <div className="flex items-center text-green-600 text-sm font-medium px-2">
              <Check className="h-4 w-4 mr-1" />
              พร้อมแล้ว
            </div>
          </div>
        </div>
      ) : (
        <Button
          onClick={startCamera}
          variant="outline"
          className="w-full h-14 border-2 border-dashed border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold"
        >
          <Camera className="h-5 w-5 mr-2" />
          📷 {label} (บังคับ)
        </Button>
      )}
    </div>
  );
};

export default PhotoCapture;
