import { localDb } from '@/integrations/local/client';
import { transferPartialStock } from './transferService';
import { recordShip, recordReceive, recordMove } from './movementService';

/**
 * Staging Service - Mobile Staging Queue
 * ทุก operation จาก mobile จะเข้า queue ก่อน → รอ confirm → จึงอัปเดต inventory จริง
 * ตาราง: mobile_staging_queue
 */

// ============ Types ============

export type StagingOperationType = 'pick' | 'receive' | 'move';

export interface StagingQueueItem {
    id: string;
    operation_type: StagingOperationType;
    inventory_item_id?: string;
    sku?: string;
    product_name?: string;
    quantity: number;
    location_from?: string;
    location_to?: string;
    reference_type?: string;
    reference_id?: string;
    status: 'pending' | 'confirmed' | 'cancelled';
    created_by?: string;
    confirmed_by?: string;
    confirmed_at?: string;
    metadata?: any;
    created_at: string;
}

// ============ Queue Operations ============

/**
 * เพิ่มรายการเข้า Staging Queue (จุดพัก)
 */
export const addToStagingQueue = async (
    operationType: StagingOperationType,
    data: {
        inventoryItemId?: string;
        sku?: string;
        productName?: string;
        quantity: number;
        locationFrom?: string;
        locationTo?: string;
        referenceType?: string;
        referenceId?: string;
        createdBy?: string;
        metadata?: any;
    }
): Promise<{ success: boolean; error?: any }> => {
    try {
        const { error } = await localDb
            .from('mobile_staging_queue')
            .insert({
                operation_type: operationType,
                inventory_item_id: data.inventoryItemId || null,
                sku: data.sku || null,
                product_name: data.productName || null,
                quantity: data.quantity,
                location_from: data.locationFrom || null,
                location_to: data.locationTo || null,
                reference_type: data.referenceType || 'manual',
                reference_id: data.referenceId || null,
                status: 'pending',
                created_by: data.createdBy || 'system',
                metadata: data.metadata || {}
            });

        if (error) {
            console.error('Error adding to staging queue:', error);
            return { success: false, error };
        }
        return { success: true };
    } catch (e) {
        console.error('Staging queue insert exception:', e);
        return { success: false, error: e };
    }
};

/**
 * ดึงรายการจาก Staging Queue
 */
export const getStagingQueue = async (
    status: string = 'pending',
    operationType?: StagingOperationType
): Promise<StagingQueueItem[]> => {
    try {
        let query = localDb
            .from('mobile_staging_queue')
            .select('*')
            .eq('status', status)
            .order('created_at', { ascending: false });

        if (operationType) {
            query = query.eq('operation_type', operationType);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching staging queue:', error);
            return [];
        }
        return (data as StagingQueueItem[]) || [];
    } catch (e) {
        console.error('Staging queue fetch exception:', e);
        return [];
    }
};

/**
 * ยืนยันรายการ — ทำ inventory action จริงตาม operation_type
 */
export const confirmStagingQueueItem = async (
    item: StagingQueueItem,
    confirmedBy: string
): Promise<{ success: boolean; message?: string; error?: any }> => {
    try {
        let result: { success: boolean; message?: string; error?: any } = { success: false };

        switch (item.operation_type) {
            case 'pick':
                result = await executePick(item);
                break;
            case 'receive':
                result = await executeReceive(item);
                break;
            case 'move':
                result = await executeMove(item, { email: confirmedBy });
                break;
            default:
                return { success: false, message: `Unknown operation: ${item.operation_type}` };
        }

        if (!result.success) {
            return result;
        }

        // Mark as confirmed
        const { error: updateError } = await localDb
            .from('mobile_staging_queue')
            .update({
                status: 'confirmed',
                confirmed_by: confirmedBy,
                confirmed_at: new Date().toISOString()
            })
            .eq('id', item.id);

        if (updateError) {
            console.error('Error updating staging status:', updateError);
            return { success: true, message: 'Action done but status update failed' };
        }

        return { success: true };
    } catch (e) {
        console.error('Confirm staging exception:', e);
        return { success: false, error: e, message: 'Exception during confirmation' };
    }
};

/**
 * ยกเลิกรายการ
 */
