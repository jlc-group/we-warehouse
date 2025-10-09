# คู่มือการใช้งาน External Sales Integration

## 🎯 ภาพรวม

ระบบ External Sales Integration เชื่อมต่อกับ **SQL Server External Database** เพื่อดึงข้อมูลเอกสารขายจากตาราง **CSSALE** และ **CSSALESUB** มาแสดงผลในระบบ we-warehouse

---

## 📋 สิ่งที่เพิ่มเข้ามา

### **1. Backend API Service** (`we-warehouse-backend/`)
- ✅ Node.js + Express.js server
- ✅ เชื่อมต่อกับ SQL Server ผ่าน `mssql` driver
- ✅ REST API endpoints สำหรับดึงข้อมูล CSSALE/CSSALESUB
- ✅ TypeScript types ครบถ้วน (140+ fields จาก CSSALE)
- ✅ Connection pooling และ retry logic
- ✅ CORS และ security middleware

**Endpoints:**
```
GET /api/sales                    - รายการเอกสารขาย (pagination + filters)
GET /api/sales/:docno             - รายละเอียดเอกสาร + รายการสินค้า
GET /api/sales/:docno/items       - รายการสินค้าของเอกสาร
GET /api/sales/summary            - สรุปยอดขาย (ต้องระบุ date_from, date_to)
GET /api/sales/top-products       - สินค้าขายดี
GET /api/customers/:arcode/sales  - เอกสารของลูกค้า
GET /health                       - Health check
```

### **2. Frontend Integration**
- ✅ **Service Layer:** `salesOrderService.ts` - API client
- ✅ **React Hooks:** `useExternalSalesOrders.ts` - React Query hooks
- ✅ **UI Components:**
  - `ExternalSalesTab.tsx` - หน้ารายการเอกสารขาย
  - `ExternalSalesDetailsModal.tsx` - Modal รายละเอียด + items
- ✅ **Dashboard Stats:** `PurchaseOrderStats.tsx` - สถิติ PO และ Fulfillment

### **3. UI Improvements ใน PO & จัดสินค้า**
- ✅ **Dashboard Cards** - แสดงสถิติ 8 ตัวชี้วัด:
  1. PO ทั้งหมด
  2. รอจัดสินค้า
  3. กำลังจัดสินค้า
  4. เสร็จสมบูรณ์วันนี้
  5. มูลค่ารวม
  6. กำลังจัดส่ง
  7. งานเร่งด่วน
  8. อัตราความสำเร็จ

- ✅ **External Sales Tab** - Tab ใหม่แสดงข้อมูลจาก CSSALE
- ✅ **Advanced Filters** - กรองตาม วันที่, ลูกค้า, สถานะ
- ✅ **Quick Filters** - วันนี้, สัปดาห์นี้, เดือนนี้
- ✅ **Summary Cards** - แสดงภาพรวม 4 ตัวชี้วัด
- ✅ **Pagination** - แบ่งหน้าข้อมูล 50 รายการ/หน้า

---

## 🚀 วิธีการใช้งาน

### **A. การรัน Backend Server**

1. **ติดตั้ง Dependencies:**
```bash
cd we-warehouse-backend
npm install
```

2. **ตั้งค่า Environment Variables:**

ไฟล์ `.env` ควรมีค่าดังนี้:
```env
# SQL Server Configuration
DB_SERVER=JHSERVER.DYNDNS.INFO\\SQLEXPRESS
DB_PORT=3306
DB_USER=readonly_user
DB_PASSWORD=vjkogmjkoyho
DB_DATABASE=JHCSMILE
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true

# API Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4173
```

3. **รัน Development Server:**
```bash
npm run dev
```

Server จะรันที่: **http://localhost:3001**

4. **ทดสอบการเชื่อมต่อ:**
```bash
# Health check
curl http://localhost:3001/health

# ดึงข้อมูลเอกสารขาย
curl "http://localhost:3001/api/sales?page=1&limit=10"
```

---

### **B. การรัน Frontend**

1. **ตรวจสอบ Environment Variable:**

ไฟล์ `.env` ต้องมี:
```env
VITE_SALES_API_URL=http://localhost:3001/api
```

2. **รัน Development Server:**
```bash
cd we-warehouse
npm run dev
```

Frontend จะรันที่: **http://localhost:5173**

