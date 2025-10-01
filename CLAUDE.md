# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

ไฟล์นี้ให้คำแนะนำสำหรับ Claude Code (claude.ai/code) เมื่อทำงานกับโค้ดในพื้นที่เก็บข้อมูลนี้

## คำสั่งสำหรับการพัฒนา

- `npm run dev` - เริ่มเซิร์ฟเวอร์พัฒนาด้วย Vite
- `npm run build` - สร้างไฟล์สำหรับ production
- `npm run build:dev` - สร้างไฟล์ในโหมดพัฒนา
- `npm run lint` - รัน ESLint เพื่อตรวจสอบโค้ด
- `npm run preview` - ดูตัวอย่าง production build ในเครื่อง

## ภาพรวมสถาปัตยกรรม

นี่คือระบบจัดการสต็อกคลังสินค้าที่พัฒนาด้วย React และเทคโนโลยีสมัยใหม่:

### เทคโนโลยีหลัก
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: คอมโพเนนต์ shadcn/ui พร้อม Radix UI primitives
- **Styling**: Tailwind CSS พร้อมธีมที่กำหนดเอง
- **Backend**: Supabase (ฐานข้อมูล PostgreSQL พร้อม real-time subscriptions)
- **Data Fetching**: TanStack Query (React Query) v5
- **Routing**: React Router DOM v6
- **Forms**: React Hook Form พร้อม Zod validation

### โครงสร้างฐานข้อมูล (Supabase)
ตารางสำคัญประกอบด้วย:
- `inventory_items` - ข้อมูลสต็อกหลักพร้อมตำแหน่ง, จำนวนหน่วยหลายระดับ, ข้อมูลสินค้า
- `inventory_movements` - ประวัติการเปลี่ยนแปลงสต็อกพื้นฐาน
- `system_events` - **ระบบบันทึกเหตุการณ์ครบถ้วน** พร้อมข้อมูล JSONB, การติดตามการเปลี่ยนแปลง, และ metadata
- `products` - ข้อมูลหลักสินค้าพร้อมรหัส SKU (ใช้ฟิลด์ `sku_code` ไม่ใช่ `sku`)
- `product_conversion_rates` - อัตราแปลงหน่วยหลายระดับต่อสินค้า
- `customer_orders` + `order_items` - จัดการใบสั่งขายอย่างครบถ้วน
- `location_qr_codes` - การรวม QR code สำหรับตำแหน่งคลังสินค้า

**ระบบบันทึกเหตุการณ์แบบขยาย:**
- ตาราง `system_events` เก็บประวัติการตรวจสอบอย่างครบถ้วนพร้อม JSONB storage ที่ยืดหยุ่น
- Trigger อัตโนมัติบันทึกการเปลี่ยนแปลงสต็อกพร้อมสถานะก่อน/หลัง
- Views: `recent_events`, `error_events`, `inventory_events` สำหรับการค้นหาง่าย
- Migration: `supabase/migrations/20250924_enhanced_event_logging.sql`

**หมายเหตุสำคัญของฐานข้อมูล:**
- ตาราง Products ใช้ฟิลด์ `sku_code` สำหรับค้นหา SKU ไม่ใช่ `sku`
- รายการสต็อกรองรับระบบหน่วยหลายระดับ (ลัง/กล่อง/ชิ้น) พร้อมอัตราแปลง
- ใช้การเลือกฟิลด์เฉพาะใน queries แทน `select('*')` เพื่อหลีกเลี่ยง TypeScript type ที่ซับซ้อน
- การบันทึกเหตุการณ์เป็นอัตโนมัติผ่าน database triggers และแบบปรับแต่งผ่าน `eventLoggingService`

### โครงสร้างแอปพลิเคชัน

