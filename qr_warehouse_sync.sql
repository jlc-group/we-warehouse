-- 🔗 QR Code และ Warehouse Locations Sync System
-- รันใน Supabase SQL Editor เพื่อสร้างการซิงค์ระหว่าง QR codes และ warehouse_locations

-- ==========================================
-- Phase 1: สร้าง function สำหรับ auto-create QR code เมื่อมี warehouse_location ใหม่
-- ==========================================

CREATE OR REPLACE FUNCTION auto_create_qr_for_warehouse_location()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if QR code already exists for this location
    IF NOT EXISTS (
        SELECT 1 FROM public.location_qr_codes
        WHERE location = NEW.location_code AND is_active = true
    ) THEN
        -- Create QR code data
        DECLARE
            qr_data JSON;
            qr_url TEXT;
        BEGIN
            -- Create URL for the location
            qr_url := 'https://lovableproject.com/warehouse-inventory?tab=overview&location=' || NEW.location_code || '&action=add';

            -- Create QR data structure
            qr_data := json_build_object(
                'type', 'WAREHOUSE_LOCATION',
                'location', NEW.location_code,
                'url', qr_url,
                'action', 'add',
                'timestamp', NOW()::TEXT,
                'location_details', json_build_object(
                    'row', NEW.row,
                    'level', NEW.level,
                    'position', NEW.position,
                    'type', NEW.location_type,
                    'capacity_boxes', NEW.capacity_boxes,
                    'capacity_loose', NEW.capacity_loose,
                    'description', NEW.description
                )
            );

            -- Insert QR code record
            INSERT INTO public.location_qr_codes (
                location,
                qr_code_data,
                inventory_snapshot,
                generated_at,
                last_updated,
                is_active,
                user_id
            ) VALUES (
                NEW.location_code,
                qr_data::TEXT,
                '[]'::JSON, -- Empty inventory initially
                NOW(),
                NOW(),
                true,
                NEW.user_id
            );

        EXCEPTION WHEN OTHERS THEN
            -- Log error but don't fail the warehouse_location insert
            RAISE WARNING 'Failed to auto-create QR code for location %: %', NEW.location_code, SQLERRM;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- สร้าง trigger สำหรับ auto-create QR codes
DROP TRIGGER IF EXISTS trigger_auto_create_qr_for_warehouse_location ON public.warehouse_locations;
CREATE TRIGGER trigger_auto_create_qr_for_warehouse_location
    AFTER INSERT ON public.warehouse_locations
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_qr_for_warehouse_location();

-- ==========================================
-- Phase 2: สร้าง function สำหรับ update QR code เมื่อ warehouse_location เปลี่ยนแปลง
-- ==========================================

CREATE OR REPLACE FUNCTION update_qr_for_warehouse_location()
RETURNS TRIGGER AS $$
BEGIN
    -- Update existing QR code if location_code changed
    IF OLD.location_code != NEW.location_code THEN
        UPDATE public.location_qr_codes
        SET
            location = NEW.location_code,
            last_updated = NOW(),
            qr_code_data = REPLACE(
                qr_code_data,
                '"location":"' || OLD.location_code || '"',
                '"location":"' || NEW.location_code || '"'
            )
        WHERE location = OLD.location_code AND is_active = true;
    END IF;

    -- Update QR code data with new warehouse location details
    UPDATE public.location_qr_codes
    SET
        last_updated = NOW(),
        qr_code_data = (
            SELECT json_build_object(
                'type', 'WAREHOUSE_LOCATION',
                'location', NEW.location_code,
                'url', 'https://lovableproject.com/warehouse-inventory?tab=overview&location=' || NEW.location_code || '&action=add',
                'action', 'add',
                'timestamp', NOW()::TEXT,
                'location_details', json_build_object(
                    'row', NEW.row,
                    'level', NEW.level,
                    'position', NEW.position,
                    'type', NEW.location_type,
                    'capacity_boxes', NEW.capacity_boxes,
                    'capacity_loose', NEW.capacity_loose,
                    'description', NEW.description
                )
            )::TEXT
        )
    WHERE location = NEW.location_code AND is_active = true;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- สร้าง trigger สำหรับ update QR codes
DROP TRIGGER IF EXISTS trigger_update_qr_for_warehouse_location ON public.warehouse_locations;
CREATE TRIGGER trigger_update_qr_for_warehouse_location
    AFTER UPDATE ON public.warehouse_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_qr_for_warehouse_location();

-- ==========================================
-- Phase 3: สร้าง function สำหรับ deactivate QR code เมื่อลบ warehouse_location
-- ==========================================

