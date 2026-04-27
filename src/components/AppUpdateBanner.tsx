import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * แสดง banner ทับด้านบนเมื่อมีเวอร์ชันใหม่
 * ฟัง CustomEvent('app-update-available') จาก index.html (SW updatefound + polling)
 */
export function AppUpdateBanner() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onUpdate = () => setHasUpdate(true);
    window.addEventListener('app-update-available', onUpdate);
    return () => window.removeEventListener('app-update-available', onUpdate);
  }, []);

  if (!hasUpdate || dismissed) return null;

  const reload = async () => {
    try {
      // ลบ cache ของ Service Worker ก่อน reload เพื่อโหลด bundle ใหม่จริงๆ
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.update()));
      }
    } catch { /* ignore */ }
    // hard reload (bypass http cache)
    window.location.reload();
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 flex-shrink-0" />
          <span>มีเวอร์ชันใหม่ของระบบ — รีเฟรชเพื่อใช้งานเวอร์ชันล่าสุด</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-xs"
            onClick={reload}
          >
            รีเฟรชเลย
          </Button>
          <button
            type="button"
            aria-label="ปิด"
            className="opacity-80 hover:opacity-100"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
