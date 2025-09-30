// Temporary script to create fulfillment tables via Supabase client
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ogrcpzzmmudztwjfwjvu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncmNwenptbXVkenR3amZ3anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY3NDE1NzIsImV4cCI6MjA0MjMxNzU3Mn0.CnLwl5KklqWbS0l2zBVqSaQYNPtTSBhvqoQAF7YCHkI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createFulfillmentTables() {
  try {
    console.log('🔧 Creating fulfillment tables...');

    // Create fulfillment_tasks table
    const { error: tasksError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.fulfillment_tasks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          po_number VARCHAR(50) NOT NULL,
          po_date DATE,
          delivery_date DATE,
          customer_code VARCHAR(50),
          warehouse_name VARCHAR(100),
          total_amount DECIMAL(15,2) DEFAULT 0,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'shipped', 'cancelled')),
          priority INTEGER DEFAULT 0,
          notes TEXT,
          assigned_to UUID,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::uuid
        );
      `
    });

    if (tasksError) {
      console.error('❌ Error creating fulfillment_tasks:', tasksError);
      return;
    }

    console.log('✅ fulfillment_tasks table created');

    // Create fulfillment_items table
    const { error: itemsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.fulfillment_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          fulfillment_task_id UUID NOT NULL REFERENCES public.fulfillment_tasks(id) ON DELETE CASCADE,
          product_name VARCHAR(200) NOT NULL,
          product_code VARCHAR(100),
          requested_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
          fulfilled_quantity DECIMAL(10,2) DEFAULT 0,
          unit_price DECIMAL(15,2) DEFAULT 0,
          total_amount DECIMAL(15,2) DEFAULT 0,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'completed', 'cancelled')),
          location VARCHAR(50),
          inventory_item_id UUID REFERENCES public.inventory_items(id),
          available_stock DECIMAL(10,2) DEFAULT 0,
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (itemsError) {
      console.error('❌ Error creating fulfillment_items:', itemsError);
      return;
    }

    console.log('✅ fulfillment_items table created');

    // Create indexes
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_fulfillment_tasks_po_number ON public.fulfillment_tasks(po_number);
        CREATE INDEX IF NOT EXISTS idx_fulfillment_tasks_status ON public.fulfillment_tasks(status);
        CREATE INDEX IF NOT EXISTS idx_fulfillment_tasks_created_at ON public.fulfillment_tasks(created_at);
        CREATE INDEX IF NOT EXISTS idx_fulfillment_tasks_delivery_date ON public.fulfillment_tasks(delivery_date);

        CREATE INDEX IF NOT EXISTS idx_fulfillment_items_task_id ON public.fulfillment_items(fulfillment_task_id);
        CREATE INDEX IF NOT EXISTS idx_fulfillment_items_product_code ON public.fulfillment_items(product_code);
        CREATE INDEX IF NOT EXISTS idx_fulfillment_items_status ON public.fulfillment_items(status);
        CREATE INDEX IF NOT EXISTS idx_fulfillment_items_inventory_id ON public.fulfillment_items(inventory_item_id);
      `
    });

    if (indexError) {
      console.error('❌ Error creating indexes:', indexError);
      return;
    }

    console.log('✅ Indexes created');

    // Create view
    const { error: viewError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE VIEW public.fulfillment_tasks_with_items AS
        SELECT
          ft.id,
          ft.po_number,
          ft.po_date,
          ft.delivery_date,
          ft.customer_code,
          ft.warehouse_name,
          ft.total_amount,
          ft.status,
          ft.priority,
          ft.notes,
          ft.assigned_to,
          ft.created_at,
          ft.updated_at,
          ft.user_id,
          COALESCE(item_stats.total_items, 0) as total_items,
          COALESCE(item_stats.completed_items, 0) as completed_items,
          COALESCE(item_stats.pending_items, 0) as pending_items,
          CASE
            WHEN COALESCE(item_stats.total_items, 0) = 0 THEN 0
            ELSE ROUND((COALESCE(item_stats.completed_items, 0)::decimal / item_stats.total_items) * 100, 2)
          END as completion_percentage
        FROM public.fulfillment_tasks ft
        LEFT JOIN (
          SELECT
            fulfillment_task_id,
            COUNT(*) as total_items,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_items,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_items
          FROM public.fulfillment_items
          GROUP BY fulfillment_task_id
        ) item_stats ON ft.id = item_stats.fulfillment_task_id;
      `
    });

    if (viewError) {
      console.error('❌ Error creating view:', viewError);
      return;
    }

    console.log('✅ fulfillment_tasks_with_items view created');

    // Disable RLS
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.fulfillment_tasks DISABLE ROW LEVEL SECURITY;
        ALTER TABLE public.fulfillment_items DISABLE ROW LEVEL SECURITY;
      `
    });

    if (rlsError) {
      console.error('❌ Error disabling RLS:', rlsError);
      return;
    }

    console.log('✅ RLS disabled');

    console.log('🎉 All fulfillment tables created successfully!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
createFulfillmentTables();