3. **เข้าสู่ระบบและไปที่:**
```
Tab: "PO & จัดสินค้า"
  └─ Sub-tab: "ข้อมูลขาย (External)"
```

---

## 📊 ฟีเจอร์ที่มีใน External Sales Tab

### **1. Summary Cards**
แสดงภาพรวมข้อมูล:
- 📄 **เอกสารทั้งหมด** - จำนวนเอกสารขายที่แสดง
- 💰 **มูลค่ารวม** - ยอดรวม TOTALAMOUNT
- 👤 **ลูกค้า** - จำนวนลูกค้าทั้งหมด
- ✅ **ปิดแล้ว** - จำนวนเอกสารที่ปิดแล้ว (CLOSEFLAG='Y')

### **2. Filters (ตัวกรอง)**

**Search:**
- ค้นหาจาก: DOCNO, ARCODE, ARNAME

**Date Range:**
- วันที่เริ่มต้น - วันที่สิ้นสุด
- Quick filters: วันนี้, สัปดาห์นี้, เดือนนี้

**Status:**
- ทั้งหมด
- เปิดอยู่ (CLOSEFLAG='N')
- ปิดแล้ว (CLOSEFLAG='Y')

**Actions:**
- 🔄 รีเฟรช - โหลดข้อมูลใหม่
- 📥 Export Excel - Export ข้อมูลเป็น Excel (Coming soon)
- ❌ ล้างตัวกรอง - Reset filters ทั้งหมด

### **3. Sales Table**
แสดงข้อมูลเอกสารขาย:
- เลขที่เอกสาร (DOCNO)
- วันที่ (DOCDATE)
- ลูกค้า (ARCODE + ARNAME)
- ยอดรวม (SUMAMOUNT1)
- ส่วนลด (DISCAMOUNT + DISCAMOUNT2)
- ภาษี (TAXAMOUNT)
- สุทธิ (TOTALAMOUNT)
- สถานะ (Badge)
- Actions: 👁️ ดูรายละเอียด

### **4. Details Modal**
เมื่อคลิก "ดูรายละเอียด" จะแสดง:

**ข้อมูลเอกสาร:**
- เลขที่เอกสาร, ประเภท, วันที่
- เลขที่ใบกำกับภาษี
- สถานะ

**ข้อมูลลูกค้า:**
- รหัสลูกค้า, ชื่อลูกค้า
- ที่อยู่
- เลขประจำตัวผู้เสียภาษี

**สรุปยอดเงิน:**
- ยอดรวมก่อนส่วนลด
- ส่วนลดรวม
- ภาษีมูลค่าเพิ่ม (%)
- ยอดรวมสุทธิ
- ยอดหนี้ (ถ้ามี)

**รายการสินค้า (CSSALESUB):**
- รหัสสินค้า, ชื่อสินค้า
- จำนวน, หน่วย
- ราคา/หน่วย
- ส่วนลด
- ยอดรวม
- คลังสินค้า, ตำแหน่ง

**ข้อมูลเพิ่มเติม:**
- พนักงานขาย (SALECODE)
- แผนก (DEPARTMENT)
- โครงการ (PROJECT)
- หมายเหตุ (REMARK)

---

## 🔧 Troubleshooting

### **ปัญหาที่อาจพบ**

#### **1. Backend ไม่สามารถเชื่อมต่อ SQL Server**

**อาการ:**
```
❌ SQL Server connection failed
```

**สาเหตุ:**
- SQL Server อยู่ใน private network
- Firewall บล็อก port 3306
- ต้องใช้ VPN

**วิธีแก้:**
1. ตรวจสอบ network connectivity:
   ```bash
   ping JHSERVER.DYNDNS.INFO
   ```

2. ตรวจสอบ port ว่าเปิดอยู่:
   ```bash
   telnet JHSERVER.DYNDNS.INFO 3306
   ```

3. เชื่อมต่อ VPN (ถ้าจำเป็น)

4. ตรวจสอบ credentials ในไฟล์ `.env`

#### **2. Frontend ไม่สามารถเรียก API**

**อาการ:**
```
ไม่สามารถเชื่อมต่อกับฐานข้อมูลภายนอก
```

**วิธีแก้:**
1. ตรวจสอบว่า Backend รันอยู่:
   ```bash
   curl http://localhost:3001/health
   ```

