import * as XLSX from 'xlsx';
import type { ForecastPredictionItem } from '@/hooks/useProductForecastPrediction';

/**
 * Export Product Forecast Prediction to Excel
 * สร้าง 3 sheets: Summary, Monthly Breakdown, Forecast Info
 */
export function exportForecastToExcel(
  data: ForecastPredictionItem[],
  targetMonth: string,
  adjustments?: Map<string, number>
) {
  // แปลงชื่อเดือนสำหรับชื่อไฟล์
  const [year, month] = targetMonth.split('-');
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = monthNames[parseInt(month) - 1];
  const fileName = `Forecast_${monthName}_${year}.xlsx`;

  // สร้าง workbook
  const wb = XLSX.utils.book_new();

  // ========== Sheet 1: Summary ==========
  const summaryData = data.map((item, index) => {
    const adjustment = adjustments?.get(item.baseCode) || 0;
    const adjustedQty = item.forecastQty * (1 + adjustment / 100);

    const row: any = {
      'No.': index + 1,
      'Base Code': item.baseCode,
      'Product Name': item.baseName,
      'Average Qty': Math.round(item.averageQty * 100) / 100,
      'Forecast Qty': Math.round(item.forecastQty * 100) / 100,
      'No. of Variants': item.details.length
    };

    // Add adjustment columns if adjustments exist
    if (adjustments && adjustments.size > 0) {
      row['Adjustment %'] = adjustment !== 0 ? `${adjustment > 0 ? '+' : ''}${adjustment}%` : '-';
      row['Adjusted Qty'] = adjustment !== 0 ? Math.round(adjustedQty * 100) / 100 : '-';
    }

    return row;
  });

  const ws1 = XLSX.utils.json_to_sheet(summaryData);

  // ตั้งค่าความกว้างคอลัมน์
  const cols: any[] = [
    { wch: 5 },   // No.
    { wch: 15 },  // Base Code
    { wch: 40 },  // Product Name
    { wch: 15 },  // Average Qty
    { wch: 15 },  // Forecast Qty
    { wch: 15 }   // No. of Variants
  ];

  // Add adjustment columns if adjustments exist
  if (adjustments && adjustments.size > 0) {
    cols.push({ wch: 15 }); // Adjustment %
    cols.push({ wch: 15 }); // Adjusted Qty
  }

  ws1['!cols'] = cols;

  XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

  // ========== Sheet 2: Monthly Breakdown ==========
  const monthlyData: any[] = [];

  data.forEach((item) => {
    // เพิ่มข้อมูลรายเดือนของ Base Code
    item.historicalData.forEach((hist) => {
      monthlyData.push({
        'Base Code': item.baseCode,
        'Product Name': item.baseName,
        'Month': hist.monthName,
        'Total Qty': Math.round(hist.qty * 100) / 100,
        'Type': 'Total'
      });
    });

    // เพิ่มรายละเอียดแต่ละ original code (ถ้ามีหลายตัว)
    if (item.details.length > 1) {
      item.details.forEach((detail) => {
        detail.monthlyData.forEach((month) => {
          monthlyData.push({
            'Base Code': item.baseCode,
            'Product Name': detail.originalName,
            'Original Code': detail.originalCode,
            'Month': month.monthName,
            'Raw Qty': Math.round(month.qty * 100) / 100,
            'Multiplier': detail.multiplier,
            'Actual Qty': Math.round(month.actualQty * 100) / 100,
            'Type': 'Detail'
          });
        });
      });
    }
  });

  const ws2 = XLSX.utils.json_to_sheet(monthlyData);

  // ตั้งค่าความกว้างคอลัมน์
  ws2['!cols'] = [
    { wch: 15 },  // Base Code
    { wch: 40 },  // Product Name
    { wch: 15 },  // Original Code
    { wch: 15 },  // Month
    { wch: 12 },  // Raw Qty / Total Qty
    { wch: 10 },  // Multiplier
    { wch: 12 },  // Actual Qty
    { wch: 10 }   // Type
  ];

  XLSX.utils.book_append_sheet(wb, ws2, 'Monthly Breakdown');

  // ========== Sheet 3: Forecast Summary ==========
  const totalForecastQty = data.reduce((sum, item) => sum + item.forecastQty, 0);
  const avgPerDay = totalForecastQty / 30;

  const forecastSummary: any[] = [
    { 'Metric': 'Target Month', 'Value': targetMonth },
    { 'Metric': 'Total Base Codes', 'Value': data.length },
    { 'Metric': 'Total Forecast Qty', 'Value': Math.round(totalForecastQty * 100) / 100 },
    { 'Metric': 'Average Per Day (30 days)', 'Value': Math.round(avgPerDay * 100) / 100 }
  ];

  // Add adjustment info if adjustments exist
  if (adjustments && adjustments.size > 0) {
    const totalAdjustedQty = data.reduce((sum, item) => {
      const adjustment = adjustments.get(item.baseCode) || 0;
      return sum + (item.forecastQty * (1 + adjustment / 100));
    }, 0);
    const avgAdjustedPerDay = totalAdjustedQty / 30;

    forecastSummary.push(
      { 'Metric': '', 'Value': '' },
      { 'Metric': '--- Adjustments ---', 'Value': '' },
      { 'Metric': 'Items Adjusted', 'Value': adjustments.size },
      { 'Metric': 'Total Adjusted Qty', 'Value': Math.round(totalAdjustedQty * 100) / 100 },
      { 'Metric': 'Adjusted Avg Per Day', 'Value': Math.round(avgAdjustedPerDay * 100) / 100 },
      { 'Metric': 'Difference', 'Value': Math.round((totalAdjustedQty - totalForecastQty) * 100) / 100 }
    );
  }

  forecastSummary.push(
    { 'Metric': '', 'Value': '' },
    { 'Metric': 'Generated Date', 'Value': new Date().toLocaleString('th-TH') }
  );

  const ws3 = XLSX.utils.json_to_sheet(forecastSummary);
  ws3['!cols'] = [
    { wch: 30 },  // Metric
    { wch: 30 }   // Value
  ];

  XLSX.utils.book_append_sheet(wb, ws3, 'Forecast Info');

  // ========== Download ==========
  try {
    XLSX.writeFile(wb, fileName);
    console.log(`[Excel Export] Successfully exported: ${fileName}`);
  } catch (error) {
    console.error('[Excel Export] Error:', error);
    alert('ไม่สามารถ Export Excel ได้ กรุณาลองอีกครั้ง');
  }
}
