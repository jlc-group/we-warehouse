# 📱 QR Code Testing Guide for Location Format

## 🎯 วัตถุประสงค์

ทดสอบการทำงานของ QR code scanning หลังจากการอัปเดต location format เป็น A1/1 ... A20/4

## 🧪 Test Cases

### 1. QR Codes สำหรับทดสอบ

สร้าง QR codes ด้วย format ต่างๆ เพื่อทดสอบ:

#### Format ใหม่ (มาตรฐาน)
```
A1/1
A1/2
B2/15
N4/20
```

#### Format เก่า (ควรทำงานได้)
```
A/1/1
A/1/01
A-1-1
A 1 1
A.1.1
A11
A101
```

#### URL-based QR codes
```
https://your-app.com?location=A1/1
https://your-app.com?location=A/1/1
https://your-app.com/location/A1/1
```

### 2. ขั้นตอนการทดสอบ

#### Step 1: สร้าง QR Codes
1. ใช้ QR code generator online (เช่น qr-code-generator.com)
2. สร้าง QR codes สำหรับ test cases ข้างต้น
3. พิมพ์หรือแสดงบนหน้าจออื่น

#### Step 2: ทดสอบ QR Scanning
1. เปิดแอปใน browser (โดยเฉพาะมือถือ)
2. ใช้ QR scanner ในแอป
3. สแกน QR codes แต่ละตัว
4. ตรวจสอบผลลัพธ์

#### Step 3: ทดสอบ LocationDetail Page
1. หลังจากสแกน QR ควรไป LocationDetail page
2. ตรวจสอบว่าแสดง location ถูกต้องเป็น A1/1 format
3. **ตรวจสอบปุ่ม 4 ตัว**: แก้ไข/เพิ่ม/ย้าย/ส่งออก
4. ทดสอบคลิกปุ่มแต่ละตัว

## ✅ Expected Results

### QR Scanning Results
| QR Code Input | Expected Navigation | Expected Display |
|---------------|-------------------|------------------|
| A1/1 | → /location/A1/1 | A1/1 |
| A/1/1 | → /location/A1/1 | A1/1 |
| A/1/01 | → /location/A1/1 | A1/1 |
| A-1-1 | → /location/A1/1 | A1/1 |
| A11 | → /location/A1/1 | A1/1 |
| B2/15 | → /location/B2/15 | B2/15 |

### LocationDetail Page Checklist
- [ ] URL shows correct format: `/location/A1/1`
- [ ] Page title shows: "A1/1"
- [ ] Location info displays correctly
- [ ] 4 action buttons visible:
  - [ ] 🔵 แก้ไข (Edit) - blue button
  - [ ] 🟢 เพิ่มสินค้า (Add Item) - green button
  - [ ] 🟠 ย้ายคลัง (Transfer) - orange button
  - [ ] 🔴 ส่งออก (Export) - red button
- [ ] Buttons respond to clicks
- [ ] Inventory list displays (if any)
- [ ] Mobile responsive design works

## 🐛 Troubleshooting

### QR Scanning Issues
**Problem**: QR code ไม่ถูกจำนวจ
- ตรวจสอบ camera permissions
- ลองใช้ QR code ขนาดใหญ่กว่า
- ตรวจสอบว่า QR code มี format ถูกต้อง

**Problem**: Navigation ไม่ทำงาน
- เปิด browser console และดู errors
- ตรวจสอบ locationPatterns ใน Index.tsx
- ตรวจสอบ normalizeLocation function

### LocationDetail Issues
**Problem**: ไม่เห็นปุ่ม 4 ตัว
- ตรวจสอบ mobile viewport
- ลอง scroll ลงมาดู
- เปิด browser DevTools และดู CSS
- ตรวจสอบ z-index และ positioning

**Problem**: Buttons ไม่ทำงาน
- เปิด console และดู click events
- ตรวจสอบ modal states
- ตรวจสอบ LocationDetail component logic

## 📱 Mobile Testing

### iOS Safari
- [ ] QR scanning works
- [ ] Navigation works
- [ ] 4 buttons visible
- [ ] Touch interactions work
- [ ] Layout responsive

### Android Chrome
- [ ] QR scanning works
- [ ] Navigation works
- [ ] 4 buttons visible
- [ ] Touch interactions work
- [ ] Layout responsive

### Desktop Testing
- [ ] Manual URL entry works: `/location/A1/1`
- [ ] Buttons visible and clickable
- [ ] Responsive design at different widths

## 🔍 Debug Console Commands

เปิด browser console และรันคำสั่งเหล่านี้:

```javascript
// Test normalization function
import { normalizeLocation } from '/src/utils/locationUtils.js';
console.log(normalizeLocation('A/1/1')); // Should output: A1/1
console.log(normalizeLocation('A1/1'));  // Should output: A1/1

// Test QR patterns
const patterns = [
  /^[A-N][1-4]\/([1-9]|1[0-9]|20)$/,
  /^[A-Z]\/[1-4]\/([1-9]|1[0-9]|20)$/
];
const testLocation = 'A1/1';
console.log('Matches patterns:', patterns.some(p => p.test(testLocation)));

// Test navigation
window.location.href = '/location/A1/1';
```

## 🎯 Success Criteria

ระบบถือว่าผ่านการทดสอบเมื่อ:

1. **QR Scanning**: QR codes ทุก format สามารถสแกนและ navigate ได้ถูกต้อง
2. **Format Conversion**: Legacy formats แปลงเป็น A1/1 อัตโนมัติ
3. **LocationDetail**: หน้า detail แสดงผล location ในรูปแบบ A1/1
4. **Action Buttons**: ปุ่ม 4 ตัวแสดงและทำงานได้ปกติ
5. **Mobile Compatibility**: ทำงานได้บนมือถือทุกขนาดหน้าจอ
6. **User Experience**: ไม่มี errors ใน console, การใช้งานราบรื่น

## 📊 Test Report Template

```
Date: _______________
Tester: _____________
Device: _____________
Browser: ____________

QR Code Tests:
□ A1/1 → Success/Fail
□ A/1/1 → Success/Fail
□ A/1/01 → Success/Fail
□ A-1-1 → Success/Fail

LocationDetail Tests:
□ URL format correct
□ 4 buttons visible
□ Buttons functional
□ Mobile responsive

Issues Found:
________________
________________

Overall Status: Pass/Fail
```