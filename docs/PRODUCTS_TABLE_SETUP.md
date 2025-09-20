# Products Table Setup Guide

This guide explains how to set up and use the products table in Supabase for the warehouse management system.

## Overview

The products table serves as the master data source for all products in the warehouse system, providing:
- Complete product information (FG and PK products)
- Standardized product data structure
- Better data integrity and relationships
- Foundation for future features

## Database Structure

### Products Table Schema

```sql
Table: products
- id: UUID (Primary Key)
- sku_code: VARCHAR(50) UNIQUE NOT NULL
- product_name: TEXT NOT NULL
- product_type: VARCHAR(10) CHECK ('FG', 'PK')
- category: VARCHAR(50)
- subcategory: VARCHAR(50)
- brand: VARCHAR(50) DEFAULT 'Chulaherb'
- description: TEXT
- unit_of_measure: VARCHAR(20) DEFAULT 'pieces'
- weight: DECIMAL(10,3)
- dimensions: TEXT
- storage_conditions: TEXT DEFAULT 'อุณหภูมิห้อง'
- manufacturing_country: VARCHAR(50) DEFAULT 'Thailand'
- reorder_level: INTEGER DEFAULT 10
- max_stock_level: INTEGER DEFAULT 100
- unit_cost: DECIMAL(10,2)
- is_active: BOOLEAN DEFAULT true
- created_at: TIMESTAMP WITH TIME ZONE
- updated_at: TIMESTAMP WITH TIME ZONE
```

## Setup Instructions

### 1. Run Database Migrations

Execute the following migrations in your Supabase SQL editor:

```bash
# 1. Create the products table
# Run: supabase/migrations/001_create_products_table.sql

# 2. Populate initial data
# Run: supabase/migrations/002_populate_products_data.sql
```

### 2. Populate Complete Product Data

To populate all products from sampleInventory.ts:

```bash
# Option 1: Run the Node.js script
cd scripts
node populate-products.js

# Option 2: Import via application interface (if implemented)
```

### 3. Update TypeScript Types

After creating the table, regenerate Supabase types:

```bash
# Generate new types
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
```

## Product Categories

### FG Products (Finished Goods)
- **Category**: cosmetics
- **Subcategories**:
  - skincare (เซรั่ม, ครีม, เจล)
  - sunscreen (ซันสกรีน, ยูวี)
  - oral_care (ทูธเพสท์)
  - makeup (คูชั่น, ลิป)
  - mask (มาสก์)

### PK Products (Packaging)
- **Category**: packaging
- **Subcategories**:
  - caps (ฝา)
  - boxes (กล่อง)
  - bottles (ขวด)
  - tubes (หลอด)
  - sachets (ซอง)
  - spouts (จุก)
  - sticks (แท่ง)
  - stoppers (จุกกัน)

## Data Relationships

### Current Structure
```
inventory_items.sku → products.sku_code (Foreign Key relationship)
```

### Future Enhancements
- Product variants and specifications
- Supplier relationships
- Price history
- Product images and documents

## Usage Examples

### Query Products by Type
```sql
-- Get all FG products
SELECT * FROM products WHERE product_type = 'FG' AND is_active = true;

-- Get packaging materials
SELECT * FROM products WHERE product_type = 'PK' AND is_active = true;
```

### Get Products with Inventory Count
```sql
-- Use the pre-created view
SELECT * FROM products_with_counts
WHERE inventory_items_count > 0
ORDER BY total_stock_quantity DESC;
```

### Join with Inventory
```sql
-- Get product details with inventory locations
SELECT
    p.sku_code,
    p.product_name,
    p.product_type,
    i.location,
    i.carton_quantity_legacy + i.box_quantity_legacy + i.pieces_quantity_legacy as total_qty
FROM products p
JOIN inventory_items i ON p.sku_code = i.sku
WHERE p.is_active = true
ORDER BY p.product_type, p.sku_code;
```

## Migration Benefits

1. **Data Consistency**: Single source of truth for product information
2. **Better Performance**: Indexed queries and optimized relationships
3. **Scalability**: Easy to add new product attributes and relationships
4. **Maintenance**: Centralized product data management
5. **Features**: Foundation for advanced inventory features

## Next Steps

After setting up the products table:

1. **Update Application Code**: Modify modals to use products table
2. **Add Product Management**: Create CRUD interface for products
3. **Data Validation**: Implement product code validation
4. **Reporting**: Enhanced analytics with product categories
5. **Integration**: Connect with external systems via products API

## Troubleshooting

### Common Issues

1. **Duplicate SKU Codes**: Use `ON CONFLICT (sku_code) DO NOTHING` for safe inserts
2. **Missing Products**: Run the populate script to ensure all products are imported
3. **Type Mismatches**: Verify product_type values are only 'FG' or 'PK'

### Verification Queries

```sql
-- Check total product count
SELECT product_type, COUNT(*) FROM products GROUP BY product_type;

-- Find products without inventory
SELECT p.* FROM products p
LEFT JOIN inventory_items i ON p.sku_code = i.sku
WHERE i.sku IS NULL;

-- Check for orphaned inventory items
SELECT DISTINCT i.sku FROM inventory_items i
LEFT JOIN products p ON i.sku = p.sku_code
WHERE p.sku_code IS NULL;
```