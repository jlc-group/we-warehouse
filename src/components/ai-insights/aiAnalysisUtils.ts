/**
 * AI Analysis Utilities - Logic วิเคราะห์ข้อมูลยอดขาย
 */

// Types
export interface SalesDataPoint {
  date: string;
  amount: number;
}

export interface ProductSalesData {
  productCode: string;
  productName: string;
  totalSales: number;
  totalQuantity: number;
  orderCount: number;
}

export interface CustomerSalesData {
  arcode: string;
  arname: string;
  totalPurchases: number;
  orderCount: number;
}

export interface TrendResult {
  direction: 'up' | 'down' | 'stable';
  percentChange: number;
  movingAverage: number[];
  prediction: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface ProductAlert {
  productCode: string;
  productName: string;
  alertType: 'rising_star' | 'declining' | 'stable_top' | 'new_entry' | 'comeback';
  percentChange: number;
  currentSales: number;
  previousSales: number;
  message: string;
  priority: 'high' | 'medium' | 'low';
  recommendation: string;
}

export interface CustomerAlert {
  arcode: string;
  arname: string;
  alertType: 'increasing' | 'decreasing' | 'inactive' | 'new' | 'vip_risk';
  percentChange: number;
  currentPurchases: number;
  previousPurchases: number;
  message: string;
  priority: 'high' | 'medium' | 'low';
  recommendation: string;
}

export interface SeasonalPattern {
  dayOfWeek: { [key: string]: number };
  weekOfMonth: { [key: string]: number };
  bestDay: string;
  worstDay: string;
  pattern: string;
}

export interface AIInsight {
  id: string;
  category: 'trend' | 'product' | 'customer' | 'seasonal' | 'general';
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  priority: 'high' | 'medium' | 'low';
  actionItems: string[];
  data?: any;
}

// ========== TREND ANALYSIS ==========

/**
 * คำนวณ Moving Average
 */
export function calculateMovingAverage(data: number[], period: number): number[] {
  if (data.length < period) return data;
  
  const result: number[] = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
}

/**
 * คำนวณ Linear Regression สำหรับพยากรณ์แนวโน้ม
 */
export function linearRegression(data: number[]): { slope: number; intercept: number; r2: number } {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0] || 0, r2: 0 };
  
  const xMean = (n - 1) / 2;
  const yMean = data.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denominator = 0;
  let ssTotal = 0;
  let ssResidual = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (data[i] - yMean);
    denominator += (i - xMean) ** 2;
    ssTotal += (data[i] - yMean) ** 2;
  }
  
  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;
  
  // Calculate R-squared
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    ssResidual += (data[i] - predicted) ** 2;
  }
  const r2 = ssTotal !== 0 ? 1 - (ssResidual / ssTotal) : 0;
  
  return { slope, intercept, r2 };
}

/**
 * วิเคราะห์แนวโน้มยอดขาย
 */
export function analyzeTrend(salesData: SalesDataPoint[]): TrendResult {
  if (salesData.length < 3) {
    return {
      direction: 'stable',
      percentChange: 0,
      movingAverage: [],
      prediction: 0,
      confidence: 'low'
    };
  }
  
  const amounts = salesData.map(d => d.amount);
  const ma7 = calculateMovingAverage(amounts, Math.min(7, amounts.length));
  const { slope, intercept, r2 } = linearRegression(amounts);
  
  // Calculate percent change (first half vs second half)
  const midPoint = Math.floor(amounts.length / 2);
  const firstHalf = amounts.slice(0, midPoint);
  const secondHalf = amounts.slice(midPoint);
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length || 1;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  const percentChange = ((secondAvg - firstAvg) / firstAvg) * 100;
  
  // Determine direction
  let direction: 'up' | 'down' | 'stable';
  if (percentChange > 5) direction = 'up';
  else if (percentChange < -5) direction = 'down';
  else direction = 'stable';
  
  // Predict next period
  const prediction = slope * amounts.length + intercept;
  
  // Confidence based on R-squared
  let confidence: 'high' | 'medium' | 'low';
  if (r2 > 0.7) confidence = 'high';
  else if (r2 > 0.4) confidence = 'medium';
  else confidence = 'low';
  
  return {
    direction,
    percentChange,
    movingAverage: ma7,
    prediction: Math.max(0, prediction),
    confidence
  };
}

