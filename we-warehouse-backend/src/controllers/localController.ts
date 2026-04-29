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
     * Known foreign key relationships for JOIN support
     * Maps: parentTable -> { joinTable -> fkColumn }
     */
    private static FK_MAP: Record<string, Record<string, string>> = {
        'inventory_items': { 'products': 'sku' },  // inventory_items.sku -> products.sku_code
        'customer_orders': { 'customers': 'customer_id' },
        'sales_orders': { 'customers': 'customer_id' },
        'order_items': { 'customer_orders': 'order_id' },
        'sales_order_items': { 'sales_orders': 'order_id' },
        'fulfillment_items': { 'fulfillment_tasks': 'fulfillment_task_id', 'inventory_items': 'inventory_item_id' },
        'inbound_receipt_items': { 'inbound_receipts': 'inbound_receipt_id', 'products': 'product_id' },
    };

    /**
     * Parse Supabase-style nested select patterns like "*, products(*)" or
     * "*, customer:customers(id,name)" (with alias).
     * Also tolerates whitespace/newlines inside parens.
     * Returns: { columns for main table, join definitions }
     */
    private static parseJoins(tableName: string, select: string): {
        cleanSelect: string;
        joins: { joinTable: string; joinAlias: string; joinCols: string; outputKey: string }[];
    } {
        const joins: { joinTable: string; joinAlias: string; joinCols: string; outputKey: string }[] = [];
        const mainCols: string[] = [];

        // Split select by comma, respecting parentheses and ignoring newlines
        const flat = select.replace(/\s+/g, ' ');
        const parts: string[] = [];
        let depth = 0;
        let current = '';
        for (const ch of flat) {
            if (ch === '(') depth++;
            else if (ch === ')') depth--;
            else if (ch === ',' && depth === 0) {
                if (current.trim()) parts.push(current.trim());
                current = '';
                continue;
            }
            current += ch;
        }
        if (current.trim()) parts.push(current.trim());

        // Match either "table(cols)" or "alias:table(cols)" — cols may be empty or contain commas inside parens
        const joinRegex = /^(?:(\w+)\s*:\s*)?(\w+)\s*\(([\s\S]*)\)$/;

        for (const part of parts) {
            const m = part.match(joinRegex);
            if (m) {
                const [, alias, joinTable, joinColsRaw] = m;
                const joinCols = (joinColsRaw || '').trim() || '*';
                joins.push({
                    joinTable,
                    joinAlias: `_j_${joinTable}`,
                    joinCols,
                    outputKey: alias || joinTable,
                });
            } else {
                mainCols.push(part);
            }
        }

        return {
            cleanSelect: mainCols.join(', ') || '*',
            joins,
        };
    }

    /**
     * Build SQL query from parsed parameters
     */
    private static buildSelectQuery(
        tableName: string,
        params: { select: string; limit: number | null; offset: number | null; orderBy: string | null; filters: any[]; orConditions: string[] }
    ): { sql: string; values: any[]; joins: { joinTable: string; joinAlias: string; joinCols: string; outputKey: string }[]; isCount?: boolean } {
        const { cleanSelect, joins } = LocalController.parseJoins(tableName, params.select);

        // Supabase special case: select=count → return [{ count: N }] (no rows)
        if (cleanSelect.trim().toLowerCase() === 'count' && joins.length === 0) {
            const values: any[] = [];
            const whereClauses: string[] = [];
            for (const f of params.filters) {
                if (f.operator === 'IS') {
                    whereClauses.push(f.value === null ? `${f.column} IS NULL` : `${f.column} IS ${f.value}`);
                } else if (f.operator === 'IS NOT') {
                    whereClauses.push(f.value === null ? `${f.column} IS NOT NULL` : `${f.column} IS NOT ${f.value}`);
                } else if (f.operator === 'IN' || f.operator === 'NOT IN') {
                    const vals = f.value.replace(/^\(/, '').replace(/\)$/, '').split(',').map((v: string) => v.trim());
                    const phs = vals.map((v: string) => { values.push(v); return `$${values.length}`; });
                    whereClauses.push(`${f.column} ${f.operator} (${phs.join(', ')})`);
                } else if (f.operator === '@>') {
                    values.push(f.value);
                    whereClauses.push(`${f.column} @> $${values.length}::jsonb`);
                } else {
                    values.push(f.value === 'true' ? true : f.value === 'false' ? false : f.value);
                    whereClauses.push(`${f.column} ${f.operator} $${values.length}`);
                }
            }
            const whereSql = whereClauses.length ? ` WHERE ${whereClauses.join(' AND ')}` : '';
            return {
                sql: `SELECT COUNT(*)::int AS count FROM ${tableName}${whereSql}`,
                values,
                joins: [],
                isCount: true,
            };
        }

        // Build SELECT columns - prefix main table columns and add join columns
        let selectClause: string;
        if (joins.length > 0) {
            // Main table columns
            const mainAlias = tableName;
            const mainColsPart = cleanSelect === '*' ? `${mainAlias}.*` : cleanSelect.split(',').map(c => `${mainAlias}.${c.trim()}`).join(', ');

            // Build a single JSON object per join so we can return a nested object cleanly
            // — works for both "*" and specific column lists.
            const joinColParts = joins.map(j => {
                if (j.joinCols === '*') {
                    return `row_to_json(${j.joinAlias}.*) as _join_${j.outputKey}`;
                }
                const cols = j.joinCols.split(',').map(c => c.trim()).filter(Boolean);
                const jsonPairs = cols
                    .map(c => `'${c}', ${j.joinAlias}.${c}`)
                    .join(', ');
                // Use id (from FK target) to detect "no join row matched" — joins are LEFT JOIN on id
                return `CASE WHEN ${j.joinAlias}.id IS NOT NULL THEN jsonb_build_object(${jsonPairs}) ELSE NULL END as _join_${j.outputKey}`;
            });

            selectClause = [mainColsPart, ...joinColParts].join(', ');
        } else {
            selectClause = cleanSelect;
        }

        let sql = `SELECT ${selectClause} FROM ${tableName}`;

        // Add JOINs
        for (const j of joins) {
            const fkInfo = LocalController.FK_MAP[tableName]?.[j.joinTable];
            if (fkInfo) {
                // Use explicit FK mapping
                if (fkInfo === 'sku') {
                    // Special case: inventory_items.sku -> products.sku_code
                    sql += ` LEFT JOIN ${j.joinTable} ${j.joinAlias} ON ${tableName}.sku = ${j.joinAlias}.sku_code`;
                } else {
                    sql += ` LEFT JOIN ${j.joinTable} ${j.joinAlias} ON ${tableName}.${fkInfo} = ${j.joinAlias}.id`;
                }
            } else {
                // Convention: main_table.join_table_id -> join_table.id (singular FK)
                const fkCol = `${j.joinTable.replace(/s$/, '')}_id`;
                sql += ` LEFT JOIN ${j.joinTable} ${j.joinAlias} ON ${tableName}.${fkCol} = ${j.joinAlias}.id`;
            }
        }

        const values: any[] = [];
        const allWhereClauses: string[] = [];

        // Add WHERE clauses from filters (prefix with tableName if joins exist)
        if (params.filters.length > 0) {
            const whereClauses = params.filters.map((f) => {
                const colRef = joins.length > 0 ? `${tableName}.${f.column}` : f.column;
                if (f.operator === 'IS') {
                    return f.value === null ? `${colRef} IS NULL` : `${colRef} IS ${f.value}`;
                }
                if (f.operator === 'IS NOT') {
                    return f.value === null ? `${colRef} IS NOT NULL` : `${colRef} IS NOT ${f.value}`;
                }
                if (f.operator === 'IN') {
                    const inVals = f.value.replace(/^\(/, '').replace(/\)$/, '').split(',').map((v: string) => v.trim());
                    const placeholders = inVals.map((v: string) => { values.push(v); return `$${values.length}`; });
                    return `${colRef} IN (${placeholders.join(', ')})`;
                }
                if (f.operator === 'NOT IN') {
                    const notInVals = f.value.replace(/^\(/, '').replace(/\)$/, '').split(',').map((v: string) => v.trim());
                    const placeholders = notInVals.map((v: string) => { values.push(v); return `$${values.length}`; });
                    return `${colRef} NOT IN (${placeholders.join(', ')})`;
                }
                if (f.operator === '@>') {
                    values.push(f.value);
                    return `${colRef} @> $${values.length}::jsonb`;
                }
                values.push(f.value === 'true' ? true : f.value === 'false' ? false : f.value);
                return `${colRef} ${f.operator} $${values.length}`;
            });
            allWhereClauses.push(...whereClauses);
        }

        // Add OR conditions
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
            const orderCol = joins.length > 0 ? `${tableName}.${column}` : column;
            sql += ` ORDER BY ${orderCol} ${direction?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}`;
        }

        // Add LIMIT
        if (params.limit) {
            sql += ` LIMIT ${params.limit}`;
        }

        // Add OFFSET
        if (params.offset) {
            sql += ` OFFSET ${params.offset}`;
        }

        return { sql, values, joins };
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
            const { sql, values, joins } = LocalController.buildSelectQuery(tableName, params);

            console.log(`📊 Local DB Query: ${sql}`, values);

            const pool = getLocalPool();
            const result = await pool.query(sql, values);

            // If joins exist, nest joined data into sub-objects under the alias (or table name)
            if (joins.length > 0) {
                const nested = result.rows.map(row => {
                    const newRow: any = { ...row };
                    for (const j of joins) {
                        const joinKey = `_join_${j.outputKey}`;
                        if (row[joinKey] !== undefined) {
                            newRow[j.outputKey] = row[joinKey];
                            delete newRow[joinKey];
                        }
                    }
                    return newRow;
                });
                return res.json(nested);
            }

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
     * POST /:table - Create record(s)
     * Accepts a single object or an array of objects (Supabase-compatible).
     */
    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            const tableName = req.params.table;
            const body = req.body;
            const records = Array.isArray(body) ? body : [body];

            if (records.length === 0) {
                return res.status(400).json({ error: 'Empty payload' });
            }

            // Build column list from union of keys across all records (in case rows differ)
            const colSet = new Set<string>();
            records.forEach((r: any) => Object.keys(r || {}).forEach((k) => colSet.add(k)));
            const columns = Array.from(colSet);
            if (columns.length === 0) {
                return res.status(400).json({ error: 'No columns to insert' });
            }

            const values: any[] = [];
            const rowPlaceholders: string[] = [];
            let p = 1;
            for (const rec of records) {
                const ph: string[] = [];
                for (const c of columns) {
                    const v = rec[c];
                    // Serialize objects/arrays for JSONB columns
                    if (v !== null && v !== undefined && typeof v === 'object') {
                        values.push(JSON.stringify(v));
                    } else {
                        values.push(v ?? null);
                    }
                    ph.push(`$${p++}`);
                }
                rowPlaceholders.push(`(${ph.join(', ')})`);
            }

            const colList = columns.map((c) => `"${c}"`).join(', ');
            const sql = `INSERT INTO ${tableName} (${colList}) VALUES ${rowPlaceholders.join(', ')} RETURNING *`;

            const pool = getLocalPool();
            const result = await pool.query(sql, values);

            // Mirror Supabase: return array if input was array, single object otherwise
            res.status(201).json(Array.isArray(body) ? result.rows : result.rows[0]);
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
     * Supports raw SQL expressions via { __raw: "SQL expression" } values
     */
    static async update(req: Request, res: Response, next: NextFunction) {
        try {
            const tableName = req.params.table;
            const data = req.body;
            const params = LocalController.parseQueryParams(req.query);

            const setClauses: string[] = [];
            const values: any[] = [];

            for (const [col, val] of Object.entries(data)) {
                if (val && typeof val === 'object' && (val as any).__raw) {
                    // Raw SQL expression - inject directly (e.g., GREATEST(col - 5, 0))
                    setClauses.push(`${col} = ${(val as any).__raw}`);
                } else {
                    values.push(val);
                    setClauses.push(`${col} = $${values.length}`);
                }
            }

            let sql = `UPDATE ${tableName} SET ${setClauses.join(', ')}`;

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
