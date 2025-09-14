-- Fix security issue: Restrict public access to event_attendees table
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow public delete access" ON public.event_attendees;
DROP POLICY IF EXISTS "Allow public insert access" ON public.event_attendees;
DROP POLICY IF EXISTS "Allow public read access" ON public.event_attendees;
DROP POLICY IF EXISTS "Allow public update access" ON public.event_attendees;

-- Create secure RLS policies for event_attendees
-- Users can only view their own attendee records or if they are admin
CREATE POLICY "Users can view own attendee records" 
ON public.event_attendees 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR 
    is_admin()
  )
);

-- Users can only insert attendee records for themselves
CREATE POLICY "Users can create own attendee records" 
ON public.event_attendees 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id
);

-- Users can only update their own attendee records or admins can update any
CREATE POLICY "Users can update own attendee records" 
ON public.event_attendees 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    auth.uid() = user_id OR 
    is_admin()
  )
);

-- Only admins can delete attendee records
CREATE POLICY "Only admins can delete attendee records" 
ON public.event_attendees 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND 
  is_admin()
);

-- Create a public view for safe attendee information that doesn't expose sensitive data
CREATE OR REPLACE VIEW public.safe_event_attendees AS
SELECT 
  id,
  event_id,
  name,
  created_at,
  CASE 
    WHEN payment_status = 'verified' THEN 'verified'
    ELSE 'pending'
  END as payment_status
FROM public.event_attendees;