// ========== PRODUCT ANALYSIS ==========

/**
 * วิเคราะห์สินค้าและสร้าง Alerts
 */
export function analyzeProducts(
  currentProducts: ProductSalesData[],
  previousProducts: ProductSalesData[]
): ProductAlert[] {
  const alerts: ProductAlert[] = [];
  const prevMap = new Map(previousProducts.map(p => [p.productCode, p]));
  
  for (const current of currentProducts) {
    const prev = prevMap.get(current.productCode);
    
    if (!prev) {
      // New product entry
      if (current.totalSales > 10000) {
        alerts.push({
          productCode: current.productCode,
          productName: current.productName,
          alertType: 'new_entry',
          percentChange: 100,
          currentSales: current.totalSales,
          previousSales: 0,
          message: `🆕 สินค้าใหม่ "${current.productName}" ขายได้ดี`,
          priority: 'medium',
          recommendation: 'พิจารณาเพิ่ม stock และโปรโมท'
        });
      }
      continue;
    }
    
    const percentChange = prev.totalSales > 0 
      ? ((current.totalSales - prev.totalSales) / prev.totalSales) * 100 
      : 0;
    
    // Rising star - เพิ่มขึ้นมากกว่า 30%
    if (percentChange > 30 && current.totalSales > 50000) {
      alerts.push({
        productCode: current.productCode,
        productName: current.productName,
        alertType: 'rising_star',
        percentChange,
        currentSales: current.totalSales,
        previousSales: prev.totalSales,
        message: `🚀 "${current.productName}" ยอดขายเพิ่มขึ้น ${percentChange.toFixed(1)}%`,
        priority: 'high',
        recommendation: 'เพิ่ม stock และพิจารณาขยายการตลาด'
      });
    }
    // Declining - ลดลงมากกว่า 20%
    else if (percentChange < -20 && prev.totalSales > 30000) {
      alerts.push({
        productCode: current.productCode,
        productName: current.productName,
        alertType: 'declining',
        percentChange,
        currentSales: current.totalSales,
        previousSales: prev.totalSales,
        message: `📉 "${current.productName}" ยอดขายลดลง ${Math.abs(percentChange).toFixed(1)}%`,
        priority: 'high',
        recommendation: 'ตรวจสอบสาเหตุ: ราคา, คู่แข่ง, หรือ stock หมด?'
      });
    }
    // Stable top performer
    else if (Math.abs(percentChange) <= 10 && current.totalSales > 100000) {
      alerts.push({
        productCode: current.productCode,
        productName: current.productName,
        alertType: 'stable_top',
        percentChange,
        currentSales: current.totalSales,
        previousSales: prev.totalSales,
        message: `⭐ "${current.productName}" เป็นสินค้าขายดีคงที่`,
        priority: 'low',
        recommendation: 'รักษาระดับ stock และบริการ'
      });
    }
  }
  
  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  alerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  return alerts.slice(0, 10); // Top 10 alerts
}

// ========== CUSTOMER ANALYSIS ==========

/**
 * วิเคราะห์ลูกค้าและสร้าง Alerts
 */
