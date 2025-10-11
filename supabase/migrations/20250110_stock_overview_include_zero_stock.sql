-- Stock Overview: Include all products with zero stock
-- This migration updates the stock overview function to show ALL active products
-- including those with zero stock, so users can see the complete product catalog

CREATE OR REPLACE FUNCTION get_stock_overview(
  p_warehouse_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_summary JSON;
  v_items JSON;
  v_result JSON;
BEGIN
  -- Calculate summary statistics from inventory items only (not zero stock products)
  WITH summary_stats AS (
    SELECT
      COUNT(DISTINCT ii.id) as total_items,
      COUNT(DISTINCT ii.sku) as total_products_with_stock,
      COUNT(DISTINCT ii.location) as total_locations,
      -- Calculate total pieces using multi-level formula
      COALESCE(SUM(
        (COALESCE(ii.unit_level1_quantity, 0) * COALESCE(ii.unit_level1_rate, 0)) +
        (COALESCE(ii.unit_level2_quantity, 0) * COALESCE(ii.unit_level2_rate, 0)) +
        COALESCE(ii.unit_level3_quantity, 0)
      ), 0) as total_pieces,
      COALESCE(SUM(ii.unit_level1_quantity), 0) as total_cartons
    FROM inventory_items ii
    WHERE
      (p_warehouse_id IS NULL OR ii.warehouse_id = p_warehouse_id)
  ),
  all_products_count AS (
    SELECT COUNT(*) as total_products
    FROM products
    WHERE is_active = true
  )
  SELECT json_build_object(
    'totalItems', s.total_items,
    'totalProducts', p.total_products, -- Total active products including zero stock
    'totalLocations', s.total_locations,
    'totalPieces', ROUND(s.total_pieces::numeric, 2),
    'totalCartons', ROUND(s.total_cartons::numeric, 2),
    'timestamp', EXTRACT(EPOCH FROM NOW())::bigint
  )
  INTO v_summary
  FROM summary_stats s, all_products_count p;

  -- Get ALL active products, including those with zero stock
  WITH product_inventory AS (
    SELECT
      p.sku_code,
      p.product_name,
      COALESCE(p.product_type, 'อื่นๆ') as product_type,
      p.brand,
      -- Aggregate inventory data per SKU
      COUNT(DISTINCT ii.location) as location_count,
      COALESCE(SUM(
        (COALESCE(ii.unit_level1_quantity, 0) * COALESCE(ii.unit_level1_rate, 0)) +
        (COALESCE(ii.unit_level2_quantity, 0) * COALESCE(ii.unit_level2_rate, 0)) +
        COALESCE(ii.unit_level3_quantity, 0)
      ), 0) as total_pieces,
      COALESCE(SUM(ii.unit_level1_quantity), 0) as total_cartons,
      ARRAY_REMOVE(ARRAY_AGG(DISTINCT ii.location ORDER BY ii.location), NULL) as locations,
      MAX(COALESCE(ii.updated_at, p.updated_at)) as last_updated
    FROM products p
    LEFT JOIN inventory_items ii ON p.sku_code = ii.sku
      AND (p_warehouse_id IS NULL OR ii.warehouse_id = p_warehouse_id)
    WHERE p.is_active = true
    GROUP BY p.sku_code, p.product_name, p.product_type, p.brand
    ORDER BY
      -- Sort: products with stock first (by quantity desc), then zero stock alphabetically
      CASE WHEN SUM(COALESCE(ii.unit_level1_quantity, 0) + COALESCE(ii.unit_level2_quantity, 0) + COALESCE(ii.unit_level3_quantity, 0)) > 0 THEN 0 ELSE 1 END,
      COALESCE(SUM(
        (COALESCE(ii.unit_level1_quantity, 0) * COALESCE(ii.unit_level1_rate, 0)) +
        (COALESCE(ii.unit_level2_quantity, 0) * COALESCE(ii.unit_level2_rate, 0)) +
        COALESCE(ii.unit_level3_quantity, 0)
      ), 0) DESC,
      p.sku_code ASC
  )
  SELECT json_agg(
    json_build_object(
      'skuCode', sku_code,
      'productName', product_name,
      'productType', product_type,
      'brand', brand,
      'locationCount', location_count,
      'totalPieces', ROUND(total_pieces::numeric, 2),
      'totalCartons', ROUND(total_cartons::numeric, 2),
      'locations', COALESCE(locations, ARRAY[]::text[]),
      'lastUpdated', last_updated,
      'hasStock', CASE WHEN total_pieces > 0 THEN true ELSE false END
    )
  )
  INTO v_items
  FROM product_inventory;

  -- Combine summary and items
  v_result := json_build_object(
    'summary', v_summary,
    'items', COALESCE(v_items, '[]'::json),
    'warehouseId', p_warehouse_id,
    'generatedAt', NOW()
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_stock_overview IS
'Returns stock overview including ALL active products (even with zero stock).
Products with stock are sorted by quantity desc, zero stock products alphabetically.';
