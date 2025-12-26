import { supabase } from '@/integrations/supabase/client';

export interface TransferResult {
    success: boolean;
    message?: string;
    error?: any;
}

export const executeTransfer = async (
    inventoryItem: any,
    destinationLocation: string,
    user: any
): Promise<TransferResult> => {
    try {
        // 1. Check if destination item exists for this SKU
        const { data: existingDestItem, error: fetchError } = await supabase
            .from('inventory_items')
            .select('id, unit_level1_quantity, unit_level2_quantity, unit_level3_quantity')
            .eq('sku', inventoryItem.sku)
            .eq('location', destinationLocation)
            .maybeSingle();

        if (fetchError) {
            return { success: false, error: fetchError, message: `Error checking dest for ${inventoryItem.sku}` };
        }

        if (existingDestItem) {
            // MERGE: Update dest, Delete source
            const newL1 = existingDestItem.unit_level1_quantity + inventoryItem.unit_level1_quantity;
            const newL2 = existingDestItem.unit_level2_quantity + inventoryItem.unit_level2_quantity;
            const newL3 = existingDestItem.unit_level3_quantity + inventoryItem.unit_level3_quantity;

            const { error: updateError } = await supabase
                .from('inventory_items')
                .update({
                    unit_level1_quantity: newL1,
                    unit_level2_quantity: newL2,
                    unit_level3_quantity: newL3
                })
                .eq('id', existingDestItem.id);

            if (updateError) {
                return { success: false, error: updateError, message: `Merge failed for ${inventoryItem.sku}` };
            }

            // Delete source
            const { error: deleteError } = await supabase
                .from('inventory_items')
                .delete()
                .eq('id', inventoryItem.id);

            if (deleteError) {
                console.error('CRITICAL: Source not deleted after merge', inventoryItem.id);
            }

        } else {
            // MOVE: Just update the location
            const { error: moveError } = await supabase
                .from('inventory_items')
                .update({ location: destinationLocation })
                .eq('id', inventoryItem.id);

            if (moveError) {
                return { success: false, error: moveError, message: `Move failed for ${inventoryItem.sku}` };
            }
        }

        // Log movement
        await supabase.from('inventory_movements').insert({
            inventory_item_id: inventoryItem.id,
            movement_type: 'transfer',
            quantity_boxes_before: inventoryItem.unit_level1_quantity,
            quantity_loose_before: inventoryItem.unit_level2_quantity,
            quantity_boxes_after: inventoryItem.unit_level1_quantity, // Moved same amount
            quantity_loose_after: inventoryItem.unit_level2_quantity,
            quantity_boxes_change: 0,
            quantity_loose_change: 0,
            location_before: inventoryItem.location,
            location_after: destinationLocation,
            notes: `Quick Transfer to ${destinationLocation} (Staging)`
        });

        return { success: true };
    } catch (e) {
        console.error('Transfer execution error', e);
        return { success: false, error: e, message: 'Exception during transfer' };
    }
};
