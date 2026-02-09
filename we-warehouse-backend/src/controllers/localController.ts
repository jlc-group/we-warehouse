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
        const offset = query.offset ? parseInt(query.offset) : null;
        const orderBy = query.order || null;

        // Extract filters (eq., neq., gt., lt., in., not.*, is., cs. etc.)
        const filters: { column: string; operator: string; value: any }[] = [];
        const orConditions: string[] = [];

        for (const [key, value] of Object.entries(query)) {
            if (key === 'select' || key === 'limit' || key === 'order' || key === 'offset') continue;

            // Handle OR conditions
            if (key === 'or') {
                const orValues = Array.isArray(value) ? value : [value];
                orConditions.push(...orValues.map(String));
                continue;
            }

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
            } else if (strValue.startsWith('in.')) {
                // in.(val1,val2,val3)
                const inValue = strValue.slice(3);
                filters.push({ column: key, operator: 'IN', value: inValue });
            } else if (strValue.startsWith('not.is.')) {
                const notIsValue = strValue.slice(7);
                filters.push({ column: key, operator: 'IS NOT', value: notIsValue === 'null' ? null : notIsValue });
            } else if (strValue.startsWith('not.in.')) {
                const notInValue = strValue.slice(7);
                filters.push({ column: key, operator: 'NOT IN', value: notInValue });
            } else if (strValue.startsWith('cs.')) {
                // JSONB @> contains
                filters.push({ column: key, operator: '@>', value: strValue.slice(3) });
            }
        }

        return { select, limit, offset, orderBy, filters, orConditions };
    }

    /**
     * Build SQL query from parsed parameters
     */
    private static buildSelectQuery(
        tableName: string,
        params: { select: string; limit: number | null; offset: number | null; orderBy: string | null; filters: any[]; orConditions: string[] }
    ): { sql: string; values: any[] } {
        // Clean select - remove joins for now (handle simple selects)
        const cleanSelect = params.select
            .split(',')
            .filter(col => !col.includes('('))
            .map(col => col.trim())
            .join(', ') || '*';

        let sql = `SELECT ${cleanSelect} FROM ${tableName}`;
        const values: any[] = [];
        const allWhereClauses: string[] = [];

        // Add WHERE clauses from filters
        if (params.filters.length > 0) {
            const whereClauses = params.filters.map((f) => {
                if (f.operator === 'IS') {
                    return f.value === null ? `${f.column} IS NULL` : `${f.column} IS ${f.value}`;
                }
                if (f.operator === 'IS NOT') {
                    return f.value === null ? `${f.column} IS NOT NULL` : `${f.column} IS NOT ${f.value}`;
                }
                if (f.operator === 'IN') {
                    // Parse (val1,val2,val3) format
                    const inVals = f.value.replace(/^\(/, '').replace(/\)$/, '').split(',').map((v: string) => v.trim());
                    const placeholders = inVals.map((v: string) => { values.push(v); return `$${values.length}`; });
                    return `${f.column} IN (${placeholders.join(', ')})`;
                }
                if (f.operator === 'NOT IN') {
                    const notInVals = f.value.replace(/^\(/, '').replace(/\)$/, '').split(',').map((v: string) => v.trim());
                    const placeholders = notInVals.map((v: string) => { values.push(v); return `$${values.length}`; });
                    return `${f.column} NOT IN (${placeholders.join(', ')})`;
                }
                if (f.operator === '@>') {
                    values.push(f.value);
                    return `${f.column} @> $${values.length}::jsonb`;
                }
                values.push(f.value === 'true' ? true : f.value === 'false' ? false : f.value);
                return `${f.column} ${f.operator} $${values.length}`;
            });
            allWhereClauses.push(...whereClauses);
        }

        // Add OR conditions
        // Parse Supabase-style OR: "col1.ilike.%val%,col2.ilike.%val%"
        if (params.orConditions && params.orConditions.length > 0) {
            for (const orStr of params.orConditions) {
                const orParts = LocalController.parseOrString(orStr, values);
                if (orParts.length > 0) {
                    allWhereClauses.push(`(${orParts.join(' OR ')})`);
                }
            }
        }

        if (allWhereClauses.length > 0) {
            sql += ` WHERE ${allWhereClauses.join(' AND ')}`;
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

        // Add OFFSET
        if (params.offset) {
            sql += ` OFFSET ${params.offset}`;
        }

        return { sql, values };
    }

    /**
     * Parse Supabase-style OR string: "col1.ilike.%val%,col2.eq.val2"
     */
    private static parseOrString(orStr: string, values: any[]): string[] {
        const parts: string[] = [];
        // Split by comma but be careful with nested values
        // Regex to split: match column.operator.value patterns
        const regex = /([a-zA-Z_][a-zA-Z0-9_]*(?:->>[a-zA-Z_][a-zA-Z0-9_]*)?)\.([a-z]+)\.([^,]*)/g;
        let match;
        while ((match = regex.exec(orStr)) !== null) {
            const [, col, op, val] = match;
            if (op === 'eq') {
                values.push(val);
                parts.push(`${col} = $${values.length}`);
            } else if (op === 'neq') {
                values.push(val);
                parts.push(`${col} != $${values.length}`);
            } else if (op === 'ilike') {
                values.push(val.replace(/\*/g, '%'));
                parts.push(`${col} ILIKE $${values.length}`);
            } else if (op === 'like') {
                values.push(val.replace(/\*/g, '%'));
                parts.push(`${col} LIKE $${values.length}`);
            } else if (op === 'gt') {
                values.push(val);
                parts.push(`${col} > $${values.length}`);
            } else if (op === 'lt') {
                values.push(val);
                parts.push(`${col} < $${values.length}`);
            } else if (op === 'gte') {
                values.push(val);
                parts.push(`${col} >= $${values.length}`);
            } else if (op === 'lte') {
                values.push(val);
                parts.push(`${col} <= $${values.length}`);
            } else if (op === 'is') {
                if (val === 'null') {
                    parts.push(`${col} IS NULL`);
                } else {
                    parts.push(`${col} IS ${val}`);
                }
            }
        }
        return parts;
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
     * PUT /:table - Upsert records (INSERT ON CONFLICT DO UPDATE)
     */
    static async upsert(req: Request, res: Response, next: NextFunction) {
        try {
            const tableName = req.params.table;
            const data = req.body;
            const onConflict = (req.headers['x-on-conflict'] as string) || 'id';

            const records = Array.isArray(data) ? data : [data];
            const allResults: any[] = [];
            const pool = getLocalPool();

            for (const record of records) {
                const columns = Object.keys(record);
                const values = Object.values(record);
                const placeholders = columns.map((_, i) => `$${i + 1}`);

                // Build ON CONFLICT DO UPDATE SET for all columns except the conflict column
                const updateCols = columns.filter(c => c !== onConflict);
                const updateClauses = updateCols.map(col => `${col} = EXCLUDED.${col}`);

                let sql: string;
                if (updateClauses.length > 0) {
                    sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) ON CONFLICT (${onConflict}) DO UPDATE SET ${updateClauses.join(', ')} RETURNING *`;
                } else {
                    sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) ON CONFLICT (${onConflict}) DO NOTHING RETURNING *`;
                }

                const result = await pool.query(sql, values);
                allResults.push(...result.rows);
            }

            res.json(allResults);
        } catch (error: any) {
            console.error('❌ Local DB upsert error:', error);
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
