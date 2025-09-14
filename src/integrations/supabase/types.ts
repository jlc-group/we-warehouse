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
        Relationships: [
          {
            foreignKeyName: "product_audit_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          channels: string[]
          created_at: string
          description: string | null
          first_lot_quantity: number
          id: string
          image_url: string | null
          launch_date: string | null
          product_name: string
          sku_code: string
          updated_at: string
        }
        Insert: {
          channels?: string[]
          created_at?: string
          description?: string | null
          first_lot_quantity?: number
          id?: string
          image_url?: string | null
          launch_date?: string | null
          product_name: string
          sku_code: string
          updated_at?: string
        }
        Update: {
          channels?: string[]
          created_at?: string
          description?: string | null
          first_lot_quantity?: number
          id?: string
          image_url?: string | null
          launch_date?: string | null
          product_name?: string
          sku_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          email: string | null
          full_name: string | null
          id: string
          position: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          position?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          position?: string | null
          role?: string | null
          updated_at?: string
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
    }
    Views: {
      safe_event_attendees: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string | null
          name: string | null
          payment_status: string | null
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string | null
          name?: string | null
          payment_status?: never
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string | null
          name?: string | null
          payment_status?: never
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_monthly_summary: {
        Args: { target_month: string; user_uuid: string }
        Returns: undefined
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
      is_admin: {
        Args: Record<PropertyKey, never>
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
