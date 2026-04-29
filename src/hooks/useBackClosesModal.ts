import { useEffect, useRef } from 'react';

/**
 * เมื่อ modal เปิด → push history state พิเศษ
 * เมื่อผู้ใช้กด back (browser/มือถือ) → popstate fire → onClose() ปิดเฉพาะ modal
 *   (ไม่ navigate ออกจาก route)
 *
 * ใช้คู่กับ <Dialog open={isOpen} onOpenChange={onClose}> ปกติ — hook นี้แค่
 * เพิ่ม "ปิดเมื่อกด back" ทับเข้าไปอีกชั้น
 *
 * IMPORTANT: ใช้ ref สำหรับ onClose เพื่อไม่ให้ effect re-run เมื่อ parent
 * สร้าง onClose ใหม่ทุก render (เคยเป็นบั๊ก: modal เด้งแล้วปิดทันที)
 */
export function useBackClosesModal(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    // Push placeholder history entry ที่ระบุว่ามี modal เปิดอยู่
    const stateMarker = { __modal: true, ts: Date.now() };
    window.history.pushState(stateMarker, '');

    let closedByBack = false;
    const onPop = () => {
      closedByBack = true;
      onCloseRef.current();
    };
    window.addEventListener('popstate', onPop);

    return () => {
      window.removeEventListener('popstate', onPop);
      // ถ้า modal ถูกปิดด้วยวิธีอื่น (กดปุ่ม X / ยกเลิก / save สำเร็จ)
      // → pop history entry ที่เรา push ออก เพื่อกด back ครั้งเดียวออกจาก route ได้
      if (!closedByBack && window.history.state?.__modal) {
        window.history.back();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
}
