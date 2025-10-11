// Shared types for conversion rate system
// This file prevents circular dependencies by centralizing type definitions

export interface ConversionRateData {
  sku: string;
  product_name: string;
  product_id?: string; // Foreign key to products table
  product_type?: string; // Product type (FG, PK, RM, etc.)
  unit_level1_name: string;
  unit_level1_rate: number;
  unit_level2_name: string;
  unit_level2_rate: number;
  unit_level3_name: string;
  created_at?: string;
  updated_at?: string;
  isDefault?: boolean;
}

export interface ConversionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ProductWithConversion {
  id: string;
  product_name: string;
  sku_code: string;
  product_type: string;
  brand?: string;
  category?: string;
  unit_of_measure: string;
  is_active: boolean;
  created_at: string;
  conversion_rates?: ConversionRateData;
}

export interface ConversionRateInput {
  sku: string;
  product_name: string;
  product_id?: string;
  product_type?: string;
  unit_level1_name?: string;
  unit_level1_rate?: number;
  unit_level2_name?: string;
  unit_level2_rate?: number;
  unit_level3_name?: string;
}

// New interface for products with conversion rates view
export interface ProductWithConversionRate {
  id: string;
  sku_code: string;
  product_name: string;
  product_type: string;
  category: string | null;
  brand: string | null;
  unit_of_measure: string | null;
  is_active: boolean;
  product_created_at: string | null;
  product_updated_at: string | null;
  conversion_id: string | null;
  unit_level1_name: string | null;
  unit_level1_rate: number | null;
  unit_level2_name: string | null;
  unit_level2_rate: number | null;
  unit_level3_name: string | null;
  conversion_created_at: string | null;
  conversion_updated_at: string | null;
}