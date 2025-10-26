# 📦 File Export List - 4 ฟีเจอร์หลัก

รายการไฟล์ทั้งหมดที่เกี่ยวข้องกับ **4 ฟีเจอร์หลัก** เพื่อนำไปใช้กับโปรเจคอื่น

**สร้างเมื่อ:** 2025-10-23
**โปรเจค:** We-Warehouse Management System
**Backend:** Express + TypeScript + SQL Server
**Frontend:** React + Vite + TypeScript + shadcn/ui

---

## 📊 สรุปจำนวนไฟล์

| ฟีเจอร์ | Backend | Frontend | รวม |
|---------|---------|----------|-----|
| 💰 การเงิน | 6 | 2 | 8 |
| 📋 Stock Card | 6 | 2 | 8 |
| 🔄 ใบโอนย้าย | 6 | 1 | 7 |
| 📦 รายการแพค | 6 | 4 | 10 |
| 🔧 Core/Shared | 13 | - | 13 |
| **รวมทั้งหมด** | **24** | **9** | **46** |

---

## 🏢 BACKEND FILES (24 ไฟล์)

### 🔧 Core/Shared (13 ไฟล์) - ใช้ร่วมกันทุกฟีเจอร์

#### 1. Main Server
```
we-warehouse-backend/src/index.ts
```
Express server entry point พร้อม route configuration

#### 2. Database Configuration
```
we-warehouse-backend/src/config/database.ts
```
SQL Server connection pool, configuration, และ error handling

#### 3. Middleware (2 ไฟล์)
```
we-warehouse-backend/src/middleware/cors.ts
we-warehouse-backend/src/middleware/errorHandler.ts
```
CORS policy และ global error handling

#### 4. Services (1 ไฟล์)
```
we-warehouse-backend/src/services/sqlServerService.ts
```
⭐ **ไฟล์สำคัญที่สุด** - 604 บรรทัด
ประกอบด้วย:
- `fetchSalesOrders()` - ดึงข้อมูลใบขาย (การเงิน)
- `fetchSalesOrderById()` - รายละเอียดใบขาย
- `fetchSalesLineItems()` - รายการสินค้าในใบขาย
- `fetchPackingList()` - รายการแพคตาม TAXDATE
- `fetchStockCard()` - รายการ stock movements
- `fetchStockCardFilters()` - ตัวเลือก filters
- `fetchTransferDocuments()` - รายการใบโอนย้าย (CSStkMove)
- `getTableList()` - Debug: list database tables
- `getTableColumns()` - Debug: inspect table structure
- `checkTransferTable()` - Debug: check CSStkMove table

#### 5. TypeScript Types (2 ไฟล์)
```
we-warehouse-backend/src/types/sales.types.ts
we-warehouse-backend/src/types/stock.types.ts
```
Type definitions สำหรับ Sales และ Stock data

#### 6. Configuration Files (5 ไฟล์)
```
we-warehouse-backend/package.json
we-warehouse-backend/tsconfig.json
we-warehouse-backend/.env.example
we-warehouse-backend/.gitignore
we-warehouse-backend/README.md
```

---

### 💰 การเงิน (Finance Dashboard) - 6 ไฟล์

#### Backend Routes
```
we-warehouse-backend/src/routes/salesRoutes.ts
```
**API Endpoints:**
- `GET /api/sales` - รายการใบขายทั้งหมด
- `GET /api/sales/:docno` - รายละเอียดใบขาย
- `GET /api/sales/:docno/items` - รายการสินค้าในใบขาย

#### Backend Controller
```
we-warehouse-backend/src/controllers/salesController.ts
```
**Methods:**
- `getSalesOrders()` - จัดการ request/response ใบขาย
- `getSalesOrderById()` - ดึงรายละเอียดใบขายเดี่ยว
- `getSalesLineItems()` - ดึงรายการสินค้า

#### Database Tables Used
- `CSSALE` - Header ใบขาย
- `CSSALESUB` - รายการสินค้าในใบขาย

---

### 📋 Stock Card (บัตรสต็อก) - 6 ไฟล์

#### Backend Routes
```
we-warehouse-backend/src/routes/stockRoutes.ts
```
**API Endpoints:**
- `GET /api/stock/stock-card` - รายการ stock movements
- `GET /api/stock/stock-card/filters` - ตัวเลือก filters

