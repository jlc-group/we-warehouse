-- Update Stock Overview System to include product_type from products table
-- This replaces the previous function with JOIN to products table

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
  -- Calculate summary statistics
  WITH summary_stats AS (
    SELECT
      COUNT(DISTINCT ii.id) as total_items,
      COUNT(DISTINCT ii.sku) as total_products,
      COUNT(DISTINCT ii.location) as total_locations,
      COALESCE(SUM(ii.unit_level3_quantity), 0) as total_pieces,
      COALESCE(SUM(ii.unit_level1_quantity), 0) as total_cartons
    FROM inventory_items ii
    WHERE
      (p_warehouse_id IS NULL OR ii.warehouse_id = p_warehouse_id)
  )
  SELECT json_build_object(
    'totalItems', total_items,
    'totalProducts', total_products,
    'totalLocations', total_locations,
    'totalPieces', ROUND(total_pieces::numeric, 2),
    'totalCartons', ROUND(total_cartons::numeric, 2),
    'timestamp', EXTRACT(EPOCH FROM NOW())::bigint
  )
  INTO v_summary
  FROM summary_stats;

  -- Get detailed items grouped by SKU with product_type from products table
  WITH item_details AS (
    SELECT
      ii.sku as sku_code,
      MAX(ii.product_name) as product_name,
      COALESCE(MAX(p.product_type), 'อื่นๆ') as product_type,
      MAX(p.brand) as brand,
      COUNT(DISTINCT ii.location) as location_count,
      COALESCE(SUM(ii.unit_level3_quantity), 0) as total_pieces,
      COALESCE(SUM(ii.unit_level1_quantity), 0) as total_cartons,
      ARRAY_AGG(DISTINCT ii.location ORDER BY ii.location) as locations,
      MAX(ii.updated_at) as last_updated
    FROM inventory_items ii
    LEFT JOIN products p ON ii.sku = p.sku_code AND p.is_active = true
    WHERE
      (p_warehouse_id IS NULL OR ii.warehouse_id = p_warehouse_id)
      AND ii.sku IS NOT NULL
    GROUP BY ii.sku
    ORDER BY total_pieces DESC
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
      'locations', locations,
      'lastUpdated', last_updated
    )
  )
  INTO v_items
  FROM item_details;

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

-- Add index for better join performance
CREATE INDEX IF NOT EXISTS idx_products_sku_code
ON products(sku_code) WHERE is_active = true;