**หน้าหลัก (`src/pages/Index.tsx`):**
อินเทอร์เฟซแท็บสมัยใหม่พร้อม sub-tabs แบบซ้อนที่จัดระเบียบตามการทำงานของผู้ใช้:
- **ภาพรวม** (Overview) - `EnhancedOverview` พร้อม `ShelfGrid` และ dashboard วิเคราะห์ที่รวมเข้าด้วยกัน
- **จัดการสินค้า** (Product Management) - `AddProductForm` พร้อม 3 sub-tabs: เพิ่มสินค้า, รหัสสินค้า, การแปลงหน่วย
- **ใบสั่งซื้อ** (Purchase Orders) - `OrdersTab` + `OutboundOrderModal` สำหรับการจัดการใบสั่งขายแบบครบถ้วน
- **ตารางข้อมูล** (Data Tables) - 2 sub-tabs: รายการสต็อก (`InventoryTable`), สรุปสินค้า (`ProductSummaryTable`)
- **Analytics & แผนก** - 5 sub-tabs สำหรับการวิเคราะห์ครบถ้วนและ dashboard คลังสินค้า
- **ประวัติ** (History) - `MovementLogs` + `EnhancedEventLogs` สำหรับประวัติการตรวจสอบแบบครบถ้วน
- **QR & ตำแหน่ง** - 3 sub-tabs: QR Scanner, จัดการ QR, จัดการตำแหน่ง

**คอมโพเนนต์สำคัญ:**
- `src/components/EnhancedOverview.tsx` - Dashboard หลักที่รวมมุมมองข้อมูลหลายแบบ
- `src/components/EnhancedEventLogs.tsx` - การติดตามกิจกรรมระบบ real-time พร้อมการกรองขั้นสูง
- `src/components/OrdersTab.tsx` + `OutboundOrderModal.tsx` - การจัดการใบสั่งซื้อ/ใบสั่งขายแบบครบถ้วน
- `src/components/AddProductForm.tsx` - การจัดการสินค้าพร้อมการตั้งค่าการแปลงหน่วยที่รวมเข้าด้วยกัน
- `src/components/ShelfGrid.tsx` - เค้าโครงคลังสินค้าแบบภาพพร้อมการรวม QR

**Hooks & Contexts สำคัญ:**
- `src/hooks/useInventory.ts` - การจัดการข้อมูลสต็อกหลักพร้อม CRUD operations และ real-time updates ผ่าน Supabase subscriptions
- `src/hooks/useDepartmentInventory.ts` - การจัดการข้อมูลสต็อกที่กรองตามแผนกและสิทธิ์ของผู้ใช้
- `src/contexts/ProductsContext.tsx` - การจัดการข้อมูลสินค้าและ context
- `src/contexts/InventoryContext.tsx` - การจัดการสถานะสต็อกแบบ global
- `src/contexts/AuthContextSimple.tsx` - การจัดการ authentication และข้อมูลผู้ใช้

**Utilities หลัก:**
- `src/utils/unitCalculations.ts` - เครื่องมือการแปลงและคำนวณหน่วยหลายระดับ
- `src/utils/locationUtils.ts` - การจัดรูปแบบตำแหน่งและเครื่องมือ QR code
- `src/data/sampleInventory.ts` - การกำหนดประเภทสินค้าและข้อมูลตัวอย่าง

**ชั้นบริการ (Service Layer):**
- `src/services/` - คลาสบริการเฉพาะสำหรับการดำเนินการฐานข้อมูลทั้งหมด
- `src/services/locationQRService.ts` - การสร้างและจัดการ QR code
- `src/services/warehouseLocationService.ts` - การดำเนินการตำแหน่งคลังสินค้า
- `src/services/tableManagementService.ts` - การจัดการโครงสร้างตาราง
- `src/services/productConversionService.ts` - การจัดการอัตราแปลงหน่วยสินค้า
- `src/services/fulfillmentService.ts` - การจัดการระบบ fulfillment
- `src/services/purchaseOrderService.ts` - การจัดการใบสั่งซื้อ

**แพทเทิร์น Secure Gateway:**
- `src/utils/secureGatewayClient.ts` - ชั้น abstraction API พร้อม fallback ไปยัง Supabase โดยตรง
- ใช้ตลอดใน `src/hooks/useStockManagement.ts` สำหรับการดำเนินการฐานข้อมูลที่เชื่อถือได้
- จัดการ foreign key constraints และ transaction management

