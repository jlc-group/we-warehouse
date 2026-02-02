/**
 * Movement Service - Track stock movements (receive, ship, move, adjust)
 * Uses local PostgreSQL database or Supabase based on config
 */

import { localDb } from '@/integrations/local/client';
import { supabase } from '@/integrations/supabase/client';

const USE_LOCAL_DB = import.meta.env.VITE_USE_LOCAL_DB === 'true';

export type MovementType = 'receive' | 'ship' | 'move_in' | 'move_out' | 'adjust' | 'count';

export interface MovementRecord {
    inventoryItemId?: string;
    sku?: string;
    productName?: string;
    location: string;
    locationFrom?: string;
    locationTo?: string;
    warehouseId?: string;
    movementType: MovementType;
    quantityChange: number;
    quantityBefore?: number;
    quantityAfter?: number;
    referenceType?: string;
    referenceId?: string;
    notes?: string;
    createdBy?: string;
}

export interface TodayStats {
    totalIn: number;
    totalOut: number;
    totalMoves: number;
    totalTransactions: number;
}

export interface MovementHistoryItem {
    id: string;
    sku: string;
    productName: string;
    location: string;
    movementType: MovementType;
    quantityChange: number;
    notes: string;
    createdBy: string;
    createdAt: string;
}

/**
 * Record a stock movement
 */
export async function recordMovement(record: MovementRecord): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const result = await localDb.query(`
      INSERT INTO stock_movements (
        inventory_item_id, sku, product_name,
        location, location_from, location_to, warehouse_id,
        movement_type, quantity_change, quantity_before, quantity_after,
        reference_type, reference_id, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id
    `, [
            record.inventoryItemId || null,
            record.sku || null,
            record.productName || null,
            record.location,
            record.locationFrom || null,
            record.locationTo || null,
            record.warehouseId || null,
            record.movementType,
            record.quantityChange,
            record.quantityBefore || 0,
            record.quantityAfter || 0,
            record.referenceType || 'manual',
            record.referenceId || null,
            record.notes || null,
            record.createdBy || 'system'
        ]);

        return { success: true, id: result.rows[0]?.id };
    } catch (error) {
        console.error('Failed to record movement:', error);
        return { success: false, error: String(error) };
    }
}

/**
 * Get today's movement stats (In/Out/Move counts)
 */
export async function getTodayStats(warehouseId?: string): Promise<TodayStats> {
    try {
        // If using Supabase, use simplified approach (return zeros if no stock_movements table)
        if (!USE_LOCAL_DB) {
            console.log('📊 getTodayStats: Using Supabase (returning mock stats for now)');
            // Note: stock_movements table may not exist in Supabase
            // Return mock stats to prevent errors
            return { totalIn: 0, totalOut: 0, totalMoves: 0, totalTransactions: 0 };
        }

        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        let query = `
      SELECT 
        COALESCE(SUM(CASE WHEN movement_type = 'receive' THEN quantity_change ELSE 0 END), 0) as total_in,
        COALESCE(SUM(CASE WHEN movement_type IN ('ship', 'move_out') THEN ABS(quantity_change) ELSE 0 END), 0) as total_out,
        COALESCE(SUM(CASE WHEN movement_type IN ('move_in', 'move_out') THEN 1 ELSE 0 END), 0) as total_moves,
        COUNT(*) as total_transactions
      FROM stock_movements
      WHERE DATE(created_at) = $1
    `;

        const params: any[] = [today];

        if (warehouseId) {
            query += ` AND warehouse_id = $2`;
            params.push(warehouseId);
        }

        const result = await localDb.query(query, params);
        const row = result.rows[0];

        return {
            totalIn: parseInt(row?.total_in || '0'),
            totalOut: parseInt(row?.total_out || '0'),
            totalMoves: parseInt(row?.total_moves || '0'),
            totalTransactions: parseInt(row?.total_transactions || '0')
        };
    } catch (error) {
        console.error('Failed to get today stats:', error);
        return { totalIn: 0, totalOut: 0, totalMoves: 0, totalTransactions: 0 };
    }
}

