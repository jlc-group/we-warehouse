import { supabase } from '@/integrations/supabase/client';

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

  // อัปเดตสต็อก
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

  console.log('✅ Stock deducted successfully for:', currentItem.product_name);
  return {
    success: true,
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
