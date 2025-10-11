import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useInventory } from '@/hooks/useInventory';
import type { InventoryItem } from '@/hooks/useInventory';
import { checkViewExists, REQUIRED_VIEWS } from '@/utils/databaseViewUtils';

// Interface สำหรับข้อมูลสรุปสินค้า (ไม่มี location)
export interface ProductSummary {
  product_id: string;
  sku: string;
  product_name: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  product_type?: string;
  unit_of_measure?: string;
  unit_cost?: number;
  unit_price?: number; // เพิ่มราคาขาย
  selling_price?: number; // ราคาขายจริง (อาจแตกต่างจาก unit_price)
  description?: string;

  // จำนวนสต็อกรวมทั้งระบบ
  total_level1_quantity: number;
  total_level2_quantity: number;
  total_level3_quantity: number;
  total_pieces: number;

  // ข้อมูลการแปลงหน่วย
  unit_level1_name?: string;
  unit_level2_name?: string;
  unit_level3_name?: string;
  unit_level1_rate?: number;
  unit_level2_rate?: number;

  // ข้อมูลเพิ่มเติม
  location_count: number;
  primary_location?: string;
  stock_status: 'out_of_stock' | 'low_stock' | 'medium_stock' | 'high_stock';
  last_updated?: string;
  is_active: boolean;
}

// Interface สำหรับสถานะการดึงข้อมูล
export interface ProductsSummaryMeta {
  isUsingFallback: boolean;
  viewExists: boolean;
  lastChecked: Date;
}

// Interface สำหรับผลลัพธ์ที่รวม meta
export interface ProductsSummaryResult {
  data: ProductSummary[];
  meta: ProductsSummaryMeta;
}

// Hook สำหรับดึงข้อมูลสรุปสินค้าทั้งหมด
export function useProductsSummary() {
  const fallbackInventory = useInventory();

  return useQuery({
    queryKey: ['products-summary', fallbackInventory.items?.length],
    queryFn: async (): Promise<ProductsSummaryResult> => {
      // Silent mode - only log errors
      // console.log('📦 Fetching products summary...');

      // ตรวจสอบว่า view มีอยู่หรือไม่ก่อน
      const viewCheck = await checkViewExists(REQUIRED_VIEWS.PRODUCTS_SUMMARY);
      const now = new Date();

      // Silent view check
      // console.log('🔍 Database view check:', {
      //   viewName: REQUIRED_VIEWS.PRODUCTS_SUMMARY,
      //   exists: viewCheck.exists,
      //   checkTime: now.toISOString()
      // });

      if (!viewCheck.exists) {
        console.warn('🚨 products_summary view not found - using fallback mode');
        console.info('📝 To fix this: Apply MANUAL_APPLY_PRODUCTS_SUMMARY.sql in Supabase Dashboard');
        console.info('🔗 File location: /MANUAL_APPLY_PRODUCTS_SUMMARY.sql');
        console.info('📊 Fallback mode will use: products + inventory_items + product_conversion_rates tables');

        const fallbackData = await generateProductSummaryFromInventory(fallbackInventory);
        return {
          data: fallbackData,
          meta: {
            isUsingFallback: true,
            viewExists: false,
            lastChecked: now
          }
        };
      }

      try {
        const { data, error } = await supabase
          .from('products_summary')
          .select('*')
          .order('product_name');

        if (error) {
          console.warn('⚠️ Error from products_summary view, falling back to inventory:', error.message);
          console.error('🔴 View error details:', {
            error: error.message,
            code: error.code,
            hint: error.hint
          });
          const fallbackData = await generateProductSummaryFromInventory(fallbackInventory);
          return {
            data: fallbackData,
            meta: {
              isUsingFallback: true,
              viewExists: false,
              lastChecked: now
            }
          };
        }

        // Silent success
        // console.log('✅ Fetched products summary from view:', {
        //   count: data?.length || 0,
        //   sample: data?.slice(0, 3).map(p => ({ sku: p.sku, name: p.product_name, stock: p.total_pieces })) || []
        // });
        return {
          data: (data || []) as ProductSummary[],
          meta: {
            isUsingFallback: false,
            viewExists: true,
            lastChecked: now
          }
        };

      } catch (error) {
        console.warn('⚠️ Exception from products_summary view, using fallback:', error);
        const fallbackData = await generateProductSummaryFromInventory(fallbackInventory);
        return {
          data: fallbackData,
          meta: {
            isUsingFallback: true,
            viewExists: false,
            lastChecked: now
          }
        };
      }
    },
    enabled: true,
    staleTime: 1000 * 60 * 2, // 2 minutes - ลดลงเพื่อให้ข้อมูลใหม่กว่า
    refetchInterval: 1000 * 30, // Refresh every 30 seconds - ลดความถี่
    retry: (failureCount, error) => {
      // Only retry if inventory is still loading
      if (error?.message === 'Inventory data not ready' && failureCount < 3) {
        return true;
      }
      // Don't retry for view not found errors
      return false;
    },
    retryDelay: 1000,
    select: (result: ProductsSummaryResult) => result, // Pass through the full result
  });
}

