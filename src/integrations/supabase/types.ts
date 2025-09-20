export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          sku_code: string
          product_name: string
          product_type: 'FG' | 'PK'
          category: string | null
          subcategory: string | null
          brand: string | null
          description: string | null
          unit_of_measure: string | null
          weight: number | null
          dimensions: string | null
          storage_conditions: string | null
          manufacturing_country: string | null
          reorder_level: number | null
          max_stock_level: number | null
          unit_cost: number | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          sku_code: string
          product_name: string
          product_type: 'FG' | 'PK'
          category?: string | null
          subcategory?: string | null
          brand?: string | null
          description?: string | null
          unit_of_measure?: string | null
          weight?: number | null
          dimensions?: string | null
          storage_conditions?: string | null
          manufacturing_country?: string | null
          reorder_level?: number | null
          max_stock_level?: number | null
          unit_cost?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          sku_code?: string
          product_name?: string
          product_type?: 'FG' | 'PK'
          category?: string | null
          subcategory?: string | null
          brand?: string | null
          description?: string | null
          unit_of_measure?: string | null
          weight?: number | null
          dimensions?: string | null
          storage_conditions?: string | null
          manufacturing_country?: string | null
          reorder_level?: number | null
          max_stock_level?: number | null
          unit_cost?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      inventory_items: {
        Row: {
          id: string
          sku: string
          location: string
          carton_quantity_legacy: number | null
          box_quantity_legacy: number | null
          pieces_quantity_legacy: number | null
          unit_level1_quantity: number | null
          unit_level2_quantity: number | null
          unit_level3_quantity: number | null
          user_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          sku: string
          location: string
          carton_quantity_legacy?: number | null
          box_quantity_legacy?: number | null
          pieces_quantity_legacy?: number | null
          unit_level1_quantity?: number | null
          unit_level2_quantity?: number | null
          unit_level3_quantity?: number | null
          user_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          sku?: string
          location?: string
          carton_quantity_legacy?: number | null
          box_quantity_legacy?: number | null
          pieces_quantity_legacy?: number | null
          unit_level1_quantity?: number | null
          unit_level2_quantity?: number | null
          unit_level3_quantity?: number | null
          user_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      product_conversion_rates: {
        Row: {
          id: string
          sku: string
          product_name: string
          unit_level1_name: string | null
          unit_level2_name: string | null
          unit_level3_name: string | null
          unit_level1_rate: number | null
          unit_level2_rate: number | null
          created_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          sku: string
          product_name: string
          unit_level1_name?: string | null
          unit_level2_name?: string | null
          unit_level3_name?: string | null
          unit_level1_rate?: number | null
          unit_level2_rate?: number | null
          created_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          sku?: string
          product_name?: string
          unit_level1_name?: string | null
          unit_level2_name?: string | null
          unit_level3_name?: string | null
          unit_level1_rate?: number | null
          unit_level2_rate?: number | null
          created_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
      }
    }
    Views: {
      products_with_counts: {
        Row: {
          id: string
          sku_code: string
          product_name: string
          product_type: 'FG' | 'PK'
          category: string | null
          subcategory: string | null
          brand: string | null
          description: string | null
          unit_of_measure: string | null
          weight: number | null
          dimensions: string | null
          storage_conditions: string | null
          manufacturing_country: string | null
          reorder_level: number | null
          max_stock_level: number | null
          unit_cost: number | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
          inventory_items_count: number
          total_stock_quantity: number
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Type aliases for convenience
export type Product = Database['public']['Tables']['products']['Row']
export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type ProductUpdate = Database['public']['Tables']['products']['Update']
export type ProductWithCounts = Database['public']['Views']['products_with_counts']['Row']
export type InventoryItem = Database['public']['Tables']['inventory_items']['Row']
export type ProductConversionRate = Database['public']['Tables']['product_conversion_rates']['Row']
export type ProductConversionRateInsert = Database['public']['Tables']['product_conversion_rates']['Insert']
export type ProductConversionRateUpdate = Database['public']['Tables']['product_conversion_rates']['Update']