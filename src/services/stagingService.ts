import { supabase } from '@/integrations/supabase/client';
import { transferPartialStock } from './transferService';

/**
 * SQL MIGRATION REQUIRED:
 * 
 * CREATE TABLE IF NOT EXISTS public.picking_staging (
 *     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *     inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id),
 *     product_code TEXT NOT NULL,
 *     location TEXT NOT NULL,
 *     quantity NUMERIC NOT NULL,
 *     unit TEXT,
 *     target_location TEXT DEFAULT 'PACKING',
 *     status TEXT DEFAULT 'pending', -- pending, confirmed, cancelled
 *     user_id UUID,
 *     created_at TIMESTAMPTZ DEFAULT NOW(),
 *     updated_at TIMESTAMPTZ DEFAULT NOW(),
 *     metadata JSONB
 * );
 * 
 * ALTER TABLE public.picking_staging ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Enable all for authenticated" ON public.picking_staging FOR ALL TO authenticated USING (true) WITH CHECK (true);
 */

export interface StagingItem {
    id: string;
    inventory_item_id: string;
    product_code: string;
    location: string;
    quantity: number;
    unit: string;
    target_location: string;
    status: 'pending' | 'confirmed' | 'cancelled';
    created_at: string;
    user_id?: string;
}

export const addToStaging = async (
    inventoryItemId: string,
    productCode: string,
    location: string,
    quantity: number,
    unit: string,
    targetLocation: string = 'PACKING',
    userId?: string,
    metadata?: any
) => {
    const { data, error } = await supabase
        .from('picking_staging')
        .insert({
            inventory_item_id: inventoryItemId,
            product_code: productCode,
            location: location,
            quantity: quantity,
            unit: unit,
            target_location: targetLocation,
            status: 'pending',
            user_id: userId,
            metadata: metadata
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding to staging:', error);
        return { success: false, error };
    }
    return { success: true, data };
};

export const getStagingItems = async (status: string = 'pending') => {
    const { data, error } = await supabase
        .from('picking_staging')
        .select(`
      *,
      inventory_items:inventory_item_id (
        product_name,
        unit_level1_name,
        unit_level1_rate
      )
    `)
        .eq('status', status)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching staging items:', error);
        return [];
    }
    return data;
};

export const confirmStagingItem = async (stagingItem: any, user: any) => {
    // 1. Fetch current inventory item (Source)
    const { data: sourceItem, error: fetchError } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('id', stagingItem.inventory_item_id)
        .single();

    if (fetchError || !sourceItem) {
        return { success: false, message: 'Source item not found or deleted' };
    }

    // 2. Perform Transfer (Source -> Target)
    // Note: sourceItem might have changed (e.g. qty reduced). transferPartialStock checks this.
    const result = await transferPartialStock(
        sourceItem,
        stagingItem.quantity, // Quantity to transfer
        stagingItem.target_location || 'PACKING',
        user
    );

    if (!result.success) {
        return result;
    }

    // 3. Update Status to Confirmed
    const { error: updateError } = await supabase
        .from('picking_staging')
        .update({ status: 'confirmed' })
        .eq('id', stagingItem.id);

    if (updateError) {
        console.error('Error updating staging status:', updateError);
        // Warning: Transfer happened but status update failed.
        return { success: true, warning: 'Transfer success but status update failed' };
    }

    return { success: true };
};

export const cancelStagingItem = async (id: string) => {
    const { error } = await supabase
        .from('picking_staging')
        .update({ status: 'cancelled' })
        .eq('id', id);

    if (error) {
        return { success: false, error };
    }
    return { success: true };
};