// Helper function to generate product summary from all products (not just inventory)
async function generateProductSummaryFromInventory(
  fallbackInventory: ReturnType<typeof useInventory>
): Promise<ProductSummary[]> {
  console.log('🔄 Generating product summaries from all products (not just inventory)...');

  // Wait for inventory data to be available (for stock calculations)
  if (fallbackInventory.isLoading) {
    console.log('⏳ Waiting for inventory data to load...');
    throw new Error('Inventory data not ready');
  }

  // ✅ ดึงข้อมูลครบถ้วนจาก products table และ conversion rates table
  console.log('📋 Fetching products data from products table...');
  const { data: productsData, error: productsError } = await supabase
    .from('products')
    .select('id, sku_code, product_name, product_type, category, subcategory, brand, unit_of_measure, unit_cost, description, is_active');

  if (productsError) {
    console.warn('⚠️ Could not fetch products data:', productsError);
  }

  console.log('📋 Fetching conversion rates from product_conversion_rates table...');
  const { data: conversionRates, error: conversionError } = await supabase
    .from('product_conversion_rates')
    .select('sku, unit_level1_name, unit_level1_rate, unit_level2_name, unit_level2_rate, unit_level3_name');

  if (conversionError) {
    console.warn('⚠️ Could not fetch conversion rates, using fallback values:', conversionError);
  }

  // สร้าง Map สำหรับ products data
  const productsMap = new Map<string, {
    id: string;
    product_name: string;
    product_type: string;
    category?: string;
    subcategory?: string;
    brand?: string;
    unit_of_measure?: string;
    unit_cost?: number;
    description?: string;
    is_active: boolean;
  }>();

  productsData?.forEach(product => {
    productsMap.set(product.sku_code, {
      id: product.id,
      product_name: product.product_name,
      product_type: product.product_type,
      category: product.category,
      subcategory: product.subcategory,
      brand: product.brand,
      unit_of_measure: product.unit_of_measure,
      unit_cost: product.unit_cost,
      description: product.description,
      is_active: product.is_active
    });
  });

  console.log(`✅ Loaded ${productsMap.size} products data`, {
    sampleProducts: Array.from(productsMap.entries()).slice(0, 3).map(([sku, data]) => ({
      sku,
      name: data.product_name,
      type: data.product_type,
      active: data.is_active
    }))
  });

  // สร้าง Map สำหรับ conversion rates
  const conversionMap = new Map<string, {
    unit_level1_name: string;
    unit_level1_rate: number;
    unit_level2_name: string;
    unit_level2_rate: number;
    unit_level3_name: string;
  }>();

  conversionRates?.forEach(rate => {
    conversionMap.set(rate.sku, {
      unit_level1_name: rate.unit_level1_name || 'ลัง',
      unit_level1_rate: rate.unit_level1_rate || 24,
      unit_level2_name: rate.unit_level2_name || 'กล่อง',
      unit_level2_rate: rate.unit_level2_rate || 1,
      unit_level3_name: rate.unit_level3_name || 'ชิ้น'
    });
  });

  console.log(`✅ Loaded ${conversionMap.size} conversion rates`, {
    sampleRates: Array.from(conversionMap.entries()).slice(0, 3).map(([sku, data]) => ({
      sku,
      level1Rate: data.unit_level1_rate,
      level2Rate: data.unit_level2_rate
    }))
  });

  // ✅ Create inventory lookup for stock calculations
  const inventoryBySkuMap = new Map<string, InventoryItem[]>();
  if (fallbackInventory.items) {
    fallbackInventory.items.forEach(item => {
      const sku = item.sku;
      if (!inventoryBySkuMap.has(sku)) {
        inventoryBySkuMap.set(sku, []);
      }
      inventoryBySkuMap.get(sku)!.push(item);
    });
  }

  console.log(`🔍 Created inventory lookup for ${inventoryBySkuMap.size} SKUs from ${fallbackInventory.items?.length || 0} inventory items`);

  // ✅ Generate ProductSummary for ALL products (not just those with inventory)
  const productSummaries: ProductSummary[] = [];
  const missingInventorySkus = new Set<string>(); // Track SKUs without inventory

  for (const [sku, productData] of productsMap.entries()) {
    const conversionRate = conversionMap.get(sku);
    const inventoryItems = inventoryBySkuMap.get(sku) || [];
    const level1Rate = conversionRate?.unit_level1_rate || 24;
    const level2Rate = conversionRate?.unit_level2_rate || 1;

    if (inventoryItems.length === 0) {
      missingInventorySkus.add(sku);
    }

    // Aggregate inventory quantities
    let totalLevel1 = 0;
    let totalLevel2 = 0;
    let totalLevel3 = 0;
    let locationCount = 0;
    let primaryLocation = '';
    let lastUpdated = '';

    if (inventoryItems.length > 0) {
      totalLevel1 = inventoryItems.reduce((sum, item) => sum + (item.unit_level1_quantity || 0), 0);
      totalLevel2 = inventoryItems.reduce((sum, item) => sum + (item.unit_level2_quantity || 0), 0);
      totalLevel3 = inventoryItems.reduce((sum, item) => sum + (item.unit_level3_quantity || 0), 0);
      locationCount = inventoryItems.length;

      // Find primary location (with most stock)
      const locationTotals = inventoryItems.map(item => ({
        location: item.location,
        total: ((item.unit_level1_quantity || 0) * level1Rate) +
               ((item.unit_level2_quantity || 0) * level2Rate) +
               (item.unit_level3_quantity || 0)
      }));
      primaryLocation = locationTotals.sort((a, b) => b.total - a.total)[0]?.location || '';
      lastUpdated = inventoryItems.reduce((latest, item) =>
        item.updated_at && (!latest || item.updated_at > latest) ? item.updated_at : latest, ''
      );
    }

    // Calculate total pieces
    const totalPieces = (totalLevel1 * level1Rate) + (totalLevel2 * level2Rate) + totalLevel3;

    // Determine stock status
    const stockStatus: ProductSummary['stock_status'] =
      totalPieces === 0 ? 'out_of_stock' :
      totalPieces < 10 ? 'low_stock' :
      totalPieces < 50 ? 'medium_stock' : 'high_stock';

    const summary: ProductSummary = {
      product_id: productData.id,
      sku: sku,
      product_name: productData.product_name,
      category: productData.category,
      subcategory: productData.subcategory,
      brand: productData.brand,
      product_type: productData.product_type,
      unit_of_measure: productData.unit_of_measure,
      unit_cost: productData.unit_cost,
      unit_price: productData.unit_cost ? (productData.unit_cost * 1.3) : 10,
      selling_price: productData.unit_cost ? (productData.unit_cost * 1.3) : 10,
      description: productData.description,

      total_level1_quantity: totalLevel1,
      total_level2_quantity: totalLevel2,
      total_level3_quantity: totalLevel3,
      total_pieces: totalPieces,

      // Conversion rates
      unit_level1_name: conversionRate?.unit_level1_name || 'ลัง',
      unit_level2_name: conversionRate?.unit_level2_name || 'กล่อง',
      unit_level3_name: conversionRate?.unit_level3_name || 'ชิ้น',
      unit_level1_rate: level1Rate,
      unit_level2_rate: level2Rate,

      location_count: locationCount,
      primary_location: primaryLocation || null,
      stock_status: stockStatus,
      last_updated: lastUpdated || null,
      is_active: productData.is_active
    };

    productSummaries.push(summary);
  }

  // Sort results
  const result = productSummaries.sort((a, b) => {
    // เรียงตาม product_type ก่อน แล้วค่อยเรียงตามชื่อ
    if (a.product_type !== b.product_type) {
      return (a.product_type || '').localeCompare(b.product_type || '');
    }
    return a.product_name.localeCompare(b.product_name);
  });

  // 📊 Comprehensive data consistency report
  const totalProducts = productsMap.size;
  const totalInventoryItems = fallbackInventory.items?.length || 0;
  const productsWithStock = result.filter(p => p.total_pieces > 0).length;
  const productsWithoutStock = result.filter(p => p.total_pieces === 0).length;
  const missingInventoryCount = missingInventorySkus.size;

  console.log('📊 Enhanced Product Summary Generation Report:');
  console.log(`  ✅ Total products in products table: ${totalProducts}`);
  console.log(`  ✅ Total inventory items processed: ${totalInventoryItems}`);
  console.log(`  ✅ Products with stock: ${productsWithStock}`);
  console.log(`  ⚠️ Products without stock: ${productsWithoutStock}`);
  console.log(`  📦 SKUs without inventory: ${missingInventoryCount}`);

  if (missingInventoryCount > 0) {
    console.log('  📋 SKUs without inventory:', Array.from(missingInventorySkus).slice(0, 10).join(', ') +
                (missingInventoryCount > 10 ? ` (และอีก ${missingInventoryCount - 10} รายการ)` : ''));
  }

  console.log('✅ Generated complete product summaries (including zero-stock products):', {
    totalCount: result.length,
    withStock: productsWithStock,
    withoutStock: productsWithoutStock,
    sampleProducts: result.slice(0, 5).map(p => ({
      sku: p.sku,
      name: p.product_name,
      type: p.product_type,
      totalPieces: p.total_pieces,
      stockStatus: p.stock_status,
      locations: p.location_count
    }))
  });

  return result;
}

