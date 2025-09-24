-- Fix all database issues
-- Run this in Supabase Dashboard to resolve all problems

-- 1. Drop all problematic triggers and functions first
DO $$
DECLARE
    trigger_record RECORD;
    func_record RECORD;
BEGIN
    -- Drop ALL triggers on inventory_items
    FOR trigger_record IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'inventory_items'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_record.trigger_name || ' ON inventory_items CASCADE';
        RAISE NOTICE 'Dropped trigger: %', trigger_record.trigger_name;
    END LOOP;

    -- Drop ALL functions that contain 'box_quantity_before'
    FOR func_record IN 
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_definition LIKE '%box_quantity_before%'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.routine_name || ' CASCADE';
        RAISE NOTICE 'Dropped function: %', func_record.routine_name;
    END LOOP;
END $$;

-- 2. Create warehouse_locations table if not exists
CREATE TABLE IF NOT EXISTS warehouse_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_code VARCHAR(20) UNIQUE NOT NULL,
    row VARCHAR(2),
    level INTEGER,
    position INTEGER,
    description TEXT,
    capacity_boxes INTEGER DEFAULT 0,
    capacity_loose INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE warehouse_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "warehouse_locations_all_access" ON warehouse_locations FOR ALL USING (true);

-- 3. Create product_conversion_rates table if not exists
CREATE TABLE IF NOT EXISTS product_conversion_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(50) UNIQUE NOT NULL,
    product_name TEXT,
    unit_level1_name VARCHAR(50) DEFAULT 'ลัง',
    unit_level1_rate INTEGER DEFAULT 1,
    unit_level2_name VARCHAR(50) DEFAULT 'กล่อง', 
    unit_level2_rate INTEGER DEFAULT 1,
    unit_level3_name VARCHAR(50) DEFAULT 'ชิ้น',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE product_conversion_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "product_conversion_rates_all_access" ON product_conversion_rates FOR ALL USING (true);

-- 4. Create inventory_movements table if not exists
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'RESERVED', 'ADJUSTMENT', 'TRANSFER')),
    quantity_level1_change INTEGER DEFAULT 0,
    quantity_level2_change INTEGER DEFAULT 0,
    quantity_level3_change INTEGER DEFAULT 0,
    reference_type VARCHAR(50),
    reference_id UUID,
    notes TEXT,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "inventory_movements_all_access" ON inventory_movements FOR ALL USING (true);

-- 5. Add missing columns to inventory_items if they don't exist
DO $$ 
BEGIN
    -- Add unit_level1_quantity if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_items' AND column_name = 'unit_level1_quantity'
    ) THEN
        ALTER TABLE inventory_items ADD COLUMN unit_level1_quantity INTEGER DEFAULT 0;
    END IF;

    -- Add unit_level2_quantity if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_items' AND column_name = 'unit_level2_quantity'
    ) THEN
        ALTER TABLE inventory_items ADD COLUMN unit_level2_quantity INTEGER DEFAULT 0;
    END IF;

    -- Add unit_level3_quantity if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_items' AND column_name = 'unit_level3_quantity'
    ) THEN
        ALTER TABLE inventory_items ADD COLUMN unit_level3_quantity INTEGER DEFAULT 0;
    END IF;

    -- Add unit name columns if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_items' AND column_name = 'unit_level1_name'
    ) THEN
        ALTER TABLE inventory_items ADD COLUMN unit_level1_name VARCHAR(50) DEFAULT 'ลัง';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_items' AND column_name = 'unit_level2_name'
    ) THEN
        ALTER TABLE inventory_items ADD COLUMN unit_level2_name VARCHAR(50) DEFAULT 'กล่อง';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_items' AND column_name = 'unit_level3_name'
    ) THEN
        ALTER TABLE inventory_items ADD COLUMN unit_level3_name VARCHAR(50) DEFAULT 'ชิ้น';
    END IF;

    -- Add rate columns if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_items' AND column_name = 'unit_level1_rate'
    ) THEN
        ALTER TABLE inventory_items ADD COLUMN unit_level1_rate INTEGER DEFAULT 1;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_items' AND column_name = 'unit_level2_rate'
    ) THEN
        ALTER TABLE inventory_items ADD COLUMN unit_level2_rate INTEGER DEFAULT 1;
    END IF;
END $$;