#### Backend Controller
```
we-warehouse-backend/src/controllers/stockController.ts
```
**Methods:**
- `getStockCard()` - ดึงข้อมูล stock movements
- `getStockCardFilters()` - ดึงตัวเลือก filters (products, warehouses)
- `getTableList()` - Debug endpoint
- `getTableColumns()` - Debug endpoint
- `checkTransferTable()` - Debug endpoint

#### Database Tables Used
- `CSSTOCKCARD` - Stock movements (Purchase, Sales, Production)

---

### 🔄 ใบโอนย้าย (Transfer Documents) - 6 ไฟล์

#### Backend Routes
```
we-warehouse-backend/src/routes/stockRoutes.ts
```
**API Endpoints:**
- `GET /api/stock/transfers` - รายการใบโอนย้าย
- `GET /api/stock/debug/tables` - Debug: list tables
- `GET /api/stock/debug/table-columns/:tableName` - Debug: inspect columns
- `GET /api/stock/debug/transfer-table` - Debug: check CSStkMove

#### Backend Controller
```
we-warehouse-backend/src/controllers/stockController.ts
```
**Methods:**
- `getTransferDocuments()` - ดึงข้อมูลใบโอนย้าย (Join CSSTKMOVE + CSSTKMOVESUB)

#### Database Tables Used
- `CSSTKMOVE` - Header ใบโอนย้าย (3,091 documents)
- `CSSTKMOVESUB` - รายการสินค้าในใบโอนย้าย

---

### 📦 รายการแพค (Packing List) - 6 ไฟล์

#### Backend Routes
```
we-warehouse-backend/src/routes/salesRoutes.ts
```
**API Endpoints:**
- `GET /api/sales/packing-list?taxdate=YYYY-MM-DD` - รายการแพคตามวันส่ง
- `GET /api/sales/packing-list?arcode=XXX` - กรองตามลูกค้า
- `GET /api/sales/packing-list?productCode=XXX` - กรองตามสินค้า

#### Backend Controller
```
we-warehouse-backend/src/controllers/salesController.ts
```
**Methods:**
- `getPackingList()` - ดึงข้อมูลรายการแพค (Query CSSALE + CSSALESUB filtered by TAXDATE)

#### Database Tables Used
- `CSSALE` - Header ใบขาย (filtered by TAXDATE)
- `CSSALESUB` - รายการสินค้า

---

## 💻 FRONTEND FILES (9 ไฟล์)

### 💰 การเงิน (Finance Dashboard) - 2 ไฟล์

```
src/components/FinanceDashboard.tsx
src/hooks/useSalesData.ts
```

**FinanceDashboard.tsx** - หน้าแดชบอร์ดการเงิน
**Features:**
- แสดงสรุป sales statistics (ยอดขายวันนี้, เดือนนี้, growth rate)
- กราฟยอดขายรายวัน (Line chart with recharts)
- รายการใบขายพร้อม filters (วันที่, ลูกค้า, สถานะ)
- Modal รายละเอียดใบขาย (Header + Line items)
- ตารางลูกค้าที่ซื้อมากที่สุด (Top customers)

**useSalesData.ts** - React Query Hooks
**Functions:**
- `useSalesOrders()` - ดึงรายการใบขายทั้งหมด
- `useSalesOrderDetail()` - ดึงรายละเอียดใบขายเดี่ยว
- `useSalesStats()` - คำนวณ statistics
- `useDailySalesChart()` - ข้อมูลกราฟ
- `useTopCustomers()` - ลูกค้า top 10

---

### 📋 Stock Card (บัตรสต็อก) - 2 ไฟล์

```
src/components/StockCardTabNew.tsx
src/components/StockCardTab.tsx (backup)
```

**StockCardTabNew.tsx** - Stock Card UI (ปรับปรุงใหม่)
**Features:**
- แสดงรายการ stock movements (รับเข้า/ส่งออก)
- Multi-select filters:
  - 🏷️ รหัสสินค้า (Product Code)
  - 📦 คลัง (Warehouse)
  - 📅 ช่วงวันที่ (Date Range)
  - 📄 เลขที่เอกสาร (Document Number)
- กลุ่มข้อมูลตามเอกสาร (Group by DOCNO)
- แสดงรายละเอียดสินค้า:
  - ชื่อสินค้า, จำนวน, หน่วย
  - คลังต้นทาง/ปลายทาง
  - ตำแหน่ง (Location)
  - ยอดคงเหลือ (BALQTY)
- Summary cards:
  - 📝 จำนวนเอกสาร
  - 📦 จำนวนรายการ
  - ⚖️ ปริมาณรวม
  - 💰 มูลค่ารวม
