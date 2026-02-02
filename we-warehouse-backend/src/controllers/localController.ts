/**
 * Local PostgreSQL Controller
 * Generic CRUD operations for local database tables
 * Mimics Supabase REST API behavior
 */
import { Request, Response, NextFunction } from 'express';
import { getLocalPool } from '../config/localDatabase.js';

export class LocalController {
    /**
     * Parse Supabase-style query parameters
     */
    private static parseQueryParams(query: any) {
        const select = query.select || '*';
        const limit = query.limit ? parseInt(query.limit) : null;
        const orderBy = query.order || null;

        // Extract filters (eq., neq., gt., lt., etc.)
        const filters: { column: string; operator: string; value: any }[] = [];

        for (const [key, value] of Object.entries(query)) {
            if (key === 'select' || key === 'limit' || key === 'order') continue;

            const strValue = String(value);
            if (strValue.startsWith('eq.')) {
                filters.push({ column: key, operator: '=', value: strValue.slice(3) });
            } else if (strValue.startsWith('neq.')) {
                filters.push({ column: key, operator: '!=', value: strValue.slice(4) });
            } else if (strValue.startsWith('gt.')) {
                filters.push({ column: key, operator: '>', value: strValue.slice(3) });
            } else if (strValue.startsWith('lt.')) {
                filters.push({ column: key, operator: '<', value: strValue.slice(3) });
            } else if (strValue.startsWith('gte.')) {
                filters.push({ column: key, operator: '>=', value: strValue.slice(4) });
            } else if (strValue.startsWith('lte.')) {
                filters.push({ column: key, operator: '<=', value: strValue.slice(4) });
            } else if (strValue.startsWith('like.')) {
                filters.push({ column: key, operator: 'LIKE', value: strValue.slice(5).replace(/\*/g, '%') });
            } else if (strValue.startsWith('ilike.')) {
                filters.push({ column: key, operator: 'ILIKE', value: strValue.slice(6).replace(/\*/g, '%') });
            } else if (strValue.startsWith('is.')) {
                const isValue = strValue.slice(3);
                filters.push({ column: key, operator: 'IS', value: isValue === 'null' ? null : isValue });
            }
        }

        return { select, limit, orderBy, filters };
    }

    /**
     * Build SQL query from parsed parameters
     */
    private static buildSelectQuery(
        tableName: string,
        params: { select: string; limit: number | null; orderBy: string | null; filters: any[] }
    ): { sql: string; values: any[] } {
        // Clean select - remove joins for now (handle simple selects)
        const cleanSelect = params.select
            .split(',')
            .filter(col => !col.includes('('))
            .map(col => col.trim())
            .join(', ') || '*';

        let sql = `SELECT ${cleanSelect} FROM ${tableName}`;
        const values: any[] = [];

        // Add WHERE clauses
        if (params.filters.length > 0) {
            const whereClauses = params.filters.map((f, i) => {
                if (f.operator === 'IS') {
                    return f.value === null ? `${f.column} IS NULL` : `${f.column} IS ${f.value}`;
                }
                values.push(f.value === 'true' ? true : f.value === 'false' ? false : f.value);
                return `${f.column} ${f.operator} $${values.length}`;
            });
            sql += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        // Add ORDER BY
        if (params.orderBy) {
            const [column, direction] = params.orderBy.split('.');
            sql += ` ORDER BY ${column} ${direction?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}`;
        }

        // Add LIMIT
        if (params.limit) {
            sql += ` LIMIT ${params.limit}`;
        }

        return { sql, values };
    }

    /**
     * GET /:table - List records
     */
    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const tableName = req.params.table;
            const params = LocalController.parseQueryParams(req.query);
            const { sql, values } = LocalController.buildSelectQuery(tableName, params);

            console.log(`📊 Local DB Query: ${sql}`, values);

            const pool = getLocalPool();
            const result = await pool.query(sql, values);

            res.json(result.rows);
        } catch (error: any) {
            console.error('❌ Local DB error:', error);
            res.status(500).json({
                error: error.message,
                code: error.code,
                hint: 'Check if table exists and query is valid'
            });
        }
    }

    /**
     * GET /:table/:id - Get single record
     */
    static async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const { table, id } = req.params;
            const pool = getLocalPool();
            const result = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Record not found' });
            }

            res.json(result.rows[0]);
        } catch (error: any) {
            console.error('❌ Local DB error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /:table - Create record
     */
    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            const tableName = req.params.table;
            const data = req.body;

            const columns = Object.keys(data);
            const values = Object.values(data);
            const placeholders = columns.map((_, i) => `$${i + 1}`);

            const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;

            const pool = getLocalPool();
            const result = await pool.query(sql, values);

            res.status(201).json(result.rows[0]);
        } catch (error: any) {
            console.error('❌ Local DB insert error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * PATCH /:table - Update records
     */
    static async update(req: Request, res: Response, next: NextFunction) {
        try {
            const tableName = req.params.table;
            const data = req.body;
            const params = LocalController.parseQueryParams(req.query);

            const setColumns = Object.keys(data);
            const setValues = Object.values(data);
            const setClauses = setColumns.map((col, i) => `${col} = $${i + 1}`);

            let sql = `UPDATE ${tableName} SET ${setClauses.join(', ')}`;
            const values = [...setValues];

            // Add WHERE from filters
            if (params.filters.length > 0) {
                const whereClauses = params.filters.map((f, i) => {
                    values.push(f.value);
                    return `${f.column} ${f.operator} $${values.length}`;
                });
                sql += ` WHERE ${whereClauses.join(' AND ')}`;
            }

            sql += ' RETURNING *';

            const pool = getLocalPool();
            const result = await pool.query(sql, values);

            res.json(result.rows);
        } catch (error: any) {
            console.error('❌ Local DB update error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * DELETE /:table - Delete records
     */
    static async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const tableName = req.params.table;
            const params = LocalController.parseQueryParams(req.query);

            let sql = `DELETE FROM ${tableName}`;
            const values: any[] = [];

            // Add WHERE from filters
            if (params.filters.length > 0) {
                const whereClauses = params.filters.map((f, i) => {
                    values.push(f.value);
                    return `${f.column} ${f.operator} $${values.length}`;
                });
                sql += ` WHERE ${whereClauses.join(' AND ')}`;
            }

            sql += ' RETURNING *';

            const pool = getLocalPool();
            const result = await pool.query(sql, values);

            res.json(result.rows);
        } catch (error: any) {
            console.error('❌ Local DB delete error:', error);
            res.status(500).json({ error: error.message });
        }
    }
}
