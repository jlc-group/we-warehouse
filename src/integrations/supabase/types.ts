export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
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
  public: {
    Tables: {
      departments: {
        Row: {
          id: string
          name: string
          name_thai: string
          description: string | null
          color: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          name_thai: string
          description?: string | null
          color: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          name_thai?: string
          description?: string | null
          color?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          id: string
          name: string
          name_thai: string
          description: string | null
          permissions: string[]
          level: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          name_thai: string
          description?: string | null
          permissions?: string[]
          level: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          name_thai?: string
          description?: string | null
          permissions?: string[]
          level?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      warehouse_locations: {
        Row: {
          id: string
          location_code: string
          row: string
          level: number
          position: number
          location_type: "shelf" | "floor" | "special"
          capacity_boxes: number
          capacity_loose: number
          description: string | null
          warehouse_id: string | null
          is_active: boolean
          user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          location_code: string
          row: string
          level: number
          position: number
          location_type: "shelf" | "floor" | "special"
          capacity_boxes: number
          capacity_loose: number
          description?: string | null
          warehouse_id?: string | null
          is_active?: boolean
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          location_code?: string
          row?: string
          level?: number
          position?: number
          location_type?: "shelf" | "floor" | "special"
          capacity_boxes?: number
          capacity_loose?: number
          description?: string | null
          warehouse_id?: string | null
          is_active?: boolean
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_locations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          }
        ]
      }
      customer_orders: {
        Row: {
          confirmed_at: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          customer_id: string
          customer_po_number: string | null
          delivered_at: string | null
          discount_amount: number | null
          due_date: string | null
          final_amount: number | null
          id: string
          internal_notes: string | null
          order_date: string | null
          order_number: string
          order_type: string | null
          priority: string | null
          shipped_at: string | null
          shipping_address_line1: string | null
          shipping_address_line2: string | null
          shipping_city: string | null
          shipping_district: string | null
          shipping_postal_code: string | null
          shipping_province: string | null
          status: string | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
          updated_by: string | null
          warehouse_id: string | null
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_id: string
          customer_po_number?: string | null
          delivered_at?: string | null
          discount_amount?: number | null
          due_date?: string | null
          final_amount?: number | null
          id?: string
          internal_notes?: string | null
          order_date?: string | null
          order_number?: string
          order_type?: string | null
          priority?: string | null
          shipped_at?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_district?: string | null
          shipping_postal_code?: string | null
          shipping_province?: string | null
          status?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
          updated_by?: string | null
          warehouse_id?: string | null
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_id?: string
          customer_po_number?: string | null
          delivered_at?: string | null
          discount_amount?: number | null
          due_date?: string | null
          final_amount?: number | null
          id?: string
          internal_notes?: string | null
          order_date?: string | null
          order_number?: string
          order_type?: string | null
          priority?: string | null
          shipped_at?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_district?: string | null
          shipping_postal_code?: string | null
          shipping_province?: string | null
          status?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
          updated_by?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          country: string | null
          contact_person: string | null
          created_at: string | null
          credit_limit: number | null
          customer_code: string
          customer_name: string
          customer_type: string | null
          district: string | null
          email: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          payment_terms: number | null
          phone: string | null
          postal_code: string | null
          province: string | null
          tax_id: string | null
          updated_at: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          country?: string | null
          contact_person?: string | null
          created_at?: string | null
          credit_limit?: number | null
          customer_code: string
          customer_name: string
          customer_type?: string | null
          district?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          payment_terms?: number | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          country?: string | null
          contact_person?: string | null
          created_at?: string | null
          credit_limit?: number | null
          customer_code?: string
          customer_name?: string
          customer_type?: string | null
          district?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          payment_terms?: number | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          box_quantity_legacy: number | null
          carton_quantity_legacy: number | null
          created_at: string | null
          id: string
          location: string
          lot: string | null
          mfd: string | null
          product_name: string
          sku: string | null
          unit_level1_name: string | null
          unit_level1_quantity: number | null
          unit_level1_rate: number | null
          unit_level2_name: string | null
          unit_level2_quantity: number | null
          unit_level2_rate: number | null
          unit_level3_name: string | null
          unit_level3_quantity: number | null
          updated_at: string | null
          user_id: string | null
          warehouse_id: string | null
        }
        Insert: {
          box_quantity_legacy?: number | null
          carton_quantity_legacy?: number | null
          created_at?: string | null
          id?: string
          location: string
          lot?: string | null
          mfd?: string | null
          product_name: string
          sku?: string | null
          unit_level1_name?: string | null
          unit_level1_quantity?: number | null
          unit_level1_rate?: number | null
          unit_level2_name?: string | null
          unit_level2_quantity?: number | null
          unit_level2_rate?: number | null
          unit_level3_name?: string | null
          unit_level3_quantity?: number | null
          updated_at?: string | null
          user_id?: string | null
          warehouse_id?: string | null
        }
        Update: {
          box_quantity_legacy?: number | null
          carton_quantity_legacy?: number | null
          created_at?: string | null
          id?: string
          location?: string
          lot?: string | null
          mfd?: string | null
          product_name?: string
          sku?: string | null
          unit_level1_name?: string | null
          unit_level1_quantity?: number | null
          unit_level1_rate?: number | null
          unit_level2_name?: string | null
          unit_level2_quantity?: number | null
          unit_level2_rate?: number | null
          unit_level3_name?: string | null
          unit_level3_quantity?: number | null
          updated_at?: string | null
          user_id?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          confirmed_quantity: number | null
          created_at: string | null
          id: string
          inventory_item_id: string | null
          line_number: number | null
          notes: string | null
          order_id: string
          picked_quantity: number | null
          product_name: string | null
          quantity_requested: number | null
          reserved_quantity: number | null
          shipped_quantity: number | null
          sku: string | null
          unit_level1_name: string | null
          unit_level1_quantity: number | null
          unit_level1_rate: number | null
          unit_level2_name: string | null
          unit_level2_quantity: number | null
          unit_level2_rate: number | null
          unit_level3_name: string | null
          unit_level3_quantity: number | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          confirmed_quantity?: number | null
          created_at?: string | null
          id?: string
          inventory_item_id?: string | null
          line_number?: number | null
          notes?: string | null
          order_id: string
          picked_quantity?: number | null
          product_name?: string | null
          quantity_requested?: number | null
          reserved_quantity?: number | null
          shipped_quantity?: number | null
          sku?: string | null
          unit_level1_name?: string | null
          unit_level1_quantity?: number | null
          unit_level1_rate?: number | null
          unit_level2_name?: string | null
          unit_level2_quantity?: number | null
          unit_level2_rate?: number | null
          unit_level3_name?: string | null
          unit_level3_quantity?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          confirmed_quantity?: number | null
          created_at?: string | null
          id?: string
          inventory_item_id?: string | null
          line_number?: number | null
          notes?: string | null
          order_id?: string
          picked_quantity?: number | null
          product_name?: string | null
          quantity_requested?: number | null
          reserved_quantity?: number | null
          shipped_quantity?: number | null
          sku?: string | null
          unit_level1_name?: string | null
          unit_level1_quantity?: number | null
          unit_level1_rate?: number | null
          unit_level2_name?: string | null
          unit_level2_quantity?: number | null
          unit_level2_rate?: number | null
          unit_level3_name?: string | null
          unit_level3_quantity?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "customer_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          category: string | null
          created_at: string | null
          description: string | null
          dimensions: string | null
          id: string
          is_active: boolean | null
          manufacturing_country: string | null
          max_stock_level: number | null
          product_name: string | null
          product_type: string | null
          reorder_level: number | null
          sku_code: string | null
          storage_conditions: string | null
          subcategory: string | null
          unit_cost: number | null
          unit_of_measure: string | null
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          dimensions?: string | null
          id?: string
          is_active?: boolean | null
          manufacturing_country?: string | null
          max_stock_level?: number | null
          product_name?: string
          product_type?: string
          reorder_level?: number | null
          sku_code?: string
          storage_conditions?: string | null
          subcategory?: string | null
          unit_cost?: number | null
          unit_of_measure?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          dimensions?: string | null
          id?: string
          is_active?: boolean | null
          manufacturing_country?: string | null
          max_stock_level?: number | null
          product_name?: string
          product_type?: string
          reorder_level?: number | null
          sku_code?: string
          storage_conditions?: string | null
          subcategory?: string | null
          unit_cost?: number | null
          unit_of_measure?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      warehouses: {
        Row: {
          address: string | null
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          location_prefix_end: string | null
          location_prefix_start: string | null
          max_levels: number | null
          max_positions: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          location_prefix_end?: string | null
          location_prefix_start?: string | null
          max_levels?: number | null
          max_positions?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          location_prefix_end?: string | null
          location_prefix_start?: string | null
          max_levels?: number | null
          max_positions?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_order_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

// Specific type exports for easier usage
export type CustomerOrder = Tables<'customer_orders'>
export type CustomerOrderInsert = TablesInsert<'customer_orders'>
export type CustomerOrderUpdate = TablesUpdate<'customer_orders'>

export type OrderItem = Tables<'order_items'>
export type OrderItemInsert = TablesInsert<'order_items'>
export type OrderItemUpdate = TablesUpdate<'order_items'>

export type Customer = Tables<'customers'>
export type CustomerInsert = TablesInsert<'customers'>
export type CustomerUpdate = TablesUpdate<'customers'>

export type Warehouse = Tables<'warehouses'>
export type WarehouseInsert = TablesInsert<'warehouses'>
export type WarehouseUpdate = TablesUpdate<'warehouses'>

export type InventoryItem = Tables<'inventory_items'>
export type InventoryItemInsert = TablesInsert<'inventory_items'>
export type InventoryItemUpdate = TablesUpdate<'inventory_items'>

export type Product = Tables<'products'>
export type ProductInsert = TablesInsert<'products'>
export type ProductUpdate = TablesUpdate<'products'>

export type Department = Tables<'departments'>
export type DepartmentInsert = TablesInsert<'departments'>
export type DepartmentUpdate = TablesUpdate<'departments'>

export type Role = Tables<'roles'>
export type RoleInsert = TablesInsert<'roles'>
export type RoleUpdate = TablesUpdate<'roles'>

export type WarehouseLocation = Tables<'warehouse_locations'>
export type WarehouseLocationInsert = TablesInsert<'warehouse_locations'>
export type WarehouseLocationUpdate = TablesUpdate<'warehouse_locations'>