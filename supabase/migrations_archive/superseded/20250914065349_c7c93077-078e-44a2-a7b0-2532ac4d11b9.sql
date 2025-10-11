-- Enable RLS on event_attendees table (this was missing!)
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

-- Also check and enable RLS on other tables that may be missing it
-- Enable RLS on other tables that may need it
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_datasets ENABLE ROW LEVEL SECURITY;

-- Fix search_path issues for existing functions
CREATE OR REPLACE FUNCTION public.update_projects_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;