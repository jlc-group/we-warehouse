import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AccountingService,
  PaymentSummary,
  SalesBillWithPayment,
  CustomerPaymentSummary,
  PaymentStatus
} from '@/services/accountingService';
import { FallbackWarehouseService } from '@/services/fallbackWarehouseService';
import { useToast } from '@/hooks/use-toast';

export interface PaymentFilters {
  payment_status?: string;
  customer_id?: string;
  date_from?: string;
  date_to?: string;
  overdue_only?: boolean;
}

export const usePaymentTracking = (filters?: PaymentFilters) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [use3PhaseSystem, setUse3PhaseSystem] = useState(true);

  // Check if 3-phase system is available
  useEffect(() => {
    const checkSystem = async () => {
      try {
        const has3PhaseTables = await FallbackWarehouseService.check3PhaseTablesExist();
        setUse3PhaseSystem(has3PhaseTables);
      } catch (error) {
        console.error('Error checking 3-phase system:', error);
        setUse3PhaseSystem(false);
      }
    };
    checkSystem();
  }, []);

  // Query for payment summary
  const {
    data: paymentSummary,
    isLoading: isLoadingSummary,
    error: summaryError,
    refetch: refetchSummary
  } = useQuery({
    queryKey: ['accounting', 'payment-summary', filters?.date_from, filters?.date_to, use3PhaseSystem],
    queryFn: async () => {
      if (use3PhaseSystem) {
        return await AccountingService.getPaymentSummary(filters?.date_from, filters?.date_to);
      } else {
        const fallbackOrders = await FallbackWarehouseService.getFallbackOrdersQueue();
        return {
          totalSales: fallbackOrders.reduce((sum, order) => sum + order.total_amount, 0),
          totalPaid: 0,
          totalOutstanding: fallbackOrders.reduce((sum, order) => sum + order.total_amount, 0),
          overdueAmount: 0,
          collectionRate: 0
        };
      }
    },
    refetchInterval: 60000,
    staleTime: 30000,
    enabled: use3PhaseSystem !== null
  });

  // Query for sales bills with payment information
  const {
    data: salesBills = [],
    isLoading: isLoadingBills,
    error: billsError,
    refetch: refetchBills
  } = useQuery({
    queryKey: ['accounting', 'sales-bills', filters, use3PhaseSystem],
    queryFn: async () => {
      if (use3PhaseSystem) {
        return await AccountingService.getSalesBillsWithPayment(filters);
      } else {
        const fallbackOrders = await FallbackWarehouseService.getFallbackOrdersQueue();
        return fallbackOrders.map(order => ({
          ...order,
          payment_status: 'pending',
          amount_paid: 0,
          payment_date: null,
          payment_method: null,
          payment_reference: null,
          payment_notes: null
        })) as any;
      }
    },
    refetchInterval: 30000,
    staleTime: 15000,
    enabled: use3PhaseSystem !== null
  });

  // Query for customer payment summary
  const {
    data: customerSummary = [],
    isLoading: isLoadingCustomers,
    error: customersError,
    refetch: refetchCustomers
  } = useQuery({
    queryKey: ['accounting', 'customer-summary', use3PhaseSystem],
    queryFn: async () => {
      if (use3PhaseSystem) {
        return await AccountingService.getCustomerPaymentSummary();
      } else {
        return [];
      }
    },
    refetchInterval: 120000,
    staleTime: 60000,
    enabled: use3PhaseSystem !== null
  });

  // Query for overdue bills
  const {
    data: overdueBills = [],
    isLoading: isLoadingOverdue,
    error: overdueError,
    refetch: refetchOverdue
  } = useQuery({
    queryKey: ['accounting', 'overdue-bills', use3PhaseSystem],
    queryFn: async () => {
      if (use3PhaseSystem) {
        return await AccountingService.getOverdueBillsReport();
      } else {
        return [];
      }
    },
    refetchInterval: 300000,
    staleTime: 120000,
    enabled: use3PhaseSystem !== null
  });

  // Query for aging report
  const {
    data: agingReport,
    isLoading: isLoadingAging,
    error: agingError,
    refetch: refetchAging
  } = useQuery({
    queryKey: ['accounting', 'aging-report', use3PhaseSystem],
    queryFn: async () => {
      if (use3PhaseSystem) {
        return await AccountingService.getAgingReport();
      } else {
        return null;
      }
    },
    refetchInterval: 300000,
    staleTime: 120000,
    enabled: use3PhaseSystem !== null
  });

  // Mutation for updating payment status
  const updatePaymentMutation = useMutation({
    mutationFn: ({ salesBillId, paymentData, updatedBy }: {
      salesBillId: string;
      paymentData: PaymentStatus;
      updatedBy?: string;
    }) => AccountingService.updatePaymentStatus(salesBillId, paymentData, updatedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting'] });
      toast({
        title: "สำเร็จ",
        description: "อัปเดตสถานะการชำระเงินแล้ว",
      });
    },
    onError: (error) => {
      console.error('Error updating payment status:', error);
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตสถานะการชำระเงินได้",
        variant: "destructive",
      });
    }
  });

  // Mutation for marking bill as paid
  const markAsPaidMutation = useMutation({
    mutationFn: ({ salesBillId, totalAmount, paymentMethod, paymentReference, paymentDate, notes }: {
      salesBillId: string;
      totalAmount: number;
      paymentMethod: string;
      paymentReference?: string;
      paymentDate?: string;
      notes?: string;
    }) => AccountingService.markAsPaid(
      salesBillId,
      totalAmount,
      paymentMethod,
      paymentReference,
      paymentDate,
      notes
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting'] });
      toast({
        title: "สำเร็จ",
        description: "บันทึกการชำระเงินครบถ้วนแล้ว",
      });
    },
    onError: (error) => {
      console.error('Error marking as paid:', error);
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถบันทึกการชำระเงินได้",
        variant: "destructive",
      });
    }
  });

  // Mutation for recording partial payment
  const recordPartialPaymentMutation = useMutation({
    mutationFn: ({ salesBillId, partialAmount, paymentMethod, paymentReference, paymentDate, notes }: {
      salesBillId: string;
      partialAmount: number;
      paymentMethod: string;
      paymentReference?: string;
      paymentDate?: string;
      notes?: string;
    }) => AccountingService.recordPartialPayment(
      salesBillId,
      partialAmount,
      paymentMethod,
      paymentReference,
      paymentDate,
      notes
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting'] });
      toast({
        title: "สำเร็จ",
        description: "บันทึกการชำระเงินบางส่วนแล้ว",
      });
    },
    onError: (error) => {
      console.error('Error recording partial payment:', error);
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถบันทึกการชำระเงินได้",
        variant: "destructive",
      });
    }
  });

  // Helper functions
  const refreshAll = useCallback(() => {
    refetchSummary();
    refetchBills();
    refetchCustomers();
    refetchOverdue();
    refetchAging();
  }, [refetchSummary, refetchBills, refetchCustomers, refetchOverdue, refetchAging]);

  const getBillById = useCallback((billId: string) => {
    return salesBills.find(bill => bill.id === billId);
  }, [salesBills]);

  const getBillsByCustomer = useCallback((customerId: string) => {
    return salesBills.filter(bill => bill.customer_id === customerId);
  }, [salesBills]);

  const getBillsByStatus = useCallback((status: string) => {
    return salesBills.filter(bill => bill.payment_status === status);
  }, [salesBills]);

  const getOutstandingAmount = useCallback((totalAmount: number, amountPaid: number) => {
    return totalAmount - amountPaid;
  }, []);

  const calculateCollectionRate = useCallback(() => {
    if (!paymentSummary || paymentSummary.totalSales === 0) return 0;
    return (paymentSummary.totalPaid / paymentSummary.totalSales) * 100;
  }, [paymentSummary]);

  // Actions
  const updatePaymentStatus = useCallback((
    salesBillId: string,
    paymentData: PaymentStatus,
    updatedBy?: string
  ) => {
    return updatePaymentMutation.mutateAsync({ salesBillId, paymentData, updatedBy });
  }, [updatePaymentMutation]);

  const markBillAsPaid = useCallback((
    salesBillId: string,
    totalAmount: number,
    paymentMethod: string,
    paymentReference?: string,
    paymentDate?: string,
    notes?: string
  ) => {
    return markAsPaidMutation.mutateAsync({
      salesBillId,
      totalAmount,
      paymentMethod,
      paymentReference,
      paymentDate,
      notes
    });
  }, [markAsPaidMutation]);

  const recordPartialPayment = useCallback((
    salesBillId: string,
    partialAmount: number,
    paymentMethod: string,
    paymentReference?: string,
    paymentDate?: string,
    notes?: string
  ) => {
    return recordPartialPaymentMutation.mutateAsync({
      salesBillId,
      partialAmount,
      paymentMethod,
      paymentReference,
      paymentDate,
      notes
    });
  }, [recordPartialPaymentMutation]);

  // Generate payment reminder
  const generatePaymentReminder = useCallback((bill: SalesBillWithPayment) => {
    return AccountingService.generatePaymentReminder(bill);
  }, []);

  // Statistics
  const stats = {
    totalBills: salesBills.length,
    paidBills: getBillsByStatus('paid').length,
    pendingBills: getBillsByStatus('pending').length + getBillsByStatus('partial').length,
    overdueBills: overdueBills.length,
    collectionRate: calculateCollectionRate(),
    averagePaymentTime: 0, // Could be calculated from payment data
    totalOutstanding: paymentSummary?.totalOutstanding || 0,
    overdueAmount: paymentSummary?.overdueAmount || 0
  };

  // Error handling
  const hasError = summaryError || billsError || customersError || overdueError || agingError;
  const isLoading = isLoadingSummary || isLoadingBills || isLoadingCustomers || isLoadingOverdue || isLoadingAging;

  return {
    // Data
    paymentSummary,
    salesBills,
    customerSummary,
    overdueBills,
    agingReport,
    stats,

    // Loading states
    isLoading,
    isLoadingSummary,
    isLoadingBills,
    isLoadingCustomers,
    isLoadingOverdue,
    isLoadingAging,

    // Error states
    hasError,
    summaryError,
    billsError,
    customersError,
    overdueError,
    agingError,

    // Mutation states
    isUpdatingPayment: updatePaymentMutation.isPending,
    isMarkingPaid: markAsPaidMutation.isPending,
    isRecordingPartial: recordPartialPaymentMutation.isPending,

    // Actions
    updatePaymentStatus,
    markBillAsPaid,
    recordPartialPayment,
    refreshAll,

    // Helper functions
    getBillById,
    getBillsByCustomer,
    getBillsByStatus,
    getOutstandingAmount,
    calculateCollectionRate,
    generatePaymentReminder,

    // Utility functions from service
    getPaymentStatusText: AccountingService.getPaymentStatusText,
    getPaymentStatusColor: AccountingService.getPaymentStatusColor,
    calculateDaysStatus: AccountingService.calculateDaysStatus
  };
};