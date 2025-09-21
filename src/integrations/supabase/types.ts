export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          attendees_count: number | null
          booking_date: string
          confirmation_status: string | null
          confirmed_at: string | null
          created_at: string
          description: string | null
          end_time: string
          id: string
          room_id: string
          start_time: string
          status: string | null
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attendees_count?: number | null
          booking_date: string
          confirmation_status?: string | null
          confirmed_at?: string | null
          created_at?: string
          description?: string | null
          end_time: string
          id?: string
          room_id: string
          start_time: string
          status?: string | null
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attendees_count?: number | null
          booking_date?: string
          confirmation_status?: string | null
          confirmed_at?: string | null
          created_at?: string
          description?: string | null
          end_time?: string
          id?: string
          room_id?: string
          start_time?: string
          status?: string | null
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "meeting_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendees: {
        Row: {
          created_at: string | null
          details: string | null
          event_id: string
          id: string
          name: string
          payment_amount: number | null
          payment_status: string | null
          slip_url: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: string | null
          event_id: string
          id?: string
          name: string
          payment_amount?: number | null
          payment_status?: string | null
          slip_url?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: string | null
          event_id?: string
          id?: string
          name?: string
          payment_amount?: number | null
          payment_status?: string | null
          slip_url?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          box_quantity_legacy: number
          carton_quantity_legacy: number
          created_at: string
          id: string
          location: string
          lot: string | null
          mfd: string | null
          pieces_quantity_legacy: number | null
          product_name: string
          quantity_pieces: number
          sku: string
          unit: string | null
          unit_level1_name: string | null
          unit_level1_quantity: number | null
          unit_level1_rate: number | null
          unit_level2_name: string | null
          unit_level2_quantity: number | null
          unit_level2_rate: number | null
          unit_level3_name: string | null
          unit_level3_quantity: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          box_quantity_legacy?: number
          carton_quantity_legacy?: number
          created_at?: string
          id?: string
          location: string
          lot?: string | null
          mfd?: string | null
          pieces_quantity_legacy?: number | null
          product_name: string
          quantity_pieces?: number
          sku: string
          unit?: string | null
          unit_level1_name?: string | null
          unit_level1_quantity?: number | null
          unit_level1_rate?: number | null
          unit_level2_name?: string | null
          unit_level2_quantity?: number | null
          unit_level2_rate?: number | null
          unit_level3_name?: string | null
          unit_level3_quantity?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          box_quantity_legacy?: number
          carton_quantity_legacy?: number
          created_at?: string
          id?: string
          location?: string
          lot?: string | null
          mfd?: string | null
          pieces_quantity_legacy?: number | null
          product_name?: string
          quantity_pieces?: number
          sku?: string
          unit?: string | null
          unit_level1_name?: string | null
          unit_level1_quantity?: number | null
          unit_level1_rate?: number | null
          unit_level2_name?: string | null
          unit_level2_quantity?: number | null
          unit_level2_rate?: number | null
          unit_level3_name?: string | null
          unit_level3_quantity?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          box_quantity_after: number
          box_quantity_before: number
          box_quantity_change: number
          created_at: string
          created_by: string | null
          id: string
          inventory_item_id: string | null
          location_after: string | null
          location_before: string | null
          loose_quantity_after: number
          loose_quantity_before: number
          loose_quantity_change: number
          movement_type: string
          notes: string | null
        }
        Insert: {
          box_quantity_after?: number
          box_quantity_before?: number
          box_quantity_change?: number
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id?: string | null
          location_after?: string | null
          location_before?: string | null
          loose_quantity_after?: number
          loose_quantity_before?: number
          loose_quantity_change?: number
          movement_type: string
          notes?: string | null
        }
        Update: {
          box_quantity_after?: number
          box_quantity_before?: number
          box_quantity_change?: number
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id?: string | null
          location_after?: string | null
          location_before?: string | null
          loose_quantity_after?: number
          loose_quantity_before?: number
          loose_quantity_change?: number
          movement_type?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      location_qr_codes: {
        Row: {
          created_at: string | null
          generated_at: string | null
          id: string
          inventory_snapshot: Json | null
          is_active: boolean | null
          last_updated: string | null
          location: string
          qr_code_data: string
          qr_image_url: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          generated_at?: string | null
          id?: string
          inventory_snapshot?: Json | null
          is_active?: boolean | null
          last_updated?: string | null
          location: string
          qr_code_data: string
          qr_image_url?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          generated_at?: string | null
          id?: string
          inventory_snapshot?: Json | null
          is_active?: boolean | null
          last_updated?: string | null
          location?: string
          qr_code_data?: string
          qr_image_url?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      meeting_rooms: {
        Row: {
          capacity: number | null
          created_at: string
          equipment: string[] | null
          id: string
          is_active: boolean | null
          location: string
          name: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          equipment?: string[] | null
          id?: string
          is_active?: boolean | null
          location: string
          name: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          equipment?: string[] | null
          id?: string
          is_active?: boolean | null
          location?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      monthly_summaries: {
        Row: {
          created_at: string
          id: string
          month_year: string
          most_used_room_id: string | null
          total_bookings: number | null
          total_hours: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          month_year: string
          most_used_room_id?: string | null
          total_bookings?: number | null
          total_hours?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          month_year?: string
          most_used_room_id?: string | null
          total_bookings?: number | null
          total_hours?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      processed_sheets_data: {
        Row: {
          created_at: string
          id: string
          product_name: string
          quantity: number | null
          record_date: string | null
          record_date_string: string | null
          ref_po: string | null
          sku_code: string
          total_cases: number | null
          total_pieces: number | null
          updated_at: string
          work_date: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_name: string
          quantity?: number | null
          record_date?: string | null
          record_date_string?: string | null
          ref_po?: string | null
          sku_code: string
          total_cases?: number | null
          total_pieces?: number | null
          updated_at?: string
          work_date?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_name?: string
          quantity?: number | null
          record_date?: string | null
          record_date_string?: string | null
          ref_po?: string | null
          sku_code?: string
          total_cases?: number | null
          total_pieces?: number | null
          updated_at?: string
          work_date?: string | null
        }
        Relationships: []
      }
      product_audit_log: {
        Row: {
          action: string
          id: string
          new_data: Json | null
          old_data: Json | null
          password_used: boolean
          product_id: string | null
          timestamp: string
        }
        Insert: {
          action: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          password_used?: boolean
          product_id?: string | null
          timestamp?: string
        }
        Update: {
          action?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          password_used?: boolean
          product_id?: string | null
          timestamp?: string
        }
        Relationships: []
      }
      product_conversion_rates: {
        Row: {
          created_at: string
          id: string
          product_name: string
          sku: string
          unit_level1_name: string | null
          unit_level1_rate: number | null
          unit_level2_name: string | null
          unit_level2_rate: number | null
          unit_level3_name: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_name: string
          sku: string
          unit_level1_name?: string | null
          unit_level1_rate?: number | null
          unit_level2_name?: string | null
          unit_level2_rate?: number | null
          unit_level3_name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_name?: string
          sku?: string
          unit_level1_name?: string | null
          unit_level1_rate?: number | null
          unit_level2_name?: string | null
          unit_level2_rate?: number | null
          unit_level3_name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
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
      projects: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_datasets: {
        Row: {
          created_at: string
          data: Json
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data: Json
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      sync_history: {
        Row: {
          error_message: string | null
          id: string
          source_url: string | null
          status: string | null
          sync_date: string
          total_records: number | null
        }
        Insert: {
          error_message?: string | null
          id?: string
          source_url?: string | null
          status?: string | null
          sync_date?: string
          total_records?: number | null
        }
        Update: {
          error_message?: string | null
          id?: string
          source_url?: string | null
          status?: string | null
          sync_date?: string
          total_records?: number | null
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          department: string
          email: string
          employee_code: string | null
          full_name: string
          id: string
          is_active: boolean | null
          last_login: string | null
          locked_until: string | null
          login_attempts: number | null
          password_hash: string
          phone: string | null
          role: string
          role_level: number
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          department?: string
          email: string
          employee_code?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          locked_until?: string | null
          login_attempts?: number | null
          password_hash: string
          phone?: string | null
          role?: string
          role_level?: number
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          department?: string
          email?: string
          employee_code?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          locked_until?: string | null
          login_attempts?: number | null
          password_hash?: string
          phone?: string | null
          role?: string
          role_level?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      warehouse_locations: {
        Row: {
          capacity_boxes: number | null
          capacity_loose: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          level: number
          location_code: string
          location_type: string
          position: number
          row: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          capacity_boxes?: number | null
          capacity_loose?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          level: number
          location_code: string
          location_type?: string
          position: number
          row: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          capacity_boxes?: number | null
          capacity_loose?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          level?: number
          location_code?: string
          location_type?: string
          position?: number
          row?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      products_with_counts: {
        Row: {
          brand: string | null
          category: string | null
          created_at: string | null
          description: string | null
          dimensions: string | null
          id: string | null
          inventory_items_count: number | null
          is_active: boolean | null
          manufacturing_country: string | null
          max_stock_level: number | null
          product_name: string | null
          product_type: string | null
          reorder_level: number | null
          sku_code: string | null
          storage_conditions: string | null
          subcategory: string | null
          total_stock_quantity: number | null
          unit_cost: number | null
          unit_of_measure: string | null
          updated_at: string | null
          weight: number | null
        }
        Relationships: []
      }
      warehouse_locations_with_inventory: {
        Row: {
          capacity_boxes: number | null
          capacity_loose: number | null
          created_at: string | null
          description: string | null
          detailed_inventory: Json | null
          id: string | null
          inventory_count: number | null
          is_active: boolean | null
          last_sync: string | null
          level: number | null
          location_code: string | null
          location_type: string | null
          position: number | null
          product_list: string | null
          row: string | null
          total_bottles: number | null
          total_boxes: number | null
          total_cartons: number | null
          total_loose: number | null
          total_pieces: number | null
          total_quantity_sum: number | null
          total_sachets: number | null
          total_sheets: number | null
          updated_at: string | null
          user_id: string | null
          utilization_percentage: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      authenticate_user: {
        Args: { user_email: string; user_password: string }
        Returns: {
          department: string
          email: string
          employee_code: string
          full_name: string
          is_active: boolean
          role: string
          role_level: number
          user_id: string
        }[]
      }
      auto_create_warehouse_location_direct: {
        Args: { location_code: string }
        Returns: undefined
      }
      auto_detect_unit: {
        Args: {
          box_qty?: number
          loose_qty?: number
          product_name_param: string
        }
        Returns: string
      }
      calculate_monthly_summary: {
        Args: { target_month: string; user_uuid: string }
        Returns: undefined
      }
      cleanup_orphaned_qr_codes: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      execute_sql: {
        Args: { sql_query: string }
        Returns: string
      }
      get_event_attendee_public_info: {
        Args: { event_uuid: string }
        Returns: {
          attendee_count: number
          verified_count: number
        }[]
      }
      get_location_inventory_details: {
        Args: { location_code_param: string }
        Returns: {
          box_quantity: number
          location_code: string
          loose_quantity: number
          product_name: string
          sku_code: string
          total_quantity: number
          unit: string
          unit_display: string
        }[]
      }
      get_location_statistics: {
        Args: Record<PropertyKey, never>
        Returns: {
          average_utilization: number
          empty_locations: number
          high_utilization_count: number
          low_utilization_count: number
          medium_utilization_count: number
          total_locations: number
          total_with_inventory: number
        }[]
      }
      get_locations_by_row: {
        Args: { row_letter: string }
        Returns: {
          inventory_count: number
          is_occupied: boolean
          level: number
          location_code: string
          position: number
          product_list: string
          total_units_summary: string
          utilization_percentage: number
        }[]
      }
      get_public_attendee_summary: {
        Args: { event_uuid: string }
        Returns: {
          pending_attendees: number
          total_attendees: number
          verified_attendees: number
        }[]
      }
      get_safe_attendee_info: {
        Args: {
          attendee_row: Database["public"]["Tables"]["event_attendees"]["Row"]
        }
        Returns: {
          created_at: string
          details: string
          event_id: string
          id: string
          name: string
          payment_status: string
        }[]
      }
      get_warehouse_locations_optimized: {
        Args: {
          limit_count?: number
          offset_count?: number
          order_by?: string
          order_direction?: string
          search_term?: string
        }
        Returns: {
          capacity_boxes: number
          capacity_loose: number
          created_at: string
          description: string
          detailed_inventory: Json
          id: string
          inventory_count: number
          is_active: boolean
          last_sync: string
          level: number
          location_code: string
          location_type: string
          position: number
          product_list: string
          row: string
          total_bottles: number
          total_boxes: number
          total_cartons: number
          total_loose: number
          total_pieces: number
          total_quantity_sum: number
          total_sachets: number
          total_sheets: number
          updated_at: string
          user_id: string
          utilization_percentage: number
        }[]
      }
      hash_password: {
        Args: { password: string }
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      normalize_location_flexible: {
        Args: { input_location: string }
        Returns: string
      }
      normalize_location_format: {
        Args: { input_location: string }
        Returns: string
      }
      sync_inventory_to_warehouse_locations: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      sync_inventory_to_warehouse_locations_improved: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      sync_warehouse_locations_to_qr_codes: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      verify_password: {
        Args: { hash: string; password: string }
        Returns: boolean
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
  public: {
    Enums: {},
  },
} as const
