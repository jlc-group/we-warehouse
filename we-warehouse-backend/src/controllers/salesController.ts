import { Request, Response } from 'express';
import { SQLServerService } from '../services/sqlServerService.js';

export class SalesController {
  /**
   * GET /api/sales
   * Fetch all sales orders with optional filters
   */
  static async getSalesOrders(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, arcode, docstatus, limit, offset } = req.query;

      const params = {
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        arcode: arcode as string | undefined,
        docstatus: docstatus as string | undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      };

      const salesOrders = await SQLServerService.fetchSalesOrders(params);

      res.json({
        success: true,
        data: salesOrders,
        count: salesOrders.length,
      });
    } catch (error: any) {
      console.error('Error in getSalesOrders:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch sales orders',
      });
    }
  }

  /**
   * GET /api/sales/:docno
   * Fetch single sales order with line items
   */
  static async getSalesOrderById(req: Request, res: Response): Promise<void> {
    try {
      const { docno } = req.params;

      if (!docno) {
        res.status(400).json({
          success: false,
          error: 'Document number (docno) is required',
        });
        return;
      }

      const salesOrder = await SQLServerService.fetchSalesOrderById(docno);

      if (!salesOrder) {
        res.status(404).json({
          success: false,
          error: `Sales order ${docno} not found`,
        });
        return;
      }

      res.json({
        success: true,
        data: salesOrder,
      });
    } catch (error: any) {
      console.error('Error in getSalesOrderById:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch sales order',
      });
    }
  }

  /**
   * GET /api/sales/:docno/items
   * Fetch line items for a specific sales order
   */
  static async getSalesLineItems(req: Request, res: Response): Promise<void> {
    try {
      const { docno } = req.params;

      if (!docno) {
        res.status(400).json({
          success: false,
          error: 'Document number (docno) is required',
        });
        return;
      }

      const lineItems = await SQLServerService.fetchSalesLineItems(docno);

      res.json({
        success: true,
        data: lineItems,
        count: lineItems.length,
      });
    } catch (error: any) {
      console.error('Error in getSalesLineItems:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch line items',
      });
    }
  }

  /**
   * GET /api/sales/packing-list
   * Generate packing list for warehouse
   */
  static async getPackingList(req: Request, res: Response): Promise<void> {
    try {
      const { tax_date, docstatus } = req.query;

      const params = {
        taxDate: tax_date as string | undefined,
        docstatus: docstatus as string | undefined,
      };

      const packingList = await SQLServerService.fetchPackingList(params);

      res.json({
        success: true,
        data: packingList,
        count: packingList.length,
      });
    } catch (error: any) {
      console.error('Error in getPackingList:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate packing list',
      });
    }
  }

  /**
   * GET /api/health
   * Health check endpoint
   */
  static async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const health = await SQLServerService.healthCheck();
      res.json({
        success: true,
        ...health,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        status: 'disconnected',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
