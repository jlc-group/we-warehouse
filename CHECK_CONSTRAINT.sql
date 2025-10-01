-- ตรวจสอบ constraint ที่มีอยู่ในตาราง inventory_movements
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.inventory_movements'::regclass
  AND contype = 'c';

-- แก้ไข constraint ให้รองรับค่า 'pick', 'cancel', 'adjust', 'in', 'out', 'transfer', 'adjustment'
ALTER TABLE public.inventory_movements
  DROP CONSTRAINT IF EXISTS inventory_movements_movement_type_check;

ALTER TABLE public.inventory_movements
  ADD CONSTRAINT inventory_movements_movement_type_check
  CHECK (movement_type IN ('pick', 'cancel', 'adjust', 'in', 'out', 'transfer', 'adjustment'));
