import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ConversionRateService, ConversionRateData, ConversionRateInput } from '@/services/conversionRateService';
import { toast } from '@/hooks/use-toast';

// Query keys สำหรับ React Query
export const CONVERSION_RATES_QUERY_KEYS = {
  all: ['conversionRates'] as const,
  detail: (sku: string) => ['conversionRates', sku] as const,
};

export interface UseConversionRatesReturn {
  // Data
  conversionRates: ConversionRateData[];
  isLoading: boolean;
  error: string | null;

  // Actions
  createConversionRate: (input: ConversionRateInput) => Promise<boolean>;
  updateConversionRate: (sku: string, input: ConversionRateInput) => Promise<boolean>;
  deleteConversionRate: (sku: string) => Promise<boolean>;
  syncInventoryItems: (sku: string, conversionData: ConversionRateData) => Promise<{ affectedItems: number } | null>;
  refetch: () => Promise<any>;

  // States for UI feedback
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isSyncing: boolean;
}

export interface UseConversionRateDetailReturn {
  // Data
  conversionRate: ConversionRateData | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  refetch: () => Promise<any>;
}

/**
 * Hook สำหรับการจัดการ conversion rates ทั้งหมด
 */
export function useConversionRates(): UseConversionRatesReturn {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Query สำหรับดึงข้อมูล conversion rates ทั้งหมด
  const {
    data: conversionRates = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: CONVERSION_RATES_QUERY_KEYS.all,
    queryFn: async () => {
      const result = await ConversionRateService.getAllConversionRates();
      if (!result.success) {
        throw new Error(result.error || 'ไม่สามารถโหลดข้อมูลการแปลงหน่วยได้');
      }
      return result.data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Mutation สำหรับสร้าง conversion rate ใหม่
  const createMutation = useMutation({
    mutationFn: async (input: ConversionRateInput) => {
      const result = await ConversionRateService.createConversionRate(input);
      if (!result.success) {
        throw new Error(result.error || 'ไม่สามารถสร้างการตั้งค่าแปลงหน่วยได้');
      }
      return result.data;
    },
    onSuccess: (data) => {
      // อัปเดต cache
      queryClient.setQueryData(CONVERSION_RATES_QUERY_KEYS.all, (old: ConversionRateData[] = []) => {
        const existingIndex = old.findIndex(item => item.sku === data.sku);
        if (existingIndex >= 0) {
          const newData = [...old];
          newData[existingIndex] = data;
          return newData;
        }
        return [...old, data].sort((a, b) => a.sku.localeCompare(b.sku));
      });

      // แสดง toast สำเร็จ
      toast({
        title: 'สร้างสำเร็จ',
        description: `สร้างการตั้งค่าแปลงหน่วยสำหรับ ${data.sku} แล้ว`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Mutation สำหรับอัปเดต conversion rate
  const updateMutation = useMutation({
    mutationFn: async ({ sku, input }: { sku: string; input: ConversionRateInput }) => {
      const result = await ConversionRateService.updateConversionRate(sku, input);
      if (!result.success) {
        throw new Error(result.error || 'ไม่สามารถอัปเดตการตั้งค่าแปลงหน่วยได้');
      }
      return result.data;
    },
    onSuccess: (data) => {
      // อัปเดต cache
      queryClient.setQueryData(CONVERSION_RATES_QUERY_KEYS.all, (old: ConversionRateData[] = []) => {
        return old.map(item => item.sku === data.sku ? data : item);
      });

      // อัปเดต cache สำหรับ detail query
      queryClient.setQueryData(CONVERSION_RATES_QUERY_KEYS.detail(data.sku), data);

      // แสดง toast สำเร็จ
      toast({
        title: 'อัปเดตสำเร็จ',
        description: `อัปเดตการตั้งค่าแปลงหน่วยสำหรับ ${data.sku} แล้ว`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Mutation สำหรับลบ conversion rate
  const deleteMutation = useMutation({
    mutationFn: async (sku: string) => {
      const result = await ConversionRateService.deleteConversionRate(sku);
      if (!result.success) {
        throw new Error(result.error || 'ไม่สามารถลบการตั้งค่าแปลงหน่วยได้');
      }
      return sku;
    },
    onSuccess: (sku) => {
      // อัปเดต cache
      queryClient.setQueryData(CONVERSION_RATES_QUERY_KEYS.all, (old: ConversionRateData[] = []) => {
        return old.filter(item => item.sku !== sku);
      });

      // ลบ cache สำหรับ detail query
      queryClient.removeQueries({ queryKey: CONVERSION_RATES_QUERY_KEYS.detail(sku) });

      // แสดง toast สำเร็จ
      toast({
        title: 'ลบสำเร็จ',
        description: `ลบการตั้งค่าแปลงหน่วยสำหรับ ${sku} แล้ว`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Actions
  const createConversionRate = useCallback(async (input: ConversionRateInput): Promise<boolean> => {
    setIsCreating(true);
    try {
      await createMutation.mutateAsync(input);
      return true;
    } catch (error) {
      return false;
    } finally {
      setIsCreating(false);
    }
  }, [createMutation]);

  const updateConversionRate = useCallback(async (sku: string, input: ConversionRateInput): Promise<boolean> => {
    setIsUpdating(true);
    try {
      await updateMutation.mutateAsync({ sku, input });
      return true;
    } catch (error) {
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [updateMutation]);

  const deleteConversionRate = useCallback(async (sku: string): Promise<boolean> => {
    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync(sku);
      return true;
    } catch (error) {
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [deleteMutation]);

  const syncInventoryItems = useCallback(async (
    sku: string,
    conversionData: ConversionRateData
  ): Promise<{ affectedItems: number } | null> => {
    setIsSyncing(true);
    try {
      const result = await ConversionRateService.syncInventoryItems(sku, conversionData);
      if (!result.success) {
        toast({
          title: 'เกิดข้อผิดพลาด',
          description: result.error || 'ไม่สามารถซิงค์ข้อมูล inventory items ได้',
          variant: 'destructive',
        });
        return null;
      }

      if (result.data && result.data.affectedItems > 0) {
        toast({
          title: 'ซิงค์สำเร็จ',
          description: `ซิงค์ข้อมูล ${result.data.affectedItems} รายการแล้ว`,
        });
      }

      return result.data;
    } catch (error) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'เกิดข้อผิดพลาดในการซิงค์ข้อมูล',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return {
    // Data
    conversionRates,
    isLoading,
    error: error?.message || null,

    // Actions
    createConversionRate,
    updateConversionRate,
    deleteConversionRate,
    syncInventoryItems,
    refetch,

    // States
    isCreating,
    isUpdating,
    isDeleting,
    isSyncing,
  };
}

/**
 * Hook สำหรับดึงข้อมูล conversion rate เฉพาะ SKU
 */
export function useConversionRateDetail(sku: string): UseConversionRateDetailReturn {
  const {
    data: conversionRate = null,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: CONVERSION_RATES_QUERY_KEYS.detail(sku),
    queryFn: async () => {
      if (!sku?.trim()) return null;

      const result = await ConversionRateService.getConversionRate(sku);
      if (!result.success) {
        throw new Error(result.error || 'ไม่สามารถโหลดข้อมูลการแปลงหน่วยได้');
      }
      return result.data;
    },
    enabled: !!sku?.trim(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    conversionRate,
    isLoading,
    error: error?.message || null,
    refetch,
  };
}

// Helper functions ที่อาจมีประโยชน์
export const conversionRateHelpers = {
  /**
   * ตรวจสอบว่า conversion rate ถูกต้องหรือไม่
   */
  hasValidConversion: ConversionRateService.hasValidConversion,

  /**
   * คำนวณการแปลงหน่วย
   */
  calculateConversion: ConversionRateService.calculateConversion,

  /**
   * สร้าง conversion rate object สำหรับการแสดงผล
   */
  createDisplayConversionRate: (sku: string, productName: string): ConversionRateData => ({
    sku,
    product_name: productName,
    unit_level1_name: 'ลัง',
    unit_level1_rate: 1,
    unit_level2_name: 'กล่อง',
    unit_level2_rate: 1,
    unit_level3_name: 'ชิ้น'
  }),
};