2. ตรวจสอบ `VITE_SALES_API_URL` ใน `.env`:
   ```env
   VITE_SALES_API_URL=http://localhost:3001/api
   ```

3. Restart frontend development server:
   ```bash
   npm run dev
   ```

#### **3. CORS Error**

**อาการ:**
```
Access to fetch at 'http://localhost:3001/api/sales' from origin 'http://localhost:5173' has been blocked by CORS policy
```

**วิธีแก้:**
ตรวจสอบ `ALLOWED_ORIGINS` ใน backend `.env`:
```env
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4173
```

---

## 📈 Advanced Usage

### **การกรองข้อมูลด้วย API**

**ดึงเอกสารตามช่วงวันที่:**
```bash
curl "http://localhost:3001/api/sales?date_from=2025-01-01&date_to=2025-12-31"
```

**ดึงเอกสารของลูกค้าเฉพาะ:**
```bash
curl "http://localhost:3001/api/sales?arcode=C001"
```

**ดึงเอกสารที่ปิดแล้ว:**
```bash
curl "http://localhost:3001/api/sales?closeflag=Y"
```

**ดึงสรุปยอดขาย:**
```bash
curl "http://localhost:3001/api/sales/summary?date_from=2025-01-01&date_to=2025-12-31"
```

**ดึงสินค้าขายดี Top 10:**
```bash
curl "http://localhost:3001/api/sales/top-products?date_from=2025-01-01&date_to=2025-12-31&limit=10"
```

---

## 🎨 การปรับแต่ง UI

### **เปลี่ยนจำนวนรายการต่อหน้า**

แก้ไขที่ `ExternalSalesTab.tsx`:
```typescript
const [pageSize] = useState(50); // เปลี่ยนเป็น 100 หรือตามต้องการ
```

### **เปลี่ยนการเรียงลำดับ**

แก้ไขที่ `ExternalSalesTab.tsx`:
```typescript
sort_by: 'DOCDATE',  // เปลี่ยนเป็น 'DOCNO' หรือ 'TOTALAMOUNT'
order: 'DESC',       // เปลี่ยนเป็น 'ASC'
```

---

## 🚀 Deployment (Production)

### **1. Deploy Backend**

**แนะนำ:** Railway.app, Render.com, Fly.io

**ตั้งค่า Environment Variables:**
```env
DB_SERVER=JHSERVER.DYNDNS.INFO\\SQLEXPRESS
DB_PORT=3306
DB_USER=readonly_user
DB_PASSWORD=vjkogmjkoyho
DB_DATABASE=JHCSMILE
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true

PORT=3001
NODE_ENV=production
ALLOWED_ORIGINS=https://your-frontend-domain.com
```

### **2. Deploy Frontend**

แก้ไข `.env.production`:
```env
VITE_SALES_API_URL=https://your-backend-api.railway.app/api
```

Build และ deploy:
```bash
npm run build
# Deploy ไป Cloudflare Pages
```

---

## 📚 เอกสารเพิ่มเติม

- [Backend API Documentation](../we-warehouse-backend/README.md)
- [TypeScript Types](../we-warehouse-backend/src/types/sales.types.ts)
- [Service Layer](src/services/salesOrderService.ts)
- [React Hooks](src/hooks/useExternalSalesOrders.ts)

---

## ✅ Checklist

- [ ] Backend server รันได้และเชื่อมต่อ SQL Server สำเร็จ
- [ ] Frontend แสดง External Sales Tab
- [ ] สามารถดึงรายการเอกสารขายได้
- [ ] สามารถดูรายละเอียดเอกสาร + items ได้
- [ ] Filters ทำงานถูกต้อง (date range, status, search)
- [ ] Pagination ทำงานถูกต้อง
- [ ] Summary cards แสดงข้อมูลถูกต้อง
- [ ] Modal แสดงรายละเอียดครบถ้วน

---

## 📞 Support

หากพบปัญหาหรือต้องการความช่วยเหลือ:
1. ตรวจสอบ console logs (Browser DevTools + Terminal)
2. ตรวจสอบ network requests (Browser DevTools → Network tab)
3. ตรวจสอบ backend logs
4. ติดต่อทีม DevOps สำหรับ network/VPN issues

---

**สร้างโดย:** Claude Code
**วันที่:** 8 ตุลาคม 2025
**Version:** 1.0.0
