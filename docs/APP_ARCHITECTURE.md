# We-Warehouse - สถาปัตยกรรมระบบและ Flow การทำงาน

> **วัตถุประสงค์หลัก:** ระบบจัดการคลังสินค้า (WMS) ของ JLC Group ที่ครอบคลุมตั้งแต่การรับสินค้า จัดเก็บ หยิบ แพค จัดส่ง และติดตามเงิน

---

## 🏗️ ภาพรวมสถาปัตยกรรม

```mermaid
graph TB
    subgraph "Frontend (Vite + React)"
        WEB["💻 Web Dashboard<br/>Admin / Manager"]
        MOB["📱 Mobile Pages<br/>พนักงานคลัง"]
    end

    subgraph "Backend (Express.js)"
        API["🔌 REST API<br/>Port 3004"]
        SYNC["🔄 Sync Services<br/>SchedulerService"]
    end

    subgraph "Databases"
        PG["🐘 Local PostgreSQL<br/>wewarehouse_local<br/>(ข้อมูลหลัก)"]
        MSSQL["🗄️ SQL Server<br/>JHCSMILE<br/>(ข้อมูลบัญชี)"]
        SUPA["☁️ Supabase Cloud<br/>(backup/legacy)"]
    end

    subgraph "External"
        CF["☁️ Cloudflare Tunnel<br/>warehouse-api.wejlc.com"]
        JLC["🏭 JLC API<br/>PO / Invoice"]
    end

    WEB --> API
    MOB --> API
    API --> PG
    API --> MSSQL
    SYNC --> JLC
    SYNC --> MSSQL
    SYNC --> PG
    CF --> API
    WEB -.->|"proxy เมื่อ USE_LOCAL_DB=true"| PG
```

---

## 📦 Flow 1: การรับสินค้าเข้าคลัง (Inbound)

```mermaid
flowchart LR
    A["🏭 สั่งซื้อสินค้า<br/>(Purchase Order)"] --> B["📋 PO Sync<br/>จาก JLC API"]
    B --> C["📥 รับสินค้า<br/>(Inbound Receipt)"]
    C --> D["📍 ระบุตำแหน่ง<br/>Location (A1/1, B2/3)"]
    D --> E["✅ บันทึก<br/>inventory_items"]
    E --> F["📊 อัพเดท Stock"]

    style A fill:#e3f2fd
    style C fill:#fff3e0
    style E fill:#e8f5e9
```

### ไฟล์ที่เกี่ยวข้อง:

| Layer | ไฟล์ | หน้าที่ |
|-------|------|---------|
| **Page** | `MobileReceive.tsx` | หน้าจอรับสินค้า (มือถือ) |
| **Component** | `InboundReceiptModal.tsx` | Modal กรอกข้อมูลรับ |
| **Hook** | `useInboundReceipts.ts` | จัดการ state รับสินค้า |
| **Service** | `inboundReceiptService.ts` | Logic การรับ + บันทึก inventory |
| **Service** | `purchaseOrderService.ts` | จัดการ PO |
| **Backend** | `poSyncService.ts` | Sync PO จาก JLC API |
| **DB Table** | `purchase_orders`, `inbound_receipts`, `inventory_items` | ข้อมูล |

---

## 📍 Flow 2: จัดเก็บและจัดการตำแหน่ง (Location Management)

```mermaid
flowchart LR
    A["🏗️ สร้าง Location<br/>(A1/1 → Z99/9)"] --> B["📦 จัดสินค้าลง Bin<br/>ระบุ SKU + จำนวน"]
    B --> C["🔍 ค้นหาตำแหน่ง<br/>QR Scan / Search"]
    C --> D["🔄 ย้ายสินค้า<br/>ระหว่าง Location"]
    D --> E["📊 Shelf Grid<br/>แสดงสถานะ Bin"]

    style A fill:#f3e5f5
    style C fill:#e8eaf6
    style E fill:#fce4ec
```

### ไฟล์ที่เกี่ยวข้อง:

| Layer | ไฟล์ | หน้าที่ |
|-------|------|---------|
| **Page** | `LocationDetail.tsx` | รายละเอียดตำแหน่ง |
| **Page** | `LocationLookup.tsx` (mobile) | ค้นหาตำแหน่ง |
| **Component** | `ShelfGrid.tsx` | แผนผัง Shelf แบบ Grid |
| **Component** | `LocationQRModal.tsx` | QR Code ของตำแหน่ง |
| **Component** | `ItemMove.tsx` (mobile) | ย้ายสินค้าระหว่าง Bin |
| **Service** | `locationActivityService.ts` | บันทึกกิจกรรมตำแหน่ง |
| **Service** | `locationQRService.ts` | สร้าง/อ่าน QR |
| **DB Table** | `warehouse_locations`, `inventory_items` | ข้อมูล |