export const cancelStagingQueueItem = async (
    id: string,
    cancelledBy?: string
): Promise<{ success: boolean; error?: any }> => {
    try {
        const { error } = await localDb
            .from('mobile_staging_queue')
            .update({
                status: 'cancelled',
                confirmed_by: cancelledBy || null,
                confirmed_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) {
            return { success: false, error };
        }
        return { success: true };
    } catch (e) {
        return { success: false, error: e };
    }
};

// ============ Confirm Executors ============

/**
 * Pick Confirm: หักสต็อกจาก inventory_items + recordShip + update order_items
 */
async function executePick(item: StagingQueueItem) {
    try {
        // 1. Find inventory item by SKU + location
        const { data: invItems } = await localDb
            .from('inventory_items')
            .select('*')
            .eq('sku', item.sku)
            .eq('location', item.location_from)
            .gt('quantity_pieces', 0);

        const invItem = (invItems as any[])?.[0];

        if (invItem) {
            // Deduct from inventory_items
            const newQty = Math.max(0, (invItem.quantity_pieces || 0) - item.quantity);
            await localDb
                .from('inventory_items')
                .update({
                    quantity_pieces: newQty,
                    updated_at: new Date().toISOString()
                })
                .eq('id', invItem.id);
        }

        // 2. Record movement log
        await recordShip(
            item.sku || '',
            item.product_name || '',
            item.location_from || '',
            item.quantity,
            undefined,
            item.reference_id || undefined,
            `Confirmed pick from staging`,
            item.created_by || 'system'
        );

        // 3. Update order_items status if we have the order_item_id
        const orderItemId = item.metadata?.orderItemId;
        if (orderItemId) {
            await localDb.from('order_items')
                .update({
                    picked_quantity_level3: item.quantity,
                    status: 'PICKED',
                    picked_at: new Date().toISOString()
                })
                .eq('id', orderItemId);
        }

        return { success: true };
    } catch (e) {
        console.error('Execute pick error:', e);
        return { success: false, message: 'Pick execution failed', error: e };
    }
}

/**
 * Receive Confirm: เพิ่มสต็อกใน inventory_items + recordReceive + update receipt_items
 */
async function executeReceive(item: StagingQueueItem) {
    try {
        // 1. Upsert into inventory_items at the target location
        const { data: existing } = await localDb
            .from('inventory_items')
            .select('*')
            .eq('sku', item.sku)
            .eq('location', item.location_to)
            .single();

        if (existing) {
            // Add quantity to existing
            const newQty = ((existing as any).quantity_pieces || 0) + item.quantity;
            const newL3 = ((existing as any).unit_level3_quantity || 0) + item.quantity;
            await localDb
                .from('inventory_items')
                .update({
                    quantity_pieces: newQty,
                    unit_level3_quantity: newL3,
                    updated_at: new Date().toISOString()
                })
                .eq('id', (existing as any).id);
        } else {
            // Create new inventory item
            await localDb.from('inventory_items').insert({
                sku: item.sku,
                product_name: item.product_name,
                location: item.location_to,
                quantity_pieces: item.quantity,
                unit_level3_quantity: item.quantity,
                unit_level3_name: 'ชิ้น',
                unit_level1_quantity: 0,
                unit_level2_quantity: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        }

        // 2. Record movement log
        await recordReceive(
            item.sku || '',
            item.product_name || '',
            item.location_to || '',
            item.quantity,
            undefined,
            `Confirmed receive from staging`,
            item.created_by || 'system'
        );

        // 3. Update inbound_receipt_items
        const receiptItemId = item.metadata?.receiptItemId;
        if (receiptItemId) {
            // Get current received qty first
            const { data: receiptItem } = await localDb
                .from('inbound_receipt_items')
                .select('quantity_received')
                .eq('id', receiptItemId)
                .single();

            const currentReceived = (receiptItem as any)?.quantity_received || 0;
            await localDb.from('inbound_receipt_items')
                .update({
                    quantity_received: currentReceived + item.quantity,
                    location: item.location_to
                })
                .eq('id', receiptItemId);
        }

        return { success: true };
    } catch (e) {
        console.error('Execute receive error:', e);
        return { success: false, message: 'Receive execution failed', error: e };
    }
}

/**
 * Move Confirm: transferPartialStock + recordMove
 */
async function executeMove(item: StagingQueueItem, user: any) {
    try {
        if (!item.inventory_item_id) {
            return { success: false, message: 'No inventory_item_id for move' };
        }

        // 1. Transfer inventory
        const transferResult = await transferPartialStock(
            item.inventory_item_id,
            item.location_to || '',
            item.quantity,
            user
        );

        if (!transferResult.success) {
            return transferResult;
        }

        // 2. Record movement log
        await recordMove(
            item.sku || item.product_name || '',
            item.product_name || '',
            item.location_from || '',
            item.location_to || '',
            item.quantity,
            undefined,
            `Confirmed move from staging`,
            item.created_by || 'system'
        );

        return { success: true };
    } catch (e) {
        console.error('Execute move error:', e);
        return { success: false, message: 'Move execution failed', error: e };
    }
}

// ============ Legacy Support (keeping old interface) ============

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
    const { data: sourceItems, error: fetchError } = await localDb
        .from('inventory_items')
        .select('*')
        .eq('id', stagingItem.inventory_item_id);

    const sourceItem = sourceItems?.[0];

    if (fetchError || !sourceItem) {
        return { success: false, message: 'Source item not found or deleted' };
    }

    const result = await transferPartialStock(
        stagingItem.inventory_item_id,
        stagingItem.target_location || 'PACKING',
        stagingItem.quantity,
        user
    );

    if (!result.success) {
        return result;
    }

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
