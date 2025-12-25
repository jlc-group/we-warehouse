// @ts-expect-error: Deno runtime imports
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
// @ts-expect-error: Deno runtime imports
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

type JsonResponsePayload = {
  success: boolean;
  data?: unknown;
  error?: string;
};

type JsonHeaders = Record<string, string>;

const corsHeaders: JsonHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Max-Age": "86400",
};

// @ts-expect-error: Deno global
const supabaseUrl = Deno.env.get("SUPABASE_URL");
// @ts-expect-error: Deno global
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function jsonResponse(status: number, payload: JsonResponsePayload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 204, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const resource = url.searchParams.get("resource") ?? "";

    if (req.method === "GET") {
      if (resource === "products") {
        const { data, error } = await supabase
          .from("products")
          .select("id, sku_code, product_name, product_type, category, subcategory, brand, description, unit_of_measure, is_active, created_at, updated_at")
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        return jsonResponse(200, { success: true, data });
      }

      if (resource === "inventory") {
        const warehouseId = url.searchParams.get("warehouseId");
        const inventoryId = url.searchParams.get("id");
        let query = supabase
          .from("inventory_items")
          .select("*")
          .order("location", { ascending: true });

        // TODO: Add .eq("is_deleted", false) after running migration

        if (warehouseId) {
          query = query.eq("warehouse_id", warehouseId);
        }

        if (inventoryId) {
          query = query.eq("id", inventoryId);
        }

        const { data, error } = await query;
        if (error) {
          throw error;
        }

        if (inventoryId) {
          const [item] = data ?? [];
          return jsonResponse(200, { success: true, data: item ?? null });
        }

        return jsonResponse(200, { success: true, data });
      }

      if (resource === "productBySku") {
        const sku = url.searchParams.get("sku") ?? "";
        if (!sku) {
          return jsonResponse(400, { success: false, error: "Missing sku parameter" });
        }

        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("sku_code", sku)
          .maybeSingle();

        if (error) {
          throw error;
        }

        return jsonResponse(200, { success: true, data });
      }

      if (resource === "skuExists") {
        const sku = url.searchParams.get("sku") ?? "";
        const excludeId = url.searchParams.get("excludeId");

        if (!sku) {
          return jsonResponse(400, { success: false, error: "Missing sku parameter" });
        }

        let query = supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("sku_code", sku);

        if (excludeId) {
          query = query.neq("id", excludeId);
        }

        const { count, error } = await query;
        if (error) {
          throw error;
        }

        return jsonResponse(200, { success: true, data: { exists: (count ?? 0) > 0 } });
      }

      return jsonResponse(404, { success: false, error: "Resource not found" });
    }

    if (req.method === "DELETE") {
      if (resource === "inventory") {
        const id = url.searchParams.get("id");
        if (!id) {
          return jsonResponse(400, { success: false, error: "Missing inventory item id" });
        }

        const { error } = await supabase
          .from("inventory_items")
          .delete()
          .eq("id", id);

        if (error) {
          throw error;
        }

        return jsonResponse(200, { success: true });
      }

      if (resource === "products") {
        const id = url.searchParams.get("id");
        if (!id) {
          return jsonResponse(400, { success: false, error: "Missing product id" });
        }

        const { error } = await supabase
          .from("products")
          .delete()
          .eq("id", id);

        if (error) {
          throw error;
        }

        return jsonResponse(200, { success: true });
      }

      return jsonResponse(404, { success: false, error: "Unsupported delete resource" });
    }

    if (req.method === "POST" || req.method === "PATCH" || req.method === "PUT") {
      const body = await req.json();
      const action = body?.action ?? "";

      if (action === "createProduct") {
        const payload = body?.payload ?? {};
        const { data, error } = await supabase
          .from("products")
          .insert({ ...payload, updated_at: new Date().toISOString() })
          .select()
          .single();

        if (error) {
          throw error;
        }

        return jsonResponse(200, { success: true, data });
      }

      if (action === "updateProduct") {
        const payload = body?.payload ?? {};
        const id = payload?.id;
        const updates = payload?.updates ?? {};

        if (!id) {
          return jsonResponse(400, { success: false, error: "Missing product id" });
        }

        const { data, error } = await supabase
          .from("products")
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select()
          .single();

        if (error) {
          throw error;
        }

        return jsonResponse(200, { success: true, data });
      }

      if (action === "createInventoryItem") {
        const payload = body?.payload ?? {};
        const insertData = {
          ...payload,
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from("inventory_items")
          .insert(insertData)
          .select()
          .single();

        if (error) {
          throw error;
        }

        return jsonResponse(200, { success: true, data });
      }

      if (action === "updateInventoryItem") {
        const payload = body?.payload ?? {};
        const id = payload?.id;
        const updates = payload?.updates ?? {};

        if (!id) {
          return jsonResponse(400, { success: false, error: "Missing inventory item id" });
        }

        const { data: currentItem, error: fetchError } = await supabase
          .from("inventory_items")
          .select("*")
          .eq("id", id)
          .single();

        if (fetchError) {
          throw fetchError;
        }

        const mergedData = {
          ...currentItem,
          ...updates,
          updated_at: new Date().toISOString(),
        } as Record<string, unknown>;

        const level1 = Number(mergedData.unit_level1_quantity ?? 0);
        const level2 = Number(mergedData.unit_level2_quantity ?? 0);
        const level3 = Number(mergedData.unit_level3_quantity ?? 0);
        const totalQuantity = level1 + level2 + level3;

        if (totalQuantity === 0) {
          const { error: deleteError } = await supabase
            .from("inventory_items")
            .delete()
            .eq("id", id);

          if (deleteError) {
            throw deleteError;
          }

          return jsonResponse(200, {
            success: true,
            data: {
              deleted: true,
              newQuantities: { level1: 0, level2: 0, level3: 0 },
            },
          });
        }

        const { data, error } = await supabase
          .from("inventory_items")
          .update({
            unit_level1_quantity: level1,
            unit_level2_quantity: level2,
            unit_level3_quantity: level3,
            location: mergedData.location,
            product_name: mergedData.product_name,
            sku: mergedData.sku,
            lot: mergedData.lot,
            mfd: mergedData.mfd,
            carton_quantity_legacy: mergedData.carton_quantity_legacy,
            box_quantity_legacy: mergedData.box_quantity_legacy,
            unit_level1_name: mergedData.unit_level1_name,
            unit_level2_name: mergedData.unit_level2_name,
            unit_level3_name: mergedData.unit_level3_name,
            unit_level1_rate: mergedData.unit_level1_rate,
            unit_level2_rate: mergedData.unit_level2_rate,
            warehouse_id: mergedData.warehouse_id,
            updated_at: mergedData.updated_at,
          })
          .eq("id", id)
          .select()
          .single();

        if (error) {
          throw error;
        }

        return jsonResponse(200, {
          success: true,
          data: {
            deleted: false,
            item: data,
            newQuantities: {
              level1,
              level2,
              level3,
            },
          },
        });
      }

      if (action === "deductStock") {
        const payload = body?.payload ?? {};
        const id = payload?.id;
        const quantities = payload?.quantities ?? {};

        if (!id) {
          return jsonResponse(400, { success: false, error: "Missing inventory item id" });
        }

        const { data: currentItem, error: fetchError } = await supabase
          .from("inventory_items")
          .select("id, product_name, unit_level1_quantity, unit_level2_quantity, unit_level3_quantity")
          .eq("id", id)
          .single();

        if (fetchError) {
          throw fetchError;
        }

        const newLevel1 = (currentItem.unit_level1_quantity ?? 0) - (quantities.level1 ?? 0);
        const newLevel2 = (currentItem.unit_level2_quantity ?? 0) - (quantities.level2 ?? 0);
        const newLevel3 = (currentItem.unit_level3_quantity ?? 0) - (quantities.level3 ?? 0);

        if (newLevel1 < 0 || newLevel2 < 0 || newLevel3 < 0) {
          return jsonResponse(400, { success: false, error: "Insufficient stock levels" });
        }

        const totalRemaining = newLevel1 + newLevel2 + newLevel3;

        if (totalRemaining === 0) {
          // Temporarily use hard delete until migration is run
          const { error: deleteError } = await supabase
            .from("inventory_items")
            .delete()
            .eq("id", id);

          if (deleteError) {
            throw deleteError;
          }

          return jsonResponse(200, {
            success: true,
            data: {
              deleted: true,
              isEmpty: false, // Location is now available for new items
              newQuantities: { level1: 0, level2: 0, level3: 0 },
            },
          });
        }

        const { data, error } = await supabase
          .from("inventory_items")
          .update({
            unit_level1_quantity: newLevel1,
            unit_level2_quantity: newLevel2,
            unit_level3_quantity: newLevel3,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select()
          .single();

        if (error) {
          throw error;
        }

        return jsonResponse(200, {
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
        });
      }

      if (action === "bulkUpsertInventory") {
        const payload = body?.payload ?? {};
        const items = Array.isArray(payload?.items) ? payload.items : [];
        const clearExisting = Boolean(payload?.clearExisting);

        if (clearExisting) {
          await supabase.from("inventory_items").delete().neq("id", "");
        }

        if (items.length === 0) {
          return jsonResponse(200, { success: true, data: [] });
        }

        const { data, error } = await supabase
          .from("inventory_items")
          .upsert(items, { onConflict: "id" })
          .select();

        if (error) {
          throw error;
        }

        return jsonResponse(200, { success: true, data });
      }

      if (action === "clearInventory") {
        await supabase.from("inventory_items").delete().neq("id", "");
        return jsonResponse(200, { success: true });
      }

      if (action === "transferInventoryItems") {
        const payload = body?.payload ?? {};
        const ids = Array.isArray(payload?.ids) ? payload.ids : [];
        const targetLocation = payload?.targetLocation;
        const notes = payload?.notes ?? null;

        if (!ids.length || !targetLocation) {
          return jsonResponse(400, { success: false, error: "Missing ids or targetLocation" });
        }

        const normalizedLocation = targetLocation;

        const { data: currentItems, error: fetchError } = await supabase
          .from("inventory_items")
          .select("id, location, product_name")
          .in("id", ids);

        if (fetchError) {
          throw fetchError;
        }

        const { error: updateError } = await supabase
          .from("inventory_items")
          .update({ location: normalizedLocation, updated_at: new Date().toISOString() })
          .in("id", ids);

        if (updateError) {
          throw updateError;
        }

        if (currentItems && currentItems.length > 0) {
          const movementLogs = currentItems.map((item: any) => ({
            item_id: item.id,
            movement_type: "transfer",
            location_from: item.location,
            location_to: normalizedLocation,
            notes: notes ?? `ย้ายจาก ${item.location} ไป ${normalizedLocation}`,
            created_at: new Date().toISOString(),
          }));

          await supabase.from("inventory_movements").insert(movementLogs);
        }

        return jsonResponse(200, { success: true });
      }

      if (action === "shipOutInventoryItems") {
        const payload = body?.payload ?? {};
        const ids = Array.isArray(payload?.ids) ? payload.ids : [];
        const notes = payload?.notes ?? null;

        if (!ids.length) {
          return jsonResponse(400, { success: false, error: "Missing ids" });
        }

        const { data: itemsToShip, error: fetchError } = await supabase
          .from("inventory_items")
          .select("id, product_name, location")
          .in("id", ids);

        if (fetchError) {
          throw fetchError;
        }

        const { error: deleteError } = await supabase
          .from("inventory_items")
          .delete()
          .in("id", ids);

        if (deleteError) {
          throw deleteError;
        }

        if (itemsToShip && itemsToShip.length > 0) {
          const movementLogs = itemsToShip.map((item: any) => ({
            item_id: item.id,
            movement_type: "ship_out",
            location_from: item.location,
            location_to: null,
            notes: notes ?? `ส่งออกจาก ${item.location}`,
            created_at: new Date().toISOString(),
          }));

          await supabase.from("inventory_movements").insert(movementLogs);
        }

        return jsonResponse(200, { success: true });
      }

      return jsonResponse(404, { success: false, error: "Unsupported action" });
    }

    return jsonResponse(405, { success: false, error: "Method not allowed" });
  } catch (error) {
    console.error("secure-gateway error", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    // Return 200 OK with error payload to avoid CORS issues in development
    return jsonResponse(200, { success: false, error: message });
  }
});
