---
name: qa-testing
description: QA Testing Skill - ทำหน้าที่ตรวจสอบคุณภาพโค้ดและ test features
---

# QA Testing Skill

เมื่อ user ขอให้ตรวจสอบ/test โปรเจค หรือ feature ใดๆ ให้ทำตามขั้นตอนนี้:

## 🎯 หน้าที่ QA

### 1. Code Review
- ตรวจ imports และ dependencies
- ตรวจ state management
- ตรวจ error handling
- ตรวจ API calls และ parameters

### 2. UI/UX Review
- ตรวจ components ที่จำเป็น
- ตรวจ loading states
- ตรวจ error messages
- ตรวจ accessibility

### 3. Logic Review
- ตรวจ business logic
- ตรวจ edge cases
- ตรวจ data validation

## 📝 วิธีการตรวจ

### ขั้นตอนที่ 1: รวบรวมข้อมูล
```
1. view_file - ดูโค้ดที่ต้อง test
2. view_code_item - ดู function signatures ที่เกี่ยวข้อง
3. grep_search - ค้นหา usage และ dependencies
```

### ขั้นตอนที่ 2: ตรวจสอบ
- ตรวจทีละหมวด (Imports, State, API, UI)
- บันทึกผลเป็น PASS/FAIL/WARNING
- ระบุ line number ที่พบปัญหา

### ขั้นตอนที่ 3: รายงานผล
สร้าง QA Report ที่มี:
- สรุปตาราง (ผ่าน/ไม่ผ่าน/warning)
- รายละเอียดปัญหาที่พบ
- Code snippets ที่มีปัญหา
- คำแนะนำการแก้ไข

## 📊 Template รายงาน

```markdown
# QA Test Report: [Feature Name]
**Date:** [วันที่]

## Summary
| Category | Pass | Fail | Warning |
|----------|------|------|---------|
| Imports  | x    | x    | x       |
| State    | x    | x    | x       |
| API      | x    | x    | x       |
| UI       | x    | x    | x       |

## Issues Found
### [Issue 1]
- **Severity:** HIGH/MEDIUM/LOW
- **Location:** file.tsx:line
- **Description:** ...
- **Recommendation:** ...

## Overall Status: PASS/FAIL
```

## 🔧 เมื่อพบ Bug

1. **แจ้ง user** พร้อม severity
2. **เสนอวิธีแก้** พร้อม code example
3. **ถาม user** ว่าต้องการให้แก้ไหม
4. **แก้ไขและ verify** ถ้า user อนุญาต

## ⚡ Quick QA Commands

เมื่อ user พิมพ์:
- `"test หน้า X"` → ทำ full QA ของหน้านั้น
- `"ตรวจโค้ด X"` → ทำ code review
- `"หา bugs"` → สแกนหา potential issues
- `"QA report"` → สร้างรายงานสรุป

## 🚫 ข้อห้าม

- ❌ ไม่แก้ไขโค้ดโดยไม่แจ้ง user
- ❌ ไม่ข้าม error handling checks
- ❌ ไม่รายงานว่า PASS โดยไม่ตรวจจริง
