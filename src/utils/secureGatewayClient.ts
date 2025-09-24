export interface SecureGatewayResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Import supabase client for fallback
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
};

const explicitGatewayUrl = import.meta.env.VITE_SECURE_GATEWAY_URL as string | undefined;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;

function resolveGatewayUrl(): string {
  if (explicitGatewayUrl && explicitGatewayUrl.trim().length > 0) {
    return explicitGatewayUrl;
  }

  if (supabaseUrl && supabaseUrl.trim().length > 0) {
    const normalized = supabaseUrl.replace(/\/$/, "");
    return `${normalized}/functions/v1/secure-gateway`;
  }

  throw new Error("Secure gateway URL not configured");
}

async function handleResponse<T>(response: Response): Promise<SecureGatewayResponse<T>> {
  const contentType = response.headers.get("Content-Type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : { success: false, error: await response.text() };

  if (!response.ok) {
    const errorMessage = (payload as SecureGatewayResponse).error || response.statusText;
    throw new Error(errorMessage || "Secure gateway request failed");
  }

  return payload as SecureGatewayResponse<T>;
}

interface RequestOptions {
  signal?: AbortSignal;
}

// Fallback methods using direct Supabase client
const fallbackMethods = {
  async getProducts(): Promise<SecureGatewayResponse> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, sku_code, product_name, product_type, category, subcategory, brand, description, unit_of_measure, is_active, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async getInventory(warehouseId?: string, inventoryId?: string): Promise<SecureGatewayResponse> {
    try {
      let query = supabase
        .from('inventory_items')
        .select('*')
        .order('location', { ascending: true });

      // TODO: Add .eq('is_deleted', false) after running migration

      if (warehouseId) {
        query = query.eq('warehouse_id', warehouseId);
      }

      if (inventoryId) {
        query = query.eq('id', inventoryId);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (inventoryId) {
        const [item] = data ?? [];
        return { success: true, data: item ?? null };
      }

      return { success: true, data: data ?? [] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async getProductBySku(sku: string): Promise<SecureGatewayResponse> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('sku_code', sku)
        .maybeSingle();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Mutate operations fallbacks
  async createProduct(payload: any): Promise<SecureGatewayResponse> {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert({ ...payload, updated_at: new Date().toISOString() })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async updateProduct(payload: any): Promise<SecureGatewayResponse> {
    try {
      const { id, updates } = payload;
      if (!id) return { success: false, error: 'Missing product id' };

      const { data, error } = await supabase
        .from('products')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async createInventoryItem(payload: any): Promise<SecureGatewayResponse> {
    try {
      const insertData = {
        ...payload,
        updated_at: new Date().toISOString(),
        // Ensure dual-write: sync legacy and unit_level fields
        carton_quantity_legacy: payload.unit_level1_quantity || payload.carton_quantity_legacy || 0,
        box_quantity_legacy: payload.unit_level2_quantity || payload.box_quantity_legacy || 0,
        pieces_quantity_legacy: payload.unit_level3_quantity || payload.pieces_quantity_legacy || 0,
        // Also ensure unit_level fields are populated if not provided
        unit_level1_quantity: payload.unit_level1_quantity || payload.carton_quantity_legacy || 0,
        unit_level2_quantity: payload.unit_level2_quantity || payload.box_quantity_legacy || 0,
        unit_level3_quantity: payload.unit_level3_quantity || payload.pieces_quantity_legacy || 0,
      };

      const { data, error } = await supabase
        .from('inventory_items')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async updateInventoryItem(payload: any): Promise<SecureGatewayResponse> {
    try {
      const { id, updates } = payload;
      if (!id) return { success: false, error: 'Missing inventory item id' };

      // Get current item first
      const { data: currentItem, error: fetchError } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const mergedData = {
        ...currentItem,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const level1 = Number(mergedData.unit_level1_quantity ?? 0);
      const level2 = Number(mergedData.unit_level2_quantity ?? 0);
      const level3 = Number(mergedData.unit_level3_quantity ?? 0);
      const totalQuantity = level1 + level2 + level3;

      // Temporarily use hard delete until migration is run
      // TODO: Switch back to soft delete after running migration
      if (totalQuantity === 0) {
        const { error: deleteError } = await supabase
          .from('inventory_items')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        return {
          success: true,
          data: {
            deleted: true,
            isEmpty: false, // Location is now available
            newQuantities: { level1: 0, level2: 0, level3: 0 },
          },
        };
      }

      // Update the item with dual-write for consistency
      const { data, error } = await supabase
        .from('inventory_items')
        .update({
          unit_level1_quantity: level1,
          unit_level2_quantity: level2,
          unit_level3_quantity: level3,
          // Sync legacy fields with unit_level fields
          carton_quantity_legacy: level1,
          box_quantity_legacy: level2,
          pieces_quantity_legacy: level3,
          // Other fields
          location: mergedData.location,
          product_name: mergedData.product_name,
          sku: mergedData.sku,
          lot: mergedData.lot,
          mfd: mergedData.mfd,
          unit_level1_name: mergedData.unit_level1_name,
          unit_level2_name: mergedData.unit_level2_name,
          unit_level3_name: mergedData.unit_level3_name,
          unit_level1_rate: mergedData.unit_level1_rate,
          unit_level2_rate: mergedData.unit_level2_rate,
          warehouse_id: mergedData.warehouse_id,
          updated_at: mergedData.updated_at,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          deleted: false,
          item: data,
          newQuantities: { level1, level2, level3 },
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async deductStock(payload: any): Promise<SecureGatewayResponse> {
    try {
      const { id, quantities } = payload;
      if (!id) return { success: false, error: 'Missing inventory item id' };

      const { data: currentItem, error: fetchError } = await supabase
        .from('inventory_items')
        .select('id, product_name, unit_level1_quantity, unit_level2_quantity, unit_level3_quantity')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const newLevel1 = (currentItem.unit_level1_quantity ?? 0) - (quantities.level1 ?? 0);
      const newLevel2 = (currentItem.unit_level2_quantity ?? 0) - (quantities.level2 ?? 0);
      const newLevel3 = (currentItem.unit_level3_quantity ?? 0) - (quantities.level3 ?? 0);

      if (newLevel1 < 0 || newLevel2 < 0 || newLevel3 < 0) {
        return { success: false, error: 'Insufficient stock levels' };
      }

      const totalRemaining = newLevel1 + newLevel2 + newLevel3;

      if (totalRemaining === 0) {
        const { error: deleteError } = await supabase
          .from('inventory_items')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        return {
          success: true,
          data: {
            deleted: true,
            isEmpty: false, // Location is now available for new items
            newQuantities: { level1: 0, level2: 0, level3: 0 },
          },
        };
      }

      const { data, error } = await supabase
        .from('inventory_items')
        .update({
          unit_level1_quantity: newLevel1,
          unit_level2_quantity: newLevel2,
          unit_level3_quantity: newLevel3,
          // Sync legacy fields with unit_level fields for consistency
          carton_quantity_legacy: newLevel1,
          box_quantity_legacy: newLevel2,
          pieces_quantity_legacy: newLevel3,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          deleted: false,
          newQuantities: {
            level1: newLevel1,
            level2: newLevel2,
            level3: newLevel3,
          },
          item: data,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async deleteInventoryItem(id: string): Promise<SecureGatewayResponse> {
    try {
      if (!id) return { success: false, error: 'Missing inventory item id' };

      console.log('🗑️ Deleting inventory item from database:', id);

      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Delete error:', error);
        throw error;
      }

      console.log('✅ Successfully deleted inventory item:', id);
      return { success: true, data: null };
    } catch (error: any) {
      console.error('❌ Delete operation failed:', error);
      return { success: false, error: error.message };
    }
  }
};

// Development mode detection
const isDevelopment = import.meta.env.DEV ||
                     (typeof window !== 'undefined' && window.location.hostname === 'localhost');

export const secureGatewayClient = {
  async get<T>(resource: string, params?: Record<string, string | number | null | undefined>, options?: RequestOptions) {
    // In development mode, use direct Supabase client to avoid CORS issues
    if (isDevelopment) {
      console.log(`Development mode: Using direct Supabase client for resource: ${resource}`);

      if (resource === 'products') {
        return fallbackMethods.getProducts() as Promise<SecureGatewayResponse<T>>;
      }

      if (resource === 'inventory') {
        return fallbackMethods.getInventory(
          params?.warehouseId?.toString(),
          params?.id?.toString()
        ) as Promise<SecureGatewayResponse<T>>;
      }

      if (resource === 'productBySku' && params?.sku) {
        return fallbackMethods.getProductBySku(params.sku.toString()) as Promise<SecureGatewayResponse<T>>;
      }
    }

    // Production mode: Try gateway first, fallback on error
    try {
      const url = new URL(resolveGatewayUrl());
      url.searchParams.set("resource", resource);

      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            url.searchParams.set(key, String(value));
          }
        });
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: DEFAULT_HEADERS,
        signal: options?.signal,
      });

      return handleResponse<T>(response);
    } catch (error: any) {
      console.warn(`Secure gateway failed for resource: ${resource}, falling back to direct Supabase client`, error);

      // Use fallback based on resource type
      if (resource === 'products') {
        return fallbackMethods.getProducts() as Promise<SecureGatewayResponse<T>>;
      }

      if (resource === 'inventory') {
        return fallbackMethods.getInventory(
          params?.warehouseId?.toString(),
          params?.id?.toString()
        ) as Promise<SecureGatewayResponse<T>>;
      }

      if (resource === 'productBySku' && params?.sku) {
        return fallbackMethods.getProductBySku(params.sku.toString()) as Promise<SecureGatewayResponse<T>>;
      }

      // If no fallback available, rethrow the error
      throw error;
    }
  },

  async delete(resource: string, params?: Record<string, string | number | null | undefined>, options?: RequestOptions) {
    // In development mode, use direct Supabase client for real database operations
    if (isDevelopment) {
      console.log(`Development mode: DELETE operation for resource: ${resource} (using direct Supabase)`);

      if (resource === 'inventory' && params?.id) {
        console.log('🗑️ DELETE inventory request:', { resource, id: params.id });
        return fallbackMethods.deleteInventoryItem(params.id.toString());
      }

      if (resource === 'products' && params?.id) {
        try {
          const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', params.id);

          if (error) throw error;
          return { success: true, data: null };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      }

      // For other resources, return error indicating not implemented
      return { success: false, error: `Delete operation for resource ${resource} not implemented in development mode` };
    }

    try {
      const url = new URL(resolveGatewayUrl());
      url.searchParams.set("resource", resource);

      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            url.searchParams.set(key, String(value));
          }
        });
      }

      const response = await fetch(url.toString(), {
        method: "DELETE",
        headers: DEFAULT_HEADERS,
        signal: options?.signal,
      });

      return handleResponse(response);
    } catch (error: any) {
      console.warn(`Delete operation failed for resource: ${resource}`, error);
      return { success: false, error: error.message };
    }
  },

  async mutate<T>(action: string, payload?: Record<string, unknown>, options?: RequestOptions) {
    // In development mode, use direct Supabase client for operations
    if (isDevelopment) {
      console.log(`Development mode: MUTATE operation for action: ${action} (using direct Supabase)`);

      // Handle specific actions with real database operations
      switch (action) {
        case 'createProduct':
          return fallbackMethods.createProduct(payload) as Promise<SecureGatewayResponse<T>>;

        case 'updateProduct':
          return fallbackMethods.updateProduct(payload) as Promise<SecureGatewayResponse<T>>;

        case 'createInventoryItem':
          return fallbackMethods.createInventoryItem(payload) as Promise<SecureGatewayResponse<T>>;

        case 'updateInventoryItem':
          return fallbackMethods.updateInventoryItem(payload) as Promise<SecureGatewayResponse<T>>;

        case 'deductStock':
          return fallbackMethods.deductStock(payload) as Promise<SecureGatewayResponse<T>>;

        // For other operations that don't have specific fallbacks, return mock success
        default:
          console.warn(`Development mode: No specific fallback for action: ${action}, returning mock success`);
          return { success: true, data: payload } as SecureGatewayResponse<T>;
      }
    }

    try {
      const gatewayUrl = resolveGatewayUrl();

      const response = await fetch(gatewayUrl, {
        method: "POST",
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ action, payload }),
        signal: options?.signal,
      });

      return handleResponse<T>(response);
    } catch (error: any) {
      console.warn(`Mutate operation failed for action: ${action}, trying fallback`, error);

      // Production fallback - try to use direct Supabase operations
      switch (action) {
        case 'createProduct':
          return fallbackMethods.createProduct(payload) as Promise<SecureGatewayResponse<T>>;

        case 'updateProduct':
          return fallbackMethods.updateProduct(payload) as Promise<SecureGatewayResponse<T>>;

        case 'createInventoryItem':
          return fallbackMethods.createInventoryItem(payload) as Promise<SecureGatewayResponse<T>>;

        case 'updateInventoryItem':
          return fallbackMethods.updateInventoryItem(payload) as Promise<SecureGatewayResponse<T>>;

        case 'deductStock':
          return fallbackMethods.deductStock(payload) as Promise<SecureGatewayResponse<T>>;

        default:
          return { success: false, error: error.message } as SecureGatewayResponse<T>;
      }
    }
  },
};
