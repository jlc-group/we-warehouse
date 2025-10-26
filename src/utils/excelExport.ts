import * as XLSX from 'xlsx';
import type { ForecastPredictionItem } from '@/hooks/useProductForecastPrediction';

/**
 * Export Product Forecast Prediction to Excel
 * สร้าง 2 sheets: Summary และ Monthly Breakdown
 */
export function exportForecastToExcel(
  data: ForecastPredictionItem[],
  targetMonth: string
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
  const summaryData = data.map((item, index) => ({
    'No.': index + 1,
    'Base Code': item.baseCode,
    'Product Name': item.baseName,
    'Average Qty': Math.round(item.averageQty * 100) / 100,
    'Forecast Qty': Math.round(item.forecastQty * 100) / 100,
    'No. of Variants': item.details.length
  }));

  const ws1 = XLSX.utils.json_to_sheet(summaryData);

  // ตั้งค่าความกว้างคอลัมน์
  ws1['!cols'] = [
    { wch: 5 },   // No.
    { wch: 15 },  // Base Code
    { wch: 40 },  // Product Name
    { wch: 15 },  // Average Qty
    { wch: 15 },  // Forecast Qty
    { wch: 15 }   // No. of Variants
  ];

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

  const forecastSummary = [
    { 'Metric': 'Target Month', 'Value': targetMonth },
    { 'Metric': 'Total Base Codes', 'Value': data.length },
    { 'Metric': 'Total Forecast Qty', 'Value': Math.round(totalForecastQty * 100) / 100 },
    { 'Metric': 'Average Per Day (30 days)', 'Value': Math.round(avgPerDay * 100) / 100 },
    { 'Metric': 'Generated Date', 'Value': new Date().toLocaleString('th-TH') }
  ];

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
