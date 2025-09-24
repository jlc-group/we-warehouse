import { supabase } from '@/integrations/supabase/client';
import { secureGatewayClient } from '@/utils/secureGatewayClient';
import { logInventoryEvent } from '@/services/eventLoggingService';

// ฟังก์ชันตัดสต็อกจริง - ง่ายและทำงานได้
export async function deductStock(inventoryItemId: string, quantities: {
  level1: number;
  level2: number;
  level3: number;
}) {
  console.log('📦 Deducting stock for item:', inventoryItemId, quantities);

  // ดึงสต็อกปัจจุบัน
  const { data: currentItem, error: fetchError } = await supabase
    .from('inventory_items')
    .select('id, product_name, unit_level1_quantity, unit_level2_quantity, unit_level3_quantity')
    .eq('id', inventoryItemId)
    .single();

  if (fetchError) {
    console.error('❌ Error fetching current stock:', fetchError);
    throw new Error('ไม่สามารถดึงข้อมูลสต็อกปัจจุบัน');
  }

  // คำนวณสต็อกใหม่
  const newLevel1 = (currentItem.unit_level1_quantity || 0) - quantities.level1;
  const newLevel2 = (currentItem.unit_level2_quantity || 0) - quantities.level2;
  const newLevel3 = (currentItem.unit_level3_quantity || 0) - quantities.level3;

  // ตรวจสอบว่าสต็อกเพียงพอ
  if (newLevel1 < 0 || newLevel2 < 0 || newLevel3 < 0) {
    throw new Error(`สต็อกไม่เพียงพอสำหรับ ${currentItem.product_name}`);
  }

  const totalRemaining = (newLevel1 || 0) + (newLevel2 || 0) + (newLevel3 || 0);

  // Use secure gateway for stock deduction to handle foreign key constraints properly
  if (totalRemaining === 0) {
    console.log('📦 Remaining quantities are zero after deduction, using secure gateway to handle deletion:', {
      id: inventoryItemId,
      product_name: currentItem.product_name
    });

    try {
      const deductResult = await secureGatewayClient.mutate(
        'deductStock',
        {
          id: inventoryItemId,
          quantities: {
            level1: quantities.level1,
            level2: quantities.level2,
            level3: quantities.level3
          }
        }
      );

      if (!deductResult.success) {
        throw new Error(deductResult.error || 'การตัดสต็อกไม่สำเร็จ');
      }

      console.log('✅ Stock deducted via secure gateway:', deductResult.data);
      const data = deductResult.data as any;
      return {
        success: true,
        deleted: data?.deleted || false,
        isEmpty: data?.isEmpty || false,
        newQuantities: data?.newQuantities || {
          level1: 0,
          level2: 0,
          level3: 0
        }
      };
    } catch (gatewayError) {
      console.error('❌ Secure gateway deduction failed, falling back to direct update:', gatewayError);
      // Fallback: Just update to zero quantities instead of deleting
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({
          unit_level1_quantity: 0,
          unit_level2_quantity: 0,
          unit_level3_quantity: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', inventoryItemId);

      if (updateError) {
        console.error('❌ Error updating stock to zero:', updateError);
        throw new Error(`ไม่สามารถอัปเดตสต็อกของ ${currentItem.product_name} ได้`);
      }

      return {
        success: true,
        deleted: false, // Could not delete due to constraints, but updated to zero
        isEmpty: true,  // Functionally empty
        newQuantities: {
          level1: 0,
          level2: 0,
          level3: 0
        }
      };
    }
  }

  // Use secure gateway for partial stock updates too
  try {
    const updateResult = await secureGatewayClient.mutate(
      'updateInventoryItem',
      {
        id: inventoryItemId,
        updates: {
          unit_level1_quantity: newLevel1,
          unit_level2_quantity: newLevel2,
          unit_level3_quantity: newLevel3
        }
      }
    );

    if (!updateResult.success) {
      throw new Error(updateResult.error || 'การอัปเดตสต็อกไม่สำเร็จ');
    }

    console.log('✅ Stock updated via secure gateway');
  } catch (gatewayError) {
    console.error('❌ Secure gateway update failed, using direct update:', gatewayError);
    // Fallback to direct Supabase update
    const { error: updateError } = await supabase
      .from('inventory_items')
      .update({
        unit_level1_quantity: newLevel1,
        unit_level2_quantity: newLevel2,
        unit_level3_quantity: newLevel3,
        updated_at: new Date().toISOString()
      })
      .eq('id', inventoryItemId);

    if (updateError) {
      console.error('❌ Error updating stock:', updateError);
      throw new Error(`ไม่สามารถอัปเดตสต็อกของ ${currentItem.product_name}`);
    }
  }

  console.log('✅ Stock deducted successfully for:', currentItem.product_name);

  // Log the stock deduction event
  try {
    await logInventoryEvent(
      'update',
      inventoryItemId,
      `ตัดสต็อก: ${currentItem.product_name}`,
      `ตัดสต็อก ${quantities.level1} ลัง ${quantities.level2} เศษ ${quantities.level3} ชิ้น`,
      {
        unit_level1_quantity: currentItem.unit_level1_quantity,
        unit_level2_quantity: currentItem.unit_level2_quantity,
        unit_level3_quantity: currentItem.unit_level3_quantity,
        product_name: currentItem.product_name
      },
      {
        unit_level1_quantity: newLevel1,
        unit_level2_quantity: newLevel2,
        unit_level3_quantity: newLevel3,
        product_name: currentItem.product_name
      },
      {
        deducted_quantities: quantities,
        remaining_total: newLevel1 + newLevel2 + newLevel3
      }
    );
  } catch (logError) {
    console.warn('Failed to log stock deduction event:', logError);
  }

  return {
    success: true,
    deleted: false,
    newQuantities: {
      level1: newLevel1,
      level2: newLevel2,
      level3: newLevel3
    }
  };
}

// ฟังก์ชันตรวจสอบสต็อกเพียงพอ
export async function validateStock(inventoryItemId: string, requiredQuantities: {
  level1: number;
  level2: number;
  level3: number;
}) {
  try {
    // Try secure gateway first
    const result = await secureGatewayClient.get('inventory', { id: inventoryItemId });

    if (!result.success || !result.data) {
      throw new Error('ไม่พบข้อมูลสินค้าในระบบ');
    }

    const item = result.data as any;

    const available1 = item.unit_level1_quantity || 0;
    const available2 = item.unit_level2_quantity || 0;
    const available3 = item.unit_level3_quantity || 0;

    if (requiredQuantities.level1 > available1) {
      throw new Error(`สต็อกไม่เพียงพอ: ${item.product_name} ต้องการ ${requiredQuantities.level1} ลัง แต่มีเพียง ${available1} ลัง`);
    }

    if (requiredQuantities.level2 > available2) {
      throw new Error(`สต็อกไม่เพียงพอ: ${item.product_name} ต้องการ ${requiredQuantities.level2} เศษ แต่มีเพียง ${available2} เศษ`);
    }

    if (requiredQuantities.level3 > available3) {
      throw new Error(`สต็อกไม่เพียงพอ: ${item.product_name} ต้องการ ${requiredQuantities.level3} ชิ้น แต่มีเพียง ${available3} ชิ้น`);
    }

    return true;
  } catch (gatewayError) {
    console.error('❌ Secure gateway validation failed, falling back to direct query:', gatewayError);

    // Fallback to direct Supabase query
    const { data: item, error } = await supabase
      .from('inventory_items')
      .select('id, product_name, unit_level1_quantity, unit_level2_quantity, unit_level3_quantity')
      .eq('id', inventoryItemId)
      .single();

    if (error) {
      throw new Error('ไม่สามารถตรวจสอบสต็อก');
    }

    const available1 = item.unit_level1_quantity || 0;
    const available2 = item.unit_level2_quantity || 0;
    const available3 = item.unit_level3_quantity || 0;

    if (requiredQuantities.level1 > available1) {
      throw new Error(`สต็อกไม่เพียงพอ: ${item.product_name} ต้องการ ${requiredQuantities.level1} ลัง แต่มีเพียง ${available1} ลัง`);
    }

    if (requiredQuantities.level2 > available2) {
      throw new Error(`สต็อกไม่เพียงพอ: ${item.product_name} ต้องการ ${requiredQuantities.level2} เศษ แต่มีเพียง ${available2} เศษ`);
    }

    if (requiredQuantities.level3 > available3) {
      throw new Error(`สต็อกไม่เพียงพอ: ${item.product_name} ต้องการ ${requiredQuantities.level3} ชิ้น แต่มีเพียง ${available3} ชิ้น`);
    }

    return true;
  }
}