export function analyzeCustomers(
  currentCustomers: CustomerSalesData[],
  previousCustomers: CustomerSalesData[]
): CustomerAlert[] {
  const alerts: CustomerAlert[] = [];
  const prevMap = new Map(previousCustomers.map(c => [c.arcode, c]));
  const currentMap = new Map(currentCustomers.map(c => [c.arcode, c]));
  
  // Check current customers
  for (const current of currentCustomers) {
    const prev = prevMap.get(current.arcode);
    
    if (!prev) {
      // New customer
      if (current.totalPurchases > 20000) {
        alerts.push({
          arcode: current.arcode,
          arname: current.arname,
          alertType: 'new',
          percentChange: 100,
          currentPurchases: current.totalPurchases,
          previousPurchases: 0,
          message: `🎉 ลูกค้าใหม่ "${current.arname}" ยอดซื้อสูง`,
          priority: 'medium',
          recommendation: 'ส่งข้อเสนอพิเศษเพื่อรักษาลูกค้า'
        });
      }
      continue;
    }
    
    const percentChange = prev.totalPurchases > 0
      ? ((current.totalPurchases - prev.totalPurchases) / prev.totalPurchases) * 100
      : 0;
    
    // Increasing significantly
    if (percentChange > 50 && current.totalPurchases > 50000) {
      alerts.push({
        arcode: current.arcode,
        arname: current.arname,
        alertType: 'increasing',
        percentChange,
        currentPurchases: current.totalPurchases,
        previousPurchases: prev.totalPurchases,
        message: `📈 "${current.arname}" ยอดซื้อเพิ่มขึ้น ${percentChange.toFixed(1)}%`,
        priority: 'medium',
        recommendation: 'พิจารณาเสนอส่วนลดพิเศษหรือสิทธิ์ VIP'
      });
    }
    // VIP at risk - ลูกค้าใหญ่ซื้อน้อยลง
    else if (percentChange < -30 && prev.totalPurchases > 100000) {
      alerts.push({
        arcode: current.arcode,
        arname: current.arname,
        alertType: 'vip_risk',
        percentChange,
        currentPurchases: current.totalPurchases,
        previousPurchases: prev.totalPurchases,
        message: `⚠️ VIP "${current.arname}" ยอดซื้อลดลง ${Math.abs(percentChange).toFixed(1)}%`,
        priority: 'high',
        recommendation: 'ติดต่อสอบถามและเสนอข้อเสนอพิเศษด่วน!'
      });
    }
    // Regular decreasing
    else if (percentChange < -40) {
      alerts.push({
        arcode: current.arcode,
        arname: current.arname,
        alertType: 'decreasing',
        percentChange,
        currentPurchases: current.totalPurchases,
        previousPurchases: prev.totalPurchases,
        message: `📉 "${current.arname}" ยอดซื้อลดลงมาก`,
        priority: 'medium',
        recommendation: 'ตรวจสอบปัญหาและติดต่อลูกค้า'
      });
    }
  }
  
  // Check for inactive customers (were buying, now gone)
  for (const prev of previousCustomers) {
    if (!currentMap.has(prev.arcode) && prev.totalPurchases > 50000) {
      alerts.push({
        arcode: prev.arcode,
        arname: prev.arname,
        alertType: 'inactive',
        percentChange: -100,
        currentPurchases: 0,
        previousPurchases: prev.totalPurchases,
        message: `😢 ลูกค้า "${prev.arname}" หยุดซื้อแล้ว`,
        priority: 'high',
        recommendation: 'ติดต่อด่วน! หาสาเหตุและเสนอข้อเสนอ win-back'
      });
    }
  }
  
  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  alerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  return alerts.slice(0, 10);
}

// ========== SEASONAL ANALYSIS ==========

/**
 * วิเคราะห์รูปแบบตามช่วงเวลา
 */
export function analyzeSeasonalPatterns(salesData: SalesDataPoint[]): SeasonalPattern {
  const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const dayOfWeek: { [key: string]: number[] } = {};
  const weekOfMonth: { [key: string]: number[] } = {};
  
  // Initialize
  dayNames.forEach(day => dayOfWeek[day] = []);
  [1, 2, 3, 4, 5].forEach(week => weekOfMonth[`สัปดาห์ ${week}`] = []);
  
  // Group data
  for (const data of salesData) {
    const date = new Date(data.date);
    const dayName = dayNames[date.getDay()];
    const weekNum = Math.ceil(date.getDate() / 7);
    
    dayOfWeek[dayName].push(data.amount);
    if (weekNum <= 5) {
      weekOfMonth[`สัปดาห์ ${weekNum}`].push(data.amount);
    }
  }
  
  // Calculate averages
  const dayAvg: { [key: string]: number } = {};
  const weekAvg: { [key: string]: number } = {};
  
  for (const [day, amounts] of Object.entries(dayOfWeek)) {
    dayAvg[day] = amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;
  }
  
  for (const [week, amounts] of Object.entries(weekOfMonth)) {
    weekAvg[week] = amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;
  }
  
  // Find best/worst days
  const dayEntries = Object.entries(dayAvg).filter(([_, v]) => v > 0);
  const bestDay = dayEntries.length > 0 
    ? dayEntries.reduce((a, b) => a[1] > b[1] ? a : b)[0]
    : 'ไม่มีข้อมูล';
  const worstDay = dayEntries.length > 0
    ? dayEntries.reduce((a, b) => a[1] < b[1] ? a : b)[0]
    : 'ไม่มีข้อมูล';
  
  // Generate pattern description
  let pattern = '';
  if (dayAvg['เสาร์'] > dayAvg['จันทร์'] * 1.2) {
    pattern = 'ยอดขายดีในวันหยุดสุดสัปดาห์';
  } else if (dayAvg['จันทร์'] > dayAvg['เสาร์'] * 1.2) {
    pattern = 'ยอดขายดีในวันทำงาน';
  } else {
    pattern = 'ยอดขายกระจายสม่ำเสมอตลอดสัปดาห์';
  }
  
  return {
    dayOfWeek: dayAvg,
    weekOfMonth: weekAvg,
    bestDay,
    worstDay,
    pattern
  };
}

