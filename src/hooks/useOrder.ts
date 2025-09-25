import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Mock function to replace validateStock
const mockValidateStock = () => Promise.resolve({ success: true, data: { valid: true } });

export function useOrder() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('customer_orders').select('*');
      setOrders(data || []);
    } catch (err) {
      setError('เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  }, []);

  const validateOrderStock = useCallback(async () => {
    return { success: true, valid: true, issues: [] };
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    loading,
    error,
    fetchOrders,
    validateOrderStock,
    refresh: fetchOrders
  };
}