import { Request, Response } from 'express';
import { getConnection, sql } from '../config/database.js';

export class AnalyticsController {
  /**
   * GET /api/analytics/table-structure
   * Debug: Get table columns and sample data
   */
  static async getTableStructure(req: Request, res: Response): Promise<void> {
    try {
      const { table } = req.query;

      if (!table) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameter: table (CSSALE or CSSALESUB)'
        });
        return;
      }

      const pool = await getConnection();

      // Get columns
      const columnsResult = await pool.request()
        .input('tableName', sql.VarChar, table as string)
        .query(`
          SELECT
            COLUMN_NAME,
            DATA_TYPE,
            CHARACTER_MAXIMUM_LENGTH,
            IS_NULLABLE
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = @tableName
          ORDER BY ORDINAL_POSITION
        `);

      // Get sample data
      const sampleResult = await pool.request()
        .query(`SELECT TOP 2 * FROM ${table as string}`);

      res.json({
        success: true,
        table: table,
        columns: columnsResult.recordset,
        sampleData: sampleResult.recordset
      });

    } catch (error) {
      console.error('Error in getTableStructure:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/analytics/products
   * Get list of products that have sales data
   * NOTE: Excludes X6, X12 variants to prevent double-counting
   */
  static async getProductList(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, limit } = req.query;

      const pool = await getConnection();

      let query = `
        SELECT
          d.PRODUCTCODE as productCode,
          MAX(d.PRODUCTNAME) as productName,
          SUM(CAST(d.NETAMOUNT as DECIMAL(18,2))) as totalSales,
          SUM(CAST(d.QUANTITY as DECIMAL(18,2))) as totalQuantity
        FROM CSSALESUB d
        INNER JOIN CSSALE h ON d.DOCNO = h.DOCNO
        WHERE d.PRODUCTCODE NOT LIKE '%X6'
          AND d.PRODUCTCODE NOT LIKE '%X12'
          AND d.PRODUCTCODE NOT LIKE '%X120'
          AND h.CANCELDATE IS NULL
      `;

      const request = pool.request();

      if (startDate && endDate) {
        query += `
          AND h.DOCDATE >= @startDate AND h.DOCDATE <= @endDate
        `;
        request.input('startDate', sql.Date, startDate as string);
        request.input('endDate', sql.Date, endDate as string);
      }

      query += `
        GROUP BY d.PRODUCTCODE
        HAVING SUM(CAST(d.NETAMOUNT as DECIMAL(18,2))) > 0
      `;

      // Add LIMIT if provided - use TOP directly in main query
      if (limit) {
        query = `
          SELECT TOP ${parseInt(limit as string)}
            productCode,
            productName,
            totalSales,
            totalQuantity
          FROM (${query}) AS SubQuery
          ORDER BY totalSales DESC
        `;
      } else {
        query += `
          ORDER BY SUM(CAST(d.NETAMOUNT as DECIMAL(18,2))) DESC
        `;
      }

      const result = await request.query(query);

      res.json({
        success: true,
        data: result.recordset
      });
    } catch (error) {
      console.error('Error in getProductList:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/analytics/customers
   * Get list of customers that have purchase data
   */
  static async getCustomerList(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const pool = await getConnection();

      let query = `
        SELECT DISTINCT
          h.ARCODE as arcode,
          h.ARNAME as arname,
          SUM(CAST(h.TOTALAMOUNT as DECIMAL(18,2))) as totalPurchases,
          COUNT(DISTINCT h.DOCNO) as orderCount
        FROM CSSALE h
        WHERE h.CANCELDATE IS NULL
      `;

      const request = pool.request();

      if (startDate && endDate) {
        query += `
          AND h.DOCDATE >= @startDate AND h.DOCDATE <= @endDate
        `;
        request.input('startDate', sql.Date, startDate as string);
        request.input('endDate', sql.Date, endDate as string);
      }

      query += `
        GROUP BY h.ARCODE, h.ARNAME
        HAVING SUM(CAST(h.TOTALAMOUNT as DECIMAL(18,2))) > 0
        ORDER BY SUM(CAST(h.TOTALAMOUNT as DECIMAL(18,2))) DESC
      `;

      const result = await request.query(query);

      res.json({
        success: true,
        data: result.recordset
      });
    } catch (error) {
      console.error('Error in getCustomerList:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  /**
   * GET /api/analytics/product-comparison
   * Aggregate sales data by product with date range comparison
   */
  static async getProductComparison(req: Request, res: Response): Promise<void> {
    try {
      const { productCode, currentStart, currentEnd, previousStart, previousEnd } = req.query;

      if (!productCode || !currentStart || !currentEnd || !previousStart || !previousEnd) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters: productCode, currentStart, currentEnd, previousStart, previousEnd'
        });
        return;
      }

      const pool = await getConnection();

      // Query for current period
      const currentQuery = `
        SELECT
          CONVERT(DATE, h.DOCDATE) as date,
          SUM(CAST(d.NETAMOUNT as DECIMAL(18,2))) as totalSales,
          SUM(CAST(d.QUANTITY as DECIMAL(18,2))) as totalQuantity,
          COUNT(DISTINCT h.DOCNO) as orderCount,
          h.ARCODE as arcode,
          h.ARNAME as arname
        FROM CSSALE h
        INNER JOIN CSSALESUB d ON h.DOCNO = d.DOCNO
        WHERE d.PRODUCTCODE = @productCode
          AND h.DOCDATE >= @startDate
          AND h.DOCDATE <= @endDate
          AND h.CANCELDATE IS NULL
        GROUP BY CONVERT(DATE, h.DOCDATE), h.ARCODE, h.ARNAME
        ORDER BY CONVERT(DATE, h.DOCDATE)
      `;

      const currentResult = await pool.request()
        .input('productCode', sql.VarChar, productCode)
        .input('startDate', sql.Date, currentStart)
        .input('endDate', sql.Date, currentEnd)
        .query(currentQuery);

      // Query for previous period
      const previousResult = await pool.request()
        .input('productCode', sql.VarChar, productCode)
        .input('startDate', sql.Date, previousStart)
        .input('endDate', sql.Date, previousEnd)
        .query(currentQuery);

      // Query for top customers in current period
      const topCustomersQuery = `
        SELECT TOP 5
          h.ARCODE as arcode,
          h.ARNAME as arname,
          SUM(CAST(d.NETAMOUNT as DECIMAL(18,2))) as totalAmount,
          SUM(CAST(d.QUANTITY as DECIMAL(18,2))) as quantity
        FROM CSSALE h
        INNER JOIN CSSALESUB d ON h.DOCNO = d.DOCNO
        WHERE d.PRODUCTCODE = @productCode
          AND h.DOCDATE >= @startDate
          AND h.DOCDATE <= @endDate
          AND h.CANCELDATE IS NULL
        GROUP BY h.ARCODE, h.ARNAME
        ORDER BY SUM(CAST(d.NETAMOUNT as DECIMAL(18,2))) DESC
      `;

      const topCustomersResult = await pool.request()
        .input('productCode', sql.VarChar, productCode)
        .input('startDate', sql.Date, currentStart)
        .input('endDate', sql.Date, currentEnd)
        .query(topCustomersQuery);

      // Calculate aggregates
      const calculateMetrics = (data: any[]) => {
        const totalSales = data.reduce((sum, row) => sum + parseFloat(row.totalSales || 0), 0);
        const totalQuantity = data.reduce((sum, row) => sum + parseFloat(row.totalQuantity || 0), 0);
        const orderCount = new Set(data.map(row => `${row.date}-${row.arcode}`)).size;
        const avgOrderValue = orderCount > 0 ? totalSales / orderCount : 0;

        // Group by date for daily data
        const dailyMap = new Map();
        data.forEach(row => {
          const date = row.date.toISOString().split('T')[0];
          if (dailyMap.has(date)) {
            const existing = dailyMap.get(date);
            existing.amount += parseFloat(row.totalSales || 0);
            existing.quantity += parseFloat(row.totalQuantity || 0);
          } else {
            dailyMap.set(date, {
              date,
              amount: parseFloat(row.totalSales || 0),
              quantity: parseFloat(row.totalQuantity || 0)
            });
          }
        });

        const dailyData = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

        // Find peak date
        const peak = dailyData.length > 0
          ? dailyData.reduce((max, current) => current.amount > max.amount ? current : max)
          : { date: '', amount: 0, quantity: 0 };

        return {
          totalSales,
          totalQuantity,
          orderCount,
          avgOrderValue,
          dailyData,
          peakSalesDate: peak.date,
          peakSalesAmount: peak.amount
        };
      };

      const current = calculateMetrics(currentResult.recordset);
      const previous = calculateMetrics(previousResult.recordset);

      // Calculate growth rates
      const calculateGrowth = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      const response = {
        success: true,
        data: {
          current,
          previous,
          growth: {
            salesGrowth: calculateGrowth(current.totalSales, previous.totalSales),
            quantityGrowth: calculateGrowth(current.totalQuantity, previous.totalQuantity),
            orderGrowth: calculateGrowth(current.orderCount, previous.orderCount),
            avgValueGrowth: calculateGrowth(current.avgOrderValue, previous.avgOrderValue)
          },
          topCustomers: topCustomersResult.recordset.map(row => ({
            arcode: row.arcode,
            arname: row.arname,
            totalAmount: parseFloat(row.totalAmount || 0),
            quantity: parseFloat(row.quantity || 0)
          })),
          dailyComparison: current.dailyData.map(currentDay => {
            const prevDay = previous.dailyData.find(p => p.date === currentDay.date);
            return {
              date: currentDay.date,
              current: currentDay.amount,
              previous: prevDay?.amount || 0
            };
          })
        }
      };

      res.json(response);
    } catch (error: any) {
      console.error('Error in getProductComparison:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch product comparison data'
      });
    }
  }

  /**
   * GET /api/analytics/customer-comparison
   * Aggregate sales data by customer with date range comparison
   */
  static async getCustomerComparison(req: Request, res: Response): Promise<void> {
    try {
      const { arcode, currentStart, currentEnd, previousStart, previousEnd } = req.query;

      if (!arcode || !currentStart || !currentEnd || !previousStart || !previousEnd) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters: arcode, currentStart, currentEnd, previousStart, previousEnd'
        });
        return;
      }

      const pool = await getConnection();

      // Query for current period
      const currentQuery = `
        SELECT
          CONVERT(DATE, h.DOCDATE) as date,
          h.DOCNO as docno,
          CAST(h.TOTALAMOUNT as DECIMAL(18,2)) as totalAmount,
          SUM(CAST(d.QUANTITY as DECIMAL(18,2))) as totalQuantity
        FROM CSSALE h
        LEFT JOIN CSSALESUB d ON h.DOCNO = d.DOCNO
        WHERE h.ARCODE = @arcode
          AND h.DOCDATE >= @startDate
          AND h.DOCDATE <= @endDate
          AND h.CANCELDATE IS NULL
        GROUP BY CONVERT(DATE, h.DOCDATE), h.DOCNO, h.TOTALAMOUNT
        ORDER BY CONVERT(DATE, h.DOCDATE)
      `;

      const currentResult = await pool.request()
        .input('arcode', sql.VarChar, arcode)
        .input('startDate', sql.Date, currentStart)
        .input('endDate', sql.Date, currentEnd)
        .query(currentQuery);

      // Query for previous period
      const previousResult = await pool.request()
        .input('arcode', sql.VarChar, arcode)
        .input('startDate', sql.Date, previousStart)
        .input('endDate', sql.Date, previousEnd)
        .query(currentQuery);

      // Query for top products in current period
      // NOTE: Excludes X6, X12, X120 variants to prevent double-counting
      const topProductsQuery = `
        SELECT TOP 5
          d.PRODUCTCODE as productcode,
          d.PRODUCTNAME as productname,
          SUM(CAST(d.NETAMOUNT as DECIMAL(18,2))) as totalAmount,
          SUM(CAST(d.QUANTITY as DECIMAL(18,2))) as quantity
        FROM CSSALE h
        INNER JOIN CSSALESUB d ON h.DOCNO = d.DOCNO
        WHERE h.ARCODE = @arcode
          AND h.DOCDATE >= @startDate
          AND h.DOCDATE <= @endDate
          AND d.PRODUCTCODE NOT LIKE '%X6'
          AND d.PRODUCTCODE NOT LIKE '%X12'
          AND d.PRODUCTCODE NOT LIKE '%X120'
          AND h.CANCELDATE IS NULL
        GROUP BY d.PRODUCTCODE, d.PRODUCTNAME
        ORDER BY SUM(CAST(d.NETAMOUNT as DECIMAL(18,2))) DESC
      `;

      const topProductsResult = await pool.request()
        .input('arcode', sql.VarChar, arcode)
        .input('startDate', sql.Date, currentStart)
        .input('endDate', sql.Date, currentEnd)
        .query(topProductsQuery);

      // Calculate aggregates
      const calculateMetrics = (data: any[]) => {
        const totalPurchases = data.reduce((sum, row) => sum + parseFloat(row.totalAmount || 0), 0);
        const totalQuantity = data.reduce((sum, row) => sum + parseFloat(row.totalQuantity || 0), 0);
        const orderCount = data.length;
        const avgOrderValue = orderCount > 0 ? totalPurchases / orderCount : 0;

        // Group by date for daily data
        const dailyMap = new Map();
        data.forEach(row => {
          const date = row.date.toISOString().split('T')[0];
          if (dailyMap.has(date)) {
            const existing = dailyMap.get(date);
            existing.amount += parseFloat(row.totalAmount || 0);
            existing.quantity += parseFloat(row.totalQuantity || 0);
          } else {
            dailyMap.set(date, {
              date,
              amount: parseFloat(row.totalAmount || 0),
              quantity: parseFloat(row.totalQuantity || 0)
            });
          }
        });

        const dailyData = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

        // Find peak date
        const peak = dailyData.length > 0
          ? dailyData.reduce((max, current) => current.amount > max.amount ? current : max)
          : { date: '', amount: 0, quantity: 0 };

        return {
          totalPurchases,
          totalQuantity,
          orderCount,
          avgOrderValue,
          dailyData,
          peakPurchaseDate: peak.date,
          peakPurchaseAmount: peak.amount
        };
      };

      const current = calculateMetrics(currentResult.recordset);
      const previous = calculateMetrics(previousResult.recordset);

      // Calculate growth rates
      const calculateGrowth = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      const response = {
        success: true,
        data: {
          current,
          previous,
          growth: {
            purchasesGrowth: calculateGrowth(current.totalPurchases, previous.totalPurchases),
            quantityGrowth: calculateGrowth(current.totalQuantity, previous.totalQuantity),
            orderGrowth: calculateGrowth(current.orderCount, previous.orderCount),
            avgValueGrowth: calculateGrowth(current.avgOrderValue, previous.avgOrderValue)
          },
          topProducts: topProductsResult.recordset.map(row => ({
            productcode: row.productcode,
            productname: row.productname,
            totalAmount: parseFloat(row.totalAmount || 0),
            quantity: parseFloat(row.quantity || 0)
          })),
          dailyComparison: current.dailyData.map(currentDay => {
            const prevDay = previous.dailyData.find(p => p.date === currentDay.date);
            return {
              date: currentDay.date,
              current: currentDay.amount,
              previous: prevDay?.amount || 0
            };
          })
        }
      };

      res.json(response);
    } catch (error: any) {
      console.error('Error in getCustomerComparison:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch customer comparison data'
      });
    }
  }

  /**
   * GET /api/analytics/sales-summary
   * Get sales summary with SA, CN breakdown
   */
  static async getSalesSummary(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const pool = await getConnection();
      const request = pool.request();

      // Query for SA (Sales) และ CS/CN (Credit Note) แยกกัน
      // ใช้ DOCNO prefix แทน DOCTYPE field เพราะ DOCTYPE อาจไม่มีในตาราง
      // NOTE: Excludes cancelled documents (CANCELDATE IS NULL)
      let query = `
        SELECT
          LEFT(DOCNO, CHARINDEX('-', DOCNO) - 1) as docTypePrefix,
          SUM(CAST(TOTALAMOUNT as DECIMAL(18,2))) as totalAmount,
          COUNT(DISTINCT DOCNO) as docCount
        FROM CSSALE
        WHERE DOCNO LIKE '%-%'
          AND CANCELDATE IS NULL
      `;

      if (startDate && endDate) {
        query += `
          AND DOCDATE >= @startDate AND DOCDATE <= @endDate
        `;
        request.input('startDate', sql.Date, startDate as string);
        request.input('endDate', sql.Date, endDate as string);
      }

      query += `
        GROUP BY LEFT(DOCNO, CHARINDEX('-', DOCNO) - 1)
        ORDER BY LEFT(DOCNO, CHARINDEX('-', DOCNO) - 1)
      `;

      const result = await request.query(query);

      // แยกข้อมูลตาม DOCTYPE prefix
      let salesAmount = 0;
      let salesCount = 0;
      let creditNoteAmount = 0;
      let creditNoteCount = 0;

      result.recordset.forEach((row: any) => {
        const docType = row.docTypePrefix ? String(row.docTypePrefix).trim() : '';
        const amount = parseFloat(row.totalAmount || 0);
        const count = parseInt(row.docCount || 0);

        if (docType === 'SA') {
          salesAmount = amount;
          salesCount = count;
        } else if (docType === 'CS' || docType === 'CN') {
          // CS = Credit Sales (Credit Note)
          creditNoteAmount += amount;
          creditNoteCount += count;
        }
      });

      // คำนวณยอดสุทธิ (SA - CN)
      const netSales = salesAmount - creditNoteAmount;
      const netCount = salesCount + creditNoteCount;

      res.json({
        success: true,
        data: {
          sales: {
            amount: salesAmount,
            count: salesCount,
            docType: 'SA'
          },
          creditNote: {
            amount: creditNoteAmount,
            count: creditNoteCount,
            docType: 'CS/CN'
          },
          net: {
            amount: netSales,
            count: netCount,
            percentage: salesAmount > 0 ? (creditNoteAmount / salesAmount * 100) : 0
          }
        }
      });
    } catch (error) {
      console.error('Error in getSalesSummary:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/analytics/product-forecast
   * Get product forecast with Base Code grouping (X6, X12 multipliers)
   */
  static async getProductForecast(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const pool = await getConnection();
      const request = pool.request();

      // Query ยอดขายจาก CSSALESUB
      let query = `
        SELECT
          d.PRODUCTCODE as productCode,
          MAX(d.PRODUCTNAME) as productName,
          SUM(CAST(d.QUANTITY as DECIMAL(18,2))) as totalQuantity
        FROM CSSALESUB d
        INNER JOIN CSSALE h ON d.DOCNO = h.DOCNO
        WHERE h.CANCELDATE IS NULL
      `;

      if (startDate && endDate) {
        query += `
          AND h.DOCDATE >= @startDate AND h.DOCDATE <= @endDate
        `;
        request.input('startDate', sql.Date, startDate as string);
        request.input('endDate', sql.Date, endDate as string);
      }

      query += `
        GROUP BY d.PRODUCTCODE
        HAVING SUM(CAST(d.QUANTITY as DECIMAL(18,2))) > 0
        ORDER BY SUM(CAST(d.QUANTITY as DECIMAL(18,2))) DESC
      `;

      const result = await request.query(query);

      // ประมวลผลข้อมูล: แยก Base Code และคำนวณ Multiplier
      const baseCodeMap = new Map<string, {
        baseCode: string;
        baseName: string;
        totalQty: number;
        details: Array<{
          originalCode: string;
          originalName: string;
          rawQty: number;
          multiplier: number;
          actualQty: number;
        }>;
      }>();

      result.recordset.forEach((row: any) => {
        const originalCode = row.productCode ? String(row.productCode).trim() : '';
        const originalName = row.productName ? String(row.productName).trim() : '';
        const rawQty = parseFloat(row.totalQuantity || 0);

        // ตรวจสอบ Pattern: X ตามด้วยตัวเลข (X6, X12, X24, etc.)
        const multiplierMatch = originalCode.match(/X(\d+)$/i);

        let baseCode = originalCode;
        let multiplier = 1;
        let actualQty = rawQty;

        if (multiplierMatch) {
          // มี Multiplier (เช่น L3-8GX6)
          multiplier = parseInt(multiplierMatch[1]); // ดึงตัวเลข 6, 12, 24
          baseCode = originalCode.replace(/X\d+$/i, ''); // ตัด X6 ออก → L3-8G
          actualQty = rawQty * multiplier; // 50 × 6 = 300
        }

        // ถ้ายังไม่มี Base Code นี้ใน Map
        if (!baseCodeMap.has(baseCode)) {
          baseCodeMap.set(baseCode, {
            baseCode,
            baseName: originalName.replace(/X\d+$/i, ''), // ตัด X6 ออกจากชื่อด้วย
            totalQty: 0,
            details: []
          });
        }

        const group = baseCodeMap.get(baseCode)!;
        group.totalQty += actualQty;
        group.details.push({
          originalCode,
          originalName,
          rawQty,
          multiplier,
          actualQty
        });
      });

      // แปลง Map เป็น Array และเรียงตามยอดสูงสุด
      const forecast = Array.from(baseCodeMap.values())
        .sort((a, b) => b.totalQty - a.totalQty);

      res.json({
        success: true,
        data: forecast
      });
    } catch (error) {
      console.error('Error in getProductForecast:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Product Forecast Prediction - คาดการณ์ยอดขายจากค่าเฉลี่ย 3 เดือนย้อนหลัง
  static async getProductForecastPrediction(req: Request, res: Response): Promise<void> {
    try {
      const pool = await getConnection();

      // รับ parameters
      const targetMonthParam = req.query.targetMonth as string; // เช่น "2024-11"
      const lookbackMonths = parseInt(req.query.lookbackMonths as string) || 3;

      // คำนวณเดือนเป้าหมาย (default: เดือนหน้า)
      const now = new Date();
      let targetDate: Date;
      if (targetMonthParam) {
        const [year, month] = targetMonthParam.split('-').map(Number);
        targetDate = new Date(year, month - 1, 1);
      } else {
        targetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      }

      // คำนวณช่วงเวลา lookback (3 เดือนย้อนหลังจากเดือนปัจจุบัน)
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1); // วันแรกของเดือนหน้า
      const startDate = new Date(now.getFullYear(), now.getMonth() - (lookbackMonths - 1), 1); // ย้อนหลัง 3 เดือน

      console.log(`[Forecast] Target: ${targetDate.toISOString().slice(0, 7)}, Lookback: ${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)}`);

      // Query: ดึงยอดขายรายเดือนของแต่ละสินค้าใน 3 เดือนย้อนหลัง
      // กรองเฉพาะรหัสที่ไม่มี X ต่อท้าย (ไม่เอา X6, X12, X24, etc.)
      const query = `
        SELECT
          d.PRODUCTCODE as productCode,
          MAX(d.PRODUCTNAME) as productName,
          YEAR(h.DOCDATE) as year,
          MONTH(h.DOCDATE) as month,
          SUM(CAST(d.QUANTITY as DECIMAL(18,2))) as totalQuantity
        FROM CSSALESUB d
        INNER JOIN CSSALE h ON d.DOCNO = h.DOCNO
        WHERE
          h.DOCDATE >= @startDate
          AND h.DOCDATE < @endDate
          AND LEFT(h.DOCNO, 2) IN ('SA', 'CN')
          AND d.PRODUCTCODE NOT LIKE '%X[0-9]%'
          AND d.PRODUCTCODE NOT LIKE '%X[0-9][0-9]%'
          AND h.CANCELDATE IS NULL
        GROUP BY d.PRODUCTCODE, YEAR(h.DOCDATE), MONTH(h.DOCDATE)
        ORDER BY d.PRODUCTCODE, year, month
      `;

      const result = await pool.request()
        .input('startDate', sql.DateTime, startDate)
        .input('endDate', sql.DateTime, endDate)
        .query(query);

      console.log(`[Forecast] Query returned ${result.recordset.length} rows`);

      // โครงสร้างข้อมูล: Map<baseCode, data>
      interface MonthlyData {
        year: number;
        month: number;
        qty: number;
      }

      interface ProductData {
        originalCode: string;
        originalName: string;
        monthlyData: MonthlyData[];
        multiplier: number;
      }

      interface BaseCodeData {
        baseCode: string;
        baseName: string;
        products: Map<string, ProductData>;
        monthlyTotals: Map<string, number>; // "2024-08" => totalQty
      }

      const baseCodeMap = new Map<string, BaseCodeData>();

      // ประมวลผลข้อมูล
      result.recordset.forEach((row: any) => {
        const originalCode = row.productCode;
        const originalName = row.productName || originalCode;
        const year = row.year;
        const month = row.month;
        const qty = parseFloat(row.totalQuantity) || 0;

        // ตรวจสอบ multiplier pattern (X6, X12, X24, etc.)
        const multiplierMatch = originalCode.match(/X(\d+)$/i);
        let baseCode = originalCode;
        let multiplier = 1;

        if (multiplierMatch) {
          multiplier = parseInt(multiplierMatch[1]);
          baseCode = originalCode.replace(/X\d+$/i, '');
        }

        // สร้าง/ดึง BaseCodeData
        if (!baseCodeMap.has(baseCode)) {
          baseCodeMap.set(baseCode, {
            baseCode,
            baseName: originalName.replace(/X\d+$/i, ''),
            products: new Map(),
            monthlyTotals: new Map()
          });
        }

        const baseData = baseCodeMap.get(baseCode)!;

        // สร้าง/ดึง ProductData
        if (!baseData.products.has(originalCode)) {
          baseData.products.set(originalCode, {
            originalCode,
            originalName,
            monthlyData: [],
            multiplier
          });
        }

        const productData = baseData.products.get(originalCode)!;
        productData.monthlyData.push({ year, month, qty });

        // คำนวณยอดรวมรายเดือน (หลังคูณ multiplier)
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        const actualQty = qty * multiplier;
        const currentTotal = baseData.monthlyTotals.get(monthKey) || 0;
        baseData.monthlyTotals.set(monthKey, currentTotal + actualQty);
      });

      // สร้างผลลัพธ์
      const forecastData = Array.from(baseCodeMap.values()).map(baseData => {
        // คำนวณค่าเฉลี่ยจากยอดรวมรายเดือน
        const monthlyTotalsArray = Array.from(baseData.monthlyTotals.values());
        const averageQty = monthlyTotalsArray.length > 0
          ? monthlyTotalsArray.reduce((sum, qty) => sum + qty, 0) / monthlyTotalsArray.length
          : 0;

        // สร้าง historicalData สำหรับแสดงผล
        const historicalData = Array.from(baseData.monthlyTotals.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([monthKey, qty]) => {
            const [year, month] = monthKey.split('-');
            const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
                                'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
            return {
              month: monthKey,
              monthName: `${monthNames[parseInt(month) - 1]} ${parseInt(year) + 543}`,
              qty
            };
          });

        // สร้าง details (รายละเอียดแต่ละ original code)
        const details = Array.from(baseData.products.values()).map(product => ({
          originalCode: product.originalCode,
          originalName: product.originalName,
          multiplier: product.multiplier,
          monthlyData: product.monthlyData.map(m => {
            const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
                                'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
            return {
              month: `${m.year}-${String(m.month).padStart(2, '0')}`,
              monthName: `${monthNames[m.month - 1]} ${m.year + 543}`,
              qty: m.qty,
              actualQty: m.qty * product.multiplier
            };
          })
        }));

        return {
          baseCode: baseData.baseCode,
          baseName: baseData.baseName,
          historicalData,
          averageQty: Math.round(averageQty * 100) / 100,
          forecastQty: Math.round(averageQty * 100) / 100, // ตอนนี้ใช้ค่าเดียวกับ average
          details
        };
      });

      // เรียงตามยอดพยากรณ์ (สูง → ต่ำ)
      forecastData.sort((a, b) => b.forecastQty - a.forecastQty);

      console.log(`[Forecast] Processed ${forecastData.length} base codes`);

      res.json({
        success: true,
        data: forecastData,
        metadata: {
          targetMonth: targetDate.toISOString().slice(0, 7),
          lookbackMonths,
          startDate: startDate.toISOString().slice(0, 10),
          endDate: endDate.toISOString().slice(0, 10),
          totalBaseCodes: forecastData.length
        }
      });

    } catch (error) {
      console.error('Error in getProductForecastPrediction:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/analytics/check-cancelled-sales
   * ตรวจสอบยอดขายจากใบที่ Cancel แล้ว
   */
  static async checkCancelledSales(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, limit = '50' } = req.query;

      const pool = await getConnection();
      const request = pool.request();

      let query = `
        SELECT
          h.DOCNO,
          h.DOCDATE,
          h.ARCODE,
          h.ARNAME,
          h.TOTALAMOUNT,
          h.CANCELDATE,
          h.CANCELUSER,
          h.CLOSEFLAG,
          h.SYSDOCFLAG,
          h.DOCTYPE,
          COUNT(d.PRODUCTCODE) as itemCount,
          SUM(CAST(d.NETAMOUNT as DECIMAL(18,2))) as sumLineAmount
        FROM CSSALE h
        LEFT JOIN CSSALESUB d ON h.DOCNO = d.DOCNO
        WHERE h.CANCELDATE IS NOT NULL
          AND LEFT(h.DOCNO, 2) = 'SA'
      `;

      if (startDate && endDate) {
        query += `
          AND h.DOCDATE >= @startDate
          AND h.DOCDATE <= @endDate
        `;
        request.input('startDate', sql.Date, startDate as string);
        request.input('endDate', sql.Date, endDate as string);
      }

      query += `
        GROUP BY
          h.DOCNO,
          h.DOCDATE,
          h.ARCODE,
          h.ARNAME,
          h.TOTALAMOUNT,
          h.CANCELDATE,
          h.CANCELUSER,
          h.CLOSEFLAG,
          h.SYSDOCFLAG,
          h.DOCTYPE
        ORDER BY h.DOCDATE DESC, h.TOTALAMOUNT DESC
        OFFSET 0 ROWS FETCH NEXT ${parseInt(limit as string)} ROWS ONLY
      `;

      const result = await request.query(query);

      // คำนวณยอดรวม
      const totalCancelledAmount = result.recordset.reduce(
        (sum, row) => sum + parseFloat(row.TOTALAMOUNT || 0),
        0
      );

      res.json({
        success: true,
        data: result.recordset,
        summary: {
          totalRecords: result.recordset.length,
          totalCancelledAmount: totalCancelledAmount,
          message: result.recordset.length > 0
            ? `พบ ${result.recordset.length} ใบขายที่ถูก Cancel มูลค่า ${totalCancelledAmount.toFixed(2)} บาท`
            : 'ไม่พบใบขายที่ถูก Cancel'
        }
      });

    } catch (error) {
      console.error('Error in checkCancelledSales:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/analytics/check-duplicate-codes
   * ตรวจสอบว่ามีใบขายไหนที่มี Base code และ Variant code ในใบเดียวกัน
   * เช่น L3-8G และ L3-8GX6 ในใบเดียวกัน (อาจทำให้นับยอดขายซ้ำ)
   */
  static async checkDuplicateCodes(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, limit = '50' } = req.query;

      const pool = await getConnection();
      const request = pool.request();

      // Query: หาใบขายที่มีทั้ง base code และ variant code
      let query = `
        WITH ProductPairs AS (
          SELECT
            d1.DOCNO,
            d1.PRODUCTCODE as baseCode,
            d1.PRODUCTNAME as baseName,
            d1.QUANTITY as baseQty,
            d1.NETAMOUNT as baseAmount,
            d2.PRODUCTCODE as variantCode,
            d2.PRODUCTNAME as variantName,
            d2.QUANTITY as variantQty,
            d2.NETAMOUNT as variantAmount,
            h.DOCDATE,
            h.ARNAME as customerName,
            h.TOTALAMOUNT as docTotal
          FROM CSSALESUB d1
          INNER JOIN CSSALE h ON d1.DOCNO = h.DOCNO
          INNER JOIN CSSALESUB d2 ON d1.DOCNO = d2.DOCNO
          WHERE
            d2.PRODUCTCODE LIKE d1.PRODUCTCODE + 'X%'
            AND LEFT(h.DOCNO, 2) = 'SA'
      `;

      if (startDate && endDate) {
        query += `
            AND h.DOCDATE >= @startDate
            AND h.DOCDATE <= @endDate
        `;
        request.input('startDate', sql.Date, startDate as string);
        request.input('endDate', sql.Date, endDate as string);
      }

      query += `
        )
        SELECT TOP ${parseInt(limit as string)}
          DOCNO as docno,
          DOCDATE as docdate,
          customerName,
          docTotal,
          baseCode,
          baseName,
          baseQty,
          baseAmount,
          variantCode,
          variantName,
          variantQty,
          variantAmount,
          (baseAmount + variantAmount) as combinedAmount
        FROM ProductPairs
        ORDER BY DOCDATE DESC, (baseAmount + variantAmount) DESC
      `;

      const result = await request.query(query);

      // นับจำนวนใบขายที่มีปัญหา
      const uniqueDocs = new Set(result.recordset.map(r => r.docno));

      res.json({
        success: true,
        data: result.recordset,
        summary: {
          totalDuplicates: result.recordset.length,
          affectedDocuments: uniqueDocs.size,
          message: uniqueDocs.size > 0
            ? `พบ ${uniqueDocs.size} ใบขายที่มีทั้ง Base code และ Variant code ในใบเดียวกัน - อาจทำให้นับยอดขายซ้ำ`
            : 'ไม่พบการนับซ้ำ - ระบบปลอดภัย'
        }
      });

    } catch (error) {
      console.error('Error in checkDuplicateCodes:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