- สี indicators:
  - 🟢 เขียว = รับเข้า (Purchase, Production)
  - 🔴 แดง = ส่งออก (Sales)
  - 🟣 ม่วง = โอนย้าย (Transfer)

**Props:**
- `documentTypeFilter?: 'transfer' | 'non-transfer' | undefined` - กรองประเภทเอกสาร
- `title?: string` - Custom title

---

### 🔄 ใบโอนย้าย (Transfer Documents) - 1 ไฟล์

```
src/components/TransferTab.tsx
```

**TransferTab.tsx** - Transfer Documents UI (367 บรรทัด)
**Features:**
- 🟣 Purple-themed UI (แยกจาก Stock Card)
- แสดงรายการใบโอนย้ายพร้อม FROM → TO warehouse flow
- Multi-select filters:
  - 🏷️ รหัสสินค้า (Product Code)
  - 📦 คลังต้นทาง (Warehouse FROM)
  - 📦 คลังปลายทาง (Warehouse TO)
  - 📅 ช่วงวันที่ (Date Range)
  - 📄 เลขที่เอกสาร (Document Number)
- กลุ่มข้อมูลตาม DOCNO
- แสดงรายละเอียดแต่ละรายการ:
  - FROM: Warehouse + Location (สีแดง 🔴)
  - TO: Warehouse + Location (สีเขียว 🟢)
  - สินค้า: Code, Name, Quantity, Unit
- Summary cards:
  - 📝 จำนวนเอกสารโอนย้าย
  - 📦 จำนวนรายการ
  - ⚖️ ปริมาณโอนย้ายรวม

**API Integration:**
```typescript
const SALES_API_BASE = import.meta.env.VITE_SALES_API_URL || '/api';

const { data } = useQuery({
  queryKey: ['transfers', queryParams],
  queryFn: () => fetchTransferDocuments(queryParams),
  staleTime: 30000
});
```

---

### 📦 รายการแพค (Packing List) - 4 ไฟล์

```
src/components/PackingListTab.tsx
src/components/picking/PickingPlanModal.tsx
src/utils/pickingAlgorithm.ts
src/hooks/useSalesOrders.ts
```

**PackingListTab.tsx** - Packing List UI
**Features:**
- แสดงรายการที่ต้องแพคตาม TAXDATE (วันส่งของ)
- Date picker สำหรับเลือกวันที่
- กลุ่มข้อมูลตามใบสั่งขาย (Group by DOCNO)
- แสดงรายละเอียด:
  - 📄 เลขที่เอกสาร (DOCNO)
  - 👤 ลูกค้า (ARNAME)
  - 📅 วันที่ส่งของ (TAXDATE)
  - 💰 มูลค่า (TOTALAMOUNT)
  - 📦 สินค้าในออเดอร์ (Product list)
- Summary cards:
  - 📦 จำนวนออเดอร์
  - 📋 จำนวนรายการสินค้า
  - ⚖️ ปริมาณรวม
- ปุ่ม "วางแผนแพค" เปิด PickingPlanModal

**PickingPlanModal.tsx** - Modal วางแผนการหยิบสินค้า
**Features:**
- เชื่อมกับ Supabase `inventory_items` table
- คำนวณตำแหน่งที่ต้องหยิบ (Using pickingAlgorithm)
- แสดง picking routes แยกตาม:
  - ✅ พร้อมหยิบ (สต็อกเพียงพอ)
  - ⚠️ สต็อกไม่พอ (แสดงยอดขาด)
  - ❌ ไม่มีในคลัง
- Checklist สำหรับติ๊กเมื่อหยิบแล้ว
- Progress bar แสดงความคืบหน้า
- ปุ่ม Print และ Download picking list

**pickingAlgorithm.ts** - Algorithm เลือกตำแหน่งหยิบสินค้า
**Functions:**
- `generateBulkPickingPlans()` - สร้างแผนแพคหลายออเดอร์พร้อมกัน
- `generatePickingPlan()` - สร้างแผนแพคแต่ละออเดอร์
- `allocateInventory()` - จัดสรรสต็อกจาก locations
- Logic: FIFO (First In First Out) - หยิบของเก่าก่อน

**useSalesOrders.ts** - Sales Orders Management Hook
**Functions:**
- Wrapper สำหรับ `useSalesData.ts`
- เพิ่ม caching และ error handling

---

## 🎨 UI COMPONENTS DEPENDENCIES (51 ไฟล์)

### shadcn/ui Components ที่ใช้

