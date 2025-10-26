import { Request, Response } from 'express';
import { getConnection, sql } from '../config/database.js';

export class AnalyticsController {
  /**
   * GET /api/analytics/products
   * Get list of products that have sales data
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
      `;

      const request = pool.request();

      if (startDate && endDate) {
        query += `
          WHERE h.DOCDATE >= @startDate AND h.DOCDATE <= @endDate
        `;
        request.input('startDate', sql.Date, startDate as string);
        request.input('endDate', sql.Date, endDate as string);
      }

      query += `
        GROUP BY d.PRODUCTCODE
        HAVING SUM(CAST(d.NETAMOUNT as DECIMAL(18,2))) > 0
        ORDER BY SUM(CAST(d.NETAMOUNT as DECIMAL(18,2))) DESC
      `;

      // Add LIMIT if provided
      if (limit) {
        query = `SELECT TOP ${parseInt(limit as string)} * FROM (${query}) AS SubQuery`;
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
      `;

      const request = pool.request();

      if (startDate && endDate) {
        query += `
          WHERE h.DOCDATE >= @startDate AND h.DOCDATE <= @endDate
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
      let query = `
        SELECT
          LEFT(DOCNO, CHARINDEX('-', DOCNO) - 1) as docTypePrefix,
          SUM(CAST(TOTALAMOUNT as DECIMAL(18,2))) as totalAmount,
          COUNT(DISTINCT DOCNO) as docCount
        FROM CSSALE
        WHERE DOCNO LIKE '%-%'
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
}
