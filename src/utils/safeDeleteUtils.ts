import { supabase } from '@/integrations/supabase/client';

/**
 * Safe Delete Utility for Inventory Items
 * Handles trigger conflicts and foreign key constraints
 * to enable REAL deletion (not soft delete/hiding)
 */

interface SafeDeleteResult {
  success: boolean;
  deleted: boolean;
  error?: string;
  itemId?: string;
}

/**
 * Safely delete an inventory item by handling trigger conflicts
 * This performs REAL deletion - the data will be permanently removed
 */
export async function safeDeleteInventoryItem(itemId: string): Promise<SafeDeleteResult> {
  try {
    console.log('🗑️ Starting optimized delete for inventory item:', itemId);

    // Option 1: Try simple delete first (might work if no related records)
    const { error: directDeleteError } = await (supabase
      .from('inventory_items') as any)
      .delete()
      .eq('id' as any, itemId as any);

    if (!directDeleteError) {
      console.log('✅ Direct delete successful');
      return {
        success: true,
        deleted: true,
        itemId
      };
    }

    // If direct delete failed with constraint violation, go directly to cleanup
    if (directDeleteError.code === '23503' || directDeleteError.message.includes('violates foreign key constraint')) {
      console.log('🧹 Direct delete failed due to constraints, using cleanup method...');
      return await cleanupAndDelete(itemId);
    }

    // Other errors
    console.error('❌ Unexpected delete error:', directDeleteError);
    throw directDeleteError;

  } catch (error) {
    console.error('❌ Safe delete failed:', error);
    return {
      success: false,
      deleted: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      itemId
    };
  }
}

// Removed triggerSafeDelete function to avoid calling non-existent RPC functions

/**
 * Clean up related records and then delete the item
 * Removes movement records that reference this item first
 */
async function cleanupAndDelete(itemId: string): Promise<SafeDeleteResult> {
  try {
    console.log('🧹 Starting cleanup and delete...');

    // Step 1: Get the item to make sure it exists
    const { data: item, error: fetchError } = await (supabase
      .from('inventory_items') as any)
      .select('id, sku, location, product_name')
      .eq('id' as any, itemId as any)
      .single();

    if (fetchError || !item) {
      return {
        success: false,
        deleted: false,
        error: 'Item not found',
        itemId
      };
    }

    const invItem: any = item as any;
    console.log('📦 Found item to delete:', {
      id: invItem.id,
      sku: invItem.sku,
      location: invItem.location,
      product_name: invItem.product_name
    });

    // Step 2: Delete related movement records first (silently)
    console.log('🗑️ Cleaning up related records...');

    try {
      await (supabase
        .from('inventory_movements') as any)
        .delete()
        .eq('inventory_item_id' as any, itemId as any);
    } catch (error) {
      // Silent cleanup - movements might not exist
    }

    // Step 3: Delete any other related records that might cause conflicts (silently)
    try {
      await (supabase
        .from('order_items') as any)
        .delete()
        .eq('inventory_item_id' as any, itemId as any);
    } catch (error) {
      // Silent cleanup - order items might not exist
    }

    // Step 3.5: Delete system_events that reference this item in metadata
    // This prevents foreign key constraint violations
    try {
      console.log('🗑️ Cleaning up system_events...');
      await supabase
        .from('system_events')
        .delete()
        .or(`metadata->>inventory_item_id.eq.${itemId},metadata->>item_id.eq.${itemId}`);
    } catch (error) {
      console.warn('⚠️ Could not clean up system_events:', error);
      // Continue anyway - this is not critical
    }

    // Step 3.7: Nullify user_id to prevent FK violations in triggers that log deletions
    // Some database triggers may insert into system_events using OLD.user_id from inventory_items.
    // If that user_id is not a valid auth.users id, it will violate the FK. Set it to NULL first.
    try {
      await (supabase
        .from('inventory_items') as any)
        .update({ user_id: null })
        .eq('id' as any, itemId as any);
    } catch (error) {
      console.warn('⚠️ Could not nullify user_id before delete (continuing):', error);
      // Proceed with deletion attempt regardless
    }

    // Step 4: Now try to delete the main inventory item
    console.log('🗑️ Deleting main inventory item...');
    const { error: finalDeleteError } = await (supabase
      .from('inventory_items') as any)
      .delete()
      .eq('id' as any, itemId as any);

    if (finalDeleteError) {
      console.error('❌ Final delete failed:', finalDeleteError);
      return {
        success: false,
        deleted: false,
        error: `Final delete failed: ${finalDeleteError.message}`,
        itemId
      };
    }

    // If no error returned, assume deletion succeeded

    console.log('✅ Cleanup and delete successful');
    return {
      success: true,
      deleted: true,
      itemId
    };

  } catch (error) {
    console.error('❌ Cleanup and delete failed:', error);
    return {
      success: false,
      deleted: false,
      error: error instanceof Error ? error.message : 'Cleanup failed',
      itemId
    };
  }
}

/**
 * Delete all inventory items at a specific location
 * Useful for clearing entire locations
 */
export async function safeDeleteLocationItems(location: string): Promise<{
  success: boolean;
  deletedCount: number;
  errors: string[];
}> {
  try {
    console.log('🗑️ Starting safe delete for entire location:', location);

    // Get all items at this location
    const { data: items, error: fetchError } = await (supabase
      .from('inventory_items') as any)
      .select('id, sku, product_name')
      .eq('location' as any, location as any);

    if (fetchError) {
      throw fetchError;
    }

    if (!items || items.length === 0) {
      console.log('ℹ️ No items found at location:', location);
      return {
        success: true,
        deletedCount: 0,
        errors: []
      };
    }

    console.log(`📦 Found ${items.length} items to delete at location:`, location);

    // Delete each item
    const itemsArray: any[] = (items as any[]) || [];
    const results = await Promise.all(
      itemsArray.map((item: any) => safeDeleteInventoryItem(item.id as string))
    );

    // Count successes and collect errors
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`✅ Deleted ${successful.length}/${items.length} items from location:`, location);

    if (failed.length > 0) {
      console.log('⚠️ Some deletions failed:', failed.map(f => f.error));
    }

    return {
      success: failed.length === 0,
      deletedCount: successful.length,
      errors: failed.map(f => f.error || 'Unknown error')
    };

  } catch (error) {
    console.error('❌ Location delete failed:', error);
    return {
      success: false,
      deletedCount: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}