-- Fix the last remaining function search_path warning
-- Update update_projects_updated_at function
CREATE OR REPLACE FUNCTION public.update_projects_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;