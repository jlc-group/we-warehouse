import { useMemo } from 'react';
import {
  useSalesOrders,
  useProductComparisonAPI,
  useCustomerComparisonAPI,
  type SalesOrder
} from './useSalesData';

export interface ComparisonPeriod {
  totalSales: number;
  totalQuantity: number;
  orderCount: number;
  avgOrderValue: number;
  dailyData: { date: string; amount: number; quantity: number }[];
}

export interface ComparisonMetrics {
  current: ComparisonPeriod;
  previous: ComparisonPeriod;
  growth: {
    salesGrowth: number;
    quantityGrowth: number;
    orderGrowth: number;
    avgValueGrowth: number;
  };
}

export interface ProductGrowth {
  code: string;
  name: string;
  currentAmount: number;
  previousAmount: number;
  growth: number;
  growthPercent: number;
}

/**
 * คำนวณ % การเปลี่ยนแปลง
 */
function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * จัดกลุ่มข้อมูลการขายตามวันที่
 */
function groupSalesByDate(sales: SalesOrder[], orderDetailsMap?: Map<string, any[]>): { date: string; amount: number; quantity: number }[] {
  const grouped = new Map<string, { amount: number; quantity: number }>();

  sales.forEach(sale => {
    if (!sale.docdate) return;

    const date = sale.docdate.split('T')[0];
    const amount = sale.totalamount || 0;

    // คำนวณ quantity จาก order details ถ้ามี
    let quantity = 0;
    if (orderDetailsMap) {
      const items = orderDetailsMap.get(sale.docno);
      if (items) {
        quantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
      }
    }

    if (grouped.has(date)) {
      const existing = grouped.get(date)!;
      existing.amount += amount;
      existing.quantity += quantity;
    } else {
      grouped.set(date, { amount, quantity });
    }
  });

  return Array.from(grouped.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * คำนวณข้อมูลสำหรับช่วงเวลาหนึ่ง
 */
function calculatePeriodMetrics(sales: SalesOrder[], orderDetailsMap?: Map<string, any[]>): ComparisonPeriod {
  const totalSales = sales.reduce((sum, sale) => sum + (sale.totalamount || 0), 0);
  const orderCount = sales.length;
  const avgOrderValue = orderCount > 0 ? totalSales / orderCount : 0;

  // คำนวณ total quantity
  let totalQuantity = 0;
  if (orderDetailsMap) {
    sales.forEach(sale => {
      const items = orderDetailsMap.get(sale.docno);
      if (items) {
        totalQuantity += items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
      }
    });
  }

  const dailyData = groupSalesByDate(sales, orderDetailsMap);

  return {
    totalSales,
    totalQuantity,
    orderCount,
    avgOrderValue,
    dailyData
  };
}

/**
 * Hook: เปรียบเทียบการขายระหว่าง 2 ช่วงเวลา
 */
export function useSalesComparison(
  currentStartDate: string,
  currentEndDate: string,
  previousStartDate: string,
  previousEndDate: string,
  orderDetailsMap?: Map<string, any[]>
) {
  // Fetch current period
  const { data: currentSales, isLoading: currentLoading, error: currentError } = useSalesOrders({
    startDate: currentStartDate,
    endDate: currentEndDate,
    limit: 50000
  });

  // Fetch previous period
  const { data: previousSales, isLoading: previousLoading, error: previousError } = useSalesOrders({
    startDate: previousStartDate,
    endDate: previousEndDate,
    limit: 50000
  });

  const comparison: ComparisonMetrics | null = useMemo(() => {
    if (!currentSales || !previousSales) return null;

    const current = calculatePeriodMetrics(currentSales, orderDetailsMap);
    const previous = calculatePeriodMetrics(previousSales, orderDetailsMap);

    return {
      current,
      previous,
      growth: {
        salesGrowth: calculateGrowthRate(current.totalSales, previous.totalSales),
        quantityGrowth: calculateGrowthRate(current.totalQuantity, previous.totalQuantity),
        orderGrowth: calculateGrowthRate(current.orderCount, previous.orderCount),
        avgValueGrowth: calculateGrowthRate(current.avgOrderValue, previous.avgOrderValue)
      }
    };
  }, [currentSales, previousSales, orderDetailsMap]);

  return {
    comparison,
    isLoading: currentLoading || previousLoading,
    error: currentError || previousError,
    currentSales,
    previousSales
  };
}

/**
 * Hook: เปรียบเทียบเดือนต่อเดือน (Month-over-Month)
 */
export function useMonthComparison(orderDetailsMap?: Map<string, any[]>) {
  const now = new Date();

  // เดือนปัจจุบัน
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  // เดือนที่แล้ว
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

  return useSalesComparison(
    currentMonthStart,
    currentMonthEnd,
    previousMonthStart,
    previousMonthEnd,
    orderDetailsMap
  );
}

/**
 * Hook: เปรียบเทียบปีต่อปี (Year-over-Year)
 */
export function useYearComparison(orderDetailsMap?: Map<string, any[]>) {
  const now = new Date();

  // ปีปัจจุบัน
  const currentYearStart = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
  const currentYearEnd = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];

  // ปีที่แล้ว
  const previousYearStart = new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0];
  const previousYearEnd = new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0];

  return useSalesComparison(
    currentYearStart,
    currentYearEnd,
    previousYearStart,
    previousYearEnd,
    orderDetailsMap
  );
}