// Hook สำหรับตรวจสอบสถานะการใช้ fallback
export function useProductsSummaryMeta(): ProductsSummaryMeta {
  const query = useProductsSummary();

  // ถ้าข้อมูลยังโหลดอยู่ ให้ return ค่าเริ่มต้น
  if (query.isLoading || !query.data) {
    return {
      isUsingFallback: false,
      viewExists: true, // สมมติว่า view มีอยู่จนกว่าจะได้รับข้อมูลจริง
      lastChecked: new Date()
    };
  }

  // ใช้ meta จากผลลัพธ์ที่ได้จริง
  return query.data.meta;
}

// ✅ Hook สำหรับดึงสินค้าทั้งหมด (สำหรับ Sales) - แสดงทั้งมีและไม่มีสต็อก
export function useAvailableProductsForSales() {
  const productsQuery = useProductsSummary();

  return useQuery({
    queryKey: ['available-products-for-sales', productsQuery.data?.data?.length],
    queryFn: async () => {
      console.log('🛒 Fetching all products for sales...');

      // ✅ ใช้ข้อมูลจาก useProductsSummary ที่รวมแล้ว
      if (!productsQuery.data?.data) {
        console.warn('⚠️ Products summary data not available');
        throw new Error('Products summary data not available');
      }

      const allProducts = productsQuery.data.data;
      console.log('📦 Total products from summary:', allProducts.length);

      // ✅ แสดงสินค้าทั้งหมด (ไม่กรองตามสต็อก) และเรียงตาม product_type
      const result = allProducts
        .sort((a, b) => {
          // เรียงตาม product_type ก่อน
          if (a.product_type !== b.product_type) {
            return (a.product_type || '').localeCompare(b.product_type || '');
          }
          // แล้วเรียงตามจำนวนสต็อก (สูงไปต่ำ) แล้วค่อยเป็นชื่อ
          const stockDiff = (b.total_pieces || 0) - (a.total_pieces || 0);
          if (stockDiff !== 0) {
            return stockDiff;
          }
          return a.product_name.localeCompare(b.product_name);
        });

      // ✅ เพิ่มข้อมูล debug
      const withStock = result.filter(item => (item.total_pieces || 0) > 0);
      const withoutStock = result.filter(item => (item.total_pieces || 0) === 0);

      console.log('✅ Products for sales statistics:');
      console.log(`   📊 Total products: ${result.length}`);
      console.log(`   ✅ Products with stock: ${withStock.length}`);
      console.log(`   ⚠️ Products without stock: ${withoutStock.length}`);
      console.log(`   📄 Data source: ${productsQuery.data.meta.isUsingFallback ? 'Fallback mode' : 'Database View'}`);

      // แสดงรายการสินค้าตัวอย่าง
      if (result.length > 0) {
        console.log('📋 Sample products:', result.slice(0, 3).map(p => ({
          name: p.product_name,
          sku: p.sku,
          stock: p.total_pieces,
          type: p.product_type
        })));
      }

      if (result.length === 0) {
        console.error('❌ No products found! This indicates a problem with the data source.');
        console.log('🔍 Debugging info:', {
          hasProductsData: !!productsQuery.data?.data,
          productsDataLength: productsQuery.data?.data?.length,
          isUsingFallback: productsQuery.data?.meta?.isUsingFallback,
          viewExists: productsQuery.data?.meta?.viewExists
        });
      }

      return result;
    },
    enabled: !!productsQuery.data?.data, // รอให้ useProductsSummary โหลดเสร็จก่อน
    staleTime: 1000 * 60 * 1, // 1 minute
    refetchInterval: false, // ให้ useProductsSummary จัดการ refetch เอง
  });
}

