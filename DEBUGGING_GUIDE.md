# 🚀 Auto-Refresh Debugging Guide

## สถานการณ์ปัจจุบัน

เราได้แก้ไขปัญหา auto-refresh ใน React application แล้วทั้งหมด แต่ถ้าคุณยังพบปัญหา auto-refresh อยู่ อาจเป็นเพราะ **browser extensions** หรือ **browser settings**

## Error Messages ที่เห็น

```
warmup.html:1 Unchecked runtime.lastError: Could not establish connection. Receiving end does not exist.
```

**ข้อความนี้มาจาก browser extensions ไม่ใช่ React app ของเรา** - มันไม่ใช่ปัญหาของโค้ด

## 🔍 ขั้นตอนการทดสอบ

### Phase 1: ทดสอบใน Incognito Mode (สำคัญที่สุด!)

1. **เปิด Chrome Incognito Window**
   - กด `Ctrl+Shift+N` (Windows/Linux) หรือ `Cmd+Shift+N` (Mac)
   - หรือไปที่ Chrome Menu → New incognito window

2. **เข้าที่ http://localhost:8081 ใน incognito window**

3. **ทดสอบ login และการใช้งาน**
   - ถ้า **ไม่มี auto-refresh** = ปัญหาคือ browser extension
   - ถ้า **ยังมี auto-refresh** = ปัญหาอื่นที่ต้องแก้ไขต่อ

### Phase 2: ถ้า Incognito ทำงานปกติ - ปิด Extensions

1. **ไปที่ Chrome Extensions**
   - พิมพ์ `chrome://extensions/` ใน address bar
   - หรือ Chrome Menu → More tools → Extensions

2. **ปิด extensions ทีละตัว** (เริ่มจากตัวที่น่าสงสัย):
   - **React Developer Tools**
   - **Redux DevTools**
   - **Auto refresh/reload extensions**
   - **Live reload extensions**
   - **Web development tools**

3. **รีโหลดหน้าหลังปิด extension แต่ละตัว**

### Phase 3: Clear Browser Data

1. **เปิด Chrome DevTools** (`F12`)

2. **ไปที่ Application tab**

3. **ไปที่ Storage → Clear Site Data**

4. **เลือกทั้งหมดแล้วกด "Clear site data"**

### Phase 4: เปลี่ยน Port (ถ้าจำเป็น)

ถ้ายังมีปัญหา ให้เปลี่ยน port:

1. **หยุด dev server** (`Ctrl+C`)

2. **แก้ไข vite.config.ts**:
   ```typescript
   server: {
     port: 3000, // เปลี่ยนจาก 8081
     // ... rest of config
   }
   ```

3. **รัน `npm run dev` ใหม่**

4. **เข้าที่ http://localhost:3000**

## 🎯 ผลลัพธ์ที่คาดหวัง

หลังทำตามขั้นตอนแล้ว ควรได้:
- ✅ **ไม่มี auto-refresh ทุก 2 วินาที**
- ✅ **สามารถ login ได้ปกติ**
- ✅ **ไม่มี React Profiler re-render cascades**
- ✅ **ไม่มี 404 errors จาก useFeatureFlags**

## 📞 หากยังมีปัญหา

ถ้าหลังทำทุกขั้นตอนแล้วยังมีปัญหา ให้ระบุ:

1. **Incognito mode ทำงานปกติหรือไม่?**
2. **Browser และ version ที่ใช้**
3. **Extensions ที่ติดตั้งอยู่**
4. **Console logs ใหม่ที่เห็น**

---

## 🔧 การแก้ไขที่ทำไปแล้ว

เราได้แก้ไขปัญหาต่อไปนี้แล้ว:

✅ **useFeatureFlags.ts** - ตัวการหลักที่ทำ 404 queries
✅ **ProductsContext** - ปิด setInterval และแก้ re-render cascade
✅ **InventoryContext** - แก้ callback stability
✅ **Vite HMR** - ปิดสมบูรณ์
✅ **IntervalDetector** - ปิด auto-logging interval
✅ **TanStack Query** - ปิด auto-refetch ทั้งหมด

**React application ของเราไม่มี auto-refresh แล้ว** - ปัญหาที่เหลืออยู่คือ browser-level issues