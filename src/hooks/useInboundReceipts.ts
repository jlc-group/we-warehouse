/**
 * Custom Hook: useInboundReceipts
 * จัดการข้อมูลการรับเข้าสินค้า พร้อม real-time updates
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import InboundReceiptService, {
  type InboundReceipt,
  type InboundReceiptItem,
  type ReceiptStatus,
  type ReceiptType,
  type CreateInboundReceiptInput
} from '@/services/inboundReceiptService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UseInboundReceiptsOptions {
  status?: ReceiptStatus;
  receipt_type?: ReceiptType;
  po_number?: string;
  date_from?: string;
  date_to?: string;
}

export function useInboundReceipts(options?: UseInboundReceiptsOptions) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);

  // Fetch all receipts
  const {
    data: receiptsData,
    isLoading: receiptsLoading,
    error: receiptsError,
    refetch: refetchReceipts
  } = useQuery({
    queryKey: ['inbound-receipts', options],
    queryFn: async () => {
      const result = await InboundReceiptService.getReceipts(options);
      if (!result.success) throw new Error(result.error);
      return result.receipts || [];
    },
    staleTime: 30000, // 30 seconds
  });

  // Fetch receipt details
  const {
    data: receiptDetails,
    isLoading: detailsLoading,
    error: detailsError
  } = useQuery({
    queryKey: ['inbound-receipt-detail', selectedReceiptId],
    queryFn: async () => {
      if (!selectedReceiptId) return null;
      const result = await InboundReceiptService.getReceiptById(selectedReceiptId);
      if (!result.success) throw new Error(result.error);
      return { receipt: result.receipt, items: result.items };
    },
    enabled: !!selectedReceiptId,
    staleTime: 10000,
  });

  // Create receipt mutation
  const createReceiptMutation = useMutation({
    mutationFn: async (input: CreateInboundReceiptInput) => {
      const result = await InboundReceiptService.createReceipt(input);
      if (!result.success) throw new Error(result.error);
      return result.receipt;
    },
    onSuccess: (receipt) => {
      queryClient.invalidateQueries({ queryKey: ['inbound-receipts'] });
      toast({
        title: '✅ สร้างรายการรับเข้าสำเร็จ',
        description: `เลขที่เอกสาร: ${receipt?.receipt_number}`
      });
    },
    onError: (error: Error) => {
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      receiptId,
      status,
      userId,
      notes
    }: {
      receiptId: string;
      status: ReceiptStatus;
      userId?: string;
      notes?: string;
    }) => {
      const result = await InboundReceiptService.updateReceiptStatus(
        receiptId,
        status,
        userId,
        notes
      );
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbound-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['inbound-receipt-detail'] });
      toast({
        title: '✅ อัปเดตสถานะสำเร็จ'
      });
    },
    onError: (error: Error) => {
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Stock items mutation - เข้าสต็อก
  const stockItemsMutation = useMutation({
    mutationFn: async ({ receiptId, userId }: { receiptId: string; userId?: string }) => {
      const result = await InboundReceiptService.stockReceiptItems(receiptId, userId);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbound-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['inbound-receipt-detail'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast({
        title: '✅ เข้าสต็อกสำเร็จ',
        description: 'สินค้าได้ถูกเพิ่มเข้าสต็อกแล้ว'
      });
    },
    onError: (error: Error) => {
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Cancel receipt mutation
  const cancelReceiptMutation = useMutation({
    mutationFn: async ({ receiptId, userId }: { receiptId: string; userId?: string }) => {
      const result = await InboundReceiptService.cancelReceipt(receiptId, userId);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbound-receipts'] });
      toast({
        title: '✅ ยกเลิกรายการสำเร็จ'
      });
    },
    onError: (error: Error) => {
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('inbound-receipts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inbound_receipts'
        },
        (payload) => {
          console.log('Inbound receipt changed:', payload);
          queryClient.invalidateQueries({ queryKey: ['inbound-receipts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    // Data
    receipts: receiptsData || [],
    selectedReceipt: receiptDetails?.receipt || null,
    selectedReceiptItems: receiptDetails?.items || [],

    // Loading states
    isLoading: receiptsLoading,
    isDetailsLoading: detailsLoading,
    isCreating: createReceiptMutation.isPending,
    isUpdating: updateStatusMutation.isPending,
    isStocking: stockItemsMutation.isPending,

    // Errors
    error: receiptsError || detailsError,

    // Actions
    setSelectedReceiptId,
    refetchReceipts,
    createReceipt: createReceiptMutation.mutateAsync,
    updateStatus: updateStatusMutation.mutateAsync,
    stockItems: stockItemsMutation.mutateAsync,
    cancelReceipt: cancelReceiptMutation.mutateAsync
  };
}
