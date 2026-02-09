import { localDb } from '@/integrations/local/client';

/**
 * Apply the products_summary view migration directly from the application
 */
export async function applyProductsSummaryMigration(): Promise<{ success: boolean; error?: string }> {
  console.log('🔧 Starting products_summary view migration...');

  try {
    // Step 1: Test if we can execute SQL directly
    const canExecute = await checkSQLExecutionCapability();
    if (!canExecute) {
      return {
        success: false,
        error: 'SQL execution not available via application. Please copy SQL and run in Supabase Dashboard.'
      };
    }

    // Step 2: Drop existing views
    console.log('🗑️ Dropping existing views...');
    const { error: dropSalesViewError } = await localDb.rpc('exec_sql', {
      sql: 'DROP VIEW IF EXISTS public.available_products_for_sales;'
    });

    const { error: dropMainViewError } = await localDb.rpc('exec_sql', {
      sql: 'DROP VIEW IF EXISTS public.products_summary;'
    });

    if (dropSalesViewError) {
      console.warn('⚠️ Warning dropping sales view:', dropSalesViewError);
    }
    if (dropMainViewError) {
      console.warn('⚠️ Warning dropping main view:', dropMainViewError);
    }

    // Step 3: Create products_summary view
    console.log('🏗️ Creating products_summary view...');
    const createViewSQL = `
CREATE OR REPLACE VIEW public.products_summary AS
SELECT
    p.id as product_id,
    p.sku_code as sku,
    p.product_name,
    p.category,
    p.subcategory,
    p.brand,
    p.product_type,
    p.unit_of_measure,
    p.unit_cost,
    p.description,

    -- รวมจำนวนสต็อกจากทุก location
    COALESCE(SUM(inv.unit_level1_quantity), 0) as total_level1_quantity,
    COALESCE(SUM(inv.unit_level2_quantity), 0) as total_level2_quantity,
    COALESCE(SUM(inv.unit_level3_quantity), 0) as total_level3_quantity,

    -- คำนวณจำนวนรวมทั้งหมด (เป็น pieces) โดยใช้ conversion rates
    COALESCE(
        SUM(
            (inv.unit_level1_quantity * COALESCE(pcr.unit_level1_rate, 24)) +
            (inv.unit_level2_quantity * COALESCE(pcr.unit_level2_rate, 1)) +
            inv.unit_level3_quantity
        ), 0
    ) as total_pieces,

    -- ข้อมูลการแปลงหน่วย
    COALESCE(pcr.unit_level1_name, 'ลัง') as unit_level1_name,
    COALESCE(pcr.unit_level2_name, 'กล่อง') as unit_level2_name,
    COALESCE(pcr.unit_level3_name, 'ชิ้น') as unit_level3_name,
    COALESCE(pcr.unit_level1_rate, 24) as unit_level1_rate,
    COALESCE(pcr.unit_level2_rate, 1) as unit_level2_rate,

    -- จำนวน location ที่มีสินค้านี้
    COUNT(DISTINCT inv.location) as location_count,

    -- location ที่มีสต็อกมากที่สุด
    (
        SELECT inv2.location
        FROM inventory_items inv2
        LEFT JOIN product_conversion_rates pcr2 ON inv2.sku = pcr2.sku
        WHERE inv2.sku = p.sku_code
        ORDER BY (
            (inv2.unit_level1_quantity * COALESCE(pcr2.unit_level1_rate, 24)) +
            (inv2.unit_level2_quantity * COALESCE(pcr2.unit_level2_rate, 1)) +
            inv2.unit_level3_quantity
        ) DESC
        LIMIT 1
    ) as primary_location,

    -- สถานะสต็อก
    CASE
        WHEN COALESCE(SUM(
            (inv.unit_level1_quantity * COALESCE(pcr.unit_level1_rate, 24)) +
            (inv.unit_level2_quantity * COALESCE(pcr.unit_level2_rate, 1)) +
            inv.unit_level3_quantity
        ), 0) = 0 THEN 'out_of_stock'
        WHEN COALESCE(SUM(
            (inv.unit_level1_quantity * COALESCE(pcr.unit_level1_rate, 24)) +
            (inv.unit_level2_quantity * COALESCE(pcr.unit_level2_rate, 1)) +
            inv.unit_level3_quantity
        ), 0) < 10 THEN 'low_stock'
        WHEN COALESCE(SUM(
            (inv.unit_level1_quantity * COALESCE(pcr.unit_level1_rate, 24)) +
            (inv.unit_level2_quantity * COALESCE(pcr.unit_level2_rate, 1)) +
            inv.unit_level3_quantity
        ), 0) < 50 THEN 'medium_stock'
        ELSE 'high_stock'
    END as stock_status,

    -- เวลาอัปเดตล่าสุด
    MAX(inv.updated_at) as last_updated,

    -- สถานะสินค้า
    p.is_active

FROM public.products p
LEFT JOIN public.inventory_items inv ON p.sku_code = inv.sku
LEFT JOIN public.product_conversion_rates pcr ON p.sku_code = pcr.sku
WHERE p.is_active = true
GROUP BY
    p.id, p.sku_code, p.product_name, p.category, p.subcategory,
    p.brand, p.product_type, p.unit_of_measure, p.unit_cost,
    p.description, p.is_active,
    pcr.unit_level1_name, pcr.unit_level2_name, pcr.unit_level3_name,
    pcr.unit_level1_rate, pcr.unit_level2_rate
ORDER BY p.product_type, p.product_name;
`;

    const { error: createError } = await localDb.rpc('exec_sql', {
      sql: createViewSQL
    });

    if (createError) {
      console.error('❌ Error creating products_summary view:', createError);
      return { success: false, error: `Failed to create view: ${createError.message}` };
    }

    // Step 3: Create available_products_for_sales view
    console.log('🏗️ Creating available_products_for_sales view...');
    const createSalesViewSQL = `
CREATE OR REPLACE VIEW public.available_products_for_sales AS
SELECT *
FROM public.products_summary
WHERE total_pieces > 0
ORDER BY product_type, stock_status DESC, product_name;
`;

    const { error: salesViewError } = await localDb.rpc('exec_sql', {
      sql: createSalesViewSQL
    });

    if (salesViewError) {
      console.error('❌ Error creating available_products_for_sales view:', salesViewError);
      return { success: false, error: `Failed to create sales view: ${salesViewError.message}` };
    }

    // Step 4: Add comments
    console.log('📝 Adding view comments...');
    await localDb.rpc('exec_sql', {
      sql: `COMMENT ON VIEW public.products_summary IS 'สรุปสินค้าสำหรับ Sales - ✅ ใช้ conversion rates จาก product_conversion_rates table ✅ มี product_type ครบถ้วน';`
    });

    await localDb.rpc('exec_sql', {
      sql: `COMMENT ON VIEW public.available_products_for_sales IS 'สินค้าที่มีสต็อกสำหรับการขาย - ✅ ใช้ conversion rates ที่ถูกต้อง ✅ มี product_type';`
    });

    // Step 5: Test the view
    console.log('✅ Testing products_summary view...');
    const { data: testData, error: testError } = await localDb
      .from('products_summary')
      .select('sku, product_name, product_type, total_pieces, stock_status')
      .limit(3);

    if (testError) {
      console.error('❌ Error testing view:', testError);
      return { success: false, error: `View test failed: ${testError.message}` };
    }

    console.log('🎉 Migration completed successfully!');
    console.log('📊 Sample data from new view:', testData);

    return { success: true };

  } catch (error) {
    console.error('❌ Migration failed:', error);
    return {
      success: false,
      error: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Check if we can execute SQL directly (usually not available in standard Supabase)
 */
export async function checkSQLExecutionCapability(): Promise<boolean> {
  try {
    // Try to execute a simple test query via RPC
    const { error } = await localDb.rpc('exec_sql', {
      sql: 'SELECT 1 as test;'
    });

    if (!error) {
      console.log('✅ SQL execution via RPC is available');
      return true;
    }
  } catch (error) {
    // This is expected for most Supabase instances
  }

  // Alternative: try to create a simple view to test permissions
  try {
    const testViewName = `test_view_${Date.now()}`;
    const { error: createError } = await localDb
      .from('_test_sql_capability')
      .select('1')
      .limit(1);

    // If we get here without error, we can't create views but can query
    return false;
  } catch (error) {
    // Expected - no _test_sql_capability table exists
    console.info('ℹ️ SQL execution via application not available - use manual SQL execution in Supabase Dashboard');
    return false;
  }
}