CREATE OR REPLACE FUNCTION deactivate_qr_for_warehouse_location()
RETURNS TRIGGER AS $$
BEGIN
    -- Deactivate QR code instead of deleting (for audit trail)
    UPDATE public.location_qr_codes
    SET
        is_active = false,
        last_updated = NOW()
    WHERE location = OLD.location_code AND is_active = true;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- สร้าง trigger สำหรับ deactivate QR codes
DROP TRIGGER IF EXISTS trigger_deactivate_qr_for_warehouse_location ON public.warehouse_locations;
CREATE TRIGGER trigger_deactivate_qr_for_warehouse_location
    AFTER DELETE ON public.warehouse_locations
    FOR EACH ROW
    EXECUTE FUNCTION deactivate_qr_for_warehouse_location();

-- ==========================================
-- Phase 4: สร้าง function สำหรับ bulk sync existing warehouse_locations กับ QR codes
-- ==========================================

CREATE OR REPLACE FUNCTION sync_warehouse_locations_to_qr_codes()
RETURNS TEXT AS $$
DECLARE
    location_record RECORD;
    created_count INTEGER := 0;
    updated_count INTEGER := 0;
    error_count INTEGER := 0;
    qr_data JSON;
    qr_url TEXT;
BEGIN
    -- Loop through all active warehouse locations
    FOR location_record IN
        SELECT * FROM public.warehouse_locations
        WHERE is_active = true
    LOOP
        BEGIN
            -- Create URL for the location
            qr_url := 'https://lovableproject.com/warehouse-inventory?tab=overview&location=' || location_record.location_code || '&action=add';

            -- Create QR data structure
            qr_data := json_build_object(
                'type', 'WAREHOUSE_LOCATION',
                'location', location_record.location_code,
                'url', qr_url,
                'action', 'add',
                'timestamp', NOW()::TEXT,
                'location_details', json_build_object(
                    'row', location_record.row,
                    'level', location_record.level,
                    'position', location_record.position,
                    'type', location_record.location_type,
                    'capacity_boxes', location_record.capacity_boxes,
                    'capacity_loose', location_record.capacity_loose,
                    'description', location_record.description
                )
            );

            -- Check if QR code exists
            IF EXISTS (SELECT 1 FROM public.location_qr_codes WHERE location = location_record.location_code) THEN
                -- Update existing QR code
                UPDATE public.location_qr_codes
                SET
                    qr_code_data = qr_data::TEXT,
                    last_updated = NOW(),
                    is_active = true
                WHERE location = location_record.location_code;

                updated_count := updated_count + 1;
            ELSE
                -- Create new QR code
                INSERT INTO public.location_qr_codes (
                    location,
                    qr_code_data,
                    inventory_snapshot,
                    generated_at,
                    last_updated,
                    is_active,
                    user_id
                ) VALUES (
                    location_record.location_code,
                    qr_data::TEXT,
                    '[]'::JSON,
                    NOW(),
                    NOW(),
                    true,
                    location_record.user_id
                );

                created_count := created_count + 1;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            RAISE WARNING 'Error syncing QR for location %: %', location_record.location_code, SQLERRM;
        END;
    END LOOP;

    RETURN 'QR Sync completed: Created=' || created_count || ', Updated=' || updated_count || ', Errors=' || error_count;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Phase 5: สร้าง function สำหรับ cleanup orphaned QR codes
-- ==========================================

CREATE OR REPLACE FUNCTION cleanup_orphaned_qr_codes()
RETURNS TEXT AS $$
DECLARE
    cleanup_count INTEGER := 0;
BEGIN
    -- Deactivate QR codes for locations that no longer exist in warehouse_locations
    UPDATE public.location_qr_codes
    SET
        is_active = false,
        last_updated = NOW()
    WHERE
        is_active = true
        AND location NOT IN (
            SELECT location_code
            FROM public.warehouse_locations
            WHERE is_active = true
        );

    GET DIAGNOSTICS cleanup_count = ROW_COUNT;

    RETURN 'Cleaned up ' || cleanup_count || ' orphaned QR codes';
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Phase 6: Grant permissions
-- ==========================================

GRANT EXECUTE ON FUNCTION auto_create_qr_for_warehouse_location() TO public;
GRANT EXECUTE ON FUNCTION update_qr_for_warehouse_location() TO public;
GRANT EXECUTE ON FUNCTION deactivate_qr_for_warehouse_location() TO public;
GRANT EXECUTE ON FUNCTION sync_warehouse_locations_to_qr_codes() TO public;
GRANT EXECUTE ON FUNCTION cleanup_orphaned_qr_codes() TO public;

-- ==========================================
-- Phase 7: Run initial sync
-- ==========================================

SELECT 'QR-Warehouse sync setup completed! Now run: SELECT sync_warehouse_locations_to_qr_codes();' as status;