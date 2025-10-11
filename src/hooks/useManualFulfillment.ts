import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ManualFulfillmentService, type ManualFulfillmentInput } from '@/services/manualFulfillmentService';
import { supabase } from '@/integrations/supabase/client';

export const useManualFulfillment = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // สร้างงานจัดสินค้าแบบ Manual
  const createManualFulfillment = async (input: ManualFulfillmentInput) => {
    setLoading(true);
    try {
      const result = await ManualFulfillmentService.createManualFulfillment(input);

      if (result.success) {
        toast({
          title: '✅ สร้างงานสำเร็จ',
          description: `สร้างงานจัดสินค้า ${input.po_number} แล้ว`
        });
        return { success: true, task: result.task };
      } else {
        toast({
          title: '❌ เกิดข้อผิดพลาด',
          description: result.error || 'ไม่สามารถสร้างงานได้',
          variant: 'destructive'
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error creating manual fulfillment:', error);
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: 'ไม่สามารถสร้างงานได้',
        variant: 'destructive'
      });
      return { success: false, error: String(error) };
    } finally {
      setLoading(false);
    }
  };

  // ตรวจสอบความถูกต้องของ PO Number
  const validatePONumber = async (poNumber: string) => {
    try {
      return await ManualFulfillmentService.validatePONumber(poNumber);
    } catch (error) {
      console.error('Error validating PO number:', error);
      return { isValid: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบ' };
    }
  };

  // ดึงรายชื่อลูกค้า
  const fetchCustomers = async (searchTerm: string = '') => {
    try {
      return await ManualFulfillmentService.fetchCustomers(searchTerm);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: '❌ ไม่สามารถโหลดข้อมูลลูกค้า',
        description: 'กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive'
      });
      return [];
    }
  };

  // ค้นหาสินค้าตามชื่อหรือรหัส
  const findProductLocations = async (productName: string, productCode?: string) => {
    try {
      return await ManualFulfillmentService.findProductLocations(productName, productCode);
    } catch (error) {
      console.error('Error finding product locations:', error);
      toast({
        title: '❌ ไม่สามารถค้นหาสินค้า',
        description: 'กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive'
      });
      return [];
    }
  };

  // ดึงงาน fulfillment ล่าสุด
  const fetchRecentTasks = async (limit: number = 10) => {
    try {
      const { data, error } = await supabase
        .from('fulfillment_tasks')
        .select(`
          id,
          po_number,
          po_date,
          delivery_date,
          customer_code,
          warehouse_name,
          total_amount,
          status,
          priority,
          source_type,
          created_by,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching recent tasks:', error);
      toast({
        title: '❌ ไม่สามารถโหลดงาน',
        description: 'กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive'
      });
      return [];
    }
  };

  // ดึงรายละเอียดงาน fulfillment
  const fetchTaskDetails = async (taskId: string) => {
    try {
      const { data, error } = await supabase
        .from('fulfillment_tasks')
        .select(`
          *,
          fulfillment_items (
            id,
            product_name,
            product_code,
            requested_quantity,
            fulfilled_quantity,
            unit_price,
            total_amount,
            status,
            location,
            inventory_item_id,
            available_stock,
            picked_at,
            picked_by,
            cancelled_at,
            cancelled_by,
            notes
          )
        `)
        .eq('id', taskId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching task details:', error);
      toast({
        title: '❌ ไม่สามารถโหลดรายละเอียด',
        description: 'กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive'
      });
      return null;
    }
  };

  return {
    loading,
    createManualFulfillment,
    validatePONumber,
    fetchCustomers,
    findProductLocations,
    fetchRecentTasks,
    fetchTaskDetails
  };
};

export default useManualFulfillment;