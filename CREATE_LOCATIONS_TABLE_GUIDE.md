# 🗄️ คู่มือสร้างตาราง warehouse_locations ใน Supabase

## 📋 ขั้นตอนการสร้างตาราง:

### 1. เข้าไปที่ Supabase Dashboard
- ไปที่ [https://supabase.com/dashboard](https://supabase.com/dashboard)
- เลือกโปรเจกต์ของคุณ

### 2. สร้างตารางใหม่
- คลิก **"Table Editor"** ในเมนูซ้าย
- คลิก **"Create a new table"**
- ใส่ชื่อตาราง: `warehouse_locations`

### 3. เพิ่ม Columns ตามนี้:

| Column Name | Type | Default Value | Constraints |
|-------------|------|---------------|-------------|
| `id` | uuid | `gen_random_uuid()` | Primary Key ✅ |
| `location_code` | text | (empty) | NOT NULL ✅, Unique ✅ |
| `row` | text | (empty) | NOT NULL ✅ |
| `level` | int4 | (empty) | NOT NULL ✅ |
| `position` | int4 | (empty) | NOT NULL ✅ |
| `location_type` | text | `shelf` | NOT NULL ✅ |
| `capacity_boxes` | int4 | `100` | - |
| `capacity_loose` | int4 | `1000` | - |
| `description` | text | (empty) | - |
| `is_active` | bool | `true` | - |
| `created_at` | timestamptz | `now()` | - |
| `updated_at` | timestamptz | `now()` | - |
| `user_id` | uuid | `00000000-0000-0000-0000-000000000000` | - |

### 4. บันทึกตาราง
- คลิก **"Save"**

### 5. ตั้งค่า Row Level Security (RLS)
- ไปที่ **Authentication** → **Policies**
- เลือกตาราง `warehouse_locations`
- คลิก **"New Policy"**
- เลือก **"Full customization"**
- Policy name: `Enable all access for warehouse_locations`
- ใส่ Condition: `true`
- เปิดใช้ทุก operations: SELECT, INSERT, UPDATE, DELETE
- คลิก **"Review"** → **"Save policy"**

## ✅ เสร็จแล้ว!

หลังจากสร้างตารางเสร็จ:
1. กลับไปที่แอป
2. ไปที่แท็บ **"ตำแหน่ง"**
3. ระบบจะทำงานได้ปกติ
4. สามารถเพิ่มข้อมูลตัวอย่างได้โดยใช้ปุ่มในแอป

## 🎯 ข้อมูลตัวอย่างที่จะได้:
- A/1/01 - ชั้นวางแถว A ชั้น 1 ตำแหน่ง 1
- A/1/02 - ชั้นวางแถว A ชั้น 1 ตำแหน่ง 2
- A/2/01 - ชั้นวางแถว A ชั้น 2 ตำแหน่ง 1
- B/1/01 - ชั้นวางแถว B ชั้น 1 ตำแหน่ง 1
- F/1/01 - พื้นเก็บแถว F ตำแหน่ง 1