/**
 * คำนวณสินค้าที่มีการเติบโตสูงสุด/ต่ำสุด
 */
export function calculateProductGrowth(
  currentSales: SalesOrder[],
  previousSales: SalesOrder[],
  orderDetailsMap: Map<string, any[]>
): ProductGrowth[] {
  const currentProducts = new Map<string, { name: string; amount: number }>();
  const previousProducts = new Map<string, { name: string; amount: number }>();

  // สรุปสินค้าจากช่วงปัจจุบัน
  currentSales.forEach(sale => {
    const items = orderDetailsMap.get(sale.docno);
    if (items) {
      items.forEach(item => {
        const code = item.productcode || item.PRODUCTCODE;
        const name = item.productname || item.PRODUCTNAME || code;
        const amount = Number(item.netamount) || 0;

        if (currentProducts.has(code)) {
          currentProducts.get(code)!.amount += amount;
        } else {
          currentProducts.set(code, { name, amount });
        }
      });
    }
  });

  // สรุปสินค้าจากช่วงก่อนหน้า
  previousSales.forEach(sale => {
    const items = orderDetailsMap.get(sale.docno);
    if (items) {
      items.forEach(item => {
        const code = item.productcode || item.PRODUCTCODE;
        const name = item.productname || item.PRODUCTNAME || code;
        const amount = Number(item.netamount) || 0;

        if (previousProducts.has(code)) {
          previousProducts.get(code)!.amount += amount;
        } else {
          previousProducts.set(code, { name, amount });
        }
      });
    }
  });

  // คำนวณ growth
  const growthList: ProductGrowth[] = [];

  currentProducts.forEach((currentData, code) => {
    const previousData = previousProducts.get(code);
    const previousAmount = previousData?.amount || 0;
    const growth = currentData.amount - previousAmount;
    const growthPercent = calculateGrowthRate(currentData.amount, previousAmount);

    growthList.push({
      code,
      name: currentData.name,
      currentAmount: currentData.amount,
      previousAmount,
      growth,
      growthPercent
    });
  });

  return growthList.sort((a, b) => b.growthPercent - a.growthPercent);
}

/**
 * กรองยอดขายตามสินค้า
 */
function filterSalesByProduct(sales: SalesOrder[], productCode: string, orderDetailsMap: Map<string, any[]>): SalesOrder[] {
  return sales.filter(sale => {
    const items = orderDetailsMap.get(sale.docno);
    if (!items) return false;
    return items.some(item => {
      const code = item.productcode || item.PRODUCTCODE;
      return code === productCode;
    });
  });
}

/**
 * หาลูกค้าที่ซื้อสินค้ามากที่สุด (Top N)
 */
