# Debug Steps - โปรแกรมทำงานไม่เรียบร้อย

## ขั้นตอนการตรวจสอบ

### 1. เช็ค Browser Console
1. เปิด Chrome DevTools (F12)
2. ไปที่ Console tab
3. ดู errors สีแดง (ถ้ามี)
4. Copy error message ทั้งหมดมาให้ฉัน

### 2. เช็ค Network Tab
1. เปิด Network tab ใน DevTools
2. Refresh หน้าเว็บ (Cmd+R)
3. ดู requests ที่เป็นสีแดง (failed)
4. คลิกดู error details

### 3. Hard Refresh
ลอง hard refresh เพื่อล้าง cache:
```
Cmd + Shift + R (Mac)
หรือ Ctrl + Shift + R (Windows)
```

### 4. Clear Vite Cache
```bash
# ใน terminal
rm -rf node_modules/.vite
npm run dev
```

### 5. ตรวจสอบ TypeScript Errors
```bash
npx tsc --noEmit
```

### 6. ตรวจสอบ ESLint Errors
```bash
npm run lint
```

## สิ่งที่แก้ไขไปแล้ว

✅ อัปเดต `inventory_items` types ให้ตรงกับ database
✅ เพิ่ม columns ที่ขาดหาย: sku (required), quantity_pieces, reserved_*, batch_code, etc.
✅ Fix system_events table และ RLS policies

## ถ้ายังมีปัญหา

กรุณาแชร์:
1. Error messages จาก browser console
2. Failed network requests (ถ้ามี)
3. บอกว่ากำลังทำอะไรตอนที่เกิดปัญหา (เช่น เปิดหน้าไหน, กดปุ่มอะไร)
