import { Request, Response } from 'express';
import { getLocalPool } from '../config/localDatabase.js';

export class PkStockController {
  /**
   * GET /api/pk-stock/summary
   * สรุปภาพรวมสต็อก PK (บรรจุภัณฑ์)
   */
  static async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const pool = getLocalPool();

      const result = await pool.query(`
        SELECT
          COUNT(DISTINCT p.sku_code) AS total_products,
          COUNT(i.id) AS total_lots,
          COUNT(DISTINCT i.location) AS total_locations,
          COALESCE(SUM(
            COALESCE(i.unit_level1_quantity, 0) * 144 +
            COALESCE(i.unit_level2_quantity, 0) * 12 +
            COALESCE(i.unit_level3_quantity, 0)
          ), 0) AS total_base_quantity
        FROM inventory_items i
        JOIN products p ON i.sku = p.sku_code
        WHERE p.product_type = 'PK'
          AND (i.is_deleted IS NULL OR i.is_deleted = false)
      `);

      const summary = result.rows[0] || {};

      res.json({
        success: true,
        data: {
          total_products: parseInt(summary.total_products) || 0,
          total_lots: parseInt(summary.total_lots) || 0,
          total_locations: parseInt(summary.total_locations) || 0,
          total_base_quantity: parseInt(summary.total_base_quantity) || 0,
          product_type: 'PK',
          product_type_label: 'บรรจุภัณฑ์',
        }
      });
    } catch (error: any) {
      console.error('PK Stock summary error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/pk-stock/products
   * รายการสินค้า PK พร้อมจำนวนสต็อกรวม
   * Query params: ?search=xxx&limit=50&offset=0&order=total_base_quantity.desc
   */
  static async getProducts(req: Request, res: Response): Promise<void> {
    try {
      const pool = getLocalPool();
      const {
        search,
        limit = '50',
        offset = '0',
        order = 'total_base_quantity.desc'
      } = req.query;

      const values: any[] = [];
      let whereExtra = '';

      if (search) {
        values.push(`%${search}%`, `%${search}%`);
        whereExtra = ` AND (p.sku_code ILIKE $${values.length - 1} OR p.product_name ILIKE $${values.length})`;
      }

      const [orderCol, orderDir] = (order as string).split('.');
      const safeOrderCol = ['total_base_quantity', 'sku_code', 'product_name', 'total_lots', 'total_locations'].includes(orderCol)
        ? orderCol : 'total_base_quantity';
      const safeOrderDir = orderDir?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const limitNum = Math.min(parseInt(limit as string) || 50, 500);
      const offsetNum = parseInt(offset as string) || 0;

      const result = await pool.query(`
        SELECT
          p.sku_code,
          p.product_name AS product_name,
          p.product_type,
          144 AS l1_rate,
          12 AS l2_rate,
          'ลัง' AS l1_name,
          'กล่อง' AS l2_name,
          'ชิ้น' AS l3_name,
          COALESCE(SUM(i.unit_level1_quantity), 0) AS total_l1,
          COALESCE(SUM(i.unit_level2_quantity), 0) AS total_l2,
          COALESCE(SUM(i.unit_level3_quantity), 0) AS total_l3,
          COALESCE(SUM(
            COALESCE(i.unit_level1_quantity, 0) * 144 +
            COALESCE(i.unit_level2_quantity, 0) * 12 +
            COALESCE(i.unit_level3_quantity, 0)
          ), 0) AS total_base_quantity,
          COUNT(i.id) AS total_lots,
          COUNT(DISTINCT i.location) AS total_locations
        FROM products p
        LEFT JOIN inventory_items i ON i.sku = p.sku_code
          AND (i.is_deleted IS NULL OR i.is_deleted = false)
        WHERE p.product_type = 'PK'
        ${whereExtra}
        GROUP BY p.sku_code, p.product_name, p.product_type
        ORDER BY ${safeOrderCol} ${safeOrderDir}
        LIMIT ${limitNum} OFFSET ${offsetNum}
      `, values);

      const countResult = await pool.query(`
        SELECT COUNT(DISTINCT p.sku_code) AS total
        FROM products p
        WHERE p.product_type = 'PK'
        ${search ? `AND (p.sku_code ILIKE $1 OR p.product_name ILIKE $2)` : ''}
      `, search ? [`%${search}%`, `%${search}%`] : []);

      const total = parseInt(countResult.rows[0]?.total) || 0;

      res.json({
        success: true,
        count: result.rows.length,
        total,
        data: result.rows.map(row => ({
          sku_code: row.sku_code,
          product_name: row.product_name,
          product_type: row.product_type,
          l1_rate: parseInt(row.l1_rate),
          l2_rate: parseInt(row.l2_rate),
          l1_name: row.l1_name,
          l2_name: row.l2_name,
          l3_name: row.l3_name,
          total_l1: parseInt(row.total_l1),
          total_l2: parseInt(row.total_l2),
          total_l3: parseInt(row.total_l3),
          total_base_quantity: parseInt(row.total_base_quantity),
          stock_display: formatStockDisplay(row),
          total_lots: parseInt(row.total_lots),
          total_locations: parseInt(row.total_locations),
        }))
      });
    } catch (error: any) {
      console.error('PK Stock products error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/pk-stock/product/:skuCode
   * ข้อมูลสต็อกของสินค้า PK ตัวเดียว แยกตามตำแหน่ง
   */
  static async getProductDetail(req: Request, res: Response): Promise<void> {
    try {
      const pool = getLocalPool();
      const { skuCode } = req.params;

      const result = await pool.query(`
        SELECT
          i.id,
          i.sku,
          p.product_name AS product_name,
          i.location,
          i.unit_level1_quantity AS l1_qty,
          i.unit_level2_quantity AS l2_qty,
          i.unit_level3_quantity AS l3_qty,
          144 AS l1_rate,
          12 AS l2_rate,
          (
            COALESCE(i.unit_level1_quantity, 0) * 144 +
            COALESCE(i.unit_level2_quantity, 0) * 12 +
            COALESCE(i.unit_level3_quantity, 0)
          ) AS base_quantity,
          i.lot_number,
          i.expiry_date,
          i.created_at,
          i.updated_at
        FROM inventory_items i
        JOIN products p ON i.sku = p.sku_code
        WHERE i.sku = $1
          AND p.product_type = 'PK'
          AND (i.is_deleted IS NULL OR i.is_deleted = false)
        ORDER BY i.location ASC
      `, [skuCode]);

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Product not found or not PK type' });
        return;
      }

      res.json({
        success: true,
        sku_code: skuCode,
        product_name: result.rows[0]?.product_name,
        count: result.rows.length,
        data: result.rows
      });
    } catch (error: any) {
      console.error('PK Stock product detail error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

function formatStockDisplay(row: any): string {
  const parts: string[] = [];
  const l1 = parseInt(row.total_l1) || 0;
  const l2 = parseInt(row.total_l2) || 0;
  const l3 = parseInt(row.total_l3) || 0;
  const l1Name = row.l1_name || 'ลัง';
  const l2Name = row.l2_name || 'กล่อง';
  const l3Name = row.l3_name || 'ชิ้น';

  if (l1 > 0) parts.push(`${l1} ${l1Name}`);
  if (l2 > 0) parts.push(`${l2} ${l2Name}`);
  if (l3 > 0) parts.push(`${l3} ${l3Name}`);

  return parts.length > 0 ? parts.join(' + ') : '0 ชิ้น';
}