function getTopCustomersForProduct(
  sales: SalesOrder[],
  productCode: string,
  orderDetailsMap: Map<string, any[]>,
  limit: number = 5
): { arcode: string; arname: string; totalAmount: number; quantity: number; orderCount: number }[] {
  const customerMap = new Map<string, { arname: string; totalAmount: number; quantity: number; orderCount: number }>();

  sales.forEach(sale => {
    const items = orderDetailsMap.get(sale.docno);
    if (!items) return;

    items.forEach(item => {
      const code = item.productcode || item.PRODUCTCODE;
      if (code === productCode) {
        const arcode = sale.arcode || 'UNKNOWN';
        const arname = sale.arname || 'ไม่ระบุชื่อ';
        const amount = Number(item.netamount) || 0;
        const quantity = Number(item.quantity) || 0;

        if (customerMap.has(arcode)) {
          const existing = customerMap.get(arcode)!;
          existing.totalAmount += amount;
          existing.quantity += quantity;
          existing.orderCount += 1;
        } else {
          customerMap.set(arcode, { arname, totalAmount: amount, quantity, orderCount: 1 });
        }
      }
    });
  });

  return Array.from(customerMap.entries())
    .map(([arcode, data]) => ({ arcode, ...data }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, limit);
}

/**
 * หาสินค้าที่ลูกค้าซื้อมากที่สุด (Top N)
 */
function getTopProductsForCustomer(
  sales: SalesOrder[],
  orderDetailsMap: Map<string, any[]>,
  limit: number = 5
): { code: string; name: string; totalAmount: number; quantity: number; orderCount: number }[] {
  const productMap = new Map<string, { name: string; totalAmount: number; quantity: number; orderCount: number }>();

  sales.forEach(sale => {
    const items = orderDetailsMap.get(sale.docno);
    if (!items) return;

    items.forEach(item => {
      const code = item.productcode || item.PRODUCTCODE;
      const name = item.productname || item.PRODUCTNAME || code;
      const amount = Number(item.netamount) || 0;
      const quantity = Number(item.quantity) || 0;

      if (productMap.has(code)) {
        const existing = productMap.get(code)!;
        existing.totalAmount += amount;
        existing.quantity += quantity;
        existing.orderCount += 1;
      } else {
        productMap.set(code, { name, totalAmount: amount, quantity, orderCount: 1 });
      }
    });
  });

  return Array.from(productMap.entries())
    .map(([code, data]) => ({ code, ...data }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, limit);
}

/**
 * คำนวณ metrics สำหรับสินค้าเฉพาะ
 */
function calculateProductSpecificMetrics(
  sales: SalesOrder[],
  productCode: string,
  orderDetailsMap: Map<string, any[]>
): ComparisonPeriod & { avgPrice: number; peakDate: string; peakAmount: number; topCustomers: any[] } {
  let totalQuantity = 0;
  let totalAmount = 0;
  let orderCount = 0;
  const dailyMap = new Map<string, { amount: number; quantity: number }>();

  sales.forEach(sale => {
    const items = orderDetailsMap.get(sale.docno);
    if (!items) return;

    let orderHasProduct = false;
    let orderProductAmount = 0;
    let orderProductQuantity = 0;

    items.forEach(item => {
      const code = item.productcode || item.PRODUCTCODE;
      if (code === productCode) {
        orderHasProduct = true;
        const amount = Number(item.netamount) || 0;
        const quantity = Number(item.quantity) || 0;
        totalAmount += amount;
        totalQuantity += quantity;
        orderProductAmount += amount;
        orderProductQuantity += quantity;
      }
    });

    if (orderHasProduct) {
      orderCount += 1;

      // Group by date
      if (sale.docdate) {
        const date = sale.docdate.split('T')[0];
        if (dailyMap.has(date)) {
          const existing = dailyMap.get(date)!;
          existing.amount += orderProductAmount;
          existing.quantity += orderProductQuantity;
        } else {
          dailyMap.set(date, { amount: orderProductAmount, quantity: orderProductQuantity });
        }
      }
    }
  });

  const dailyData = Array.from(dailyMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Find peak date (with safety check for empty array)
  const peak = dailyData.length > 0
    ? dailyData.reduce((max, current) => current.amount > max.amount ? current : max)
    : { date: '', amount: 0, quantity: 0 };

  const avgPrice = totalQuantity > 0 ? totalAmount / totalQuantity : 0;
  const avgOrderValue = orderCount > 0 ? totalAmount / orderCount : 0;

  const topCustomers = getTopCustomersForProduct(sales, productCode, orderDetailsMap, 5);

  return {
    totalSales: totalAmount,
    totalQuantity,
    orderCount,
    avgOrderValue,
    dailyData,
    avgPrice,
    peakDate: peak.date,
    peakAmount: peak.amount,
    topCustomers
  };
}

/**
 * คำนวณ metrics สำหรับลูกค้าเฉพาะ
 */
function calculateCustomerSpecificMetrics(
  sales: SalesOrder[],
  orderDetailsMap: Map<string, any[]>
): ComparisonPeriod & { peakDate: string; peakAmount: number; topProducts: any[] } {
  let totalQuantity = 0;
  let totalAmount = 0;
  const orderCount = sales.length;
  const dailyMap = new Map<string, { amount: number; quantity: number }>();

  sales.forEach(sale => {
    const amount = sale.totalamount || 0;
    totalAmount += amount;

    // Calculate quantity from items
    const items = orderDetailsMap.get(sale.docno);
    if (items) {
      items.forEach(item => {
        totalQuantity += Number(item.quantity) || 0;
      });
    }

    // Group by date
    if (sale.docdate) {
      const date = sale.docdate.split('T')[0];
      const saleQuantity = items ? items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) : 0;

      if (dailyMap.has(date)) {
        const existing = dailyMap.get(date)!;
        existing.amount += amount;
        existing.quantity += saleQuantity;
      } else {
        dailyMap.set(date, { amount, quantity: saleQuantity });
      }
    }
  });

  const dailyData = Array.from(dailyMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Find peak date (with safety check for empty array)
  const peak = dailyData.length > 0
    ? dailyData.reduce((max, current) => current.amount > max.amount ? current : max)
    : { date: '', amount: 0, quantity: 0 };

  const avgOrderValue = orderCount > 0 ? totalAmount / orderCount : 0;

  const topProducts = getTopProductsForCustomer(sales, orderDetailsMap, 5);

  return {
    totalSales: totalAmount,
    totalQuantity,
    orderCount,
    avgOrderValue,
    dailyData,
    peakDate: peak.date,
    peakAmount: peak.amount,
    topProducts
  };
}

/**
 * Hook: วิเคราะห์ยอดขายตามสินค้า (ใช้ Backend API)
 * ใช้ aggregated queries จาก backend แทนการคำนวณฝั่ง client
 */
export function useProductComparison(
  productCode: string | null,
  comparisonType: 'month' | 'year',
  orderDetailsMap?: Map<string, any[]> // ไม่ใช้แล้วเพราะ backend คำนวณให้
) {
  const now = new Date();

  // Calculate date ranges based on comparison type
  let currentStart, currentEnd, previousStart, previousEnd;

  if (comparisonType === 'month') {
    currentStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    previousEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
  } else {
    currentStart = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    currentEnd = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
    previousStart = new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0];
    previousEnd = new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0];
  }

  // Use Backend API for optimized aggregation (ลดจาก 500+ requests → 1 request)
  const { data: apiData, isLoading, error } = useProductComparisonAPI(
    productCode,
    currentStart,
    currentEnd,
    previousStart,
    previousEnd
  );

  const productMetrics = useMemo(() => {
    if (!apiData) return null;

    // Transform API response to match expected format
    return {
      current: {
        totalSales: apiData.current.totalSales || 0,
        totalQuantity: apiData.current.totalQuantity,
        orderCount: apiData.current.orderCount,
        avgOrderValue: apiData.current.avgOrderValue,
        dailyData: apiData.current.dailyData,
        topCustomers: apiData.topCustomers,
        peakDate: apiData.current.peakSalesDate || '',
        peakAmount: apiData.current.peakSalesAmount || 0,
        avgPrice: 0 // Can be calculated if needed
      },
      previous: {
        totalSales: apiData.previous.totalSales || 0,
        totalQuantity: apiData.previous.totalQuantity,
        orderCount: apiData.previous.orderCount,
        avgOrderValue: apiData.previous.avgOrderValue,
        dailyData: apiData.previous.dailyData,
        peakDate: apiData.previous.peakSalesDate || '',
        peakAmount: apiData.previous.peakSalesAmount || 0,
        avgPrice: 0
      },
      growth: apiData.growth,
      dailyComparison: apiData.dailyComparison
    };
  }, [apiData]);

  return {
    comparison: null, // ไม่ต้องใช้เพราะมี productMetrics แทน
    isLoading,
    error,
    currentSales: [], // ไม่ส่งกลับเพราะไม่จำเป็นอีกต่อไป
    previousSales: [], // ไม่ส่งกลับเพราะไม่จำเป็นอีกต่อไป
    productMetrics
  };
}

/**
 * Hook: วิเคราะห์ยอดซื้อตามลูกค้า (ใช้ Backend API)
 * ใช้ aggregated queries จาก backend แทนการคำนวณฝั่ง client
 */
export function useCustomerComparison(
  arcode: string | null,
  comparisonType: 'month' | 'year',
  orderDetailsMap?: Map<string, any[]> // ไม่ใช้แล้วเพราะ backend คำนวณให้
) {
  const now = new Date();

  // Calculate date ranges based on comparison type
  let currentStart, currentEnd, previousStart, previousEnd;

  if (comparisonType === 'month') {
    currentStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    previousEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
  } else {
    currentStart = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    currentEnd = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
    previousStart = new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0];
    previousEnd = new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0];
  }

  // Use Backend API for optimized aggregation (ลดจาก 500+ requests → 1 request)
  const { data: apiData, isLoading, error } = useCustomerComparisonAPI(
    arcode,
    currentStart,
    currentEnd,
    previousStart,
    previousEnd
  );

  const customerMetrics = useMemo(() => {
    if (!apiData) return null;

    // Transform API response to match expected format
    return {
      current: {
        totalSales: apiData.current.totalPurchases || 0,
        totalQuantity: apiData.current.totalQuantity,
        orderCount: apiData.current.orderCount,
        avgOrderValue: apiData.current.avgOrderValue,
        dailyData: apiData.current.dailyData,
        topProducts: apiData.topProducts,
        peakDate: apiData.current.peakPurchaseDate || '',
        peakAmount: apiData.current.peakPurchaseAmount || 0
      },
      previous: {
        totalSales: apiData.previous.totalPurchases || 0,
        totalQuantity: apiData.previous.totalQuantity,
        orderCount: apiData.previous.orderCount,
        avgOrderValue: apiData.previous.avgOrderValue,
        dailyData: apiData.previous.dailyData,
        peakDate: apiData.previous.peakPurchaseDate || '',
        peakAmount: apiData.previous.peakPurchaseAmount || 0
      },
      growth: {
        salesGrowth: apiData.growth.purchasesGrowth, // ใช้ purchasesGrowth จาก API
        quantityGrowth: apiData.growth.quantityGrowth,
        orderGrowth: apiData.growth.orderGrowth,
        avgValueGrowth: apiData.growth.avgValueGrowth
      },
      dailyComparison: apiData.dailyComparison
    };
  }, [apiData]);

  return {
    comparison: null, // ไม่ต้องใช้เพราะมี customerMetrics แทน
    isLoading,
    error,
    currentSales: [], // ไม่ส่งกลับเพราะไม่จำเป็นอีกต่อไป
    previousSales: [], // ไม่ส่งกลับเพราะไม่จำเป็นอีกต่อไป
    customerMetrics
  };
}
