---
name: warehouse-agent
description: กฎการทำงานสำหรับ We-Warehouse project - ต้องอ่านก่อนทำงานทุกครั้ง
---

# We-Warehouse Agent Skill

## 🚨 ต้องอ่านก่อนทำงานทุกครั้ง

ก่อนทำงานใดๆ ให้อ่านไฟล์ต่อไปนี้ก่อนเสมอ:
1. `.agent/workflows/mandatory-rules.md` - กฎบังคับ
2. `.agent/error_log.md` - ดูความผิดพลาดที่เคยทำ

---

## 🛠️ Project Configuration

| รายการ | ค่า |
|--------|-----|
| Backend Port | 3004 (Standardized) |
| Frontend Port | 5178 (Standardized) |
| Database | MSSQL |
| Backend Path | `we-warehouse-backend/` |

---

## 📋 Workflows ที่ต้องรู้

| Workflow | Slash Command | ใช้เมื่อไหร่ |
|----------|---------------|-------------|
| mandatory-rules | `/mandatory-rules` | กฎบังคับทุกครั้ง |
| data-verification | `/data-verification` | ก่อนพูดว่า "เสร็จแล้ว" |
| start-backend | N/A (Scripts in package.json) | เปิด server |
| debug-slow-loading | `/debug-slow-loading` | หน้าค้าง/โหลดช้า |
| layout-standards | `/layout-standards` | แก้ UI/CSS |

---

## 🗄️ PostgreSQL Commands (บังคับ!)

> [!CAUTION]
> **ห้ามใช้ psql โดยตรง** เพราะจะค้างรอ password prompt ทำให้ terminal แฮงค์!

**✅ วิธีที่ถูกต้อง** - ต้องใช้ `$env:PGPASSWORD` เสมอ:
```powershell
$env:PGPASSWORD="postgres"; & "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d wewarehouse_local -c "SELECT * FROM table_name;"
```

**❌ ห้ามทำ** - จะค้างตลอด:
```powershell
psql -U postgres -d wewarehouse_local -c "..."
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d wewarehouse_local -c "..."
```

---

## ⚠️ สรุปกฎหลัก (ดูรายละเอียดใน mandatory-rules.md)

1. **ก่อนทำอะไร ต้องบอกก่อน** - ไม่ทำเงียบๆ
2. **ห้าม git revert/reset/checkout โดยไม่ถาม**
3. **ห้ามแก้ไข Deployment Config โดยไม่ถาม**
4. **ถ้าทำผิด** - กู้คืนทันทีและบันทึกลง `.agent/error_log.md`
5. **PostgreSQL** - ต้องใช้ `$env:PGPASSWORD` เสมอ ห้ามใช้ psql โดยตรง!