// Interface สำหรับผลการแปลงหน่วย
interface UnitConversionResult {
  total: number;
  breakdown: {
    level1ToBase: number;
    level2ToBase: number;
    level3Base: number;
  };
  ratesUsed: {
    level1Rate: number;
    level2Rate: number;
    level1IsDefault: boolean;
    level2IsDefault: boolean;
  };
  warnings: string[];
}

// Helper function to validate and get conversion rate
function getValidatedConversionRate(
  rate: number | undefined | null,
  defaultRate: number,
  maxRate: number,
  unitName: string,
  sku: string
): { rate: number; isDefault: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // ตรวจสอบค่า rate
  if (!rate || rate <= 0) {
    warnings.push(`⚠️ ${sku}: ไม่มีการตั้งค่า ${unitName} conversion rate, ใช้ค่าเริ่มต้น ${defaultRate}`);
    return { rate: defaultRate, isDefault: true, warnings };
  }

  if (rate > maxRate) {
    warnings.push(`⚠️ ${sku}: ${unitName} conversion rate (${rate}) สูงผิดปกติ, ใช้ค่าเริ่มต้น ${defaultRate}`);
    return { rate: defaultRate, isDefault: true, warnings };
  }

  // ตรวจสอบค่าที่แปลกๆ
  if (rate < 1) {
    warnings.push(`⚠️ ${sku}: ${unitName} conversion rate (${rate}) ต่ำผิดปกติ, กรุณาตรวจสอบ`);
  }

  return { rate: rate, isDefault: false, warnings };
}