---

## 🛒 Flow 3: ขาย & ออเดอร์ (Sales & Orders)

```mermaid
flowchart LR
    A["🛒 ลูกค้าสั่งซื้อ<br/>(Sales Order)"] --> B["📋 สร้าง Packing List<br/>รายการสินค้าที่ต้องแพค"]
    B --> C["📊 ส่งไป<br/>Fulfillment Queue"]
    C --> D["🔄 Sync Invoice<br/>จาก JHCSMILE"]

    style A fill:#e3f2fd
    style B fill:#fff9c4
    style C fill:#e8f5e9
```

### ไฟล์ที่เกี่ยวข้อง:

| Layer | ไฟล์ | หน้าที่ |
|-------|------|---------|
| **Component** | `SalesTab.tsx` | แท็บยอดขาย |
| **Component** | `OrdersTab.tsx` | แท็บออเดอร์ |
| **Component** | `PackingListTab.tsx` | Packing List |
| **Component** | `SalesOrderModal.tsx` | สร้าง/แก้ไขออเดอร์ |
| **Hook** | `useSalesOrders.ts` | จัดการ state ออเดอร์ |
| **Service** | `salesBillService.ts` | ดึง/จัดการบิลขาย |
| **Service** | `salesOrderService.ts` | Logic ออเดอร์ |
| **Backend** | `salesRoutes.ts` | API ยอดขาย |
| **Backend** | `shipmentSyncService.ts` | Sync invoice จาก JHCSMILE |
| **DB Table** | `customer_orders`, `order_items`, `shipment_orders` | ข้อมูล |

---

## 📋 Flow 4: กระจายงาน → หยิบ → แพค → ส่ง (Pick/Pack/Ship)

> **นี่คือ Flow หลักของระบบคลัง**

```mermaid
flowchart TB
    A["📋 Admin กระจายงาน<br/>(TaskAssignment)"] -->|"เลือก Orders + พนักงาน"| B["👤 Assign ให้ Worker"]
    B --> C["📱 Worker เห็นงาน<br/>(MyTasks)"]
    C --> D["📍 คำนวณเส้นทางหยิบ<br/>(Picking Algorithm FEFO)"]
    D --> E["🚶 หยิบสินค้าตาม Route<br/>(MobilePick)"]
    E --> F["✅ ยืนยันหยิบเสร็จ<br/>(Mark as Picked)"]
    F --> G["📦 แพคสินค้า<br/>(Mark as Packed)"]
    G --> H["🚚 จัดส่ง<br/>(Mark as Shipped)"]
    H --> I["✔️ ยืนยันรับ<br/>(Confirmed)"]

    style A fill:#e3f2fd
    style D fill:#fff3e0
    style E fill:#e8f5e9
    style G fill:#f3e5f5
    style H fill:#fce4ec
```

### สถานะของ Order:

```
pending → assigned → picking → picked → packed → shipped → confirmed
```

### ไฟล์ที่เกี่ยวข้อง:

| Layer | ไฟล์ | หน้าที่ |
|-------|------|---------|
| **Page** | `TaskAssignment.tsx` | Admin กระจายงาน |
| **Page** | `MyTasks.tsx` (mobile) | งานของ Worker |
| **Page** | `MobilePick.tsx` (mobile) | หน้าหยิบสินค้า |
| **Page** | `LocationTasks.tsx` (mobile) | งานตามตำแหน่ง |
| **Component** | `WarehousePickingSystem.tsx` | ระบบ Picking |
| **Component** | `FulfillmentQueue.tsx` | คิวจัดส่ง |
| **Algorithm** | `pickingAlgorithm.ts` | คำนวณ Picking Plan (FEFO) |
| **Service** | `warehouseAssignmentService.ts` | Assign/Track งาน |
| **Service** | `fulfillmentService.ts` | Logic จัดส่ง |
| **Backend** | `ShipmentService.ts` | CRUD สถานะการส่ง |
| **Backend** | `shipmentRoutes.ts` | API กระจายงาน/สถานะ |
| **DB Table** | `shipment_orders`, `warehouse_assignments` | ข้อมูล |

### Picking Algorithm (FEFO):
```
1. รับรายการสินค้าที่ต้องหยิบ (ProductNeed)
2. ค้นหา inventory ที่มี SKU ตรง
3. เรียงตาม FEFO (First Expired First Out) - MFD เก่าก่อน
4. คำนวณจำนวนที่ต้องหยิบจากแต่ละ Location
5. สร้าง Picking Route เรียงตาม Zone → Position → Level
```

