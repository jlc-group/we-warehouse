import { localDb } from '@/integrations/local/client';
import { transferPartialStock } from './transferService';

/**
 * Picking Staging Service - ใช้ Local PostgreSQL
 * ตาราง: picking_staging
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
    const { data, error } = await localDb
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
        });

    if (error) {
        console.error('Error adding to staging:', error);
        return { success: false, error };
    }
    return { success: true, data };
};

export const getStagingItems = async (status: string = 'pending') => {
    const { data, error } = await localDb
        .from('picking_staging')
        .select('*')
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
    const { data: sourceItems, error: fetchError } = await localDb
        .from('inventory_items')
        .select('*')
        .eq('id', stagingItem.inventory_item_id);

    const sourceItem = sourceItems?.[0];

    if (fetchError || !sourceItem) {
        return { success: false, message: 'Source item not found or deleted' };
    }

    // 2. Perform Transfer (Source -> Target)
    const result = await transferPartialStock(
        sourceItem,
        stagingItem.quantity,
        stagingItem.target_location || 'PACKING',
        user
    );

    if (!result.success) {
        return result;
    }

    // 3. Update Status to Confirmed
    const { error: updateError } = await localDb
        .from('picking_staging')
        .update({ status: 'confirmed' })
        .eq('id', stagingItem.id);

    if (updateError) {
        console.error('Error updating staging status:', updateError);
        return { success: true, warning: 'Transfer success but status update failed' };
    }

    return { success: true };
};

export const cancelStagingItem = async (id: string) => {
    const { error } = await localDb
        .from('picking_staging')
        .update({ status: 'cancelled' })
        .eq('id', id);

    if (error) {
        return { success: false, error };
    }
    return { success: true };
};
