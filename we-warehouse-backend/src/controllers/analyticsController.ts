import { Request, Response } from 'express';
import { getConnection, sql } from '../config/database.js';
import axios from 'axios';

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
          SUM(
            CASE 
              WHEN LEFT(h.DOCNO, 2) IN ('CN', 'CS') THEN -CAST(d.NETAMOUNT as DECIMAL(18,2))
              ELSE CAST(d.NETAMOUNT as DECIMAL(18,2))
            END
          ) as totalSales,
          SUM(
            CASE 
              WHEN LEFT(h.DOCNO, 2) IN ('CN', 'CS') THEN -CAST(d.QUANTITY as DECIMAL(18,2))
              ELSE CAST(d.QUANTITY as DECIMAL(18,2))
            END
          ) as totalQuantity
        FROM CSSALESUB d
        INNER JOIN CSSALE h ON d.DOCNO = h.DOCNO
        WHERE d.PRODUCTCODE NOT LIKE '%X6'
          AND d.PRODUCTCODE NOT LIKE '%X12'
          AND d.PRODUCTCODE NOT LIKE '%X120'
          AND h.CANCELDATE IS NULL
          AND (d.PRODUCTSET IS NULL OR d.PRODUCTSET != 2)
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
        HAVING SUM(
          CASE 
            WHEN LEFT(h.DOCNO, 2) IN ('CN', 'CS') THEN -CAST(d.NETAMOUNT as DECIMAL(18,2))
            ELSE CAST(d.NETAMOUNT as DECIMAL(18,2))
          END
        ) > 0
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
          ORDER BY totalSales DESC
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
          SUM(
            CASE 
              WHEN LEFT(h.DOCNO, 2) IN ('CN', 'CS') THEN -CAST(d.NETAMOUNT as DECIMAL(18,2))
              ELSE CAST(d.NETAMOUNT as DECIMAL(18,2))
            END
          ) as totalPurchases,
          COUNT(DISTINCT h.DOCNO) as orderCount
        FROM CSSALE h
        INNER JOIN CSSALESUB d ON h.DOCNO = d.DOCNO
        WHERE h.CANCELDATE IS NULL
          AND (d.PRODUCTSET IS NULL OR d.PRODUCTSET != 2)
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
        HAVING SUM(
          CASE 
            WHEN LEFT(h.DOCNO, 2) IN ('CN', 'CS') THEN -CAST(d.NETAMOUNT as DECIMAL(18,2))
            ELSE CAST(d.NETAMOUNT as DECIMAL(18,2))
          END
        ) > 0
        ORDER BY totalPurchases DESC
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
          SUM(
            CASE 
              WHEN LEFT(h.DOCNO, 2) IN ('CN', 'CS') THEN -CAST(d.NETAMOUNT as DECIMAL(18,2))
              ELSE CAST(d.NETAMOUNT as DECIMAL(18,2))
            END
          ) as totalSales,
          SUM(
            CASE 
              WHEN LEFT(h.DOCNO, 2) IN ('CN', 'CS') THEN -CAST(d.QUANTITY as DECIMAL(18,2))
              ELSE CAST(d.QUANTITY as DECIMAL(18,2))
            END
          ) as totalQuantity,
          COUNT(DISTINCT h.DOCNO) as orderCount,
          h.ARCODE as arcode,
          h.ARNAME as arname
        FROM CSSALE h
        INNER JOIN CSSALESUB d ON h.DOCNO = d.DOCNO
        WHERE d.PRODUCTCODE = @productCode
          AND h.DOCDATE >= @startDate
          AND h.DOCDATE <= @endDate
          AND h.CANCELDATE IS NULL
          AND (d.PRODUCTSET IS NULL OR d.PRODUCTSET != 2)
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
          SUM(
            CASE 
              WHEN LEFT(h.DOCNO, 2) IN ('CN', 'CS') THEN -CAST(d.NETAMOUNT as DECIMAL(18,2))
              ELSE CAST(d.NETAMOUNT as DECIMAL(18,2))
            END
          ) as totalAmount,
          SUM(
            CASE 
              WHEN LEFT(h.DOCNO, 2) IN ('CN', 'CS') THEN -CAST(d.QUANTITY as DECIMAL(18,2))
              ELSE CAST(d.QUANTITY as DECIMAL(18,2))
            END
          ) as quantity
        FROM CSSALE h
        INNER JOIN CSSALESUB d ON h.DOCNO = d.DOCNO
        WHERE d.PRODUCTCODE = @productCode
          AND h.DOCDATE >= @startDate
          AND h.DOCDATE <= @endDate
          AND h.CANCELDATE IS NULL
          AND (d.PRODUCTSET IS NULL OR d.PRODUCTSET != 2)
        GROUP BY h.ARCODE, h.ARNAME
        ORDER BY totalAmount DESC
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
          SUM(
            CASE 
              WHEN LEFT(h.DOCNO, 2) IN ('CN', 'CS') THEN -CAST(d.NETAMOUNT as DECIMAL(18,2))
              ELSE CAST(d.NETAMOUNT as DECIMAL(18,2))
            END
          ) as totalAmount,
          SUM(
            CASE 
              WHEN LEFT(h.DOCNO, 2) IN ('CN', 'CS') THEN -CAST(d.QUANTITY as DECIMAL(18,2))
              ELSE CAST(d.QUANTITY as DECIMAL(18,2))
            END
          ) as totalQuantity
        FROM CSSALE h
        LEFT JOIN CSSALESUB d ON h.DOCNO = d.DOCNO
        WHERE h.ARCODE = @arcode
          AND h.DOCDATE >= @startDate
          AND h.DOCDATE <= @endDate
          AND h.CANCELDATE IS NULL
          AND (d.PRODUCTSET IS NULL OR d.PRODUCTSET != 2)
        GROUP BY CONVERT(DATE, h.DOCDATE), h.DOCNO
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
          SUM(
            CASE 
              WHEN LEFT(h.DOCNO, 2) IN ('CN', 'CS') THEN -CAST(d.NETAMOUNT as DECIMAL(18,2))
              ELSE CAST(d.NETAMOUNT as DECIMAL(18,2))
            END
          ) as totalAmount,
          SUM(
            CASE 
              WHEN LEFT(h.DOCNO, 2) IN ('CN', 'CS') THEN -CAST(d.QUANTITY as DECIMAL(18,2))
              ELSE CAST(d.QUANTITY as DECIMAL(18,2))
            END
          ) as quantity
        FROM CSSALE h
        INNER JOIN CSSALESUB d ON h.DOCNO = d.DOCNO
        WHERE h.ARCODE = @arcode
          AND h.DOCDATE >= @startDate
          AND h.DOCDATE <= @endDate
          AND d.PRODUCTCODE NOT LIKE '%X6'
          AND d.PRODUCTCODE NOT LIKE '%X12'
          AND d.PRODUCTCODE NOT LIKE '%X120'
          AND h.CANCELDATE IS NULL
          AND (d.PRODUCTSET IS NULL OR d.PRODUCTSET != 2)
        GROUP BY d.PRODUCTCODE, d.PRODUCTNAME
        ORDER BY totalAmount DESC
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

      let query = `
        SELECT
          LEFT(h.DOCNO, 2) as docTypePrefix,
          SUM(CAST(d.NETAMOUNT as DECIMAL(18,2))) as totalAmount,
          COUNT(DISTINCT h.DOCNO) as docCount
        FROM CSSALE h
        INNER JOIN CSSALESUB d ON h.DOCNO = d.DOCNO
        WHERE h.DOCNO LIKE '%-%'
          AND h.CANCELDATE IS NULL
          AND (d.PRODUCTSET IS NULL OR d.PRODUCTSET != 2)
      `;

      if (startDate && endDate) {
        query += `
          AND h.DOCDATE >= @startDate AND h.DOCDATE <= @endDate
        `;
        request.input('startDate', sql.Date, startDate as string);
        request.input('endDate', sql.Date, endDate as string);
      }

      query += `
        GROUP BY LEFT(h.DOCNO, 2)
        ORDER BY LEFT(h.DOCNO, 2)
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

        if (docType === 'CN' || docType === 'CS') {
          // Credit Note
          creditNoteAmount += amount;
          creditNoteCount += count;
        } else {
          // Everything else is Sales (SA, 68, etc.)
          salesAmount += amount;
          salesCount += count;
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
        SUM(CAST(d.QUANTITY as DECIMAL(18, 2))) as totalQuantity
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
        HAVING SUM(CAST(d.QUANTITY as DECIMAL(18, 2))) > 0
        ORDER BY SUM(CAST(d.QUANTITY as DECIMAL(18, 2))) DESC
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

      console.log(`[Forecast] Target: ${targetDate.toISOString().slice(0, 7)}, Lookback: ${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)} `);

      // Query: ดึงยอดขายรายเดือนของแต่ละสินค้าใน 3 เดือนย้อนหลัง
      // กรองเฉพาะรหัสที่ไม่มี X ต่อท้าย (ไม่เอา X6, X12, X24, etc.)
      const query = `
      SELECT
      d.PRODUCTCODE as productCode,
        MAX(d.PRODUCTNAME) as productName,
        YEAR(h.DOCDATE) as year,
        MONTH(h.DOCDATE) as month,
        SUM(CAST(d.QUANTITY as DECIMAL(18, 2))) as totalQuantity
        FROM CSSALESUB d
        INNER JOIN CSSALE h ON d.DOCNO = h.DOCNO
      WHERE
      h.DOCDATE >= @startDate
          AND h.DOCDATE < @endDate
          AND LEFT(h.DOCNO, 2) IN('SA', 'CN')
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
        const monthKey = `${year} -${String(month).padStart(2, '0')} `;
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
              monthName: `${monthNames[parseInt(month) - 1]} ${parseInt(year) + 543} `,
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
              month: `${m.year} -${String(m.month).padStart(2, '0')} `,
              monthName: `${monthNames[m.month - 1]} ${m.year + 543} `,
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
        SUM(CAST(d.NETAMOUNT as DECIMAL(18, 2))) as sumLineAmount
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
   * GET /api/analytics/check-duplicate-docno
   * ตรวจสอบว่ามี DOCNO ซ้ำกันในตาราง CSSALE หรือไม่
   */
  static async checkDuplicateDocno(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, limit = '50' } = req.query;

      const pool = await getConnection();
      const request = pool.request();

      let query = `
      SELECT
      DOCNO,
        COUNT(*) as duplicateCount,
        SUM(CAST(TOTALAMOUNT as DECIMAL(18, 2))) as totalAmount,
        MIN(CAST(DOCTYPE as VARCHAR)) as docType
        FROM CSSALE
        WHERE LEFT(DOCNO, 2) IN('SA', 'CS', 'CN')
        `;

      if (startDate && endDate) {
        query += `
          AND DOCDATE >= @startDate
          AND DOCDATE <= @endDate
        `;
        request.input('startDate', sql.Date, startDate as string);
        request.input('endDate', sql.Date, endDate as string);
      }

      query = `
        SELECT TOP ${parseInt(limit as string)} *
        FROM(
          ${query}
          GROUP BY DOCNO
          HAVING COUNT(*) > 1
        ) AS Duplicates
        ORDER BY duplicateCount DESC, totalAmount DESC
      `;

      const result = await request.query(query);

      res.json({
        success: true,
        data: result.recordset,
        summary: {
          totalDuplicates: result.recordset.length,
          message: result.recordset.length > 0
            ? `พบ ${result.recordset.length} ใบขายที่มี DOCNO ซ้ำกัน`
            : 'ไม่พบ DOCNO ซ้ำ - ระบบปลอดภัย'
        }
      });

    } catch (error) {
      console.error('Error in checkDuplicateDocno:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/analytics/compare-calculation-methods
   * เปรียบเทียบวิธีการคำนวณยอดขายหลายวิธี เพื่อหาว่าวิธีไหนตรงกับ External API
   */
  static async compareCalculationMethods(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters: startDate and endDate'
        });
        return;
      }

      const pool = await getConnection();

      // Method A: Header level with Cancel excluded
      const methodA = await pool.request()
        .input('startDate', sql.Date, startDate as string)
        .input('endDate', sql.Date, endDate as string)
        .query(`
      SELECT
      'Method A: Header with Cancel excluded' as method,
        COUNT(DISTINCT h.DOCNO) as invoiceCount,
        SUM(CAST(h.TOTALAMOUNT as DECIMAL(18, 2))) as totalAmount
          FROM CSSALE h
          WHERE h.DOCDATE >= @startDate
            AND h.DOCDATE <= @endDate
            AND LEFT(h.DOCNO, 2) = 'SA'
            AND h.CANCELDATE IS NULL
        `);

      // Method B: Details with Cancel excluded + Variant excluded
      const methodB = await pool.request()
        .input('startDate', sql.Date, startDate as string)
        .input('endDate', sql.Date, endDate as string)
        .query(`
      SELECT
      'Method B: Details with Cancel excluded + Variant excluded' as method,
        COUNT(DISTINCT h.DOCNO) as invoiceCount,
        SUM(CAST(d.NETAMOUNT as DECIMAL(18, 2))) as totalAmount
          FROM CSSALE h
          INNER JOIN CSSALESUB d ON h.DOCNO = d.DOCNO
          WHERE h.DOCDATE >= @startDate
            AND h.DOCDATE <= @endDate
            AND LEFT(h.DOCNO, 2) = 'SA'
            AND h.CANCELDATE IS NULL
            AND d.PRODUCTCODE NOT LIKE '%X6'
            AND d.PRODUCTCODE NOT LIKE '%X12'
            AND d.PRODUCTCODE NOT LIKE '%X120'
        `);

      // Method C: Details with Cancel INCLUDED + Variant excluded
      const methodC = await pool.request()
        .input('startDate', sql.Date, startDate as string)
        .input('endDate', sql.Date, endDate as string)
        .query(`
      SELECT
      'Method C: Details with Cancel INCLUDED + Variant excluded' as method,
        COUNT(DISTINCT h.DOCNO) as invoiceCount,
        SUM(CAST(d.NETAMOUNT as DECIMAL(18, 2))) as totalAmount
          FROM CSSALE h
          INNER JOIN CSSALESUB d ON h.DOCNO = d.DOCNO
          WHERE h.DOCDATE >= @startDate
            AND h.DOCDATE <= @endDate
            AND LEFT(h.DOCNO, 2) = 'SA'
            AND d.PRODUCTCODE NOT LIKE '%X6'
            AND d.PRODUCTCODE NOT LIKE '%X12'
            AND d.PRODUCTCODE NOT LIKE '%X120'
        `);

      // Method D: Header with Cancel INCLUDED (like old logic)
      const methodD = await pool.request()
        .input('startDate', sql.Date, startDate as string)
        .input('endDate', sql.Date, endDate as string)
        .query(`
      SELECT
      'Method D: Header with Cancel INCLUDED' as method,
        COUNT(DISTINCT h.DOCNO) as invoiceCount,
        SUM(CAST(h.TOTALAMOUNT as DECIMAL(18, 2))) as totalAmount
          FROM CSSALE h
          WHERE h.DOCDATE >= @startDate
            AND h.DOCDATE <= @endDate
            AND LEFT(h.DOCNO, 2) = 'SA'
        `);

      // Method E: Details with Cancel excluded + Variant excluded + CN excluded (SA only, no Credit Notes)
      const methodE = await pool.request()
        .input('startDate', sql.Date, startDate as string)
        .input('endDate', sql.Date, endDate as string)
        .query(`
      SELECT
      'Method E: SA only (no CN) + Cancel excluded + Variant excluded' as method,
        COUNT(DISTINCT h.DOCNO) as invoiceCount,
        SUM(CAST(d.NETAMOUNT as DECIMAL(18, 2))) as totalAmount
          FROM CSSALE h
          INNER JOIN CSSALESUB d ON h.DOCNO = d.DOCNO
          WHERE h.DOCDATE >= @startDate
            AND h.DOCDATE <= @endDate
            AND LEFT(h.DOCNO, 2) = 'SA'
            AND LEFT(h.DOCNO, 2) NOT IN('CS', 'CN')
            AND h.CANCELDATE IS NULL
            AND d.PRODUCTCODE NOT LIKE '%X6'
            AND d.PRODUCTCODE NOT LIKE '%X12'
            AND d.PRODUCTCODE NOT LIKE '%X120'
        `);

      // Get cancelled invoice info
      const cancelledInfo = await pool.request()
        .input('startDate', sql.Date, startDate as string)
        .input('endDate', sql.Date, endDate as string)
        .query(`
      SELECT
      COUNT(DISTINCT h.DOCNO) as cancelledCount,
        SUM(CAST(h.TOTALAMOUNT as DECIMAL(18, 2))) as cancelledAmount
          FROM CSSALE h
          WHERE h.DOCDATE >= @startDate
            AND h.DOCDATE <= @endDate
            AND LEFT(h.DOCNO, 2) = 'SA'
            AND h.CANCELDATE IS NOT NULL
        `);

      // Get Credit Notes info
      const creditNotesInfo = await pool.request()
        .input('startDate', sql.Date, startDate as string)
        .input('endDate', sql.Date, endDate as string)
        .query(`
      SELECT
      COUNT(DISTINCT h.DOCNO) as cnCount,
        SUM(CAST(h.TOTALAMOUNT as DECIMAL(18, 2))) as cnAmount
          FROM CSSALE h
          WHERE h.DOCDATE >= @startDate
            AND h.DOCDATE <= @endDate
            AND LEFT(h.DOCNO, 2) IN('CS', 'CN')
        `);

      res.json({
        success: true,
        dateRange: {
          startDate,
          endDate
        },
        methods: [
          methodA.recordset[0],
          methodB.recordset[0],
          methodC.recordset[0],
          methodD.recordset[0],
          methodE.recordset[0]
        ],
        cancelledInfo: cancelledInfo.recordset[0],
        creditNotesInfo: creditNotesInfo.recordset[0],
        externalAPIReference: {
          baseOnly: 168232347.69,
          note: 'External API (jhserver) base only amount for comparison'
        },
        analysis: {
          differenceFromExternal: {
            methodA: (methodA.recordset[0].totalAmount - 168232347.69).toFixed(2),
            methodB: (methodB.recordset[0].totalAmount - 168232347.69).toFixed(2),
            methodC: (methodC.recordset[0].totalAmount - 168232347.69).toFixed(2),
            methodD: (methodD.recordset[0].totalAmount - 168232347.69).toFixed(2),
            methodE: (methodE.recordset[0].totalAmount - 168232347.69).toFixed(2)
          }
        }
      });

    } catch (error) {
      console.error('Error in compareCalculationMethods:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/analytics/check-vat-calculation
   * ตรวจสอบว่า NETAMOUNT รวม VAT หรือไม่รวม VAT
   */
  static async checkVatCalculation(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, limit = '10' } = req.query;

      const pool = await getConnection();
      const request = pool.request();

      let query = `
        SELECT TOP ${limit}
      h.DOCNO,
        h.DOCDATE,
        h.TAXTYPE,
        h.TAXRATE,
        h.SUMAMOUNT1 as sumBeforeDisc,
        h.DISCAMOUNT as headerDisc,
        h.AFTERDISC as afterDisc,
        h.BASEOFTAX,
        h.TAXAMOUNT as vat,
        h.TOTALAMOUNT as total,
        (
          SELECT SUM(CAST(d.NETAMOUNT as DECIMAL(18, 2)))
            FROM CSSALESUB d
            WHERE d.DOCNO = h.DOCNO
              AND d.PRODUCTCODE NOT LIKE '%X6'
              AND d.PRODUCTCODE NOT LIKE '%X12'
              AND d.PRODUCTCODE NOT LIKE '%X120'
          ) as detailSum,
        (
          SELECT SUM(CAST(d.AMOUNT as DECIMAL(18, 2)))
            FROM CSSALESUB d
            WHERE d.DOCNO = h.DOCNO
              AND d.PRODUCTCODE NOT LIKE '%X6'
              AND d.PRODUCTCODE NOT LIKE '%X12'
              AND d.PRODUCTCODE NOT LIKE '%X120'
          ) as detailAmountSum
        FROM CSSALE h
        WHERE LEFT(h.DOCNO, 2) = 'SA'
          AND h.CANCELDATE IS NULL
          AND h.TOTALAMOUNT > 0
        `;

      if (startDate && endDate) {
        query += `
          AND h.DOCDATE >= @startDate
          AND h.DOCDATE <= @endDate
        `;
        request.input('startDate', sql.Date, startDate as string);
        request.input('endDate', sql.Date, endDate as string);
      }

      query += ` ORDER BY h.DOCDATE`;

      const result = await request.query(query);

      // Calculate relationships
      const analysis = result.recordset.map(row => {
        const totalMatchesDetailSum = Math.abs(row.total - row.detailSum) < 0.01;
        const totalMatchesDetailPlusVat = Math.abs(row.total - (row.detailSum + row.vat)) < 0.01;
        const baseOfTaxMatchesDetailSum = Math.abs(row.BASEOFTAX - row.detailSum) < 0.01;

        return {
          ...row,
          analysis: {
            totalMatchesDetailSum,
            totalMatchesDetailPlusVat,
            baseOfTaxMatchesDetailSum,
            detailSumPlusVat: parseFloat((row.detailSum + row.vat).toFixed(2)),
            difference: parseFloat((row.total - row.detailSum).toFixed(2))
          }
        };
      });

      res.json({
        success: true,
        dateRange: { startDate, endDate },
        count: result.recordset.length,
        data: analysis,
        summary: {
          note: 'Check if NETAMOUNT includes VAT or not',
          fields: {
            SUMAMOUNT1: 'Sum of line items before header discount',
            DISCAMOUNT: 'Header-level discount',
            AFTERDISC: 'Amount after discount (before VAT)',
            BASEOFTAX: 'Tax base amount',
            TAXAMOUNT: 'VAT amount',
            TOTALAMOUNT: 'Final total (should be BASEOFTAX + TAXAMOUNT)',
            detailSum: 'Sum of NETAMOUNT (detail lines, no variants)',
            detailAmountSum: 'Sum of AMOUNT (detail lines, no variants)'
          }
        }
      });

    } catch (error) {
      console.error('Error in checkVatCalculation:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/analytics/compare-all-amount-fields
   * เปรียบเทียบทุกฟิลด์ยอดเงินจาก CSSALE และ CSSALESUB เพื่อหาว่าฟิลด์ไหนใกล้เคียง External API มากที่สุด
   */
  static async compareAllAmountFields(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters: startDate and endDate'
        });
        return;
      }

      const pool = await getConnection();

      // Query all amount fields from CSSALE Header
      const headerQuery = await pool.request()
        .input('startDate', sql.Date, startDate as string)
        .input('endDate', sql.Date, endDate as string)
        .query(`
      SELECT
      COUNT(DISTINCT DOCNO) as invoiceCount,

        --Main Amount Fields
      SUM(CAST(SUMAMOUNT1 as DECIMAL(18, 2))) as sumAmount1,
        SUM(CAST(SUMAMOUNT2 as DECIMAL(18, 2))) as sumAmount2,
        SUM(CAST(SUMAMOUNT2B as DECIMAL(18, 2))) as sumAmount2B,
        SUM(CAST(AFTERDISC as DECIMAL(18, 2))) as afterDisc,
        SUM(CAST(BASEOFTAX as DECIMAL(18, 2))) as baseOfTax,
        SUM(CAST(TAXAMOUNT as DECIMAL(18, 2))) as taxAmount,
        SUM(CAST(TOTALAMOUNT as DECIMAL(18, 2))) as totalAmount,
        SUM(CAST(DEBTAMOUNT as DECIMAL(18, 2))) as debtAmount,

        --Discount Fields
      SUM(CAST(DISCAMOUNT as DECIMAL(18, 2))) as discAmount,
        SUM(CAST(DISCAMOUNT2 as DECIMAL(18, 2))) as discAmount2,
        SUM(CAST(DISCAMOUNTVE as DECIMAL(18, 2))) as discAmountVE,
        SUM(CAST(SUMPROMODISC as DECIMAL(18, 2))) as sumPromoDisc,

        --Bath Currency Fields
      SUM(CAST(BATHSUMAMOUNT1 as DECIMAL(18, 2))) as bathSumAmount1,
        SUM(CAST(BATHSUMAMOUNT2 as DECIMAL(18, 2))) as bathSumAmount2,
        SUM(CAST(BATHTOTALAMOUNT as DECIMAL(18, 2))) as bathTotalAmount,

        --Flags Analysis
      COUNT(CASE WHEN CLOSEFLAG = 0 THEN 1 END) as closeFlagZero,
        COUNT(CASE WHEN CLOSEFLAG = 1 THEN 1 END) as closeFlagOne,
        COUNT(CASE WHEN SYSDOCFLAG = 0 THEN 1 END) as sysDocFlagZero,
        COUNT(CASE WHEN SYSDOCFLAG = 1 THEN 1 END) as sysDocFlagOne,
        COUNT(CASE WHEN TAXTYPE = 0 THEN 1 END) as taxTypeZero,
        COUNT(CASE WHEN TAXTYPE = 1 THEN 1 END) as taxTypeOne,
        COUNT(CASE WHEN TAXTYPE = 2 THEN 1 END) as taxTypeTwo

          FROM CSSALE
          WHERE DOCDATE >= @startDate
            AND DOCDATE <= @endDate
            AND LEFT(DOCNO, 2) = 'SA'
            AND CANCELDATE IS NULL
        `);

      // Query Detail fields from CSSALESUB
      const detailQuery = await pool.request()
        .input('startDate', sql.Date, startDate as string)
        .input('endDate', sql.Date, endDate as string)
        .query(`
      SELECT
      --All products(including variants)
      SUM(CAST(d.AMOUNT as DECIMAL(18, 2))) as detailAmountAll,
        SUM(CAST(d.NETAMOUNT as DECIMAL(18, 2))) as detailNetAmountAll,
        SUM(CAST(d.DISCAMOUNT as DECIMAL(18, 2))) as detailDiscAmountAll,

        --Base products only(exclude X6, X12, X120)
      SUM(CASE
              WHEN d.PRODUCTCODE NOT LIKE '%X6'
                AND d.PRODUCTCODE NOT LIKE '%X12'
                AND d.PRODUCTCODE NOT LIKE '%X120'
              THEN CAST(d.AMOUNT as DECIMAL(18, 2))
              ELSE 0
            END) as detailAmountBase,

        SUM(CASE
              WHEN d.PRODUCTCODE NOT LIKE '%X6'
                AND d.PRODUCTCODE NOT LIKE '%X12'
                AND d.PRODUCTCODE NOT LIKE '%X120'
              THEN CAST(d.NETAMOUNT as DECIMAL(18, 2))
              ELSE 0
            END) as detailNetAmountBase,

        SUM(CASE
              WHEN d.PRODUCTCODE NOT LIKE '%X6'
                AND d.PRODUCTCODE NOT LIKE '%X12'
                AND d.PRODUCTCODE NOT LIKE '%X120'
              THEN CAST(d.DISCAMOUNT as DECIMAL(18, 2))
              ELSE 0
            END) as detailDiscAmountBase

          FROM CSSALE h
          INNER JOIN CSSALESUB d ON h.DOCNO = d.DOCNO
          WHERE h.DOCDATE >= @startDate
            AND h.DOCDATE <= @endDate
            AND LEFT(h.DOCNO, 2) = 'SA'
            AND h.CANCELDATE IS NULL
        `);

      // Query Credit Notes (CN) separately
      const cnQuery = await pool.request()
        .input('startDate', sql.Date, startDate as string)
        .input('endDate', sql.Date, endDate as string)
        .query(`
      SELECT
      COUNT(DISTINCT DOCNO) as cnCount,
        SUM(CAST(SUMAMOUNT1 as DECIMAL(18, 2))) as cnSumAmount1,
        SUM(CAST(AFTERDISC as DECIMAL(18, 2))) as cnAfterDisc,
        SUM(CAST(TOTALAMOUNT as DECIMAL(18, 2))) as cnTotalAmount
          FROM CSSALE
          WHERE DOCDATE >= @startDate
            AND DOCDATE <= @endDate
            AND LEFT(DOCNO, 2) IN('CS', 'CN')
            AND CANCELDATE IS NULL
        `);

      const headerData = headerQuery.recordset[0];
      const detailData = detailQuery.recordset[0];
      const cnData = cnQuery.recordset[0];
      const externalAPITarget = 168232347.69;

      // Build comparison array
      const comparisons = [
        // Header fields
        { field: 'TOTALAMOUNT', description: 'ยอดรวมสุดท้าย (Header, รวม VAT)', value: headerData.totalAmount, source: 'CSSALE' },
        { field: 'SUMAMOUNT1', description: 'ยอดรวมก่อนหัก discount (Header)', value: headerData.sumAmount1, source: 'CSSALE' },
        { field: 'SUMAMOUNT2', description: 'ยอดรวมหลังหัก discount บางส่วน (Header)', value: headerData.sumAmount2, source: 'CSSALE' },
        { field: 'SUMAMOUNT2B', description: 'ยอดรวม variation 2 (Header)', value: headerData.sumAmount2B, source: 'CSSALE' },
        { field: 'AFTERDISC', description: 'ยอดหลังหัก discount ทั้งหมด ก่อน VAT (Header)', value: headerData.afterDisc, source: 'CSSALE' },
        { field: 'BASEOFTAX', description: 'ฐานภาษี - base สำหรับคำนวณ VAT (Header)', value: headerData.baseOfTax, source: 'CSSALE' },
        { field: 'DEBTAMOUNT', description: 'ยอดหนี้ (Header)', value: headerData.debtAmount, source: 'CSSALE' },
        { field: 'BATHSUMAMOUNT1', description: 'ยอดรวมเป็นบาท (Header)', value: headerData.bathSumAmount1, source: 'CSSALE' },
        { field: 'BATHSUMAMOUNT2', description: 'ยอดรวมเป็นบาท variation 2 (Header)', value: headerData.bathSumAmount2, source: 'CSSALE' },
        { field: 'BATHTOTALAMOUNT', description: 'ยอดรวมสุดท้ายเป็นบาท (Header)', value: headerData.bathTotalAmount, source: 'CSSALE' },

        // Detail fields - All products
        { field: 'AMOUNT (All)', description: 'ยอดรวมก่อนหัก discount (Details, รวม X6/X12)', value: detailData.detailAmountAll, source: 'CSSALESUB' },
        { field: 'NETAMOUNT (All)', description: 'ยอดรวมหลังหัก discount (Details, รวม X6/X12)', value: detailData.detailNetAmountAll, source: 'CSSALESUB' },

        // Detail fields - Base only
        { field: 'AMOUNT (Base)', description: 'ยอดรวมก่อนหัก discount (Details, ไม่รวม X6/X12)', value: detailData.detailAmountBase, source: 'CSSALESUB' },
        { field: 'NETAMOUNT (Base)', description: 'ยอดรวมหลังหัก discount (Details, ไม่รวม X6/X12)', value: detailData.detailNetAmountBase, source: 'CSSALESUB' },

        // Calculated fields
        { field: 'TOTALAMOUNT - VAT', description: 'ยอดรวมสุดท้าย หัก VAT (คำนวณ)', value: headerData.totalAmount - headerData.taxAmount, source: 'Calculated' },
        { field: 'AFTERDISC + VAT', description: 'ยอดหลัง discount บวก VAT (คำนวณ)', value: headerData.afterDisc + headerData.taxAmount, source: 'Calculated' },

        // With Credit Notes (CN) included
        { field: 'SUMAMOUNT1 + CN', description: 'ยอดรวมก่อนหัก discount + CN (SA + CN)', value: headerData.sumAmount1 + (cnData.cnSumAmount1 || 0), source: 'Calculated (SA+CN)' },
        { field: 'AFTERDISC + CN', description: 'ยอดหลังหัก discount + CN (SA + CN)', value: headerData.afterDisc + (cnData.cnAfterDisc || 0), source: 'Calculated (SA+CN)' },
        { field: 'TOTALAMOUNT + CN', description: 'ยอดรวมสุดท้าย + CN (SA + CN, รวม VAT)', value: headerData.totalAmount + (cnData.cnTotalAmount || 0), source: 'Calculated (SA+CN)' },
      ];

      // Calculate differences and rank
      const results = comparisons
        .filter(item => item.value != null && item.value !== 0)
        .map(item => {
          const difference = item.value - externalAPITarget;
          const percentDiff = (difference / externalAPITarget) * 100;
          const absDiff = Math.abs(difference);

          return {
            ...item,
            value: parseFloat(item.value.toFixed(2)),
            difference: parseFloat(difference.toFixed(2)),
            percentDiff: parseFloat(percentDiff.toFixed(2)),
            absDiff: parseFloat(absDiff.toFixed(2))
          };
        })
        .sort((a, b) => a.absDiff - b.absDiff) // Sort by closest to target
        .map((item, index) => ({ ...item, rank: index + 1 }));

      // Get top 3 closest matches
      const top3 = results.slice(0, 3);

      res.json({
        success: true,
        dateRange: { startDate, endDate },
        externalAPITarget,
        invoiceCount: headerData.invoiceCount,
        summary: {
          totalFields: results.length,
          closestMatch: results[0],
          top3Matches: top3
        },
        allFields: results,
        flagsAnalysis: {
          CLOSEFLAG: {
            zero: headerData.closeFlagZero,
            one: headerData.closeFlagOne
          },
          SYSDOCFLAG: {
            zero: headerData.sysDocFlagZero,
            one: headerData.sysDocFlagOne
          },
          TAXTYPE: {
            zero: headerData.taxTypeZero,
            one: headerData.taxTypeOne,
            two: headerData.taxTypeTwo
          }
        },
        discountAnalysis: {
          headerDiscount: parseFloat(headerData.discAmount.toFixed(2)),
          headerDiscount2: parseFloat(headerData.discAmount2.toFixed(2)),
          promoDiscount: parseFloat(headerData.sumPromoDisc.toFixed(2)),
          detailDiscountAll: parseFloat(detailData.detailDiscAmountAll.toFixed(2)),
          detailDiscountBase: parseFloat(detailData.detailDiscAmountBase.toFixed(2))
        },
        creditNotesAnalysis: {
          cnCount: cnData.cnCount || 0,
          cnSumAmount1: parseFloat((cnData.cnSumAmount1 || 0).toFixed(2)),
          cnAfterDisc: parseFloat((cnData.cnAfterDisc || 0).toFixed(2)),
          cnTotalAmount: parseFloat((cnData.cnTotalAmount || 0).toFixed(2)),
          note: 'Credit Notes (CN) are negative amounts that reduce total sales'
        },
        notes: {
          externalAPI: 'External API (jhserver) Base only amount',
          recommendation: `ฟิลด์ที่ใกล้เคียงที่สุดคือ: ${results[0].field} (ต่างเพียง ${results[0].absDiff.toLocaleString()} บาท หรือ ${Math.abs(results[0].percentDiff)}%)`,
          cnNote: cnData.cnCount > 0 ? `มี CN ${cnData.cnCount} ใบ ยอดรวม ${(cnData.cnTotalAmount || 0).toLocaleString()} บาท(ถูกนำออกจากยอดขายแล้ว)` : 'ไม่มี Credit Notes ในช่วงเวลานี้'
        }
      });

    } catch (error) {
      console.error('Error in compareAllAmountFields:', error);
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
        WITH ProductPairs AS(
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

  /**
   * GET /api/analytics/compare-db-vs-external
   * เปรียบเทียบยอดขายระหว่าง DB (CSSALE) และ External API (jhserver) แบบ month-by-month
   * Query External API และเปรียบเทียบกับข้อมูลจาก DB สำหรับเดือนเดียวกัน
   */
  static async compareDbVsExternal(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters: startDate and endDate'
        });
        return;
      }

      const pool = await getConnection();

      // 1. Query DB data - ใช้โค้ดเดิมจาก compareAllAmountFields
      const headerQuery = await pool.request()
        .input('startDate', sql.Date, startDate as string)
        .input('endDate', sql.Date, endDate as string)
        .query(`
      SELECT
      COUNT(DISTINCT DOCNO) as invoiceCount,

        --Main Amount Fields
      SUM(CAST(SUMAMOUNT1 as DECIMAL(18, 2))) as sumAmount1,
        SUM(CAST(SUMAMOUNT2 as DECIMAL(18, 2))) as sumAmount2,
        SUM(CAST(SUMAMOUNT2B as DECIMAL(18, 2))) as sumAmount2B,
        SUM(CAST(AFTERDISC as DECIMAL(18, 2))) as afterDisc,
        SUM(CAST(BASEOFTAX as DECIMAL(18, 2))) as baseOfTax,
        SUM(CAST(TAXAMOUNT as DECIMAL(18, 2))) as taxAmount,
        SUM(CAST(TOTALAMOUNT as DECIMAL(18, 2))) as totalAmount,
        SUM(CAST(DEBTAMOUNT as DECIMAL(18, 2))) as debtAmount,

        --Discount Fields
      SUM(CAST(DISCAMOUNT as DECIMAL(18, 2))) as discAmount,
        SUM(CAST(DISCAMOUNT2 as DECIMAL(18, 2))) as discAmount2,
        SUM(CAST(DISCAMOUNTVE as DECIMAL(18, 2))) as discAmountVE,
        SUM(CAST(SUMPROMODISC as DECIMAL(18, 2))) as sumPromoDisc,

        --Bath Currency Fields
      SUM(CAST(BATHSUMAMOUNT1 as DECIMAL(18, 2))) as bathSumAmount1,
        SUM(CAST(BATHSUMAMOUNT2 as DECIMAL(18, 2))) as bathSumAmount2,
        SUM(CAST(BATHTOTALAMOUNT as DECIMAL(18, 2))) as bathTotalAmount

          FROM CSSALE
          WHERE DOCDATE >= @startDate
            AND DOCDATE <= @endDate
            AND LEFT(DOCNO, 2) = 'SA'
            AND CANCELDATE IS NULL
        `);

      // Query Detail fields from CSSALESUB
      const detailQuery = await pool.request()
        .input('startDate', sql.Date, startDate as string)
        .input('endDate', sql.Date, endDate as string)
        .query(`
      SELECT
      --All products(including variants)
      SUM(CAST(d.AMOUNT as DECIMAL(18, 2))) as detailAmountAll,
        SUM(CAST(d.NETAMOUNT as DECIMAL(18, 2))) as detailNetAmountAll,
        SUM(CAST(d.DISCAMOUNT as DECIMAL(18, 2))) as detailDiscAmountAll,

        --Base products only(exclude X6, X12, X120)
      SUM(CASE
              WHEN d.PRODUCTCODE NOT LIKE '%X6'
                AND d.PRODUCTCODE NOT LIKE '%X12'
                AND d.PRODUCTCODE NOT LIKE '%X120'
              THEN CAST(d.AMOUNT as DECIMAL(18, 2))
              ELSE 0
            END) as detailAmountBase,

        SUM(CASE
              WHEN d.PRODUCTCODE NOT LIKE '%X6'
                AND d.PRODUCTCODE NOT LIKE '%X12'
                AND d.PRODUCTCODE NOT LIKE '%X120'
              THEN CAST(d.NETAMOUNT as DECIMAL(18, 2))
              ELSE 0
            END) as detailNetAmountBase,

        SUM(CASE
              WHEN d.PRODUCTCODE NOT LIKE '%X6'
                AND d.PRODUCTCODE NOT LIKE '%X12'
                AND d.PRODUCTCODE NOT LIKE '%X120'
              THEN CAST(d.DISCAMOUNT as DECIMAL(18, 2))
              ELSE 0
            END) as detailDiscAmountBase

          FROM CSSALE h
          INNER JOIN CSSALESUB d ON h.DOCNO = d.DOCNO
          WHERE h.DOCDATE >= @startDate
            AND h.DOCDATE <= @endDate
            AND LEFT(h.DOCNO, 2) = 'SA'
            AND h.CANCELDATE IS NULL
        `);

      // Query Credit Notes (CN) separately
      const cnQuery = await pool.request()
        .input('startDate', sql.Date, startDate as string)
        .input('endDate', sql.Date, endDate as string)
        .query(`
      SELECT
      COUNT(DISTINCT DOCNO) as cnCount,
        SUM(CAST(SUMAMOUNT1 as DECIMAL(18, 2))) as cnSumAmount1,
        SUM(CAST(AFTERDISC as DECIMAL(18, 2))) as cnAfterDisc,
        SUM(CAST(TOTALAMOUNT as DECIMAL(18, 2))) as cnTotalAmount
          FROM CSSALE
          WHERE DOCDATE >= @startDate
            AND DOCDATE <= @endDate
            AND LEFT(DOCNO, 2) IN('CS', 'CN')
            AND CANCELDATE IS NULL
        `);

      const headerData = headerQuery.recordset[0];
      const detailData = detailQuery.recordset[0];
      const cnData = cnQuery.recordset[0];

      // 2. Call External API (jhserver)
      // Extract year from startDate (format: YYYY-MM-DD)
      const year = (startDate as string).substring(0, 4);
      const externalApiUrl = `http://jhserver.dyndns.info:82/sale-report/by-product/v2/amount-by-arcode?filter_date=${year}`;

      let externalApiData = null;
      let externalApiError = null;

      try {
        const apiResponse = await axios.get(externalApiUrl, { timeout: 10000 });
        externalApiData = apiResponse.data;
      } catch (error) {
        externalApiError = error instanceof Error ? error.message : 'Unknown error calling External API';
        console.error('External API error:', externalApiError);
      }

      // 3. คำนวณยอดรวมจาก External API สำหรับเดือนที่ระบุ
      let externalTotals = {
        totalAll: 0,
        baseOnly: 0,
        variantOnly: 0,
        productCount: 0
      };

      if (externalApiData && Array.isArray(externalApiData)) {
        // Extract month from startDate (format: YYYY-MM)
        const monthKey = (startDate as string).substring(0, 7); // e.g., "2025-10"

        externalApiData.forEach((product: any) => {
          const monthValue = product[monthKey] || 0;
          externalTotals.totalAll += monthValue;

          // Check if it's a variant (X6, X12, X120)
          const isVariant =
            product.PRODUCTCODE?.endsWith('X6') ||
            product.PRODUCTCODE?.endsWith('X12') ||
            product.PRODUCTCODE?.endsWith('X120');

          if (isVariant) {
            externalTotals.variantOnly += monthValue;
          } else {
            externalTotals.baseOnly += monthValue;
          }
        });

        externalTotals.productCount = externalApiData.length;
      }

      // 4. Build DB comparison array (ใช้โค้ดเดิม)
      const dbComparisons = [
        // Header fields
        { field: 'TOTALAMOUNT', description: 'ยอดรวมสุดท้าย (Header, รวม VAT)', value: headerData.totalAmount, source: 'CSSALE' },
        { field: 'SUMAMOUNT1', description: 'ยอดรวมก่อนหัก discount (Header)', value: headerData.sumAmount1, source: 'CSSALE' },
        { field: 'SUMAMOUNT2', description: 'ยอดรวมหลังหัก discount บางส่วน (Header)', value: headerData.sumAmount2, source: 'CSSALE' },
        { field: 'AFTERDISC', description: 'ยอดหลังหัก discount ทั้งหมด ก่อน VAT (Header)', value: headerData.afterDisc, source: 'CSSALE' },
        { field: 'BASEOFTAX', description: 'ฐานภาษี - base สำหรับคำนวณ VAT (Header)', value: headerData.baseOfTax, source: 'CSSALE' },
        { field: 'BATHSUMAMOUNT1', description: 'ยอดรวมเป็นบาท (Header)', value: headerData.bathSumAmount1, source: 'CSSALE' },

        // Detail fields - Base only
        { field: 'NETAMOUNT (Base)', description: 'ยอดรวมหลังหัก discount (Details, ไม่รวม X6/X12)', value: detailData.detailNetAmountBase, source: 'CSSALESUB' },
        { field: 'AMOUNT (Base)', description: 'ยอดรวมก่อนหัก discount (Details, ไม่รวม X6/X12)', value: detailData.detailAmountBase, source: 'CSSALESUB' },

        // Calculated fields
        { field: 'TOTALAMOUNT - VAT', description: 'ยอดรวมสุดท้าย หัก VAT (คำนวณ)', value: headerData.totalAmount - headerData.taxAmount, source: 'Calculated' },

        // With Credit Notes (CN) included
        { field: 'SUMAMOUNT1 + CN', description: 'ยอดรวมก่อนหัก discount + CN (SA + CN)', value: headerData.sumAmount1 + (cnData.cnSumAmount1 || 0), source: 'Calculated (SA+CN)' },
        { field: 'AFTERDISC + CN', description: 'ยอดหลังหัก discount + CN (SA + CN)', value: headerData.afterDisc + (cnData.cnAfterDisc || 0), source: 'Calculated (SA+CN)' },
      ];

      // 5. เปรียบเทียบ DB กับ External API
      const comparisons = dbComparisons
        .filter(item => item.value != null && item.value !== 0)
        .map(item => {
          const difference = item.value - externalTotals.baseOnly;
          const percentDiff = externalTotals.baseOnly !== 0 ? (difference / externalTotals.baseOnly) * 100 : 0;
          const absDiff = Math.abs(difference);

          return {
            ...item,
            value: parseFloat(item.value.toFixed(2)),
            difference: parseFloat(difference.toFixed(2)),
            percentDiff: parseFloat(percentDiff.toFixed(2)),
            absDiff: parseFloat(absDiff.toFixed(2))
          };
        })
        .sort((a, b) => a.absDiff - b.absDiff) // Sort by closest to External API
        .map((item, index) => ({ ...item, rank: index + 1 }));

      // Get top 3 closest matches
      const top3 = comparisons.slice(0, 3);

      // หา SUMAMOUNT1 และ NETAMOUNT (Base) จาก comparisons
      const sumAmount1Comparison = comparisons.find(c => c.field === 'SUMAMOUNT1');
      const netAmountBaseComparison = comparisons.find(c => c.field === 'NETAMOUNT (Base)');

      // Dashboard value (จากรูปที่ user ให้มา - Sep 2025)
      const dashboardValue = 185415661.18;
      const sumAmount1VsDashboard = sumAmount1Comparison ? {
        dashboardValue: parseFloat(dashboardValue.toFixed(2)),
        difference: parseFloat((sumAmount1Comparison.value - dashboardValue).toFixed(2)),
        percentDiff: parseFloat(((sumAmount1Comparison.value - dashboardValue) / dashboardValue * 100).toFixed(4)),
        interpretation: Math.abs((sumAmount1Comparison.value - dashboardValue) / dashboardValue * 100) < 0.01
          ? '✅ ตรงกับ Dashboard (ต่างกันแค่ปัดเศษ)'
          : Math.abs((sumAmount1Comparison.value - dashboardValue) / dashboardValue * 100) < 1
            ? '✅ ใกล้เคียง Dashboard มาก (ต่างกันไม่ถึง 1%)'
            : '⚠️ ต่างจาก Dashboard มากกว่า 1%'
      } : null;

      // Response
      res.json({
        success: true,
        dateRange: {
          startDate,
          endDate,
          month: (startDate as string).substring(0, 7) // YYYY-MM
        },
        database: {
          invoiceCount: headerData.invoiceCount,
          cnCount: cnData.cnCount || 0,

          // SUMAMOUNT1 - ตรงกับ Dashboard
          sumAmount1: sumAmount1Comparison ? {
            value: sumAmount1Comparison.value,
            description: 'ยอดรวมก่อนหัก discount (Header, รวม Variants)',
            source: 'CSSALE',
            vsExternalAPI: {
              difference: sumAmount1Comparison.difference,
              percentDiff: sumAmount1Comparison.percentDiff,
              interpretation: Math.abs(sumAmount1Comparison.percentDiff) < 1
                ? '✅ ใกล้เคียง External API มาก (ต่างกันไม่ถึง 1%)'
                : Math.abs(sumAmount1Comparison.percentDiff) < 5
                  ? '✓ ใกล้เคียง External API (ต่างกันไม่ถึง 5%)'
                  : Math.abs(sumAmount1Comparison.percentDiff) < 10
                    ? '⚠️ ต่างจาก External API ปานกลาง (5-10%)'
                    : '❌ ต่างจาก External API มาก (มากกว่า 10%)'
            },
            vsDashboard: sumAmount1VsDashboard
          } : null,

          // NETAMOUNT (Base) - ใกล้เคียง External API Base มากที่สุด
          netAmountBase: netAmountBaseComparison ? {
            value: netAmountBaseComparison.value,
            description: 'ยอดรวมหลังหัก discount (Details, ไม่รวม Variants X6/X12/X120)',
            source: 'CSSALESUB',
            vsExternalAPI: {
              difference: netAmountBaseComparison.difference,
              percentDiff: netAmountBaseComparison.percentDiff,
              interpretation: Math.abs(netAmountBaseComparison.percentDiff) < 1
                ? '✅ ใกล้เคียง External API Base มาก (ต่างกันไม่ถึง 1%)'
                : Math.abs(netAmountBaseComparison.percentDiff) < 5
                  ? '✓ ใกล้เคียง External API Base (ต่างกันไม่ถึง 5%)'
                  : Math.abs(netAmountBaseComparison.percentDiff) < 10
                    ? '⚠️ ต่างจาก External API Base ปานกลาง (5-10%)'
                    : '❌ ต่างจาก External API Base มาก (มากกว่า 10%)'
            }
          } : null,

          // ฟิลด์อื่นๆ ที่น่าสนใจ
          otherFields: comparisons.filter(c =>
            c.field !== 'SUMAMOUNT1' &&
            c.field !== 'NETAMOUNT (Base)' &&
            c.rank <= 5 // แสดงแค่ Top 5
          ).map(c => ({
            field: c.field,
            value: c.value,
            source: c.source,
            vsExternalAPI: {
              difference: c.difference,
              percentDiff: c.percentDiff,
              rank: c.rank
            }
          })),

          allFields: comparisons,
          top3Matches: top3
        },
        externalAPI: {
          url: externalApiUrl,
          error: externalApiError,
          totals: {
            totalAll: parseFloat(externalTotals.totalAll.toFixed(2)),
            baseOnly: parseFloat(externalTotals.baseOnly.toFixed(2)),
            variantOnly: parseFloat(externalTotals.variantOnly.toFixed(2)),
            productCount: externalTotals.productCount
          },
          note: 'baseOnly = ยอดขายที่ไม่รวม X6/X12/X120 variants'
        },
        comparison: {
          closestDBField: comparisons[0]?.field || 'N/A',
          dbValue: comparisons[0]?.value || 0,
          externalValue: parseFloat(externalTotals.baseOnly.toFixed(2)),
          difference: comparisons[0]?.difference || 0,
          percentDiff: comparisons[0]?.percentDiff || 0,
          interpretation: comparisons[0] && Math.abs(comparisons[0].percentDiff) < 1
            ? '✅ ยอดขายใกล้เคียงมาก (ต่างกันไม่ถึง 1%)'
            : comparisons[0] && Math.abs(comparisons[0].percentDiff) < 5
              ? '✓ ยอดขายใกล้เคียง (ต่างกันไม่ถึง 5%)'
              : comparisons[0] && Math.abs(comparisons[0].percentDiff) < 10
                ? '⚠️ ยอดขายมีความแตกต่างปานกลาง (5-10%)'
                : '❌ ยอดขายแตกต่างกันมาก (มากกว่า 10%)',

          recommendedForDashboard: {
            field: 'SUMAMOUNT1',
            reason: 'ตรงกับ Dashboard ที่มีอยู่ (ต่างแค่ปัดเศษ)',
            accuracy: sumAmount1VsDashboard ? `${Math.abs(sumAmount1VsDashboard.percentDiff).toFixed(4)}%` : 'N/A'
          },
          recommendedForExternalAPI: {
            field: comparisons[0]?.field || 'NETAMOUNT (Base)',
            reason: 'ใกล้เคียง External API Base มากที่สุด',
            accuracy: comparisons[0] ? `${Math.abs(comparisons[0].percentDiff).toFixed(2)}%` : 'N/A'
          }
        },
        creditNotesAnalysis: {
          cnCount: cnData.cnCount || 0,
          cnSumAmount1: parseFloat((cnData.cnSumAmount1 || 0).toFixed(2)),
          cnAfterDisc: parseFloat((cnData.cnAfterDisc || 0).toFixed(2)),
          cnTotalAmount: parseFloat((cnData.cnTotalAmount || 0).toFixed(2))
        },
        summary: {
          keyFindings: [
            sumAmount1VsDashboard && Math.abs(sumAmount1VsDashboard.percentDiff) < 0.01
              ? '✅ Dashboard ใช้ SUMAMOUNT1 จาก DB (ไม่ใช้ External API โดยตรง)'
              : '⚠️ Dashboard อาจใช้ค่าอื่นที่ไม่ใช่ SUMAMOUNT1',
            netAmountBaseComparison && Math.abs(netAmountBaseComparison.percentDiff) < 1
              ? '✅ NETAMOUNT (Base) ใกล้เคียง External API Base มากกว่า SUMAMOUNT1'
              : '⚠️ NETAMOUNT (Base) มีความแตกต่างจาก External API Base',
            sumAmount1Comparison && netAmountBaseComparison
              ? `📊 SUMAMOUNT1 (${sumAmount1Comparison.value.toLocaleString()}) ต่ำกว่า NETAMOUNT Base (${netAmountBaseComparison.value.toLocaleString()}) เพราะรวม Variants (X6/X12/X120)`
              : 'ไม่สามารถเปรียบเทียบได้'
          ],
          dbSource: 'SQL Server CSSALE + CSSALESUB tables',
          externalSource: 'jhserver API (sale-report/by-product/v2)',
          recommendation: comparisons[0]
            ? `ฟิลด์ที่ใกล้เคียง External API มากที่สุดคือ: ${comparisons[0].field} (ต่าง ${Math.abs(comparisons[0].percentDiff)}%)`
            : 'ไม่พบข้อมูลเปรียบเทียบ'
        }
      });

    } catch (error) {
      console.error('Error in compareDbVsExternal:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
