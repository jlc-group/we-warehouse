-- Remove the constraint that's blocking A1/1 format updates
ALTER TABLE warehouse_locations
DROP CONSTRAINT IF EXISTS check_warehouse_location_code_format;

-- Check if constraint was removed
SELECT conname, confrelid::regclass as table_name, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'warehouse_locations'::regclass
AND contype = 'c';