// ========== GENERATE AI INSIGHTS ==========

/**
 * สร้าง AI Insights ทั้งหมด
 */
export function generateAIInsights(
  salesData: SalesDataPoint[],
  productAlerts: ProductAlert[],
  customerAlerts: CustomerAlert[],
  seasonalPattern: SeasonalPattern,
  trend: TrendResult
): AIInsight[] {
  const insights: AIInsight[] = [];
  
  // 1. Trend Insight
  const trendEmoji = trend.direction === 'up' ? '📈' : trend.direction === 'down' ? '📉' : '➡️';
  const trendText = trend.direction === 'up' ? 'เพิ่มขึ้น' : trend.direction === 'down' ? 'ลดลง' : 'คงที่';
  
  insights.push({
    id: 'trend-1',
    category: 'trend',
    title: `${trendEmoji} แนวโน้มยอดขาย${trendText}`,
    description: `ยอดขายโดยรวม${trendText} ${Math.abs(trend.percentChange).toFixed(1)}% เมื่อเทียบช่วงก่อนหน้า` +
      (trend.confidence === 'high' ? ' (ความมั่นใจสูง)' : ''),
    impact: trend.direction === 'up' ? 'positive' : trend.direction === 'down' ? 'negative' : 'neutral',
    priority: Math.abs(trend.percentChange) > 20 ? 'high' : 'medium',
    actionItems: trend.direction === 'down' 
      ? ['ตรวจสอบสาเหตุยอดขายลดลง', 'วิเคราะห์คู่แข่ง', 'พิจารณาโปรโมชั่น']
      : trend.direction === 'up'
      ? ['รักษาโมเมนตัม', 'เพิ่ม stock สินค้าขายดี', 'ขยายตลาด']
      : ['หาโอกาสเพิ่มยอดขาย', 'ออกโปรโมชั่นกระตุ้น'],
    data: trend
  });
  
  // 2. Product Insights
  const risingStars = productAlerts.filter(p => p.alertType === 'rising_star');
  const declining = productAlerts.filter(p => p.alertType === 'declining');
  
  if (risingStars.length > 0) {
    insights.push({
      id: 'product-rising',
      category: 'product',
      title: `🚀 มีสินค้า ${risingStars.length} ตัวขายดีขึ้นมาก`,
      description: `สินค้าที่โดดเด่น: ${risingStars.slice(0, 3).map(p => p.productName).join(', ')}`,
      impact: 'positive',
      priority: 'high',
      actionItems: ['เพิ่ม stock สินค้าเหล่านี้', 'วิเคราะห์สาเหตุความสำเร็จ', 'ทำโปรโมทเพิ่ม'],
      data: risingStars
    });
  }
  
  if (declining.length > 0) {
    insights.push({
      id: 'product-declining',
      category: 'product',
      title: `⚠️ มีสินค้า ${declining.length} ตัวยอดขายลดลง`,
      description: `สินค้าที่ต้องดูแล: ${declining.slice(0, 3).map(p => p.productName).join(', ')}`,
      impact: 'negative',
      priority: 'high',
      actionItems: ['ตรวจสอบ stock', 'เปรียบเทียบราคาคู่แข่ง', 'พิจารณาโปรโมชั่น'],
      data: declining
    });
  }
  
  // 3. Customer Insights
  const vipRisk = customerAlerts.filter(c => c.alertType === 'vip_risk' || c.alertType === 'inactive');
  const newCustomers = customerAlerts.filter(c => c.alertType === 'new');
  
  if (vipRisk.length > 0) {
    insights.push({
      id: 'customer-risk',
      category: 'customer',
      title: `🚨 ลูกค้าสำคัญ ${vipRisk.length} รายมีความเสี่ยง`,
      description: `ต้องติดต่อด่วน: ${vipRisk.slice(0, 3).map(c => c.arname).join(', ')}`,
      impact: 'negative',
      priority: 'high',
      actionItems: ['ติดต่อลูกค้าทันที', 'เสนอส่วนลดพิเศษ', 'หาสาเหตุ'],
      data: vipRisk
    });
  }
  
  if (newCustomers.length > 0) {
    insights.push({
      id: 'customer-new',
      category: 'customer',
      title: `🎉 ลูกค้าใหม่ ${newCustomers.length} ราย`,
      description: `ลูกค้าใหม่ที่น่าสนใจ: ${newCustomers.slice(0, 3).map(c => c.arname).join(', ')}`,
      impact: 'positive',
      priority: 'medium',
      actionItems: ['ส่งอีเมลต้อนรับ', 'เสนอส่วนลดครั้งต่อไป', 'ติดตามความพึงพอใจ'],
      data: newCustomers
    });
  }
  
  // 4. Seasonal Insight
  insights.push({
    id: 'seasonal-1',
    category: 'seasonal',
    title: `📅 ${seasonalPattern.pattern}`,
    description: `วันที่ขายดีที่สุด: ${seasonalPattern.bestDay} | วันที่ขายน้อยที่สุด: ${seasonalPattern.worstDay}`,
    impact: 'neutral',
    priority: 'low',
    actionItems: [
      `เพิ่มโปรโมชั่นวัน${seasonalPattern.worstDay}`,
      `เตรียม stock เพิ่มวัน${seasonalPattern.bestDay}`,
      'วางแผนโฆษณาตามรูปแบบ'
    ],
    data: seasonalPattern
  });
  
  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  return insights;
}

