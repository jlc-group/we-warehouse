# 🚀 Features Setup Guide - 4 ฟีเจอร์หลัก

คู่มือการติดตั้งและ setup ฟีเจอร์ทั้ง 4:
- 💰 **การเงิน** (Finance Dashboard)
- 📋 **Stock Card** (บัตรสต็อก)
- 🔄 **ใบโอนย้าย** (Transfer Documents)
- 📦 **รายการแพค** (Packing List)

**สร้างเมื่อ:** 2025-10-23
**โปรเจค:** We-Warehouse Management System

---

## 📑 Table of Contents

1. [Pre-requisites](#pre-requisites)
2. [Step 1: Export Files](#step-1-export-files)
3. [Step 2: Backend Setup](#step-2-backend-setup)
4. [Step 3: Frontend Setup](#step-3-frontend-setup)
5. [Step 4: Database Configuration](#step-4-database-configuration)
6. [Step 5: Testing](#step-5-testing)
7. [Troubleshooting](#troubleshooting)

---

## Pre-requisites

### ✅ Required Software

- **Node.js** >= 18.x
- **npm** >= 9.x (or **yarn** >= 1.22.x)
- **SQL Server** (MSSQL) access
- **Git** (recommended)

### ✅ Database Requirements

- SQL Server instance ที่มี database `JHCSMILE` (หรือชื่ออื่นที่คุณใช้)
- Tables ที่ต้องมี:
  - `CSSALE` - ใบขาย headers
  - `CSSALESUB` - ใบขาย line items
  - `CSSTOCKCARD` - Stock movements
  - `CSSTKMOVE` - Transfer headers
  - `CSSTKMOVESUB` - Transfer line items

### ✅ Network Requirements

- สามารถเชื่อมต่อ SQL Server ผ่าน network (ระบุ host:port)
- Firewall อนุญาต SQL Server port (default: 1433 หรือตามที่กำหนด)

---

## Step 1: Export Files

### 1.1 ใช้ Export Script

จาก source project (we-warehouse), รัน:

```bash
cd /path/to/we-warehouse
chmod +x export-features.sh
./export-features.sh ~/path/to/target-project
```

**ตัวอย่าง:**
```bash
./export-features.sh ~/Desktop/my-new-project
```

### 1.2 Manual Copy (ถ้าไม่ใช้ script)

ดูรายการไฟล์ทั้งหมดใน `FILE_EXPORT_LIST.md` แล้ว copy ด้วยมือ

---

## Step 2: Backend Setup

### 2.1 Navigate to Backend Folder

```bash
cd /path/to/target-project/we-warehouse-backend
```

### 2.2 Install Dependencies

```bash
npm install
```

**Dependencies ที่จะติดตั้ง:**
```json
{
  "express": "^4.18.2",
  "mssql": "^10.0.2",
  "dotenv": "^16.4.5",
  "cors": "^2.8.5",
  "helmet": "^7.1.0",
  "zod": "^3.22.4",
  "typescript": "^5.3.3",
  "tsx": "^4.7.0"
}
```

### 2.3 Configure Environment Variables

สร้างไฟล์ `.env` จาก `.env.example`:

```bash
cp .env.example .env
```

แก้ไขไฟล์ `.env`:

```env
# SQL Server Configuration
DB_SERVER=your-server.dyndns.info\SQLEXPRESS
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_DATABASE=JHCSMILE

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
```

**⚠️ สำคัญ:**
- `DB_SERVER`: ถ้ามี instance name (`\SQLEXPRESS`) ให้ใส่ตามด้วย
- `DB_PORT`: ระบุ port ที่ SQL Server ฟัง (อาจเป็น 1433, 3306, หรือ custom port)
- `CORS_ORIGIN`: URL ของ frontend (local dev: `http://localhost:5173`)

### 2.4 Test Database Connection

```bash
npm run dev
```

**Expected Output:**
```
🚀 Server running on port 3001
📍 Environment: development
🗄️  Database: JHCSMILE
🌐 API endpoints available at http://localhost:3001

🔌 Testing database connection...
✅ Connected to SQL Server database: JHCSMILE
✅ Database connection test successful
```

**ถ้าเจอ error:**
- ตรวจสอบ DB credentials
- ตรวจสอบ network/firewall
- ดู [Troubleshooting](#troubleshooting) section

### 2.5 Verify API Endpoints

เปิด browser หรือใช้ `curl`:

```bash
# Health check
curl http://localhost:3001/health

# Test Sales API
curl http://localhost:3001/api/sales

# Test Stock Card API
curl http://localhost:3001/api/stock/stock-card

# Test Transfer API
curl http://localhost:3001/api/stock/transfers

# Test Packing List API
curl "http://localhost:3001/api/sales/packing-list?taxdate=2025-10-23"
```

---

## Step 3: Frontend Setup

### 3.1 Navigate to Frontend Folder

```bash
cd /path/to/target-project
```

### 3.2 Install Dependencies

ถ้าเป็นโปรเจค React ที่มีอยู่แล้ว:

```bash
npm install
```

ถ้าเป็นโปรเจคใหม่ ต้องติดตั้ง dependencies ทั้งหมด:

```bash
npm install react react-dom react-router-dom
npm install @tanstack/react-query
npm install recharts
npm install lucide-react
npm install @radix-ui/react-accordion @radix-ui/react-dialog @radix-ui/react-tabs
npm install @radix-ui/react-select @radix-ui/react-popover @radix-ui/react-label
```

**shadcn/ui Components:**

ถ้าใช้ shadcn/ui ให้ติดตั้ง components ที่จำเป็น:

```bash
npx shadcn@latest init

# Install required components
npx shadcn@latest add button card table dialog tabs accordion
npx shadcn@latest add select input label badge progress toast
```

### 3.3 Configure API Base URL

สร้าง/แก้ไขไฟล์ `.env` ใน root ของ frontend:

```env
# Backend API URL
VITE_SALES_API_URL=http://localhost:3001/api

# หรือถ้า deploy บน production:
# VITE_SALES_API_URL=https://your-backend.render.com/api
```

**หมายเหตุ:**
- Vite ใช้ prefix `VITE_` สำหรับ environment variables
- Create React App (CRA) ใช้ prefix `REACT_APP_`

### 3.4 Import Components to Your App

แก้ไขไฟล์ `src/pages/Index.tsx` (หรือ main app file):

```tsx
import { FinanceDashboard } from '@/components/FinanceDashboard';
import { StockCardTabNew } from '@/components/StockCardTabNew';
import { TransferTab } from '@/components/TransferTab';
import { PackingListTab } from '@/components/PackingListTab';

export default function Index() {
  return (
    <Tabs defaultValue="finance">
      <TabsList>
        <TabsTrigger value="finance">💰 การเงิน</TabsTrigger>
        <TabsTrigger value="stock">📋 Stock Card</TabsTrigger>
        <TabsTrigger value="transfer">🔄 ใบโอนย้าย</TabsTrigger>
        <TabsTrigger value="packing">📦 รายการแพค</TabsTrigger>
      </TabsList>

      <TabsContent value="finance">
        <FinanceDashboard />
      </TabsContent>

      <TabsContent value="stock">
        <StockCardTabNew />
      </TabsContent>

      <TabsContent value="transfer">
        <TransferTab />
      </TabsContent>

      <TabsContent value="packing">
        <PackingListTab />
      </TabsContent>
    </Tabs>
  );
}
```

### 3.5 Setup React Query Provider

แก้ไขไฟล์ `src/main.tsx` (หรือ `src/App.tsx`):

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 วินาที
      gcTime: 5 * 60 * 1000, // 5 นาที
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app components */}
    </QueryClientProvider>
  );
}
```

### 3.6 Run Development Server

```bash
npm run dev
```

**Expected Output:**
```
VITE v5.x.x  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## Step 4: Database Configuration

### 4.1 Verify Database Tables Exist

เชื่อมต่อ SQL Server และตรวจสอบตาราง:

```sql
USE JHCSMILE;

-- Check if tables exist
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME IN ('CSSALE', 'CSSALESUB', 'CSSTOCKCARD', 'CSSTKMOVE', 'CSSTKMOVESUB');

-- Check row counts
SELECT 'CSSALE' as TableName, COUNT(*) as RowCount FROM CSSALE
UNION ALL
SELECT 'CSSALESUB', COUNT(*) FROM CSSALESUB
UNION ALL
SELECT 'CSSTOCKCARD', COUNT(*) FROM CSSTOCKCARD
UNION ALL
SELECT 'CSSTKMOVE', COUNT(*) FROM CSSTKMOVE
UNION ALL
SELECT 'CSSTKMOVESUB', COUNT(*) FROM CSSTKMOVESUB;
```

### 4.2 Sample Data Queries

#### การเงิน (Finance) - CSSALE
```sql
SELECT TOP 10
  DOCNO, DOCDATE, ARCODE, ARNAME, TOTALAMOUNT
FROM CSSALE
ORDER BY DOCDATE DESC;
```

#### Stock Card - CSSTOCKCARD
```sql
SELECT TOP 10
  DOCNO, DOCDATE, PRODUCTCODE, PRODUCTNAME,
  WAREHOUSE, LOCATION, QTY, BALQTY, TRANSTYPE
FROM CSSTOCKCARD
ORDER BY DOCDATE DESC;
```

#### Transfer - CSSTKMOVE
```sql
SELECT TOP 10
  m.DOCNO, m.DOCDATE, m.WAREHOUSE as FROM_WH, m.WAREHOUSEIN as TO_WH,
  s.PRODUCTCODE, s.QUANTITY
FROM CSSTKMOVE m
LEFT JOIN CSSTKMOVESUB s ON m.DOCNO = s.DOCNO
ORDER BY m.DOCDATE DESC;
```

#### Packing List - CSSALE (filtered by TAXDATE)
```sql
SELECT
  DOCNO, DOCDATE, TAXDATE, ARCODE, ARNAME, TOTALAMOUNT
FROM CSSALE
WHERE TAXDATE = '2025-10-23'  -- วันส่งของวันนี้
ORDER BY ARNAME;
```

---

## Step 5: Testing

### 5.1 Test Backend APIs

#### Test 1: Health Check
```bash
curl http://localhost:3001/health
```
**Expected:** `{"success": true, "message": "Backend is healthy"}`

#### Test 2: Finance API
```bash
curl "http://localhost:3001/api/sales?limit=5"
```
**Expected:** JSON array ของใบขาย 5 ใบ

#### Test 3: Stock Card API
```bash
curl "http://localhost:3001/api/stock/stock-card?limit=5"
```
**Expected:** JSON array ของ stock movements 5 รายการ

#### Test 4: Transfer API
```bash
curl "http://localhost:3001/api/stock/transfers?limit=5"
```
**Expected:** JSON array ของใบโอนย้าย 5 ใบ

#### Test 5: Packing List API
```bash
curl "http://localhost:3001/api/sales/packing-list?taxdate=2025-10-23"
```
**Expected:** JSON array ของรายการที่ต้องแพควันนี้

### 5.2 Test Frontend Components

เปิด browser ไปที่ `http://localhost:5173`

#### ✅ Finance Dashboard Test
1. คลิกแท็บ "💰 การเงิน"
2. ตรวจสอบ:
   - [ ] แสดง Summary cards (ยอดขายวันนี้, เดือนนี้, growth)
   - [ ] แสดงกราฟยอดขาย
   - [ ] แสดงตารางรายการใบขาย
   - [ ] คลิกใบขายแล้วเห็น Modal รายละเอียด

#### ✅ Stock Card Test
1. คลิกแท็บ "📋 Stock Card"
2. ตรวจสอบ:
   - [ ] แสดง Summary cards (จำนวนเอกสาร, รายการ, ปริมาณ)
   - [ ] Filters ทำงาน (Product, Warehouse, Date Range)
   - [ ] แสดงรายการ stock movements กลุ่มตาม DOCNO
   - [ ] สีสัน indicators ถูกต้อง (เขียว=รับ, แดง=ส่ง)

#### ✅ Transfer Test
1. คลิกแท็บ "🔄 ใบโอนย้าย"
2. ตรวจสอบ:
   - [ ] แสดง Summary cards (ใบโอนย้าย, รายการ, ปริมาณ)
   - [ ] Filters ทำงาน (Product, FROM/TO Warehouse, Date)
   - [ ] แสดง FROM → TO warehouse flow ชัดเจน
   - [ ] สีสัน FROM (แดง) และ TO (เขียว) ถูกต้อง

#### ✅ Packing List Test
1. คลิกแท็บ "📦 รายการแพค"
2. ตรวจสอบ:
   - [ ] Date picker ทำงาน (เลือกวันส่งของ)
   - [ ] แสดง Summary cards (ออเดอร์, รายการ, ปริมาณ)
   - [ ] แสดงรายการกลุ่มตามใบสั่งขาย
   - [ ] คลิก "วางแผนแพค" เปิด Modal
   - [ ] Modal แสดง picking locations จาก inventory

### 5.3 Test API Filters

#### Finance Filters
```bash
# Filter by date range
curl "http://localhost:3001/api/sales?startDate=2025-10-01&endDate=2025-10-31"

# Filter by customer
curl "http://localhost:3001/api/sales?arcode=C001"
```

#### Stock Card Filters
```bash
# Filter by product
curl "http://localhost:3001/api/stock/stock-card?productCode=L3-8G"

# Filter by warehouse
curl "http://localhost:3001/api/stock/stock-card?warehouse=WH01"

# Filter by date range
curl "http://localhost:3001/api/stock/stock-card?from=2025-10-01&to=2025-10-31"
```

#### Transfer Filters
```bash
# Filter by product
curl "http://localhost:3001/api/stock/transfers?productCode=L3-8G"

# Filter by warehouse
curl "http://localhost:3001/api/stock/transfers?warehouse=WH01"
```

#### Packing List Filters
```bash
# Filter by specific date
curl "http://localhost:3001/api/sales/packing-list?taxdate=2025-10-23"

# Filter by customer
curl "http://localhost:3001/api/sales/packing-list?arcode=C001&taxdate=2025-10-23"
```

---

## Troubleshooting

### ❌ Backend Connection Errors

#### Error: "ConnectionError: Failed to connect to database"

**Possible Causes:**
1. Incorrect DB credentials
2. SQL Server not running
3. Firewall blocking connection
4. Wrong host/port

**Solutions:**
```bash
# 1. Test SQL Server connectivity
telnet your-server.com 1433

# 2. Check if SQL Server is listening
netstat -an | grep 1433

# 3. Verify credentials with SQL client
sqlcmd -S your-server.com -U username -P password

# 4. Check firewall rules
# Windows: Allow port 1433 in Windows Firewall
# Linux: sudo ufw allow 1433
```

#### Error: "Login failed for user"

**Solution:**
- ตรวจสอบ username/password ใน `.env`
- ตรวจสอบว่า user มีสิทธิ์เข้า database
- ลอง connect ด้วย SQL client (SSMS, Azure Data Studio)

#### Error: "Database 'JHCSMILE' does not exist"

**Solution:**
- ตรวจสอบชื่อ database ใน `.env`
- List databases ที่มี:
```sql
SELECT name FROM sys.databases;
```

---

### ❌ Frontend Errors

#### Error: "Failed to fetch" / Network Error

**Possible Causes:**
1. Backend ไม่ได้รัน
2. CORS error
3. Wrong API URL

**Solutions:**
```bash
# 1. Check if backend is running
curl http://localhost:3001/health

# 2. Check CORS settings in backend/.env
CORS_ORIGIN=http://localhost:5173

# 3. Check VITE_SALES_API_URL in frontend/.env
VITE_SALES_API_URL=http://localhost:3001/api
```

#### Error: "Module not found: @/components/..."

**Solution:**
- ตรวจสอบว่ามี path alias `@` ใน `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

- และใน `vite.config.ts`:
```typescript
import path from 'path';

export default {
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
};
```

#### Error: shadcn/ui components not found

**Solution:**
```bash
# Install missing components
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add table
# ... etc
```

---

### ❌ Data Issues

#### No data returned from APIs

**Debug Steps:**

1. **Check if tables have data:**
```sql
SELECT COUNT(*) FROM CSSALE;
SELECT COUNT(*) FROM CSSTOCKCARD;
SELECT COUNT(*) FROM CSSTKMOVE;
```

2. **Check date filters:**
```bash
# Backend may filter by date, check your date format
curl "http://localhost:3001/api/sales?startDate=2011-01-01&endDate=2025-12-31"
```

3. **Use debug endpoints:**
```bash
# List all tables
curl http://localhost:3001/api/stock/debug/tables

# Check table columns
curl http://localhost:3001/api/stock/debug/table-columns/CSSALE
```

#### Transfer documents not showing

**Solution:**
- Transfer data อยู่ใน `CSSTKMOVE` และ `CSSTKMOVESUB` ไม่ใช่ `CSSTOCKCARD`
- ตรวจสอบว่าตารางเหล่านี้มีอยู่:
```bash
curl http://localhost:3001/api/stock/debug/transfer-table
```

---

### ❌ Performance Issues

#### Slow API responses

**Solutions:**

1. **Add indexes to database:**
```sql
-- Index for CSSALE
CREATE INDEX IX_CSSALE_DOCDATE ON CSSALE(DOCDATE);
CREATE INDEX IX_CSSALE_ARCODE ON CSSALE(ARCODE);

-- Index for CSSTOCKCARD
CREATE INDEX IX_CSSTOCKCARD_DOCDATE ON CSSTOCKCARD(DOCDATE);
CREATE INDEX IX_CSSTOCKCARD_PRODUCTCODE ON CSSTOCKCARD(PRODUCTCODE);

-- Index for CSSTKMOVE
CREATE INDEX IX_CSSTKMOVE_DOCDATE ON CSSTKMOVE(DOCDATE);
```

2. **Limit query results:**
```bash
# Add limit parameter
curl "http://localhost:3001/api/sales?limit=100"
```

3. **Use date range filters:**
```bash
# Filter recent data only
curl "http://localhost:3001/api/sales?startDate=2025-01-01"
```

---

## 📝 Deployment Checklist

### Backend Deployment (e.g., Render, Railway, Heroku)

- [ ] Set environment variables (DB_SERVER, DB_USER, etc.)
- [ ] Configure CORS_ORIGIN to frontend URL
- [ ] Test database connectivity from deployment server
- [ ] Verify all API endpoints work
- [ ] Set NODE_ENV=production

### Frontend Deployment (e.g., Vercel, Netlify, Cloudflare Pages)

- [ ] Set VITE_SALES_API_URL to production backend URL
- [ ] Build project: `npm run build`
- [ ] Test production build: `npm run preview`
- [ ] Verify all API calls use production URL
- [ ] Deploy to hosting platform

---

## 🎯 Next Steps

1. ✅ Customize UI colors/themes to match your brand
2. ✅ Add authentication/authorization if needed
3. ✅ Add more filters/features as required
4. ✅ Setup monitoring/logging (e.g., Sentry)
5. ✅ Add unit tests for critical functions
6. ✅ Setup CI/CD pipeline

---

## 📚 Resources

### Documentation
- [Express.js](https://expressjs.com/)
- [MSSQL npm package](https://www.npmjs.com/package/mssql)
- [React Query](https://tanstack.com/query/latest)
- [shadcn/ui](https://ui.shadcn.com/)
- [Vite](https://vitejs.dev/)

### SQL Server Tools
- [Azure Data Studio](https://azure.microsoft.com/en-us/products/data-studio/)
- [SQL Server Management Studio (SSMS)](https://learn.microsoft.com/en-us/sql/ssms/)

---

## 💬 Support

หากพบปัญหาหรือต้องการความช่วยเหลือ:

1. ตรวจสอบ [Troubleshooting](#troubleshooting) section
2. ดู `FILE_EXPORT_LIST.md` สำหรับรายละเอียดไฟล์
3. ตรวจสอบ API endpoints ด้วย curl/Postman
4. ดู console logs (Backend: terminal, Frontend: browser DevTools)

---

**สร้างโดย:** Claude Code
**วันที่:** 2025-10-23
**Version:** 1.0.0
**โปรเจค:** We-Warehouse Management System

---

## ✅ Final Checklist

### Backend Setup
- [ ] Installed dependencies (`npm install`)
- [ ] Created `.env` file with correct credentials
- [ ] Backend starts successfully (`npm run dev`)
- [ ] Health check works (`/health`)
- [ ] All 4 API routes return data

### Frontend Setup
- [ ] Installed dependencies (`npm install`)
- [ ] Created `.env` with `VITE_SALES_API_URL`
- [ ] Frontend starts successfully (`npm run dev`)
- [ ] React Query Provider configured
- [ ] All 4 components imported and working

### Testing
- [ ] Finance Dashboard displays sales data
- [ ] Stock Card shows movements with filters
- [ ] Transfer shows FROM → TO flow correctly
- [ ] Packing List shows orders by TAXDATE
- [ ] All filters work correctly

### Ready for Production
- [ ] Backend deployed with environment variables
- [ ] Frontend deployed with production API URL
- [ ] All features tested on production
- [ ] Monitoring/logging setup (optional)

**🎉 Congratulations! คุณ setup ครบทั้ง 4 ฟีเจอร์แล้ว!**
