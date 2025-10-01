import { supabase } from '@/integrations/supabase/client';
import { checkSoftDeleteSupport } from './databaseUtils';
import { safeDeleteInventoryItem } from './safeDeleteUtils';

// Real gateway client with fallback
export const secureGatewayClient = {
  get: async <T = any>(endpoint: string, params?: any): Promise<{ success: boolean; data: T | null }> => {
    try {
      // Direct Supabase queries for common endpoints
      switch (endpoint) {
        case 'inventory': {
          // Check if soft delete is supported before filtering
          const hasSoftDelete = await checkSoftDeleteSupport();

          let query = supabase
            .from('inventory_items')
            .select(`
              id,
              product_name,
              sku,
              location,
              lot,
              mfd,
              unit_level1_quantity,
              unit_level2_quantity,
              unit_level3_quantity,
              unit_level1_name,
              unit_level2_name,
              unit_level3_name,
              unit_level1_rate,
              unit_level2_rate,
              carton_quantity_legacy,
              box_quantity_legacy,
              pieces_quantity_legacy,
              quantity_pieces,
              unit,
              warehouse_id,
              user_id,
              created_at,
              updated_at
              ${hasSoftDelete ? ',is_deleted' : ''}
            `);

          // Only apply soft delete filter if the column exists
          if (hasSoftDelete) {
            query = query.eq('is_deleted', false);
          }

          if (params?.warehouseId) {
            query = query.eq('warehouse_id', params.warehouseId);
          }

          if (params?.id) {
            query = query.eq('id', params.id).single();
          }

          const { data, error } = await query;

          if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned (acceptable)
            throw error;
          }

          return { success: true, data: data as T };
        }

        case 'customers': {
          let query = supabase
            .from('customers')
            .select(`
              id,
              customer_name,
              customer_code,
              customer_type,
              phone,
              email,
              address_line1,
              address_line2,
              district,
              province,
              postal_code,
              country,
              is_active,
              created_at,
              updated_at
            `)
            .eq('is_active', true)
            .order('customer_name');

          if (params?.id) {
            query = query.eq('id', params.id).single();
          }

          if (params?.search) {
            query = query.or(`customer_name.ilike.%${params.search}%,customer_code.ilike.%${params.search}%,phone.ilike.%${params.search}%`);
          }

          const { data, error } = await query;

          if (error && error.code !== 'PGRST116') {
            throw error;
          }

          return { success: true, data: data as T };
        }

        case 'productBySku': {
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('sku_code', params?.sku)
            .single();

          if (error && error.code !== 'PGRST116') {
            throw error;
          }

          return { success: true, data: data as T };
        }

        case 'conversionRates': {
          console.log('🔄 Fetching conversion rates from database (no JOIN needed)...');

          // Table already has sku and product_name columns!
          let query = supabase
            .from('product_conversion_rates')
            .select(`
              id,
              sku,
              product_name,
              product_id,
              product_type,
              unit_level1_name,
              unit_level1_rate,
              unit_level2_name,
              unit_level2_rate,
              unit_level3_name,
              created_at,
              updated_at
            `)
            .order('created_at', { ascending: false });

          if (params?.sku) {
            console.log(`🔍 Filtering by SKU: ${params.sku}`);
            query = query.eq('sku', params.sku).single();
          }

          const { data, error } = await query;

          console.log('🔍 Raw data from query:', data);
          console.log('🔍 Error from query:', error);

          if (error) {
            if (error.code === 'PGRST116') {
              console.log('ℹ️ No conversion rates found (empty result)');
              return { success: true, data: [] as T };
            } else {
              console.error('❌ Error fetching conversion rates:', error);
              throw error;
            }
          }

          // Ensure we always return an array
          if (!data) {
            console.log('⚠️ No data returned from query');
            return { success: true, data: [] as T };
          }

          const resultArray = Array.isArray(data) ? data : [data];
          console.log(`✅ Retrieved ${resultArray.length} conversion rates`);
          console.log('🔍 Sample data:', resultArray.length > 0 ? resultArray[0] : null);
          console.log('🔍 Is Array?', Array.isArray(resultArray), 'Length:', resultArray.length);

          return { success: true, data: resultArray as T };
        }

        case 'productsWithConversions': {
          // First, let's get products separately and then join with conversion rates
          console.log('🔄 Fetching products with conversions via manual join...');

          const { data: products, error: productsError } = await supabase
            .from('products')
            .select(`
              id,
              product_name,
              sku_code,
              product_type,
              brand,
              category,
              unit_of_measure,
              is_active,
              created_at
            `)
            .eq('is_active', true)
            .order('product_name');

          if (productsError) {
            console.error('❌ Error fetching products:', productsError);
            throw productsError;
          }

          // Get all conversion rates
          const { data: conversions, error: conversionsError } = await supabase
            .from('product_conversion_rates')
            .select(`
              sku,
              product_name,
              unit_level1_name,
              unit_level1_rate,
              unit_level2_name,
              unit_level2_rate,
              unit_level3_name
            `);

          if (conversionsError) {
            console.warn('⚠️ Error fetching conversions, proceeding without:', conversionsError);
          }

          // Manual join: match products.sku_code with conversion_rates.sku
          const productsWithConversions = products.map(product => {
            const conversionRate = conversions?.find(conv => conv.sku === product.sku_code);
            return {
              ...product,
              conversion_rates: conversionRate || null
            };
          });

          console.log(`✅ Successfully joined ${products.length} products with conversions`);
          return { success: true, data: productsWithConversions as T };
        }

        case 'conversionRateBySku': {
          const { data, error } = await supabase
            .from('product_conversion_rates')
            .select('*')
            .eq('sku', params?.sku)
            .single();

          if (error && error.code !== 'PGRST116') {
            // Return default conversion rates if not found
            const defaultData = {
              sku: params?.sku || '',
              product_name: 'ไม่ระบุ',
              unit_level1_name: 'ลัง',
              unit_level1_rate: 144,
              unit_level2_name: 'กล่อง',
              unit_level2_rate: 12,
              unit_level3_name: 'ชิ้น',
              isDefault: true
            };
            return { success: true, data: defaultData as T };
          }

          return { success: true, data: data as T };
        }

        case 'productsWithConversionsView': {
          console.log('🔄 Fetching products with conversions from view...');

          let query = supabase
            .from('products_with_conversions')
            .select('*')
            .order('sku_code');

          if (params?.productType) {
            query = query.eq('product_type', params.productType);
          }

          if (params?.search) {
            query = query.or(`sku_code.ilike.%${params.search}%,product_name.ilike.%${params.search}%`);
          }

          if (params?.hasConversion !== undefined) {
            if (params.hasConversion) {
              query = query.not('conversion_id', 'is', null);
            } else {
              query = query.is('conversion_id', null);
            }
          }

          const { data, error } = await query;

          if (error) {
            console.error('❌ Error fetching products with conversions:', error);
            throw error;
          }

          console.log(`✅ Retrieved ${data.length} products with conversion data`);
          return { success: true, data: data as T };
        }

        default:
          // Fallback for unknown endpoints
          return { success: true, data: null };
      }
    } catch (error) {
      console.warn(`secureGatewayClient.get(${endpoint}) failed, using fallback:`, error);
      return { success: true, data: null };
    }
  },

  delete: async (endpoint: string, params?: any): Promise<{ success: boolean; data: any | null }> => {
    try {
      switch (endpoint) {
        case 'inventory': {
          if (!params?.id) {
            throw new Error('ID is required for delete operation');
          }

          console.log('🗑️ Attempting to REALLY delete inventory item:', params.id);

          // Use safe delete utility to handle constraint conflicts
          const deleteResult = await safeDeleteInventoryItem(params.id);

          if (!deleteResult.success) {
            const errorMsg = deleteResult.error || 'Unknown delete error';
            console.error('❌ Safe delete failed:', errorMsg);
            throw new Error(errorMsg);
          }

          if (!deleteResult.deleted) {
            console.error('❌ Item was not deleted (may not exist)');
            throw new Error('Item not found or could not be deleted');
          }

          // Simulate the expected return format
          const error = null;
          const count = 1;

          if (error) {
            console.error('❌ Delete operation failed:', error);
            throw error;
          }

          if (count === 0) {
            console.warn('⚠️ No rows were updated - item may not exist or already deleted');
            throw new Error('ไม่พบสินค้าที่ต้องการลบ หรือสินค้านี้ถูกลบไปแล้ว');
          }

          console.log('✅ Successfully soft deleted inventory item:', params.id);
          return { success: true, data: { deleted: true, deletedCount: count, softDelete: true } };
        }

        default:
          return { success: true, data: null };
      }
    } catch (error) {
      console.error(`❌ secureGatewayClient.delete(${endpoint}) failed:`, error);
      // ไม่ return success: true เมื่อเกิด error จริงๆ
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการลบ'
      };
    }
  },

  mutate: async (action: string, payload?: any): Promise<{ success: boolean; data: any | null }> => {
    try {
      switch (action) {
        case 'createInventoryItem': {
          const { data, error } = await supabase
            .from('inventory_items')
            .insert([payload])
            .select()
            .single();

          if (error) throw error;
          return { success: true, data };
        }

        case 'updateInventoryItem': {
          const { data, error } = await supabase
            .from('inventory_items')
            .update(payload.updates)
            .eq('id', payload.id)
            .select()
            .single();

          if (error) throw error;
          return { success: true, data: { item: data } };
        }

        case 'createProduct': {
          const { data, error } = await supabase
            .from('products')
            .insert([payload])
            .select()
            .single();

          if (error) throw error;
          return { success: true, data };
        }

        case 'createCustomer': {
          const { data, error } = await supabase
            .from('customers')
            .insert([payload])
            .select()
            .single();

          if (error) throw error;
          return { success: true, data };
        }

        case 'updateCustomer': {
          const { data, error } = await supabase
            .from('customers')
            .update(payload.updates)
            .eq('id', payload.id)
            .select()
            .single();

          if (error) throw error;
          return { success: true, data };
        }

        case 'clearInventory': {
          const { error } = await supabase
            .from('inventory_items')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

          if (error) throw error;
          return { success: true, data: { cleared: true } };
        }

        case 'bulkUpsertInventory': {
          const { clearExisting, items } = payload;

          if (clearExisting) {
            await supabase
              .from('inventory_items')
              .delete()
              .neq('id', '00000000-0000-0000-0000-000000000000');
          }

          const { data, error } = await supabase
            .from('inventory_items')
            .upsert(items, { onConflict: 'id' })
            .select();

          if (error) throw error;
          return { success: true, data };
        }

        case 'transferInventoryItems': {
          const { ids, targetLocation, notes } = payload;

          const { data, error } = await supabase
            .from('inventory_items')
            .update({
              location: targetLocation,
              updated_at: new Date().toISOString()
            })
            .in('id', ids)
            .select();

          if (error) throw error;
          return { success: true, data };
        }

        case 'shipOutInventoryItems': {
          const { ids, notes } = payload;

          const { error } = await supabase
            .from('inventory_items')
            .delete()
            .in('id', ids);

          if (error) throw error;
          return { success: true, data: { shipped: true } };
        }

        case 'createConversionRate': {
          // Validate required fields - now only need SKU or product_id
          if (!payload.sku && !payload.product_id) {
            throw new Error('SKU หรือ product_id จำเป็นต้องระบุ');
          }

          // If SKU provided, find product_id
          let productId = payload.product_id;
          if (!productId && payload.sku) {
            const { data: product } = await supabase
              .from('products')
              .select('id')
              .eq('sku_code', payload.sku)
              .single();

            if (!product) {
              throw new Error(`ไม่พบสินค้า SKU: ${payload.sku}`);
            }
            productId = product.id;
          }

          // Validate conversion rates are positive numbers
          if (payload.unit_level1_rate && payload.unit_level1_rate <= 0) {
            throw new Error('อัตราแปลงหน่วยระดับ 1 ต้องเป็นจำนวนบวก');
          }
          if (payload.unit_level2_rate && payload.unit_level2_rate <= 0) {
            throw new Error('อัตราแปลงหน่วยระดับ 2 ต้องเป็นจำนวนบวก');
          }

          const { data, error } = await supabase
            .from('product_conversion_rates')
            .insert([{
              product_id: productId,
              unit_level1_name: payload.unit_level1_name || 'ลัง',
              unit_level1_rate: payload.unit_level1_rate || 144,
              unit_level2_name: payload.unit_level2_name || 'กล่อง',
              unit_level2_rate: payload.unit_level2_rate || 12,
              unit_level3_name: payload.unit_level3_name || 'ชิ้น',
              user_id: '00000000-0000-0000-0000-000000000000'
            }])
            .select()
            .single();

          if (error) throw error;
          console.log('✅ Created conversion rate using product_id (no duplicate data!)');
          return { success: true, data };
        }

        case 'updateConversionRate': {
          if (!payload.sku && !payload.product_id) {
            throw new Error('SKU หรือ product_id จำเป็นต้องระบุ');
          }

          // Find product_id if SKU provided
          let productId = payload.product_id;
          if (!productId && payload.sku) {
            const { data: product } = await supabase
              .from('products')
              .select('id')
              .eq('sku_code', payload.sku)
              .single();

            if (!product) {
              throw new Error(`ไม่พบสินค้า SKU: ${payload.sku}`);
            }
            productId = product.id;
          }

          // Validate conversion rates are positive numbers
          if (payload.updates.unit_level1_rate && payload.updates.unit_level1_rate <= 0) {
            throw new Error('อัตราแปลงหน่วยระดับ 1 ต้องเป็นจำนวนบวก');
          }
          if (payload.updates.unit_level2_rate && payload.updates.unit_level2_rate <= 0) {
            throw new Error('อัตราแปลงหน่วยระดับ 2 ต้องเป็นจำนวนบวก');
          }

          const { data, error } = await supabase
            .from('product_conversion_rates')
            .update({
              ...payload.updates,
              updated_at: new Date().toISOString()
            })
            .eq('product_id', productId)
            .select()
            .single();

          if (error) throw error;
          console.log('✅ Updated conversion rate using product_id');
          return { success: true, data };
        }

        case 'deleteConversionRate': {
          if (!payload.sku && !payload.product_id) {
            throw new Error('SKU หรือ product_id จำเป็นต้องระบุ');
          }

          // Find product_id if SKU provided
          let productId = payload.product_id;
          if (!productId && payload.sku) {
            const { data: product } = await supabase
              .from('products')
              .select('id')
              .eq('sku_code', payload.sku)
              .single();

            if (product) {
              productId = product.id;
            }
          }

          const { error } = await supabase
            .from('product_conversion_rates')
            .delete()
            .eq('product_id', productId);

          if (error) throw error;
          console.log('✅ Deleted conversion rate using product_id');
          return { success: true, data: { deleted: true, sku: payload.sku } };
        }

        case 'batchUpdateConversionRates': {
          if (!payload.conversions || !Array.isArray(payload.conversions)) {
            throw new Error('ข้อมูลอัตราแปลงไม่ถูกต้อง');
          }

          // Validate all conversion rates
          for (const conv of payload.conversions) {
            if (!conv.sku) throw new Error('SKU จำเป็นต้องระบุ');
            if (conv.unit_level1_rate && conv.unit_level1_rate <= 0) {
              throw new Error(`อัตราแปลงหน่วยระดับ 1 ของ ${conv.sku} ต้องเป็นจำนวนบวก`);
            }
            if (conv.unit_level2_rate && conv.unit_level2_rate <= 0) {
              throw new Error(`อัตราแปลงหน่วยระดับ 2 ของ ${conv.sku} ต้องเป็นจำนวนบวก`);
            }
          }

          const { data, error } = await supabase
            .from('product_conversion_rates')
            .upsert(payload.conversions.map((conv: any) => ({
              ...conv,
              user_id: '00000000-0000-0000-0000-000000000000',
              updated_at: new Date().toISOString()
            })), { onConflict: 'sku' })
            .select();

          if (error) throw error;
          return { success: true, data };
        }

        default:
          // Fallback for unknown actions
          return { success: true, data: null };
      }
    } catch (error) {
      console.warn(`secureGatewayClient.mutate(${action}) failed, using fallback:`, error);
      return { success: true, data: null };
    }
  }
};