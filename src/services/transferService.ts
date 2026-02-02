import { localDb } from '@/integrations/local/client';

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
        const { data: existingDestItem, error: fetchError } = await localDb
            .from('inventory_items')
            .select('id, unit_level1_quantity, unit_level2_quantity, unit_level3_quantity')
            .eq('sku', inventoryItem.sku)
            .eq('location', destinationLocation)
            .single();

        if (fetchError && !fetchError.message?.includes('not found')) {
            return { success: false, error: fetchError, message: `Error checking dest for ${inventoryItem.sku}` };
        }

        if (existingDestItem) {
            // MERGE: Update dest, Delete source
            const newL1 = existingDestItem.unit_level1_quantity + inventoryItem.unit_level1_quantity;
            const newL2 = existingDestItem.unit_level2_quantity + inventoryItem.unit_level2_quantity;
            const newL3 = existingDestItem.unit_level3_quantity + inventoryItem.unit_level3_quantity;

            const { error: updateError } = await localDb
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
            const { error: deleteError } = await localDb
                .from('inventory_items')
                .delete()
                .eq('id', inventoryItem.id);

            if (deleteError) {
                console.error('CRITICAL: Source not deleted after merge', inventoryItem.id);
            }

        } else {
            // MOVE: Just update the location
            const { error: moveError } = await localDb
                .from('inventory_items')
                .update({ location: destinationLocation })
                .eq('id', inventoryItem.id);

            if (moveError) {
                return { success: false, error: moveError, message: `Move failed for ${inventoryItem.sku}` };
            }
        }

        // Log movement
        await localDb.from('inventory_movements').insert({
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
        const { data: sourceItemData, error: fetchError } = await localDb
            .from('inventory_items')
            .select('*')
            .eq('id', sourceItemId)
            .single();

        if (fetchError || !sourceItemData) {
            return { success: false, error: fetchError, message: 'Source item not found' };
        }

        // Type casting for safety
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
        const newL1 = Math.floor(remainingPieces / level1Rate);
        const remainderAfterL1 = remainingPieces % level1Rate;
        const newL2 = 0; // Skip L2 to avoid confusion
        const newL3 = remainderAfterL1;

        console.log(`📉 Source Update: ${currentTotalPieces} -> ${remainingPieces} pieces.`);
        console.log(`   Recalculated: ${newL1} Cartons (${sourceItem.unit_level1_name}), ${newL3} Pieces (${sourceItem.unit_level3_name})`);

        // 3. Update Source Item
        const { error: updateSourceError } = await localDb
            .from('inventory_items')
            .update({
                unit_level1_quantity: newL1,
                unit_level2_quantity: newL2,
                unit_level3_quantity: newL3,
                updated_at: new Date().toISOString()
            })
            .eq('id', sourceItemId);

        if (updateSourceError) {
            return { success: false, error: updateSourceError, message: 'Failed to update source item' };
        }

        // 4. Update/Create Target Item
        const { data: existingTargetData, error: targetFetchError } = await localDb
            .from('inventory_items')
            .select('*')
            .eq('sku', sourceItem.sku)
            .eq('location', targetLocation)
            .single();

        if (targetFetchError && !targetFetchError.message?.includes('not found')) {
            console.error('Error checking target:', targetFetchError);
        }

        const existingTarget = existingTargetData as any;

        if (existingTarget) {
            // MERGE: Add to L3 (Pieces) OF TARGET
            const targetNewL3 = (existingTarget.unit_level3_quantity || 0) + quantityToTransfer;

            await localDb
                .from('inventory_items')
                .update({
                    unit_level3_quantity: targetNewL3,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingTarget.id);
        } else {
            // CREATE NEW: With L3 = quantity
            const newItem = {
                ...sourceItem,
                id: undefined, // Let DB generate ID
                location: targetLocation,
                unit_level1_quantity: 0,
                unit_level2_quantity: 0,
                unit_level3_quantity: quantityToTransfer,
                warehouse_id: sourceItem.warehouse_id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            delete newItem.id;

            await localDb.from('inventory_items').insert(newItem);
        }

        // 5. Log Movement
        await localDb.from('inventory_movements').insert({
            inventory_item_id: sourceItemId,
            movement_type: 'transfer_partial',
            quantity_boxes_before: sourceItem.unit_level1_quantity || 0,
            quantity_loose_before: sourceItem.unit_level3_quantity || 0,
            quantity_boxes_after: newL1,
            quantity_loose_after: newL3,
            quantity_boxes_change: newL1 - (sourceItem.unit_level1_quantity || 0),
            quantity_loose_change: newL3 - (sourceItem.unit_level3_quantity || 0),
            location_before: sourceItem.location,
            location_after: targetLocation,
            notes: `Partial Staging: Moved ${quantityToTransfer} pieces to ${targetLocation}`
        });

        return { success: true };

    } catch (e) {
        console.error('Partial transfer error', e);
        return { success: false, error: e, message: 'Exception during partial transfer' };
    }
};