// Helper function to calculate total stock in base units (pieces) with detailed validation
function getTotalStock(item: InventoryItem): number {
  const result = getTotalStockWithDetails(item);

  // แสดง warnings ถ้ามี
  if (result.warnings.length > 0) {
    console.warn(`🔢 Unit conversion warnings for ${item.sku}:`, result.warnings);
  }

  return result.total;
}

// Helper function ที่ให้รายละเอียดครบถ้วน - ใช้สำหรับ debugging และ validation
function getTotalStockWithDetails(item: InventoryItem): UnitConversionResult {
  // ค่าเริ่มต้นที่ปรับปรุงให้เหมาะสมกับสินค้าไทยทั่วไป
  const DEFAULT_LEVEL1_RATE = 24;  // 1 ลัง = 24 ชิ้น (ปรับจาก 144 ที่สูงเกินไป)
  const DEFAULT_LEVEL2_RATE = 1;   // 1 กล่อง = 1 ชิ้น (ปรับจาก 12 ให้เป็น 1:1)

  const MAX_LEVEL1_RATE = 1000;    // จำกัดค่าสูงสุดสำหรับลัง
  const MAX_LEVEL2_RATE = 100;     // จำกัดค่าสูงสุดสำหรับกล่อง

  const warnings: string[] = [];

  // ตรวจสอบและดึง conversion rates
  const level1Result = getValidatedConversionRate(
    item.unit_level1_rate,
    DEFAULT_LEVEL1_RATE,
    MAX_LEVEL1_RATE,
    'Level1 (ลัง)',
    item.sku || 'Unknown'
  );

  const level2Result = getValidatedConversionRate(
    item.unit_level2_rate,
    DEFAULT_LEVEL2_RATE,
    MAX_LEVEL2_RATE,
    'Level2 (กล่อง)',
    item.sku || 'Unknown'
  );

  warnings.push(...level1Result.warnings, ...level2Result.warnings);

  // คำนวณจำนวนชิ้นจากแต่ละระดับ
  const level1Quantity = item.unit_level1_quantity || 0;
  const level2Quantity = item.unit_level2_quantity || 0;
  const level3Quantity = item.unit_level3_quantity || 0;

  const level1ToBase = level1Quantity * level1Result.rate;
  const level2ToBase = level2Quantity * level2Result.rate;
  const level3Base = level3Quantity; // ระดับ 3 เป็นหน่วยพื้นฐานแล้ว

  const total = level1ToBase + level2ToBase + level3Base;

  // ตรวจสอบความสมเหตุสมผลของผลลัพธ์
  if (total < 0) {
    warnings.push(`❌ ${item.sku}: จำนวนรวมเป็นลบ (${total}) - ข้อมูลผิดพลาด`);
  }

  if (total > 1000000) {
    warnings.push(`⚠️ ${item.sku}: จำนวนรวมสูงมาก (${total.toLocaleString()}) - กรุณาตรวจสอบ`);
  }

  // Log การแปลงหน่วยที่มีรายละเอียด
  if (level1ToBase > 0 || level2ToBase > 0) {
    console.log(`🔢 Unit conversion for ${item.sku}:`, {
      level1: `${level1Quantity} ${item.unit_level1_name || 'ลัง'} × ${level1Result.rate} = ${level1ToBase} ชิ้น` +
              (level1Result.isDefault ? ' (ค่าเริ่มต้น)' : ''),
      level2: `${level2Quantity} ${item.unit_level2_name || 'กล่อง'} × ${level2Result.rate} = ${level2ToBase} ชิ้น` +
              (level2Result.isDefault ? ' (ค่าเริ่มต้น)' : ''),
      level3: `${level3Quantity} ${item.unit_level3_name || 'ชิ้น'} = ${level3Base} ชิ้น`,
      total: `${total.toLocaleString()} ชิ้น`,
      originalRates: {
        level1: item.unit_level1_rate,
        level2: item.unit_level2_rate
      },
      usedRates: {
        level1: level1Result.rate,
        level2: level2Result.rate
      },
      defaults: {
        level1Used: level1Result.isDefault,
        level2Used: level2Result.isDefault
      }
    });
  }

  return {
    total: Math.max(0, total), // ป้องกันค่าลบ
    breakdown: {
      level1ToBase,
      level2ToBase,
      level3Base
    },
    ratesUsed: {
      level1Rate: level1Result.rate,
      level2Rate: level2Result.rate,
      level1IsDefault: level1Result.isDefault,
      level2IsDefault: level2Result.isDefault
    },
    warnings
  };
}