---

## 💰 Flow 5: การเงิน & บัญชี (Finance)

```mermaid
flowchart LR
    A["📊 ยอดขาย<br/>(Sales Data)"] --> B["💵 ติดตามชำระเงิน<br/>(Bill Clearing)"]
    B --> C["📈 สรุปรายได้<br/>(Finance Dashboard)"]
    C --> D["🧮 บัญชี<br/>(Accounting)"]

    style A fill:#e3f2fd
    style B fill:#fff9c4
    style D fill:#e8f5e9
```

### ไฟล์ที่เกี่ยวข้อง:

| Layer | ไฟล์ | หน้าที่ |
|-------|------|---------|
| **Component** | `FinanceDashboard.tsx` | Dashboard การเงิน |
| **Component** | `AccountingDashboard.tsx` | Dashboard บัญชี |
| **Component** | `BillClearingModal.tsx` | เคลียร์บิล |
| **Hook** | `useBillClearing.ts` | จัดการ state บิล |
| **Hook** | `usePaymentTracking.ts` | ติดตามชำระเงิน |
| **Service** | `accountingService.ts` | Logic บัญชี |
| **Backend** | `csmileService.ts` | ดึงข้อมูลจาก CSMILE |
| **Backend** | `csmileRoutes.ts` | API ข้อมูล CSMILE |

---

## 📊 Flow 6: สินค้า & Stock Overview

```mermaid
flowchart LR
    A["📦 Product Master<br/>(รายการสินค้า)"] --> B["📐 Unit Conversion<br/>(แปลงหน่วย)"]
    B --> C["📊 Stock Overview<br/>(สรุป Stock ทั้งหมด)"]
    C --> D["⚠️ แจ้งเตือน<br/>(Stock ต่ำ/หมด)"]
    D --> E["📈 Forecast<br/>(พยากรณ์ยอด)"]

    style A fill:#e8eaf6
    style C fill:#e8f5e9
    style D fill:#fff3e0
```

### ไฟล์ที่เกี่ยวข้อง:

| Layer | ไฟล์ | หน้าที่ |
|-------|------|---------|
| **Component** | `ProductGroupOverview.tsx` | ภาพรวมสินค้ากลุ่ม |
| **Component** | `StockSummaryDashboard.tsx` | Dashboard สรุป Stock |
| **Component** | `ProductForecastPrediction.tsx` | พยากรณ์สินค้า |
| **Component** | `UnitConversionSettings.tsx` | ตั้งค่าแปลงหน่วย |
| **Hook** | `useProductsSummary.ts` | สรุปสินค้า |
| **Hook** | `useInventoryAlerts.ts` | แจ้งเตือน Stock |
| **Hook** | `useConversionRates.ts` | อัตราแปลงหน่วย |
| **Service** | `productConversionService.ts` | Logic แปลงหน่วย |
| **DB Table** | `products`, `inventory_items`, `unit_conversions` | ข้อมูล |

---

## 🔄 Flow 7: การย้ายสินค้าระหว่างคลัง (Warehouse Transfer)

```mermaid
flowchart LR
    A["📦 คลังต้นทาง"] -->|"สร้าง Transfer Request"| B["📋 อนุมัติ"]
    B -->|"หยิบ + ส่ง"| C["🚚 ขนย้าย"]
    C -->|"รับ + ยืนยัน"| D["📦 คลังปลายทาง"]

    style A fill:#e3f2fd
    style D fill:#e8f5e9
```

### ไฟล์ที่เกี่ยวข้อง:

| Layer | ไฟล์ | หน้าที่ |
|-------|------|---------|
| **Component** | `WarehouseTransferDashboard.tsx` | Dashboard โอนย้าย |
| **Component** | `InterWarehouseTransferModal.tsx` | Modal โอนระหว่างคลัง |
| **Component** | `BulkTransferModal.tsx` | โอนหลายรายการ |
| **Hook** | `useWarehouseTransfer.ts` | จัดการ state โอน |
| **Service** | `transferService.ts` | Logic การโอน |
| **DB Table** | `warehouse_transfers`, `inventory_movements` | ข้อมูล |

---

## 🏭 Flow 8: Sync ข้อมูลกับระบบภายนอก

```mermaid
flowchart TB
    subgraph "ทุก 6 ชม. (Scheduler)"
        S1["📥 Sync PO<br/>JLC API → local PG"]
        S2["📥 Sync Invoice<br/>JHCSMILE → shipment_orders"]
    end

    subgraph "Manual"
        S3["📥 Sync Supabase<br/>Cloud → local PG"]
    end

    S1 --> PG["🐘 Local PostgreSQL"]
    S2 --> PG
    S3 --> PG

    style PG fill:#e8f5e9
```

