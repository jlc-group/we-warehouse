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
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
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
          notes: string | null
          order_date: string
          order_number: string
          order_type: string | null
          payment_terms: number | null
          priority: string | null
          shipped_at: string | null
          shipping_address_line1: string | null
          shipping_address_line2: string | null
          shipping_contact_person: string | null
          shipping_country: string | null
          shipping_district: string | null
          shipping_phone: string | null
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
          notes?: string | null
          order_date?: string
          order_number: string
          order_type?: string | null
          payment_terms?: number | null
          priority?: string | null
          shipped_at?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_contact_person?: string | null
          shipping_country?: string | null
          shipping_district?: string | null
          shipping_phone?: string | null
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
          notes?: string | null
          order_date?: string
          order_number?: string
          order_type?: string | null
          payment_terms?: number | null
          priority?: string | null
          shipped_at?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_contact_person?: string | null
          shipping_country?: string | null
          shipping_district?: string | null
          shipping_phone?: string | null
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
          business_type: string | null
          contact_person: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
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
          tags: string[] | null
          tax_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          business_type?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
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
          tags?: string[] | null
          tax_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          business_type?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
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
          tags?: string[] | null
          tax_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          discount_amount: number | null
          discount_percent: number | null
          id: string
          inventory_item_id: string | null
          level1_to_level2_conversion: number | null
          level2_to_level3_conversion: number | null
          line_number: number
          line_total: number | null
          location: string | null
          notes: string | null
          order_id: string
          ordered_quantity_level1: number | null
          ordered_quantity_level2: number | null
          ordered_quantity_level3: number | null
          picked_at: string | null
          picked_quantity_level1: number | null
          picked_quantity_level2: number | null
          picked_quantity_level3: number | null
          product_id: string | null
          product_name: string
          shipped_at: string | null
          shipped_quantity_level1: number | null
          shipped_quantity_level2: number | null
          shipped_quantity_level3: number | null
          sku: string
          status: string | null
          unit_level1_name: string | null
          unit_level2_name: string | null
          unit_level3_name: string | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          inventory_item_id?: string | null
          level1_to_level2_conversion?: number | null
          level2_to_level3_conversion?: number | null
          line_number: number
          line_total?: number | null
          location?: string | null
          notes?: string | null
          order_id: string
          ordered_quantity_level1?: number | null
          ordered_quantity_level2?: number | null
          ordered_quantity_level3?: number | null
          picked_at?: string | null
          picked_quantity_level1?: number | null
          picked_quantity_level2?: number | null
          picked_quantity_level3?: number | null
          product_id?: string | null
          product_name: string
          shipped_at?: string | null
          shipped_quantity_level1?: number | null
          shipped_quantity_level2?: number | null
          shipped_quantity_level3?: number | null
          sku: string
          status?: string | null
          unit_level1_name?: string | null
          unit_level2_name?: string | null
          unit_level3_name?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          inventory_item_id?: string | null
          level1_to_level2_conversion?: number | null
          level2_to_level3_conversion?: number | null
          line_number?: number
          line_total?: number | null
          location?: string | null
          notes?: string | null
          order_id?: string
          ordered_quantity_level1?: number | null
          ordered_quantity_level2?: number | null
          ordered_quantity_level3?: number | null
          picked_at?: string | null
          picked_quantity_level1?: number | null
          picked_quantity_level2?: number | null
          picked_quantity_level3?: number | null
          product_id?: string | null
          product_name?: string
          shipped_at?: string | null
          shipped_quantity_level1?: number | null
          shipped_quantity_level2?: number | null
          shipped_quantity_level3?: number | null
          sku?: string
          status?: string | null
          unit_level1_name?: string | null
          unit_level2_name?: string | null
          unit_level3_name?: string | null
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
          product_name: string
          product_type: string
          reorder_level: number | null
          sku_code: string
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
          product_name: string
          product_type: string
          reorder_level?: number | null
          sku_code: string
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

