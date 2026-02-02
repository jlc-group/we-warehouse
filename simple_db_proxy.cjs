const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
const port = 3004;

// Enable CORS for ALL origins
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'apikey', 'Prefer']
}));
app.use(express.json());

// Database connection
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'wewarehouse_local',
    user: 'postgres',
    password: 'postgres123'
});

// Test connection
pool.query('SELECT 1')
    .then(() => console.log('✅ Connected to PostgreSQL'))
    .catch(err => console.error('❌ DB Connection Error:', err.message));

// Parse Supabase-style query params
function parseSupabaseQuery(query, table) {
    let select = '*';
    let where = [];
    let order = '';
    let limit = '';
    let offset = '';
    const values = [];
    let paramIndex = 1;

    Object.keys(query).forEach(key => {
        const val = query[key];

        if (key === 'select') {
            // Clean up select (remove newlines and extra spaces)
            select = val.replace(/\s+/g, ' ').trim();
        } else if (key === 'order') {
            // order=created_at.desc
            const [col, dir] = val.split('.');
            order = `ORDER BY "${col}" ${dir === 'desc' ? 'DESC' : 'ASC'}`;
        } else if (key === 'limit') {
            limit = `LIMIT ${parseInt(val)}`;
        } else if (key === 'offset') {
            offset = `OFFSET ${parseInt(val)}`;
        } else {
            // Filter: is_active=eq.true, id=eq.123
            const match = val.match(/^(eq|neq|gt|gte|lt|lte|like|ilike)\.(.+)$/);
            if (match) {
                const [, op, value] = match;
                const opMap = {
                    'eq': '=',
                    'neq': '!=',
                    'gt': '>',
                    'gte': '>=',
                    'lt': '<',
                    'lte': '<=',
                    'like': 'LIKE',
                    'ilike': 'ILIKE'
                };

                let parsedValue = value;
                if (value === 'true') parsedValue = true;
                else if (value === 'false') parsedValue = false;
                else if (!isNaN(value) && value !== '') parsedValue = Number(value);

                where.push(`"${key}" ${opMap[op]} $${paramIndex}`);
                values.push(parsedValue);
                paramIndex++;
            }
        }
    });

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const sql = `SELECT ${select} FROM "${table}" ${whereClause} ${order} ${limit} ${offset}`.trim();

    return { sql, values };
}

// ============ GET - Query Table ============
app.get('/api/:table', async (req, res) => {
    const { table } = req.params;

    try {
        const { sql, values } = parseSupabaseQuery(req.query, table);
        console.log(`📖 GET ${table}:`, sql.substring(0, 100) + '...');

        const result = await pool.query(sql, values);
        res.json(result.rows);
    } catch (err) {
        console.error('❌ GET Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ============ POST - Insert ============
app.post('/api/query', async (req, res) => {
    const { sql, params } = req.body;
    try {
        console.log('📝 SQL:', sql);
        const result = await pool.query(sql, params);
        res.json({ rows: result.rows, rowCount: result.rowCount });
    } catch (err) {
        console.error('❌ Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/:table', async (req, res) => {
    const { table } = req.params;
    const data = req.body;
    const rows = Array.isArray(data) ? data : [data];

    if (rows.length === 0) return res.json({ data: [] });

    try {
        const columns = Object.keys(rows[0]);
        const values = rows.map(row => columns.map(col => row[col]));
        const placeholders = values.map((_, rowIndex) =>
            `(${columns.map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`).join(', ')})`
        ).join(', ');

        const sql = `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES ${placeholders} RETURNING *`;
        const flatValues = values.flat();

        console.log(`📥 Insert ${table}`);
        const result = await pool.query(sql, flatValues);
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Insert Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ============ PATCH - Update ============
app.patch('/api/:table', async (req, res) => {
    const { table } = req.params;
    const query = req.query;
    const data = req.body;

    try {
        const columns = Object.keys(data);
        const setClause = columns.map((col, i) => `"${col}" = $${i + 1}`).join(', ');
        const values = columns.map(col => data[col]);

        let whereClause = '';
        Object.keys(query).forEach((key) => {
            const parts = query[key].split('.');
            if (parts.length === 2 && parts[0] === 'eq') {
                whereClause = `WHERE "${key}" = $${columns.length + 1}`;
                values.push(parts[1]);
            }
        });

        if (!whereClause) return res.status(400).json({ error: 'Missing WHERE clause' });

        const sql = `UPDATE "${table}" SET ${setClause} ${whereClause} RETURNING *`;
        console.log(`🔄 Update ${table}`);
        const result = await pool.query(sql, values);
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Update Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ============ DELETE ============
app.delete('/api/:table', async (req, res) => {
    const { table } = req.params;
    const query = req.query;

    try {
        let whereClause = '';
        const values = [];

        Object.keys(query).forEach((key) => {
            const parts = query[key].split('.');
            if (parts.length === 2 && parts[0] === 'eq') {
                whereClause = `WHERE "${key}" = $1`;
                values.push(parts[1]);
            }
        });

        if (!whereClause) return res.status(400).json({ error: 'Missing WHERE clause' });

        const sql = `DELETE FROM "${table}" ${whereClause} RETURNING *`;
        console.log(`🗑️ Delete ${table}`);
        const result = await pool.query(sql, values);
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Delete Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Start Server
app.listen(port, () => {
    console.log(`🚀 Local DB Proxy running at http://localhost:${port}`);
    console.log('📦 Endpoints: GET/POST/PATCH/DELETE /api/:table');
});