### ไฟล์ที่เกี่ยวข้อง:

| ไฟล์ | หน้าที่ |
|------|---------|
| `schedulerService.ts` | ตั้งเวลา sync ทุก 6 ชม. |
| `poSyncService.ts` | Sync PO จาก JLC API |
| `shipmentSyncService.ts` | Sync invoice จาก JHCSMILE (SQL Server) |
| `sqlServerService.ts` | Query ข้อมูลจาก JHCSMILE |
| `sync_supabase_to_local.cjs` | Script sync จาก Supabase Cloud |

---

## 👥 ผู้ใช้งานระบบ

```mermaid
flowchart TB
    subgraph "Admin / Manager"
        A1["📊 Dashboard รวม"]
        A2["📋 กระจายงาน"]
        A3["💰 การเงิน"]
        A4["📦 จัดการสินค้า"]
        A5["📍 จัดการตำแหน่ง"]
    end

    subgraph "พนักงานคลัง (Mobile)"
        W1["📱 รับงาน (MyTasks)"]
        W2["📱 หยิบสินค้า (MobilePick)"]
        W3["📱 รับสินค้า (MobileReceive)"]
        W4["📱 นับ Stock (MobileCount)"]
        W5["📱 ย้ายสินค้า (ItemMove)"]
    end

    A2 -->|"Assign Order"| W1
    W1 -->|"เริ่มหยิบ"| W2
```

---

## 🗄️ Database Schema (ตารางหลัก)

| Table | คำอธิบาย | Records |
|-------|----------|---------|
| `products` | สินค้าทั้งหมด | ~428 |
| `inventory_items` | สินค้าในคลัง (ระบุตำแหน่ง, จำนวน, lot) | ~1,198 |
| `inventory_movements` | ประวัติเคลื่อนย้ายสินค้า | ~270 |
| `warehouse_locations` | ตำแหน่งในคลัง (A1/1 - Z99/9) | ~1,111 |
| `customer_orders` | ออเดอร์ลูกค้า | ~7 |
| `order_items` | รายการสินค้าในออเดอร์ | ~7 |
| `shipment_orders` | สถานะจัดส่ง (sync จาก JHCSMILE) | dynamic |
| `purchase_orders` | ใบสั่งซื้อ (sync จาก JLC API) | dynamic |
| `users` | ผู้ใช้งาน | ~10 |
| `unit_conversions` | อัตราแปลงหน่วย | dynamic |

---

## 🌐 Network & Deployment

```mermaid
flowchart LR
    subgraph "Server (เครื่องนี้)"
        FE["Frontend<br/>:5173"]
        BE["Backend<br/>:3004"]
        PG["PostgreSQL<br/>:5432"]
        MSSQL["SQL Server<br/>:1433"]
    end

    subgraph "Cloudflare Tunnel"
        T1["warehouse-api.wejlc.com<br/>→ localhost:3004"]
        T2["postgres-db.wejlc.com<br/>→ localhost:5432"]
    end

    subgraph "Developer (ที่อื่น)"
        DEV["Dev Machine<br/>cloudflared access tcp<br/>localhost:15432"]
    end

    T1 --> BE
    T2 --> PG
    DEV -->|"Cloudflare Tunnel"| T2
```

---

## ⚡ สถานะปัจจุบัน

| ส่วน | สถานะ | หมายเหตุ |
|------|--------|---------|
| 📥 รับสินค้า (Inbound) | ✅ ใช้งานได้ | ผ่าน Local DB |
| 📍 จัดการตำแหน่ง | ✅ ใช้งานได้ | QR + Shelf Grid |
| 🛒 ออเดอร์ + Packing List | ✅ ใช้งานได้ | Sync จาก JHCSMILE |
| 📋 กระจายงาน (Assign) | ✅ ใช้งานได้ | TaskAssignment → MyTasks |
| 📱 หยิบสินค้า (Pick) | ✅ ใช้งานได้ | FEFO Algorithm |
| 📦 แพค (Pack) | ⚠️ เพิ่ง migrate | Local DB proxy พร้อมแล้ว |
| 🚚 จัดส่ง (Ship) | ✅ ใช้งานได้ | Mark as shipped |
| 💰 การเงิน | ✅ ใช้งานได้ | CSMILE Integration |
| 🔄 Auto Sync | ✅ ทำงาน | ทุก 6 ชม. |
| 🌐 External Access | ✅ ตั้งค่าแล้ว | Cloudflare Tunnel |
| 🗄️ Local DB Proxy | ✅ สมบูรณ์ | เพิ่ม 7 methods แล้ว |
