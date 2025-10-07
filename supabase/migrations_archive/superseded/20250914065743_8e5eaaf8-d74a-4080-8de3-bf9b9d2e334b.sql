-- Fix critical security issue: Secure saved_datasets table
-- Add user_id column to link datasets to users
ALTER TABLE public.saved_datasets ADD COLUMN IF NOT EXISTS user_id uuid;

-- Set user_id to auth.uid() for existing records (if any)
UPDATE public.saved_datasets SET user_id = auth.uid() WHERE user_id IS NULL;

-- Make user_id required for new records
ALTER TABLE public.saved_datasets ALTER COLUMN user_id SET NOT NULL;

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can create saved datasets" ON public.saved_datasets;
DROP POLICY IF EXISTS "Anyone can delete saved datasets" ON public.saved_datasets;
DROP POLICY IF EXISTS "Anyone can update saved datasets" ON public.saved_datasets;
DROP POLICY IF EXISTS "Anyone can view saved datasets" ON public.saved_datasets;

-- Create secure RLS policies
-- Users can only view their own datasets
CREATE POLICY "Users can view own datasets" 
ON public.saved_datasets 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id
);

-- Users can only create datasets for themselves
CREATE POLICY "Users can create own datasets" 
ON public.saved_datasets 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id
);

-- Users can only update their own datasets
CREATE POLICY "Users can update own datasets" 
ON public.saved_datasets 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id
);

-- Users can only delete their own datasets
CREATE POLICY "Users can delete own datasets" 
ON public.saved_datasets 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND 
  auth.uid() = user_id
);

-- Create index for better performance on user_id queries
CREATE INDEX IF NOT EXISTS idx_saved_datasets_user_id ON public.saved_datasets(user_id);