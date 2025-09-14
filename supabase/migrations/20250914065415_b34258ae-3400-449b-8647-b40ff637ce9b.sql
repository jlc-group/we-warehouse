-- Fix critical security issues: Enable RLS on tables that need it
-- Enable RLS on safe_event_attendees view (convert to table if needed)
-- Since we can't enable RLS on views, let's drop the view and create a proper solution

DROP VIEW IF EXISTS public.safe_event_attendees;

-- Enable RLS on tables that have policies but RLS is disabled
-- Check which tables need RLS enabled
DO $$
DECLARE
    tbl_name text;
BEGIN
    -- Enable RLS on meeting_rooms if it has policies but RLS disabled
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'meeting_rooms'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'meeting_rooms' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.meeting_rooms ENABLE ROW LEVEL SECURITY;
    END IF;

    -- Enable RLS on other tables if needed
    FOR tbl_name IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND rowsecurity = false
        AND tablename IN (
            SELECT DISTINCT tablename 
            FROM pg_policies 
            WHERE schemaname = 'public'
        )
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl_name);
    END LOOP;
END
$$;

-- Create a secure function for public event attendee summary that doesn't expose sensitive data
CREATE OR REPLACE FUNCTION public.get_event_attendee_public_info(event_uuid uuid)
RETURNS TABLE(
    attendee_count bigint,
    verified_count bigint
) 
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT 
        COUNT(*) as attendee_count,
        COUNT(*) FILTER (WHERE payment_status = 'verified') as verified_count
    FROM event_attendees
    WHERE event_id = event_uuid;
$$;