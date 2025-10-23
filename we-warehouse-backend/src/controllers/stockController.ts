import { Request, Response } from 'express';
import { SQLServerService } from '../services/sqlServerService.js';

export class StockController {
  /**
   * GET /api/stock/stock-card
   * Fetch stock card (movement) from CSSTOCKCARD
   */
  static async getStockCard(req: Request, res: Response): Promise<void> {
    try {
      const {
        productCode,
        warehouse,
        location,
        from,
        to,
        docgroup,
        transtype,
        limit
      } = req.query;

      const params = {
        productCode: (productCode as string) || undefined,
        warehouse: (warehouse as string) || undefined,
        location: (location as string) || undefined,
        fromDate: (from as string) || undefined,
        toDate: (to as string) || undefined,
        docgroup: (docgroup as string) || undefined,
        transtype: (transtype as string) || undefined,
        limit: limit ? parseInt(limit as string, 10) : 500,
      };

      const data = await SQLServerService.fetchStockCard(params);

      res.json({
        success: true,
        count: data.length,
        data,
      });
    } catch (error: any) {
      console.error('Error in getStockCard:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch stock card',
      });
    }
  }
}
