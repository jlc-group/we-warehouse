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

/**
 * Transfer specific quantity (in base units/pieces) from source to destination.
 * Handles recalculation of units (Cartons/Boxes) for the remaining quantity.
 */
export const transferPartialStock = async (
    sourceItemId: string,
    targetLocation: string,
    quantityToTransfer: number, // In base units (pieces)
    user: any
): Promise<TransferResult> => {
    try {
        console.log(`📦 Partial Transfer: ${quantityToTransfer} pieces from ${sourceItemId} to ${targetLocation}`);

        // 1. Fetch Source Item including rates
        const { data: sourceItemData, error: fetchError } = await supabase
            .from('inventory_items')
            .select('*')
            .eq('id', sourceItemId)
            .single();

        if (fetchError || !sourceItemData) {
            return { success: false, error: fetchError, message: 'Source item not found' };
        }

        // Type casting for safety (though Supabase usually infers this, sometimes explicit cast helps in mixed envs)
        const sourceItem = sourceItemData as any;

        const level1Rate = sourceItem.unit_level1_rate || 144;
        const level2Rate = sourceItem.unit_level2_rate || 12;

        // Calculate total available in pieces
        const currentTotalPieces =
            (sourceItem.unit_level1_quantity || 0) * level1Rate +
            (sourceItem.unit_level2_quantity || 0) * level2Rate +
            (sourceItem.unit_level3_quantity || 0);

        if (quantityToTransfer > currentTotalPieces) {
            return { success: false, message: `Not enough stock. Available: ${currentTotalPieces}, Requested: ${quantityToTransfer}` };
        }

        // 2. Calculate New Source Quantities (Smart Recalculation)
        const remainingPieces = currentTotalPieces - quantityToTransfer;

        // Recalculate remaining into optimal units (Greedy approach: Fill L1 -> L2 -> L3)
        // NOTE: User requested Specifically: Remainder should be L1 (Cartons) + L3 (Pieces). L2 is skipped/unused unless explicitly valid.
        // Assuming we prioritize L1 (Cartons) and put the rest in L3 (Pieces) as "Loose".

        const newL1 = Math.floor(remainingPieces / level1Rate);
        const remainderAfterL1 = remainingPieces % level1Rate;
        const newL2 = 0; // Skip L2 to avoid confusion "is this a box or a loose pack?"
        const newL3 = remainderAfterL1;

        console.log(`📉 Source Update: ${currentTotalPieces} -> ${remainingPieces} pieces.`);
        console.log(`   Recalculated: ${newL1} Cartons (${sourceItem.unit_level1_name}), ${newL3} Pieces (${sourceItem.unit_level3_name})`);

        // 3. Update Source Item
        const { error: updateSourceError } = await supabase
            .from('inventory_items')
            .update({
                unit_level1_quantity: newL1,
                unit_level2_quantity: newL2,
                unit_level3_quantity: newL3,
                updated_at: new Date().toISOString()
            } as any)
            .eq('id', sourceItemId);

        if (updateSourceError) {
            return { success: false, error: updateSourceError, message: 'Failed to update source item' };
        }

        // 4. Update/Create Target Item at 'PACKING'
        // Check if item exists at target
        const { data: existingTargetData, error: targetFetchError } = await supabase
            .from('inventory_items')
            .select('*')
            .eq('sku', sourceItem.sku)
            .eq('location', targetLocation)
            .maybeSingle();

        if (targetFetchError) {
            console.error('Error checking target:', targetFetchError);
        }

        const existingTarget = existingTargetData as any;

        if (existingTarget) {
            // MERGE: Add to L3 (Pieces) OF TARGET
            // Target at packing usually just holds loose pieces to keep it simple?
            // Or should we normalize target too? Let's just add to L3 to keep "Staging" simple.
            const targetNewL3 = (existingTarget.unit_level3_quantity || 0) + quantityToTransfer;

            await supabase
                .from('inventory_items')
                .update({
                    unit_level3_quantity: targetNewL3,
                    updated_at: new Date().toISOString()
                } as any)
                .eq('id', existingTarget.id);
        } else {
            // CREATE NEW: With L3 = quantity
            // Copy properties from source (name, sku, rates, etc.) but set dates/quantities correctly
            const newItem = {
                ...sourceItem,
                id: undefined, // Let DB generate ID
                location: targetLocation,
                unit_level1_quantity: 0,
                unit_level2_quantity: 0,
                unit_level3_quantity: quantityToTransfer,
                warehouse_id: sourceItem.warehouse_id, // Keep same warehouse
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Remove specific DB fields that shouldn't be copied directly if they exist in sourceItem object
            delete newItem.id;

            await supabase.from('inventory_items').insert(newItem);
        }

        // 5. Log Movement
        // Note: inventory_item_id expects UUID, ensures we pass valid string
        await supabase.from('inventory_movements').insert({
            inventory_item_id: sourceItemId, // Log against source ID mostly? Or maybe we need generic logging
            movement_type: 'transfer_partial', // New type
            quantity_boxes_before: sourceItem.unit_level1_quantity || 0,
            quantity_loose_before: sourceItem.unit_level3_quantity || 0, // Simplified logging
            quantity_boxes_after: newL1,
            quantity_loose_after: newL3,
            quantity_boxes_change: newL1 - (sourceItem.unit_level1_quantity || 0),
            quantity_loose_change: newL3 - (sourceItem.unit_level3_quantity || 0),
            location_before: sourceItem.location,
            location_after: targetLocation,
            notes: `Partial Staging: Moved ${quantityToTransfer} pieces to ${targetLocation}`
        } as any);

        return { success: true };

    } catch (e) {
        console.error('Partial transfer error', e);
        return { success: false, error: e, message: 'Exception during partial transfer' };
    }
};
