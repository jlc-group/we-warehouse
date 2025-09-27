import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WarehouseAssignmentService } from '@/services/warehouseAssignmentService';
import { FallbackWarehouseService } from '@/services/fallbackWarehouseService';
import { useToast } from '@/hooks/use-toast';
import type {
  SalesBillWithItems,
  WarehouseAssignmentWithDetails,
  AssignmentStatus
} from '@/integrations/supabase/types-3phase';

export interface WarehouseOrdersStats {
  pendingBills: number;
  assignedTasks: number;
  pickedTasks: number;
  packedTasks: number;
  readyToShip: number;
  completionRate: number;
  avgPickingTime: number;
}

export const useWarehouseOrders = () => {
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

  // Query for sales bills queue (waiting for warehouse assignment)
  const {
    data: salesBillsQueue = [],
    isLoading: isLoadingQueue,
    error: queueError,
    refetch: refetchQueue
  } = useQuery({
    queryKey: ['warehouse', 'sales-bills-queue', use3PhaseSystem],
    queryFn: async () => {
      if (use3PhaseSystem) {
        return await WarehouseAssignmentService.getSalesBillsQueue();
      } else {
        return await FallbackWarehouseService.getFallbackOrdersQueue();
      }
    },
    refetchInterval: 30000,
    staleTime: 10000,
    enabled: use3PhaseSystem !== null
  });

  // Query for warehouse assignments by status
  const useAssignmentsByStatus = (status: AssignmentStatus) => {
    return useQuery({
      queryKey: ['warehouse', 'assignments', status],
      queryFn: () => WarehouseAssignmentService.getAssignmentsByStatus(status),
      refetchInterval: 15000, // Refetch every 15 seconds
      staleTime: 5000
    });
  };

  // Get all assignments for dashboard
  const {
    data: allAssignments = [],
    isLoading: isLoadingAssignments,
    error: assignmentsError,
    refetch: refetchAssignments
  } = useQuery({
    queryKey: ['warehouse', 'all-assignments', use3PhaseSystem],
    queryFn: async () => {
      if (use3PhaseSystem) {
        const [assigned, picked, packed, readyToShip] = await Promise.all([
          WarehouseAssignmentService.getAssignmentsByStatus('assigned'),
          WarehouseAssignmentService.getAssignmentsByStatus('picked'),
          WarehouseAssignmentService.getAssignmentsByStatus('packed'),
          WarehouseAssignmentService.getAssignmentsByStatus('ready_to_ship')
        ]);
        return [...assigned, ...picked, ...packed, ...readyToShip];
      } else {
        return [];
      }
    },
    refetchInterval: 20000,
    staleTime: 10000,
    enabled: use3PhaseSystem !== null
  });

  // Query for warehouse workload statistics
  const {
    data: workloadStats,
    isLoading: isLoadingStats,
    error: statsError
  } = useQuery({
    queryKey: ['warehouse', 'workload-stats', use3PhaseSystem],
    queryFn: async () => {
      if (use3PhaseSystem) {
        return await WarehouseAssignmentService.getWarehouseWorkloadStats();
      } else {
        return await FallbackWarehouseService.getFallbackWarehouseStats();
      }
    },
    refetchInterval: 60000,
    staleTime: 30000,
    enabled: use3PhaseSystem !== null
  });

  // Mutations for warehouse operations
  const markPickedMutation = useMutation({
    mutationFn: ({ assignmentId, quantities, pickerId, notes }: {
      assignmentId: string;
      quantities: { level1: number; level2: number; level3: number };
      pickerId: string;
      notes?: string;
    }) => WarehouseAssignmentService.markItemsPicked(assignmentId, quantities, pickerId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse'] });
      toast({
        title: "สำเร็จ",
        description: "บันทึกการจัดเก็บสินค้าแล้ว",
      });
    },
    onError: (error) => {
      console.error('Error marking items as picked:', error);
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถบันทึกการจัดเก็บได้",
        variant: "destructive",
      });
    }
  });

  const markPackedMutation = useMutation({
    mutationFn: ({ assignmentId, packerId, notes }: {
      assignmentId: string;
      packerId: string;
      notes?: string;
    }) => WarehouseAssignmentService.markItemsPacked(assignmentId, packerId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse'] });
      toast({
        title: "สำเร็จ",
        description: "บันทึกการแพ็คสินค้าแล้ว",
      });
    },
    onError: (error) => {
      console.error('Error marking items as packed:', error);
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถบันทึกการแพ็คได้",
        variant: "destructive",
      });
    }
  });

  const markReadyToShipMutation = useMutation({
    mutationFn: (assignmentId: string) => WarehouseAssignmentService.markReadyToShip(assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse'] });
      toast({
        title: "สำเร็จ",
        description: "สินค้าพร้อมสำหรับการจัดส่ง",
      });
    },
    onError: (error) => {
      console.error('Error marking ready to ship:', error);
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตสถานะได้",
        variant: "destructive",
      });
    }
  });

  // Calculated statistics
  const stats: WarehouseOrdersStats = {
    pendingBills: salesBillsQueue.length,
    assignedTasks: allAssignments.filter(a => a.assignment_status === 'assigned').length,
    pickedTasks: allAssignments.filter(a => a.assignment_status === 'picked').length,
    packedTasks: allAssignments.filter(a => a.assignment_status === 'packed').length,
    readyToShip: allAssignments.filter(a => a.assignment_status === 'ready_to_ship').length,
    completionRate: workloadStats?.completionRate || 0,
    avgPickingTime: workloadStats?.avgPickingTimeMinutes || 0
  };

  // Helper functions
  const refreshAll = useCallback(() => {
    refetchQueue();
    refetchAssignments();
    queryClient.invalidateQueries({ queryKey: ['warehouse'] });
  }, [refetchQueue, refetchAssignments, queryClient]);

  const getAssignmentsByBill = useCallback((salesBillId: string) => {
    return allAssignments.filter(assignment => assignment.sales_bill_id === salesBillId);
  }, [allAssignments]);

  const getTasksByStatus = useCallback((status: AssignmentStatus) => {
    return allAssignments.filter(assignment => assignment.assignment_status === status);
  }, [allAssignments]);

  // Mark items as picked
  const markItemsPicked = useCallback((
    assignmentId: string,
    quantities: { level1: number; level2: number; level3: number },
    pickerId: string,
    notes?: string
  ) => {
    return markPickedMutation.mutateAsync({ assignmentId, quantities, pickerId, notes });
  }, [markPickedMutation]);

  // Mark items as packed
  const markItemsPacked = useCallback((
    assignmentId: string,
    packerId: string,
    notes?: string
  ) => {
    return markPackedMutation.mutateAsync({ assignmentId, packerId, notes });
  }, [markPackedMutation]);

  // Mark items as ready to ship
  const markItemsReadyToShip = useCallback((assignmentId: string) => {
    return markReadyToShipMutation.mutateAsync(assignmentId);
  }, [markReadyToShipMutation]);

  // Error handling
  const hasError = queueError || assignmentsError || statsError;
  const isLoading = isLoadingQueue || isLoadingAssignments || isLoadingStats;

  return {
    // Data
    salesBillsQueue,
    allAssignments,
    workloadStats,
    stats,

    // Loading states
    isLoading,
    isLoadingQueue,
    isLoadingAssignments,
    isLoadingStats,

    // Error states
    hasError,
    queueError,
    assignmentsError,
    statsError,

    // Mutation states
    isMarkingPicked: markPickedMutation.isPending,
    isMarkingPacked: markPackedMutation.isPending,
    isMarkingReadyToShip: markReadyToShipMutation.isPending,

    // Actions
    markItemsPicked,
    markItemsPacked,
    markItemsReadyToShip,
    refreshAll,

    // Helper functions
    getAssignmentsByBill,
    getTasksByStatus,
    useAssignmentsByStatus
  };
};