**การรวมฐานข้อมูล:**
- `src/integrations/supabase/client.ts` - การกำหนดค่า Supabase client
- `src/integrations/supabase/types.ts` - TypeScript types ที่สร้างอัตโนมัติจาก database schema

### คุณสมบัติสำคัญ
- ไม่ต้องการการตรวจสอบสิทธิ์ (ใช้ UUID แบบสุ่มสำหรับ user_id)
- **สถาปัตยกรรมแท็บแบบซ้อน**: แท็บหลักประกอบด้วย sub-tabs ที่จัดระเบียบ (Analytics & แผนก มี 5 sub-tabs, จัดการสินค้า มี 3 sub-tabs)
- **การบันทึกเหตุการณ์ครบถ้วน**: การติดตามกิจกรรม real-time พร้อมการติดตามการเปลี่ยนแปลงก่อน/หลัง
- **ระบบหน่วยหลายระดับ**: รองรับ ลัง (carton) → กล่อง (box) → ชิ้น (pieces) พร้อมอัตราแปลง
- **แพทเทิร์น Secure Gateway**: API abstraction พร้อม automatic fallback สำหรับการดำเนินการฐานข้อมูลที่เชื่อถือได้
- **เวิร์กโฟลว์ใบสั่งขายครบถ้วน**: จากการเลือกสินค้าไปยังการหักสต็อกผ่าน OrdersTab + OutboundOrderModal
- **การรวม QR & ตำแหน่ง**: รวมการสแกน QR, การจัดการ, และการดูแลตำแหน่ง
- **อินเทอร์เฟซสองภาษา**: UI ภาษาไทยพร้อมคำศัพท์เทคนิคและชื่อคอมโพเนนต์ภาษาอังกฤษ
- **การอัปเดต Real-time**: Supabase subscriptions สำหรับการซิงค์สต็อกสด
- การออกแบบ responsive พร้อมการรองรับมือถือและการแจ้งเตือนแบบ toast

### แนวทางการพัฒนา
- ใช้หลักการคอมโพเนนต์ shadcn/ui พร้อม path mapping `@/components/ui/` (`@/*` แปลงเป็น `./src/*`)
- การกำหนดค่า TypeScript ใช้ค่าปกติที่หลวม (strict mode ปิด, อนุญาตใช้ any types, อนุญาต JS)
- Database types นำเข้าจาก `src/integrations/supabase/types`
- การจัดการข้อผิดพลาดผ่านการแจ้งเตือน toast ด้วย Sonner
- **แพทเทิร์นแท็บแบบซ้อน**: ใช้ `<Tabs>` พร้อม `<TabsContent>` ที่ประกอบด้วย `<Tabs>` ซ้อนสำหรับลำดับชั้น UI ที่จัดระเบียบ
- **สถาปัตยกรรมชั้นบริการ**: การดำเนินการฐานข้อมูลทั้งหมดใช้คลาสบริการเฉพาะใน `src/services/`
- **Secure Gateway เป็นอันดับแรก**: ใช้ `secureGatewayClient` สำหรับการดำเนินการฐานข้อมูลพร้อม Supabase fallback อัตโนมัติ
- **การจัดการคอมโพเนนต์ placeholder**: ใช้ `DisabledComponent` สำหรับฟีเจอร์ที่ยังไม่เสร็จ - นำเข้าจาก `@/components/DisabledComponents`
- **การคำนวณหน่วยหลายระดับ**: ใช้เครื่องมือจาก `src/utils/unitCalculations.ts` สำหรับการแปลงหน่วยที่สม่ำเสมอ
- **การมาตรฐานรูปแบบตำแหน่ง**: ใช้ `src/utils/locationUtils.ts` สำหรับการแยกวิเคราะห์ตำแหน่งและการสร้าง QR
- **การจัดการประเภทสินค้า**: ใช้ค่าคงที่ `PRODUCT_TYPES` จาก `src/data/sampleInventory.ts`
- **การซิงโครไนซ์ข้อมูล Real-time**: Supabase subscriptions พร้อม React Query สำหรับการแคชและการจัดการสถานะ

