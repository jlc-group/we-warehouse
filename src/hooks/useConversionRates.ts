import { useState, useEffect, useCallback } from 'react';

export interface ConversionRateData {
  sku: string;
  product_name: string;
  unit_level1_name: string;
  unit_level1_rate: number;
  unit_level2_name: string;
  unit_level2_rate: number;
  unit_level3_name: string;
}

export interface ConversionRateInput {
  sku: string;
  product_name: string;
  unit_level1_name?: string;
  unit_level1_rate?: number;
  unit_level2_name?: string;
  unit_level2_rate?: number;
  unit_level3_name?: string;
}

export function useConversionRates() {
  const [conversionRates, setConversionRates] = useState<ConversionRateData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock fetch function since table doesn't exist
  const fetchConversionRates = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Return empty array since product_conversion_rates table doesn't exist
      setConversionRates([]);
    } catch (err) {
      setError('ไม่สามารถโหลดข้อมูลการแปลงหน่วยได้');
    } finally {
      setLoading(false);
    }
  }, []);

  // Mock get conversion rate function
  const getConversionRate = useCallback(async (sku: string): Promise<ConversionRateData | null> => {
    // Return default mock data
    return {
      sku,
      product_name: 'ไม่ระบุ',
      unit_level1_name: 'ลัง',
      unit_level1_rate: 1,
      unit_level2_name: 'กล่อง',
      unit_level2_rate: 1,
      unit_level3_name: 'ชิ้น'
    };
  }, []);

  // Mock create function
  const createConversionRate = useCallback(async (data: ConversionRateInput): Promise<boolean> => {
    console.log('Mock create conversion rate:', data);
    return true;
  }, []);

  // Mock update function
  const updateConversionRate = useCallback(async (sku: string, data: Partial<ConversionRateInput>): Promise<boolean> => {
    console.log('Mock update conversion rate:', sku, data);
    return true;
  }, []);

  // Mock delete function
  const deleteConversionRate = useCallback(async (sku: string): Promise<boolean> => {
    console.log('Mock delete conversion rate:', sku);
    return true;
  }, []);

  useEffect(() => {
    fetchConversionRates();
  }, [fetchConversionRates]);

  return {
    conversionRates,
    loading,
    error,
    fetchConversionRates,
    getConversionRate,
    createConversionRate,
    updateConversionRate,
    deleteConversionRate,
  };
}