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
          product_name: string
          sku: string
          location: string
          lot: string | null
          mfd: string | null
          carton_quantity_legacy: number | null
          box_quantity_legacy: number | null
          pieces_quantity_legacy: number | null
          quantity_pieces: number | null
          unit: string | null
          unit_level1_name: string | null
          unit_level1_quantity: number | null
          unit_level1_rate: number | null
          unit_level2_name: string | null
          unit_level2_quantity: number | null
          unit_level2_rate: number | null
          unit_level3_name: string | null
          unit_level3_quantity: number | null
          user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_name: string
          sku?: string
          location: string
          lot?: string | null
          mfd?: string | null
          carton_quantity_legacy?: number | null
          box_quantity_legacy?: number | null
          pieces_quantity_legacy?: number | null
          quantity_pieces?: number | null
          unit?: string | null
          unit_level1_name?: string | null
          unit_level1_quantity?: number | null
          unit_level1_rate?: number | null
          unit_level2_name?: string | null
          unit_level2_quantity?: number | null
          unit_level2_rate?: number | null
          unit_level3_name?: string | null
          unit_level3_quantity?: number | null
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_name?: string
          sku?: string
          location?: string
          lot?: string | null
          mfd?: string | null
          carton_quantity_legacy?: number | null
          box_quantity_legacy?: number | null
          pieces_quantity_legacy?: number | null
          quantity_pieces?: number | null
          unit?: string | null
          unit_level1_name?: string | null
          unit_level1_quantity?: number | null
          unit_level1_rate?: number | null
          unit_level2_name?: string | null
          unit_level2_quantity?: number | null
          unit_level2_rate?: number | null
          unit_level3_name?: string | null
          unit_level3_quantity?: number | null
          user_id?: string | null
          created_at?: string
          updated_at?: string
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
      inventory_movements: {
        Row: {
          id: string
          inventory_item_id: string | null
          item_id: string | null
          movement_type: string
          location_before: string | null
          location_after: string | null
          location_from: string | null
          location_to: string | null
          box_quantity_before: number | null
          box_quantity_after: number | null
          box_quantity_change: number | null
          loose_quantity_before: number | null
          loose_quantity_after: number | null
          loose_quantity_change: number | null
          carton_quantity_change: number | null
          pieces_quantity_change: number | null
          notes: string | null
          created_by: string | null
          user_id: string | null
          movement_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          inventory_item_id?: string | null
          item_id?: string | null
          movement_type: string
          location_before?: string | null
          location_after?: string | null
          location_from?: string | null
          location_to?: string | null
          box_quantity_before?: number | null
          box_quantity_after?: number | null
          box_quantity_change?: number | null
          loose_quantity_before?: number | null
          loose_quantity_after?: number | null
          loose_quantity_change?: number | null
          carton_quantity_change?: number | null
          pieces_quantity_change?: number | null
          notes?: string | null
          created_by?: string | null
          user_id?: string | null
          movement_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          inventory_item_id?: string | null
          item_id?: string | null
          movement_type?: string
          location_before?: string | null
          location_after?: string | null
          location_from?: string | null
          location_to?: string | null
          box_quantity_before?: number | null
          box_quantity_after?: number | null
          box_quantity_change?: number | null
          loose_quantity_before?: number | null
          loose_quantity_after?: number | null
          loose_quantity_change?: number | null
          carton_quantity_change?: number | null
          pieces_quantity_change?: number | null
          notes?: string | null
          created_by?: string | null
          user_id?: string | null
          movement_date?: string | null
          created_at?: string
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
export type InventoryMovement = Database['public']['Tables']['inventory_movements']['Row']
export type InventoryMovementInsert = Database['public']['Tables']['inventory_movements']['Insert']
export type InventoryMovementUpdate = Database['public']['Tables']['inventory_movements']['Update']