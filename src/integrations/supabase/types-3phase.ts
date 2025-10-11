// TypeScript types for 3-Phase Sales Workflow System
// Generated for the new sales workflow tables

export interface Database {
  public: {
    Tables: {
      // =====================================================
      // Phase 1: Sales Bills (Sales Team)
      // =====================================================
      sales_bills: {
        Row: {
          id: string;
          bill_number: string;
          customer_id: string;
          bill_date: string;
          status: 'draft' | 'confirmed' | 'sent_to_warehouse' | 'assigned' | 'fulfilled' | 'shipped' | 'delivered' | 'cancelled';
          bill_type: 'sale' | 'quote' | 'pro_forma';
          priority: 'low' | 'normal' | 'high' | 'urgent';

          // Customer & Business Info
          customer_po_number: string | null;
          payment_terms: number | null;
          due_date: string | null;

          // Amounts
          subtotal: number;
          tax_amount: number;
          discount_amount: number;
          total_amount: number;

          // Shipping Address
          shipping_address_line1: string | null;
          shipping_address_line2: string | null;
          shipping_district: string | null;
          shipping_province: string | null;
          shipping_postal_code: string | null;
          shipping_contact_person: string | null;
          shipping_phone: string | null;

          // Team Info
          sales_person_id: string | null;
          sales_notes: string | null;
          internal_notes: string | null;

          // Timestamps & Audit
          created_at: string;
          updated_at: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          bill_number?: string;
          customer_id: string;
          bill_date?: string;
          status?: 'draft' | 'confirmed' | 'sent_to_warehouse' | 'assigned' | 'fulfilled' | 'shipped' | 'delivered' | 'cancelled';
          bill_type?: 'sale' | 'quote' | 'pro_forma';
          priority?: 'low' | 'normal' | 'high' | 'urgent';

          customer_po_number?: string | null;
          payment_terms?: number | null;
          due_date?: string | null;

          subtotal?: number;
          tax_amount?: number;
          discount_amount?: number;
          total_amount?: number;

          shipping_address_line1?: string | null;
          shipping_address_line2?: string | null;
          shipping_district?: string | null;
          shipping_province?: string | null;
          shipping_postal_code?: string | null;
          shipping_contact_person?: string | null;
          shipping_phone?: string | null;

          sales_person_id?: string | null;
          sales_notes?: string | null;
          internal_notes?: string | null;

          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          bill_number?: string;
          customer_id?: string;
          bill_date?: string;
          status?: 'draft' | 'confirmed' | 'sent_to_warehouse' | 'assigned' | 'fulfilled' | 'shipped' | 'delivered' | 'cancelled';
          bill_type?: 'sale' | 'quote' | 'pro_forma';
          priority?: 'low' | 'normal' | 'high' | 'urgent';

          customer_po_number?: string | null;
          payment_terms?: number | null;
          due_date?: string | null;

          subtotal?: number;
          tax_amount?: number;
          discount_amount?: number;
          total_amount?: number;

          shipping_address_line1?: string | null;
          shipping_address_line2?: string | null;
          shipping_district?: string | null;
          shipping_province?: string | null;
          shipping_postal_code?: string | null;
          shipping_contact_person?: string | null;
          shipping_phone?: string | null;

          sales_person_id?: string | null;
          sales_notes?: string | null;
          internal_notes?: string | null;

          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sales_bills_customer_id_fkey";
            columns: ["customer_id"];
            referencedRelation: "customers";
            referencedColumns: ["id"];
          }
        ];
      };

      sales_bill_items: {
        Row: {
          id: string;
          sales_bill_id: string;
          line_number: number;

          // Product Information
          product_id: string | null;
          product_name: string;
          product_code: string | null;
          sku: string | null;

          // Quantities (no location assigned yet)
          quantity_level1: number;
          quantity_level2: number;
          quantity_level3: number;

          // Unit Information
          unit_level1_name: string;
          unit_level2_name: string;
          unit_level3_name: string;
          unit_level1_rate: number;
          unit_level2_rate: number;

          // Pricing
          unit_price: number;
          line_total: number;
          discount_percentage: number;
          discount_amount: number;

          // Status
          status: 'pending' | 'assigned' | 'picked' | 'packed' | 'shipped';

          // Notes
          notes: string | null;
          special_instructions: string | null;

          // Timestamps
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sales_bill_id: string;
          line_number: number;

          product_id?: string | null;
          product_name: string;
          product_code?: string | null;
          sku?: string | null;

          quantity_level1?: number;
          quantity_level2?: number;
          quantity_level3?: number;

          unit_level1_name?: string;
          unit_level2_name?: string;
          unit_level3_name?: string;
          unit_level1_rate?: number;
          unit_level2_rate?: number;

          unit_price: number;
          line_total: number;
          discount_percentage?: number;
          discount_amount?: number;

          status?: 'pending' | 'assigned' | 'picked' | 'packed' | 'shipped';

          notes?: string | null;
          special_instructions?: string | null;

          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sales_bill_id?: string;
          line_number?: number;

          product_id?: string | null;
          product_name?: string;
          product_code?: string | null;
          sku?: string | null;

          quantity_level1?: number;
          quantity_level2?: number;
          quantity_level3?: number;

          unit_level1_name?: string;
          unit_level2_name?: string;
          unit_level3_name?: string;
          unit_level1_rate?: number;
          unit_level2_rate?: number;

          unit_price?: number;
          line_total?: number;
          discount_percentage?: number;
          discount_amount?: number;

          status?: 'pending' | 'assigned' | 'picked' | 'packed' | 'shipped';

          notes?: string | null;
          special_instructions?: string | null;

          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sales_bill_items_sales_bill_id_fkey";
            columns: ["sales_bill_id"];
            referencedRelation: "sales_bills";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_bill_items_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };

      // =====================================================
      // Phase 2: Warehouse Assignments (Warehouse Team)
      // =====================================================
      warehouse_assignments: {
        Row: {
          id: string;
          sales_bill_id: string;
          sales_bill_item_id: string;

          // Assignment Details
          assigned_by: string;
          assigned_at: string;
          assignment_status: 'assigned' | 'picked' | 'packed' | 'ready_to_ship' | 'shipped';

          // Location & Inventory Details
          inventory_item_id: string;
          source_location: string;

          // Assigned Quantities
          assigned_quantity_level1: number;
          assigned_quantity_level2: number;
          assigned_quantity_level3: number;

          // Actual Picked Quantities
          picked_quantity_level1: number;
          picked_quantity_level2: number;
          picked_quantity_level3: number;

          // Tracking
          picked_by: string | null;
          picked_at: string | null;
          packed_by: string | null;
          packed_at: string | null;

          // Notes
          picker_notes: string | null;
          warehouse_notes: string | null;

          // Timestamps
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sales_bill_id: string;
          sales_bill_item_id: string;

          assigned_by: string;
          assigned_at?: string;
          assignment_status?: 'assigned' | 'picked' | 'packed' | 'ready_to_ship' | 'shipped';

          inventory_item_id: string;
          source_location: string;

          assigned_quantity_level1?: number;
          assigned_quantity_level2?: number;
          assigned_quantity_level3?: number;

          picked_quantity_level1?: number;
          picked_quantity_level2?: number;
          picked_quantity_level3?: number;

          picked_by?: string | null;
          picked_at?: string | null;
          packed_by?: string | null;
          packed_at?: string | null;

          picker_notes?: string | null;
          warehouse_notes?: string | null;

          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sales_bill_id?: string;
          sales_bill_item_id?: string;

          assigned_by?: string;
          assigned_at?: string;
          assignment_status?: 'assigned' | 'picked' | 'packed' | 'ready_to_ship' | 'shipped';

          inventory_item_id?: string;
          source_location?: string;

          assigned_quantity_level1?: number;
          assigned_quantity_level2?: number;
          assigned_quantity_level3?: number;

          picked_quantity_level1?: number;
          picked_quantity_level2?: number;
          picked_quantity_level3?: number;

          picked_by?: string | null;
          picked_at?: string | null;
          packed_by?: string | null;
          packed_at?: string | null;

          picker_notes?: string | null;
          warehouse_notes?: string | null;

          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "warehouse_assignments_sales_bill_id_fkey";
            columns: ["sales_bill_id"];
            referencedRelation: "sales_bills";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "warehouse_assignments_sales_bill_item_id_fkey";
            columns: ["sales_bill_item_id"];
            referencedRelation: "sales_bill_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "warehouse_assignments_inventory_item_id_fkey";
            columns: ["inventory_item_id"];
            referencedRelation: "inventory_items";
            referencedColumns: ["id"];
          }
        ];
      };

      // =====================================================
      // Phase 3: Fulfillment Orders (Final Fulfillment)
      // =====================================================
      fulfillment_orders: {
        Row: {
          id: string;
          fulfillment_number: string;
          sales_bill_id: string;

          // Fulfillment Status
          status: 'preparing' | 'ready_to_ship' | 'shipped' | 'delivered' | 'returned';

          // Shipping Information
          carrier: string | null;
          tracking_number: string | null;
          shipping_cost: number | null;
          estimated_delivery_date: string | null;
          actual_delivery_date: string | null;

          // Fulfillment Team
          prepared_by: string | null;
          prepared_at: string | null;
          shipped_by: string | null;
          shipped_at: string | null;

          // Stock Movement Tracking
          stock_deducted_at: string | null;
          stock_deducted_by: string | null;

          // Notes
          fulfillment_notes: string | null;
          delivery_instructions: string | null;

          // Timestamps
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          fulfillment_number?: string;
          sales_bill_id: string;

          status?: 'preparing' | 'ready_to_ship' | 'shipped' | 'delivered' | 'returned';

          carrier?: string | null;
          tracking_number?: string | null;
          shipping_cost?: number | null;
          estimated_delivery_date?: string | null;
          actual_delivery_date?: string | null;

          prepared_by?: string | null;
          prepared_at?: string | null;
          shipped_by?: string | null;
          shipped_at?: string | null;

          stock_deducted_at?: string | null;
          stock_deducted_by?: string | null;

          fulfillment_notes?: string | null;
          delivery_instructions?: string | null;

          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          fulfillment_number?: string;
          sales_bill_id?: string;

          status?: 'preparing' | 'ready_to_ship' | 'shipped' | 'delivered' | 'returned';

          carrier?: string | null;
          tracking_number?: string | null;
          shipping_cost?: number | null;
          estimated_delivery_date?: string | null;
          actual_delivery_date?: string | null;

          prepared_by?: string | null;
          prepared_at?: string | null;
          shipped_by?: string | null;
          shipped_at?: string | null;

          stock_deducted_at?: string | null;
          stock_deducted_by?: string | null;

          fulfillment_notes?: string | null;
          delivery_instructions?: string | null;

          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fulfillment_orders_sales_bill_id_fkey";
            columns: ["sales_bill_id"];
            referencedRelation: "sales_bills";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      // Add any views here if needed
    };
    Functions: {
      // Add any functions here if needed
    };
    Enums: {
      // Add any enums here if needed
      sales_bill_status: 'draft' | 'confirmed' | 'sent_to_warehouse' | 'assigned' | 'fulfilled' | 'shipped' | 'delivered' | 'cancelled';
      sales_bill_type: 'sale' | 'quote' | 'pro_forma';
      priority_level: 'low' | 'normal' | 'high' | 'urgent';
      sales_bill_item_status: 'pending' | 'assigned' | 'picked' | 'packed' | 'shipped';
      assignment_status: 'assigned' | 'picked' | 'packed' | 'ready_to_ship' | 'shipped';
      fulfillment_status: 'preparing' | 'ready_to_ship' | 'shipped' | 'delivered' | 'returned';
    };
  };
}

// =====================================================
// Convenience Types for Frontend Usage
// =====================================================

// Sales Bill with related data
export type SalesBill = Database['public']['Tables']['sales_bills']['Row'];
export type SalesBillInsert = Database['public']['Tables']['sales_bills']['Insert'];
export type SalesBillUpdate = Database['public']['Tables']['sales_bills']['Update'];

export type SalesBillItem = Database['public']['Tables']['sales_bill_items']['Row'];
export type SalesBillItemInsert = Database['public']['Tables']['sales_bill_items']['Insert'];
export type SalesBillItemUpdate = Database['public']['Tables']['sales_bill_items']['Update'];

export type WarehouseAssignment = Database['public']['Tables']['warehouse_assignments']['Row'];
export type WarehouseAssignmentInsert = Database['public']['Tables']['warehouse_assignments']['Insert'];
export type WarehouseAssignmentUpdate = Database['public']['Tables']['warehouse_assignments']['Update'];

export type FulfillmentOrder = Database['public']['Tables']['fulfillment_orders']['Row'];
export type FulfillmentOrderInsert = Database['public']['Tables']['fulfillment_orders']['Insert'];
export type FulfillmentOrderUpdate = Database['public']['Tables']['fulfillment_orders']['Update'];

// Status types
export type SalesBillStatus = Database['public']['Enums']['sales_bill_status'];
export type SalesBillType = Database['public']['Enums']['sales_bill_type'];
export type PriorityLevel = Database['public']['Enums']['priority_level'];
export type SalesBillItemStatus = Database['public']['Enums']['sales_bill_item_status'];
export type AssignmentStatus = Database['public']['Enums']['assignment_status'];
export type FulfillmentStatus = Database['public']['Enums']['fulfillment_status'];

// Enhanced types with relationships
export interface SalesBillWithCustomer extends SalesBill {
  customer?: {
    id: string;
    customer_name: string;
    customer_code: string | null;
    customer_type: string | null;
    phone: string | null;
    email: string | null;
  };
}

export interface SalesBillWithItems extends SalesBill {
  sales_bill_items: SalesBillItem[];
  customer?: {
    id: string;
    customer_name: string;
    customer_code: string | null;
    customer_type: string | null;
    phone: string | null;
    email: string | null;
  };
}

export interface SalesBillItemWithAssignments extends SalesBillItem {
  warehouse_assignments: WarehouseAssignment[];
}

export interface WarehouseAssignmentWithDetails extends WarehouseAssignment {
  sales_bill: SalesBill;
  sales_bill_item: SalesBillItem;
  inventory_item: {
    id: string;
    product_name: string;
    sku: string;
    location: string;
    unit_level1_quantity: number | null;
    unit_level2_quantity: number | null;
    unit_level3_quantity: number | null;
  };
}

// Workflow-specific types
export interface SalesWorkflowData {
  bill: SalesBill;
  items: SalesBillItem[];
  customer: {
    id: string;
    customer_name: string;
    customer_code: string | null;
    phone: string | null;
    email: string | null;
  };
}

export interface WarehouseWorkflowData {
  bill: SalesBill;
  items: SalesBillItemWithAssignments[];
  assignments: WarehouseAssignment[];
  pendingItems: SalesBillItem[];
}

export interface FulfillmentWorkflowData {
  bill: SalesBill;
  fulfillmentOrder: FulfillmentOrder;
  assignments: WarehouseAssignment[];
  readyItems: SalesBillItem[];
}

// Form data types for components
export interface SalesBillFormData {
  customer_id: string;
  bill_type: SalesBillType;
  priority: PriorityLevel;
  customer_po_number?: string;
  payment_terms?: number;
  due_date?: string;

  // Shipping address
  shipping_address_line1?: string;
  shipping_address_line2?: string;
  shipping_district?: string;
  shipping_province?: string;
  shipping_postal_code?: string;
  shipping_contact_person?: string;
  shipping_phone?: string;

  // Notes
  sales_notes?: string;
  internal_notes?: string;

  // Items
  items: SalesBillItemInsert[];
}

export interface WarehouseAssignmentFormData {
  sales_bill_id: string;
  sales_bill_item_id: string;
  inventory_item_id: string;
  source_location: string;
  assigned_quantity_level1: number;
  assigned_quantity_level2: number;
  assigned_quantity_level3: number;
  warehouse_notes?: string;
}

// Query filter types
export interface SalesBillFilters {
  status?: SalesBillStatus;
  customer_id?: string;
  date_from?: string;
  date_to?: string;
  priority?: PriorityLevel;
  search_term?: string;
}

export interface WarehouseQueueFilters {
  assignment_status?: AssignmentStatus;
  location?: string;
  assigned_date_from?: string;
  assigned_date_to?: string;
  assigned_by?: string;
}

export interface FulfillmentFilters {
  status?: FulfillmentStatus;
  carrier?: string;
  shipped_date_from?: string;
  shipped_date_to?: string;
}