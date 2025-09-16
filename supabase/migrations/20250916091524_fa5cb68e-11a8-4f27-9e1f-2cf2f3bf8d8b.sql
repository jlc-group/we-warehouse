-- Delete inventory items created during test period
DELETE FROM inventory_items 
WHERE updated_at BETWEEN '2025-09-16 07:28:00.031341+00' AND '2025-09-16 07:28:01.664446+00';