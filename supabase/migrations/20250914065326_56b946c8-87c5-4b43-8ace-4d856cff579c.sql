-- Check current policies on event_attendees table first
SELECT schemaname, tablename, policyname, cmd, permissive, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'event_attendees';

-- Drop ALL existing policies on event_attendees table
DROP POLICY IF EXISTS "Users can view own attendee records" ON public.event_attendees;
DROP POLICY IF EXISTS "Users can create own attendee records" ON public.event_attendees;
DROP POLICY IF EXISTS "Users can update own attendee records" ON public.event_attendees;
DROP POLICY IF EXISTS "Only admins can delete attendee records" ON public.event_attendees;
DROP POLICY IF EXISTS "Allow public delete access" ON public.event_attendees;
DROP POLICY IF EXISTS "Allow public insert access" ON public.event_attendees;
DROP POLICY IF EXISTS "Allow public read access" ON public.event_attendees;
DROP POLICY IF EXISTS "Allow public update access" ON public.event_attendees;

-- Create secure RLS policies for event_attendees
-- Users can only view their own attendee records or if they are admin
CREATE POLICY "Secure view attendee records" 
ON public.event_attendees 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR 
    is_admin()
  )
);

-- Users can only insert attendee records for themselves
CREATE POLICY "Secure create attendee records" 
ON public.event_attendees 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id
);

-- Users can only update their own attendee records or admins can update any
CREATE POLICY "Secure update attendee records" 
ON public.event_attendees 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR 
    is_admin()
  )
);

-- Only admins can delete attendee records
CREATE POLICY "Secure delete attendee records" 
ON public.event_attendees 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND 
  is_admin()
);