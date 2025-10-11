import { supabase } from '@/integrations/supabase/client';

/**
 * Service to fix and populate unit-level quantities for inventory items
 */
export class InventoryDataFixService {
  /**
   * Populate missing unit-level quantities for all inventory items
   * This calculates unit_level1_quantity, unit_level2_quantity, unit_level3_quantity
   * from quantity_pieces for items that don't have these values set
   */
  static async populateUnitLevelQuantities(): Promise<{
    success: boolean;
    updatedCount: number;
    errors: string[];
  }> {
    try {
      console.log('🔧 Starting unit-level quantities population...');

      // Fetch all inventory items that have quantity_pieces but missing unit quantities
      const { data: items, error: fetchError } = await supabase
        .from('inventory_items')
        .select('*')
        .gt('quantity_pieces', 0);

      if (fetchError) throw fetchError;
      if (!items || items.length === 0) {
        console.log('No items to update');
        return { success: true, updatedCount: 0, errors: [] };
      }

      console.log(`Found ${items.length} inventory items`);

      let updatedCount = 0;
      const errors: string[] = [];

      // Process each item
      for (const item of items) {
        try {
          const quantityPieces = item.quantity_pieces || 0;
          const cartonRate = item.unit_level1_rate || 1;
          const boxRate = item.unit_level2_rate || 1;

          // Check if unit quantities are already set
          const hasUnitQuantities =
            (item.unit_level1_quantity && item.unit_level1_quantity > 0) ||
            (item.unit_level2_quantity && item.unit_level2_quantity > 0) ||
            (item.unit_level3_quantity && item.unit_level3_quantity > 0);

          // Skip if already has unit quantities
          if (hasUnitQuantities) {
            continue;
          }

          // Calculate unit quantities
          const carton = Math.floor(quantityPieces / cartonRate);
          const remainingAfterCarton = quantityPieces % cartonRate;
          const box = Math.floor(remainingAfterCarton / boxRate);
          const pieces = remainingAfterCarton % boxRate;

          console.log(
            `Updating item ${item.id}: ${quantityPieces} pieces -> ${carton} carton, ${box} box, ${pieces} pieces`
          );

          // Update the item
          const { error: updateError } = await supabase
            .from('inventory_items')
            .update({
              unit_level1_quantity: carton,
              unit_level2_quantity: box,
              unit_level3_quantity: pieces,
            })
            .eq('id', item.id);

          if (updateError) {
            console.error(`Error updating item ${item.id}:`, updateError);
            errors.push(`Item ${item.id}: ${updateError.message}`);
          } else {
            updatedCount++;
          }
        } catch (error: any) {
          console.error(`Error processing item ${item.id}:`, error);
          errors.push(`Item ${item.id}: ${error.message}`);
        }
      }

      console.log(
        `✅ Population complete. Updated ${updatedCount} items, ${errors.length} errors`
      );

      return {
        success: errors.length === 0,
        updatedCount,
        errors,
      };
    } catch (error: any) {
      console.error('Error in populateUnitLevelQuantities:', error);
      return {
        success: false,
        updatedCount: 0,
        errors: [error.message],
      };
    }
  }

  /**
   * Verify that all inventory items have correct unit-level quantities
   */
  static async verifyUnitLevelQuantities(): Promise<{
    total: number;
    correct: number;
    incorrect: number;
    missing: number;
  }> {
    try {
      const { data: items, error } = await supabase
        .from('inventory_items')
        .select('*')
        .gt('quantity_pieces', 0);

      if (error) throw error;
      if (!items) return { total: 0, correct: 0, incorrect: 0, missing: 0 };

      let correct = 0;
      let incorrect = 0;
      let missing = 0;

      for (const item of items) {
        const quantityPieces = item.quantity_pieces || 0;
        const cartonRate = item.unit_level1_rate || 1;
        const boxRate = item.unit_level2_rate || 1;

        const expectedCarton = Math.floor(quantityPieces / cartonRate);
        const remainingAfterCarton = quantityPieces % cartonRate;
        const expectedBox = Math.floor(remainingAfterCarton / boxRate);
        const expectedPieces = remainingAfterCarton % boxRate;

        const hasUnitQuantities =
          item.unit_level1_quantity !== null ||
          item.unit_level2_quantity !== null ||
          item.unit_level3_quantity !== null;

        if (!hasUnitQuantities) {
          missing++;
        } else if (
          item.unit_level1_quantity === expectedCarton &&
          item.unit_level2_quantity === expectedBox &&
          item.unit_level3_quantity === expectedPieces
        ) {
          correct++;
        } else {
          incorrect++;
        }
      }

      return {
        total: items.length,
        correct,
        incorrect,
        missing,
      };
    } catch (error) {
      console.error('Error verifying unit quantities:', error);
      return { total: 0, correct: 0, incorrect: 0, missing: 0 };
    }
  }
}
