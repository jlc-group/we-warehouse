-- Populate products table with data from sampleInventory.ts
-- This migration inserts all FG and PK products into the products table

-- FG Products (Finished Goods)
INSERT INTO products (sku_code, product_name, product_type, category, subcategory, brand, description) VALUES
('C1-15G', 'คาเลนดูล่า แอนติ-แอคเน่ สปอต เจล 15 กรัม', 'FG', 'cosmetics', 'skincare', 'Chulaherb', 'คาเลนดูล่า แอนติ-แอคเน่ สปอต เจล 15 กรัม - คุณภาพสูง'),
('C1-6G', 'คาเลนดูล่า แอนติ-แอคเน่ สปอต เจล 6 กรัม', 'FG', 'cosmetics', 'skincare', 'Chulaherb', 'คาเลนดูล่า แอนติ-แอคเน่ สปอต เจล 6 กรัม - คุณภาพสูง'),
('C2-35G', 'มอรินก้า คอมพลีต รีแพร์ เซรั่ม 35 กรัม', 'FG', 'cosmetics', 'skincare', 'Chulaherb', 'มอรินก้า คอมพลีต รีแพร์ เซรั่ม 35 กรัม - คุณภาพสูง'),
('C2-8G', 'มอรินก้า คอมพลีต รีแพร์ เซรั่ม 8G', 'FG', 'cosmetics', 'skincare', 'Chulaherb', 'มอรินก้า คอมพลีต รีแพร์ เซรั่ม 8G - คุณภาพสูง'),
('C3-30G', 'เมลอน มิลก์ ยูวี เอสเซนส์ SPF50+PA++++ 30G', 'FG', 'cosmetics', 'sunscreen', 'Chulaherb', 'เมลอน มิลก์ ยูวี เอสเซนส์ SPF50+PA++++ 30G - คุณภาพสูง'),
('C3-7G', 'เมลอน มิลก์ ยูวี เอสเซนส์ SPF50+PA++++ 7G', 'FG', 'cosmetics', 'sunscreen', 'Chulaherb', 'เมลอน มิลก์ ยูวี เอสเซนส์ SPF50+PA++++ 7G - คุณภาพสูง'),
('C3L10-2G', 'สินค้าตัวอย่างบรรจุ เมลอน มิลก์ ยูวี เอสเซนส์+วอเตอร์เมลอน ทรีดี ออร่า ซัน การ์ด SPF50+PA++++', 'FG', 'cosmetics', 'sample', 'Chulaherb', 'สินค้าตัวอย่างบรรจุ เมลอน มิลก์ ยูวี เอสเซนส์+วอเตอร์เมลอน ทรีดี ออร่า ซัน การ์ด SPF50+PA++++ - คุณภาพสูง'),
('C4-35G', 'แบล็ค จิงเจอร์ พอร์เลส&ออยล์ เคลียร์ เซรั่ม 35 กรัม', 'FG', 'cosmetics', 'skincare', 'Chulaherb', 'แบล็ค จิงเจอร์ พอร์เลส&ออยล์ เคลียร์ เซรั่ม 35 กรัม - คุณภาพสูง'),
('C4-8G', 'แบล็ค จิงเจอร์ พอร์เลส&ออยล์ เคลียร์ เซรั่ม 8g', 'FG', 'cosmetics', 'skincare', 'Chulaherb', 'แบล็ค จิงเจอร์ พอร์เลส&ออยล์ เคลียร์ เซรั่ม 8g - คุณภาพสูง'),
('D2-70G', 'เจเด้นท์ 3X เอ็กซ์ตร้า แคร์ ทูธเพสท์ 70 กรัม', 'FG', 'cosmetics', 'oral_care', 'Chulaherb', 'เจเด้นท์ 3X เอ็กซ์ตร้า แคร์ ทูธเพสท์ 70 กรัม - คุณภาพสูง'),
('D3-70G', 'เจเด้นท์ 3 in 1 เฮอร์เบิลไวท์ ทูธเพสท์+ 70กรัม', 'FG', 'cosmetics', 'oral_care', 'Chulaherb', 'เจเด้นท์ 3 in 1 เฮอร์เบิลไวท์ ทูธเพสท์+ 70กรัม - คุณภาพสูง')

ON CONFLICT (sku_code) DO NOTHING;

-- Note: This is a partial migration. The complete product data should be inserted
-- using a proper data migration script that reads from the sampleInventory.ts file
-- or through the application interface once the products table is set up.

-- Add some sample categories for better organization
INSERT INTO products (sku_code, product_name, product_type, category, subcategory, brand, description) VALUES
-- Sample PK products
('CAP-001', 'ฝาพลาสติกกลม 50mm', 'PK', 'packaging', 'caps', 'Generic', 'ฝาพลาสติกกลมขนาด 50mm สำหรับบรรจุภัณฑ์'),
('BOX-001', 'กล่องกระดาษพิมพ์ 10x10x5 cm', 'PK', 'packaging', 'boxes', 'Generic', 'กล่องกระดาษพิมพ์ขนาด 10x10x5 เซนติเมตร'),
('BT-001', 'ขวดพลาสติก 100ml', 'PK', 'packaging', 'bottles', 'Generic', 'ขวดพลาสติกใสขนาด 100ml')

ON CONFLICT (sku_code) DO NOTHING;

-- Note: products_with_counts view will be created later when inventory_items table exists