### ไฟล์การกำหนดค่า
- `vite.config.ts` - การกำหนดค่า Vite พร้อม React SWC plugin
- `tailwind.config.ts` - การกำหนดค่า Tailwind CSS
- `eslint.config.js` - การกำหนดค่า ESLint
- `postcss.config.js` - การกำหนดค่า PostCSS

## หมายเหตุการพัฒนา

โปรเจ็กต์นี้ใช้ Lovable.dev สำหรับการ deployment และการพัฒนา แต่สามารถรันได้ในเครื่องด้วย Node.js/npm setup มาตรฐาน โค้ดเบสปฏิบัติตามแนวทาง React สมัยใหม่พร้อม TypeScript และใช้ Supabase สำหรับบริการ backend รวมถึง real-time subscriptions

### หมายเหตุสำคัญ
- ไม่มีการกำหนดค่า testing framework - ไม่มี test commands หรือไฟล์ test ในโปรเจ็กต์
- การกำหนดค่า TypeScript ใช้ค่าปกติที่หลวม (ไม่มี strict null checks, อนุญาต any types, อนุญาต JS)
- ควรแก้ไขไฟล์ที่มีอยู่แทนการสร้างไฟล์ใหม่เสมอ
- ห้ามสร้างไฟล์เอกสาร (*.md) เว้นแต่ได้รับคำขอเฉพาะ
- **Authentication**: ใช้ระบบ Auth simple ไม่ต้องการ registration - ใช้ข้อมูลผู้ใช้เริ่มต้นจาก AuthContextSimple
- **Department-based Access Control**: ระบบมีการควบคุมสิทธิ์ตามแผนก (คลังสินค้า, จัดซื้อ, ควบคุมคุณภาพ, การเงิน, ผู้บริหาร)
- **Performance**: ใช้ lazy loading สำหรับคอมโพเนนต์หนักและ memoization เพื่อป้องกัน re-renders ที่ไม่จำเป็น

### ปัญหาทั่วไป & วิธีแก้ไข
- **ปัญหาการเชื่อมต่อฐานข้อมูล**: ตรวจสอบว่า JSX syntax ถูกต้องก่อน - syntax errors ทำให้ compilation ล้มเหลว
- **ข้อผิดพลาด TypeScript type**: ใช้การเลือกฟิลด์เฉพาะใน Supabase queries แทน `select('*')`
- **ข้อผิดพลาดชื่อคอลัมน์**: ตาราง Products ใช้ฟิลด์ `sku_code` ไม่ใช่ `sku`
- **ข้อผิดพลาดการแปลงหน่วย**: ใช้เครื่องมือจาก `src/utils/unitCalculations.ts` เสมอเพื่อความสม่ำเสมอ
- **ปัญหารูปแบบตำแหน่ง**: ใช้ `src/utils/locationUtils.ts` สำหรับการจัดการตำแหน่งแบบมาตรฐาน
- **ข้อผิดพลาดชั้นบริการ**: ใช้คลาสบริการจาก `src/services/` แทนการเรียก Supabase โดยตรงเสมอ
- **ข้อผิดพลาดการจัดการสต็อก**: ใช้ `secureGatewayClient` ก่อน, ใช้ Supabase fallback เพื่อความเชื่อถือได้
- **คอมโพเนนต์ placeholder หายไป**: สร้างไฟล์ `DisabledComponents.tsx` หรือ `DisabledUserProfile.tsx` หากมีการใช้งานใน Index.tsx
- **ปัญหาการนำทางแท็บ**: ตรวจสอบโครงสร้างแท็บแบบซ้อน - แท็บหลักประกอบด้วย sub-tabs ที่มีค่าเฉพาะ
- **ไอคอนหายไป**: นำเข้า Lucide React icons ที่ต้องการเมื่อเพิ่มองค์ประกอบ UI ใหม่

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.