// ========== SUMMARY GENERATOR ==========

/**
 * สร้างสรุปภาพรวมอัตโนมัติ
 */
export function generateExecutiveSummary(
  totalSales: number,
  orderCount: number,
  trend: TrendResult,
  productAlerts: ProductAlert[],
  customerAlerts: CustomerAlert[]
): string {
  const parts: string[] = [];
  
  // Sales overview
  const avgOrder = orderCount > 0 ? totalSales / orderCount : 0;
  parts.push(`📊 ยอดขายรวม ${formatThaiCurrency(totalSales)} จาก ${orderCount.toLocaleString()} ออเดอร์`);
  parts.push(`💰 เฉลี่ย ${formatThaiCurrency(avgOrder)}/ออเดอร์`);
  
  // Trend
  if (trend.direction === 'up') {
    parts.push(`📈 แนวโน้มขาขึ้น +${trend.percentChange.toFixed(1)}%`);
  } else if (trend.direction === 'down') {
    parts.push(`📉 แนวโน้มขาลง ${trend.percentChange.toFixed(1)}%`);
  }
  
  // Alerts summary
  const highPriorityProducts = productAlerts.filter(p => p.priority === 'high');
  const highPriorityCustomers = customerAlerts.filter(c => c.priority === 'high');
  
  if (highPriorityProducts.length > 0) {
    parts.push(`⚠️ สินค้าต้องดูแล ${highPriorityProducts.length} รายการ`);
  }
  
  if (highPriorityCustomers.length > 0) {
    parts.push(`🚨 ลูกค้าต้องติดต่อด่วน ${highPriorityCustomers.length} ราย`);
  }
  
  return parts.join(' | ');
}

function formatThaiCurrency(value: number): string {
  if (value >= 1000000) {
    return `฿${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `฿${(value / 1000).toFixed(0)}K`;
  }
  return `฿${value.toFixed(0)}`;
}