/**
 * Get movement history with optional filters
 */
export async function getMovementHistory(options: {
    startDate?: string;
    endDate?: string;
    movementType?: MovementType;
    location?: string;
    sku?: string;
    warehouseId?: string;
    limit?: number;
    offset?: number;
}): Promise<MovementHistoryItem[]> {
    try {
        let query = `
      SELECT id, sku, product_name, location, movement_type,
             quantity_change, notes, created_by, created_at
      FROM stock_movements
      WHERE 1=1
    `;

        const params: any[] = [];
        let paramIndex = 1;

        if (options.startDate) {
            query += ` AND created_at >= $${paramIndex}`;
            params.push(options.startDate);
            paramIndex++;
        }

        if (options.endDate) {
            query += ` AND created_at <= $${paramIndex}`;
            params.push(options.endDate);
            paramIndex++;
        }

        if (options.movementType) {
            query += ` AND movement_type = $${paramIndex}`;
            params.push(options.movementType);
            paramIndex++;
        }

        if (options.location) {
            query += ` AND location ILIKE $${paramIndex}`;
            params.push(`%${options.location}%`);
            paramIndex++;
        }

        if (options.sku) {
            query += ` AND sku ILIKE $${paramIndex}`;
            params.push(`%${options.sku}%`);
            paramIndex++;
        }

        if (options.warehouseId) {
            query += ` AND warehouse_id = $${paramIndex}`;
            params.push(options.warehouseId);
            paramIndex++;
        }

        query += ` ORDER BY created_at DESC`;

        if (options.limit) {
            query += ` LIMIT $${paramIndex}`;
            params.push(options.limit);
            paramIndex++;
        }

        if (options.offset) {
            query += ` OFFSET $${paramIndex}`;
            params.push(options.offset);
        }

        const result = await localDb.query(query, params);

        return result.rows.map(row => ({
            id: row.id,
            sku: row.sku || '',
            productName: row.product_name || '',
            location: row.location,
            movementType: row.movement_type as MovementType,
            quantityChange: row.quantity_change,
            notes: row.notes || '',
            createdBy: row.created_by || 'system',
            createdAt: row.created_at
        }));
    } catch (error) {
        console.error('Failed to get movement history:', error);
        return [];
    }
}

/**
 * Helper: Record a receive movement
 */
export async function recordReceive(
    sku: string,
    productName: string,
    location: string,
    quantity: number,
    warehouseId?: string,
    notes?: string,
    createdBy?: string
) {
    return recordMovement({
        sku,
        productName,
        location,
        warehouseId,
        movementType: 'receive',
        quantityChange: quantity,
        notes,
        createdBy
    });
}

/**
 * Helper: Record a ship/pick movement
 */
export async function recordShip(
    sku: string,
    productName: string,
    location: string,
    quantity: number,
    warehouseId?: string,
    referenceId?: string,
    notes?: string,
    createdBy?: string
) {
    return recordMovement({
        sku,
        productName,
        location,
        warehouseId,
        movementType: 'ship',
        quantityChange: -Math.abs(quantity), // Always negative for outbound
        referenceType: 'order',
        referenceId,
        notes,
        createdBy
    });
}

/**
 * Helper: Record a move between locations
 */
export async function recordMove(
    sku: string,
    productName: string,
    locationFrom: string,
    locationTo: string,
    quantity: number,
    warehouseId?: string,
    notes?: string,
    createdBy?: string
) {
    // Record move_out from source
    await recordMovement({
        sku,
        productName,
        location: locationFrom,
        locationFrom,
        locationTo,
        warehouseId,
        movementType: 'move_out',
        quantityChange: -Math.abs(quantity),
        notes,
        createdBy
    });

    // Record move_in to destination
    return recordMovement({
        sku,
        productName,
        location: locationTo,
        locationFrom,
        locationTo,
        warehouseId,
        movementType: 'move_in',
        quantityChange: Math.abs(quantity),
        notes,
        createdBy
    });
}