// Hook สำหรับดึงข้อมูลสินค้าเฉพาะตัว
export function useProductSummaryById(productId: string) {
  const allProducts = useProductsSummary();

  return useQuery({
    queryKey: ['product-summary', productId],
    queryFn: async () => {
      if (!productId) return null;

      console.log('📋 Fetching product summary by ID:', productId);

      try {
        const { data, error } = await supabase
          .from('products_summary')
          .select('*')
          .eq('product_id', productId)
          .single();

        if (error) {
          console.warn('⚠️ Products summary view not available, using fallback data');
          throw error;
        }

        console.log('✅ Fetched product summary:', data);
        return data as ProductSummary;

      } catch (error) {
        // Fallback: Find from all products
        if (allProducts.data) {
          const product = allProducts.data.find(p => p.product_id === productId);
          if (product) {
            console.log('✅ Fallback: Found product in summary data');
            return product;
          }
        }

        console.log('❌ Product not found in fallback data');
        return null;
      }
    },
    enabled: !!productId,
    staleTime: 1000 * 60 * 2, // 2 minutes - ลดลงให้สอดคล้องกัน
  });
}

// Hook สำหรับค้นหาสินค้าตาม SKU
export function useProductSummaryBySku(sku: string) {
  const allProducts = useProductsSummary();

  return useQuery({
    queryKey: ['product-summary-by-sku', sku],
    queryFn: async () => {
      if (!sku) return null;

      console.log('🔍 Fetching product summary by SKU:', sku);

      try {
        const { data, error } = await supabase
          .from('products_summary')
          .select('*')
          .eq('sku', sku)
          .single();

        if (error) {
          console.warn('⚠️ Products summary view not available, using fallback data');
          throw error;
        }

        console.log('✅ Fetched product by SKU:', data);
        return data as ProductSummary;

      } catch (error) {
        // Fallback: Find from all products
        if (allProducts.data) {
          const product = allProducts.data.find(p => p.sku === sku);
          if (product) {
            console.log('✅ Fallback: Found product by SKU in summary data');
            return product;
          }
        }

        console.log('❌ Product not found by SKU in fallback data');
        return null;
      }
    },
    enabled: !!sku,
    staleTime: 1000 * 60 * 2, // 2 minutes - ลดลงให้สอดคล้องกัน
  });
}