ทั้ง 4 ฟีเจอร์ใช้ shadcn/ui components ร่วมกัน:

```
src/components/ui/
├── accordion.tsx          # Collapse/expand sections
├── alert-dialog.tsx       # Confirmation dialogs
├── alert.tsx              # Alert messages
├── badge.tsx              # Status badges
├── button.tsx             # Buttons
├── calendar.tsx           # Date picker calendar
├── card.tsx               # Card containers
├── chart.tsx              # Chart wrapper (recharts)
├── checkbox.tsx           # Checkboxes
├── command.tsx            # Command palette
├── dialog.tsx             # Modal dialogs
├── dropdown-menu.tsx      # Dropdown menus
├── form.tsx               # Form wrapper (react-hook-form)
├── input.tsx              # Text inputs
├── label.tsx              # Form labels
├── multi-select.tsx       # Multi-select dropdown
├── popover.tsx            # Popover menus
├── progress.tsx           # Progress bars
├── select.tsx             # Select dropdowns
├── separator.tsx          # Dividers
├── skeleton.tsx           # Loading skeletons
├── table.tsx              # Tables
├── tabs.tsx               # Tab navigation
├── toast.tsx              # Toast notifications
├── toaster.tsx            # Toast container
└── tooltip.tsx            # Tooltips
```

**หมายเหตุ:** ไฟล์เหล่านี้เป็น standard shadcn/ui components
สามารถติดตั้งใหม่ได้โดยใช้ CLI:
```bash
npx shadcn@latest add [component-name]
```

---

## 📝 CONFIGURATION FILES (8 ไฟล์)

### Backend Configuration
```
we-warehouse-backend/.env.example
we-warehouse-backend/package.json
we-warehouse-backend/tsconfig.json
we-warehouse-backend/.gitignore
```

### Frontend Configuration
```
package.json
tsconfig.json
vite.config.ts
tailwind.config.ts
```

---

## 🔗 API Endpoints สรุป

### Sales & Packing APIs (salesRoutes.ts)
```
GET /api/sales                    # รายการใบขายทั้งหมด
GET /api/sales/:docno             # รายละเอียดใบขาย
GET /api/sales/:docno/items       # รายการสินค้าในใบขาย
GET /api/sales/packing-list       # รายการแพค (filter by TAXDATE)
```

### Stock & Transfer APIs (stockRoutes.ts)
```
GET /api/stock/stock-card         # รายการ stock movements
GET /api/stock/stock-card/filters # ตัวเลือก filters
GET /api/stock/transfers          # รายการใบโอนย้าย

# Debug endpoints
GET /api/stock/debug/tables                  # List database tables
GET /api/stock/debug/table-columns/:name     # Inspect table structure
GET /api/stock/debug/transfer-table          # Check CSStkMove table
```

---

## 🗄️ Database Tables สรุป

### JHCSMILE Database (SQL Server)

| Table | ใช้โดยฟีเจอร์ | จำนวนแถว (ประมาณ) |
|-------|--------------|-------------------|
| `CSSALE` | การเงิน, รายการแพค | ~3,944 |
| `CSSALESUB` | การเงิน, รายการแพค | ~20,000+ |
| `CSSTOCKCARD` | Stock Card | ~5,000 |
| `CSSTKMOVE` | ใบโอนย้าย | 3,091 |
| `CSSTKMOVESUB` | ใบโอนย้าย | ~10,000+ |

---

## 📦 Dependencies สรุป

### Backend Dependencies
```json
{
  "express": "^4.18.2",
  "mssql": "^10.0.2",
  "dotenv": "^16.4.5",
  "cors": "^2.8.5",
  "helmet": "^7.1.0",
  "typescript": "^5.3.3"
}
```

### Frontend Dependencies (ที่เกี่ยวข้อง)
```json
{
  "@tanstack/react-query": "^5.x",
  "react": "^18.x",
  "react-router-dom": "^6.x",
  "recharts": "^2.x",
  "lucide-react": "latest",
  "@radix-ui/*": "latest"
}
```

---

## ✅ Next Steps

1. ✅ ใช้ `export-features.sh` เพื่อ copy ไฟล์ทั้งหมด
2. ✅ อ่าน `FEATURES_SETUP_GUIDE.md` สำหรับการ setup
3. ✅ ตรวจสอบ environment variables (.env)
4. ✅ ทดสอบ API endpoints ทีละฟีเจอร์

---

**สร้างโดย:** Claude Code
**วันที่:** 2025-10-23
**โปรเจค:** We-Warehouse Management System