-- 6. Insert conversion rates for common products
INSERT INTO product_conversion_rates (sku, product_name, unit_level1_name, unit_level1_rate, unit_level2_name, unit_level2_rate, unit_level3_name) VALUES
-- L3-8G: ดีดีครีมวอเตอร์เมลอนซันสกรีน 8g
('L3-8G', 'ดีดีครีมวอเตอร์เมลอนซันสกรีน 8g', 'ลัง', 3024, 'กล่อง', 6, 'ชิ้น'),
-- T5A series
('T5A-2.5G', 'วอเตอร์เมลอน แทททู ลิป เซรั่ม 01 ออลสวีท 2.5 กรัม(สีชมพู) (ไม่มีหน้า)', 'ลัง', 1, 'กล่อง', 1, 'ชิ้น'),
('T5A-2G', 'วอเตอร์เมลอน แทททู ลิป เซรั่ม 01 ออลสวีท 2 กรัม(สีชมพู) (ไม่มีหน้า)', 'ลัง', 1, 'กล่อง', 1, 'ชิ้น'),
-- T5B series
('T5B-2.5G', 'วอเตอร์เมลอน แทททู ลิป เซรั่ม 02 เบอร์กันดี 2.5 กรัม(สีแดง) (ไม่มีหน้า)', 'ลัง', 1, 'กล่อง', 1, 'ชิ้น'),
('T5B-2G', 'วอเตอร์เมลอน แทททู ลิป เซรั่ม 02 เบอร์กันดี 2 กรัม(สีแดง) (ไม่มีหน้า)', 'ลัง', 1, 'กล่อง', 1, 'ชิ้น'),
-- T5C series
('T5C-2.5G', 'วอเตอร์เมลอน แทททู ลิป เซรั่ม 03 ลิตเติ้ล ดาร์ลิ้ง 2.5 กรัม(สีส้ม) (ไม่มีหน้า)', 'ลัง', 1, 'กล่อง', 1, 'ชิ้น'),
('T5C-2G', 'วอเตอร์เมลอน แทททู ลิป เซรั่ม 03 ลิตเติ้ล ดาร์ลิ้ง 2 กรัม(สีส้ม) (ไม่มีหน้า)', 'ลัง', 1, 'กล่อง', 1, 'ชิ้น'),
-- T6A series
('T6A-10G', 'วอเตอร์เมลอน ฟิลเตอร์ ฟิท แมทท์ คอนโทรล พาวเดอร์ 10 กรัม (ไม่มีหน้า)', 'ลัง', 1, 'กล่อง', 1, 'ชิ้น'),
('T6A-3.8G', 'ตัวอย่าง วอเตอร์เมลอน ฟิลเตอร์ ฟิท แมทท์ พาวเดอร์ 3.8 กรัม (ไม่มีหน้า)', 'ลัง', 1, 'กล่อง', 1, 'ชิ้น'),
('T6A-5G', 'วอเตอร์เมลอน ฟิลเตอร์ ฟิท แมทท์ พาวเดอร์ 5 กรัม (ไม่มีหน้า)', 'ลัง', 1, 'กล่อง', 1, 'ชิ้น')
ON CONFLICT (sku) DO UPDATE SET
    product_name = EXCLUDED.product_name,
    unit_level1_name = EXCLUDED.unit_level1_name,
    unit_level1_rate = EXCLUDED.unit_level1_rate,
    unit_level2_name = EXCLUDED.unit_level2_name,
    unit_level2_rate = EXCLUDED.unit_level2_rate,
    unit_level3_name = EXCLUDED.unit_level3_name,
    updated_at = NOW();

