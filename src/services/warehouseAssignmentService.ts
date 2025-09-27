// Warehouse Assignment Service - Phase 2: Warehouse Team Operations
import { supabase } from '@/integrations/supabase/client';
import {
  WarehouseAssignment,
  WarehouseAssignmentInsert,
  WarehouseAssignmentUpdate,
  WarehouseAssignmentWithDetails,
  SalesBillWithItems,
  AssignmentStatus,
  InventoryItem
} from '@/integrations/supabase/types-3phase';
import { toast } from 'sonner';

export class WarehouseAssignmentService {

  // =====================================================
  // Queue Management - Getting Bills from Sales
  // =====================================================

  /**
   * Get sales bills that are ready for warehouse assignment
   */
  static async getSalesBillsQueue(): Promise<SalesBillWithItems[]> {
    console.log('📦 Fetching sales bills queue for warehouse assignment');

    const { data, error } = await supabase
      .from('sales_bills')
      .select(`
        *,
        customer:customers(
          id,
          customer_name,
          customer_code,
          customer_type,
          phone,
          email
        ),
        sales_bill_items(*)
      `)
      .eq('status', 'sent_to_warehouse')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error fetching sales bills queue:', error);
      throw error;
    }

    console.log(`✅ Found ${data.length} bills ready for warehouse assignment`);
    return data;
  }

  /**
   * Get available inventory for a specific product
   */
  static async getAvailableInventoryForProduct(productId: string): Promise<InventoryItem[]> {
    console.log('🔍 Fetching available inventory for product:', productId);

    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('product_id', productId)
      .gt('total_available_quantity', 0)
      .order('location', { ascending: true });

    if (error) {
      console.error('❌ Error fetching available inventory:', error);
      throw error;
    }

    console.log(`✅ Found ${data.length} available inventory items`);
    return data;
  }

  // =====================================================
  // Assignment Operations
  // =====================================================

  /**
   * Create warehouse assignment for a sales bill item
   */
  static async createAssignment(assignment: WarehouseAssignmentInsert): Promise<WarehouseAssignment> {
    console.log('📝 Creating warehouse assignment:', assignment);

    // Validate inventory availability
    const inventoryItem = await this.validateInventoryAvailability(
      assignment.inventory_item_id,
      assignment.assigned_quantity_level1 || 0,
      assignment.assigned_quantity_level2 || 0,
      assignment.assigned_quantity_level3 || 0
    );

    const { data, error } = await supabase
      .from('warehouse_assignments')
      .insert({
        ...assignment,
        assignment_status: 'assigned',
        assigned_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating warehouse assignment:', error);
      throw error;
    }

    // Reserve inventory quantities
    await this.reserveInventoryQuantities(
      assignment.inventory_item_id,
      assignment.assigned_quantity_level1 || 0,
      assignment.assigned_quantity_level2 || 0,
      assignment.assigned_quantity_level3 || 0
    );

    // Update sales bill item status
    await this.updateSalesBillItemStatus(assignment.sales_bill_item_id, 'assigned');

    console.log('✅ Warehouse assignment created and inventory reserved');
    toast.success('สร้างการมอบหมายสำเร็จ', {
      description: `มอบหมายจากตำแหน่ง ${inventoryItem.location}`
    });

    return data;
  }

  /**
   * Update warehouse assignment
   */
  static async updateAssignment(
    assignmentId: string,
    updates: WarehouseAssignmentUpdate
  ): Promise<WarehouseAssignment> {
    console.log('📝 Updating warehouse assignment:', assignmentId, updates);

    const { data, error } = await supabase
      .from('warehouse_assignments')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', assignmentId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating warehouse assignment:', error);
      throw error;
    }

    console.log('✅ Warehouse assignment updated');
    return data;
  }

  /**
   * Update assignment status
   */
  static async updateAssignmentStatus(
    assignmentId: string,
    status: AssignmentStatus
  ): Promise<void> {
    console.log('📝 Updating assignment status:', assignmentId, status);

    const { error } = await supabase
      .from('warehouse_assignments')
      .update({
        assignment_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', assignmentId);

    if (error) {
      console.error('❌ Error updating assignment status:', error);
      throw error;
    }

    console.log('✅ Assignment status updated');
  }

  // =====================================================
  // Picking Operations
  // =====================================================

  /**
   * Mark items as picked with actual quantities
   */
  static async markItemsPicked(
    assignmentId: string,
    pickedQuantities: {
      level1: number;
      level2: number;
      level3: number;
    },
    pickerId: string,
    pickerNotes?: string
  ): Promise<void> {
    console.log('📦 Marking items as picked:', assignmentId, pickedQuantities);

    const { error } = await supabase
      .from('warehouse_assignments')
      .update({
        assignment_status: 'picked',
        picked_quantity_level1: pickedQuantities.level1,
        picked_quantity_level2: pickedQuantities.level2,
        picked_quantity_level3: pickedQuantities.level3,
        picked_by: pickerId,
        picked_at: new Date().toISOString(),
        picker_notes: pickerNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', assignmentId);

    if (error) {
      console.error('❌ Error marking items as picked:', error);
      throw error;
    }

    // Update sales bill item status
    const assignment = await this.getAssignmentById(assignmentId);
    await this.updateSalesBillItemStatus(assignment.sales_bill_item_id, 'picked');

    console.log('✅ Items marked as picked');
    toast.success('บันทึกการจัดเก็บสำเร็จ', {
      description: `จัดเก็บสินค้าเรียบร้อยแล้ว`
    });
  }

  /**
   * Mark items as packed
   */
  static async markItemsPacked(
    assignmentId: string,
    packerId: string,
    warehouseNotes?: string
  ): Promise<void> {
    console.log('📦 Marking items as packed:', assignmentId);

    const { error } = await supabase
      .from('warehouse_assignments')
      .update({
        assignment_status: 'packed',
        packed_by: packerId,
        packed_at: new Date().toISOString(),
        warehouse_notes: warehouseNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', assignmentId);

    if (error) {
      console.error('❌ Error marking items as packed:', error);
      throw error;
    }

    // Update sales bill item status
    const assignment = await this.getAssignmentById(assignmentId);
    await this.updateSalesBillItemStatus(assignment.sales_bill_item_id, 'packed');

    console.log('✅ Items marked as packed');
    toast.success('บันทึกการแพ็คสำเร็จ', {
      description: `แพ็คสินค้าเรียบร้อยแล้ว`
    });
  }

  /**
   * Mark assignment as ready to ship
   */
  static async markReadyToShip(assignmentId: string): Promise<void> {
    console.log('🚚 Marking assignment as ready to ship:', assignmentId);

    await this.updateAssignmentStatus(assignmentId, 'ready_to_ship');

    toast.success('พร้อมจัดส่ง', {
      description: `สินค้าพร้อมสำหรับการจัดส่ง`
    });
  }

  // =====================================================
  // Query Operations
  // =====================================================

  /**
   * Get assignment by ID with full details
   */
  static async getAssignmentById(assignmentId: string): Promise<WarehouseAssignmentWithDetails> {
    console.log('🔍 Fetching assignment by ID:', assignmentId);

    const { data, error } = await supabase
      .from('warehouse_assignments')
      .select(`
        *,
        sales_bill:sales_bills(
          id,
          bill_number,
          customer:customers(
            customer_name,
            customer_code
          )
        ),
        sales_bill_item:sales_bill_items(*),
        inventory_item:inventory_items(*)
      `)
      .eq('id', assignmentId)
      .single();

    if (error) {
      console.error('❌ Error fetching assignment:', error);
      throw error;
    }

    console.log('✅ Assignment fetched');
    return data;
  }

  /**
   * Get assignments by sales bill ID
   */
  static async getAssignmentsBySalesBill(salesBillId: string): Promise<WarehouseAssignmentWithDetails[]> {
    console.log('🔍 Fetching assignments for sales bill:', salesBillId);

    const { data, error } = await supabase
      .from('warehouse_assignments')
      .select(`
        *,
        sales_bill:sales_bills(
          id,
          bill_number,
          customer:customers(
            customer_name,
            customer_code
          )
        ),
        sales_bill_item:sales_bill_items(*),
        inventory_item:inventory_items(*)
      `)
      .eq('sales_bill_id', salesBillId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error fetching assignments:', error);
      throw error;
    }

    console.log(`✅ Found ${data.length} assignments`);
    return data;
  }

  /**
   * Get assignments by status
   */
  static async getAssignmentsByStatus(status: AssignmentStatus): Promise<WarehouseAssignmentWithDetails[]> {
    console.log('🔍 Fetching assignments by status:', status);

    const { data, error } = await supabase
      .from('warehouse_assignments')
      .select(`
        *,
        sales_bill:sales_bills(
          id,
          bill_number,
          customer:customers(
            customer_name,
            customer_code
          )
        ),
        sales_bill_item:sales_bill_items(*),
        inventory_item:inventory_items(*)
      `)
      .eq('assignment_status', status)
      .order('assigned_at', { ascending: true });

    if (error) {
      console.error('❌ Error fetching assignments by status:', error);
      throw error;
    }

    console.log(`✅ Found ${data.length} assignments with status ${status}`);
    return data;
  }

  /**
   * Get warehouse workload statistics
   */
  static async getWarehouseWorkloadStats() {
    console.log('📊 Fetching warehouse workload statistics');

    const { data, error } = await supabase
      .from('warehouse_assignments')
      .select('assignment_status, created_at, assigned_at, picked_at, packed_at');

    if (error) {
      console.error('❌ Error fetching workload stats:', error);
      throw error;
    }

    // Calculate statistics
    const totalAssignments = data.length;
    const statusCounts = data.reduce((acc: Record<string, number>, assignment) => {
      acc[assignment.assignment_status] = (acc[assignment.assignment_status] || 0) + 1;
      return acc;
    }, {});

    // Calculate average processing times
    const processingTimes = data
      .filter(a => a.picked_at && a.assigned_at)
      .map(a => {
        const assignedAt = new Date(a.assigned_at!);
        const pickedAt = new Date(a.picked_at!);
        return pickedAt.getTime() - assignedAt.getTime();
      });

    const avgPickingTime = processingTimes.length > 0
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length / (1000 * 60) // in minutes
      : 0;

    return {
      totalAssignments,
      statusCounts,
      avgPickingTimeMinutes: Math.round(avgPickingTime),
      completionRate: totalAssignments > 0
        ? Math.round(((statusCounts['packed'] || 0) + (statusCounts['ready_to_ship'] || 0) + (statusCounts['shipped'] || 0)) / totalAssignments * 100)
        : 0
    };
  }

  // =====================================================
  // Helper Methods
  // =====================================================

  /**
   * Validate inventory availability
   */
  private static async validateInventoryAvailability(
    inventoryItemId: string,
    requiredLevel1: number,
    requiredLevel2: number,
    requiredLevel3: number
  ): Promise<InventoryItem> {
    console.log('🔍 Validating inventory availability:', inventoryItemId);

    const { data: inventoryItem, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', inventoryItemId)
      .single();

    if (error || !inventoryItem) {
      throw new Error('Inventory item not found');
    }

    // Check available quantities (total - reserved)
    const availableLevel1 = (inventoryItem.quantity_level1 || 0) - (inventoryItem.reserved_level1_quantity || 0);
    const availableLevel2 = (inventoryItem.quantity_level2 || 0) - (inventoryItem.reserved_level2_quantity || 0);
    const availableLevel3 = (inventoryItem.quantity_level3 || 0) - (inventoryItem.reserved_level3_quantity || 0);

    if (requiredLevel1 > availableLevel1 ||
        requiredLevel2 > availableLevel2 ||
        requiredLevel3 > availableLevel3) {
      throw new Error(`Insufficient inventory available at location ${inventoryItem.location}`);
    }

    return inventoryItem;
  }

  /**
   * Reserve inventory quantities
   */
  private static async reserveInventoryQuantities(
    inventoryItemId: string,
    reserveLevel1: number,
    reserveLevel2: number,
    reserveLevel3: number
  ): Promise<void> {
    console.log('📦 Reserving inventory quantities:', inventoryItemId);

    const { error } = await supabase
      .from('inventory_items')
      .update({
        reserved_level1_quantity: supabase.raw(`COALESCE(reserved_level1_quantity, 0) + ${reserveLevel1}`),
        reserved_level2_quantity: supabase.raw(`COALESCE(reserved_level2_quantity, 0) + ${reserveLevel2}`),
        reserved_level3_quantity: supabase.raw(`COALESCE(reserved_level3_quantity, 0) + ${reserveLevel3}`),
        updated_at: new Date().toISOString()
      })
      .eq('id', inventoryItemId);

    if (error) {
      console.error('❌ Error reserving inventory quantities:', error);
      throw error;
    }

    console.log('✅ Inventory quantities reserved');
  }

  /**
   * Release reserved inventory quantities
   */
  static async releaseReservedQuantities(assignmentId: string): Promise<void> {
    console.log('🔓 Releasing reserved quantities for assignment:', assignmentId);

    // Get assignment details
    const assignment = await this.getAssignmentById(assignmentId);

    const { error } = await supabase
      .from('inventory_items')
      .update({
        reserved_level1_quantity: supabase.raw(`GREATEST(COALESCE(reserved_level1_quantity, 0) - ${assignment.assigned_quantity_level1 || 0}, 0)`),
        reserved_level2_quantity: supabase.raw(`GREATEST(COALESCE(reserved_level2_quantity, 0) - ${assignment.assigned_quantity_level2 || 0}, 0)`),
        reserved_level3_quantity: supabase.raw(`GREATEST(COALESCE(reserved_level3_quantity, 0) - ${assignment.assigned_quantity_level3 || 0}, 0)`),
        updated_at: new Date().toISOString()
      })
      .eq('id', assignment.inventory_item_id);

    if (error) {
      console.error('❌ Error releasing reserved quantities:', error);
      throw error;
    }

    console.log('✅ Reserved quantities released');
  }

  /**
   * Update sales bill item status
   */
  private static async updateSalesBillItemStatus(
    salesBillItemId: string,
    status: 'pending' | 'assigned' | 'picked' | 'packed' | 'shipped'
  ): Promise<void> {
    console.log('📝 Updating sales bill item status:', salesBillItemId, status);

    const { error } = await supabase
      .from('sales_bill_items')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', salesBillItemId);

    if (error) {
      console.error('❌ Error updating sales bill item status:', error);
      throw error;
    }

    console.log('✅ Sales bill item status updated');
  }

  /**
   * Cancel warehouse assignment
   */
  static async cancelAssignment(assignmentId: string, reason?: string): Promise<void> {
    console.log('❌ Cancelling warehouse assignment:', assignmentId, reason);

    // Release reserved quantities
    await this.releaseReservedQuantities(assignmentId);

    // Delete assignment
    const { error } = await supabase
      .from('warehouse_assignments')
      .delete()
      .eq('id', assignmentId);

    if (error) {
      console.error('❌ Error cancelling assignment:', error);
      throw error;
    }

    // Reset sales bill item status
    const assignment = await this.getAssignmentById(assignmentId);
    await this.updateSalesBillItemStatus(assignment.sales_bill_item_id, 'pending');

    console.log('✅ Assignment cancelled and quantities released');
    toast.success('ยกเลิกการมอบหมาย', {
      description: reason || 'การมอบหมายถูกยกเลิกเรียบร้อย'
    });
  }
}