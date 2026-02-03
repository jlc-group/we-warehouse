/**
 * Local PostgreSQL Routes
 * Generic REST API for local database tables
 * Mimics Supabase PostgREST API
 */
import { Router, Request, Response } from 'express';
import { LocalController } from '../controllers/localController.js';
import { getLocalPool } from '../config/localDatabase.js';
import { POSyncService } from '../services/poSyncService.js';
import { schedulerService } from '../services/schedulerService.js';

const router = Router();

/**
 * PO Sync Route - Sync POs from JLC API
 * POST /api/local/sync-po
 */
router.post('/sync-po', async (req: Request, res: Response) => {
    try {
        const { date_from, date_to, top } = req.body;

        console.log('🔄 Starting PO sync...', { date_from, date_to, top });

        const result = await POSyncService.syncAllPOs({
            date_from,
            date_to,
            top: top || 50
        });

        res.json(result);
    } catch (error: any) {
        console.error('❌ PO Sync error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            synced: 0,
            errors: [error.message],
            details: []
        });
    }
});

/**
 * Scheduler Status Route
 * GET /api/local/scheduler-status
 */
router.get('/scheduler-status', (req: Request, res: Response) => {
    const status = schedulerService.getStatus();
    res.json({
        success: true,
        scheduler: status,
        message: status.running
            ? `Scheduler running - syncs every 6 hours`
            : 'Scheduler not running'
    });
});

/**
 * RPC Route - Call stored functions
 * POST /api/local/rpc/:functionName
 */
router.post('/rpc/:functionName', async (req: Request, res: Response) => {
    try {
        const { functionName } = req.params;
        const params = req.body;

        console.log(`📞 RPC call: ${functionName}`, params);

        const pool = getLocalPool();

        // Build function call with parameters
        const paramNames = Object.keys(params);
        const paramValues = Object.values(params);

        let sql: string;
        if (paramNames.length > 0) {
            const placeholders = paramNames.map((name, i) => `${name} := $${i + 1}`).join(', ');
            sql = `SELECT * FROM ${functionName}(${placeholders})`;
        } else {
            sql = `SELECT * FROM ${functionName}()`;
        }

        console.log(`📊 RPC SQL: ${sql}`, paramValues);

        const result = await pool.query(sql, paramValues);

        // Return first row if single result, otherwise return all
        if (result.rows.length === 1 && result.rows[0][functionName]) {
            res.json(result.rows[0][functionName]);
        } else if (result.rows.length === 1) {
            res.json(result.rows[0]);
        } else {
            res.json(result.rows);
        }
    } catch (error: any) {
        console.error('❌ RPC error:', error);
        res.status(500).json({
            error: error.message,
            code: error.code,
            hint: 'Check if function exists and parameters are correct'
        });
    }
});

/**
 * Query Route - Execute raw SQL
 * POST /api/local/query
 */
router.post('/query', async (req: Request, res: Response) => {
    try {
        const { sql, params } = req.body;

        console.log(`📊 Query: ${sql}`, params);

        const pool = getLocalPool();
        const result = await pool.query(sql, params || []);

        res.json({ rows: result.rows, rowCount: result.rowCount });
    } catch (error: any) {
        console.error('❌ Query error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Generic table routes
 * GET    /api/local/:table     - List records with filters
 * GET    /api/local/:table/:id - Get single record by ID
 * POST   /api/local/:table     - Create record
 * PATCH  /api/local/:table     - Update records
 * DELETE /api/local/:table     - Delete records
 */

// List/Search records
router.get('/:table', LocalController.getAll);

// Get single record by ID
router.get('/:table/:id', LocalController.getById);

// Create record
router.post('/:table', LocalController.create);

// Update records
router.patch('/:table', LocalController.update);

// Delete records
router.delete('/:table', LocalController.delete);

export default router;
