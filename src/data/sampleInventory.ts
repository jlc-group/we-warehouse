// Configuration constants for the warehouse management system
// This file contains essential configuration data for product types and mappings

export type ProductType = 'FG' | 'PK' | 'RM';

// Product type configurations
export const PRODUCT_TYPES: { value: ProductType; label: string; color: string }[] = [
  { value: 'FG', label: 'สินค้าสำเร็จรูป', color: 'purple' },
  { value: 'PK', label: 'บรรจุภัณฑ์', color: 'orange' },
  { value: 'RM', label: 'วัตถุดิบ', color: 'blue' }
];

// Product name mapping for SKU lookup
export const PRODUCT_NAME_MAPPING: Record<string, string> = {
  // This will be populated with actual product data from the database
  // Format: "SKU": "Product Name"
};

// Helper functions
export const getProductType = (sku: string): ProductType => {
  // Default logic for determining product type from SKU
  if (sku.startsWith('L')) return 'FG'; // Finished Goods
  if (sku.startsWith('P')) return 'PK'; // Packaging
  if (sku.startsWith('R')) return 'RM'; // Raw Materials
  return 'FG'; // Default to Finished Goods
};

export const getProductTypeDisplayName = (type: ProductType): string => {
  const productType = PRODUCT_TYPES.find(pt => pt.value === type);
  return productType?.label || type;
};

export const getProductsByType = (type: ProductType): string[] => {
  // This function would filter products by type from the database
  // For now, return empty array as this should use real data
  return [];
};