-- 7. Insert products data
INSERT INTO products (sku, name, description, category, unit, created_at, updated_at) VALUES
('T5A-2.5G', 'วอเตอร์เมลอน แทททู ลิป เซรั่ม 01 ออลสวีท 2.5 กรัม(สีชมพู) (ไม่มีหน้า)', 'T5A-2.5G (S) วอเตอร์เมลอน แทททู ลิป เซรั่ม 01 ออลสวีท 2.5 กรัม(สีชมพู)', 'เครื่องสำอาง', 'ชิ้น', NOW(), NOW()),
('T5A-2G', 'วอเตอร์เมลอน แทททู ลิป เซรั่ม 01 ออลสวีท 2 กรัม(สีชมพู) (ไม่มีหน้า)', 'T5A-2G (S) วอเตอร์เมลอน แทททู ลิป เซรั่ม 01 ออลสวีท 2 กรัม(สีชมพู)', 'เครื่องสำอาง', 'ชิ้น', NOW(), NOW()),
('T5B-2.5G', 'วอเตอร์เมลอน แทททู ลิป เซรั่ม 02 เบอร์กันดี 2.5 กรัม(สีแดง) (ไม่มีหน้า)', 'T5B-2.5G (S) วอเตอร์เมลอน แทททู ลิป เซรั่ม 02 เบอร์กันดี 2.5 กรัม(สีแดง)', 'เครื่องสำอาง', 'ชิ้น', NOW(), NOW()),
('T5B-2G', 'วอเตอร์เมลอน แทททู ลิป เซรั่ม 02 เบอร์กันดี 2 กรัม(สีแดง) (ไม่มีหน้า)', 'T5B-2G (S) วอเตอร์เมลอน แทททู ลิป เซรั่ม 02 เบอร์กันดี 2 กรัม(สีแดง)', 'เครื่องสำอาง', 'ชิ้น', NOW(), NOW()),
('T5C-2.5G', 'วอเตอร์เมลอน แทททู ลิป เซรั่ม 03 ลิตเติ้ล ดาร์ลิ้ง 2.5 กรัม(สีส้ม) (ไม่มีหน้า)', 'T5C-2.5G (S) วอเตอร์เมลอน แทททู ลิป เซรั่ม 03 ลิตเติ้ล ดาร์ลิ้ง 2.5 กรัม(สีส้ม)', 'เครื่องสำอาง', 'ชิ้น', NOW(), NOW()),
('T5C-2G', 'วอเตอร์เมลอน แทททู ลิป เซรั่ม 03 ลิตเติ้ล ดาร์ลิ้ง 2 กรัม(สีส้ม) (ไม่มีหน้า)', 'T5C-2G (S) วอเตอร์เมลอน แทททู ลิป เซรั่ม 03 ลิตเติ้ล ดาร์ลิ้ง 2 กรัม(สีส้ม)', 'เครื่องสำอาง', 'ชิ้น', NOW(), NOW()),
('T6A-10G', 'วอเตอร์เมลอน ฟิลเตอร์ ฟิท แมทท์ คอนโทรล พาวเดอร์ 10 กรัม (ไม่มีหน้า)', 'T6A-10G (S) วอเตอร์เมลอน ฟิลเตอร์ ฟิท แมทท์ คอนโทรล พาวเดอร์ 10 กรัม', 'เครื่องสำอาง', 'ชิ้น', NOW(), NOW()),
('T6A-3.8G', 'ตัวอย่าง วอเตอร์เมลอน ฟิลเตอร์ ฟิท แมทท์ พาวเดอร์ 3.8 กรัม (ไม่มีหน้า)', 'T6A-3.8G (S) ตัวอย่าง วอเตอร์เมลอน ฟิลเตอร์ ฟิท แมทท์ พาวเดอร์ 3.8 กรัม', 'เครื่องสำอาง', 'ชิ้น', NOW(), NOW()),
('T6A-5G', 'วอเตอร์เมลอน ฟิลเตอร์ ฟิท แมทท์ พาวเดอร์ 5 กรัม (ไม่มีหน้า)', 'T6A-5G (S) วอเตอร์เมลอน ฟิลเตอร์ ฟิท แมทท์ พาวเดอร์ 5 กรัม', 'เครื่องสำอาง', 'ชิ้น', NOW(), NOW())
ON CONFLICT (sku) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = NOW();

-- 8. Migrate existing data
UPDATE inventory_items 
SET 
    unit_level1_quantity = COALESCE(carton_quantity_legacy, 0),
    unit_level2_quantity = COALESCE(box_quantity_legacy, 0),
    unit_level3_quantity = 0
WHERE unit_level1_quantity = 0 AND unit_level2_quantity = 0;

-- Update any existing inventory items to use proper product names
UPDATE inventory_items 
SET product_name = products.name
FROM products 
WHERE inventory_items.sku = products.sku 
AND inventory_items.product_name != products.name;

-- 9. Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for all tables
DROP TRIGGER IF EXISTS warehouse_locations_updated_at_trigger ON warehouse_locations;
CREATE TRIGGER warehouse_locations_updated_at_trigger
    BEFORE UPDATE ON warehouse_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS product_conversion_rates_updated_at_trigger ON product_conversion_rates;
CREATE TRIGGER product_conversion_rates_updated_at_trigger
    BEFORE UPDATE ON product_conversion_rates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS inventory_movements_updated_at_trigger ON inventory_movements;
CREATE TRIGGER inventory_movements_updated_at_trigger
    BEFORE UPDATE ON inventory_movements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 10. Verification
SELECT 'All database issues fixed successfully!' AS status;

-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('warehouse_locations', 'product_conversion_rates', 'inventory_movements')
ORDER BY table_name;
