-- Create inventory_items table for warehouse management
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name TEXT NOT NULL,
  product_code TEXT NOT NULL,
  location TEXT NOT NULL, -- Format: A/1/01 (Row/Level/Position)
  lot TEXT,
  mfd DATE, -- Manufacturing date
  quantity_boxes INTEGER NOT NULL DEFAULT 0,
  quantity_loose INTEGER NOT NULL DEFAULT 0,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT inventory_items_quantities_check CHECK (quantity_boxes >= 0 AND quantity_loose >= 0),
  CONSTRAINT inventory_items_location_format_check CHECK (location ~ '^[A-Z]/\d+/\d+$')
);

-- Enable Row Level Security
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for inventory_items
-- Users can view their own inventory items
CREATE POLICY "Users can view own inventory items" 
ON public.inventory_items 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own inventory items
CREATE POLICY "Users can create own inventory items" 
ON public.inventory_items 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own inventory items
CREATE POLICY "Users can update own inventory items" 
ON public.inventory_items 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own inventory items
CREATE POLICY "Users can delete own inventory items" 
ON public.inventory_items 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_inventory_items_user_id ON public.inventory_items(user_id);
CREATE INDEX idx_inventory_items_location ON public.inventory_items(location);
CREATE INDEX idx_inventory_items_product_code ON public.inventory_items(product_code);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_inventory_updated_at();