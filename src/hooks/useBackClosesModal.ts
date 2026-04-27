import { useEffect } from 'react';

/**
 * เมื่อ modal เปิด → push history state พิเศษ
 * เมื่อผู้ใช้กด back (browser/มือถือ) → popstate fire → onClose() ปิดเฉพาะ modal
 *   (ไม่ navigate ออกจาก route)
 *
 * ใช้คู่กับ <Dialog open={isOpen} onOpenChange={onClose}> ปกติ — hook นี้แค่
 * เพิ่ม "ปิดเมื่อกด back" ทับเข้าไปอีกชั้น
 */
export function useBackClosesModal(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    // Push placeholder history entry ที่ระบุว่ามี modal เปิดอยู่
    const stateMarker = { __modal: true, ts: Date.now() };
    window.history.pushState(stateMarker, '');

    let closedByBack = false;
    const onPop = () => {
      closedByBack = true;
      onClose();
    };
    window.addEventListener('popstate', onPop);

    return () => {
      window.removeEventListener('popstate', onPop);
      // ถ้า modal ถูกปิดด้วยวิธีอื่น (กดปุ่ม X / ปุ่ม "ยกเลิก" / save สำเร็จ)
      // → ต้อง pop history entry ที่เรา push ออกด้วย ไม่งั้น user จะต้องกด back 2 ครั้ง
      // ถึงจะออกจาก route ได้
      if (!closedByBack && window.history.state?.__modal) {
        window.history.back();
      }
    };
  }, [isOpen, onClose]);
}