// Utility functions
export const getStockLevelColor = (status: ProductSummary['stock_status']) => {
  switch (status) {
    case 'out_of_stock':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'low_stock':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium_stock':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'high_stock':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const getStockLevelLabel = (status: ProductSummary['stock_status']) => {
  switch (status) {
    case 'out_of_stock':
      return 'หมด';
    case 'low_stock':
      return 'น้อย';
    case 'medium_stock':
      return 'ปานกลาง';
    case 'high_stock':
      return 'เยอะ';
    default:
      return 'ไม่ทราบ';
  }
};

// สำหรับการแปลง ProductSummary เป็น InventoryItem format (backward compatibility)
export const convertToInventoryItemFormat = (summary: ProductSummary): any => {
  return {
    id: summary.product_id,
    sku: summary.sku,
    product_name: summary.product_name,
    category: summary.category,
    unit_of_measure: summary.unit_of_measure,
    unit_cost: summary.unit_cost,
    unit_price: summary.unit_price,
    selling_price: summary.selling_price,
    description: summary.description,

    // ใช้จำนวนรวมแทนจำนวนแยก location
    unit_level1_quantity: summary.total_level1_quantity,
    unit_level2_quantity: summary.total_level2_quantity,
    unit_level3_quantity: summary.total_level3_quantity,

    // ข้อมูลการแปลงหน่วย
    unit_level1_name: summary.unit_level1_name || 'ลัง',
    unit_level2_name: summary.unit_level2_name || 'กล่อง',
    unit_level3_name: summary.unit_level3_name || 'ชิ้น',
    unit_level1_rate: summary.unit_level1_rate || 1,
    unit_level2_rate: summary.unit_level2_rate || 1,

    // ไม่ระบุ location เพราะเป็นสรุปรวม
    location: `รวม ${summary.location_count} ตำแหน่ง`,
    warehouse_id: null,

    // ข้อมูลเพิ่มเติม
    is_active: summary.is_active,
    updated_at: summary.last_updated,
  };
};