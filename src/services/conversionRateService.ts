// Disabled conversion rate service - mock data only
export interface ConversionRateData {
  sku: string;
  product_name: string;
  unit_level1_name: string;
  unit_level1_rate: number;
  unit_level2_name: string;
  unit_level2_rate: number;
  unit_level3_name: string;
}

export const fetchConversionRates = async (): Promise<ConversionRateData[]> => {
  // Return mock data since product_conversion_rates table doesn't exist
  return [];
};

export const fetchConversionRateByProduct = async (sku: string): Promise<ConversionRateData | null> => {
  // Return default mock data since product_conversion_rates table doesn't exist
  return {
    sku,
    product_name: 'ไม่ระบุ',
    unit_level1_name: 'ลัง',
    unit_level1_rate: 1,
    unit_level2_name: 'กล่อง',
    unit_level2_rate: 1,
    unit_level3_name: 'ชิ้น'
  };
};

export const updateConversionRate = async (sku: string, data: Partial<ConversionRateData>): Promise<ConversionRateData | null> => {
  // Return mock data since product_conversion_rates table doesn't exist
  console.log('Mock update conversion rate:', sku, data);
  return null;
};

export const createConversionRate = async (data: ConversionRateData): Promise<ConversionRateData | null> => {
  // Return mock data since product_conversion_rates table doesn't exist
  console.log('Mock create conversion rate:', data);
  return null;
};

export const deleteConversionRate = async (sku: string): Promise<boolean> => {
  // Return mock response since product_conversion_rates table doesn't exist
  console.log('Mock delete conversion rate:', sku);
  return true;
};