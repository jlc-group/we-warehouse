import { Request, Response } from 'express';
import { SQLServerService } from '../services/sqlServerService.js';

export class StockController {
  /**
   * GET /api/stock/debug/tables
   * Debug: Get list of tables in database
   */
  static async getTableList(req: Request, res: Response): Promise<void> {
    try {
      const { pattern } = req.query;
      const tables = await SQLServerService.getTableList(pattern as string);

      res.json({
        success: true,
        count: tables.length,
        tables,
      });
    } catch (error: any) {
      console.error('Error in getTableList:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch table list',
      });
    }
  }

  /**
   * GET /api/stock/debug/table-columns/:tableName
   * Debug: Get table columns
   */
  static async getTableColumns(req: Request, res: Response): Promise<void> {
    try {
      const { tableName } = req.params;
      const data = await SQLServerService.getTableColumns(tableName);

      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      console.error('Error in getTableColumns:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get table columns',
      });
    }
  }

  /**
   * GET /api/stock/debug/transfer-table
   * Debug: Check CSStkMove table
   */
  static async checkTransferTable(req: Request, res: Response): Promise<void> {
    try {
      const data = await SQLServerService.checkTransferTable();

      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      console.error('Error in checkTransferTable:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to check transfer table',
      });
    }
  }

  /**
   * GET /api/stock/transfers
   * Get transfer documents from CSStkMove
   */
  static async getTransferDocuments(req: Request, res: Response): Promise<void> {
    try {
      const {
        productCode,
        warehouse,
        from,
        to,
        docno,
        limit
      } = req.query;

      const params = {
        productCode: (productCode as string) || undefined,
        warehouse: (warehouse as string) || undefined,
        fromDate: (from as string) || undefined,
        toDate: (to as string) || undefined,
        docno: (docno as string) || undefined,
        limit: limit ? parseInt(limit as string, 10) : 500,
      };

      const data = await SQLServerService.fetchTransferDocuments(params);

      res.json({
        success: true,
        count: data.length,
        data,
      });
    } catch (error: any) {
      console.error('Error in getTransferDocuments:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch transfer documents',
      });
    }
  }

  /**
   * GET /api/stock/stock-card/filters
   * Get distinct values for filters from CSSTOCKCARD
   */
  static async getStockCardFilters(req: Request, res: Response): Promise<void> {
    try {
      const data = await SQLServerService.fetchStockCardFilters();

      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      console.error('Error in getStockCardFilters:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch stock card filters',
      });
    }
  }

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
